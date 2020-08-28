import React, { useState, useEffect } from "react";
import { createStore } from "../store";
import { Provider } from "react-redux";
import { Store } from "@reduxjs/toolkit";
import { remoteStoreWrapper } from "../../utils";
import { BackgroundStoreContext } from "../hooks";
import { useBackgroundEndpoint } from "./BackgroundEndpointProvider";

const StoreProvider: React.FunctionComponent = ({ children }) => {
  const [backgroundStore, setBackgroundStore] = useState<Store<any> | null>(
    null
  );
  const [store, setStore] = useState<Store<any> | null>(null);
  const backgroundEndpoint = useBackgroundEndpoint();
  useEffect(() => {
    if (!backgroundEndpoint) {
      return;
    }
    setStore(createStore(backgroundEndpoint));
    backgroundEndpoint
      .getStore()
      .then(remoteStoreWrapper)
      .then(setBackgroundStore);
  }, [backgroundEndpoint]);
  return (
    backgroundStore &&
    store && (
      <Provider store={backgroundStore} context={BackgroundStoreContext}>
        <Provider store={store}>{children}</Provider>
      </Provider>
    )
  );
};

export default StoreProvider;
