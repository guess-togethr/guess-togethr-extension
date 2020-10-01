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

enum Selectors {
  RadioBoxes = "div.radio-boxes",
  ChallengeIdCopyBox = 'input[name="copy-link"]',
  Slider = "div.rangeslider.rangeslider-horizontal[aria-valuenow]",
  GameSettings = "article.game-settings",
  GameButton = "div.game-settings__section > button",
  RadioBoxLabel = "div.radio-box__label",
  SelectedRadioBox = "div.radio-box.radio-box--selected",
  SettingsCheckbox = 'input[type="checkbox"]',
  TimeLimitText = "div.game-settings__detailed-settings > div:first-child",
}

const useStyles = makeStyles({
  hideOriginal: {
    [`& > div.game-settings__section > button:first-child, 
    & > div.game-settings__section > div > div.game-settings__checkbox > :first-child,
    & div.game-settings__detailed-settings > div:first-child`]: {
      display: "none !important",
    },
  },
  hideNew: {
    [`& > div.game-settings__section > button:last-child, 
    & div.game-settings__section:nth-child(2) > :nth-child(2),
    & div.game-settings__detailed-settings > div:nth-child(2)`]: {
      display: "none !important",
    },
  },
  hideAllSettings: {
    "& > div.game-settings__section": {
      display: "none !important",
    },
  },
  redLabel: {
    color: "red",
  },
});

const useSliderMonitor = (gameSettings: Element | null) => {
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const slider = useExternalDom<HTMLDivElement>(gameSettings, Selectors.Slider);
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
  const input = useExternalDom<HTMLInputElement>(
    gameSettings,
    Selectors.ChallengeIdCopyBox
  );
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
  const gameSettings = useExternalDom<HTMLDivElement>(
    document,
    Selectors.GameSettings,
    true
  );
  const timeLimit = useSliderMonitor(gameSettings);
  const [startLobby, setStartLobby] = useState(false);
  const selected = useRef(false);
  const challengeId = useChallengeIdMonitor(startLobby ? gameSettings : null);
  const newButton = useRef<HTMLButtonElement | null>(null);
  const timeLimitText = useExternalDom<HTMLDivElement>(
    gameSettings,
    Selectors.TimeLimitText
  );

  useEffect(() => {
    const radioBoxes = gameSettings?.querySelector(Selectors.RadioBoxes);
    if (gameSettings && radioBoxes) {
      const challengeBox = radioBoxes.children[1];

      const newBox = challengeBox.cloneNode(true) as HTMLDivElement;
      unselect(newBox);
      newBox.querySelector<HTMLDivElement>(Selectors.RadioBoxLabel)!.innerText =
        "Play With Lobby";

      let oldButton = document.querySelector<HTMLButtonElement>(
        Selectors.GameButton
      )!;
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

      let performSelection: (() => void) | null = null;

      // class attribute modification happens asynchronously
      const mo = new MutationObserver((changes) => {
        const oldButton = gameSettings.querySelector(Selectors.GameButton);
        if (
          changes.some(({ addedNodes }) =>
            Array.from(addedNodes).some((n) => n.contains(oldButton))
          )
        ) {
          if (performSelection) {
            performSelection();
            performSelection = null;
          }
          oldButton?.insertAdjacentElement("afterend", newButton.current!);
        }
      });
      mo.observe(gameSettings, { childList: true, subtree: true });
      for (const i of radioBoxes.children) {
        // eslint-disable-next-line no-loop-func
        i.addEventListener("click", () => {
          if (selected.current) {
            selected.current = false;
            if (i === challengeBox) {
              unselect(newBox);
              select(challengeBox);
              gameSettings.classList.remove(classes.hideOriginal);
              gameSettings.classList.add(classes.hideNew);
              gameSettings
                .querySelector(Selectors.SettingsCheckbox + ":not(:checked)")
                ?.dispatchEvent(new Event("change", { bubbles: true }));
            } else {
              performSelection = () => {
                unselect(newBox);
                select(i);
                gameSettings.classList.remove(classes.hideOriginal);
                gameSettings.classList.add(classes.hideNew);
              };
            }
          }
        });
      }
      newBox.addEventListener("click", (e) => {
        e.preventDefault();
        if (!selected.current) {
          selected.current = true;
          challengeBox.children[0].children[0].dispatchEvent(
            new Event("change", { bubbles: true, cancelable: true })
          );
          const currentSelection = gameSettings.querySelector<HTMLDivElement>(
            Selectors.SelectedRadioBox
          )!;
          if (currentSelection === challengeBox) {
            unselect(challengeBox);
            select(newBox);
            gameSettings.classList.add(classes.hideOriginal);
            gameSettings.classList.remove(classes.hideNew);
            gameSettings
              .querySelector(Selectors.SettingsCheckbox + ":checked")
              ?.dispatchEvent(new Event("change", { bubbles: true }));
          } else {
            performSelection = () => {
              unselect(currentSelection);
              unselect(challengeBox);
              select(newBox);
              gameSettings.classList.add(classes.hideOriginal);
              gameSettings.classList.remove(classes.hideNew);
              gameSettings
                .querySelector(Selectors.SettingsCheckbox + ":checked")
                ?.dispatchEvent(new Event("change", { bubbles: true }));
            };
          }
        }
      });

      radioBoxes.appendChild(newBox);

      return () => {
        mo.disconnect();
        newButton.current?.remove();
        newBox.remove();
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

  const [
    newLabelContainer,
    setNewLabelContainer,
  ] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (timeLimitText) {
      const newLabel = timeLimitText.cloneNode() as HTMLDivElement;
      timeLimitText.insertAdjacentElement("afterend", newLabel);
      setNewLabelContainer(newLabel);
      return () => {
        setNewLabelContainer(null);
      };
    }
  }, [timeLimitText]);

  const newLabelText = useMemo(() => {
    const invalidTimeLimit =
      timeLimit === null || timeLimit === 0 || timeLimit === 610;
    if (newLabelContainer) {
      if (invalidTimeLimit) {
        newLabelContainer.classList.add(classes.redLabel);
      } else {
        newLabelContainer.classList.remove(classes.redLabel);
      }
    }
    return invalidTimeLimit || !timeLimitText?.innerText
      ? "Please set a time limit"
      : timeLimitText.innerText;
  }, [classes, timeLimit, timeLimitText, newLabelContainer]);

  return !challengeId && gameSettings && newLabelContainer
    ? createPortal(newLabelText, newLabelContainer)
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
