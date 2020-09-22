import { browser, Alarms } from "webextension-polyfill-ts";

// export type TimerHandle = Function & { handle: string };
export interface TimerHandle {
  (alarm: Alarms.Alarm): void;
  alarmName: string;
}

export function setTimer(cb: () => void, timeInMs: number): TimerHandle {
  const alarmName =
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);

  const listener: TimerHandle = Object.assign(
    ({ name }: Alarms.Alarm) => {
      if (name === alarmName) {
        browser.alarms.onAlarm.removeListener(listener);
        browser.alarms.clear(alarmName);
        cb();
      }
    },
    { alarmName }
  );

  browser.alarms.onAlarm.addListener(listener);
  browser.alarms.create(alarmName, { when: Date.now() + timeInMs });
  return listener;
}

export function clearTimer(handle: TimerHandle) {
  browser.alarms.clear(handle.alarmName);
  browser.alarms.onAlarm.removeListener(handle);
}
