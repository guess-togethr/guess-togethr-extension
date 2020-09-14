import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  claimSavedLobby,
  removeSavedLobby,
  savedLobbySelector,
  saveLobby,
} from "../../background/store";
import { createLobby, lobbySelectors } from "../store/lobbyState";
import {
  useBackgroundSelector,
  useAppSelector,
  useAppDispatch,
  useBackgroundDispatch,
} from "../hooks";
import { selectUser, userCacheSelectors } from "../store/geoguessrState";
import Dropdown from "../components/Dropdown";
import ToolbarHeader from "../components/ToolbarHeader";
import SignedOut from "../components/SignedOut";
import CreateNew from "../components/CreateNew";
import { unwrapResult } from "@reduxjs/toolkit";
import SavedLobby, { SavedLobbyHeader } from "../components/SavedLobby";
import { useBackgroundEndpoint } from "./BackgroundEndpointProvider";
import CurrentLobbyContainer from "./CurrentLobby";

const ToolbarContainer = () => {
  const currentUser = useAppSelector(selectUser);
  const savedLobbies = useBackgroundSelector(
    savedLobbySelector.selectAll
  ).filter(({ user }) => currentUser && user === currentUser.id);
  const [open, setOpen] = useState(false);
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

  const savedLobbyElements = useMemo(
    () =>
      savedLobbies.length
        ? [
            <SavedLobbyHeader
              key="savedlobby-header"
              onEditClick={() => setEditMode((e) => !e)}
            />,
            ...savedLobbies.map((l) => (
              <SavedLobby
                onDelete={editMode ? onDelete : undefined}
                onClick={(id) => backgroundDispatch(claimSavedLobby(id))}
                key={l.id}
                name={l.name}
                id={l.id}
              />
            )),
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
      {currentUser && claimedLobby ? (
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
          {!currentUser ? <SignedOut /> : null}
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
