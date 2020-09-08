import React, { useEffect } from "react";
import { AppDispatch } from "../store";
import { useDispatch } from "react-redux";
import { createLobby } from "../store/lobbyState";
import { SavedLobby } from "../../background/store";
import { useAppSelector } from "../hooks";
import { leaveLobby } from "../store/localState";
import { ListItem, ListItemText } from "@material-ui/core";

interface Props {
  claimedLobby: SavedLobby;
}

const CurrentLobbyContainer = (props: Props) => {
  const { claimedLobby } = props;

  const appDispatch: AppDispatch = useDispatch();

  const connectedLobby = useAppSelector((state) => state.lobby?.localState);
  const connectedLobbyId = connectedLobby?.id;

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
    <ListItem button>
      <ListItemText primary={connectedLobby?.name ?? "LOADING"} />
    </ListItem>
  );
};

export default CurrentLobbyContainer;
