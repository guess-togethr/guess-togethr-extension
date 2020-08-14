import React, { useState, useEffect } from "react";
import { createStore } from "./store";
import { Provider } from "react-redux";
import ToolbarContainer from "./containers/Toolbar";
import { Store } from "@reduxjs/toolkit";
import { remoteStoreWrapper } from "../utils";
import { setUser } from "./store/user";
import { proxy } from "comlink";
import { BackgroundStoreContext, useBackgroundEndpoint } from "./hooks";

const backgroundEndpoint = useBackgroundEndpoint();
const store = createStore(backgroundEndpoint);

async function monitorUserLogin() {
  async function getUserId() {
    const response = await fetch("/api/v3/profiles/");
    if (response.ok) {
      const { user } = await response.json();
      store.dispatch(setUser({ id: user.id, isPro: user.isPro }));
    } else {
      store.dispatch(setUser(null));
    }
  }

  backgroundEndpoint.onUrlChange(proxy(getUserId));
  await getUserId();
}

const App = () => {
  const [backgroundStore, setBackgroundStore] = useState<Store<any> | null>(
    null
  );
  useEffect(() => {
    Promise.all([
      backgroundEndpoint.getStore().then(remoteStoreWrapper),
      backgroundEndpoint.waitForCache("tabId"),
      monitorUserLogin(),
    ]).then(([store]) => {
      setBackgroundStore(store);
    });
  }, []);
  return (
    backgroundStore && (
      <Provider store={backgroundStore} context={BackgroundStoreContext}>
        <Provider store={store}>
          <ToolbarContainer />
        </Provider>
      </Provider>
    )
  );
};

export default App;
