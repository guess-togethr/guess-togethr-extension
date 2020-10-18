import {
  Middleware,
  createAction,
  AnyAction,
  CombinedState,
  StateFromReducersMapObject,
  Draft,
} from "@reduxjs/toolkit";
import { RootState } from ".";
import localState, { leaveLobby, createLobby } from "./localState";
import serverState from "./serverState";
import { LobbyServer, LobbyClient } from "../lobbyManager";
import { User } from "../../protocol/schema";
import reduceReducers from "reduce-reducers";
import { trackPatches, immerAwareCombineReducers } from "../../utils";
import { clientStates, localClientState, setClientState } from "./clientState";

// This middleware aintains a singleton lobby object and destroys it if left or
// a new lobby is joined. Note that this middleware swallows the
// createLobby.fulfilled action which has a non-serializable payload
const lobbyMiddleware: Middleware<{}, RootState> = (store) => {
  let lobby: LobbyServer | LobbyClient | null = null;

  return (next) => (action) => {
    if (createLobby.fulfilled.match(action)) {
      if (lobby) {
        lobby.destroy();
      }
      lobby = action.payload.lobby;
      return;
    } else if (leaveLobby.match(action)) {
      lobby?.destroy();
      lobby = null;
    }
    return next(action);
  };
};

const addJoinRequest = createAction<User>("lobby/addJoinRequest");
const approveJoinRequest = createAction<User>("lobby/approveJoinRequest");
const denyJoinRequest = createAction<User>("lobby/denyJoinRequest");

function findConflictingUser(list: User[], user: User) {
  return list.find((u) => u.ggId === user.ggId || u.id === user.id);
}

const reducerMap = { localState, serverState, clientStates, localClientState };

const combinedReducer = immerAwareCombineReducers(reducerMap);

const crossReducer = (
  draft: Draft<CombinedState<StateFromReducersMapObject<typeof reducerMap>>>,
  action: AnyAction
) => {
  if (!draft || !draft.localState || !draft.serverState) {
    return draft;
  }
  if (setClientState.match(action)) {
    const user = { id: action.payload.id, ggId: action.payload.ggId };
    if (
      draft.localState.isServer &&
      !findConflictingUser(draft.serverState.users, user)
    ) {
      draft.serverState.users.push(user);
    }
  }
  // case approveJoinRequest.toString():
  // case denyJoinRequest.toString(): {
  //   draft.localState.joinRequests = draft.localState.joinRequests.filter(
  //     (r) => !shallowEqual(r, action.payload)
  //   );

  //   approveJoinRequest.match(action) &&
  //     draft.serverState.users.push(action.payload);

  //   break;
  // }
};

const [lobbyReducer, trackSharedStatePatches] = trackPatches(
  reduceReducers(
    combinedReducer as any,
    crossReducer as any
  ) as typeof combinedReducer
);

export {
  createLobby,
  lobbyMiddleware,
  addJoinRequest,
  approveJoinRequest,
  denyJoinRequest,
  trackSharedStatePatches,
};
export default lobbyReducer;
export * from "./localState";
export * from "./serverState";
export * from "./clientState";
