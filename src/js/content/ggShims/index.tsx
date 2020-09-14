import React, { useMemo } from "react";
import { useAppSelector } from "../hooks";
import { selectUrl, selectUser } from "../store/geoguessrState";
import MapPlayShim from "./MapPlay";

const Shims = () => {
  const url = useAppSelector(selectUrl);
  const user = useAppSelector(selectUser);
  const isPro = user && user.isPro;

  const mapPlayShim = useMemo(() => {
    if (!isPro) {
      return null;
    }
    const urlObj = new URL(url);
    return urlObj.hostname === "www.geoguessr.com" &&
      /^\/maps\/[^/]+\/play$/.test(urlObj.pathname) ? (
      <MapPlayShim />
    ) : null;
  }, [url, isPro]);

  return <>{mapPlayShim}</>;
};

export default Shims;
