import React, { useEffect } from "react";
import { AppDispatch } from "../../store";
import { useDispatch } from "react-redux";
import { createLobby } from "../../store/lobby";
import { SavedLobby } from "../../store/backgroundStore";
import { useAppSelector } from "../hooks";
import { leaveLobby } from "../../store/localState";

interface Props {
  claimedLobby: SavedLobby;
}

const CurrentLobby = (props: Props) => {
  const { claimedLobby } = props;
  const claimedLobbyId = claimedLobby.id;

  const appDispatch: AppDispatch = useDispatch();

  const connectedLobby = useAppSelector((state) => state.lobby?.localState);
  const connectedLobbyId = connectedLobby?.id;

  useEffect(() => {
    if (connectedLobbyId !== claimedLobbyId) {
      appDispatch(createLobby(claimedLobby));
    }

    return () => {
      appDispatch(leaveLobby());
    };
  }, [claimedLobbyId, connectedLobbyId]);
};

export default CurrentLobby;
