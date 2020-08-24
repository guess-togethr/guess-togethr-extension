import React, { useEffect } from "react";
import { AppDispatch } from "../store";
import { useDispatch } from "react-redux";
import { createLobby } from "../store/lobbyState";
import { SavedLobby } from "../../background/store";
import { useAppSelector } from "../hooks";
import { leaveLobby } from "../store/localState";
import { List, ListItem, ListItemText } from "@material-ui/core";

interface Props {
  claimedLobby: SavedLobby;
}

const CurrentLobbyContainer = (props: Props) => {
  const { claimedLobby } = props;
  const claimedLobbyId = claimedLobby.id;

  const appDispatch: AppDispatch = useDispatch();

  const connectedLobby = useAppSelector((state) => state.lobby?.localState);
  const connectedLobbyId = connectedLobby?.id;

  useEffect(() => {
    if (connectedLobbyId !== claimedLobbyId) {
      appDispatch(createLobby(claimedLobby));
    }

    if (connectedLobbyId) {
      return () => {
        appDispatch(leaveLobby());
      };
    }
  }, [claimedLobbyId, connectedLobbyId]);

  return (
    <ListItem button>
      <ListItemText primary={connectedLobby?.name ?? "LOADING"} />
    </ListItem>
  );
};

export default CurrentLobbyContainer;
