import { createContext, useEffect } from "react";
import { Action, AnyAction, Store } from "@reduxjs/toolkit";
import type {
  BackgroundRootState,
  BackgroundDispatch,
} from "../background/store";
import {
  createStoreHook,
  createSelectorHook,
  shallowEqual,
  createDispatchHook,
  useDispatch,
  TypedUseSelectorHook,
  useSelector,
} from "react-redux";
import {
  AppDispatch,
  RootState,
  checkCurrentUser,
  selectUrl,
  setUrl,
} from "./store";
import { useBackgroundEndpoint } from "./containers/BackgroundEndpointProvider";
import { proxy } from "comlink";
import { setTimeDelta } from "./store/geoguessrState";
import { savedLobbySelectors } from "../background/store/savedLobbies";

export const BackgroundStoreContext: any = createContext(null);

export const useBackgroundStore: <A extends Action = AnyAction>() => Store<
  BackgroundRootState,
  A
> = createStoreHook(BackgroundStoreContext);

const backgroundSelector = createSelectorHook(BackgroundStoreContext);

export const useBackgroundSelector: <TSelected>(
  selector: (state: BackgroundRootState) => TSelected
) => TSelected = (selector) => backgroundSelector(selector, shallowEqual);

export const useBackgroundDispatch: () => BackgroundDispatch = createDispatchHook(
  BackgroundStoreContext
);

export const useAppDispatch: () => AppDispatch = useDispatch;

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const useClaimedLobby = () => {
  const backgroundEndpoint = useBackgroundEndpoint();
  return useBackgroundSelector(
    (state) =>
      backgroundEndpoint &&
      savedLobbySelectors
        .selectAll(state)
        .find((lobby) => lobby.tabId === backgroundEndpoint.tabId)
  );
};

export const useUserMonitor = () => {
  const url = useAppSelector(selectUrl);
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(checkCurrentUser());
  }, [url, dispatch]);
};

export const useUrlMonitor = () => {
  const backgroundEndpoint = useBackgroundEndpoint();
  const dispatch = useAppDispatch();
  useEffect(() => {
    backgroundEndpoint?.onUrlChange(proxy((url) => dispatch(setUrl(url))));
  }, [backgroundEndpoint, dispatch]);
};

export const useTimeDelta = () => {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(setTimeDelta());
  }, [dispatch]);
};
