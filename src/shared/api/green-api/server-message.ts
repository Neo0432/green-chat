import { isNonBlankString, isPlainObject } from '@shared/lib';

import { redactToken } from './redact-token';

const SERVER_MESSAGE_MAX_LENGTH = 300;

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    // Not JSON: the caller falls back to the text itself.
    return null;
  }
};

const readNested = (container: unknown, key: string) => (isPlainObject(container) ? container[key] : undefined);

/** FR-6.3: a body that is JSON or markup without a text field is not for the user, the callers use their own text. */
const RAW_STRUCTURE_PATTERN = /^[{[<]/;

/**
 * An error body is plain text or JSON. The human texts of a JSON body, most useful first: `reason`, `message`,
 * `description`, the nested `description` of a 466, and the `reason` nested in CheckAccount's `data`.
 * All distinct ones are kept: callers look for phrases inside the text, so no field may be dropped.
 * A body with no such text is empty, unless it is plain text.
 */
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

/** Safe to log and to keep in an error: the token is redacted and the length is capped. */
export const toServerMessage = (text: string, token: string) =>
  redactToken(readMessage(text), token).trim().slice(0, SERVER_MESSAGE_MAX_LENGTH);
