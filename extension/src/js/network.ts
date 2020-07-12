import "webrtc-adapter";
import sodium from "./utils/sodium_shim";
import {
  Deferred,
  generateLobbyId,
  decodeLobbyId,
  base64ToBuffer,
  bufferToBase64,
} from "./utils";
import Debug from "debug";

import idb from "random-access-idb";

import Swarm from "@geut/discovery-swarm-webrtc";

const debug = Debug("network-feed");

const db = idb("hypercore");

type NetworkFeedOpts = {
  identity?: { publicKey: string; privateKey: string };
  onPeerMessage?: (data: any, peer: string) => void;
  onPeerJoin?: (peer: string) => void;
  onPeerLeave?: (peer: string) => void;
} & (
  | {
      isServer: true;
      lobbyId?: string;
      privateKey?: Uint8Array;
    }
  | {
      isServer: false;
      lobbyId: string;
    }
);

export class NetworkFeed {
  private static Hypercore: any;
  private readonly swarm: ReturnType<typeof Swarm>;
  private readonly hypercore: any;
  private readonly hypercoreReady = new Deferred();
  private readonly extension: any;
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

  private constructor(opts: NetworkFeedOpts) {
    const { lobbyId, publicKey, privateKey } = opts.lobbyId
      ? {
          lobbyId: opts.lobbyId,
          publicKey: decodeLobbyId(opts.lobbyId),
          privateKey: opts.isServer && opts.privateKey,
        }
      : generateLobbyId();
    if (publicKey === null) {
      throw new Error("Invalid Lobby ID");
    }
    this.lobbyId = lobbyId;
    this.isServer = opts.isServer;
    this.swarm = Swarm({
      bootstrap: [process.env.SIGNAL_URL],
      simplePeer: NetworkFeed.simplePeerConfig,
      stream: ({ initiator }: any) =>
        this.hypercore.replicate(initiator, { live: true }),
    });
    this.swarm.join(Buffer.from(publicKey));

    this.hypercore = NetworkFeed.Hypercore(
      (name: string) =>
        db(`${opts.isServer ? "owner-" : ""}${this.lobbyId}-${name}`),
      Buffer.from(publicKey),
      {
        valueEncoding: "json",
        secretKey:
          opts.isServer && privateKey ? Buffer.from(privateKey) : undefined,
        noiseKeypair: opts.identity && {
          publicKey: Buffer.from(base64ToBuffer(opts.identity.publicKey)),
          privateKey: Buffer.from(base64ToBuffer(opts.identity.privateKey)),
        },
      }
    );
    this.hypercore.once("ready", this.onHypercoreReady);
    opts.onPeerJoin &&
      this.hypercore.on("peer-open", (peer: any) => {
        peer.publicKeyString = bufferToBase64(peer.publicKey);
        opts.onPeerJoin!(peer.publicKeyString);
      });
    opts.onPeerLeave &&
      this.hypercore.on("peer-remove", (peer: any) => {
        opts.onPeerLeave!(peer.publicKeyString);
      });
    this.extension = this.hypercore.registerExtension("ggt", {
      encoding: "json",
      onmessage:
        opts.onPeerMessage &&
        ((data: any, peer: any) =>
          opts.onPeerMessage!(data, peer.publicKeyString)),
    });
  }

  public destroy() {
    debug("destroying");
    this.hypercore.close();
    this.swarm.close();
  }

  public get peers() {
    return this.hypercore.peers.map((p: any) => p.publicKeyString);
  }

  public get identity(): { publicKey: string; privateKey: string } {
    return {
      publicKey: bufferToBase64(this.hypercore.noiseKeypair.publicKey),
      privateKey: bufferToBase64(this.hypercore.noiseKeypair.privateKey),
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
    this.extension.send(
      data,
      this.peers.find((p: any) => p.publicKeyString === peer)
    );
  }

  public onLatestValue(
    handler: (data: { seq: number; data: any }) => void,
    start: number = 0
  ) {
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

  public static async create(opts: NetworkFeedOpts): Promise<NetworkFeed> {
    await sodium.ready;
    NetworkFeed.Hypercore = (await import("hypercore")).default;

    const feed = new NetworkFeed(opts);
    await feed.hypercoreReady.promise;
    return feed;
  }
}

export const createFeed = NetworkFeed.create;

export async function getTestLobby(isServer: boolean) {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Test lobbies disabled in production!");
  }

  await sodium.ready;

  const opts = generateLobbyId(new Uint8Array(sodium.crypto_sign_SEEDBYTES));
  return NetworkFeed.create({
    isServer,
    lobbyId: opts.lobbyId,
    privateKey: isServer ? opts.privateKey : undefined,
  });
}
