import { Store } from "@reduxjs/toolkit";
import React, { useEffect, useState } from "react";
import { Provider, useStore } from "react-redux";
import { remoteStoreWrapper } from "../../utils";
import { BackgroundStoreContext } from "../storeHooks";
import { createStore, selectRedirect } from "../store";
import { useBackgroundEndpoint } from "./BackgroundEndpointProvider";
import { createLogger } from "redux-logger";

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
    backgroundEndpoint && setStore(createStore(backgroundEndpoint));
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
