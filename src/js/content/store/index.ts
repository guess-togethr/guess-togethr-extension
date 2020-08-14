import { configureStore, combineReducers } from "@reduxjs/toolkit";
import user from "./user";
import lobby from "./lobby";
import { lobbyMiddleware } from "./lobby";
import { RemoteBackgroundEndpoint } from "../hooks";

const reducer = combineReducers({
  user,
  lobby,
});

export type RootState = ReturnType<typeof reducer>;
export type AppDispatch = ReturnType<typeof createStore>["dispatch"];

export function createStore(backgroundEndpoint: RemoteBackgroundEndpoint) {
  return configureStore({
    reducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: { extraArgument: backgroundEndpoint },
      }).prepend(lobbyMiddleware),
  });
}
