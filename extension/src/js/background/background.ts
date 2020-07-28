import * as Comlink from "comlink";
import { createBackgroundEndpoint, isMessagePort } from "comlink-extension";
import Debug from "debug";
import { browser, WebNavigation } from "webextension-polyfill-ts";
import {
  createStore,
  SavedLobby,
  saveLobby,
  releaseSavedLobby,
} from "../store/backgroundStore";
import { Store } from "@reduxjs/toolkit";
import { initializeNetworking, NetworkFeed, NetworkFeedOpts } from "./network";
import { makeTabAwareStore } from "../utils";

const debug = Debug("background");

export class BackgroundEndpoint {
  private readonly listeners: any[] = [];
  private static _store: Store;
  private readonly store: Store;

  constructor(private readonly tabId: number) {
    if (!BackgroundEndpoint._store) {
      BackgroundEndpoint._store = createStore();
    }
    this.store = makeTabAwareStore(BackgroundEndpoint._store, this.tabId);
    browser.tabs.onRemoved.addListener(this.onTabClose);
  }

  public async getStore() {
    await initializeNetworking();
    return Comlink.proxy(this.store);
  }

  public onUrlChange(cb: () => void) {
    const listener = ({
      tabId,
    }: WebNavigation.OnHistoryStateUpdatedDetailsType) =>
      tabId === this.tabId && cb();
    browser.webNavigation.onHistoryStateUpdated.addListener(listener, {
      url: [{ urlEquals: "https://www.geoguessr.com/" }],
    });
    this.listeners.push(listener);
  }

  public createNetworkFeed(opts: NetworkFeedOpts) {
    return Comlink.proxy(new NetworkFeed(opts));
  }

  private onTabClose = (tabId: number) => {
    if (tabId === this.tabId) {
      this.store.dispatch(releaseSavedLobby());
    }
    browser.tabs.onRemoved.removeListener(this.onTabClose);
  };

  public destroy() {}
}

browser.runtime.onConnect.addListener((port) => {
  if (
    isMessagePort(port) ||
    port.sender?.frameId !== 0 ||
    !port.sender?.tab?.id ||
    !port.sender?.url?.match(/^https:\/\/www\.geoguessr\.com/)
  ) {
    return;
  }
  const endpoint = new BackgroundEndpoint(port.sender.tab.id);
  Comlink.expose(endpoint, createBackgroundEndpoint(port));
  port.onDisconnect.addListener(() => endpoint.destroy());
});
