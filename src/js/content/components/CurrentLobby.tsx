import React from "react";
import { ConnectionState } from "../store/lobbyState";

interface Props {
  name: string;
  expanded: boolean;
  state: ConnectionState;
  onLeave?: () => void;
}

const CurrentLobby = (props: Props) => {
  const { name, expanded, state, onLeave } = props;
};
