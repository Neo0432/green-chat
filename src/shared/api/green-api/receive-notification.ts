import { isPlainObject } from '@shared/lib/predicates';

import { request } from './request';
import type { Credentials, ReceivedNotification, RequestOptions } from './types';

const DEFAULT_RECEIVE_TIMEOUT_S = 20;
/** The server holds the request for `receiveTimeout` seconds, so the client must wait longer than that. */
const CLIENT_TIMEOUT_MARGIN_MS = 10_000;

interface ReceiveNotificationParams {
  /** Seconds the server waits for a notification (5..60). */
  receiveTimeout?: number;
}

/** Resolves with `null` when the queue is empty: an empty body, `null` or no numeric `receiptId`. */
export const receiveNotification = async (
  credentials: Credentials,
  { receiveTimeout = DEFAULT_RECEIVE_TIMEOUT_S }: ReceiveNotificationParams = {},
  options: RequestOptions = {},
): Promise<ReceivedNotification | null> => {
  const data = await request(
    credentials,
    { method: 'GET', endpoint: 'receiveNotification', query: { receiveTimeout } },
    { ...options, timeoutMs: options.timeoutMs ?? receiveTimeout * 1000 + CLIENT_TIMEOUT_MARGIN_MS },
  );

  if (!isPlainObject(data) || typeof data.receiptId !== 'number' || !Number.isInteger(data.receiptId)) {
    return null;
  }

  return { receiptId: data.receiptId, body: data.body };
};
