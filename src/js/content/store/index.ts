import { configureStore, combineReducers } from "@reduxjs/toolkit";
import lobby from "./lobbyState";
import geoguessr from "./geoguessrState";
import { lobbyMiddleware } from "./lobbyState";
import { RemoteBackgroundEndpoint } from "../containers/BackgroundEndpointProvider";
import { getGeoguessrMiddleware } from "./geoguessrState";

const reducer = combineReducers({
  lobby,
  geoguessr,
});

export type RootState = ReturnType<typeof reducer>;
export type AppDispatch = ReturnType<typeof createStore>["dispatch"];

export function createStore(backgroundEndpoint: RemoteBackgroundEndpoint) {
  return configureStore({
    reducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: { extraArgument: backgroundEndpoint },
      }).prepend(lobbyMiddleware, getGeoguessrMiddleware(backgroundEndpoint)),
  });
}
