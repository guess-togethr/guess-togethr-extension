import {
  createSlice,
  createEntityAdapter,
  PayloadAction,
  configureStore,
  createNextState,
  combineReducers,
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

export interface SavedLobby {
  id: string;
  name?: string;
  isServer: boolean;
  identity: { publicKey: string; privateKey: string };
  tabId?: number;
}

const savedLobbyAdapter = createEntityAdapter<SavedLobby>();
const savedLobbySelector = savedLobbyAdapter.getSelectors<BackgroundRootState>(
  (state) => state.allLobbies
);
const savedLobbyLocalSelector = savedLobbyAdapter.getSelectors();

const savedLobbies = createSlice({
  name: "savedLobbies",
  initialState: savedLobbyAdapter.getInitialState(),
  reducers: {
    addLobby: savedLobbyAdapter.addOne,
    removeLobby: savedLobbyAdapter.removeOne,
    setMostRecent: (state, action: PayloadAction<string>) => {
      const all = savedLobbyLocalSelector.selectIds(state);
      const target = all.indexOf(action.payload);
      if (target > 0) {
        all.splice(0, 0, ...all.splice(target, 1));
      }
    },
    joinLobby: (state, action: PayloadAction<string>) =>
      savedLobbyAdapter.updateOne(state, {
        id: action.payload,
        changes: { tabId: (action as any).meta.tabId },
      }),
    leaveLobby: (state, action: PayloadAction<string>) =>
      savedLobbyAdapter.updateOne(state, {
        id: action.payload,
        changes: { tabId: undefined },
      }),
  },
});

const rootReducer = combineReducers({ allLobbies: savedLobbies.reducer });

export type BackgroundRootState = ReturnType<typeof rootReducer>;

const lobbyMiddleware: Middleware<{}, BackgroundRootState> = (store) => (
  next
) => (action) => {
  if (savedLobbies.actions.joinLobby.match(action)) {
    const lobby = savedLobbySelector.selectById(
      store.getState(),
      action.payload
    );
    if (lobby?.tabId) {
      if (lobby.tabId === (action as any).meta.tabId) {
        throw new Error("Double join");
      }
      browser.tabs.highlight({ tabs: lobby.tabId });
      return false;
    }
    next(action);
    return true;
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
            ReturnType<typeof savedLobbies["reducer"]>,
            ReturnType<typeof savedLobbies["reducer"]>
          >(
            (state) =>
              createNextState(state, (draft) => {
                savedLobbyLocalSelector
                  .selectAll(draft)
                  .forEach((e) => delete e?.tabId);
              }),
            (state) => state,
            { whitelist: ["savedLobbies"] }
          ),
        ],
      },
      rootReducer
    ),
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }).concat(lobbyMiddleware),
  });
  persistStore(store);
  return store;
}

export const {
  addLobby,
  removeLobby,
  setMostRecent,
  joinLobby,
  leaveLobby,
} = savedLobbies.actions;
export { savedLobbySelector, createStore };
