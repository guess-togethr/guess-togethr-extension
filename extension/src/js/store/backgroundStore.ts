import {
  createSlice,
  createEntityAdapter,
  PayloadAction,
  configureStore,
  getDefaultMiddleware,
  createNextState,
  combineReducers,
  Store,
  AnyAction,
  Middleware,
} from "@reduxjs/toolkit";
import {
  persistReducer,
  persistStore,
  createTransform,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import { syncStorage } from "redux-persist-webextension-storage";
import { browser } from "webextension-polyfill-ts";
import { Remote, proxy } from "comlink";
import { createLobby } from "../lobby";

interface Lobby {
  id: string;
  name?: string;
  isServer: boolean;
  identity: { publicKey: string; privateKey: string };
  tabId?: number;
}

const lobbyAdapter = createEntityAdapter<Lobby>();
const lobbySelector = lobbyAdapter.getSelectors<BackgroundRootState>(
  (state) => state.allLobbies
);
const lobbyLocalSelector = lobbyAdapter.getSelectors();

const allLobbies = createSlice({
  name: "all-lobbies",
  initialState: lobbyAdapter.getInitialState(),
  reducers: {
    addLobby: lobbyAdapter.addOne,
    removeLobby: lobbyAdapter.removeOne,
    setMostRecent: (state, action: PayloadAction<string>) => {
      const all = lobbyLocalSelector.selectIds(state);
      const target = all.indexOf(action.payload);
      if (target > 0) {
        all.splice(0, 0, ...all.splice(target, 1));
      }
    },
    joinLobby: (state, action: PayloadAction<string>) =>
      lobbyAdapter.updateOne(state, {
        id: action.payload,
        changes: { tabId: (action as any).meta.tabId },
      }),
    leaveLobby: (state, action: PayloadAction<string>) =>
      lobbyAdapter.updateOne(state, {
        id: action.payload,
        changes: { tabId: undefined },
      }),
  },
});

const rootReducer = combineReducers({ allLobbies: allLobbies.reducer });

export type BackgroundRootState = ReturnType<typeof rootReducer>;

const lobbyMiddleware: Middleware<{}, BackgroundRootState> = (store) => (
  next
) => (action) => {
  if (allLobbies.actions.joinLobby.match(action)) {
    const lobby = lobbySelector.selectById(store.getState(), action.payload);
    if (lobby?.tabId) {
      if (lobby.tabId === (action as any).meta.tabId) {
        throw new Error("Double join");
      }
      browser.tabs.highlight({ tabs: lobby.tabId });
      return;
    }
    next(action);
    return proxy(createLobby(store, action.payload));
  }
  return next(action);
};

function createStore() {
  const store = configureStore({
    reducer: persistReducer(
      {
        storage: syncStorage,
        key: "ggt-lobbies",
        transforms: [
          createTransform<
            ReturnType<typeof allLobbies["reducer"]>,
            ReturnType<typeof allLobbies["reducer"]>
          >(
            (state) =>
              createNextState(state, (draft) => {
                lobbyLocalSelector
                  .selectAll(draft)
                  .forEach((e) => delete e?.tabId);
              }),
            (state) => state,
            { whitelist: ["allLobbies"] }
          ),
        ],
      },
      rootReducer
    ),
    middleware: getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(lobbyMiddleware),
  });
  persistStore(store);
  return store;
}

async function remoteStoreWrapper<S extends any>(
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

function makeTabAwareStore<S, A extends AnyAction>(
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

export const {
  addLobby,
  removeLobby,
  setMostRecent,
  joinLobby,
  leaveLobby,
} = allLobbies.actions;
export { lobbySelector, createStore, makeTabAwareStore, remoteStoreWrapper };
