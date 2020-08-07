import React from "react";
import ReactDOM from "react-dom";
import Debug from "debug";
import App from "./App";
import { enablePatches } from "immer";

enablePatches();

const debug = Debug("content");
const link = document.createElement("link");
link.rel = "stylesheet";
link.href =
  "https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap";
document.head.appendChild(link);

function waitForDom() {
  return new Promise<Element>((resolve, reject) => {
    const toolbarParent = document.querySelector(
      "header.header > div.header__right > div:only-child"
    );
    if (!toolbarParent) {
      return reject(new Error("Toolbar parent not found!"));
    }
    let observer: MutationObserver | undefined;
    const check = () => {
      // TODO: Make this more robust
      if (
        toolbarParent.childElementCount === 6 ||
        toolbarParent.childElementCount === 3
      ) {
        observer?.disconnect();
        resolve(toolbarParent);
        return true;
      }
      return false;
    };
    if (!check()) {
      observer = new MutationObserver(check);
      observer.observe(toolbarParent, {
        childList: true,
      });
    }
  });
}

waitForDom()
  .then((parent) => {
    const toolbarDiv = document.createElement("div");
    toolbarDiv.className = "header__item";
    parent.prepend(toolbarDiv);
    ReactDOM.render(<App />, toolbarDiv);
  })
  .catch(console.error);
