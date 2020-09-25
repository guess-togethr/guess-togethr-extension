import * as Comlink from "comlink";
import { MapProxyManager } from "./mapProxy";

declare global {
  interface Window {
    google: any;
    map: any;
    pano: any;
    ggIntercept: typeof ggIntercept;
  }
}

let proxyManager: MapProxyManager | null = null;

function constructIntercept(target: any, prop: string) {
  return new Proxy(target[prop], {
    construct: (target, args) => {
      const ret = new target(...args);
      const channel = new MessageChannel();
      Comlink.expose(ret, channel.port1);
      proxyManager?.notify(prop, channel.port2);
      return ret;
    },
  });
}

function ggIntercept() {
  console.log("intercepted");
  window.google.maps = new Proxy(window.google.maps, {
    get: (target, prop) => {
      switch (prop) {
        case "Map":
        case "StreetViewPanorama":
          return constructIntercept(target, prop);
      }
      return target[prop];
    },
  });
}

if (chrome.runtime.getURL !== undefined) {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("interceptor.bundle.js");
  script.onload = () => script.remove();
  script.async = false;
  (document.head || document.documentElement).appendChild(script);
} else {
  proxyManager = new MapProxyManager();
  window.ggIntercept = ggIntercept;
}
