import { isNonEmptyString, isPlainObject } from '@shared/lib';

import { GreenApiError } from './green-api-error';
import { request } from './request';
import type { Credentials, RequestOptions, SendMessageResult } from './types';

interface SendMessageParams {
  chatId: string;
  message: string;
}

export const sendMessage = async (
  credentials: Credentials,
  { chatId, message }: SendMessageParams,
  options?: RequestOptions,
): Promise<SendMessageResult> => {
  const data = await request(
    credentials,
    { method: 'POST', endpoint: 'sendMessage', body: { chatId, message } },
    options,
  );

  if (!isPlainObject(data) || !isNonEmptyString(data.idMessage)) {
    throw new GreenApiError({ kind: 'parse', message: 'Unexpected sendMessage response' });
  }

  return { idMessage: data.idMessage };
};
