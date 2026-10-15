import { isPlainObject } from '@shared/lib';

import { request } from './request';
import type { Credentials, ReceivedNotification, RequestOptions } from './types';

const DEFAULT_RECEIVE_TIMEOUT_S = 20;
const CLIENT_TIMEOUT_MARGIN_MS = 10_000;

interface ReceiveNotificationParams {
  receiveTimeout?: number;
}

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
