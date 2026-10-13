import { WORKER_START_OPTIONS } from '@shared/test/msw/worker-options';

describe('WORKER_START_OPTIONS', () => {
  it('keeps MSW from logging request URLs, which end with the API token', () => {
    expect(WORKER_START_OPTIONS.quiet).toBe(true);
  });

  it('lets a request without a handler through without a warning', () => {
    expect(WORKER_START_OPTIONS.onUnhandledRequest).toBe('bypass');
  });
});
