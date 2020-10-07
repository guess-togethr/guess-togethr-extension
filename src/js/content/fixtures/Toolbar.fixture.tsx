import React from "react";
import faker from "faker";
import Toolbar from "../components/Toolbar";
import { ConnectionState } from "../store";

export default {
  unconnected: (
    <Toolbar
      lobbies={Array.from({ length: 5 }, () => {
        const id = faker.random.word();
        return {
          id,
          name: id,
          tab: faker.random.boolean(),
        };
      })}
      onCreate={alert}
      user
    />
  ),
  connected: (
    <Toolbar
      startOpen
      lobbies={Array.from({ length: 5 }, () => {
        const id = faker.random.word();
        return {
          id,
          name: id,
        };
      })}
      currentLobby={{
        connectionState: faker.random.number(
          Object.keys(ConnectionState).length / 2 - 1
        ),
        name: faker.random.word(),
        onlineUsers: Array.from(
          { length: faker.random.number(10) + 10 },
          () => ({
            id: faker.random.alphaNumeric(10),
            name: faker.name.firstName(),
          })
        ),
        inviteUrl: "https://FAKE.NEWS",
      }}
    ></Toolbar>
  ),
};
