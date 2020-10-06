import { RootState } from ".";
import { createSelector } from "@reduxjs/toolkit";
import { selectUser, userCacheSelectors } from "./geoguessrState";
import gtDebug from "../../debug";

const debug = gtDebug("lobby");

export enum ConnectionState {
  Disconnected,
  Connecting,
  GettingInitialData,
  WaitingForHost,
  WaitingForJoin,
  Connected,
  Error,
}

enum ChallengeStateType {
  Idle,
  WaitingForReady,
  InRound,
}

type Idle = { state: ChallengeStateType.Idle };
type WaitingForReady = {
  state: ChallengeStateType.WaitingForReady;
  round: number;
  startTime?: number;
};
type InRound = {
  state: ChallengeStateType.InRound;
  round: number;
  endTime: number;
};

export type ChallengeState = Idle | WaitingForReady | InRound;

export const SLUSH_TIME = 3 * 1000;

export function selectAdjustedTime(state: RootState) {
  return Date.now() - state.geoguessr.timeDelta;
}

export function selectChallengeState(state: RootState): ChallengeState {
  const currentChallenge = state.lobby.serverState?.currentChallenge;
  const roundStartTime = currentChallenge?.roundStartTime ?? 0;
  const timeLimit = currentChallenge?.timeLimit ?? 0;
  const currentTime = selectAdjustedTime(state);
  if (
    !currentChallenge ||
    (currentChallenge.round >= 5 && currentTime > roundStartTime + timeLimit)
  ) {
    return { state: ChallengeStateType.Idle };
  }

  if (currentChallenge.round >= 1 && currentChallenge.round <= 5) {
    if (
      currentTime >= roundStartTime - SLUSH_TIME &&
      currentTime <= roundStartTime + timeLimit
    ) {
      return {
        state: ChallengeStateType.InRound,
        round: currentChallenge.round,
        endTime: roundStartTime + timeLimit,
      };
    }
    return {
      state: ChallengeStateType.WaitingForReady,
      round: currentChallenge.round + (roundStartTime > currentTime ? 0 : 1),
      startTime:
        roundStartTime - SLUSH_TIME > currentTime
          ? roundStartTime - SLUSH_TIME
          : undefined,
    };
  }

  debug("invalid challenge state", currentChallenge);
  return { state: ChallengeStateType.Idle };
}

export const selectMembers = (state: RootState) =>
  state.lobby.serverState?.users;
export const selectOnlineUsers = (state: RootState) =>
  state.lobby.localState?.onlineUsers;

export const selectOnlineMembers = createSelector(
  selectMembers,
  selectOnlineUsers,
  (members, onlineUsers) => {
    if (!onlineUsers || !members) {
      return [];
    }

    return members.filter(({ id }) => onlineUsers.includes(id));
  }
);

export const selectOwner = createSelector(
  (state: RootState) => state.lobby.serverState?.ownerPublicKey,
  selectMembers,
  (owner, members) => members?.find(({ id }) => id === owner)
);

export const selectOwnerGgUser = createSelector(
  selectOwner,
  userCacheSelectors.selectEntities,
  (owner, cache) => (owner && cache[owner.ggId]) || null
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

    if (!onlineUsers?.includes(owner.id)) {
      return ConnectionState.WaitingForHost;
    }

    if (members.findIndex(({ ggId }) => ggId === (user && user.id)) === -1) {
      return ConnectionState.WaitingForJoin;
    }

    return ConnectionState.Connected;
  }
);
