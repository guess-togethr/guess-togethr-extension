import { createContext, useRef, useLayoutEffect, useState } from "react";
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
import { useBackgroundEndpoint } from "./containers/BackgroundEndpointProvider";

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
  const backgroundEndpoint = useBackgroundEndpoint();
  return useBackgroundSelector((state) =>
    backgroundEndpoint && savedLobbySelector
      .selectAll(state)
      .find((lobby) => lobby.tabId === backgroundEndpoint.tabId)
  );
};

export const useDimensions = () => {
  const ref = useRef<Element>();
  const [dimensions, setDimensions] = useState<{width: number, height: number}>();
  useLayoutEffect(() => {
    setDimensions(ref.current ? (({width, height}) => ({width, height}))(ref.current.getBoundingClientRect()) : undefined)
  }, [ref.current])

  return [ref, dimensions]
}