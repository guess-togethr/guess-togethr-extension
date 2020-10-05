import { wrap } from "comlink";
import { createEndpoint } from "comlink-extension";
import React, { createContext, useContext, useEffect, useState } from "react";
import { browser } from "webextension-polyfill-ts";
import BackgroundEndpoint from "../../background/backgroundEndpoint";
import { CachedRemote, cacheRemoteProperties } from "../../utils";
import { debugStruct } from "../debug";

export type RemoteBackgroundEndpoint = CachedRemote<
  BackgroundEndpoint,
  "tabId" | "timeDelta"
>;

const BackgroundEndpointContext = createContext<RemoteBackgroundEndpoint | null>(
  null
);

export const useBackgroundEndpoint = () =>
  useContext(BackgroundEndpointContext);

const BackgroundEndpointProvider: React.FunctionComponent = ({ children }) => {
  const [
    backgroundEndpoint,
    setBackgroundEndpoint,
  ] = useState<RemoteBackgroundEndpoint | null>(null);

  useEffect(() => {
    cacheRemoteProperties(
      wrap<BackgroundEndpoint>(createEndpoint(browser.runtime.connect())),
      "tabId",
      "timeDelta"
    ).then((be) => {
      debugStruct.be = be;
      // Important to wrap in a function. Otherwise, React tries to call
      // the background endpoint as a function
      setBackgroundEndpoint(() => be);
    });
  }, []);

  return (
    <BackgroundEndpointContext.Provider value={backgroundEndpoint}>
      {children}
    </BackgroundEndpointContext.Provider>
  );
};

export default BackgroundEndpointProvider;
