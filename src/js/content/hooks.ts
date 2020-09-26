import { useRef, useLayoutEffect, useState, useEffect } from "react";

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
        setFoundNode(node);
        if (oneShot && node) {
          mo?.disconnect();
          mo = null;
        }
      });
      mo.observe(root, { subtree: true, attributes: true, childList: true });
      return () => mo?.disconnect();
    }
  }, [root, selector, oneShot, foundNode]);

  return foundNode;
};

// export const useJoin = () => {
//   const url = useAppSelector(selectUrl);
//   const [joinId, setJoinId] = useState<string | null>(null);
//   useEffect(() => {
//     const parsedUrl = new URL(url);
//     const id = parsedUrl.searchParams.get("join");
//     if (parsedUrl.hostname === "www.geoguessr.com" && id) {
//       setJoinId(id);
//       parsedUrl.searchParams.delete("join");
//       window.location.href = parsedUrl.href;
//     }
//   }, [url]);
//   return joinId;
// };
