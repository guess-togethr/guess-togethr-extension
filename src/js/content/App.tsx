import React from "react";
import ToolbarContainer from "./containers/Toolbar";
import { useAppSelector, useUserMonitor } from "./hooks";
import BackgroundEndpointProvider from "./containers/BackgroundEndpointProvider";
import { selectUser } from "./store/geoguessrState";
import StoreProvider from "./containers/StoreProvider";
import ThemeProvider from "./containers/ThemeProvider";

const App: React.FunctionComponent = () => {
  const user = useAppSelector(selectUser);

  useUserMonitor();

  return user === null ? null : <ToolbarContainer />;
};

export default () => (
  <BackgroundEndpointProvider>
    <StoreProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StoreProvider>
  </BackgroundEndpointProvider>
);
