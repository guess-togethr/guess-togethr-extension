import ReadyScreen from "../components/ReadyScreen";
import React from "react";
import faker from "faker";

export default (
  <ReadyScreen
    lobbyName={faker.random.word()}
    users={Array.from({ length: 5 }, () => {
      const name = faker.random.word();
      return {
        name,
        ready: faker.random.boolean(),
      };
    })}
  />
);
