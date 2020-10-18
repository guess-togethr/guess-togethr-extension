import { NetworkFeed, initializeNetworking } from "../background/network";
import { generateNoiseKeypair } from "../crypto";
import { SignalServer } from "@geut/discovery-swarm-webrtc/server";
import http from "http";
import RAM from "random-access-memory";
import { AddressInfo } from "net";

// jest.setTimeout(10000);

class RamStorage extends RAM {
  private static map = new Map<string, Buffer>();
  constructor(private readonly fileName: string) {
    super(RamStorage.map.get(fileName));
  }
  public static clear() {
    RamStorage.map.clear();
  }

  _close(...args: any[]) {
    RamStorage.map.set(this.fileName, super.toBuffer());
    super._close?.(...args);
  }
}

beforeEach(() => RamStorage.clear());

jest.mock("random-access-idb", () => ({
  __esModule: true,
  default: () => (f: string) => new RamStorage(f),
}));

async function arrayFromAsyncIterable<T>(
  it: AsyncIterable<T>
): Promise<Array<T>> {
  const ret = [];
  for await (const val of it) {
    ret.push(val);
  }
  return ret;
}

let server: http.Server;
let signal: any;

beforeAll(async () => {
  server = http.createServer((_, res) => {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain");
    res.end("Signal running OK\n");
  });
  signal = new SignalServer({ server, requestTimeout: 10 * 1000 });
  await Promise.all([
    new Promise((res) =>
      server.listen(0, () => {
        process.env.SIGNAL_PORT = (server.address() as AddressInfo).port.toString();
        res();
      })
    ),
    initializeNetworking(),
  ]);
});

afterAll(async () => {
  await signal._close();
  await new Promise((res) => server.close(res));
});

test("throws on invalid lobby id", async () => {
  expect(
    () =>
      new NetworkFeed({
        isServer: false,
        identity: generateNoiseKeypair(),
        id: "invalid id",
      })
  ).toThrowError();
});

test("can load existing lobby", async () => {
  const feed = new NetworkFeed({
    isServer: true,
    identity: generateNoiseKeypair(),
  });
  await expect(feed.connect()).resolves.not.toThrow();
  expect(feed.length).toBe(0);

  const lobbyId = feed.lobbyId;
  const testData = "test";

  await expect(feed.writeToFeed(testData)).resolves.toBe(0);
  expect(feed.length).toBe(1);
  await expect(feed.destroy()).resolves.not.toThrow();

  const feed2 = new NetworkFeed({
    isServer: true,
    id: lobbyId,
    identity: generateNoiseKeypair(),
  });
  await expect(feed2.connect()).resolves.not.toThrow();
  expect(feed2.length).toBe(1);
  await expect(
    arrayFromAsyncIterable(feed2.getLatestValues())
  ).resolves.toEqual([{ seq: 0, data: testData }]);
  await expect(feed2.destroy()).resolves.not.toThrow();
});
