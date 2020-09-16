import React, { MutableRefObject, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useExternalDom } from "../hooks";

const ToolbarMonitor: React.FunctionComponent = ({ children }) => {
  const newDiv = (useRef(null) as unknown) as MutableRefObject<HTMLDivElement>;
  if (!newDiv.current) {
    newDiv.current = document.createElement("div");
    newDiv.current.classList.add("header__item");
  }
  const mo = useRef<MutationObserver>(
    new MutationObserver((changes) => {
      debugger;
      if (
        !changes
          .map(({ addedNodes, removedNodes }) =>
            Array.from(addedNodes).concat(...removedNodes)
          )
          .flat()
          .some((e) => e !== newDiv.current)
      ) {
        return;
      }
      newDiv.current?.parentElement?.removeChild(newDiv.current);
      toolbar?.prepend(newDiv.current);
    })
  );
  const toolbar = useExternalDom(
    document,
    "header.header > div.header__right > div:only-child",
    true
  );
  useEffect(() => {
    if (toolbar) {
      toolbar.prepend(newDiv.current);
      const savedMo = mo.current;
      savedMo.observe(toolbar, { childList: true });
      return () => savedMo.disconnect();
    }
  }, [toolbar, newDiv]);
  useEffect(() => {}, []);

  return createPortal(children, newDiv.current);
};

export default ToolbarMonitor;
