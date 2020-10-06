import Debug from "debug";

const repeat = (str: string, times: number) => new Array(times + 1).join(str);
const pad = (num: number, maxLength: number) =>
  repeat("0", maxLength - num.toString().length) + num;
const formatTime = (time: Date) =>
  `${pad(time.getHours(), 2)}:${pad(time.getMinutes(), 2)}:${pad(
    time.getSeconds(),
    2
  )}.${pad(time.getMilliseconds(), 3)}`;

type ExportLogFunc = (args: string[]) => void;

const backlog: string[][] = [];
let exportLogFunc: ExportLogFunc | null = null;

// We overwrite some debug functions here to always log all messages to an
// array for further analysis. However, we keep the overwritten functions
// around so the original functionality of enabling via localStorage still works

const originalLog = Debug.log;
const originalEnabled = Debug.enabled;
Debug.enabled = () => true;
Debug.log = function (...args) {
  const ccount = (args[0] as string).match(/%c/g)?.length ?? 0;
  const newArgs = [
    formatTime(new Date()),
    args[0].replace(/%c/g, ""),
    ...args.slice(ccount + 1),
  ].map((v) => (typeof v === "string" ? v : JSON.stringify(v)));
  if (exportLogFunc) {
    exportLogFunc(newArgs);
  } else {
    backlog.push(newArgs);
  }

  originalEnabled((this as any).namespace) && originalLog(...args);
};

export function exportLog(func: ExportLogFunc) {
  exportLogFunc = func;
  if (backlog.length) {
    backlog.forEach(func);
    backlog.length = 0;
  }
}

const debug = Debug("guess-togethr");
const gtDebug = (namespace: string) => {
  const newDebug = debug.extend(namespace);
  return Object.assign(newDebug, { wasEnabled: originalEnabled(namespace) });
};

declare global {
  interface Window {
    gtDebug: typeof debugStruct;
  }
}

export const debugStruct: { [K: string]: any } = { backlog };

if (process.env.NODE_ENV === "development") {
  window.gtDebug = debugStruct;
}

export default gtDebug;
