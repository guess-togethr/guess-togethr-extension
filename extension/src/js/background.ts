import * as Comlink from "comlink";
import { createBackgroundEndpoint, isMessagePort } from "comlink-extension";
import Debug from "debug";
import { browser } from "webextension-polyfill-ts";
import { validateClientMessage, validateServerMessage } from "./protocol";
import { configureStore, getDefaultMiddleware } from "@reduxjs/toolkit";
import allLobbies, { lobbySelector, setMostRecent } from "./store/allLobbies";
import {
  persistReducer,
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import { syncStorage } from "redux-persist-webextension-storage";

const debug = Debug("background");

const store = configureStore({
  reducer: persistReducer(
    { storage: syncStorage, key: "ggt-lobbies" },
    allLobbies
  ),
  middleware: getDefaultMiddleware({
    serializableCheck: {
      ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
    },
  }),
});
persistStore(store);

export class Lobby {
  constructor(public readonly id: string) {}
  public doit() {
    console.log("DOING" + this.id);
  }
}

export class BackgroundEndpoint {
  private readonly listeners: (() => void)[] = [];
  private static lobbyMap = new Map<string, BackgroundEndpoint>();
  private lobby: (Lobby & Comlink.ProxyMarked) | null = null;

  constructor(private readonly tabId: number) {}
  public onUrlChange(cb: () => void) {
    browser.webNavigation.onHistoryStateUpdated.addListener(cb, {
      url: [{ urlEquals: "https://www.geoguessr.com/" }],
    });
    this.listeners.push(cb);
  }

  public unloadLobby() {
    if (this.lobby) {
      BackgroundEndpoint.lobbyMap.delete(this.lobby.id);
      this.lobby = null;
    }
  }

  public loadLobby(lobbyId: string) {
    if (this.lobby) {
      this.unloadLobby();
    }
    if (!lobbySelector.selectById(store.getState(), lobbyId)) {
      // throw new Error("Invalid Lobby ID");
    }
    const lobbyTab = BackgroundEndpoint.lobbyMap.get(lobbyId);
    if (lobbyTab) {
      browser.tabs.highlight({ tabs: lobbyTab.tabId });
    } else {
      BackgroundEndpoint.lobbyMap.set(lobbyId, this);
    }
    store.dispatch(setMostRecent(lobbyId));
    this.lobby = Comlink.proxy(new Lobby(lobbyId));
    return this.lobby;
  }

  public getAllLobbies() {
    return lobbySelector.selectAll(store.getState());
  }

  public destroy() {
    this.listeners.forEach((cb) =>
      browser.webNavigation.onHistoryStateUpdated.removeListener(cb)
    );
    this.listeners.length = 0;
    this.unloadLobby();
  }
}

// const tabMap = new Map<number, BackgroundEndpoint>();
// chrome.tabs.query({ url: "https://www.geoguessr.com/*" }, (tabs) =>
//   tabs.forEach(({ id }) => tabMap.set(id!, new BackgroundEndpoint(id!)))
// );
// window.t = tabMap;

// chrome.tabs.onUpdated.addListener((tabId, { url }) => {
//   if (!url?.match(/^https:\/\/www\.geoguessr\.com/)) {
//     return;
//   }

//   tabMap.set(tabId, new BackgroundEndpoint(tabId));
// });
// chrome.tabs.onRemoved.addListener((tabId) => {
//   tabMap.get(tabId)?.destroy();
//   tabMap.delete(tabId);
// });

browser.runtime.onConnect.addListener((port) => {
  if (
    isMessagePort(port) ||
    port.sender?.frameId !== 0 ||
    !port.sender?.tab?.id ||
    !port.sender?.url?.match(/^https:\/\/www\.geoguessr\.com/)
  ) {
    return;
  }
  const endpoint = new BackgroundEndpoint(port.sender?.tab?.id);
  Comlink.expose(endpoint, createBackgroundEndpoint(port));
  port.onDisconnect.addListener(() => endpoint.destroy());
});
