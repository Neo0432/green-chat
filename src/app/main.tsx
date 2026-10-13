import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ENV } from '@shared/config';

import { App } from './app';

import './styles/index.scss';

/**
 * The guard must read the literal `import.meta.env.DEV`: Vite inlines it as `false` in
 * production, so the bundler drops the dynamic import and MSW with it. Any value derived
 * from it (a constant, a property of `ENV`) is not folded and would ship MSW to production.
 */
const startMocks = async () => {
  if (!import.meta.env.DEV || !ENV.enableApiMocks) {
    return;
  }

  const { startMockWorker } = await import('@shared/test/msw/browser');

  await startMockWorker();
};

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Missing #root element — check index.html');
}

void startMocks()
  .catch((error: unknown) => {
    console.error('API mocks failed to start, rendering without them', error);
  })
  .then(() => {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
