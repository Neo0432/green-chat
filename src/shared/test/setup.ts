import '@testing-library/jest-dom';

import type { ENV } from '@shared/config';

import { server } from './msw/server';

// `import.meta.env` does not exist in Jest (CJS), so the only module reading it is replaced.
jest.mock('@shared/config/env', () => ({
  ENV: { enableApiMocks: false, greenApiProxyTarget: null } satisfies typeof ENV,
}));

beforeAll(() => {
  // A request without a handler fails the test instead of silently passing.
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  // A test may have blocked the storage; it has to work again before it is emptied.
  jest.restoreAllMocks();
  server.resetHandlers();
  window.localStorage.clear();
});

afterAll(() => {
  server.close();
});
