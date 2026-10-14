import '@testing-library/jest-dom';

import type { ENV } from '@shared/config';

import { server } from './msw/server';
import { mockMatchMedia } from './mock-match-media';
import { mockResizeObserver } from './mock-resize-observer';

// `import.meta.env` does not exist in Jest (CJS), so the only module reading it is replaced.
jest.mock('@shared/config/env', () => ({
  ENV: { enableApiMocks: false, greenApiProxyTarget: null } satisfies typeof ENV,
}));

beforeEach(() => {
  // A desktop window, unless the test says otherwise.
  mockMatchMedia(false);
  mockResizeObserver();
});

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
