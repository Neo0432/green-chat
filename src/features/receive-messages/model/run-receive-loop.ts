import type { ReceivedNotification } from '@shared/api/green-api';

import { getBackoffDelay } from './backoff';

/** A poll that comes back sooner than this with nothing to show for it (a proxy, a mock) must not spin the loop. */
const MIN_POLL_INTERVAL_MS = 1000;

export interface ReceiveLoopDeps {
  /** Resolves with `null` when the queue is empty. */
  receive: (signal: AbortSignal) => Promise<ReceivedNotification | null>;
  remove: (receiptId: number, signal: AbortSignal) => Promise<unknown>;
  onNotification: (body: unknown) => void;
  /** A poll failed; `failureCount` is the number of failures in a row. */
  onFailure: (error: unknown, failureCount: number) => void;
  /** The first poll that worked after a failure. */
  onRecovered: () => void;
  /** Signs the user out of a rejected session and says whether the error was that (FR-1.9). */
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

/**
 * FR-4.2: one request at a time. A notification is processed and then deleted, whatever it held. A failed poll
 * backs off and tries again (FR-4.3); only a rejected session or an abort ends the loop.
 */
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
      // The notification comes back and is dropped as a known one (FR-4.9): all that is left is to go on.
      await waitOutMinInterval(startedAt);
    }
  }
};
