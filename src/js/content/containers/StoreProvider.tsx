import React, { useState, useEffect } from "react";
import { createStore } from "../store";
import { Provider } from "react-redux";
import { Store } from "@reduxjs/toolkit";
import { remoteStoreWrapper } from "../../utils";
import { BackgroundStoreContext, useAppSelector } from "../hooks";
import { useBackgroundEndpoint } from "./BackgroundEndpointProvider";
import { selectRedirect } from "../store/geoguessrState";

const BackgroundStoreProvider: React.FunctionComponent = ({ children }) => {
  const backgroundEndpoint = useBackgroundEndpoint();
  const redirect = Boolean(useAppSelector(selectRedirect));
  const [backgroundStore, setBackgroundStore] = useState<Store<any> | null>(
    null
  );

  useEffect(() => {
    if (redirect && backgroundStore) {
      (backgroundStore as any).close();
    }
  }, [redirect, backgroundStore]);

  useEffect(() => {
    backgroundEndpoint
      ?.getStore()
      .then(remoteStoreWrapper)
      .then(setBackgroundStore);
  }, [backgroundEndpoint]);

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
