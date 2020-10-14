import {
  createStore,
  BackgroundStore,
  BackgroundRootState,
  releaseSavedLobby,
  addIdentity,
  unsafeIdentitySelectors,
} from "./store";
import { TabAwareStore, makeTabAwareStore, Expand } from "../utils";
import { AnyAction } from "@reduxjs/toolkit";
import { browser, WebNavigation } from "webextension-polyfill-ts";
import { initializeNetworking, NetworkFeed, NetworkFeedOpts } from "./network";
import equal from "fast-deep-equal";
import * as Comlink from "comlink";
import { TimerHandle, clearTimer, setTimer } from "./timer";
import { generateNoiseKeypair } from "../crypto";

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
  private static timeDelta = BackgroundEndpoint.calculateTimeDelta();
  public timeDelta = BackgroundEndpoint.timeDelta;

  private readonly urlListeners: any[] = [];
  private store?: TabAwareStore<BackgroundRootState, AnyAction>;
  private currentFeed?: NetworkFeed;
  private currentFeedOpts?: NetworkFeedOpts;
  private destroyTimer: TimerHandle | null = null;

  public static create(tabId: number) {
    return (
      BackgroundEndpoint.map.get(tabId)?.reconnect() ||
      new BackgroundEndpoint(tabId)
    );
  }

  private constructor(public readonly tabId: number) {
    browser.tabs.onRemoved.addListener(this.onTabClose);
    BackgroundEndpoint.map.set(tabId, this);
  }

  public reconnect() {
    if (this.destroyTimer) {
      debug("reconnecting", this.tabId);
      clearTimer(this.destroyTimer);
      this.destroyTimer = null;
    }
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

  public generateIdentity(user: string) {
    if (unsafeIdentitySelectors.selectById(this.store!.getState(), user)) {
      debug("creating an identity for user who already has one", user);
      throw new Error("Overwriting existing identity!");
    }
    return this.store!.dispatch(
      addIdentity({ id: user, ...generateNoiseKeypair() })
    ).payload.publicKey;
  }

  public createNetworkFeed(
    opts: Omit<NetworkFeedOpts, "identity"> & { user: string }
  ) {
    if (this.currentFeed && !equal(opts, this.currentFeedOpts)) {
      this.currentFeed.destroy();
      this.currentFeed = undefined;
    }
    if (!this.currentFeed || this.currentFeed.destroyed) {
      const identity = unsafeIdentitySelectors.selectById(
        this.store!.getState(),
        opts.user
      );
      if (!identity) {
        debug("createNetworkFeed could not find identity", opts);
        throw new Error("Could not find identity!");
      }
      const feedOpts = Object.assign(opts, { identity }) as NetworkFeedOpts;
      this.currentFeed = new NetworkFeed(feedOpts);
      this.currentFeedOpts = feedOpts;
    }
    return Comlink.proxy(this.currentFeed);
  }

  private onTabClose = (tabId?: number) => {
    if (tabId === this.tabId) {
      this.startDestroy();
      this.finishDestroy();
    }
  };

  public startDestroy() {
    debug("start destroy", this.tabId);
    if (!this.destroyTimer) {
      this.urlListeners.forEach((l) => l());
      this.urlListeners.length = 0;
      this.store?.reset();
      this.currentFeed?.disconnect();
      this.destroyTimer = setTimer(this.finishDestroy, 20 * 1000);
    }
  }

  private finishDestroy = () => {
    debug("finish destroy", this.tabId);
    if (this.destroyTimer) {
      clearTimer(this.destroyTimer);
      this.destroyTimer = null;
    }

    BackgroundEndpoint.map.delete(this.tabId);
    this.store?.dispatch(releaseSavedLobby());
    this.currentFeed?.destroy();

    browser.tabs.onRemoved.removeListener(this.onTabClose);
  };

  private static async calculateTimeDelta() {
    while (true) {
      const start = Date.now();
      const res = await fetch("https://worldtimeapi.org/api/timezone/Etc/UTC");
      const end = Date.now();
      if (res.ok) {
        return (
          end -
          (Date.parse((await res.json()).utc_datetime).valueOf() +
            (end - start) / 2)
        );
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}
