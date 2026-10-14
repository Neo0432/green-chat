const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;

/** FR-4.3: 1, 2, 4, 8, 16 s and then 30 s. `failureCount` is the number of failures in a row, at least 1. */
export const getBackoffDelay = (failureCount: number) =>
  Math.min(BASE_DELAY_MS * 2 ** (failureCount - 1), MAX_DELAY_MS);
