import React from "react";
import { useAppSelector } from "./hooks";
import { selectUrl } from "./store/geoguessrState";
const GGSynchronizer = () => {
  const url = useAppSelector(selectUrl);
};

export default GGSynchronizer;
