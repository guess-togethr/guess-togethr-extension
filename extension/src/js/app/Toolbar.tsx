import React, { MouseEvent } from "react";
import { useSelector } from "react-redux";
import { userSelector } from "../store/user";
import { useBackgroundSelector, useBackgroundDispatch } from ".";
import { Button, Menu, MenuItem } from "@material-ui/core";
import { addLobby, lobbySelector } from "../store/backgroundStore";

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
    lobbySelector.selectAll(state)
  );

  console.log(lobbies);

  return (
    <div>
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
