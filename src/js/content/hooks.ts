import {
  createContext,
  useRef,
  useLayoutEffect,
  useState,
  useEffect,
} from "react";
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
  useDispatch,
} from "react-redux";
import { AppDispatch, RootState, selectUrl, setUrl, checkCurrentUser } from "./store";
import { useBackgroundEndpoint } from "./containers/BackgroundEndpointProvider";
import { proxy } from "comlink";

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
      savedLobbySelector
        .selectAll(state)
        .find((lobby) => lobby.tabId === backgroundEndpoint.tabId)
  );
};

export const useDimensions = () => {
  const ref = useRef<Element>();
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  }>();
  useLayoutEffect(() => {
    setDimensions(
      ref.current
        ? (({ width, height }) => ({ width, height }))(
            ref.current.getBoundingClientRect()
          )
        : undefined
    );
  }, []);

  return [ref, dimensions];
};

export const useUrlMonitor = () => {
  const backgroundEndpoint = useBackgroundEndpoint();
  const dispatch = useDispatch();
  useEffect(() => {
    backgroundEndpoint?.onUrlChange(proxy((url) => dispatch(setUrl(url))));
  }, [backgroundEndpoint, dispatch]);
};

export const useUserMonitor = () => {
  const url = useAppSelector(selectUrl);
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(checkCurrentUser());
  }, [url, dispatch]);
};

export const useExternalDom = (
  root: Element | Document | null,
  selector: string,
  oneShot: boolean = false
) => {
  const [foundNode, setFoundNode] = useState<Element | null>(
    () => root?.querySelector(selector) ?? null
  );
  useEffect(() => {
    if (root && (!oneShot || !foundNode)) {
      let mo: MutationObserver | null = new MutationObserver(() => {
        const node = root.querySelector(selector);
        if (node) {
          setFoundNode(node);
          if (oneShot) {
            mo?.disconnect();
            mo = null;
          }
        }
      });
      mo.observe(root, { subtree: true, attributes: true, childList: true });
      return () => mo?.disconnect();
    }
  }, [root, selector, oneShot, foundNode]);

  return foundNode;
};

export const useJoin = () => {
  const url = useAppSelector(selectUrl);
  const [joinId, setJoinId] = useState<string | null>(null);
  useEffect(() => {
    const parsedUrl = new URL(url);
    const id = parsedUrl.searchParams.get("join");
    if (parsedUrl.hostname === "www.geoguessr.com" && id) {
      setJoinId(id);
      parsedUrl.searchParams.delete("join");
      window.location.href = parsedUrl.href;
    }
  }, [url]);
  return joinId;
};
