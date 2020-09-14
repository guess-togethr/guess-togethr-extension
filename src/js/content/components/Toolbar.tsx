import React, {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import Dropdown from "./Dropdown";
import { ConnectionState } from "../store/lobbyState";
import {
  makeStyles,
  ListSubheader,
  Paper,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
} from "@material-ui/core";
import CurrentLobby from "./CurrentLobby";
import ToolbarHeader from "./ToolbarHeader";
import CreateNew from "./CreateNew";
import SavedLobby, { SavedLobbyHeader } from "./SavedLobby";
import { Edit } from "@material-ui/icons";
import SignedOut from "./SignedOut";

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
  startOpen?: boolean;
  user?: boolean;
}

const Toolbar = ({
  currentLobby,
  lobbies,
  onCreate,
  startOpen,
  user,
}: ToolbarProps) => {
  const [open, setOpen] = useState(startOpen === true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const onMainClick = useCallback(() => setOpen((isOpen) => !isOpen), []);
  const classes = useStyles();
  const mainChild = useMemo(
    () =>
      currentLobby ? (
        <CurrentLobby
          key="current-lobby"
          {...currentLobby}
          onHeaderClick={onMainClick}
          expanded={open}
        />
      ) : (
        <ToolbarHeader
          key="banner"
          primary="GuessTogethr"
          onClick={onMainClick}
        >
          {!user ? <SignedOut /> : null}
        </ToolbarHeader>
      ),
    [onMainClick, currentLobby, open, user]
  );

  const onDelete = useCallback(
    (id) => setLobbyState((lobbies) => lobbies.filter((l) => l.id !== id)),
    []
  );

  const [lobbyState, setLobbyState] = useState(lobbies);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (lobbyState.length === 0 || !open) setEditMode(false);
  }, [lobbyState.length, open]);

  return (
    <Dropdown
      ref={dropdownRef}
      open={open}
      collapsedHeight={44}
      onClose={() => setOpen(false)}
    >
      {[mainChild].concat(
        (lobbyState.length
          ? [
              // <ListSubheader key="saved-subheader">
              //   Saved Lobbies
              // </ListSubheader>,
              <SavedLobbyHeader
                key="savedlobby-header"
                onEditClick={() => setEditMode((e) => !e)}
              />,
            ].concat(
              lobbyState.map((lobby) => (
                <SavedLobby
                  key={lobby.id}
                  id={lobby.id}
                  name={lobby.name}
                  onClick={alert}
                  onDelete={editMode ? onDelete : undefined}
                />
              ))
            )
          : []
        ).concat(
          onCreate ? [<CreateNew key="yoooo" isPro onCreate={onCreate} />] : []
        )
      )}
    </Dropdown>
  );
};

export default Toolbar;
