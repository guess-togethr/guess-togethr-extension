import React from "react";
import { store } from "../store";
import { Provider } from "react-redux";
import { createPortal } from "react-dom";
import Toolbar from "./Toolbar";

const toolbarDiv = document.createElement("div");

const App = () => (
  <Provider store={store}>
    <Toolbar />
  </Provider>
);

export default App;
