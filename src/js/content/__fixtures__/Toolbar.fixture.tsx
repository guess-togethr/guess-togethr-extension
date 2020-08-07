import React from "react";
import Toolbar from "../components/Toolbar";
import faker from "faker";

export default (
  <Toolbar
    lobbies={Array.from({ length: 5 }, () => ({
      id: faker.random.word(),
      name: faker.random.word(),
    }))}
  />
);
