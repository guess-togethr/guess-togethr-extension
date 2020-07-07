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

class NetworkFeed {
  private static socket: ReconnectingWebsocket | null = null;
  private static numUsers = 0;
  private readonly swarm: FastRTCSwarm;
  public readonly lobbyId: string;
  private readonly hypercore: any;
  private readonly hypercoreReady = new Deferred();

  private constructor(Hypercore: any, lobbyIdString?: string) {
    let publicKey: Uint8Array;
    let privateKey: Uint8Array | undefined;

    if (!lobbyIdString) {
      const l = generateLobbyId();
      publicKey = l.publicKey;
      privateKey = l.privateKey;
      this.lobbyId = l.lobbyId;
    } else {
      const decodedLobbyId = decodeLobbyId(lobbyIdString);
      if (!decodedLobbyId) {
        throw new Error("Invalid Lobby ID");
      }
      publicKey = decodedLobbyId;
      this.lobbyId = lobbyIdString;
    }
    NetworkFeed.numUsers++;
    if (!NetworkFeed.socket) {
      NetworkFeed.socket = new ReconnectingWebsocket(
        process.env.WEBSOCKET_URL!
      );
    }
    this.swarm = new FastRTCSwarm({ roomId: this.lobbyId });
    NetworkFeed.socket.addEventListener("message", this.onSocketMessage);
    this.swarm.on("signal", this.onSignal);
    this.swarm.on("open", this.onNewPeer);

    this.hypercore = Hypercore(
      (name: string) =>
        db(`${privateKey ? "owner-" : ""}${this.lobbyId}-${name}`),
      Buffer.from(publicKey),
      {
        valueEncoding: "json",
        secretKey: privateKey && Buffer.from(privateKey),
      }
    );
    this.hypercore.once("ready", () => {
      if (this.hypercore.secretKey) {
        this.hypercore.noiseKeypair = {
          publicKey: this.hypercore.key,
          privateKey: this.hypercore.secretKey,
        };
      }
      this.hypercoreReady.resolve();
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

  public static async create(lobbyId?: string): Promise<NetworkFeed> {
    await sodium.ready;

    return new NetworkFeed((await import("hypercore")).default, lobbyId);
  }
}

export const createNetworkFeed = NetworkFeed.create;
