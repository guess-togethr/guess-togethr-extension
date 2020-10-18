import ReadyScreen from "../components/ReadyScreen";
import React, { useState } from "react";
import faker from "faker";

const ReadyStateWrapper: typeof ReadyScreen = (props) => {
  const [ready, setReady] = useState(false);
  return (
    <ReadyScreen
      {...props}
      currentUser={{ ...props.currentUser, ready }}
      onStart={undefined}
      onReady={() => setReady(true)}
    />
  );
};

const generateRandom = () => ({
  lobbyName: faker.random.word(),
  currentRound: {
    mapName: faker.random.words(4),
    round: faker.random.number({ min: 1, max: 5 }),
  },
  ownerName: faker.name.firstName(),
  users: Array.from({ length: 15 }, () => {
    const name = faker.random.word();
    return {
      id: faker.random.alphaNumeric(5),
      name,
      ready: faker.random.boolean(),
    };
  }),
  currentUser: {
    id: faker.random.alphaNumeric(5),
    name: faker.random.word(),
    ready: faker.random.boolean(),
  },
});

export default {
  normal: <ReadyStateWrapper {...generateRandom()} onReady={() => {}} />,
  noUsers: (
    <ReadyStateWrapper {...generateRandom()} users={[]} onReady={() => {}} />
  ),
  owner: <ReadyScreen {...generateRandom()} onStart={() => {}} />,
};
