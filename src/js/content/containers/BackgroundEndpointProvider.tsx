import React, { useState, useEffect, useContext } from "react";
import { BackgroundEndpoint } from "../../background/background";
import { cacheRemoteProperties, CachedRemote } from "../../utils";
import { createEndpoint } from "comlink-extension";
import { browser } from "webextension-polyfill-ts";
import { wrap } from "comlink";

export type RemoteBackgroundEndpoint = CachedRemote<
  BackgroundEndpoint,
  "tabId"
>;

const BackgroundEndpointContext = React.createContext<RemoteBackgroundEndpoint | null>(
  null
);

export const useBackgroundEndpoint = () =>
  useContext(BackgroundEndpointContext)!;

const BackgroundEndpointProvider: React.FunctionComponent = ({ children }) => {
  const [backgroundEndpoint, setBackgroundEndpoint] = useState<CachedRemote<
    BackgroundEndpoint,
    "tabId"
  > | null>(null);

  useEffect(() => {
    const endpoint = cacheRemoteProperties(
      wrap<BackgroundEndpoint>(createEndpoint(browser.runtime.connect()))
    );
    endpoint.waitForCache("tabId").then(() => setBackgroundEndpoint(endpoint));
  }, []);

  return (
    <BackgroundEndpointContext.Provider value={backgroundEndpoint}>
      {children}
    </BackgroundEndpointContext.Provider>
  );
};

export default BackgroundEndpointProvider;
