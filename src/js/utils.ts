import { Remote, proxy, transferHandlers, releaseProxy } from "comlink";
import {
  Store,
  AnyAction,
  Reducer,
  createNextState,
  Action,
  ReducersMapObject,
  StateFromReducersMapObject,
  ActionFromReducersMapObject,
  CombinedState,
  applyMiddleware,
  Middleware,
} from "@reduxjs/toolkit";
import { Patch, Draft, isDraft, isDraftable } from "immer";

type Without<T> = { [P in keyof T]?: undefined };
export type XOR<T, U> = (Without<T> & U) | (Without<U> & T);

type DraftableReducer<S, A = AnyAction> = (
  state: undefined | Draft<S>,
  action: A
) => S | void;

type PatchListener = (patches: Patch[]) => void;

function arraysEqual<T = any>(
  array1: ReadonlyArray<T>,
  array2: ReadonlyArray<T>
) {
  return (
    array1.length === array2.length &&
    array1.every((el, index) => array2[index] === el)
  );
}

export function trackPatches<S, A extends Action<any>>(
  reducer: Reducer<S, A> | DraftableReducer<S, A>,
  pathFilter?: Patch["path"]
): [Reducer<S, A>, (listener: PatchListener) => () => void] {
  const listeners = new Set<PatchListener>();
  const newReducer = ((state, action) =>
    createNextState(
      state,
      (draft) => reducer(draft as any, action),
      (patches) => {
        const filteredPatches = pathFilter
          ? patches.filter(
              ({ path }) =>
                arraysEqual(path.slice(0, pathFilter.length), pathFilter) &&
                path.length > pathFilter.length
            )
          : patches;
        filteredPatches.length && listeners.forEach((l) => l(filteredPatches));
      }
    )) as Reducer<S, A>;

  const registerListener = (listener: PatchListener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return [newReducer, registerListener];
}

export function makeDraftableReducer<S, A extends Action>(
  reducer: DraftableReducer<S, A>
): Reducer<S, A> {
  return (previousState: S | undefined, action: A) => {
    if (isDraft(previousState)) {
      // If it's already a draft, we must already be inside a `createNextState` call,
      // likely because this is being wrapped in `createReducer`, `createSlice`, or nested
      // inside an existing draft. It's safe to just pass the draft to the mutator.
      const draft = previousState as Draft<S>; // We can assume this is already a draft
      const result = reducer(draft, action);

      if (typeof result === "undefined") {
        return previousState;
      }

      return result;
    } else if (!isDraftable(previousState)) {
      // If state is not draftable (ex: a primitive, such as 0), we want to directly
      // return the caseReducer func and not wrap it with produce.
      const result = reducer(previousState as any, action);

      if (typeof result === "undefined") {
        if (previousState === null) {
          return previousState;
        }
        throw Error(
          "A case reducer on a non-draftable value must not return undefined"
        );
      }

      return result;
    }

    return createNextState(previousState, (draft: Draft<S>) => {
      return reducer(draft, action);
    }) as any;
  };
}

export function immerAwareCombineReducers<S>(
  reducers: ReducersMapObject<S, any>
): DraftableReducer<CombinedState<S>>;
export function immerAwareCombineReducers<S, A extends Action = AnyAction>(
  reducers: ReducersMapObject<S, A>
): DraftableReducer<CombinedState<S>, A>;
export function immerAwareCombineReducers<M extends ReducersMapObject>(
  reducers: M
): DraftableReducer<
  CombinedState<StateFromReducersMapObject<M>>,
  ActionFromReducersMapObject<M>
>;
export function immerAwareCombineReducers(map: ReducersMapObject) {
  const keys = Object.keys(map);
  return (
    state: StateFromReducersMapObject<typeof map> = {},
    action: AnyAction
  ) => {
    for (const k of keys) {
      const newState = map[k](state[k], action);
      if (!isDraft(newState)) {
        state[k] = newState;
      }
    }
    return state;
  };
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
    atob(base64.replace(/-/g, "+").replace(/_/g, "/")),
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

// export function generateNoiseKeypair() {
//   const pair = {
//     publicKey: new Uint8Array(sodium.crypto_kx_PUBLICKEYBYTES),
//     privateKey: new Uint8Array(sodium.crypto_kx_SECRETKEYBYTES),
//   };

//   sodium.crypto_kx_keypair(pair.publicKey, pair.privateKey);
//   return {
//     publicKey: bufferToBase64(pair.publicKey),
//     privateKey: bufferToBase64(pair.privateKey),
//   };
// }

export async function remoteStoreWrapper<S>(
  remoteStore: Remote<Store<S>>,
  ...middlewares: Middleware<{}, S>[]
): Promise<Store<S> & { close: () => void }> {
  const subscribers = new Set<() => void>();
  let closed = false;

  let latestState = (await remoteStore.getState()) as S;
  remoteStore.subscribe(
    proxy(async () => {
      latestState = (await remoteStore.getState()) as S;
      console.log("BACKGROUND STATE", latestState);
      subscribers.forEach((f) => f());
    })
  );
  const createStore: () => Store<S> = () => ({
    close: () => {
      console.log("CLOSED");
      closed = true;
      subscribers.clear();
    },
    dispatch: (action) =>
      (!closed && (remoteStore.dispatch(action) as unknown)) as any,
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
  });

  return middlewares.length
    ? (applyMiddleware(...middlewares)(createStore as any) as any)()
    : createStore();
}

export interface TabAwareStore<S, A extends AnyAction> extends Store<S, A> {
  reset: () => void;
}

export function makeTabAwareStore<S, A extends AnyAction>(
  store: Store<S, A>,
  tabId: number
) {
  const unsubscribes = new Set<ReturnType<typeof store["subscribe"]>>();
  return new Proxy<TabAwareStore<S, A>>(store as any, {
    get(target, propKey) {
      console.log(target, propKey);
      if (propKey === "dispatch") {
        return (action: AnyAction) => {
          action.meta = Object.assign({}, action.meta, { tabId });
          return target.dispatch(action as any);
        };
      } else if (propKey === "subscribe") {
        return (listener: any) => {
          const unsubscribe = target.subscribe(listener);
          unsubscribes.add(() => {
            unsubscribe();
            listener[releaseProxy]();
          });
        };
      } else if (propKey === "reset") {
        return () => {
          unsubscribes.forEach((f) => f());
          unsubscribes.clear();
        };
      }
      return (target as any)[propKey];
    },
  });
}

const asyncIterableTransferHandler = {
  // We want to use this transfer handler for any objects that have an async iterator
  canHandle: (obj: any): obj is any => obj && obj[Symbol.asyncIterator],
  serialize: (iterable: any) => {
    // Create a message channel specifically for messages for this async iterator
    const { port1, port2 } = new MessageChannel();

    const iterator = iterable[Symbol.asyncIterator]();

    // Listen and forward calls onto the iterator
    port1.onmessage = async ({ data }) => {
      port1.postMessage(await iterator.next(data));
    };

    // Transfer the message channel to the caller's execution context
    return [port2, [port2]] as [MessagePort, [MessagePort]];
  },
  deserialize: async (port: any) => {
    // Convenience function to allow us to use async/await for messages coming down the port
    const nextPortMessage = () =>
      new Promise((resolve) => {
        port.onmessage = ({ data }: any) => {
          resolve(data);
        };
      });

    // Construct our "proxy" iterator
    const iterator: any = {
      next: (value: any) => {
        // Inform the iterator that next has been called
        port.postMessage(value);
        // Return a promise that will resolve with the object returned by the iterator
        return nextPortMessage();
      },
    };

    // Make it iterable so it can be used in for-await-of statement
    iterator[Symbol.asyncIterator] = () => iterator;

    return iterator;
  },
};

// Make Comlink aware of the transfer handler by adding it to its transfer handler Map
transferHandlers.set("asyncIterable", asyncIterableTransferHandler);

type NonFunctionProperties<T> = {
  [P in keyof T]: T[P] extends Function ? never : P;
}[keyof T];

export type CachedRemote<
  T,
  CachedProps extends NonFunctionProperties<T>
> = Omit<Remote<T>, CachedProps> & { [K in CachedProps]: T[K] };

export async function cacheRemoteProperties<
  T,
  P extends NonFunctionProperties<T>
>(remote: Remote<T>, ...props: ReadonlyArray<P>): Promise<CachedRemote<T, P>> {
  const cache = new Map<keyof T, Remote<T>[P]>();
  await Promise.all(
    props.map(async (p) => {
      cache.set(p, await remote[p]);
    })
  );
  return (new Proxy(remote, {
    get: (target, prop: P | keyof T) => {
      if (cache.has(prop)) {
        return cache.get(prop);
      } else if (prop === "then") {
        return undefined;
      }

      return target[prop];
    },
  }) as unknown) as CachedRemote<T, P>;
}
