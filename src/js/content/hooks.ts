import {
  useRef,
  useLayoutEffect,
  useState,
  useEffect,
  useCallback,
} from "react";
// eslint-disable-next-line import/no-webpack-loader-syntax
import { validateGeoguessrGame } from "!schema-loader!./ggApiSchema.ts";
import { GeoguessrGame } from "./ggApiSchema";
import { useBackgroundEndpoint } from "./containers/BackgroundEndpointProvider";

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

const defaultMoOptions = {
  subtree: true,
  attributes: false,
  childList: true,
};

export const useExternalDom = <T extends Element = Element>(
  root: Element | Document | null,
  selector: string,
  oneShot: boolean = false,
  moOptions: MutationObserverInit = defaultMoOptions
) => {
  const [foundNode, setFoundNode] = useState<T | null>(
    () => root?.querySelector(selector) ?? null
  );
  const skipMo = oneShot && foundNode !== null;
  useEffect(() => {
    if (root && !skipMo) {
      let mo: MutationObserver | null = new MutationObserver(() => {
        const node = root.querySelector<T>(selector);
        setFoundNode(node);
        if (oneShot && node) {
          mo?.disconnect();
          mo = null;
        }
      });
      mo.observe(root, moOptions);
      return () => mo?.disconnect();
    }
  }, [root, selector, oneShot, skipMo, moOptions]);

  return foundNode;
};

async function getGame(challengeId: string) {
  let response = await fetch(`/api/v3/challenges/${challengeId}/game`);
  if (response.status === 404) {
    response = await fetch(`/api/v3/challenges/${challengeId}`, {
      method: "POST",
    });
  }

  if (!response.ok) {
    throw new Error((await response.json()).message);
  }

  const isValid = validateGeoguessrGame(await response.json());
  if (!isValid) {
    throw new Error("GG sent invalid game");
  }

  return (await response.json()) as GeoguessrGame;
}

export const useGgGame = (challengeId: string | null) => {
  const [game, setGame] = useState<GeoguessrGame | null>(null);

  useEffect(() => {
    if (!challengeId || game) {
      return;
    }
    getGame(challengeId).then(setGame).catch(console.error);
  }, [game, challengeId]);

  return game;
};

export function useAdjustedTime() {
  const be = useBackgroundEndpoint();
  return useCallback(() => Date.now() - (be?.timeDelta ?? 0), [be]);
}
