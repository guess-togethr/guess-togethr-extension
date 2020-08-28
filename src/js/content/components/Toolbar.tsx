import React, { useMemo, useState, useCallback } from "react";
import Dropdown from "./Dropdown";
import { ConnectionState } from "../store/lobbyState";
import {
  ListItemIcon,
  SvgIcon,
  ListItemText,
  ListItem,
  makeStyles,
} from "@material-ui/core";
import Logo from "../logo.svg";
import CurrentLobby, { CurrentLobbyProps } from "./CurrentLobby";

const useStyles = makeStyles({
  mainListItem: {
    alignItems: "start",
  },
  "@global": {
    "*": {
      "--stop-color-1": "#ffffff",
      "--stop-color-2": "#ffffff",
    },
  },
});

interface ToolbarProps {
  currentLobby?: {
    name: string;
    connectionState: ConnectionState;
    onlineUsers: { id: string; name: string }[];
  };
  lobbies: { id: string; name?: string }[];
}

const Toolbar = ({ currentLobby, lobbies }: ToolbarProps) => {
  const classes = useStyles();
  const [open, setOpen] = useState(false);
  const logoColor = useMemo(() => {
    if (!currentLobby) {
      return "white";
    }

    switch (currentLobby.connectionState) {
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
  }, [currentLobby?.connectionState]);

  const onMainClick = useCallback(() => setOpen((isOpen) => !isOpen), []);
  const mainChild = useMemo(
    () => (
      <ListItem className={classes.mainListItem} button onClick={onMainClick}>
        <ListItemIcon style={{ marginTop: 4 }}>
          <SvgIcon>
            <Logo />
          </SvgIcon>
        </ListItemIcon>
        {currentLobby ? (
          <CurrentLobby {...currentLobby} expanded={open} />
        ) : (
          <ListItemText primaryTypographyProps={{ variant: "h6" }}>
            GuessTogethr
          </ListItemText>
        )}
      </ListItem>
    ),
    [currentLobby]
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
