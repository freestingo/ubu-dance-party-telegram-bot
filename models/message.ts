import { Chat } from "./chat";
import { Entity } from "./entity";
import { User } from "./user";

export interface Message {
  message_id: number;
  from: User;
  chat: Chat;
  date: number;
  text: string;
  entities: Entity[];
}
