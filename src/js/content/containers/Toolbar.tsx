import React, { useEffect } from "react";
import { savedLobbySelector } from "../../background/store";
import { lobbySelectors } from "../store/lobbyState";
import { useBackgroundSelector, useAppSelector } from "../hooks";
import { userCacheSelectors } from "../store/geoguessrState";
import Toolbar from "../components/Toolbar";

const ToolbarContainer = () => {
  const savedLobbies = useBackgroundSelector(savedLobbySelector.selectAll);
  const currentLobby =
    useAppSelector((state) => state.lobby.localState) ?? undefined;
  const connectionState = useAppSelector(lobbySelectors.selectConnectionState);
  const onlineMembers = useAppSelector(lobbySelectors.selectOnlineMembers);
  const userCache = useAppSelector(userCacheSelectors.selectAll);

  useEffect(() => {
    const missingUsers = onlineMembers.filter(
      ({ ggId }) => !userCache.find(({ id }) => id === ggId)
    );

    if (missingUsers.length) {
    }
  }, [onlineMembers, userCache]);

  return (
    <Toolbar
      lobbies={savedLobbies.filter(({ id }) => id !== currentLobby?.id)}
      currentLobby={
        currentLobby && {
          name: currentLobby.name ?? "Loading Lobby",
          connectionState,
          onlineUsers: [],
        }
      }
    />
  );
};

export default React.memo(ToolbarContainer);
