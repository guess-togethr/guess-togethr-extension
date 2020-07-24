import { NetworkFeed, NetworkFeedOpts } from "./network";
import { Store, MiddlewareAPI, AnyAction, Dispatch } from "@reduxjs/toolkit";
import {
  lobbySelector,
  addLobby,
  setMostRecent,
  BackgroundRootState,
} from "./store/backgroundStore";
import { EventEmitter } from "events";
import StrictEventEmitter from "strict-event-emitter-types";
import { validateClientMessage } from "./protocol";
import { UserState } from "./protocol/schema";
import { Patch } from "immer";

const debug = require("debug")("lobby");

export type LobbyOpts =
  | {
      isServer: true;
      lobbyId: string;
      identity: { publicKey: string; privateKey: string };
    }
  | {
      isServer: true;
      lobbyId?: never;
      identity?: never;
    }
  | {
      isServer: false;
      lobbyId: string;
      identity?: { publicKey: string; privateKey: string };
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
  protected readonly feed: NetworkFeed;
  constructor(opts: LobbyOpts) {
    super();
    this.feed = new NetworkFeed({
      onPeerJoin: this.onPeerJoin,
      onPeerLeave: this.onPeerLeave,
      onPeerMessage: this.onPeerMessage,
      ...opts,
    });
  }

  public get id() {
    return this.feed.lobbyId;
  }

  public get identity() {
    return this.feed.identity;
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

class LobbyClient extends LobbyBase {
  constructor(opts: LobbyOpts) {
    super(opts);
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

class LobbyServer extends LobbyBase {}

export function createLobby(
  store: MiddlewareAPI<Dispatch<AnyAction>, BackgroundRootState>,
  lobbyId?: string
): LobbyClient | LobbyServer {
  let ret: LobbyClient | LobbyServer;

  if (lobbyId) {
    const lobbyState = lobbySelector.selectById(store.getState(), lobbyId);
    if (lobbyState?.isServer) {
      ret = new LobbyServer({ lobbyId, ...lobbyState });
    } else {
      ret = new LobbyClient({ lobbyId, isServer: false });
    }
  } else {
    ret = new LobbyServer({ isServer: true });

    store.dispatch(
      addLobby({ id: ret.id, isServer: true, identity: ret.identity })
    );
  }

  store.dispatch(setMostRecent(ret.id));
  return ret;
}
