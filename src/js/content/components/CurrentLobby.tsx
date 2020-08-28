import React, { useMemo, CSSProperties } from "react";
import { ConnectionState } from "../store/lobbyState";
import {
  ListItem,
  ListItemText,
  Button,
  Grow,
  Typography,
  Avatar,
} from "@material-ui/core";
import { InView } from "react-intersection-observer";
import { AvatarGroup } from "@material-ui/lab";
import Growable from "../containers/Growable";

interface OnlineUsersProps {
  onlineUsers: { id: string; name: string }[];
  style?: CSSProperties;
}

const OnlineUsers = React.forwardRef<HTMLDivElement, OnlineUsersProps>(
  ({ onlineUsers, style }, ref) => (
    <div
      ref={ref}
      style={{
        display: "flex",
        alignItems: "center",
        marginBottom: 8,
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
    </div>
  )
);

export interface CurrentLobbyProps extends OnlineUsersProps {
  name: string;
  expanded: boolean;
  connectionState: ConnectionState;
  onLeave?: () => void;
}

const CurrentLobby: React.FunctionComponent<CurrentLobbyProps> = (props) => {
  const { name, expanded, onlineUsers, connectionState, onLeave } = props;
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
    <div>
      <ListItemText
        style={{ minHeight: 36, marginTop: 0 }}
        primaryTypographyProps={{ variant: "h6", style: { lineHeight: 1.1 } }}
        secondary={connectionLabel}
        secondaryTypographyProps={{ variant: "caption" }}
      >
        {name}
      </ListItemText>
      <div>
        {onlineUsers.length ? (
          <Growable>
            <OnlineUsers onlineUsers={onlineUsers} />
          </Growable>
        ) : undefined}
        <Growable>
          <Button variant="contained" color="primary">
            Invite
          </Button>
        </Growable>
        <Growable>
          <Button
            variant="contained"
            color="secondary"
            style={{ marginLeft: 8 }}
          >
            Leave
          </Button>
        </Growable>
      </div>
    </div>
  );
};

export default CurrentLobby;
