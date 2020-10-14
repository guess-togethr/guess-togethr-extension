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
  isErroredLobby,
  isFullLobby,
  removeSavedLobby,
  savedLobbySelectors,
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
import { selectUser, createLobby, selectUrl } from "../store";

function lobbyHasUser(lobby: any): lobby is { user: string } {
  return !!lobby.user;
}

const ToolbarContainer = () => {
  const currentUser = useAppSelector(selectUser);
  const url = useAppSelector(selectUrl);
  const savedLobbies = useBackgroundSelector(
    savedLobbySelectors.selectAll
  ).filter(
    (lobby) =>
      isErroredLobby(lobby) ||
      !lobby.user ||
      (currentUser && lobby.user === currentUser?.id)
  );
  const [editMode, setEditMode] = useState(false);

  const dispatch = useAppDispatch();
  const backgroundDispatch = useBackgroundDispatch();
  const backgroundEndpoint = useBackgroundEndpoint();

  const claimedLobby = savedLobbies.find(
    (lobby) => !!lobby.tabId && lobby.tabId === backgroundEndpoint?.tabId
  );
  claimedLobby && savedLobbies.splice(savedLobbies.indexOf(claimedLobby), 1);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Start opened if claimed lobby has an error or user needs to sign in
  const [open, setOpen] = useState(
    isErroredLobby(claimedLobby) ||
      (!!claimedLobby && !currentUser && !url.includes("signin"))
  );

  const onCreate = useCallback(
    (name) =>
      currentUser &&
      dispatch(createLobby({ isServer: true, name, user: currentUser.id }))
        .then(unwrapResult)
        .then(({ saveState }) => {
          backgroundDispatch(saveLobby(saveState));
          backgroundDispatch(claimSavedLobby(saveState.id));
        }),
    [dispatch, backgroundDispatch, currentUser]
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
      claimedLobby &&
      !isErroredLobby(claimedLobby) &&
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
              iconButton={editMode ? "check" : "edit"}
            />,
            ...savedLobbies
              .filter(isFullLobby)
              .map((l) => (
                <SavedLobbyComponent
                  onDelete={editMode && !l.tabId ? onDelete : undefined}
                  onClick={
                    editMode
                      ? undefined
                      : (id) => backgroundDispatch(claimSavedLobby(id))
                  }
                  key={l.id}
                  name={l.name}
                  id={l.id}
                  showTabIcon={!editMode && !!l.tabId}
                />
              )),
          ]
        : null,
    [savedLobbies, onDelete, editMode, backgroundDispatch]
  );

  const currentLobbyElement =
    isFullLobby(claimedLobby) && lobbyHasUser(claimedLobby) ? (
      <CurrentLobbyContainer
        rootRef={dropdownRef}
        claimedLobby={claimedLobby}
        expanded={open}
        onHeaderClick={() => setOpen((isOpen) => !isOpen)}
      />
    ) : null;

  return (
    <Dropdown
      ref={dropdownRef}
      open={open}
      onClose={() => setOpen(false)}
      collapsedHeight={44}
    >
      {currentLobbyElement || (
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
