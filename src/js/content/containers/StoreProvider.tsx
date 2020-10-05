import { Store } from "@reduxjs/toolkit";
import React, { useEffect, useState } from "react";
import { Provider, useStore } from "react-redux";
import { createLogger } from "redux-logger";
import { remoteStoreWrapper } from "../../utils";
import { debugStruct } from "../debug";
import { createStore, selectRedirect, setTimeDelta } from "../store";
import { BackgroundStoreContext } from "../storeHooks";
import { useBackgroundEndpoint } from "./BackgroundEndpointProvider";

const logger = createLogger({
  logger: new Proxy(console, {
    get: (target: any, prop) => {
      if (prop === "group") {
        return (data: any) => target.group(...data);
      }
      return target[prop];
    },
  }),
  titleFormatter: (action, time) => {
    const headerCSS = [
      "color: gray; font-weight: lighter;",
      "color: inherit;",
      "color: gray; font-weight: lighter;",
    ];
    const parts = [
      "%c BACKGROUND action",
      `%c${String(action.type)}`,
      `%c@ ${time}`,
    ];

    return [parts.join(" "), ...headerCSS] as any;
  },
  level: {
    prevState: "log",
    action: "log",
    error: "log",
    nextState: false,
  },
});

const BackgroundStoreProvider: React.FunctionComponent = ({ children }) => {
  const backgroundEndpoint = useBackgroundEndpoint();
  const store = useStore();
  const [backgroundStore, setBackgroundStore] = useState<Store<any> | null>(
    null
  );

  useEffect(() => {
    backgroundEndpoint
      ?.getStore()
      .then((store) => remoteStoreWrapper(store, logger))
      .then((bgStore) => {
        debugStruct.bgStore = bgStore;
        // Prevent dispatches to background store if we're redirecting
        store.subscribe(() => {
          if (selectRedirect(store.getState())) {
            bgStore.close();
          }
        });
        setBackgroundStore(bgStore);
      });
  }, [backgroundEndpoint, store]);

  return (
    backgroundStore && (
      <Provider store={backgroundStore} context={BackgroundStoreContext}>
        {children}
      </Provider>
    )
  );
};

const StoreProvider: React.FunctionComponent = ({ children }) => {
  const [store, setStore] = useState<Store<any> | null>(null);
  const backgroundEndpoint = useBackgroundEndpoint();
  useEffect(() => {
    if (backgroundEndpoint) {
      const store = createStore(backgroundEndpoint);
      store.dispatch(setTimeDelta(backgroundEndpoint.timeDelta));
      setStore(store);
    }
  }, [backgroundEndpoint]);
  return (
    store && (
      <Provider store={store}>
        <BackgroundStoreProvider>{children}</BackgroundStoreProvider>
      </Provider>
    )
  );
};

export default StoreProvider;
