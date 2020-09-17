import * as Comlink from "comlink";
import { createBackgroundEndpoint, isMessagePort } from "comlink-extension";
import { browser } from "webextension-polyfill-ts";
import { savedLobbySelector, claimSavedLobby, saveLobby } from "./store";
import { initializeNetworking, NetworkFeed } from "./network";
import { makeTabAwareStore } from "../utils";
import BackgroundEndpoint from "./backgroundEndpoint";

browser.runtime.onConnect.addListener((port) => {
  if (
    isMessagePort(port) ||
    port.sender?.frameId !== 0 ||
    !port.sender?.tab?.id ||
    !port.sender?.url?.match(/^https:\/\/www\.geoguessr\.com/)
  ) {
    return;
  }
  const endpoint =
    BackgroundEndpoint.map.get(port.sender.tab.id)?.reconnect() ||
    new BackgroundEndpoint(port.sender.tab.id);
  Comlink.expose(endpoint, createBackgroundEndpoint(port));
  port.onDisconnect.addListener(() => endpoint.startDestroy());
});

browser.webNavigation.onBeforeNavigate.addListener(
  async ({ tabId, url }) => {
    // Destroy the background connection so store updates
    // don't leak to the old page that is about to get
    // refreshed

    BackgroundEndpoint.map.get(tabId)?.startDestroy();
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
