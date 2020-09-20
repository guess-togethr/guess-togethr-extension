import React, {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
  RefObject,
} from "react";
import {
  Button,
  makeStyles,
  ListItem,
  InputAdornment,
  IconButton,
  Tooltip,
} from "@material-ui/core";
import Growable from "./Growable";
import ToolbarHeader from "./ToolbarHeader";
import OnlineUsers, { OnlineUsersProps } from "./OnlineUsers";
import { Assignment } from "@material-ui/icons";
import TextField from "./TextField";
import { ConnectionState } from "../store";

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
      case ConnectionState.WaitingForHost:
        return "Waiting for host";
      case ConnectionState.WaitingForJoin:
        return "Waiting for join approval";
      case ConnectionState.Error:
        return "Error!";
    }
  }, [connectionState]);

  const [tooltipOpen, setTooltipOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onClipboardClick = useCallback(() => {
    inputRef.current?.select();
    document.execCommand("copy");
    setTooltipOpen(true);
  }, []);

  useEffect(() => {
    if (tooltipOpen && expanded) {
      let timer: any = setTimeout(() => {
        setTooltipOpen(false);
        timer = null;
      }, 2000);
      return () => {
        if (timer) {
          setTooltipOpen(false);
          clearTimeout(timer);
        }
      };
    }
  }, [tooltipOpen, expanded]);

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
              <TextField
                fullWidth
                inputRef={inputRef}
                InputProps={{
                  readOnly: true,
                  onFocus: (event) => event.currentTarget.select(),
                  onBlur: (event) => event.currentTarget.blur(),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Link copied!" open={tooltipOpen}>
                        <IconButton onClick={onClipboardClick}>
                          <Assignment />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                  style: { paddingRight: 4 },
                }}
                variant="filled"
                size="small"
                label="Invite Link"
                defaultValue={inviteUrl}
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
