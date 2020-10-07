import React, { useEffect, useState } from "react";
import { useExternalDom } from "../hooks";
import { createPortal } from "react-dom";
import ReadyScreen, { ReadyScreenProps } from "../components/ReadyScreen";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles({
  resultsDiv: {
    "&&": {
      gridTemplateRows: "1fr",
      gridTemplateColumns: "1fr minmax(200px,auto)",
    },
    "& > *": {
      maxHeight: "100%",
      minHeight: 0,
    },
    "& > div:nth-child(1)": {
      gridColumn: "1 / 3",
    },
    "& > div:nth-child(2)": {
      display: "none",
    },
    "& > div:nth-child(3)": {
      gridColumn: "2",
      gridRow: "1",
    },
  },
});

const ResultsShim: React.FunctionComponent<ReadyScreenProps> = (props) => {
  const resultsDiv = useExternalDom(document, "div.result", true);
  const [score, setScore] = useState<HTMLElement | null>(null);
  const classes = useStyles();
  useEffect(() => {
    resultsDiv?.classList.add(classes.resultsDiv);
    if (resultsDiv) {
      const scoreDiv = resultsDiv
        .querySelector("section.stack")
        ?.cloneNode(true) as HTMLElement;
      if (scoreDiv) {
        scoreDiv.lastChild && scoreDiv.removeChild(scoreDiv.lastChild);
        scoreDiv.lastChild && scoreDiv.removeChild(scoreDiv.lastChild);
        setScore(scoreDiv);
      }
    }
  }, [resultsDiv, classes]);
  return (
    resultsDiv &&
    createPortal(
      <ReadyScreen {...props} score={score || undefined} />,
      resultsDiv
    )
  );
};

export default ResultsShim;
