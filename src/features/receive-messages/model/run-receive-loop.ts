import type { ReceivedNotification } from '@shared/api/green-api';

import { getBackoffDelay } from './backoff';

const MIN_POLL_INTERVAL_MS = 1000;

export interface ReceiveLoopDeps {
  receive: (signal: AbortSignal) => Promise<ReceivedNotification | null>;
  remove: (receiptId: number, signal: AbortSignal) => Promise<unknown>;
  onNotification: (body: unknown) => void;
  onFailure: (error: unknown, failureCount: number) => void;
  onRecovered: () => void;
  handleAuthError: (error: unknown) => boolean;
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal.aborted || ms <= 0) {
      resolve();

      return;
    }

    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);

    signal.addEventListener('abort', finish, { once: true });
  });

export const runReceiveLoop = async (
  { receive, remove, onNotification, onFailure, onRecovered, handleAuthError }: ReceiveLoopDeps,
  signal: AbortSignal,
) => {
  let failureCount = 0;

  // A function call, so that TypeScript does not take `signal.aborted` for false for the whole loop.
  const isAborted = () => signal.aborted;

  const waitOutMinInterval = (startedAt: number) => sleep(MIN_POLL_INTERVAL_MS - (Date.now() - startedAt), signal);

  while (!isAborted()) {
    const startedAt = Date.now();
    let received: ReceivedNotification | null;

    try {
      received = await receive(signal);
    } catch (error) {
      if (isAborted() || handleAuthError(error)) {
        return;
      }

      failureCount += 1;
      onFailure(error, failureCount);
      await sleep(getBackoffDelay(failureCount), signal);

      continue;
    }

    if (isAborted()) {
      return;
    }

    if (failureCount > 0) {
      failureCount = 0;
      onRecovered();
    }

    if (received === null) {
      await waitOutMinInterval(startedAt);

      continue;
    }

    try {
      onNotification(received.body);
    } catch (error) {
      console.error('Failed to process a notification', error);
    }

    try {
      await remove(received.receiptId, signal);
    } catch {
      await waitOutMinInterval(startedAt);
    }
  }
};
