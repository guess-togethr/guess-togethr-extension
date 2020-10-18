import ToolbarHeader from "../components/ToolbarHeader";
import React from "react";
import LobbyError from "../components/LobbyError";
import Dropdown from "../components/Dropdown";

export default (
  <Dropdown collapsedHeight={44} open={true}>
    <ToolbarHeader primary="GuessTogethr" onClick={() => {}}>
      <LobbyError message="Invalid lobby ID!" />
    </ToolbarHeader>
  </Dropdown>
);
