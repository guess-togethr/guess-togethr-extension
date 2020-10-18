import React from "react";
import ResultsShim from "../ggShims/Results";
import faker from "faker";
import HtmlDecorator from "./HtmlDecorator";
import html from "../../../../sample_pages/result.html";

export default (
  <HtmlDecorator html={html}>
    <ResultsShim
      lobbyName={faker.random.word()}
      ownerName={faker.name.firstName()}
      currentUser={{
        id: faker.random.alphaNumeric(5),
        name: faker.name.firstName(),
      }}
      users={Array.from({ length: 2 }, () => ({
        id: faker.random.alphaNumeric(5),
        name: faker.name.firstName(),
      }))}
      onReady={() => {}}
    />
  </HtmlDecorator>
);
