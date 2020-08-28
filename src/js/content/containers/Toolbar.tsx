import React, { MouseEvent, useState, forwardRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Button,
  Menu,
  MenuItem,
  Collapse,
  Popover,
  Modal,
  ListItem,
  List,
} from "@material-ui/core";
import {
  saveLobby,
  savedLobbySelector,
  claimSavedLobby,
  SavedLobby,
  BackgroundDispatch,
} from "../../background/store";
import Join from "../Join";
import { createLobby } from "../store/lobbyState";
import { AppDispatch } from "../store";
import { useBackgroundDispatch, useBackgroundSelector } from "../hooks";
import CurrentLobbyContainer from "./CurrentLobby";
import { useBackgroundEndpoint } from "./BackgroundEndpointProvider";
import { selectUser } from "../store/geoguessrState";

interface MainContentProps {
  claimedLobby?: SavedLobby;
  onClick?: () => void;
}

const MainContent = forwardRef<HTMLDivElement, MainContentProps>(
  (props, ref) => {
    return (
      <div ref={ref} onClick={props.onClick} style={{ color: "white" }}>
        {props.claimedLobby ? (
          <CurrentLobbyContainer claimedLobby={props.claimedLobby} />
        ) : (
          <Button>DOIT</Button>
        )}
      </div>
    );
  }
);

const ToolbarContainer = () => {
  const user = useSelector(selectUser);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [open, setOpen] = useState(false);

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

  if (user === null) {
    return null;
  }

  return (
    <div>
      <Collapse in={open} collapsedHeight={30}>
        <List style={{ padding: 0 }}>
          <MainContent
            ref={setAnchorEl}
            claimedLobby={claimedLobby}
            onClick={() => setOpen(true)}
          />
          {lobbies
            .filter((l) => !claimedLobby || claimedLobby.id !== l.id)
            .map((l) => (
              <ListItem key={l.id}>{l.name}</ListItem>
            ))}
        </List>

        {/* <Menu
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
        </Menu> */}
      </Collapse>
    </div>
  );
  // return user && <div className="label-1">SUP</div>;
};

export default ToolbarContainer;
