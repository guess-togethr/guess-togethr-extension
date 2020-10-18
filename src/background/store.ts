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
import type { Identity } from "../content/lobbyManager";
import { XOR } from "../utils";

const debug = gtDebug("backgroundStore");

// export interface FullSavedLobby {
//   id: string;
//   // identity: { publicKey: string; privateKey: string };
//   isServer: boolean;
//   user?: string;
//   name?: string;
//   tabId?: number;
// }
export type FullSavedLobby = { id: string; tabId?: number } & XOR<
  { isServer: true; user: string; name: string },
  { isServer: false; user?: string; name?: string }
>;
export interface ErroredLobby {
  id: string;
  error: string;
  tabId: number;
}
export type SavedLobby = XOR<FullSavedLobby, ErroredLobby>;

interface IdentityEntity extends Identity {
  id: string;
}

export function isFullLobby(lobby?: SavedLobby): lobby is FullSavedLobby {
  return !!lobby && "isServer" in lobby;
}
export function isErroredLobby(lobby?: SavedLobby): lobby is ErroredLobby {
  return !!lobby && "error" in lobby;
}

const savedLobbyAdapter = createEntityAdapter<SavedLobby>();
const savedLobbySelectors = savedLobbyAdapter.getSelectors<BackgroundRootState>(
  (state) => state.allLobbies
);
const savedLobbyLocalSelector = savedLobbyAdapter.getSelectors();

const savedLobbies = createSlice({
  name: "savedLobbies",
  initialState: savedLobbyAdapter.getInitialState(),
  reducers: {
    saveLobby: savedLobbyAdapter.addOne,
    removeSavedLobby: savedLobbyAdapter.removeOne,
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

const identityAdapter = createEntityAdapter<IdentityEntity>();

const unsafeIdentitySelectors = identityAdapter.getSelectors(
  (state: BackgroundRootState) => state.identities
);
const identitySelectors = createEntityAdapter<
  Omit<IdentityEntity, "privateKey">
>().getSelectors((state: BackgroundRootState) =>
  createNextState(state.identities, (draft) => {
    Object.values(draft.entities).forEach((v) => delete (v as any)?.privateKey);
  })
);

const identities = createSlice({
  name: "identities",
  initialState: identityAdapter.getInitialState(),
  reducers: {
    addIdentity: identityAdapter.addOne,
  },
});

const rootReducer = combineReducers({
  allLobbies: savedLobbies.reducer,
  identities: identities.reducer,
});

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
    const lobby = savedLobbySelectors.selectById(
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

function createStore() {
  // Prevent saving errored lobbies in production mode
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
export const { addIdentity } = identities.actions;
export {
  savedLobbySelectors,
  identitySelectors,
  unsafeIdentitySelectors,
  createStore,
};
