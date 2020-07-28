import { createContext } from "react";
import { Action, AnyAction, Store } from "@reduxjs/toolkit";
import {
  BackgroundRootState,
  savedLobbySelector,
  BackgroundDispatch,
} from "../store/backgroundStore";
import {
  createStoreHook,
  createSelectorHook,
  createDispatchHook,
  TypedUseSelectorHook,
  useSelector,
  shallowEqual,
} from "react-redux";
import { RootState } from "../store";
import { wrap, Remote } from "comlink";
import { BackgroundEndpoint } from "../background/background";
import { createEndpoint } from "comlink-extension";
import { browser } from "webextension-polyfill-ts";

export type RemoteBackgroundEndpoint = Remote<BackgroundEndpoint> & {
  tabId: number;
};

const endpoint = wrap<BackgroundEndpoint>(
  createEndpoint(browser.runtime.connect())
) as RemoteBackgroundEndpoint;

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
