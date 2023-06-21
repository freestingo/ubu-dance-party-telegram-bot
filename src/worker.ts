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
import { User } from "../models/user"

async function listRymUsers(message: Message, env: Env) {
  const chatId = message.chat.id
  const rymUserIds = await env.RYM_USERS
    .list()
    .then(list => list.keys.map(key => key.name))
  const chatMembers: User[] = await Promise.all(rymUserIds
    .map(userId => `https://api.telegram.org/bot${env.API_KEY}/getChatMember?chat_id=${chatId}&user_id=${userId}`)
    .map(url => fetch(url)
      .then(resp => resp.json())
      .then(resp => (resp as ChatMemberResponse).result.user)))
  const rymUsers = await Promise.all(rymUserIds.map(userId => env.RYM_USERS
    .get(`${userId}`)
    .then(profileUrl => ({ username: chatMembers.find(cm => `${cm.id}` === userId)?.username ?? 'unknown username', profileUrl }))))
  const renderedRymUsersList = rymUsers
    .map(rymUser => `${rymUser.username}\n${rymUser.profileUrl}`)
    .join('\n\n')
  const text = `Profili RYM salvati:\n${renderedRymUsersList}`
  const url = `https://api.telegram.org/bot${env.API_KEY}/sendMessage?chat_id=${chatId}&text=${text}`
  const data = await fetch(url).then(resp => resp.json())
}

async function handleRequest(request: Request, env: Env) {
  if (request.method === "POST") {
    const payload: any = await request.json()
    if ('message' in payload) {
      const message: Message = payload.message
      if (message.text === 'rym') {
        await listRymUsers(message, env)
      }
    }
  }

  return new Response(`pippo franco`);
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const response = handleRequest(request, env)
    return response
	},
};
