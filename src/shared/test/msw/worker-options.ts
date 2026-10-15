import type { StartOptions } from 'msw/browser';

export const WORKER_START_OPTIONS = { quiet: true, onUnhandledRequest: 'bypass' } satisfies StartOptions;
