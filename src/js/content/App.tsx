import React, { MutableRefObject, useEffect, useRef } from "react";
import ToolbarContainer from "./containers/Toolbar";
import { useAppSelector, useUrlMonitor, useUserMonitor } from "./hooks";
import BackgroundEndpointProvider from "./containers/BackgroundEndpointProvider";
import { selectUser } from "./store/geoguessrState";
import StoreProvider from "./containers/StoreProvider";
import ThemeProvider from "./containers/ThemeProvider";
import ToolbarMonitor from "./ggShims/ToolbarMonitor";

const App: React.FunctionComponent = () => {
  const user = useAppSelector(selectUser);

  useUrlMonitor();
  useUserMonitor();

  return user !== null ? (
    <ToolbarMonitor>
      <ThemeProvider>
        <ToolbarContainer />
      </ThemeProvider>
    </ToolbarMonitor>
  ) : null;
};

export default () => (
  <BackgroundEndpointProvider>
    <StoreProvider>
      <App />
    </StoreProvider>
  </BackgroundEndpointProvider>
);
