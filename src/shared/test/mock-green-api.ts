import { createGreenApiHandlers, createGreenApiMockState } from './msw/green-api';
import { server } from './msw/server';

/** Serves the GREEN-API mock (requirements §8) to the test's requests, without latency. */
export const mockGreenApi = () => {
  server.use(...createGreenApiHandlers(createGreenApiMockState(), { latencyMs: 0 }));
};
