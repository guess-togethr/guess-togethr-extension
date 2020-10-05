import React from "react";
import ToolbarContainer from "./containers/Toolbar";
import BackgroundEndpointProvider from "./containers/BackgroundEndpointProvider";
import StoreProvider from "./containers/StoreProvider";
import ThemeProvider from "./containers/ThemeProvider";
import ToolbarMonitor from "./ggShims/ToolbarMonitor";
import { selectUser } from "./store";
import MapProxyProvider from "./containers/MapProxyProvider";
import { useAppSelector, useUrlMonitor, useUserMonitor } from "./storeHooks";

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
