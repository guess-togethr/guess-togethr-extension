// eslint-disable-next-line import/no-webpack-loader-syntax
import {
  validateServerMessage as vsm,
  validateClientMessage as vcm,
  validateServerState as vss,
  validateClientState as vcs,
} from "!schema-loader!./schema";
import {
  ServerMessage,
  ClientMessage,
  ServerState,
  ClientState,
} from "./schema";

export function validateServerMessage(json: any): json is ServerMessage {
  return vsm(json);
}
export function validateClientMessage(json: any): json is ClientMessage {
  return vcm(json);
}
export function validateServerState(state: any): state is ServerState {
  return vss(state);
}
export function validateClientState(state: any): state is ClientState {
  return vcs(state);
}
