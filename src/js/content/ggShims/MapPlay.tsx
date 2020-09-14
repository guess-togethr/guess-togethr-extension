import { makeStyles } from "@material-ui/core";
import { useEffect } from "react";
import { useAppSelector } from "../hooks";
import { selectUrl } from "../store/geoguessrState";

function unselect(el: Element) {
  el.classList.remove("radio-box--selected");
}

function select(el: Element) {
  el.classList.add("radio-box--selected");
}

const useStyles = makeStyles({
  hidden: {
    display: "none !important",
  },
});

const MapPlayShim = () => {
  const url = useAppSelector(selectUrl);
  const classes = useStyles();

  useEffect(() => {
    const urlObj = new URL(url);
    if (
      urlObj.hostname === "www.geoguessr.com" &&
      /^\/maps\/[^/]+\/play$/.test(urlObj.pathname)
    ) {
      let selected = false;
      const radioBoxes = document.querySelector("div.radio-boxes")!;
      const challengeBox = radioBoxes.children[1];
      const newBox = challengeBox.cloneNode(true) as HTMLDivElement;
      const oldButton = document.querySelector(
        "div.game-settings > button"
      )! as HTMLButtonElement;
      const newButton = oldButton.cloneNode(true) as HTMLButtonElement;
      newButton.classList.add(classes.hidden);
      newButton.addEventListener("click", () => {
        newButton.previousElementSibling?.dispatchEvent(
          new Event("click", { bubbles: true, cancelable: true })
        );
      });
      oldButton.insertAdjacentElement("afterend", newButton);

      const mo = new MutationObserver((changes) =>
        changes.forEach(({ type, target, attributeName }) => {
          if (
            target instanceof Element &&
            target.className.includes("radio-box--selected") &&
            selected
          ) {
            unselect(target);
          }
        })
      );
      for (const i of radioBoxes.children) {
        mo.observe(i, { attributes: true, attributeFilter: ["class"] });
        // eslint-disable-next-line no-loop-func
        i.addEventListener("click", ({ target }) => {
          if (selected) {
            unselect(newBox);
            select(i);
            newButton.classList.add(classes.hidden);
            oldButton.classList.remove(classes.hidden);
          }
        });
      }
      (newBox.querySelector(
        "div.radio-box__label"
      ) as HTMLDivElement).innerText = "Play With Lobby";
      newBox.querySelector("input")!.addEventListener("change", () => {
        selected = true;
        challengeBox.children[0].children[0].dispatchEvent(
          new Event("change", { bubbles: true, cancelable: true })
        );
        unselect(challengeBox);
        select(newBox);
        newButton.classList.remove(classes.hidden);
        oldButton.classList.add(classes.hidden);
      });

      radioBoxes.appendChild(newBox);

      return () => mo.disconnect();
    }
  }, [url, classes]);

  return null;
};

export default MapPlayShim;
