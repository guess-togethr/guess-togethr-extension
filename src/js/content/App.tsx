import React from "react";
import ToolbarContainer from "./containers/Toolbar";
import { useAppSelector, useUrlMonitor, useUserMonitor } from "./hooks";
import BackgroundEndpointProvider from "./containers/BackgroundEndpointProvider";
import StoreProvider from "./containers/StoreProvider";
import ThemeProvider from "./containers/ThemeProvider";
import ToolbarMonitor from "./ggShims/ToolbarMonitor";
import { selectUser } from "./store";
import { browser } from "webextension-polyfill-ts";
import MapProxyProvider from "./containers/MapProxyProvider";

const script = document.createElement("script");
script.src = browser.runtime.getURL("interceptor.bundle.js");
document.head.appendChild(script);

const App: React.FunctionComponent = () => {
  const user = useAppSelector(selectUser);

  useUrlMonitor();
  useUserMonitor();

  return user !== null ? (
    <ToolbarMonitor>
      <ThemeProvider type="dark">
        <ToolbarContainer />
      </ThemeProvider>
    </ToolbarMonitor>
  ) : null;
};

export default () => (
  <MapProxyProvider>
    <BackgroundEndpointProvider>
      <StoreProvider>
        <App />
      </StoreProvider>
    </BackgroundEndpointProvider>
  </MapProxyProvider>
);
