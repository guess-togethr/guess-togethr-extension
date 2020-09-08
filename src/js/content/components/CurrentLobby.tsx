import React, { useMemo } from "react";
import { ConnectionState } from "../store/lobbyState";
import { Button, makeStyles, TextField, ListItem } from "@material-ui/core";
import Growable from "../containers/Growable";
import ToolbarHeader from "./ToolbarHeader";
import OnlineUsers, { OnlineUsersProps } from "./OnlineUsers";

const useStyles = makeStyles({
  outerContainer: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
  },
  toplineContainer: {
    display: "flex",
  },
  leaveButton: { alignSelf: "center", margin: "8px 0" },
  toolbarHeader: {
    paddingTop: 0,
    paddingBottom: 0,
    minHeight: 44,
  },
});

export interface CurrentLobbyProps extends OnlineUsersProps {
  name: string;
  connectionState: ConnectionState;
  inviteUrl: string;
  onHeaderClick: () => void;
  onLeave?: () => void;
}

const CurrentLobby: React.FunctionComponent<CurrentLobbyProps> = (props) => {
  const {
    name,
    onlineUsers,
    connectionState,
    inviteUrl,
    onHeaderClick,
    onLeave,
  } = props;
  const classes = useStyles();
  const connectionLabel = useMemo(() => {
    switch (connectionState) {
      case ConnectionState.Connected:
        return "Connected";
      case ConnectionState.Connecting:
        return "Connecting";
      case ConnectionState.GettingInitialData:
      case ConnectionState.WaitingForHost:
        return "Waiting for host";
      case ConnectionState.WaitingForJoin:
        return "Waiting for join approval";
      case ConnectionState.Error:
        return "Error!";
    }
  }, [connectionState]);
  return (
    <div className={classes.outerContainer}>
      <ToolbarHeader
        primary={name}
        secondary={connectionLabel}
        onClick={onHeaderClick}
        className={classes.toolbarHeader}
      />
      <div className={classes.outerContainer}>
        <Growable>
          <OnlineUsers onlineUsers={onlineUsers} />
        </Growable>
        <ListItem>
          <Growable>
            <TextField
              fullWidth
              inputProps={{
                readOnly: true,
                onClick: (event) => event.stopPropagation(),
                onMouseDown: (event) => event.stopPropagation(),
                onFocus: (event) => event.currentTarget.select(),
                onBlur: (event) => event.currentTarget.setSelectionRange(0, 1),
              }}
              variant="filled"
              size="small"
              label="Invite Link"
              defaultValue={inviteUrl}
            />
          </Growable>
        </ListItem>
        <Growable>
          <Button color="secondary" className={classes.leaveButton}>
            Leave Lobby
          </Button>
        </Growable>
      </div>
    </div>
  );
};

export default CurrentLobby;
