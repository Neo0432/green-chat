export const getRejection = (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => {
      throw new Error('Expected the promise to reject');
    },
    (error: unknown) => error,
  );
