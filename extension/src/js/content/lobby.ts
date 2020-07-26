import { NetworkFeed } from "../background/network";
import {
  MiddlewareAPI,
  AnyAction,
  Dispatch,
  Store,
  Middleware,
  createAsyncThunk,
} from "@reduxjs/toolkit";
import { EventEmitter } from "events";
import StrictEventEmitter from "strict-event-emitter-types";
import { validateClientMessage } from "../protocol";
import { UserState } from "../protocol/schema";
import { Patch } from "immer";
import { RootState } from "../store";
import { BackgroundEndpoint } from "../background/background";
import { proxy, Remote, releaseProxy } from "comlink";
import { RemoteBackgroundEndpoint } from "./content";
import { SavedLobby } from "../store/backgroundStore";

const debug = require("debug")("lobby");

export type Identity = { publicKey: string; privateKey: string };

export type LobbyOpts =
  | {
      isServer: true;
      lobbyId?: string;
      identity?: Identity;
    }
  | {
      isServer: false;
      lobbyId: string;
      identity?: Identity;
    };

interface BaseEvents {
  peerJoin: (id: string) => void;
  peerLeave: (id: string) => void;
  setUserState: (state: UserState) => void;
  userStatePatch: (patch: Patch[]) => void;
}

class LobbyBase extends (EventEmitter as {
  new (): StrictEventEmitter<EventEmitter, BaseEvents>;
}) {
  protected feed!: Remote<NetworkFeed>;
  public id!: string;
  public identity!: Identity;
  constructor(
    private readonly backgroundEndpoint: RemoteBackgroundEndpoint,
    protected readonly store: MiddlewareAPI,
    private readonly opts: LobbyOpts
  ) {
    super();
  }

  public async init() {
    this.feed = await this.backgroundEndpoint.createNetworkFeed({
      onPeerJoin: proxy(this.onPeerJoin),
      onPeerLeave: proxy(this.onPeerLeave),
      onPeerMessage: proxy(this.onPeerMessage),
      ...this.opts,
    });
    this.id = await this.feed.lobbyId;
    this.identity = await this.feed.identity;
  }

  public destroy() {
    this.feed[releaseProxy]();
  }

  private onPeerJoin = (id: string) => {
    debug("Peer joined");
    this.emit("peerJoin", id);
  };

  private onPeerLeave = (id: string) => {
    debug("Peer Left");
    this.emit("peerLeave", id);
  };

  protected onPeerMessage = (unvalidatedData: any) => {
    if (!validateClientMessage(unvalidatedData)) {
      debug("received invalid client message", unvalidatedData);
      return;
    }

    const clientMessage = unvalidatedData;

    switch (clientMessage.type) {
      case "set-user-state":
        this.emit("setUserState", clientMessage.payload);
        break;
      case "user-state-patch":
        this.emit("userStatePatch", clientMessage.payload);
        break;
    }
  };
}

export class LobbyClient extends LobbyBase {
  constructor(
    backgroundEndpoint: RemoteBackgroundEndpoint,
    store: MiddlewareAPI,
    opts: {
      id: string;
      identity?: { publicKey: string; privateKey: string };
    }
  ) {
    super(backgroundEndpoint, store, {
      isServer: false,
      lobbyId: opts.id,
      ...opts,
    });
  }

  protected onPeerMessage = () => {
    debug("CLIENT PEER MESSAGE");
  };

  public async connect() {
    this.feed.onLatestValue(this.onLatestValue);
    await this.feed.connect();
  }

  private onLatestValue: Parameters<NetworkFeed["onLatestValue"]>[0] = (
    data
  ) => {
    debug("on latest value", data);
  };
}

export class LobbyServer extends LobbyBase {
  constructor(
    backgroundEndpoint: RemoteBackgroundEndpoint,
    store: MiddlewareAPI,
    opts?: {
      id: string;
      identity: { publicKey: string; privateKey: string };
    }
  ) {
    super(backgroundEndpoint, store, {
      isServer: true,
      ...(opts ? { lobbyId: opts.id, ...opts } : {}),
    });
  }
}

// export function createLobby(
//   store: MiddlewareAPI<Dispatch<AnyAction>, BackgroundRootState>,
//   lobbyId?: string
// ): LobbyClient | LobbyServer {
//   let ret: LobbyClient | LobbyServer;

//   if (lobbyId) {
//     const lobbyState = lobbySelector.selectById(store.getState(), lobbyId);
//     if (lobbyState?.isServer) {
//       ret = new LobbyServer({ lobbyId, ...lobbyState });
//     } else {
//       ret = new LobbyClient({ lobbyId, isServer: false });
//     }
//   } else {
//     ret = new LobbyServer({ isServer: true });

//     store.dispatch(
//       addLobby({ id: ret.id, isServer: true, identity: ret.identity })
//     );
//   }

//   store.dispatch(setMostRecent(ret.id));
//   return ret;
// }
