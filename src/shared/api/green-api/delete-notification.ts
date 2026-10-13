import { isPlainObject } from '@shared/lib';

import { GreenApiError, isGreenApiError } from './green-api-error';
import { request } from './request';
import type { Credentials, DeleteNotificationResult, RequestOptions } from './types';

interface DeleteNotificationParams {
  receiptId: number;
}

/** The server fails with a 500 when the notification to delete is already gone. */
const isNotificationGoneError = (error: unknown) =>
  isGreenApiError(error) &&
  error.kind === 'http' &&
  error.status === 500 &&
  /findUnAckedMessage/i.test(error.serverMessage ?? '');

/** `result: false` means the notification was not deleted because it is already gone. */
export const deleteNotification = async (
  credentials: Credentials,
  { receiptId }: DeleteNotificationParams,
  options?: RequestOptions,
): Promise<DeleteNotificationResult> => {
  let data: unknown;

  try {
    data = await request(
      credentials,
      { method: 'DELETE', endpoint: 'deleteNotification', suffix: String(receiptId) },
      options,
    );
  } catch (error) {
    if (isNotificationGoneError(error)) {
      return { result: false };
    }

    throw error;
  }

  if (!isPlainObject(data) || typeof data.result !== 'boolean') {
    throw new GreenApiError({ kind: 'parse', message: 'Unexpected deleteNotification response' });
  }

  return { result: data.result };
};
