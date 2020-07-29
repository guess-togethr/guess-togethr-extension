import React from "react";
import ReactDOM from "react-dom";
import Debug from "debug";
import App from "./App";
import { enablePatches } from "immer";

enablePatches();

const debug = Debug("content");
const link = document.createElement("link");
link.rel = "stylesheet";
link.href =
  "https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap";
document.head.appendChild(link);

const toolbarDiv = document.createElement("div");
Array.from(document.getElementsByTagName("header"))
  .find((e) => e.classList.contains("header"))
  ?.children[1]?.children[0]?.prepend(toolbarDiv);
toolbarDiv.className = "header__item";

ReactDOM.render(<App />, toolbarDiv);
