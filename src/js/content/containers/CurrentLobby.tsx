import React, { useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import { createStructuredSelector } from "reselect";
import {
  FullSavedLobby,
  releaseSavedLobby,
  updateSavedLobby,
} from "../../background/store";
import { createDeepEqualSelector } from "../../utils";
import CurrentLobby, { CurrentLobbyProps } from "../components/CurrentLobby";
import Shims from "../ggShims";
import {
  AppDispatch,
  createLobby,
  leaveLobby,
  queryUsers,
  selectConnectionState,
  selectOnlineMembers,
  userCacheSelectors,
} from "../store";
import { useAppSelector, useBackgroundDispatch } from "../storeHooks";

interface CurrentLobbyContainerProps
  extends Omit<
    CurrentLobbyProps,
    "name" | "connectionState" | "inviteUrl" | "onlineUsers"
  > {
  claimedLobby: FullSavedLobby;
}

const claimedLobbySelector = createStructuredSelector<
  FullSavedLobby,
  Pick<FullSavedLobby, "id" | "identity" | "isServer">
>(
  {
    id: (l) => l.id,
    identity: (l) => l.identity,
    isServer: (l) => l.isServer,
  },
  createDeepEqualSelector
);

const CurrentLobbyContainer = (props: CurrentLobbyContainerProps) => {
  const { claimedLobby, ...rest } = props;

  const appDispatch: AppDispatch = useDispatch();
  const backgroundDispatch = useBackgroundDispatch();

  // Use custom deep selector that only extracts relevant lobby opts
  const claimedLobbyOpts = claimedLobbySelector(claimedLobby);
  const connectedLobby = useAppSelector((state) => state.lobby?.localState);
  const connectedLobbyId = connectedLobby?.id;
  const connectedLobbyName = useAppSelector(
    (state) => state.lobby?.serverState?.name
  );

  const onlineMembers = useAppSelector(selectOnlineMembers);
  const userCache = useAppSelector(userCacheSelectors.selectEntities);

  const onlineUsersMemo = useMemo(
    () =>
      onlineMembers.map((m) => {
        const cachedUser = userCache[m.ggId];
        return {
          id: m.ggId,
          name:
            cachedUser && "name" in cachedUser
              ? cachedUser.name
              : "Unknown User",
          avatar:
            cachedUser && "avatar" in cachedUser
              ? cachedUser.avatar
              : undefined,
        };
      }),
    [onlineMembers, userCache]
  );

  const connectionState = useAppSelector(selectConnectionState);

  // Update the saved lobby name once we get it
  useEffect(() => {
    if (connectedLobbyName && !claimedLobby.name) {
      backgroundDispatch(
        updateSavedLobby({
          id: claimedLobby.id,
          changes: { name: connectedLobbyName },
        })
      );
    }
  }, [connectedLobbyName, claimedLobby, backgroundDispatch]);

  // Synchronize user cache with online users
  useEffect(() => {
    const missingMembers = onlineMembers
      .map(({ ggId }) => ggId)
      .filter((ggId) => !userCache[ggId]);
    if (missingMembers.length) {
      appDispatch(queryUsers(missingMembers));
    }
  }, [onlineMembers, userCache, appDispatch]);

  // Join and leave lobby properly on mount/unmount
  useEffect(() => {
    if (connectedLobbyId !== claimedLobbyOpts.id) {
      appDispatch(createLobby(claimedLobbyOpts));
    }

    if (connectedLobbyId) {
      return () => {
        appDispatch(leaveLobby());
      };
    }
  }, [claimedLobbyOpts, connectedLobbyId, appDispatch]);

  return (
    <>
      <CurrentLobby
        name={claimedLobby.name ?? "Unnamed Lobby"}
        connectionState={connectionState}
        inviteUrl={`https://guess-togethr.github.io/?join=${claimedLobby.id}`}
        onlineUsers={onlineUsersMemo}
        onLeave={() => backgroundDispatch(releaseSavedLobby())}
        {...rest}
      />
      <Shims />,
    </>
  );
};

export default CurrentLobbyContainer;
