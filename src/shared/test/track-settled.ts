export const trackSettled = (promise: Promise<unknown>) => {
  const tracker = { isSettled: false };
  const markSettled = () => {
    tracker.isSettled = true;
  };

  promise.then(markSettled, markSettled);

  return tracker;
};
