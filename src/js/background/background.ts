import * as Comlink from "comlink";
import { createBackgroundEndpoint, isMessagePort } from "comlink-extension";
import Debug from "debug";
import { browser, WebNavigation } from "webextension-polyfill-ts";
import {
  createStore,
  releaseSavedLobby,
  BackgroundStore,
  savedLobbySelector,
  claimSavedLobby,
  saveLobby,
  BackgroundRootState,
} from "./store";
import { Store, AnyAction } from "@reduxjs/toolkit";
import { initializeNetworking, NetworkFeed, NetworkFeedOpts } from "./network";
import { makeTabAwareStore, TabAwareStore } from "../utils";

const debug = Debug("background");

debug("yo");

export class BackgroundEndpoint {
  private readonly urlListeners: any[] = [];
  public static get globalStore() {
    if (!BackgroundEndpoint._store) {
      BackgroundEndpoint._store = createStore();
    }
    return BackgroundEndpoint._store;
  }
  private static _store: Promise<BackgroundStore>;
  private store?: TabAwareStore<BackgroundRootState, AnyAction>;
  public static map: Map<number, BackgroundEndpoint> = new Map();

  constructor(public readonly tabId: number) {
    browser.tabs.onRemoved.addListener(this.onTabClose);
    BackgroundEndpoint.map.set(tabId, this);
  }

  public async getStore() {
    await initializeNetworking();
    this.store = makeTabAwareStore(
      await BackgroundEndpoint.globalStore,
      this.tabId
    );
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
    this.urlListeners.push(() => {
      browser.webNavigation.onHistoryStateUpdated.removeListener(listener);
      (cb as any)[Comlink.releaseProxy]();
    });
  }

  public createNetworkFeed(...args: ConstructorParameters<typeof NetworkFeed>) {
    return Comlink.proxy(new NetworkFeed(...args));
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
    this.store?.destroy();
    BackgroundEndpoint.map.delete(this.tabId);
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

browser.webNavigation.onBeforeNavigate.addListener(
  async ({ tabId, url }) => {
    BackgroundEndpoint.map.get(tabId)?.destroy();
    const id = new URL(url).searchParams.get("join");
    if (id) {
      const [store] = await Promise.all([
        BackgroundEndpoint.globalStore.then((store) =>
          makeTabAwareStore(store, tabId)
        ),
        initializeNetworking(),
      ]);

      if (!savedLobbySelector.selectById(store.getState(), id)) {
        try {
          const feed = new NetworkFeed({ isServer: false, id });
          store.dispatch(
            saveLobby({ id, identity: feed.identity, isServer: false })
          );
        } catch (e) {
          store.dispatch(saveLobby({ id, error: e.message, tabId }));
        }
      }
      store.dispatch(claimSavedLobby(id));
    }

    browser.tabs.update(tabId, {
      url: "https://www.geoguessr.com",
    });
  },
  {
    url: [{ hostEquals: "guess-togethr.github.io", queryContains: "join" }],
  }
);
