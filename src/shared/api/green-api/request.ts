import { buildUrl } from './build-url';
import { GreenApiError, type GreenApiErrorKind } from './green-api-error';
import { toServerMessage } from './server-message';
import type { Credentials, RequestOptions } from './types';

export const DEFAULT_TIMEOUT_MS = 15_000;

interface RequestParams {
  method: 'GET' | 'POST' | 'DELETE';
  /** The GREEN-API method name in lowerCamelCase, e.g. `sendMessage`. */
  endpoint: string;
  suffix?: string;
  query?: Record<string, string | number>;
  body?: unknown;
}

interface RawResponse {
  status: number;
  isOk: boolean;
  text: string;
}

const getFailureKind = (isAborted: boolean, isTimedOut: boolean): GreenApiErrorKind => {
  if (isAborted) {
    return 'aborted';
  }

  return isTimedOut ? 'timeout' : 'network';
};

const parseBody = (text: string): unknown => {
  if (text.trim() === '') {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new GreenApiError({ kind: 'parse', message: 'GREEN-API response is not valid JSON' });
  }
};

const toRequestInit = ({ method, body }: RequestParams): RequestInit =>
  body === undefined
    ? { method }
    : { method, body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } };

const send = async (url: string, init: RequestInit): Promise<RawResponse> => {
  const response = await fetch(url, init);

  return { status: response.status, isOk: response.ok, text: await response.text() };
};

/**
 * One call to GREEN-API. Resolves with the parsed JSON body (`null` for an empty one). Transport and
 * server failures reject with a GreenApiError; a bad argument (e.g. an unencodable token) throws as is.
 * Callers validate the payload themselves.
 */
export const request = async (
  credentials: Credentials,
  params: RequestParams,
  { signal: callerSignal, timeoutMs = DEFAULT_TIMEOUT_MS }: RequestOptions = {},
): Promise<unknown> => {
  const url = buildUrl(credentials, params.endpoint, { suffix: params.suffix, query: params.query });
  const init = toRequestInit(params);
  const timeoutController = new AbortController();
  const timer = setTimeout(() => {
    timeoutController.abort();
  }, timeoutMs);
  const signal = callerSignal ? AbortSignal.any([callerSignal, timeoutController.signal]) : timeoutController.signal;

  let response: RawResponse;

  try {
    response = await send(url, { ...init, signal });
  } catch {
    // The original error is dropped on purpose: its message or cause may carry the URL with the token.
    throw new GreenApiError({
      kind: getFailureKind(callerSignal?.aborted === true, timeoutController.signal.aborted),
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.isOk) {
    const serverMessage = toServerMessage(response.text, credentials.apiTokenInstance);

    throw new GreenApiError({
      kind: 'http',
      status: response.status,
      serverMessage: serverMessage === '' ? undefined : serverMessage,
    });
  }

  return parseBody(response.text);
};
