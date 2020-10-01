import React, { createContext, useContext, useState, useEffect } from "react";
import * as Comlink from "comlink";
import { MapProxyManager } from "../mapProxy";

const MapProxyContext = createContext<Comlink.Remote<google.maps.Map> | null>(
  null
);

export const useMapProxy = () => useContext(MapProxyContext);

const MapProxyProvider: React.FunctionComponent = ({ children }) => {
  const [proxy, setProxy] = useState<Comlink.Remote<google.maps.Map> | null>(
    null
  );
  useEffect(() => {
    (async function go() {
      for await (const p of new MapProxyManager()) {
        console.log(p);
        if (p.type === "Map") {
          setProxy((old) => {
            old?.[Comlink.releaseProxy]();
            return p.proxy as Comlink.Remote<google.maps.Map>;
          });
        } else if (p.type === "StreetViewPanorama") {
          (p.proxy as Comlink.Remote<
            google.maps.StreetViewPanorama
          >).addListener(
            "position_changed",
            Comlink.proxy((e) => {
              e.lat().then(console.log);
            })
          );
        }
      }
    })();
  }, []);
  return (
    <MapProxyContext.Provider value={proxy}>
      {children}
    </MapProxyContext.Provider>
  );
};

export default MapProxyProvider;
