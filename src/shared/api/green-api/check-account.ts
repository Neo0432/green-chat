import { isNonBlankString, isPlainObject } from '@shared/lib/predicates';

import { isPrivateChatId } from './chat-id';
import { GreenApiError } from './green-api-error';
import { request } from './request';
import { toServerMessage } from './server-message';
import type { CheckAccountResult, Credentials, RequestOptions } from './types';

interface CheckAccountParams {
  /** International format, digits only (no `+`). */
  phoneNumber: string;
}

/** 15 digits stay below Number.MAX_SAFE_INTEGER, so the integer on the wire is exact. */
const PHONE_NUMBER_PATTERN = /^\d{1,15}$/;

/** A rate limit comes as HTTP 200 with the reason nested in `data`; other failures carry it at the top level. */
const readReason = (data: Record<string, unknown>) => {
  const nestedReason = isPlainObject(data.data) ? data.data.reason : undefined;

  return [data.reason, nestedReason].find(isNonBlankString) ?? '';
};

const parseResponse = (data: unknown, token: string): CheckAccountResult | null => {
  if (!isPlainObject(data)) {
    return null;
  }

  if (data.status === false) {
    return { kind: 'unavailable', reason: toServerMessage(readReason(data), token) };
  }

  if (data.exist === false) {
    return { kind: 'not-found' };
  }

  if (data.exist === true && isPrivateChatId(data.chatId)) {
    return { kind: 'found', chatId: data.chatId };
  }

  return null;
};

export const checkAccount = async (
  credentials: Credentials,
  { phoneNumber }: CheckAccountParams,
  options?: RequestOptions,
): Promise<CheckAccountResult> => {
  if (!PHONE_NUMBER_PATTERN.test(phoneNumber)) {
    throw new RangeError('checkAccount expects a phone number of 1 to 15 digits');
  }

  // GREEN-API wants the phone as an integer: a string fails its validation.
  const body = { phoneNumber: Number(phoneNumber) };
  const result = parseResponse(
    await request(credentials, { method: 'POST', endpoint: 'checkAccount', body }, options),
    credentials.apiTokenInstance,
  );

  if (result === null) {
    throw new GreenApiError({ kind: 'parse', message: 'Unexpected checkAccount response' });
  }

  return result;
};
