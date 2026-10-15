import { isNonBlankString, isPlainObject } from '@shared/lib';

import { redactToken } from './redact-token';

const SERVER_MESSAGE_MAX_LENGTH = 300;

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const readNested = (container: unknown, key: string) => (isPlainObject(container) ? container[key] : undefined);

const RAW_STRUCTURE_PATTERN = /^[{[<]/;

const readMessage = (text: string) => {
  const data = parseJson(text);

  if (!isPlainObject(data)) {
    return RAW_STRUCTURE_PATTERN.test(text.trimStart()) ? '' : text;
  }

  const candidates = [
    data.reason,
    data.message,
    data.description,
    readNested(data.invokeStatus, 'description'),
    readNested(data.correspondentsStatus, 'description'),
    readNested(data.quotaData, 'description'),
    readNested(data.data, 'reason'),
  ];
  const parts = [...new Set(candidates.filter(isNonBlankString).map((part) => part.trim()))];

  return parts.join(': ');
};

export const toServerMessage = (text: string, token: string) =>
  redactToken(readMessage(text), token).trim().slice(0, SERVER_MESSAGE_MAX_LENGTH);
