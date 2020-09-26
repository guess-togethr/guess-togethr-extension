import React, { useEffect, useMemo, useState } from "react";
import {
  useAppSelector,
  useAppDispatch,
  useBackgroundDispatch,
} from "../storeHooks";
import { makeStyles } from "@material-ui/core";
import { releaseSavedLobby } from "../../background/store";
import { selectUrl, redirect } from "../store";
import { useExternalDom } from "../hooks";

const useStyles = makeStyles({
  "@global": {
    "section.confirmation-dialog": {
      display: "none !important",
    },
  },
});

interface LobbyClientShimComponentProps {
  challengeId: string;
}

const LobbyClientShimComponent: React.FunctionComponent<LobbyClientShimComponentProps> = ({
  challengeId,
}) => {
  useStyles();
  const goButton = useExternalDom(
    document,
    "button.confirmation-dialog__action",
    true
  ) as HTMLButtonElement;
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
  const [inChallenge, setInChallenge] = useState(false);
  const dispatch = useAppDispatch();
  const backgroundDispatch = useBackgroundDispatch();
  const isClient = currentLobby && !currentLobby.isServer;

  useEffect(() => {
    if (!isClient) {
      return;
    }
    if (!inChallenge && !challengeUrl && currentChallenge?.id) {
      dispatch(
        redirect("https://www.geoguessr.com/challenge/" + currentChallenge.id)
      );
      return;
    }
    if (challengeUrl && challengeUrl === currentChallenge?.id) {
      setInChallenge(true);
    } else if (inChallenge) {
      backgroundDispatch(releaseSavedLobby());
    }
  }, [
    isClient,
    challengeUrl,
    currentChallenge,
    inChallenge,
    backgroundDispatch,
    dispatch,
  ]);

  useEffect(
    () => () => {
      // on unmount, redirect back to the home page
      dispatch(redirect("https://www.geoguessr.com"));
    },
    [dispatch]
  );

  return challengeUrl && challengeUrl === currentChallenge?.id ? (
    <LobbyClientShimComponent challengeId={challengeUrl} />
  ) : null;
};

export default LobbyClientShim;
