import * as Comlink from "comlink";
import { createBackgroundEndpoint, isMessagePort } from "comlink-extension";
import Debug from "debug";
import { browser } from "webextension-polyfill-ts";
import { createStore, makeTabAwareStore } from "./store/backgroundStore";
import { Store } from "@reduxjs/toolkit";
import { initializeNetworking } from "./network";

const debug = Debug("background");

export class BackgroundEndpoint {
  private readonly listeners: (() => void)[] = [];
  private static lobbyMap = new Map<string, BackgroundEndpoint>();
  private static _store: Store = createStore();
  private readonly store: typeof BackgroundEndpoint._store &
    Comlink.ProxyMarked;

  constructor(private readonly tabId: number) {
    this.store = Comlink.proxy(
      makeTabAwareStore(BackgroundEndpoint._store, this.tabId)
    );
  }
  public async getStore() {
    await initializeNetworking();
    return this.store;
  }
  public onUrlChange(cb: () => void) {
    browser.webNavigation.onHistoryStateUpdated.addListener(cb, {
      url: [{ urlEquals: "https://www.geoguessr.com/" }],
    });
    this.listeners.push(cb);
  }

  public destroy() {}
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
