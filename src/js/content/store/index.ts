import { combineReducers, configureStore } from "@reduxjs/toolkit";
import logger from "redux-logger";
import devToolsEnhancer from "remote-redux-devtools";
import { RemoteBackgroundEndpoint } from "../containers/BackgroundEndpointProvider";
import geoguessr, { geoguessrMiddleware } from "./geoguessrState";
import lobby, { lobbyMiddleware } from "./lobbyState";

const reducer = combineReducers({
  lobby,
  geoguessr,
});

export type RootState = ReturnType<typeof reducer>;
export type AppDispatch = ReturnType<typeof createStore>["dispatch"];

export function createStore(backgroundEndpoint: RemoteBackgroundEndpoint) {
  return configureStore({
    reducer,
    devTools: false,
    enhancers: [devToolsEnhancer({ port: 3030, secure: false })],
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: { extraArgument: backgroundEndpoint },
      })
        .prepend(geoguessrMiddleware, lobbyMiddleware)
        .concat(logger),
  });
}
