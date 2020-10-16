import "../debug";
import React from "react";
import ReactDOM from "react-dom";
// Must be imported before any other components
import "@material-ui/core/ScopedCssBaseline";
import App from "./App";
import { enablePatches } from "immer";

enablePatches();

const root = document.createElement("div");
(document.body || document.children[0]).appendChild(root);
ReactDOM.render(<App />, root);
