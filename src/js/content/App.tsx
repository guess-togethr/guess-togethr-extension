import React from "react";
import BackgroundEndpointProvider from "./containers/BackgroundEndpointProvider";
import MapProxyProvider from "./containers/MapProxyProvider";
import StoreProvider from "./containers/StoreProvider";
import ThemeProvider from "./containers/ThemeProvider";
import ToolbarContainer from "./containers/Toolbar";
import ToolbarMonitor from "./ggShims/ToolbarMonitor";
import { selectUser } from "./store";
import {
  useAppSelector,
  useUrlMonitor,
  useUserMonitor,
  useTimeDelta,
} from "./storeHooks";

const App: React.FunctionComponent = () => {
  const user = useAppSelector(selectUser);

  useUrlMonitor();
  useUserMonitor();
  useTimeDelta();

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
