import {
  combineReducers,
  configureStore,
  createNextState,
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
import savedLobbies, {
  claimSavedLobby,
  isFullLobby,
  savedLobbyAdapter,
  savedLobbyLocalSelector,
  savedLobbySelectors,
} from "./savedLobbies";
import identities from "./identities";
import gtDebug from "../../debug";
import { localStorage as persistLocalStorage } from "redux-persist-webextension-storage";
import { browser } from "webextension-polyfill-ts";
import logger from "redux-logger";

export const debug = gtDebug("backgroundStore");

const rootReducer = combineReducers({
  allLobbies: savedLobbies,
  identities: identities,
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
  if (claimSavedLobby.match(action)) {
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
export default function createStore() {
  // Prevent saving errored lobbies in production mode
  const storeTransform = createTransform<
    ReturnType<typeof savedLobbies>,
    ReturnType<typeof savedLobbies>
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
