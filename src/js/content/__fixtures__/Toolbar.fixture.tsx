import React from "react";
import faker from "faker";
import Toolbar from "../components/Toolbar";
import { ConnectionState } from "../store/lobbyState";

export default {
  unconnected: (
    <Toolbar
      lobbies={Array.from({ length: 5 }, () => ({
        id: faker.random.word(),
        name: faker.random.word(),
      }))}
    />
  ),
  connected: (
    <Toolbar
      lobbies={Array.from({ length: 5 }, () => ({
        id: faker.random.word(),
        name: faker.random.word(),
      }))}
      currentLobby={{
        connectionState: faker.random.number(
          Object.keys(ConnectionState).length / 2
        ),
        name: faker.random.word(),
        onlineUsers: Array.from({ length: faker.random.number(10) }, () => ({
          id: faker.random.alphaNumeric(10),
          name: faker.name.firstName(),
        })),
      }}
    ></Toolbar>
  ),
};
