import { ClientMessage, ServerMessage } from "../protocol/schema";
import { Patch, applyPatches } from "immer";
import { Remote, proxy, releaseProxy, ProxyMarked } from "comlink";
import { NetworkFeed } from "../background/network";
import { MiddlewareAPI } from "@reduxjs/toolkit";
import {
  validateClientMessage,
  validateServerMessage,
  validateServerState,
  validateClientState,
} from "../protocol";
import { RemoteBackgroundEndpoint } from "./containers/BackgroundEndpointProvider";
import {
  BreakCycleRootState,
  setServerState,
  userConnected,
  userDisconnected,
  addJoinRequest,
  trackSharedStatePatches,
  errorLobby,
  clientStateSelectors,
  setClientState,
} from "./store";
import { filterScopedPatches } from "../utils";

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
  protected feed!: Remote<NetworkFeed & ProxyMarked>;
  public id!: string;
  public identity!: Identity;
  private stopPatchTracker: (() => void) | null = null;
  constructor(
    private readonly backgroundEndpoint: RemoteBackgroundEndpoint,
    protected readonly store: MiddlewareAPI<any, BreakCycleRootState>,
    private readonly opts: LobbyOpts
  ) {}

  public async init() {
    this.feed = await this.backgroundEndpoint.createNetworkFeed(this.opts);
    this.id = await this.feed.lobbyId;
    this.identity = await this.feed.identity;
  }

  public async connect() {
    await this.feed.on("peerJoin", proxy(this.onPeerJoin));
    await this.feed.on("peerLeave", proxy(this.onPeerLeave));
    await this.feed.on("peerMessage", proxy(this.onPeerMessage.bind(this)));
    await this.feed.connect();
    this.stopPatchTracker = trackSharedStatePatches(this.onPatches.bind(this));
  }

  public destroy() {
    this.stopPatchTracker?.();
    this.feed.destroy();
    this.feed[releaseProxy]();
  }

  protected async buildInitialState() {
    let patches: Patch[] = [];
    let latest = 0;
    for await (const { seq, data } of await this.feed.getLatestValues()) {
      if (!validateServerMessage(data)) {
        throw new Error("Invalid server message");
      }

      debug("building initial state", seq, data);

      if (!latest) {
        latest = seq;
      }

      switch (data.type) {
        case "server-state-patch":
          patches.splice(0, 0, ...data.payload);
          break;
        case "set-server-state":
          const newState = applyPatches(data.payload, patches);
          if (validateServerState(newState)) {
            this.store.dispatch(setServerState(newState));
          } else {
            throw new Error("Server state valied validation!");
          }
          return latest;
      }
    }
    return latest;
  }

  private onPeerJoin = (id: string) => {
    debug("Peer joined");
    this.store.dispatch(userConnected(id));
    const message: ClientMessage = {
      type: "set-client-state",
      payload: this.store.getState().lobby.localClientState!,
    };
    this.feed.sendToPeer(message, id);
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
      debug("received invalid client message", unvalidatedData, peerKey);
      return false;
    }

    const clientMessage = unvalidatedData;

    debug("client message received", clientMessage, peerKey);

    switch (clientMessage.type) {
      case "set-client-state": {
        if (clientMessage.payload.id !== peerKey) {
          debug("peer sent set-client-state message with invalid id");
          return false;
        }
        this.store.dispatch(setClientState(clientMessage.payload));
        break;
      }
      case "client-state-patch": {
        const currentState = clientStateSelectors.selectById(
          this.store.getState(),
          peerKey
        );
        const newState =
          currentState && applyPatches(currentState, clientMessage.payload);
        if (
          !newState ||
          !validateClientState(newState) ||
          newState.id !== peerKey
        ) {
          debug("peer sent invalid client-state-patch", currentState);
          return false;
        }
        this.store.dispatch(setClientState(newState));
        break;
      }
    }

    return true;
  }

  protected sendClientMessage(message: ClientMessage, peer: string) {
    this.feed.sendToPeer(message, peer);
  }

  protected onPatches(patches: Patch[]) {
    const filteredPatches = filterScopedPatches(patches, ["localClientState"]);
    if (filterScopedPatches.length) {
      debug("sending client state patches", filteredPatches);
      const message: ClientMessage = {
        type: "client-state-patch",
        payload: filteredPatches,
      };
      this.feed.broadcast(message);
    }
  }
}

export class LobbyClient extends LobbyBase {
  public async connect() {
    await super.connect();
    const latest = await this.buildInitialState();
    this.feed.onLatestValue(proxy(this.onLatestValue), latest + 1);
  }

  private onLatestValue: Parameters<NetworkFeed["onLatestValue"]>[0] = (
    seq,
    data
  ) => {
    debug("on latest value", seq, data);
    if (!validateServerMessage(data)) {
      debug("Received invalid server message", data);
      return;
    }
    switch (data.type) {
      case "server-state-patch":
        const currentState = this.store.getState().lobby.serverState!;
        const newState = applyPatches(currentState, data.payload);
        if (validateServerState(newState)) {
          this.store.dispatch(setServerState(newState));
        } else {
          debug("invalid state patch", currentState, data.payload);
          this.store.dispatch(errorLobby("Server sent invalid state patch!"));
        }

        break;
      case "set-server-state":
        this.store.dispatch(setServerState(data.payload));
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
      state.lobby.serverState!.ownerPublicKey
    );
  }
}

export class LobbyServer extends LobbyBase {
  public constructor(
    private readonly name: string,
    ...args: ConstructorParameters<typeof LobbyBase>
  ) {
    super(...args);
  }

  public async connect() {
    await super.connect();
    const latest = await this.buildInitialState();
    if (!latest) {
      const state = this.store.getState();
      if (!state.geoguessr.currentUser) {
        throw new Error("User logged out");
      }
      const newSharedState = {
        name: this.name,
        ownerPublicKey: this.identity.publicKey,
        users: [
          {
            ggId: state.geoguessr.currentUser.id,
            publicKey: this.identity.publicKey,
          },
        ],
      };
      this.writeToFeed({ type: "set-server-state", payload: newSharedState });
      this.store.dispatch(setServerState(newSharedState));
    }
  }

  protected onPeerMessage(data: any, peerKey: string): data is ClientMessage {
    if (!super.onPeerMessage(data, peerKey)) {
      return false;
    }

    switch (data.type) {
      case "join":
        if (data.payload.publicKey !== peerKey) {
          debug("Received join message with mismatched key");
          return false;
        }

        this.store.dispatch(addJoinRequest(data.payload));
        break;
      default:
        debug("received unknown peer message");
        return false;
    }

    return true;
  }

  private writeToFeed(message: ServerMessage) {
    this.feed.writeToFeed(message);
  }

  protected onPatches(patches: Patch[]) {
    super.onPatches(patches);
    const filteredPatches = filterScopedPatches(patches, ["serverState"]);
    if (filteredPatches.length) {
      debug("writing server patches", filteredPatches);
      this.writeToFeed({
        type: "server-state-patch",
        payload: filteredPatches,
      });
    }
  }
}
