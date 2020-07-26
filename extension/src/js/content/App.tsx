import React, { useState, useEffect } from "react";
import { store } from "../store";
import {
  Provider,
  createStoreHook,
  createSelectorHook,
  createDispatchHook,
} from "react-redux";
import Toolbar from "./Toolbar";
import { Store, Action, AnyAction, Dispatch } from "@reduxjs/toolkit";
import { BackgroundRootState } from "../store/backgroundStore";
import { useBackgroundEndpoint } from "./content";
import { remoteStoreWrapper } from "../utils";

const BackgroundStoreContext: any = React.createContext(null);

export const useBackgroundStore: <A extends Action = AnyAction>() => Store<
  BackgroundRootState,
  A
> = createStoreHook(BackgroundStoreContext);

export const useBackgroundSelector: <TSelected>(
  selector: (state: BackgroundRootState) => TSelected,
  equalityFn?: (left: TSelected, right: TSelected) => boolean
) => TSelected = createSelectorHook(BackgroundStoreContext);

export const useBackgroundDispatch: <A extends Action = AnyAction>() => Dispatch<
  A
> = createDispatchHook(BackgroundStoreContext);

const App = () => {
  const [backgroundStore, setBackgroundStore] = useState<Store<any> | null>(
    null
  );
  const backgroundEndpoint = useBackgroundEndpoint();
  useEffect(() => {
    backgroundEndpoint
      .getStore()
      .then(remoteStoreWrapper)
      .then(setBackgroundStore);
  }, []);
  return (
    backgroundStore && (
      <Provider store={backgroundStore} context={BackgroundStoreContext}>
        <Provider store={store}>
          <Toolbar />
        </Provider>
      </Provider>
    )
  );
};

export default App;
