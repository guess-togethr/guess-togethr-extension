import React from "react";
import ReactDOM from "react-dom";
// Must be imported before any other components
import "@material-ui/core/ScopedCssBaseline";
import Debug from "debug";
import App from "./App";
import { enablePatches } from "immer";

enablePatches();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const debug = Debug("content");

// function waitForDom() {
//   return new Promise<Element>((resolve, reject) => {
//     const toolbarParent = document.querySelector(
//       "header.header > div.header__right > div:only-child"
//     );
//     if (!toolbarParent) {
//       return reject(new Error("Toolbar parent not found!"));
//     }
//     let observer: MutationObserver | undefined;
//     const check = () => {
//       // TODO: Make this more robust
//       if (
//         toolbarParent.childElementCount === 6 ||
//         toolbarParent.childElementCount === 3
//       ) {
//         observer?.disconnect();
//         resolve(toolbarParent);
//         return true;
//       }
//       return false;
//     };
//     if (!check()) {
//       observer = new MutationObserver(check);
//       observer.observe(toolbarParent, {
//         childList: true,
//       });
//     } else {
//       resolve(toolbarParent);
//     }
//   });
// }

// waitForDom()
//   .then((parent) => {
//     const toolbarDiv = document.createElement("div");
//     toolbarDiv.className = "header__item";
//     parent.prepend(toolbarDiv);
//     ReactDOM.render(<App />, toolbarDiv);
//   })
//   .catch(console.error);
const root = document.createElement("div");
(document.body || document.children[0]).appendChild(root);
ReactDOM.render(<App />, root);
