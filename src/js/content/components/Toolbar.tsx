import React, { useMemo, useState, useCallback } from "react";
import Dropdown from "./Dropdown";
import { ConnectionState } from "../store/lobbyState";
import {
  ListItemIcon,
  SvgIcon,
  ListItemText,
  ListItem,
  makeStyles,
  ListSubheader,
  Paper,
} from "@material-ui/core";
import CurrentLobby from "./CurrentLobby";
import LogoIcon from "./LogoIcon";
import ToolbarHeader from "./ToolbarHeader";

const useStyles = makeStyles({
  mainListItem: {
    alignItems: "start",
  },
});

interface ToolbarProps {
  currentLobby?: {
    name: string;
    connectionState: ConnectionState;
    inviteUrl: string;
    onlineUsers: { id: string; name: string }[];
  };
  lobbies: { id: string; name?: string }[];
  onCreate?: () => void;
}

const Toolbar = ({ currentLobby, lobbies, onCreate }: ToolbarProps) => {
  const classes = useStyles();
  const [open, setOpen] = useState(false);
  // const logoColor = useMemo(() => {
  //   if (!currentLobby) {
  //     return "white";
  //   }

  //   switch (currentLobby.connectionState) {
  //     case ConnectionState.Connected:
  //       return "green";
  //     case ConnectionState.Error:
  //       return "red";
  //     case ConnectionState.Connecting:
  //     case ConnectionState.GettingInitialData:
  //     case ConnectionState.WaitingForHost:
  //     case ConnectionState.WaitingForJoin:
  //       return "blue";
  //     default:
  //       return "white";
  //   }
  // }, [currentLobby]);

  const onMainClick = useCallback(() => setOpen((isOpen) => !isOpen), []);
  const mainChild = useMemo(
    () => (
      <Paper>
        {currentLobby ? (
          <CurrentLobby {...currentLobby} onHeaderClick={onMainClick} />
        ) : (
          <ToolbarHeader primary="GuessTogethr" onClick={onMainClick} />
        )}
      </Paper>
    ),
    [onMainClick, currentLobby]
  );

  return (
    <Dropdown
      open={open}
      mainChild={mainChild}
      collapsedHeight={44}
      onClose={() => setOpen(false)}
    >
      {(lobbies.length
        ? [<ListSubheader>Saved Lobbies</ListSubheader>].concat(
            lobbies.map((l) => (
              <ListItem key={l.id} button>
                <ListItemText inset>{l.name}</ListItemText>
              </ListItem>
            ))
          )
        : []
      ).concat(onCreate ? [<ListSubheader>Create New</ListSubheader>] : [])}
    </Dropdown>
  );
};

export default Toolbar;
