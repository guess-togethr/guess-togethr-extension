import "webrtc-adapter";
import FastRTCSwarm, { PayloadToServer } from "@mattkrick/fast-rtc-swarm";
import FastRTCPeer from "@mattkrick/fast-rtc-peer";
import { Duplex } from "stream";
import pump from "pump";
import sodium from "./sodium_shim";
import ReconnectingWebsocket from "reconnecting-websocket";
import { Deferred, generateLobbyId, decodeLobbyId } from "./utils";
import Debug from "debug";

import ram from "random-access-memory";
import idb from "random-access-idb";

const debug = Debug("network-feed");

const db = idb("hypercore");

type NetworkFeedOpts =
  | {
      isServer: true;
      publicKey: Uint8Array;
      privateKey?: Uint8Array;
      lobbyId: string;
    }
  | {
      isServer: false;
      publicKey: Uint8Array;
      lobbyId: string;
    };

class NetworkFeed {
  private static Hypercore: any;
  private static socket: ReconnectingWebsocket | null = null;
  private static numUsers = 0;
  private readonly swarm: FastRTCSwarm;
  private readonly hypercore: any;
  private readonly hypercoreReady = new Deferred();

  public readonly lobbyId: string;

  private constructor(opts: NetworkFeedOpts) {
    this.lobbyId = opts.lobbyId;
    NetworkFeed.numUsers++;
    if (!NetworkFeed.socket) {
      NetworkFeed.socket = new ReconnectingWebsocket(
        process.env.WEBSOCKET_URL!
      );
    }
    this.swarm = new FastRTCSwarm({
      roomId: this.lobbyId,
      rtcConfig: {
        iceServers: [
          ...FastRTCPeer.defaultICEServers,
          {
            urls: "stun:192.168.200.2",
            // username: "user123",
            // credential: "password",
          },
        ],
      },
    });
    NetworkFeed.socket.addEventListener("message", this.onSocketMessage);
    this.swarm.on("signal", this.onSignal);
    this.swarm.on("open", this.onNewPeer);
    this.swarm.on("error", (e) => {
      debugger;
    });

    this.hypercore = NetworkFeed.Hypercore(
      (name: string) =>
        db(`${opts.isServer ? "owner-" : ""}${this.lobbyId}-${name}`),
      Buffer.from(opts.publicKey),
      {
        valueEncoding: "json",
        secretKey:
          opts.isServer && opts.privateKey
            ? Buffer.from(opts.privateKey)
            : undefined,
      }
    );
    this.hypercore.once("ready", () => {
      if (this.hypercore.secretKey) {
        this.hypercore.noiseKeypair = {
          publicKey: this.hypercore.key,
          privateKey: this.hypercore.secretKey,
        };
      }
      if (opts.isServer && !this.hypercore.writable) {
        this.hypercoreReady.reject(new Error("No existing hypercore found"));
      } else {
        this.hypercoreReady.resolve();
      }
    });
  }

  public destroy() {
    debug("destroying");
    this.hypercore.close();
    this.swarm.off("signal", this.onSignal);
    this.swarm.off("open", this.onNewPeer);
    NetworkFeed.socket?.removeEventListener("message", this.onSocketMessage);
    if (--NetworkFeed.numUsers === 0) {
      NetworkFeed.socket?.close();
      NetworkFeed.socket = null;
    }
  }

  private onSocketMessage = ({ data }: any) => {
    debug("socket message received", data);
    this.swarm.dispatch(JSON.parse(data));
  };

  private onSignal = (signal: PayloadToServer) => {
    debug("sending signalling data", signal);
    NetworkFeed.socket!.send(JSON.stringify(signal));
  };

  private onNewPeer = async (peer: FastRTCPeer) => {
    debug("new peer connected", peer);
    await this.hypercoreReady.promise;
    (peer as any).dataChannel.binaryType = "arraybuffer";
    const stream = new Duplex({
      write: (chunk, encoding, cb) => {
        try {
          // Occasionally sending will fail when closing
          peer.send(chunk);
        } catch (e) {
          debug("peer send failed");
        }
        cb();
      },
      read: () => {},
    });
    peer.on("data", (d) => {
      if (stream.destroyed) {
        debugger;
      } else {
        stream.push(Buffer.from(d));
      }
    });
    peer.on("close", () => {
      debug("peer closed", peer);
      stream.destroy();
    });
    pump(
      stream,
      this.hypercore.replicate(!peer["isOfferer"], { live: true }),
      stream
    );
  };

  public static async createNew(
    opts?: ReturnType<typeof generateLobbyId>
  ): Promise<NetworkFeed> {
    await sodium.ready;
    NetworkFeed.Hypercore = (await import("hypercore")).default;

    const feed = new NetworkFeed({
      ...(opts || generateLobbyId()),
      isServer: true,
    });
    await feed.hypercoreReady.promise;
    return feed;
  }

  public static async loadExisting(
    lobbyId: string,
    isServer: boolean
  ): Promise<NetworkFeed> {
    await sodium.ready;
    NetworkFeed.Hypercore = (await import("hypercore")).default;

    const publicKey = decodeLobbyId(lobbyId);
    if (!publicKey) {
      throw new Error("Invalid Lobby ID");
    }

    const feed = new NetworkFeed({ publicKey, isServer, lobbyId });
    await feed.hypercoreReady.promise;
    return feed;
  }
}

export const createNewFeed = () => NetworkFeed.createNew();
export const loadExistingFeed = NetworkFeed.loadExisting;

export async function getTestLobby(isServer: boolean) {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Test lobbies disabled in production!");
  }

  await sodium.ready;

  const opts = generateLobbyId(new Uint8Array(sodium.crypto_sign_SEEDBYTES));
  return isServer
    ? NetworkFeed.createNew(opts)
    : NetworkFeed.loadExisting(opts.lobbyId, false);
}
