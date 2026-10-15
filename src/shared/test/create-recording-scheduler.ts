import type { Scheduler } from './msw/green-api';

interface ScheduledCall {
  callback: () => void;
  delayMs: number;
}

export const createRecordingScheduler = () => {
  const scheduled: ScheduledCall[] = [];
  const scheduler: Scheduler = (callback, delayMs) => {
    scheduled.push({ callback, delayMs });
  };
  const runAll = () => {
    for (const { callback } of scheduled.toSorted((first, second) => first.delayMs - second.delayMs)) {
      callback();
    }
  };

  return { scheduled, scheduler, runAll };
};
