/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Env } from "../models/env"
import { RymUser } from "../models/rymUser"

function renderRymList(rymUsers: RymUser[]): string {
  return rymUsers
    .map(({ username, profileUrl }) => `${username}\n${profileUrl}`)
    .join('\n\n')
}

async function handleRequest(request: Request, env: Env) {
  if (request.method === "POST") {
    const payload: any = await request.json()
    if ('message' in payload) {
      const username = payload.message.from.username
      const userId = payload.message.from.id
      const chatId = payload.message.chat.id
      const text = `${username} (${userId}) just sent me: '${payload.message.text}'`;
      const url = `https://api.telegram.org/bot${env.API_KEY}/sendMessage?chat_id=${chatId}&text=${text}`
      const data = await fetch(url).then(resp => resp.json())
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
