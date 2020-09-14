import React, { useEffect, useMemo } from "react";
import { AppDispatch } from "../store";
import { useDispatch } from "react-redux";
import { createLobby, lobbySelectors } from "../store/lobbyState";
import {
  releaseSavedLobby,
  SavedLobby,
  updateSavedLobby,
} from "../../background/store";
import { useAppSelector, useBackgroundDispatch } from "../hooks";
import { leaveLobby } from "../store/localState";
import CurrentLobby, { CurrentLobbyProps } from "../components/CurrentLobby";
import { queryUsers, userCacheSelectors } from "../store/geoguessrState";
import Shims from "../ggShims";

interface CurrentLobbyContainerProps
  extends Omit<
    CurrentLobbyProps,
    "name" | "connectionState" | "inviteUrl" | "onlineUsers"
  > {
  claimedLobby: SavedLobby;
}

const CurrentLobbyContainer = (props: CurrentLobbyContainerProps) => {
  const { claimedLobby, ...rest } = props;

  const appDispatch: AppDispatch = useDispatch();
  const backgroundDispatch = useBackgroundDispatch();

  const connectedLobby = useAppSelector((state) => state.lobby?.localState);
  const connectedLobbyId = connectedLobby?.id;
  const connectedLobbyName = connectedLobby?.name;

  const onlineMembers = useAppSelector(lobbySelectors.selectOnlineMembers);
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

  const connectionState = useAppSelector(lobbySelectors.selectConnectionState);

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
    if (connectedLobbyId !== claimedLobby.id) {
      appDispatch(createLobby(claimedLobby));
    }

    if (connectedLobbyId) {
      return () => {
        appDispatch(leaveLobby());
      };
    }
  }, [claimedLobby, connectedLobbyId, appDispatch]);

  return (
    <>
      <CurrentLobby
        name={claimedLobby.name ?? "Unknown"}
        connectionState={connectionState}
        inviteUrl={`https://www.geoguessr.com/?join=${claimedLobby.id}`}
        onlineUsers={onlineUsersMemo}
        onLeave={() => backgroundDispatch(releaseSavedLobby())}
        {...rest}
      />
      <Shims />,
    </>
  );
};

export default CurrentLobbyContainer;
