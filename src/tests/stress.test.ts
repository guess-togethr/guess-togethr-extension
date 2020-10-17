import { NetworkFeed, initializeNetworking } from "../js/background/network";
import { generateNoiseKeypair } from "../js/crypto";
import { SignalServer } from "@geut/discovery-swarm-webrtc/server";
import http from "http";
import ram from "random-access-memory";
import { AddressInfo } from "net";

// jest.setTimeout(10000);

jest.mock("random-access-idb", () => ({
  __esModule: true,
  default: () => ram,
}));

let server: http.Server;
let signal: any;

beforeAll(async () => {
  server = http.createServer((_, res) => {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain");
    res.end("Signal running OK\n");
  });
  signal = new SignalServer({ server, requestTimeout: 10 * 1000 });
  await new Promise((res) =>
    server.listen(0, () => {
      process.env.SIGNAL_PORT = (server.address() as AddressInfo).port.toString();
      res();
    })
  );
  await initializeNetworking();
});

afterAll(async () => {
  await signal._close();
  await new Promise((res) => server.close(res));
});

test("it works", async () => {
  const feed = new NetworkFeed({
    isServer: true,
    identity: generateNoiseKeypair(),
  });
  await expect(feed.connect()).resolves.not.toThrow();
});
