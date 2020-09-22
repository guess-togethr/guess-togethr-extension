import ReadyScreen from "../components/ReadyScreen";
import React from "react";
import faker from "faker";

export default (
  <ReadyScreen
    lobbyName={faker.random.word()}
    mapName={faker.random.word()}
    ownerName={faker.name.firstName()}
    round={faker.random.number({ min: 1, max: 5 })}
    users={Array.from({ length: 5 }, () => {
      const name = faker.random.word();
      return {
        name,
        ready: faker.random.boolean(),
      };
    })}
  />
);
