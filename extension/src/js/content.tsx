import React from "react";
import ReactDOM from "react-dom";
import Debug from "debug";
import * as Comlink from "comlink";
import { createEndpoint } from "comlink-extension";
import { BackgroundEndpoint } from "./background";
import App from "./app";
import { store } from "./store";
import { setUser } from "./store/user";
import { browser } from "webextension-polyfill-ts";

const debug = Debug("content");

const obj = Comlink.wrap<BackgroundEndpoint>(
  createEndpoint(browser.runtime.connect())
);

async function getUserId() {
  const response = await fetch("/api/v3/profiles/");
  if (response.ok) {
    const { user } = await response.json();
    store.dispatch(setUser({ id: user.id, isPro: user.isPro }));
  } else {
    store.dispatch(setUser(null));
  }
}

obj.onUrlChange(Comlink.proxy(getUserId));
getUserId();

(async function dooo() {
  (await obj.loadLobby("fff")).doit();
})();

const toolbarDiv = document.createElement("div");
Array.from(document.getElementsByTagName("header"))
  .find((e) => e.classList.contains("header"))
  ?.children[1]?.children[0]?.prepend(toolbarDiv);
toolbarDiv.className = "header__item";

ReactDOM.render(<App />, toolbarDiv);
