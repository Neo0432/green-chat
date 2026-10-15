const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;

export const getBackoffDelay = (failureCount: number) =>
  Math.min(BASE_DELAY_MS * 2 ** (failureCount - 1), MAX_DELAY_MS);
