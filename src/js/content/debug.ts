import Debug from "debug";
const debug = Debug("content");
export default debug;

declare global {
  interface Window {
    gtDebug: typeof debugStruct;
  }
}

export const debugStruct: { [K: string]: any } = {};

if (process.env.NODE_ENV === "development") {
  window.gtDebug = debugStruct;
}
