import { unwrapResult } from "@reduxjs/toolkit";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  claimSavedLobby,
  FullSavedLobby,
  isFullLobby,
  removeSavedLobby,
  SavedLobby,
  savedLobbySelector,
  saveLobby,
  updateSavedLobby,
} from "../../background/store";
import CreateNew from "../components/CreateNew";
import Dropdown from "../components/Dropdown";
import LobbyError from "../components/LobbyError";
import {
  default as SavedLobbyComponent,
  SavedLobbyHeader,
} from "../components/SavedLobby";
import SignedOut from "../components/SignedOut";
import ToolbarHeader from "../components/ToolbarHeader";
import {
  useAppDispatch,
  useAppSelector,
  useBackgroundDispatch,
  useBackgroundSelector,
} from "../storeHooks";
import { useBackgroundEndpoint } from "./BackgroundEndpointProvider";
import CurrentLobbyContainer from "./CurrentLobby";
import { selectUser, createLobby } from "../store";

function isErroredLobby(
  lobby: SavedLobby | null
): lobby is Exclude<typeof lobby, FullSavedLobby | null> {
  return lobby !== null && !isFullLobby(lobby);
}

const ToolbarContainer = () => {
  const currentUser = useAppSelector(selectUser);
  const savedLobbies = useBackgroundSelector(
    savedLobbySelector.selectAll
  ).filter(
    (lobby) =>
      isErroredLobby(lobby) ||
      !lobby.user ||
      (currentUser && lobby.user === currentUser.id)
  );
  const [editMode, setEditMode] = useState(false);

  const dispatch = useAppDispatch();
  const backgroundDispatch = useBackgroundDispatch();
  const backgroundEndpoint = useBackgroundEndpoint();

  const claimedLobbyIndex = savedLobbies.findIndex(
    ({ tabId }) => tabId === backgroundEndpoint?.tabId
  );
  const claimedLobby =
    claimedLobbyIndex >= 0
      ? savedLobbies.splice(claimedLobbyIndex, 1)[0]
      : null;

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Start opened if claimed lobby has an error
  const [open, setOpen] = useState(isErroredLobby(claimedLobby));

  const onCreate = useCallback(
    (name) =>
      dispatch(createLobby({ isServer: true, name }))
        .then(unwrapResult)
        .then(({ saveState }) => {
          backgroundDispatch(saveLobby(saveState));
          backgroundDispatch(claimSavedLobby(saveState.id));
        }),
    [dispatch, backgroundDispatch]
  );

  const onDelete = useCallback(
    (id) => backgroundDispatch(removeSavedLobby(id)),
    [backgroundDispatch]
  );

  useEffect(() => {
    if (savedLobbies.length === 0 || !open) setEditMode(false);
  }, [savedLobbies.length, open]);

  // Delete error lobby on dropdown close
  useEffect(() => {
    if (!open && isErroredLobby(claimedLobby)) {
      backgroundDispatch(removeSavedLobby(claimedLobby.id));
    }
  }, [open, claimedLobby, backgroundDispatch]);

  // Update lobby user
  useEffect(() => {
    if (
      claimedLobby !== null &&
      isFullLobby(claimedLobby) &&
      claimedLobby.user === undefined &&
      currentUser
    ) {
      backgroundDispatch(
        updateSavedLobby({
          id: claimedLobby.id,
          changes: { user: currentUser.id },
        })
      );
    }
  }, [claimedLobby, currentUser, backgroundDispatch]);

  const savedLobbyElements = useMemo(
    () =>
      savedLobbies.length
        ? [
            <SavedLobbyHeader
              key="savedlobby-header"
              onEditClick={() => setEditMode((e) => !e)}
            />,
            ...savedLobbies.map((l) =>
              isFullLobby(l) ? (
                <SavedLobbyComponent
                  onDelete={editMode ? onDelete : undefined}
                  onClick={(id) => backgroundDispatch(claimSavedLobby(id))}
                  key={l.id}
                  name={l.name}
                  id={l.id}
                />
              ) : null
            ),
          ]
        : null,
    [savedLobbies, onDelete, editMode, backgroundDispatch]
  );

  return (
    <Dropdown
      ref={dropdownRef}
      open={open}
      onClose={() => setOpen(false)}
      collapsedHeight={44}
    >
      {currentUser && claimedLobby && isFullLobby(claimedLobby) ? (
        <CurrentLobbyContainer
          rootRef={dropdownRef}
          claimedLobby={claimedLobby}
          expanded={open}
          onHeaderClick={() => setOpen((isOpen) => !isOpen)}
        />
      ) : (
        <ToolbarHeader
          key="header"
          primary="GuessTogethr"
          onClick={() => setOpen((isOpen) => !isOpen)}
        >
          {isErroredLobby(claimedLobby) ? (
            <LobbyError message={claimedLobby.error} />
          ) : !currentUser ? (
            <SignedOut />
          ) : null}
        </ToolbarHeader>
      )}
      {currentUser
        ? (savedLobbyElements || []).concat(
            <CreateNew
              key="create-new"
              onCreate={onCreate}
              isPro={currentUser.isPro}
            />
          )
        : null}
    </Dropdown>
  );
};

export default React.memo(ToolbarContainer);
