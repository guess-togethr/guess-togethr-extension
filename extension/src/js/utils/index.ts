import sodium from "./sodium_shim";
import { Remote, proxy } from "comlink";
import { Store, AnyAction, Reducer, createNextState } from "@reduxjs/toolkit";
import type { Patch } from "immer";

type PatchListener = (patches: Patch[]) => void;

export function trackPatches(
  reducer: Reducer
): [Reducer, (listener: PatchListener) => () => void] {
  const listeners = new Set<PatchListener>();
  const newReducer: Reducer = (state, action) =>
    createNextState(
      state,
      (draft) => reducer(draft, action),
      (patches) => listeners.forEach((l) => l(patches))
    );

  const registerListener = (listener: PatchListener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return [newReducer, registerListener];
}

export function bufferToBase64(buffer: Uint8Array) {
  var binary = "";
  var bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\//g, "_").replace(/\+/g, "-");
}

export function base64ToBuffer(base64: string) {
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

export function generateLobbyId(seed?: Uint8Array) {
  const id = new Uint8Array(sodium.crypto_sign_PUBLICKEYBYTES + 4);
  const { publicKey, privateKey } = seed
    ? sodium.crypto_sign_seed_keypair(seed)
    : sodium.crypto_sign_keypair();
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

export function generateNoiseKeypair() {
  const pair = {
    publicKey: new Uint8Array(sodium.crypto_kx_PUBLICKEYBYTES),
    privateKey: new Uint8Array(sodium.crypto_kx_SECRETKEYBYTES),
  };

  sodium.crypto_kx_keypair(pair.publicKey, pair.privateKey);
  return {
    publicKey: bufferToBase64(pair.publicKey),
    privateKey: bufferToBase64(pair.privateKey),
  };
}

export async function remoteStoreWrapper<S extends any>(
  remoteStore: Remote<Store<S>>
): Promise<Store<S>> {
  const subscribers = new Set<() => void>();

  let latestState = (await remoteStore.getState()) as S;
  remoteStore.subscribe(
    proxy(async () => {
      latestState = (await remoteStore.getState()) as S;
      subscribers.forEach((f) => f());
    })
  );
  return {
    dispatch: (action) => (remoteStore.dispatch(action) as unknown) as any,
    getState: () => latestState,
    subscribe(listener) {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
    replaceReducer: () => {
      throw new Error("replaceReducer not implemented");
    },
    [Symbol.observable]: () => {
      throw new Error("Symbol.observable not implemeneted");
    },
  };
}

export function makeTabAwareStore<S, A extends AnyAction>(
  store: Store<S, A>,
  tabId: number
): Store<S, A> {
  return new Proxy(store, {
    get(target, propKey) {
      console.log(target, propKey);
      if (propKey === "dispatch") {
        return (action: AnyAction) => {
          action.meta = Object.assign({}, action.meta, { tabId });
          return target.dispatch(action as any);
        };
      } else if (propKey === "subscribe") {
        return (listener: any) => {
          target.subscribe(listener);
        };
      }
      return (target as any)[propKey];
    },
  });
}
