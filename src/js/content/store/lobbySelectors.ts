import { RootState } from ".";
import { createSelector } from "@reduxjs/toolkit";
import { selectUser } from "./geoguessrState";

export enum ConnectionState {
  Disconnected,
  Connecting,
  GettingInitialData,
  WaitingForHost,
  WaitingForJoin,
  Connected,
  Error,
}

export const selectMembers = (state: RootState) =>
  state.lobby.sharedState?.users;
export const selectOnlineUsers = (state: RootState) =>
  state.lobby.localState?.onlineUsers;

export const selectOnlineMembers = createSelector(
  selectMembers,
  selectOnlineUsers,
  (members, onlineUsers) => {
    if (!onlineUsers || !members) {
      return [];
    }

    // return onlineUsers.reduce(
    //   (a, c) => a.concat(...[members.find((m) => m.publicKey === c) ?? []]),
    //   [] as User[]
    // );
    return members.filter(({ publicKey }) => onlineUsers.includes(publicKey));
  }
);

export const selectOwner = createSelector(
  (state: RootState) => state.lobby.sharedState?.ownerPublicKey,
  selectMembers,
  (owner, members) => members?.find(({ publicKey }) => publicKey === owner)
);
export const selectConnectionState = createSelector(
  selectUser,
  (state: RootState) => state.lobby.localState,
  selectOnlineUsers,
  selectMembers,
  selectOwner,
  (user, localState, onlineUsers, members, owner) => {
    if (!user || !localState) {
      return ConnectionState.Disconnected;
    }

    if (localState.error) {
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
