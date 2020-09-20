import { Store } from "@reduxjs/toolkit";
import React, { useEffect, useState } from "react";
import { Provider, useStore } from "react-redux";
import { remoteStoreWrapper } from "../../utils";
import { BackgroundStoreContext } from "../hooks";
import { createStore, selectRedirect } from "../store";
import { useBackgroundEndpoint } from "./BackgroundEndpointProvider";

const BackgroundStoreProvider: React.FunctionComponent = ({ children }) => {
  const backgroundEndpoint = useBackgroundEndpoint();
  const store = useStore();
  const [backgroundStore, setBackgroundStore] = useState<Store<any> | null>(
    null
  );

  useEffect(() => {
    backgroundEndpoint
      ?.getStore()
      .then(remoteStoreWrapper)
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
