import type { Scheduler } from './msw/green-api';

interface ScheduledCall {
  callback: () => void;
  delayMs: number;
}

/** A mock `Scheduler` that only records, so a test decides when (and whether) the scheduled effects run. */
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
