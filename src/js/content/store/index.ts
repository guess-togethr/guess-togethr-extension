import { configureStore, combineReducers } from "@reduxjs/toolkit";
import lobby, { lobbyMiddleware } from "./lobbyState";
import geoguessr, { geoguessrMiddleware } from "./geoguessrState";
import { RemoteBackgroundEndpoint } from "../containers/BackgroundEndpointProvider";
import devToolsEnhancer from "remote-redux-devtools";
import { createLogger } from "redux-logger";
import gtDebug from "../../debug";

const reducer = combineReducers({
  lobby,
  geoguessr,
});

const debug = gtDebug("state");

const logger = createLogger({
  logger: new Proxy(console, {
    get: (target, prop) => {
      if (prop === "log") {
        return debug;
      }
      if (!debug.wasEnabled) {
        return () => {};
      }
      return (target as any)[prop];
    },
  }),
});

export type RootState = ReturnType<typeof reducer>;
export type AppDispatch = ReturnType<typeof createStore>["dispatch"];

export function createStore(backgroundEndpoint: RemoteBackgroundEndpoint) {
  return configureStore({
    reducer,
    devTools: false,
    enhancers:
      process.env.NODE_ENV === "development"
        ? [devToolsEnhancer({ port: 3030, secure: false })]
        : undefined,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: { extraArgument: backgroundEndpoint },
      })
        .prepend(geoguessrMiddleware, lobbyMiddleware)
        .concat(logger),
  });
}

export * from "./lobbyState";
export * from "./lobbySelectors";
export * from "./geoguessrState";
