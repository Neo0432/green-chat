import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import { startReceiveListener } from '@features/receive-messages';

import { ENV } from '@shared/config';

import { App } from './app';
import { createAppStore } from './store';

import './styles/index.scss';

const startMocks = async () => {
  // Keep the literal import.meta.env.DEV: Vite folds only the literal, a constant would ship MSW to production.
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
    const store = createAppStore();

    startReceiveListener(store);

    createRoot(rootElement).render(
      <StrictMode>
        <Provider store={store}>
          <App />
        </Provider>
      </StrictMode>,
    );
  });
