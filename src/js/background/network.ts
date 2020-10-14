import "webrtc-adapter";
import { Deferred, base64ToBuffer, bufferToBase64 } from "../utils";
import sodium from "../crypto/sodium_shim";
import Debug from "debug";

import idb from "random-access-idb";

import Swarm from "@geut/discovery-swarm-webrtc";
import { Remote, releaseProxy } from "comlink";
import { EventEmitter } from "events";
import {
  decodeLobbyId,
  generateLobbyId,
  generateNoiseKeypair,
} from "../crypto";

const debug = Debug("network-feed");

let hypercore: any;

type MaybeRemote<T> = Remote<T> | T;

function releaseMaybeProxy(f?: MaybeRemote<any>) {
  f && f[releaseProxy] && f[releaseProxy]();
}

export type NetworkFeedOpts = {
  identity: { publicKey: string; privateKey: string };
} & (
  | {
      isServer: true;
      id?: string;
      privateKey?: Uint8Array;
    }
  | {
      isServer: false;
      id: string;
    }
);

export class NetworkFeed extends EventEmitter {
  private readonly swarm: ReturnType<typeof Swarm>;
  private swarmConnected = false;
  private readonly hypercore: any;
  private readonly hypercoreReady = new Deferred();
  private readonly extension: any;
  private readonly publicKey: Buffer;
  private static readonly BATCH_SIZE = 5;
  private static readonly simplePeerConfig = {
    config: {
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:global.stun.twilio.com:3478",
          ],
        },
        ...(process.env.TURN_URL
          ? [
              {
                urls: process.env.TURN_URL,
                username: process.env.TURN_USERNAME,
                credential: process.env.TURN_PASSWORD,
              },
            ]
          : []),
      ],
    },
  };

  public readonly lobbyId: string;
  public readonly isServer: boolean;
  public destroyed = false;

  constructor(opts: NetworkFeedOpts) {
    super();
    debug("creating new feed", opts);
    try {
      const { lobbyId, publicKey, privateKey } = opts.id
        ? {
            lobbyId: opts.id,
            publicKey: decodeLobbyId(opts.id),
            privateKey: opts.isServer && opts.privateKey,
          }
        : generateLobbyId();
      if (publicKey === null) {
        throw new Error("Invalid Lobby ID");
      }

      const db = idb("hypercore");
      this.lobbyId = lobbyId;
      this.isServer = opts.isServer;
      this.publicKey = Buffer.from(publicKey);

      this.swarm = Swarm({
        bootstrap: [process.env.SIGNAL_URL],
        simplePeer: NetworkFeed.simplePeerConfig,
        stream: ({ initiator }: any) =>
          this.hypercore.replicate(initiator, { live: true }),
      });

      this.hypercore = hypercore(
        (name: string) =>
          db(`${opts.isServer ? "owner-" : ""}${this.lobbyId}-${name}`),
        Buffer.from(publicKey),
        {
          createIfMissing: false,
          valueEncoding: "json",
          secretKey:
            opts.isServer && privateKey ? Buffer.from(privateKey) : undefined,
          noiseKeyPair: opts.identity && {
            publicKey: Buffer.from(base64ToBuffer(opts.identity.publicKey)),
            secretKey: Buffer.from(base64ToBuffer(opts.identity.privateKey)),
          },
        }
      );
      this.hypercore.once("ready", this.onHypercoreReady);
      this.hypercore.once("error", (err: any) => {
        this.destroy();
        this.hypercoreReady.reject(err);
      });
      this.hypercore.on("peer-open", (peer: any) => {
        peer.publicKeyString = bufferToBase64(peer.remotePublicKey);
        debug("peer joined!", peer.publicKeyString);
        peer.messages = [];
        this.emit("peerJoin", peer.publicKeyString);
      });
      this.hypercore.on("peer-remove", (peer: any) => {
        debug("peer left!", peer.publicKeyString);
        this.emit("peerLeave", peer.publicKeyString);
      });
      this.extension = this.hypercore.registerExtension("ggt", {
        encoding: "json",
        onmessage: (data: any, peer: any) => {
          debug("peer message", data, peer.publicKeyString);
          peer.messages.push(data);
          this.emit("peerMessage", data, peer.publicKeyString);
        },
      });
    } catch (e) {
      this.destroy();
      throw e;
    }
  }

  public async destroy() {
    debug("destroying");
    this.disconnect();
    if (!this.destroyed) {
      this.destroyed = true;
      await new Promise((resolve) => this.swarm?.close(resolve));
      await new Promise((resolve) => this.hypercore?.close(resolve));
    }
  }

  public async connect() {
    await this.hypercoreReady.promise;
    if (!this.swarmConnected) {
      this.swarm.join(this.publicKey);
      this.swarmConnected = true;
    } else {
      this.hypercore.peers.forEach((p: any) => {
        this.emit("peerJoin", p.publicKeyString);
        p.messages.forEach((m: any) =>
          this.emit("peerMessage", m, p.publicKeyString)
        );
      });
    }
  }

  public disconnect() {
    this.removeAllListeners();
  }

  // public get identity(): { publicKey: string; privateKey: string } {
  //   return {
  //     publicKey: bufferToBase64(this.hypercore.noiseKeyPair.publicKey),
  //     privateKey: bufferToBase64(this.hypercore.noiseKeyPair.secretKey),
  //   };
  // }

  public get length() {
    return this.hypercore.length;
  }

  public writeToFeed(data: any) {
    debug("writing to feed", data);
    return new Promise<number>((resolve, reject) =>
      this.hypercore.append(data, (err: any, seq: number) =>
        err ? reject(err) : resolve(seq)
      )
    );
  }

  public broadcast(data: any) {
    this.extension.broadcast(data);
  }

  public sendToPeer(data: any, peer: string) {
    debug("send to peer", data, peer);
    const foundPeer = this.hypercore.peers.find(
      (p: any) => p.publicKeyString === peer
    );
    foundPeer && this.extension.send(data, foundPeer);
  }

  public onLatestValue(
    handler: MaybeRemote<(seq: number, data: any) => void>,
    start: number = 0
  ) {
    let seq = start;
    this.on(`latestValue-${start}`, handler);
    this.hypercore
      .createReadStream({ live: true, start })
      .on("data", (data: any) =>
        this.emit(`latestValue-${start}`, seq++, data)
      );
  }

  public async *getLatestValues() {
    for (
      let end = this.hypercore.length;
      end > 0;
      end -= NetworkFeed.BATCH_SIZE
    ) {
      const batch: any[] = await new Promise((res, rej) =>
        this.hypercore.getBatch(
          Math.max(0, end - NetworkFeed.BATCH_SIZE),
          end,
          (err: any, data: any) => (err ? rej(err) : res(data))
        )
      );
      for (const [seq, data] of batch.reverse().entries()) {
        yield { seq: end - seq - 1, data };
      }
    }
  }

  private readonly onHypercoreReady = () => {
    if (this.isServer && !this.hypercore.writable) {
      this.hypercoreReady.reject(new Error("No existing hypercore found"));
    } else {
      this.hypercoreReady.resolve();
    }
  };

  public once(eventName: string, listener: (...args: any[]) => void) {
    return super.once(eventName, (...args: any[]) => {
      listener(...args);
      releaseMaybeProxy(listener);
    });
  }

  public removeAllListeners(event?: string) {
    (event ? [event] : this.eventNames()).forEach((e) =>
      this.listeners(e).forEach(releaseMaybeProxy)
    );
    return super.removeAllListeners(event);
  }
}

export async function initializeNetworking() {
  if (hypercore) {
    return;
  }
  await sodium.ready;
  hypercore = (await import(/* webpackMode: "eager" */ "hypercore")).default;
}

export async function getTestLobby(isServer: boolean) {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Test lobbies disabled in production!");
  }

  await initializeNetworking();

  const opts = generateLobbyId(new Uint8Array(sodium.crypto_sign_SEEDBYTES));
  const feed = new NetworkFeed({
    isServer,
    id: opts.lobbyId,
    privateKey: isServer ? opts.privateKey : undefined,
    identity: generateNoiseKeypair(),
  });
  await feed.connect();
  return feed;
}
