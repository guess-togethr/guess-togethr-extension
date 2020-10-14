import { wrap } from "comlink";
import { createEndpoint } from "comlink-extension";
import React, { createContext, useContext, useEffect, useState } from "react";
import { browser } from "webextension-polyfill-ts";
import BackgroundEndpoint from "../../background/backgroundEndpoint";
import {
  cacheRemoteProperties,
  remoteStoreWrapper,
  Unpromisify,
} from "../../utils";
import { debugStruct } from "../../debug";
import { createLogger } from "redux-logger";

const logger = createLogger({
  logger: new Proxy(console, {
    get: (target: any, prop) => {
      if (prop === "group") {
        return (data: any) => target.group(...data);
      }
      return target[prop];
    },
  }),
  titleFormatter: (action, time) => {
    const headerCSS = [
      "color: gray; font-weight: lighter;",
      "color: inherit;",
      "color: gray; font-weight: lighter;",
    ];
    const parts = [
      "%c BACKGROUND action",
      `%c${String(action.type)}`,
      `%c@ ${time}`,
    ];

    return [parts.join(" "), ...headerCSS] as any;
  },
  level: {
    prevState: "log",
    action: "log",
    error: "log",
    nextState: false,
  },
});

function createBackgroundEndpoint() {
  return cacheRemoteProperties(
    wrap<BackgroundEndpoint>(createEndpoint(browser.runtime.connect())),
    "tabId",
    async (be) => [
      "store" as const,
      await remoteStoreWrapper(await be.getStore(), logger),
    ]
  );
}

export type RemoteBackgroundEndpoint = Unpromisify<
  ReturnType<typeof createBackgroundEndpoint>
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
    createBackgroundEndpoint().then((be) => {
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
