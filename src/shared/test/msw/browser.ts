import { setupWorker } from 'msw/browser';

import { handlers } from './handlers';

/** MSW for the browser: lets the frontend run without real GREEN-API credentials. */
export const worker = setupWorker(...handlers);
