import "webrtc-adapter";
import {
  Deferred,
  generateLobbyId,
  decodeLobbyId,
  base64ToBuffer,
  bufferToBase64,
} from "../utils";
import Debug from "debug";

import idb from "random-access-idb";

import Swarm from "@geut/discovery-swarm-webrtc";
import sodium from "../utils/sodium_shim";
import { Remote, releaseProxy } from "comlink";

const debug = Debug("network-feed");

const db = idb("hypercore");

let hypercore: any;

type MaybeRemote<T> = Remote<T> | T;

function releaseMaybeProxy(f?: MaybeRemote<any>) {
  f && f[releaseProxy] && f[releaseProxy]();
}

export type NetworkFeedOpts = {
  identity?: { publicKey: string; privateKey: string };
  onPeerMessage?: MaybeRemote<(data: any, peer: string) => void>;
  onPeerJoin?: MaybeRemote<(peer: string) => void>;
  onPeerLeave?: MaybeRemote<(peer: string) => void>;
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

export class NetworkFeed {
  private readonly swarm: ReturnType<typeof Swarm>;
  private readonly hypercore: any;
  private readonly hypercoreReady = new Deferred();
  private readonly extension: any;
  private readonly publicKey: Buffer;
  private readonly onPeerMessage: NetworkFeedOpts["onPeerMessage"];
  private readonly onPeerJoin: NetworkFeedOpts["onPeerJoin"];
  private readonly onPeerLeave: NetworkFeedOpts["onPeerLeave"];
  private readonly onLatestValueHandlers = new Set<
    MaybeRemote<(value: { data: any; seq: number }) => void>
  >();
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
        {
          urls: process.env.TURN_URL,
          username: process.env.TURN_USERNAME,
          credential: process.env.TURN_PASSWORD,
        },
      ],
    },
  };

  public readonly lobbyId: string;
  public readonly isServer: boolean;

  constructor(opts: NetworkFeedOpts) {
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

      this.lobbyId = lobbyId;
      this.isServer = opts.isServer;
      this.publicKey = Buffer.from(publicKey);
      this.onPeerMessage = opts.onPeerMessage;
      this.onPeerJoin = opts.onPeerJoin;
      this.onPeerLeave = opts.onPeerLeave;

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
          createIfMissing: !opts.id,
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
      this.onPeerJoin &&
        this.hypercore.on("peer-open", (peer: any) => {
          peer.publicKeyString = bufferToBase64(peer.publicKey);
          this.onPeerJoin!(peer.publicKeyString);
        });
      this.onPeerLeave &&
        this.hypercore.on("peer-remove", (peer: any) => {
          this.onPeerLeave!(peer.publicKeyString);
        });
      this.extension = this.hypercore.registerExtension("ggt", {
        encoding: "json",
        onmessage:
          this.onPeerMessage &&
          ((data: any, peer: any) =>
            this.onPeerMessage!(data, peer.publicKeyString)),
      });
    } catch (e) {
      this.destroy();
      throw e;
    }
  }

  public destroy() {
    debug("destroying");
    this.hypercore?.close();
    this.swarm?.close();
    releaseMaybeProxy(this.onPeerJoin);
    releaseMaybeProxy(this.onPeerLeave);
    releaseMaybeProxy(this.onPeerMessage);
    this.onLatestValueHandlers.forEach(releaseMaybeProxy);
    this.onLatestValueHandlers.clear();
  }

  public async connect() {
    await this.hypercoreReady.promise;
    this.swarm.join(this.publicKey);
  }

  public get peers() {
    return this.hypercore.peers.map((p: any) => p.publicKeyString);
  }

  public get identity(): { publicKey: string; privateKey: string } {
    return {
      publicKey: bufferToBase64(this.hypercore.noiseKeyPair.publicKey),
      privateKey: bufferToBase64(this.hypercore.noiseKeyPair.secretKey),
    };
  }

  public get length() {
    return this.hypercore.length;
  }

  public writeToFeed(data: any) {
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
    const foundPeer = this.peers.find((p: any) => p.publicKeyString === peer);
    foundPeer && this.extension.send(data, foundPeer);
  }

  public onLatestValue(
    handler: MaybeRemote<(data: { seq: number; data: any }) => void>,
    start: number = 0
  ) {
    this.onLatestValueHandlers.add(handler);
    this.hypercore
      .createReadStream({ live: true, start })
      .on("data", (data: any) => handler({ data, seq: start++ }));
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
  });
  await feed.connect();
  return feed;
}
