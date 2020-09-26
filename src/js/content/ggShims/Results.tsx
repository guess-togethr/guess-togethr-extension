import React from "react";
import { useExternalDom } from "../hooks";
import { createPortal } from "react-dom";
import ReadyScreen, { ReadyScreenProps } from "../components/ReadyScreen";

const ResultsShim: React.FunctionComponent<ReadyScreenProps> = (props) => {
  const resultsDiv = useExternalDom(document, "div.result", true);
  return resultsDiv && createPortal(<ReadyScreen {...props} />, resultsDiv);
};

export default ResultsShim;
