import sodium from "./sodium_shim";

function bufferToBase64(buffer: Uint8Array) {
  var binary = "";
  var bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\//g, "_").replace(/\+/g, "-");
}

function base64ToBuffer(base64: string) {
  return Uint8Array.from(
    atob(base64.replace(/\-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0)
  );
}

/**
 * Copyright (c) 2016 shogogg <shogo@studofly.net>
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */
export class Deferred<T> {
  private readonly _promise: Promise<T>;
  private _resolve!: (value?: T | PromiseLike<T>) => void;
  private _reject!: (reason?: any) => void;

  constructor() {
    this._promise = new Promise<T>((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  get promise(): Promise<T> {
    return this._promise;
  }

  resolve = (value?: T | PromiseLike<T>): void => {
    this._resolve(value);
  };

  reject = (reason?: any): void => {
    this._reject(reason);
  };
}

function makeCRCTable() {
  var c;
  var crcTable = [];
  for (var n = 0; n < 256; n++) {
    c = n;
    for (var k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c;
  }
  return crcTable;
}

let cachedCrcTable: number[] | null = null;

export function crc32(buf: Uint8Array) {
  var crcTable = cachedCrcTable || (cachedCrcTable = makeCRCTable());
  var crc = 0 ^ -1;

  for (const byte of buf) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }

  return (crc ^ -1) >>> 0;
}

export function generateLobbyId() {
  const id = new Uint8Array(sodium.crypto_sign_PUBLICKEYBYTES + 4);
  const { publicKey, privateKey } = sodium.crypto_sign_keypair();
  id.set(publicKey);
  new DataView(id.buffer).setUint32(
    sodium.crypto_sign_PUBLICKEYBYTES,
    crc32(publicKey)
  );
  return { publicKey, privateKey, lobbyId: bufferToBase64(id) };
}

export function decodeLobbyId(id: string) {
  try {
    const buf = base64ToBuffer(id);
    if (buf.length !== sodium.crypto_sign_PUBLICKEYBYTES + 4) {
      return null;
    }
    const publicKey = buf.subarray(0, sodium.crypto_sign_PUBLICKEYBYTES);
    if (
      crc32(publicKey) !==
      new DataView(buf.buffer).getUint32(sodium.crypto_sign_PUBLICKEYBYTES)
    ) {
      return null;
    }
    return publicKey;
  } catch (e) {
    return null;
  }
}
