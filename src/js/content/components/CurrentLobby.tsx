import React, { useMemo, CSSProperties } from "react";
import { ConnectionState } from "../store/lobbyState";
import {
  Button,
  Typography,
  Avatar,
  makeStyles,
  TextField,
  ListItem,
} from "@material-ui/core";
import { AvatarGroup } from "@material-ui/lab";
import Growable from "../containers/Growable";
import ToolbarHeader from "./ToolbarHeader";

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

interface OnlineUsersProps {
  onlineUsers: { id: string; name: string }[];
  style?: CSSProperties;
}

const OnlineUsers = React.forwardRef<HTMLDivElement, OnlineUsersProps>(
  ({ onlineUsers, style }, ref) => (
    <ListItem
      button
      ref={ref}
      style={{
        display: "flex",
        alignItems: "center",
        marginTop: 8,
        ...style,
      }}
    >
      <AvatarGroup max={3} style={{ marginRight: 8 }}>
        {onlineUsers.map((u) => (
          <Avatar key={u.id}>{u.name[0]}</Avatar>
        ))}
      </AvatarGroup>
      <Typography variant="overline">{`${onlineUsers.length} user${
        onlineUsers.length > 0 ? "s" : ""
      } online`}</Typography>
    </ListItem>
  )
);

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
        {onlineUsers.length ? (
          <Growable>
            <OnlineUsers onlineUsers={onlineUsers} />
          </Growable>
        ) : undefined}
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
