import React from "react";
import ToolbarContainer from "./containers/Toolbar";
import { useAppSelector } from "./hooks";
import BackgroundEndpointProvider from "./containers/BackgroundEndpointProvider";
import { selectUser } from "./store/geoguessrState";
import StoreProvider from "./containers/StoreProvider";

const App: React.FunctionComponent = () => {
  const user = useAppSelector(selectUser);
  return user === null ? null : <ToolbarContainer />;
};

export default () => (
  <BackgroundEndpointProvider>
    <StoreProvider>
      <App />
    </StoreProvider>
  </BackgroundEndpointProvider>
);
