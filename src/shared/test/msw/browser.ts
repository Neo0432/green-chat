import { setupWorker } from 'msw/browser';

import { createGreenApiHandlers, createGreenApiMockState, createSeed, installDevHelpers } from './green-api';
import { WORKER_START_OPTIONS } from './worker-options';

const state = createGreenApiMockState({ seed: createSeed() });

installDevHelpers(state);

const worker = setupWorker(...createGreenApiHandlers(state, { latencyMs: { min: 300, max: 500 } }));

export const startMockWorker = () => worker.start(WORKER_START_OPTIONS);
