import {
  Middleware,
  createAction,
  AnyAction,
  createAsyncThunk,
  CombinedState,
  StateFromReducersMapObject,
  Draft,
} from "@reduxjs/toolkit";
import { RootState } from ".";
import sharedState from "./sharedState";
import { LobbyServer, LobbyClient } from "../lobbyManager";
import { User } from "../../protocol/schema";
import reduceReducers from "reduce-reducers";
import { shallowEqual } from "react-redux";
import localState, { leaveLobby, createLobby } from "./localState";
import { userCacheSelectors, queryUsers } from "./geoguessrState";
import { trackPatches, immerAwareCombineReducers } from "../../utils";
import { selectConnectionState, ConnectionState } from "./lobbySelectors";

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

const addJoinRequest = createAsyncThunk<User, User, { state: RootState }>(
  "lobby/addJoinRequest",
  async (user: User, { dispatch, getState }) => {
    if (!userCacheSelectors.selectById(getState(), user.ggId)) {
      await dispatch(queryUsers([user.ggId]));
    }

    return user;
  }
);
const approveJoinRequest = createAction<User>("lobby/approveJoinRequest");
const denyJoinRequest = createAction<User>("lobby/denyJoinRequest");

function findConflictingUser(list: User[], user: User) {
  return list.find(
    (u) => u.ggId === user.ggId || u.publicKey === user.publicKey
  );
}

const reducerMap = { localState, sharedState };

const combinedReducer = immerAwareCombineReducers(reducerMap);

const crossReducer = (
  draft: Draft<CombinedState<StateFromReducersMapObject<typeof reducerMap>>>,
  action: AnyAction
) => {
  if (!draft || !draft.localState || !draft.sharedState) {
    return draft;
  }
  switch (action.type) {
    case addJoinRequest.fulfilled.toString(): {
      if (
        !findConflictingUser(draft.localState.joinRequests, action.payload) &&
        !findConflictingUser(draft.sharedState.users, action.payload)
      ) {
        // temporarily allow all join requests
        // draft.localState.joinRequests.push(action.payload);
        draft.sharedState.users.push(action.payload);
      }
      break;
    }
    case approveJoinRequest.toString():
    case denyJoinRequest.toString(): {
      draft.localState.joinRequests = draft.localState.joinRequests.filter(
        (r) => !shallowEqual(r, action.payload)
      );

      approveJoinRequest.match(action) &&
        draft.sharedState.users.push(action.payload);

      break;
    }
  }
};

const [
  lobbyReducer,
  localTrackSharedStatePatches,
] = trackPatches(
  reduceReducers(
    combinedReducer as any,
    crossReducer as any
  ) as typeof combinedReducer,
  ["sharedState"]
);

export const trackSharedStatePatches: typeof localTrackSharedStatePatches = (
  listener
) =>
  localTrackSharedStatePatches((patches) =>
    listener(patches.map((p) => ({ ...p, path: p.path.slice(1) })))
  );

export {
  createLobby,
  lobbyMiddleware,
  addJoinRequest,
  approveJoinRequest,
  denyJoinRequest,
};
export default lobbyReducer;
