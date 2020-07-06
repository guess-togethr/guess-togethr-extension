import FastRTCSwarm from "@mattkrick/fast-rtc-swarm";
import Hyperlog from "hyperlog";
import level from "level-mem";
import { Duplex } from "stream";
import pump from "pump";
import sodium from "./sodium_shim";

import { hyperlogOpts, hypercoreOpts } from "./crypto";

import ram from "random-access-memory";

const socket = new WebSocket("ws://localhost:8080");
const hyperdb = level("hyperdb", {
  valueEncoding: {
    type: "buffer",
    buffer: true,
    encode: (d) => d,
    decode: (d) => Buffer.from(d),
  },
});

socket.addEventListener("open", async () => {
  // const { hyperlog, lobbyId } = await getHyperlog(
  //   new URL(window.location.href).searchParams.get("lobby")
  // );
  const { hypercore, lobbyId } = await getHypercore(
    new URL(window.location.href).searchParams.get("lobby")
  );
  window.h = hypercore;
  const swarm = new FastRTCSwarm({ roomId: lobbyId });
  window.swarm = swarm;
  swarm.on("signal", (signal) => socket.send(JSON.stringify(signal)));
  socket.addEventListener("message", ({ data }) => {
    swarm.dispatch(JSON.parse(data));
  });
  swarm.on("open", (peer) => {
    const stream = new Duplex({
      write: (chunk, encoding, cb) => {
        console.log(`outgoing ${chunk}`);
        peer.send(chunk);
        cb();
      },
      read: () => {},
    });
    peer.on("data", (d) => {
      console.log(`data: ${d}`);
      stream.push(Buffer.from(d));
    });
    peer.on("close", () => {
      console.log(`close`);
      stream.emit("close");
    });
    pump(stream, hypercore.replicate(!peer.isOfferer, { live: true }), stream);
  });
  hypercore.createReadStream({ live: true }).on("data", console.log);
});

async function getHypercore(lobbyId) {
  let publicKey;
  let privateKey = undefined;
  await sodium.ready;
  if (!lobbyId) {
    // const keypair = await window.crypto.subtle.generateKey(
    //   {
    //     name: "ECDSA",
    //     namedCurve: "P-384",
    //   },
    //   true,
    //   ["sign", "verify"]
    // );

    // publicKey = new Uint8Array(
    //   await window.crypto.subtle.exportKey("raw", keypair.publicKey)
    // );
    // privateKey = new Uint8Array(
    //   await window.crypto.subtle.exportKey("pkcs8", keypair.privateKey)
    // );
    const keypair = sodium.crypto_sign_keypair();
    publicKey = keypair.publicKey;
    privateKey = keypair.privateKey;
    lobbyId = bufferToBase64(publicKey);

    window.open(window.location.href + "?lobby=" + lobbyId);
  } else {
    publicKey = base64ToBuffer(lobbyId);
  }

  const p = sodium;
  const hypercore = (await import("hypercore")).default;

  return {
    lobbyId,
    hypercore: hypercore(() => ram(), Buffer.from(publicKey.buffer), {
      valueEncoding: "json",
      secretKey: privateKey && Buffer.from(privateKey.buffer),
    }),
  };
}

async function getHyperlog(lobbyId) {
  let publicKey;
  let privateKey = null;
  if (!lobbyId) {
    const keypair = await window.crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-384",
      },
      true,
      ["sign", "verify"]
    );

    publicKey = new Uint8Array(
      await window.crypto.subtle.exportKey("raw", keypair.publicKey)
    );
    privateKey = new Uint8Array(
      await window.crypto.subtle.exportKey("pkcs8", keypair.privateKey)
    );
    lobbyId = bufferToBase64(publicKey);

    window.open(window.location.href + "?lobby=" + lobbyId);
  } else {
    publicKey = base64ToBuffer(lobbyId);
  }

  return {
    hyperlog: Hyperlog(hyperdb, {
      ...(await hyperlogOpts(publicKey, privateKey)),
      valueEncoding: "json",
    }),
    lobbyId,
  };
}

import { bufferToBase64, base64ToBuffer } from "./utils";
