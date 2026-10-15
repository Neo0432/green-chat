export const sleep = (ms: number, signal: AbortSignal) => {
  if (signal.aborted) {
    return Promise.resolve(false);
  }

  if (ms <= 0) {
    return Promise.resolve(true);
  }

  return new Promise<boolean>((resolve) => {
    const finish = (isElapsed: boolean) => {
      clearTimeout(timer);
      signal.removeEventListener('abort', handleAbort);
      resolve(isElapsed);
    };
    const handleAbort = () => {
      finish(false);
    };
    const timer = setTimeout(() => {
      finish(true);
    }, ms);

    signal.addEventListener('abort', handleAbort, { once: true });
  });
};
