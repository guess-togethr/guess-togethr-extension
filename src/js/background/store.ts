import {
  createSlice,
  createEntityAdapter,
  PayloadAction,
  configureStore,
  createNextState,
  combineReducers,
  Middleware,
  Action,
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
import { localStorage as persistLocalStorage } from "redux-persist-webextension-storage";
import { browser } from "webextension-polyfill-ts";
import logger from "redux-logger";
import gtDebug from "../debug";

const debug = gtDebug("backgroundStore");

export interface FullSavedLobby {
  id: string;
  identity: { publicKey: string; privateKey: string };
  isServer: boolean;
  user?: string;
  name?: string;
  tabId?: number;
}
interface ErroredLobby {
  id: string;
  error: string;
  tabId: number;
}
export type SavedLobby = FullSavedLobby | ErroredLobby;

export function isFullLobby(lobby: SavedLobby): lobby is FullSavedLobby {
  return "identity" in lobby;
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
    saveLobby: savedLobbyAdapter.addOne,
    removeSavedLobby: savedLobbyAdapter.removeOne,
    // setMostRecentSavedLobby: (state, action: PayloadAction<string>) => {
    //   const all = savedLobbyLocalSelector.selectIds(state);
    //   const target = all.indexOf(action.payload);
    //   if (target > 0) {
    //     all.splice(0, 0, ...all.splice(target, 1));
    //   }
    // },
    claimSavedLobby: (state, action: PayloadAction<string>) => {
      const allLobbies = savedLobbyLocalSelector.selectAll(state);
      const existingClaimedLobby = allLobbies.find(
        (lobby) => lobby.tabId === (action as any).meta.tabId
      );

      // If this tab previously claimed a lobby, either release it if it was a
      // normal lobby or delete it if it was an errored lobby
      if (existingClaimedLobby && existingClaimedLobby.id !== action.payload) {
        if (!isFullLobby(existingClaimedLobby)) {
          savedLobbyAdapter.removeOne(state, existingClaimedLobby.id);
        } else {
          delete existingClaimedLobby.tabId;
        }
      }

      savedLobbyAdapter.updateOne(state, {
        id: action.payload,
        changes: { tabId: (action as any).meta.tabId },
      });

      // Move the lobby to the top of the list
      const allLobbyIds = savedLobbyLocalSelector.selectIds(state);
      const newClaimedLobbyIndex = allLobbyIds.indexOf(action.payload);
      if (newClaimedLobbyIndex > 0) {
        allLobbyIds.unshift(...allLobbyIds.splice(newClaimedLobbyIndex, 1));
      } else if (newClaimedLobbyIndex < 0) {
        debug("claiming unknown lobby", action.payload);
      }
    },
    releaseSavedLobby: (state, action: Action) => {
      const existingLobby = savedLobbyLocalSelector
        .selectAll(state)
        .find((lobby) => lobby.tabId === (action as any).meta.tabId);
      if (existingLobby) {
        if (!isFullLobby(existingLobby)) {
          savedLobbyAdapter.removeOne(state, existingLobby.id);
        } else {
          delete existingLobby.tabId;
        }
      }
    },
    updateSavedLobby: savedLobbyAdapter.updateOne,
  },
});

const rootReducer = combineReducers({ allLobbies: savedLobbies.reducer });

type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;

export type BackgroundRootState = ReturnType<typeof rootReducer>;
export type BackgroundStore = ThenArg<ReturnType<typeof createStore>>;
export type BackgroundDispatch = BackgroundStore["dispatch"];

// This middleware switches browser tabs if a tab tries to claim a lobby that
// is already claimed by another tab. Returns true if switched to another tab
const lobbyMiddleware: Middleware<{}, BackgroundRootState> = (store) => (
  next
) => (action) => {
  if (savedLobbies.actions.claimSavedLobby.match(action)) {
    const lobby = savedLobbySelector.selectById(
      store.getState(),
      action.payload
    );
    if (lobby && isFullLobby(lobby) && lobby.tabId !== undefined) {
      if (lobby.tabId !== (action as any).meta.tabId) {
        debug("switching tabs", lobby);
        browser.tabs
          .get(lobby.tabId)
          .then(({ index, windowId }) =>
            browser.tabs.highlight({ windowId, tabs: index })
          );
      }
      return false;
    }
    next(action);
    return true;
  }
  return next(action);
};

const storeTransform = createTransform<
  ReturnType<typeof savedLobbies["reducer"]>,
  ReturnType<typeof savedLobbies["reducer"]>
>(
  (state) =>
    createNextState(state, (draft) => {
      savedLobbyLocalSelector
        .selectAll(draft)
        .forEach((e) =>
          !isFullLobby(e)
            ? savedLobbyAdapter.removeOne(draft, e.id)
            : delete e.tabId
        );
    }),
  (state) => state,
  { whitelist: ["allLobbies"] }
);

function createStore() {
  const store = configureStore({
    reducer: persistReducer<BackgroundRootState>(
      {
        storage: persistLocalStorage,
        key: "ggt-lobbies",
        transforms:
          process.env.NODE_ENV === "development" ? undefined : [storeTransform],
      },
      rootReducer
    ),
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }).concat(logger, lobbyMiddleware),
  });

  return new Promise<typeof store>((resolve) =>
    persistStore(store, null, () => resolve(store))
  );
}

export const {
  saveLobby,
  removeSavedLobby,
  // setMostRecentSavedLobby,
  claimSavedLobby,
  releaseSavedLobby,
  updateSavedLobby,
} = savedLobbies.actions;
export { savedLobbySelector, createStore };
