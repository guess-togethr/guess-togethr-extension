import React, { MouseEvent } from "react";
import { useSelector, useDispatch } from "react-redux";
import { userSelector } from "../../store/user";
import { Button, Menu, MenuItem } from "@material-ui/core";
import {
  saveLobby,
  savedLobbySelector,
  claimSavedLobby,
  SavedLobby,
  BackgroundDispatch,
} from "../../store/backgroundStore";
import Join from "../Join";
import { createLobby } from "../../store/lobby";
import { AppDispatch } from "../../store";
import {
  useBackgroundDispatch,
  useBackgroundEndpoint,
  useBackgroundSelector,
} from "../hooks";
import CurrentLobby from "./CurrentLobby";

const Toolbar = () => {
  const user = useSelector(userSelector);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const backgroundDispatch: BackgroundDispatch = useBackgroundDispatch();
  const appDispatch: AppDispatch = useDispatch();
  const backgroundEndpoint = useBackgroundEndpoint();

  const onAdd = () => {
    appDispatch(createLobby({ isServer: true, name: "yoooo" })).then((action) =>
      backgroundDispatch(saveLobby((action.payload as any).saveState))
    );
  };

  const onLobbyClick = (lobby: SavedLobby) => {
    backgroundDispatch(claimSavedLobby(lobby.id));
  };

  const lobbies = useBackgroundSelector((state) =>
    savedLobbySelector.selectAll(state)
  );

  const claimedLobby = lobbies.find(
    ({ tabId }) => tabId === backgroundEndpoint.tabId
  );

  console.log(lobbies);

  return (
    <div>
      {/* <Join /> */}
      {claimedLobby ? (
        <CurrentLobby claimedLobby={claimedLobby} />
      ) : (
        <Button
          aria-controls="simple-menu"
          aria-haspopup="true"
          onClick={handleClick}
        >
          Open Menu
        </Button>
      )}
      <Menu
        id="simple-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        getContentAnchorEl={null}
      >
        <MenuItem onClick={onAdd}>Add</MenuItem>
        {lobbies.map((l) => (
          <MenuItem key={l.id} onClick={() => onLobbyClick(l)}>
            {l.name ?? "Unknown lobby"}
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
  // return user && <div className="label-1">SUP</div>;
};

export default Toolbar;
