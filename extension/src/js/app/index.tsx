import React from "react";
import { store } from "../store";
import {
  Provider,
  createStoreHook,
  createSelectorHook,
  createDispatchHook,
  useSelector,
} from "react-redux";
import Toolbar from "./Toolbar";
import { Store, Action, AnyAction, Dispatch } from "@reduxjs/toolkit";
import { BackgroundRootState } from "../store/backgroundStore";

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

interface Props {
  backgroundStore: Store;
}

const App = ({ backgroundStore }: Props) => (
  <Provider store={backgroundStore} context={BackgroundStoreContext}>
    <Provider store={store}>
      <Toolbar />
    </Provider>
  </Provider>
);

export default App;
