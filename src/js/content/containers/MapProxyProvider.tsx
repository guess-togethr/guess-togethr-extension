import React, { createContext, useContext, useState, useEffect } from "react";
import { Remote, releaseProxy } from "comlink";
import { MapProxyManager } from "../mapProxy";

const MapProxyContext = createContext<Remote<google.maps.Map> | null>(null);

export const useMapProxy = () => useContext(MapProxyContext);

const MapProxyProvider: React.FunctionComponent = ({ children }) => {
  const [proxy, setProxy] = useState<Remote<google.maps.Map> | null>(null);
  useEffect(() => {
    (async function go() {
      for await (const p of new MapProxyManager()) {
        console.log(p);
        if (p.type === "Map") {
          setProxy((old) => {
            old?.[releaseProxy]();
            return p.proxy as Remote<google.maps.Map>;
          });
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
