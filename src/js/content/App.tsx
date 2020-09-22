import React from "react";
import ToolbarContainer from "./containers/Toolbar";
import { useAppSelector, useUrlMonitor, useUserMonitor } from "./hooks";
import BackgroundEndpointProvider from "./containers/BackgroundEndpointProvider";
import StoreProvider from "./containers/StoreProvider";
import ThemeProvider from "./containers/ThemeProvider";
import ToolbarMonitor from "./ggShims/ToolbarMonitor";
import { selectUser } from "./store";

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
  <BackgroundEndpointProvider>
    <StoreProvider>
      <App />
    </StoreProvider>
  </BackgroundEndpointProvider>
);
