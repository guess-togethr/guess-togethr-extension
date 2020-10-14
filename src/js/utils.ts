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
import { Patch, Draft, isDraft } from "immer";
import gtDebug from "./debug";
import { defaultMemoize, createSelectorCreator } from "reselect";
import deepEqual from "fast-deep-equal";

const debug = gtDebug("utils");

// type Without<T> = { [P in keyof T]?: undefined };
// export type XOR<T, U> = (Without<T> & U) | (Without<U> & T);
type Sub<T, U> = T & { [P in Exclude<keyof U, keyof T>]?: never };
export type XOR<T, U> = Sub<T, U> | Sub<U, T>;
export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
export type Unpromisify<P> = P extends PromiseLike<infer T> ? T : P;

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

export function filterScopedPatches(patches: Patch[], path: string[]) {
  return patches
    .filter((patch) => arraysEqual(patch.path.slice(0, path.length), path))
    .map((patch) => ({ ...patch, path: patch.path.slice(path.length) }));
}

export function trackPatches<S, A extends Action<any>>(
  reducer: Reducer<S, A> | DraftableReducer<S, A>
): [Reducer<S, A>, (listener: PatchListener) => () => void] {
  const listeners = new Set<PatchListener>();
  const newReducer = ((state, action) =>
    createNextState(
      state,
      (draft) => reducer(draft as any, action),
      (patches) => {
        patches.length && listeners.forEach((l) => l(patches));
      }
    )) as Reducer<S, A>;

  const registerListener = (listener: PatchListener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return [newReducer, registerListener];
}

// This is a drop-in replacement for combineReducers that can handle an immer
// draft passed into the resulting reducer, modifying the draft in-place.
// Normally, combineReducers creates a new non-draft object and assigns the
// results of the sub-reducers to it making a chimera that doesn't work.
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

// TODO: use the mainline redux-toolkit when
// https://github.com/reduxjs/redux-toolkit/pull/63 gets released (>1.4.0)

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
      debug("new background state", latestState);
      subscribers.forEach((f) => f());
    })
  );
  const createStore: () => Store<S> = () => ({
    close: () => {
      debug("background store closed");
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

type NonFunctionProperties<T> = Extract<
  {
    [P in keyof T]: T[P] extends Function ? never : P;
  }[keyof T],
  string | number
>;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

type CheckForUnion<T, TErr, TOk> = [T] extends [UnionToIntersection<T>]
  ? TOk
  : TErr;

// export type CachedRemote<
//   T,
//   CachedProps extends NonFunctionProperties<T>
// > = Omit<Remote<T>, CachedProps> & { [K in CachedProps]: Unpromisify<T[K]> };

type MaybePromise<T> = PromiseLike<T> | T;

type MapFunction<T, P extends string | number, R> = (
  proxy: T
) => MaybePromise<[P, R]>;
type ValidArg<T, S extends string | number, R> =
  | NonFunctionProperties<T>
  | MapFunction<T, S, R>;

type NewProps<
  T,
  Arg extends ReadonlyArray<ValidArg<T, string | number, any>>
> = UnionToIntersection<
  {
    [I in keyof Arg]: Arg[I] extends MapFunction<T, infer U, infer V>
      ? { [key in U]: V }
      : Arg[I] extends NonFunctionProperties<T>
      ? { [key in Arg[I]]: Unpromisify<T[Arg[I]]> }
      : never;
  }[number]
>;

type CachedRemote<
  T,
  A extends ReadonlyArray<ValidArg<T, string | number, any>>
> = Omit<T, Extract<keyof T, keyof NewProps<T, A>>> & NewProps<T, A>;

export async function cacheRemoteProperties<
  T extends object,
  P extends ReadonlyArray<ValidArg<T, string | number, any>>
>(remote: T, ...props: P): Promise<CachedRemote<T, P>> {
  const cache = new Map<string | number | symbol, any>(
    await Promise.all(
      props.map(async (p) =>
        p instanceof Function
          ? await p(remote)
          : ([p, await remote[p]] as const)
      )
    )
  );
  return (new Proxy(remote, {
    get: (target, prop: keyof T) => {
      if (cache.has(prop)) {
        return cache.get(prop);
      } else if (prop === "then") {
        return undefined;
      }

      return target[prop];
    },
  }) as unknown) as CachedRemote<T, P>;
}

export const createDeepEqualSelector = createSelectorCreator(
  defaultMemoize,
  deepEqual
);
