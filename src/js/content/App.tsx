import React, { useState, useEffect } from "react";
import { createStore } from "./store";
import { Provider } from "react-redux";
import ToolbarContainer from "./containers/Toolbar";
import { Store } from "@reduxjs/toolkit";
import { remoteStoreWrapper } from "../utils";
import { setUser } from "./store/user";
import { proxy } from "comlink";
import { BackgroundStoreContext } from "./hooks";
import BackgroundEndpointProvider, {
  useBackgroundEndpoint,
  RemoteBackgroundEndpoint,
} from "./containers/BackgroundEndpointProvider";

async function monitorUserLogin(
  store: Store<any>,
  endpoint: RemoteBackgroundEndpoint
) {
  async function getUserId() {
    const response = await fetch("/api/v3/profiles/");
    if (response.ok) {
      const { user } = await response.json();
      store.dispatch(setUser({ id: user.id, isPro: user.isPro }));
    } else {
      store.dispatch(setUser(null));
    }
  }

  endpoint.onUrlChange(proxy(getUserId));
  await getUserId();
}

const App = () => {
  const [backgroundStore, setBackgroundStore] = useState<Store<any> | null>(
    null
  );
  const [store, setStore] = useState<Store<any> | null>(null);
  const backgroundEndpoint = useBackgroundEndpoint();
  useEffect(() => {
    if (!backgroundEndpoint) {
      return;
    }
    const newStore = createStore(backgroundEndpoint);
    setStore(newStore);
    Promise.all([
      backgroundEndpoint.getStore().then(remoteStoreWrapper),
      monitorUserLogin(newStore, backgroundEndpoint),
    ]).then(([backgroundStore]) => {
      setBackgroundStore(backgroundStore);
    });
  }, [backgroundEndpoint]);
  return (
    backgroundStore &&
    store && (
      <Provider store={backgroundStore} context={BackgroundStoreContext}>
        <Provider store={store}>
          <ToolbarContainer />
        </Provider>
      </Provider>
    )
  );
};

export default () => (
  <BackgroundEndpointProvider>
    <App />
  </BackgroundEndpointProvider>
);
