import { createGreenApiHandlers, createGreenApiMockState, type GreenApiSeed } from './msw/green-api';
import { server } from './msw/server';

/**
 * Serves the GREEN-API mock (requirements §8) to the test's requests, without latency. Returns the state, so the
 * test can queue notifications and look at what is left in the queue.
 */
export const mockGreenApi = (seed?: GreenApiSeed) => {
  const state = createGreenApiMockState({ seed });

  server.use(...createGreenApiHandlers(state, { latencyMs: 0 }));

  return state;
};
