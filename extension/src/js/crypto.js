const subtleCrypto = window.crypto.subtle;

const textEncoder = new TextEncoder();

function asyncHash(links, value, cb) {
  const buffers = links.concat(value || new ArrayBuffer(0)).reduce((a, c) => {
    let buf;
    if (typeof c === "string") {
      buf = textEncoder.encode(c);
    } else if (c instanceof Uint8Array) {
      buf = c;
    } else {
      throw new Error("What is this");
    }
    a.push(textEncoder.encode(buf.byteLength + "\n"), buf);
    return a;
  }, []);

  const combined = new Uint8Array(buffers.reduce((a, c) => a + c.length, 0));

  let offset = 0;
  for (const buf of buffers) {
    combined.set(buf, offset);
    offset += buf.length;
  }

  subtleCrypto
    .digest("SHA-256", combined)
    .then((a) => cb(null, arrayBufferToHex(a)));
}

export function arrayBufferToHex(buffer) {
  return [...(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hexToTypedBuffer(hex) {
  return new Uint8Array(
    hex.match(/[\da-f]{2}/gi).map(function (h) {
      return parseInt(h, 16);
    })
  );
}

export async function hyperlogOpts(publicKeyBuffer, privateKeyBuffer) {
  const publicKey = await subtleCrypto.importKey(
    "raw",
    publicKeyBuffer.buffer,
    { name: "ECDSA", namedCurve: "P-384" },
    false,
    ["verify"]
  );
  const privateKey =
    privateKeyBuffer &&
    (await subtleCrypto.importKey(
      "pkcs8",
      privateKeyBuffer.buffer,
      { name: "ECDSA", namedCurve: "P-384" },
      false,
      ["sign"]
    ));
  return {
    asyncHash,
    identity: Buffer.from(publicKeyBuffer.buffer),
    sign: privateKey
      ? (node, cb) => {
          subtleCrypto
            .sign(
              { name: "ECDSA", hash: "SHA-256" },
              privateKey,
              hexToTypedBuffer(node.key).buffer
            )
            .then((a) => cb(null, Buffer.from(a)));
        }
      : undefined,
    verify: (node, cb) => {
      if (
        !node.identity ||
        node.identity.length !== publicKeyBuffer.length ||
        node.identity.some((b, i) => b !== publicKeyBuffer[i])
      ) {
        return cb(null, false);
      }

      subtleCrypto
        .verify(
          { name: "ECDSA", hash: "SHA-256" },
          publicKey,
          node.signature,
          hexToTypedBuffer(node.key).buffer
        )
        .then((v) => cb(null, v));
    },
  };
}

export async function hypercoreOpts(publicKeyBuffer, privateKeyBuffer) {
  const publicKey = await subtleCrypto.importKey(
    "raw",
    publicKeyBuffer.buffer,
    { name: "ECDSA", namedCurve: "P-384" },
    false,
    ["verify"]
  );
  const privateKey =
    privateKeyBuffer &&
    (await subtleCrypto.importKey(
      "pkcs8",
      privateKeyBuffer.buffer,
      { name: "ECDSA", namedCurve: "P-384" },
      false,
      ["sign"]
    ));
  return {
    sign: (data, _, cb) =>
      subtleCrypto
        .sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, data)
        .then((s) => cb(null, Buffer.from(s))),
    verify: (signature, data, _, cb) =>
      subtleCrypto
        .verify({ name: "ECDSA", hash: "SHA-256" }, publicKey, signature, data)
        .then((v) => cb(null, v)),
  };
}
