/** Follows a promise without awaiting it, so a test can tell whether it has settled yet (fake timers). */
export const trackSettled = (promise: Promise<unknown>) => {
  const tracker = { isSettled: false };
  const markSettled = () => {
    tracker.isSettled = true;
  };

  promise.then(markSettled, markSettled);

  return tracker;
};
