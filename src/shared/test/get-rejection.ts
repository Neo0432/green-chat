/** Resolves with whatever the promise rejects with, so a test can inspect the error. */
export const getRejection = (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => {
      throw new Error('Expected the promise to reject');
    },
    (error: unknown) => error,
  );
