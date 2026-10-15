import '@testing-library/jest-dom';

import type { ENV } from '@shared/config';

import { server } from './msw/server';
import { mockMatchMedia } from './mock-match-media';
import { mockResizeObserver } from './mock-resize-observer';

jest.mock('@shared/config/env', () => ({
  ENV: { enableApiMocks: false, greenApiProxyTarget: null } satisfies typeof ENV,
}));

beforeEach(() => {
  mockMatchMedia(false);
  mockResizeObserver();
});

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  jest.restoreAllMocks();
  server.resetHandlers();
  window.localStorage.clear();
});

afterAll(() => {
  server.close();
});
