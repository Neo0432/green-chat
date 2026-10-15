import { createGreenApiHandlers, createGreenApiMockState, type GreenApiSeed } from './msw/green-api';
import { server } from './msw/server';

export const mockGreenApi = (seed?: GreenApiSeed) => {
  const state = createGreenApiMockState({ seed });

  server.use(...createGreenApiHandlers(state, { latencyMs: 0 }));

  return state;
};
