import * as Comlink from "comlink";
import { createBackgroundEndpoint, isMessagePort } from "comlink-extension";
import Debug from "debug";
import { browser, WebNavigation } from "webextension-polyfill-ts";
import { createStore, releaseSavedLobby, BackgroundStore } from "./store";
import { Store } from "@reduxjs/toolkit";
import { initializeNetworking, NetworkFeed, NetworkFeedOpts } from "./network";
import { makeTabAwareStore } from "../utils";

const debug = Debug("background");

debug("yo");

export class BackgroundEndpoint {
  private readonly urlListeners: any[] = [];
  private static _store: Promise<BackgroundStore>;
  private store?: Store;

  constructor(public readonly tabId: number) {
    if (!BackgroundEndpoint._store) {
      BackgroundEndpoint._store = createStore();
    }
    browser.tabs.onRemoved.addListener(this.onTabClose);
  }

  public async getStore() {
    await initializeNetworking();
    this.store = makeTabAwareStore(await BackgroundEndpoint._store, this.tabId);
    return Comlink.proxy(this.store);
  }

  public onUrlChange(cb: (url: string) => void) {
    const listener = ({
      tabId,
      url,
    }: WebNavigation.OnHistoryStateUpdatedDetailsType) =>
      tabId === this.tabId && cb(url);
    browser.webNavigation.onHistoryStateUpdated.addListener(listener, {
      url: [{ hostContains: ".geoguessr.com" }],
    });
    this.urlListeners.push(() => (cb as any)[Comlink.releaseProxy]());
  }

  public createNetworkFeed(opts: NetworkFeedOpts) {
    return Comlink.proxy(new NetworkFeed(opts));
  }

  private onTabClose = (tabId?: number) => {
    if (tabId === this.tabId) {
      this.store?.dispatch(releaseSavedLobby());
      browser.tabs.onRemoved.removeListener(this.onTabClose);
    }
  };

  public destroy() {
    this.urlListeners.forEach((l) => l());
    this.urlListeners.length = 0;
    debug("destroy");
  }
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
