import React, {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import Dropdown from "./Dropdown";
import CurrentLobby from "./CurrentLobby";
import ToolbarHeader from "./ToolbarHeader";
import CreateNew from "./CreateNew";
import SavedLobby, { SavedLobbyHeader } from "./SavedLobby";
import SignedOut from "./SignedOut";
import { ConnectionState } from "../store";

interface ToolbarProps {
  currentLobby?: {
    name: string;
    connectionState: ConnectionState;
    inviteUrl: string;
    onlineUsers: { id: string; name: string }[];
  };
  lobbies: { id: string; name?: string; tab?: boolean }[];
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
                iconButton={editMode ? "check" : "edit"}
              />,
            ].concat(
              lobbyState.map((lobby) => (
                <SavedLobby
                  key={lobby.id}
                  id={lobby.id}
                  name={lobby.name}
                  onClick={editMode ? undefined : alert}
                  onDelete={editMode && !lobby.tab ? onDelete : undefined}
                  showTabIcon={lobby.tab && !editMode}
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
