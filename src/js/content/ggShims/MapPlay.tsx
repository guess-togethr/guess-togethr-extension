import { makeStyles } from "@material-ui/core";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAppDispatch, useAppSelector } from "../storeHooks";
import { setNewChallenge, selectUser, selectUrl } from "../store";
import { useExternalDom } from "../hooks";

function unselect(el: Element) {
  el.classList.remove("radio-box--selected");
}

function select(el: Element) {
  el.classList.add("radio-box--selected");
}

const useStyles = makeStyles({
  hideOriginal: {
    "& div.game-settings > button:first-of-type, & div.game-settings__section > :nth-child(3)": {
      display: "none !important",
    },
  },
  hideNew: {
    "& div.game-settings > button:last-of-type, & div.game-settings__section > :nth-child(4)": {
      display: "none !important",
    },
  },
  hideAllSettings: {
    "& > div.game-settings": {
      display: "none !important",
    },
  },
  redLabel: {
    color: "red",
  },
});

const useSliderMonitor = (gameSettings: Element | null) => {
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const slider = useExternalDom(
    gameSettings,
    "div.rangeslider.rangeslider-horizontal[aria-valuenow]"
  );
  const sliderMo = useRef<MutationObserver>(
    new MutationObserver((changes) =>
      changes.forEach(({ target }) => {
        setTimeLimit(
          parseInt((target as HTMLDivElement).getAttribute("aria-valuenow")!) ??
            null
        );
      })
    )
  );

  useEffect(() => {
    if (slider) {
      setTimeLimit(parseInt(slider.getAttribute("aria-valuenow")!) ?? null);
      const mo = sliderMo.current;
      mo.observe(slider, {
        attributes: true,
        attributeFilter: ["aria-valuenow"],
      });
      return () => mo.disconnect();
    }
  }, [slider]);

  return timeLimit;
};

const useChallengeIdMonitor = (gameSettings: HTMLDivElement | null) => {
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const input = useExternalDom(
    gameSettings,
    "input[name=copy-link]"
  ) as HTMLInputElement | null;
  useEffect(() => {
    if (input) {
      const value = input.value;
      if (value) {
        const challengeUrl = new URL(value);
        const match = /\/challenge\/(\w+)$/.exec(challengeUrl.pathname);
        if (challengeUrl.hostname === "www.geoguessr.com" && match) {
          setChallengeId(match[1]);
        }
      }
    }
  }, [input]);

  return challengeId;
};

const MapPlayShimComponent = () => {
  const dispatch = useAppDispatch();
  const classes = useStyles();
  const gameSettings = useExternalDom(
    document,
    "article.game-settings",
    true
  ) as HTMLDivElement | null;
  const timeLimit = useSliderMonitor(gameSettings);
  const [startLobby, setStartLobby] = useState(false);
  const selected = useRef(false);
  const challengeId = useChallengeIdMonitor(startLobby ? gameSettings : null);
  const newButton = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const radioBoxes = gameSettings?.querySelector("div.radio-boxes");
    if (gameSettings && radioBoxes) {
      const challengeBox = radioBoxes.children[1];

      const newBox = challengeBox.cloneNode(true) as HTMLDivElement;
      unselect(newBox);
      (newBox.querySelector(
        "div.radio-box__label"
      ) as HTMLDivElement).innerText = "Play With Lobby";

      let oldButton = document.querySelector(
        "div.game-settings > button"
      )! as HTMLButtonElement;
      newButton.current = oldButton.cloneNode(true) as HTMLButtonElement;
      newButton.current.addEventListener("click", () => {
        if (newButton.current?.classList.contains("button--disabled")) {
          return;
        }
        setStartLobby(selected.current);
        newButton.current?.previousElementSibling?.dispatchEvent(
          new Event("click", { bubbles: true, cancelable: true })
        );
      });
      newButton.current.innerText = "Start in lobby";
      oldButton.insertAdjacentElement("afterend", newButton.current);

      gameSettings.classList.add(classes.hideNew);

      // class attribute modification happens asynchronously
      const mo = new MutationObserver((changes) =>
        changes.forEach(({ target }) => {
          if (
            target instanceof Element &&
            target.className.includes("radio-box--selected") &&
            selected.current
          ) {
            unselect(target);
          }
        })
      );
      for (const i of radioBoxes.children) {
        mo.observe(i, { attributes: true, attributeFilter: ["class"] });
        // eslint-disable-next-line no-loop-func
        i.addEventListener("click", ({ target }) => {
          if (selected.current) {
            unselect(newBox);
            select(i);
            selected.current = false;
            gameSettings.classList.remove(classes.hideOriginal);
            gameSettings.classList.add(classes.hideNew);
          }
        });
      }
      newBox.addEventListener("click", () => {
        selected.current = true;
        challengeBox.children[0].children[0].dispatchEvent(
          new Event("change", { bubbles: true, cancelable: true })
        );
        unselect(challengeBox);
        select(newBox);
        gameSettings.classList.add(classes.hideOriginal);
        gameSettings.classList.remove(classes.hideNew);
      });

      radioBoxes.appendChild(newBox);

      return () => {
        mo.disconnect();
        newButton.current?.parentNode?.removeChild(newButton.current);
        newBox.parentNode?.removeChild(newBox);
        gameSettings.classList.remove(
          classes.hideOriginal,
          classes.hideNew,
          classes.hideAllSettings
        );
        selected.current && select(challengeBox);
      };
    }
  }, [gameSettings, classes]);

  useEffect(() => {
    if (challengeId && timeLimit !== null) {
      dispatch(setNewChallenge({ id: challengeId, timeLimit }));
    }
  }, [challengeId, dispatch, timeLimit]);

  useEffect(() => {
    if (!timeLimit || timeLimit === 610) {
      newButton.current?.classList.add("button--disabled");
    } else {
      newButton.current?.classList.remove("button--disabled");
    }
  }, [timeLimit]);

  useEffect(() => {
    if (gameSettings && startLobby) {
      gameSettings.classList.add(classes.hideAllSettings);
    }
  }, [gameSettings, startLobby, classes]);

  const newLabel = useMemo(() => {
    const invalidTimeLimit =
      timeLimit === null || timeLimit === 0 || timeLimit === 610;
    return (
      gameSettings && (
        <div
          className={`margin--top-small ${
            invalidTimeLimit ? classes.redLabel : ""
          }`}
        >
          {invalidTimeLimit
            ? "Please set a time limit"
            : (gameSettings.querySelector(
                "div.game-settings__section > :nth-child(3)"
              ) as HTMLElement).innerText}
        </div>
      )
    );
  }, [gameSettings, classes, timeLimit]);

  return !challengeId && gameSettings
    ? createPortal(
        newLabel,
        gameSettings.querySelector("div.game-settings__section")!
      )
    : null;
};

const MapPlayShim = () => {
  const url = useAppSelector(selectUrl);
  const user = useAppSelector(selectUser);
  const isPro = user && user.isPro;

  return useMemo(() => {
    if (!isPro) {
      return null;
    }
    const urlObj = new URL(url);
    return urlObj.hostname === "www.geoguessr.com" &&
      /^\/maps\/[^/]+\/play$/.test(urlObj.pathname) ? (
      <MapPlayShimComponent />
    ) : null;
  }, [url, isPro]);
};

export default MapPlayShim;
