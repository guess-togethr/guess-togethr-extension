import React, { MouseEvent } from "react";
import { useSelector } from "react-redux";
import { userSelector } from "../store/user";
import { useBackgroundSelector, useBackgroundDispatch } from "./App";
import { Button, Menu, MenuItem } from "@material-ui/core";
import { addLobby, savedLobbySelector } from "../store/backgroundStore";
import Join from "./Join";

const Toolbar = () => {
  const user = useSelector(userSelector);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const dispatch = useBackgroundDispatch();

  const onAdd = () => {
    dispatch(
      addLobby({
        id: Math.random().toString(),
        isServer: false,
        identity: { publicKey: "", privateKey: "" },
      })
    );
  };

  const lobbies = useBackgroundSelector((state) =>
    savedLobbySelector.selectAll(state)
  );

  console.log(lobbies);

  return (
    <div>
      <Join />
      <Button
        aria-controls="simple-menu"
        aria-haspopup="true"
        onClick={handleClick}
      >
        Open Menu
      </Button>
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
          <MenuItem key={l.id}>{l.id}</MenuItem>
        ))}
      </Menu>
    </div>
  );
  // return user && <div className="label-1">SUP</div>;
};

export default Toolbar;
