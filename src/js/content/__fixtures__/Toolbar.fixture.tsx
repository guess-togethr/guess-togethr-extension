import React from "react";
import faker from "faker";
import Toolbar from "../components/Toolbar";

export default (
  <Toolbar
    lobbies={Array.from({ length: 5 }, () => ({
      id: faker.random.word(),
      name: faker.random.word(),
    }))}
  />
);
