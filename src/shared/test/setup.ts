import '@testing-library/jest-dom';

import type { ENV } from '@shared/config';

import { server } from './msw/server';

// `import.meta.env` does not exist in Jest (CJS), so the only module reading it is replaced.
jest.mock('@shared/config/env', () => ({
  ENV: { enableApiMocks: false } satisfies typeof ENV,
}));

beforeAll(() => {
  // A request without a handler fails the test instead of silently passing.
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
