import {
  combineReducers,
  Middleware,
  createSelector,
  createAction,
  createNextState,
  AnyAction,
  createReducer,
} from "@reduxjs/toolkit";
import { RootState } from ".";
import sharedState from "./sharedState";
import { LobbyServer, LobbyClient } from "./lobbyManager";
import { User } from "../../protocol/schema";
import reduceReducers from "reduce-reducers";
import { shallowEqual } from "react-redux";
import localState, { leaveLobby, createLobby } from "./localState";

export enum ConnectionState {
  Disconnected,
  Connecting,
  GettingInitialData,
  WaitingForHost,
  WaitingForJoin,
  Connected,
  Error,
}

// This middleware performs two functions:
//
// 1. Maintains a singleton lobby object and destroys it is left or
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
    const previousConnectionState = getConnectionState(store.getState());
    const ret = next(action);
    if (
      getConnectionState(store.getState()) === ConnectionState.WaitingForJoin &&
      previousConnectionState !== ConnectionState.WaitingForJoin &&
      lobby instanceof LobbyClient
    ) {
      lobby.sendJoin();
    }

    return ret;
  };
};

const combinedReducer = combineReducers({
  localState,
  sharedState,
});

const addJoinRequest = createAction<User>("lobby/addJoinRequest");
const approveJoinRequest = createAction<User>("lobby/approveJoinRequest");
const denyJoinRequest = createAction<User>("lobby/denyJoinRequest");

function findConflictingUser(list: User[], user: User) {
  return list.find(
    (u) => u.ggId === user.ggId || u.publicKey === user.publicKey
  );
}

const crossReducer = (
  state: ReturnType<typeof combinedReducer>,
  action: AnyAction
) =>
  createNextState(state, (draft) => {
    if (!draft.localState || !draft.sharedState) {
      return;
    }
    switch (action.type) {
      case addJoinRequest.toString(): {
        if (
          !findConflictingUser(draft.localState.joinRequests, action.payload) &&
          !findConflictingUser(draft.sharedState.users, action.payload)
        ) {
          draft.localState.joinRequests.push(action.payload);
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
  });

const lobbyReducer = reduceReducers(
  combinedReducer,
  crossReducer
) as typeof combinedReducer;

const getMembers = (state: RootState) => state.lobby.sharedState?.users;
const getOnlineUsers = (state: RootState) =>
  state.lobby.localState?.onlineUsers;

const getOwner = createSelector(
  (state: RootState) => state.lobby.sharedState?.ownerPublicKey,
  getMembers,
  (owner, members) => members?.find(({ publicKey }) => publicKey === owner)
);
const getConnectionState = createSelector(
  (state: RootState) => state.user?.id,
  (state: RootState) => state.lobby.localState?.error,
  getOnlineUsers,
  getMembers,
  getOwner,
  (user, error, onlineUsers, members, owner) => {
    if (!user || !localState) {
      return ConnectionState.Disconnected;
    }

    if (error) {
      return ConnectionState.Error;
    }

    if (!members || !owner) {
      return ConnectionState.GettingInitialData;
    }

    if (!onlineUsers?.includes(owner.publicKey)) {
      return ConnectionState.WaitingForHost;
    }

    if (members.findIndex(({ ggId }) => ggId === user) === -1) {
      return ConnectionState.WaitingForJoin;
    }

    return ConnectionState.Connected;
  }
);

export const lobbySelectors = {
  getConnectionState,
  getOnlineUsers,
  getMembers,
  getOwner,
};

export {
  createLobby,
  lobbyMiddleware,
  addJoinRequest,
  approveJoinRequest,
  denyJoinRequest,
};
export default lobbyReducer;
