import React, { useMemo, useState, useCallback } from "react";
import Dropdown from "./Dropdown";
import CurrentLobbyContainer from "../containers/CurrentLobby";
import { ConnectionState } from "../store/lobbyState";
import {
  ListItemIcon,
  SvgIcon,
  ListItemText,
  ListItem,
} from "@material-ui/core";
import Logo from "../logo.svg";

interface ToolbarProps {
  currentLobby?: typeof CurrentLobbyContainer;
  connectionState?: ConnectionState;
  lobbies: { id: string; name?: string }[];
}

const Toolbar = ({ currentLobby, lobbies, connectionState }: ToolbarProps) => {
  const [open, setOpen] = useState(false);
  const logoColor = useMemo(() => {
    if (!currentLobby || !connectionState) {
      return "white";
    }

    switch (connectionState) {
      case ConnectionState.Connected:
        return "green";
      case ConnectionState.Error:
        return "red";
      case ConnectionState.Connecting:
      case ConnectionState.GettingInitialData:
      case ConnectionState.WaitingForHost:
      case ConnectionState.WaitingForJoin:
        return "blue";
      default:
        return "white";
    }
  }, [currentLobby, connectionState]);

  const onMainClick = useCallback(() => setOpen((isOpen) => !isOpen), []);
  const mainChild = (
    <ListItem button onClick={onMainClick}>
      <ListItemIcon>
        <SvgIcon>
          <Logo color={logoColor} />
        </SvgIcon>
      </ListItemIcon>
      <ListItemText primaryTypographyProps={{ variant: "h6" }}>
        GuessTogethr
      </ListItemText>
    </ListItem>
  );

  return (
    <Dropdown
      open={open}
      mainChild={mainChild}
      collapsedHeight={48}
      onClose={() => setOpen(false)}
    >
      {lobbies.map((l) => (
        <ListItem key={l.id} button>
          <ListItemText inset>{l.name}</ListItemText>
        </ListItem>
      ))}
    </Dropdown>
  );
};

export default Toolbar;
