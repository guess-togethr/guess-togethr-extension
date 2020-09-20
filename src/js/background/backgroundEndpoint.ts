import {
  createStore,
  BackgroundStore,
  BackgroundRootState,
  releaseSavedLobby,
} from "./store";
import { TabAwareStore, makeTabAwareStore } from "../utils";
import { AnyAction } from "@reduxjs/toolkit";
import { browser, WebNavigation } from "webextension-polyfill-ts";
import { initializeNetworking, NetworkFeed, NetworkFeedOpts } from "./network";
import equal from "fast-deep-equal";
import * as Comlink from "comlink";

const debug = require("debug")("background-endpoint");

export default class BackgroundEndpoint {
  public static get globalStore() {
    if (!BackgroundEndpoint._store) {
      BackgroundEndpoint._store = createStore();
    }
    return BackgroundEndpoint._store;
  }
  private static _store: Promise<BackgroundStore>;
  public static map: Map<number, BackgroundEndpoint> = new Map();

  private readonly urlListeners: any[] = [];
  private destroying = false;
  private store?: TabAwareStore<BackgroundRootState, AnyAction>;
  private currentFeed?: NetworkFeed;
  private currentFeedOpts?: NetworkFeedOpts;
  private readonly alarmName: string;

  public static create(tabId: number) {
    return BackgroundEndpoint.map.get(tabId) || new BackgroundEndpoint(tabId);
  }

  private constructor(public readonly tabId: number) {
    browser.tabs.onRemoved.addListener(this.onTabClose);
    browser.alarms.onAlarm.addListener(this.finishDestroy);
    this.alarmName = `gt-${this.tabId}`;
    BackgroundEndpoint.map.set(tabId, this);
  }

  public reconnect() {
    debug("reconnecting", this.tabId);
    this.destroying = false;
    browser.alarms.clear(this.alarmName);
    return this;
  }

  public async getStore() {
    await initializeNetworking();
    if (!this.store) {
      this.store = makeTabAwareStore(
        await BackgroundEndpoint.globalStore,
        this.tabId
      );
    }
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

  public createNetworkFeed(opts: NetworkFeedOpts) {
    if (this.currentFeed && !equal(opts, this.currentFeedOpts)) {
      this.currentFeed.destroy();
      this.currentFeed = undefined;
    }
    if (!this.currentFeed || this.currentFeed.destroyed) {
      this.currentFeed = new NetworkFeed(opts);
      this.currentFeedOpts = opts;
    }
    return Comlink.proxy(this.currentFeed);
  }

  private onTabClose = (tabId?: number) => {
    debugger;
    if (tabId === this.tabId) {
      this.startDestroy();
      this.finishDestroy();
    }
  };

  public startDestroy() {
    debug("start destroy", this.tabId);
    if (!this.destroying) {
      this.destroying = true;
      this.urlListeners.forEach((l) => l());
      this.urlListeners.length = 0;
      this.store?.reset();
      this.currentFeed?.disconnect();
      browser.alarms.create(this.alarmName, { when: Date.now() + 20 * 1000 });
    }
  }

  private finishDestroy = () => {
    debug("finish destroy", this.tabId);
    browser.alarms.clear(this.alarmName);

    BackgroundEndpoint.map.delete(this.tabId);
    this.store?.dispatch(releaseSavedLobby());
    this.currentFeed?.destroy();

    browser.alarms.onAlarm.removeListener(this.finishDestroy);
    browser.tabs.onRemoved.removeListener(this.onTabClose);
  };
}
