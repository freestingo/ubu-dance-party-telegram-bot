import { User } from "./user"

export interface ChatMemberResponse {
  ok: boolean;
  result: { user: User, status: string }
}
