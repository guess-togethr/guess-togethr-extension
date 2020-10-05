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
import { shallowEqual } from "react-redux";
import { trackPatches, immerAwareCombineReducers } from "../../utils";
import { selectConnectionState, ConnectionState } from "./lobbySelectors";
import { clientStates, localClientState } from "./clientState";

// This middleware performs two functions:
//
// 1. Maintains a singleton lobby object and destroys it if left or
// a new lobby is joined.
//
// 2. Imperatively sends a join when the connection state is
// appropriate, i.e. the host is connected and is already not joined

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
    const previousConnectionState = selectConnectionState(store.getState());
    const ret = next(action);
    if (
      selectConnectionState(store.getState()) ===
        ConnectionState.WaitingForJoin &&
      previousConnectionState !== ConnectionState.WaitingForJoin &&
      lobby instanceof LobbyClient
    ) {
      lobby.sendJoin();
    }

    return ret;
  };
};

// const addJoinRequest = createAsyncThunk<User, User, { state: RootState }>(
//   "lobby/addJoinRequest",
//   async (user: User, { dispatch, getState }) => {
//     if (!userCacheSelectors.selectById(getState(), user.ggId)) {
//       await dispatch(queryUsers([user.ggId]));
//     }

//     return user;
//   }
// );
const addJoinRequest = createAction<User>("lobby/addJoinRequest");
const approveJoinRequest = createAction<User>("lobby/approveJoinRequest");
const denyJoinRequest = createAction<User>("lobby/denyJoinRequest");

function findConflictingUser(list: User[], user: User) {
  return list.find(
    (u) => u.ggId === user.ggId || u.publicKey === user.publicKey
  );
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
  switch (action.type) {
    case addJoinRequest.toString(): {
      if (
        !findConflictingUser(draft.localState.joinRequests, action.payload) &&
        !findConflictingUser(draft.serverState.users, action.payload)
      ) {
        // temporarily allow all join requests
        // draft.localState.joinRequests.push(action.payload);
        draft.serverState.users.push(action.payload);
      }
      break;
    }
    case approveJoinRequest.toString():
    case denyJoinRequest.toString(): {
      draft.localState.joinRequests = draft.localState.joinRequests.filter(
        (r) => !shallowEqual(r, action.payload)
      );

      approveJoinRequest.match(action) &&
        draft.serverState.users.push(action.payload);

      break;
    }
  }
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
