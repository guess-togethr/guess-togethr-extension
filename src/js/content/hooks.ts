import { createContext } from "react";
import { Action, AnyAction, Store } from "@reduxjs/toolkit";
import {
  BackgroundRootState,
  savedLobbySelector,
  BackgroundDispatch,
} from "../background/store";
import {
  createStoreHook,
  createSelectorHook,
  createDispatchHook,
  TypedUseSelectorHook,
  useSelector,
  shallowEqual,
} from "react-redux";
import { RootState } from "./store";
import { wrap, Remote } from "comlink";
import { BackgroundEndpoint } from "../background/background";
import { createEndpoint } from "comlink-extension";
import { browser } from "webextension-polyfill-ts";
import { cacheRemoteProperties } from "../utils";

const endpoint = cacheRemoteProperties(
  wrap<BackgroundEndpoint>(createEndpoint(browser.runtime.connect()))
);

export type RemoteBackgroundEndpoint = typeof endpoint;

export const useBackgroundEndpoint = () => endpoint;

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

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const useClaimedLobby = () => {
  return useBackgroundSelector((state) =>
    savedLobbySelector
      .selectAll(state)
      .find((lobby) => lobby.tabId === endpoint.tabId)
  );
};
