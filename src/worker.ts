/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { ChatMemberResponse } from "../models/chatMemberResponse"
import { Env } from "../models/env"
import { Message } from "../models/message"
import { ScaruffiMention } from "../models/scaruffiMention";
import { User } from "../models/user"
import { scaruffiSynonyms } from "./constants";

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    async function listRymUsers(message: Message) {
      const chatId = message.chat.id
      const rymUserIds = await env.RYM_USERS
        .list()
        .then(list => list.keys.map(key => key.name))
      const chatMembers: User[] = await Promise.all(rymUserIds
        .map(userId => `https://api.telegram.org/bot${env.API_KEY}/getChatMember?chat_id=${chatId}&user_id=${userId}`)
        .map(url => fetch(url)
          .then(resp => resp.json())
          .then(resp => (resp as ChatMemberResponse).result?.user)))
      // 'unknown username' will appear for all saved user ids not present in the chat in which the command has been sent (i.e., a private chat with the bot)
      const rymUsers = await Promise.all(rymUserIds.map(userId => env.RYM_USERS
        .get(`${userId}`)
        .then(profileUrl => ({ username: chatMembers.find(cm => `${cm?.id}` === userId)?.username ?? 'unknown username', profileUrl }))))
      const renderedRymUsersList = rymUsers
        .map(rymUser => `${rymUser.username} - ${rymUser.profileUrl}`)
        .join('\n')
      const inlineKeyboard = [ [ { text: '➕', switch_inline_query_current_chat: 'insert-profile-url ' } ] ]
      const replyMarkup = { inline_keyboard: inlineKeyboard }
      const text = `Lista profili RYM salvati:\n\n${renderedRymUsersList}`
      const url = `https://api.telegram.org/bot${env.API_KEY}/sendMessage?chat_id=${chatId}&text=${text}&reply_markup=${JSON.stringify(replyMarkup)}`
      const data = await fetch(url).then(resp => resp.json())
    }

    async function insertProfileUrl(message: Message) {
      const chatId = message.chat.id
      const userId = message.from.id.toString()
      const username = message.from.username
      const profileUrl = message.entities
        .filter(entity => entity.type === 'url')
        .slice(0, 1) // only take one
        .map(entity => message.text.substring(entity.offset, entity.offset + entity.length))
        .filter(profileUrl => profileUrl.startsWith('https://www.rateyourmusic.com/~') || profileUrl.startsWith('https://rateyourmusic.com/~'))
        .join('')
      const rymUserIds = await env.RYM_USERS
        .list()
        .then(list => list.keys.map(key => key.name))
      if (profileUrl.length) {
        await env.RYM_USERS.put(userId, profileUrl);
      }
      const text = profileUrl.length
        ? `Link al profilo RYM per ${username} ${rymUserIds.includes(userId) ? 'aggiornato' : 'inserito'}!`
        : 'Nessun link a profili RYM trovato.'
      const url = `https://api.telegram.org/bot${env.API_KEY}/sendMessage?chat_id=${chatId}&text=${text}`
      const data = await fetch(url).then(resp => resp.json())
    }

    async function punishScaruffiMention(message: Message) {
      // const chatId = message.chat.id
      const userId = message.from.id.toString()
      // const username = message.from.username
      const previousScaruffiMentions = await env.SCARUFFI_MENTIONS.get(userId, { type: 'json' }) as ScaruffiMention[] | null
      const updatedScaruffiMentions = (previousScaruffiMentions ?? []).concat([{
        userId,
        synonym: scaruffiSynonyms.find(s => message.text.includes(s))!,
        timestamp: new Date().toJSON()
      }])
      await env.SCARUFFI_MENTIONS.put(userId, JSON.stringify(updatedScaruffiMentions))
      console.log('updatedScaruffiMentions', updatedScaruffiMentions)
    }

    async function echo(message: Message) {
      const chatId = message.chat.id
      const content = message.text
      const text = `${content}!`
      const url = `https://api.telegram.org/bot${env.API_KEY}/sendMessage?chat_id=${chatId}&text=${text}`
      const data = await fetch(url).then(resp => resp.json())
    }

    if (request.method === "POST") {
      const payload: any = await request.json()
      console.log('payload:', payload)
      if ('message' in payload) {
        const message: Message = payload.message
        if (message.text === 'rym') {
          console.log('called RYM command!', 'chatId:', message?.chat?.id, 'userId:', message?.from?.id, 'username:', message?.from?.username, 'message.text:', message?.text);
          await listRymUsers(message)
        } else if (message.entities && message.entities.find(e => e.type === 'mention') && message.entities.find(e => e.type === 'url') && message.text.includes('insert-profile-url')) {
          console.log('called insert-profile-url command!', 'chatId:', message.chat.id, 'userId:', message.from.id, 'username:', message.from.username, 'message.text:', message.text);
          await insertProfileUrl(message)
        } else if (message.text && scaruffiSynonyms.some(s => message.text.includes(s))) {
          console.log('called punishScaruffiMention command!', 'chatId:', message.chat.id, 'userId:', message.from.id, 'username:', message.from.username, 'message.text:', message.text);
          await punishScaruffiMention(message)
        } else if (message.text === 'echo') {
          console.log('called echo command!', 'chatId:', message.chat.id, 'userId:', message.from.id, 'username:', message.from.username, 'message.text:', message.text);
          await echo(message)
        }
      }
    }

    return new Response(`franco franchi`);
	},
};
