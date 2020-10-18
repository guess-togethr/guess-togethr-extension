import React, { useMemo, RefObject } from "react";
import { Button, ListItem } from "@material-ui/core";
import Growable from "./Growable";
import ToolbarHeader from "./ToolbarHeader";
import OnlineUsers, { OnlineUsersProps } from "./OnlineUsers";
import { ConnectionState } from "../store";
import { makeStyles } from "@material-ui/core/styles";
import ShareTextField from "./ShareTextField";

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
  expanded: boolean;
  onHeaderClick: () => void;
  onLeave?: () => void;
  rootRef?: RefObject<HTMLDivElement>;
}

const CurrentLobby: React.FunctionComponent<CurrentLobbyProps> = (props) => {
  const {
    name,
    onlineUsers,
    connectionState,
    inviteUrl,
    onHeaderClick,
    expanded,
    onLeave,
    rootRef,
  } = props;
  const classes = useStyles();
  const connectionLabel = useMemo(() => {
    switch (connectionState) {
      case ConnectionState.Connected:
        return "Connected";
      case ConnectionState.Connecting:
        return "Connecting";
      case ConnectionState.GettingInitialData:
        return "Waiting for P2P connection";
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
      >
        <div className={classes.outerContainer}>
          <Growable intersectionProps={{ root: rootRef?.current }}>
            <OnlineUsers onlineUsers={onlineUsers} />
          </Growable>
          <ListItem>
            <Growable intersectionProps={{ root: rootRef?.current }}>
              <ShareTextField
                inviteUrl={inviteUrl}
                disableTooltip={!expanded}
              />
            </Growable>
          </ListItem>
          <Growable intersectionProps={{ root: rootRef?.current }}>
            <Button
              color="secondary"
              className={classes.leaveButton}
              onClick={onLeave}
            >
              Leave Lobby
            </Button>
          </Growable>
        </div>
      </ToolbarHeader>
    </div>
  );
};

export default CurrentLobby;
