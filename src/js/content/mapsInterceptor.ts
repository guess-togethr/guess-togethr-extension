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
  class StreetViewPanoramaWrapper extends (target[
    "StreetViewPanorama"
  ] as typeof google.maps.StreetViewPanorama) {
    public addListener(event: any, listener: any) {
      const iw = new google.maps.InfoWindow({
        position: this.getPosition(),
        content: "YOOOOOOO",
        // pixelOffset: new google.maps.Size(200, 200),
      });
      // iw.open(this, Object.assign(new google.maps.MVCObject(), {position: this.getPosition(), }));
      iw.open(this);
      return Comlink.proxy(
        super.addListener(event, (e: any) => {
          listener(Comlink.proxy(super.getPosition()));
        })
      );
    }
  }
  return new Proxy(target[prop], {
    construct: (target, args) => {
      const ret = new (prop === "StreetViewPanorama"
        ? StreetViewPanoramaWrapper
        : target)(...args);
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

function waitForGmapScript() {
  const script = Array.from(document.getElementsByTagName("script")).find((e) =>
    e.src.includes("maps.googleapis.com")
  );
  if (script) {
    const newScript = document.createElement("script");
    newScript.src = script.src + "&callback=ggIntercept";
    newScript.onload = () => {
      script.dispatchEvent(
        new Event("load", { bubbles: false, cancelable: false })
      );
    };
    document.head.appendChild(newScript);
    return true;
  }
  return false;
}

if (chrome.runtime.getURL !== undefined) {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("interceptor.bundle.js");
  script.onload = () => script.remove();
  script.async = false;
  (document.head || document.documentElement).appendChild(script);
} else {
  if (!window.ggIntercept) {
    proxyManager = new MapProxyManager();
    window.ggIntercept = ggIntercept;
    if (!waitForGmapScript()) {
      const mo = new MutationObserver(() => {
        if (waitForGmapScript()) {
          mo.disconnect();
        }
      });
      mo.observe(document.head, { childList: true });
    }
  }
}
