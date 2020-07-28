import React, { useEffect, useState } from "react";
import * as Comlink from "comlink";
import { useBackgroundSelector, useBackgroundDispatch } from "./App";
import {
  savedLobbySelector,
  claimSavedLobby,
  saveLobby,
} from "../store/backgroundStore";
import { useBackgroundEndpoint } from "./content";
import { Dialog } from "@material-ui/core";

const Join = () => {
  const lobbies = useBackgroundSelector(savedLobbySelector.selectAll);
  const backgroundEndpoint = useBackgroundEndpoint();
  const backgroundDispatch = useBackgroundDispatch();
  const [loading, setLoading] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);
      const lobbyId = url.searchParams.get("ggtLobby");
      if (!lobbyId) {
        return;
      }

      setLoading(true);
      url.searchParams.delete("ggtLobby");
      window.history.replaceState(window.history.state, "", url.href);

      const existingLobby = lobbies.find(({ id }) => id === lobbyId);
      let lobbyClient;

      if (!existingLobby) {
        try {
          lobbyClient = await backgroundEndpoint.createLobbyClient({
            id: lobbyId,
          });

          backgroundDispatch(
            saveLobby({
              id: lobbyId,
              identity: await lobbyClient.identity,
              isServer: false,
            })
          );
        } catch (e) {
          console.log("INVALID LOBBY");
          return;
        }
      }
      backgroundDispatch(claimSavedLobby(lobbyId));
      lobbyClient && lobbyClient[Comlink.releaseProxy];
    })();
  }, []);
  return <Dialog open={!!loading}>Sup</Dialog>;
};

export default Join;
