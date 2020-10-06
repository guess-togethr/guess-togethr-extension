import "../debug";
import React from "react";
import ReactDOM from "react-dom";
// Must be imported before any other components
import "@material-ui/core/ScopedCssBaseline";
import App from "./App";
import { enablePatches } from "immer";
import { browser } from "webextension-polyfill-ts";

const script = document.createElement("script");
script.src = browser.runtime.getURL("interceptor.bundle.js");
(document.head || document.documentElement).appendChild(script);

enablePatches();

const root = document.createElement("div");
(document.body || document.children[0]).appendChild(root);
ReactDOM.render(<App />, root);
