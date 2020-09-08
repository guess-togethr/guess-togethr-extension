import {
  combineReducers,
  Middleware,
  createSelector,
  createAction,
  createNextState,
  AnyAction,
  createAsyncThunk,
  unwrapResult,
} from "@reduxjs/toolkit";
import { RootState } from ".";
import sharedState from "./sharedState";
import { LobbyServer, LobbyClient } from "../lobbyManager";
import { User } from "../../protocol/schema";
import reduceReducers from "reduce-reducers";
import { shallowEqual } from "react-redux";
import localState, { leaveLobby, createLobby } from "./localState";
import { selectUser, userCacheSelectors, queryUsers } from "./geoguessrState";

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

const combinedReducer = combineReducers({
  localState,
  sharedState,
});

const addJoinRequest = createAsyncThunk<User, User, { state: RootState }>(
  "lobby/addJoinRequest",
  async (user: User, { dispatch, getState }) => {
    if (!userCacheSelectors.selectById(getState(), user.ggId)) {
      await dispatch(queryUsers([user.ggId])).then(unwrapResult);
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

const crossReducer = (
  state: ReturnType<typeof combinedReducer>,
  action: AnyAction
) =>
  createNextState(state, (draft) => {
    if (!draft.localState || !draft.sharedState) {
      return;
    }
    switch (action.type) {
      case addJoinRequest.fulfilled.toString(): {
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

const selectMembers = (state: RootState) => state.lobby.sharedState?.users;
const selectOnlineUsers = (state: RootState) =>
  state.lobby.localState?.onlineUsers;

const selectOnlineMembers = createSelector(
  selectMembers,
  selectOnlineUsers,
  (members, onlineUsers) => {
    if (!onlineUsers || !members) {
      return [];
    }

    return onlineUsers.reduce(
      (a, c) => a.concat(...[members.find((m) => m.publicKey === c) ?? []]),
      [] as User[]
    );
  }
);

const selectOwner = createSelector(
  (state: RootState) => state.lobby.sharedState?.ownerPublicKey,
  selectMembers,
  (owner, members) => members?.find(({ publicKey }) => publicKey === owner)
);
const selectConnectionState = createSelector(
  selectUser,
  (state: RootState) => state.lobby.localState?.error,
  selectOnlineUsers,
  selectMembers,
  selectOwner,
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

    if (members.findIndex(({ ggId }) => ggId === (user && user.id)) === -1) {
      return ConnectionState.WaitingForJoin;
    }

    return ConnectionState.Connected;
  }
);

export const lobbySelectors = {
  selectConnectionState,
  selectOnlineUsers,
  selectOnlineMembers,
  selectMembers,
  selectOwner,
};

export {
  createLobby,
  lobbyMiddleware,
  addJoinRequest,
  approveJoinRequest,
  denyJoinRequest,
};
export default lobbyReducer;
