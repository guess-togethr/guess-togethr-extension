import {
  validateServerMessage as vsm,
  validateClientMessage as vcm,
} from "!schema-loader!./schema";
import { ServerMessage, ClientMessage } from "./schema";

export function validateServerMessage(json: any): json is ServerMessage {
  return vsm(json);
}
export function validateClientMessage(json: any): json is ClientMessage {
  return vcm(json);
}
