import { setupWorker } from 'msw/browser';

import { createGreenApiHandlers, createGreenApiMockState, createSeed, installDevHelpers } from './green-api';
import { WORKER_START_OPTIONS } from './worker-options';

const state = createGreenApiMockState({ seed: createSeed() });

installDevHelpers(state);

/** MSW for the browser: the GREEN-API mock (requirements §8), so the app runs without real credentials. */
const worker = setupWorker(...createGreenApiHandlers(state, { latencyMs: { min: 300, max: 500 } }));

export const startMockWorker = () => worker.start(WORKER_START_OPTIONS);
