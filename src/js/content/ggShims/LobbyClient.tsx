import React, { useEffect, useMemo } from "react";
import { useAppSelector, useExternalDom } from "../hooks";
import { selectUrl } from "../store/geoguessrState";
import { Dialog, DialogTitle } from "@material-ui/core";

const LobbyClientShimComponent = () => {
  const goButton = useExternalDom(
    document,
    "button.confirmation-dialog__action",
    true
  ) as HTMLButtonElement;
  useEffect(() => {
    goButton?.click();
  }, [goButton]);
  return null;
};

const LobbyClientShim = () => {
  const url = useAppSelector(selectUrl);
  const challengeUrl = useMemo(
    () =>
      /https:\/\/www\.geoguessr\.com\/challenge\/([^/]+)$/.exec(
        new URL(url).href
      )?.[1],
    [url]
  );
  const currentLobby = useAppSelector((state) => state.lobby.localState);
  const currentChallenge = useAppSelector(
    (state) => state.lobby.sharedState?.currentChallenge
  );
  const isClient = currentLobby && !currentLobby.isServer;

  useEffect(() => {
    if (!challengeUrl && isClient && currentChallenge?.id) {
      window.location.href =
        "https://www.geoguessr.com/challenge/" + currentChallenge.id;
    }
  }, [isClient, challengeUrl, currentChallenge]);

  return challengeUrl === currentChallenge?.id ? (
    <LobbyClientShimComponent />
  ) : null;
};

export default LobbyClientShim;
