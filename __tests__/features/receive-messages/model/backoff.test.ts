import { getBackoffDelay } from '@features/receive-messages/model/backoff';

describe('getBackoffDelay', () => {
  it.each([
    [1, 1_000],
    [2, 2_000],
    [3, 4_000],
    [4, 8_000],
    [5, 16_000],
  ])('waits as long as the doubling says after failure %i in a row (%i ms)', (failureCount, expected) => {
    expect(getBackoffDelay(failureCount)).toBe(expected);
  });

  it.each([6, 7, 20])('stops at 30 s from failure %i in a row', (failureCount) => {
    expect(getBackoffDelay(failureCount)).toBe(30_000);
  });
});
