import { wrap } from "comlink";
import defer from "promise-defer";
import type { Deferred } from "promise-defer";

enum MessageType {
  READY,
  READY_ACK,
  NEW_PROXY,
  // COMLINK
}

interface ReadyMessage {
  type: MessageType.READY | MessageType.READY_ACK;
}

interface NewProxyMessage {
  type: MessageType.NEW_PROXY;
  proxyType: string;
  port: MessagePort;
}

type Message = { source: "guessTogethr"; id: string } & (
  | NewProxyMessage
  | ReadyMessage
);

export class MapProxyManager {
  private unprocessedProxies: { type: string; port: MessagePort }[] = [];
  private ready = defer();
  private more: Deferred<void> | null = null;
  private readonly id = Math.random().toString(36).substring(2, 15);

  constructor() {
    window.addEventListener("message", (event) => {
      if (!MapProxyManager.validate(event.data) || event.data.id === this.id) {
        return;
      }
      switch (event.data.type) {
        case MessageType.READY:
          this.sendMessage(MessageType.READY_ACK);
          this.ready.resolve();
          break;

        case MessageType.READY_ACK:
          this.ready.resolve();
          break;
        case MessageType.NEW_PROXY:
          this.unprocessedProxies.push({
            type: event.data.proxyType,
            port: event.data.port,
          });
          this.more?.resolve();
          break;
      }
    });
    this.sendMessage(MessageType.READY);
  }

  private sendMessage(
    type: MessageType,
    proxyType?: string,
    port?: MessagePort
  ) {
    window.postMessage(
      Object.assign(
        {
          source: "guessTogethr",
          id: this.id,
          type,
        },
        type === MessageType.NEW_PROXY ? { proxyType, port } : {}
      ),
      "*",
      port && [port]
    );
  }

  private static validate(data: any): data is Message {
    return data?.source === "guessTogethr";
  }

  public notify(type: string, port: MessagePort) {
    this.ready.promise.then(() =>
      this.sendMessage(MessageType.NEW_PROXY, type, port)
    );
  }

  public async *[Symbol.asyncIterator]() {
    while (true) {
      while (this.unprocessedProxies.length === 0) {
        this.more = defer();
        await this.more.promise;
        this.more = null;
      }

      while (this.unprocessedProxies.length !== 0) {
        const { type, port } = this.unprocessedProxies.shift()!;
        yield { type, proxy: wrap(port) };
      }
    }
  }
}

// export interface StreetViewPanoramaWrapper
