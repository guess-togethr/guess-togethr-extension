import React from "react";
import MapPlayShim from "./MapPlay";
import LobbyClientShim from "./LobbyClient";

const Shims = () => {
  return (
    <>
      <MapPlayShim />
      <LobbyClientShim />
    </>
  );
};

export default Shims;
