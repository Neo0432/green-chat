import type { StartOptions } from 'msw/browser';

/**
 * `quiet`: MSW would log every mocked request URL to the console, and the GREEN-API URL ends with the token (NFR-5).
 * `bypass`: a request without a handler goes to the network without a warning.
 */
export const WORKER_START_OPTIONS = { quiet: true, onUnhandledRequest: 'bypass' } satisfies StartOptions;
