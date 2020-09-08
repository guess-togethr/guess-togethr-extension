import React, { useState, useEffect, useContext, createContext } from "react";
import { BackgroundEndpoint } from "../../background/background";
import { cacheRemoteProperties, CachedRemote } from "../../utils";
import { createEndpoint } from "comlink-extension";
import { browser } from "webextension-polyfill-ts";
import { wrap } from "comlink";

export type RemoteBackgroundEndpoint = CachedRemote<
  BackgroundEndpoint,
  "tabId"
>;

const BackgroundEndpointContext = createContext<RemoteBackgroundEndpoint | null>(
  null
);

export const useBackgroundEndpoint = () =>
  useContext(BackgroundEndpointContext);

const BackgroundEndpointProvider: React.FunctionComponent = ({ children }) => {
  const [backgroundEndpoint, setBackgroundEndpoint] = useState<CachedRemote<
    BackgroundEndpoint,
    "tabId"
  > | null>(null);

  useEffect(() => {
    cacheRemoteProperties(
      wrap<BackgroundEndpoint>(createEndpoint(browser.runtime.connect())),
      "tabId"
    ).then((be) => {
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
