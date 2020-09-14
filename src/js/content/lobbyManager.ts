import { ClientMessage, User, ServerMessage } from "../protocol/schema";
import { Patch, applyPatches } from "immer";
import { Remote, proxy, releaseProxy } from "comlink";
import { NetworkFeed } from "../background/network";
import { MiddlewareAPI } from "@reduxjs/toolkit";
import { validateClientMessage, validateServerMessage } from "../protocol";
import {
  setInitialSharedState,
  applySharedStatePatches,
  trackSharedStatePatches,
} from "./store/sharedState";
import {
  BreakCycleRootState,
  userConnected,
  userDisconnected,
} from "./store/localState";
import { addJoinRequest } from "./store/lobbyState";
import { RemoteBackgroundEndpoint } from "./containers/BackgroundEndpointProvider";

const debug = require("debug")("lobby");

export type Identity = { publicKey: string; privateKey: string };

export type LobbyServerOpts = {
  isServer: true;
  id?: string;
  identity?: Identity;
  name?: string;
};
export type LobbyClientOpts = {
  isServer: false;
  id: string;
  identity?: Identity;
};

export type LobbyOpts = LobbyClientOpts | LobbyServerOpts;

class LobbyBase {
  protected feed!: Remote<NetworkFeed>;
  public id!: string;
  public identity!: Identity;
  constructor(
    private readonly backgroundEndpoint: RemoteBackgroundEndpoint,
    protected readonly store: MiddlewareAPI<any, BreakCycleRootState>,
    private readonly opts: LobbyOpts
  ) {}

  public async init() {
    this.feed = await this.backgroundEndpoint.createNetworkFeed({
      onPeerJoin: proxy(this.onPeerJoin),
      onPeerLeave: proxy(this.onPeerLeave),
      onPeerMessage: proxy(this.onPeerMessage.bind(this)),
      ...this.opts,
    });
    this.id = await this.feed.lobbyId;
    this.identity = await this.feed.identity;
  }

  public destroy() {
    this.feed[releaseProxy]();
  }

  protected async buildInitialState() {
    let patches: Patch[] = [];
    let latest = 0;
    for await (const { seq, data } of await this.feed.getLatestValues()) {
      if (!validateServerMessage(data)) {
        throw new Error("Invalid server message");
      }

      if (!latest) {
        latest = seq;
      }

      switch (data.type) {
        case "state-patch":
          patches.splice(0, 0, ...data.payload);
          break;
        case "set-state":
          this.store.dispatch(
            setInitialSharedState(applyPatches(data.payload, patches))
          );
          return latest;
      }
    }
    return latest;
  }

  private onPeerJoin = (id: string) => {
    debug("Peer joined");
    this.store.dispatch(userConnected(id));
  };

  private onPeerLeave = (id: string) => {
    debug("Peer Left");
    this.store.dispatch(userDisconnected(id));
  };

  protected onPeerMessage(
    unvalidatedData: any,
    peerKey: string
  ): unvalidatedData is ClientMessage {
    if (!validateClientMessage(unvalidatedData)) {
      debug("received invalid client message", unvalidatedData);
      return false;
    }

    const clientMessage = unvalidatedData;

    debug("client message received", clientMessage);

    return true;
  }

  protected sendClientMessage(message: ClientMessage, peer: string) {
    this.feed.sendToPeer(message, peer);
  }
}

export class LobbyClient extends LobbyBase {
  public async connect() {
    await this.feed.connect();
    // this.store.dispatch(setConnectionState(ConnectionState.GettingInitialData));
    const latest = await this.buildInitialState();
    this.feed.onLatestValue(proxy(this.onLatestValue), latest);
  }

  private onLatestValue: Parameters<NetworkFeed["onLatestValue"]>[0] = (
    data
  ) => {
    debug("on latest value", data);
    if (!validateServerMessage(data)) {
      console.error("Received invalid server message", data);
      return;
    }
    switch (data.type) {
      case "state-patch":
        this.store.dispatch(applySharedStatePatches(data.payload));
        break;
      case "set-state":
        this.store.dispatch(setInitialSharedState(data.payload));
        break;
    }
  };

  public sendJoin() {
    const state = this.store.getState();
    if (!state.geoguessr.currentUser) {
      throw new Error("Invalid USER??");
    }
    this.sendClientMessage(
      {
        type: "join",
        payload: {
          ggId: state.geoguessr.currentUser!.id,
          publicKey: this.identity.publicKey,
        },
      },
      state.lobby.sharedState!.ownerPublicKey
    );
  }
}

export class LobbyServer extends LobbyBase {
  private stopPatchTracker: (() => void) | null = null;

  public destroy() {
    this.stopPatchTracker?.();
    super.destroy();
  }

  public async connect() {
    await this.feed.connect();
    const latest = await this.buildInitialState();
    if (!latest) {
      const state = this.store.getState();
      if (!state.geoguessr.currentUser) {
        throw new Error("User logged out");
      }
      const newSharedState = {
        name: state.lobby.localState!.name!,
        ownerPublicKey: this.identity.publicKey,
        users: [
          {
            ggId: state.geoguessr.currentUser.id,
            publicKey: this.identity.publicKey,
          },
        ],
      };
      this.writeToFeed({ type: "set-state", payload: newSharedState });
      this.store.dispatch(setInitialSharedState(newSharedState));
    }
    this.stopPatchTracker = trackSharedStatePatches(this.onPatches);
  }

  protected onPeerMessage(data: any, peerKey: string): data is ClientMessage {
    if (!super.onPeerMessage(data, peerKey)) {
      return false;
    }

    if (data.type === "join") {
      this.store.dispatch(addJoinRequest(data.payload as User));
    }

    switch (data.type) {
      case "join":
        if (data.payload.publicKey !== peerKey) {
          return false;
        }

        this.store.dispatch(addJoinRequest(data.payload));
        break;
      default:
        return false;
    }

    return true;
  }

  private writeToFeed(message: ServerMessage) {
    this.feed.writeToFeed(message);
  }

  private onPatches = (patches: Patch[]) => {
    patches.length &&
      this.writeToFeed({ type: "state-patch", payload: patches });
  };
}
