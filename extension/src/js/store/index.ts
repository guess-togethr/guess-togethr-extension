import {
  configureStore,
  combineReducers,
  Reducer,
  createNextState,
} from "@reduxjs/toolkit";
import user from "./user";
import lobby from "./lobby";
import { RemoteBackgroundEndpoint } from "../content/content";
import { lobbyMiddleware } from "./lobby";

const reducer = combineReducers({
  user,
  lobby,
});

export type RootState = ReturnType<typeof reducer>;

const store = configureStore({
  reducer,
});

export function createStore(backgroundEndpoint: RemoteBackgroundEndpoint) {
  return configureStore({
    reducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: { extraArgument: backgroundEndpoint },
      }).concat(lobbyMiddleware),
  });
}

export { store };
