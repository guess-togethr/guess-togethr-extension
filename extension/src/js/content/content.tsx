import React, { useContext } from "react";
import ReactDOM from "react-dom";
import Debug from "debug";
import { wrap, Remote } from "comlink";
import { createEndpoint } from "comlink-extension";
import { BackgroundEndpoint } from "../background/background";
import App from "./App";
import { browser } from "webextension-polyfill-ts";
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
