import { getSignInErrorMessage } from '@features/sign-in/lib/get-sign-in-error-message';
import type { SignInFailure } from '@features/sign-in/model/types';

const API_URL = 'https://4100.api.green-api.com';

const state = (stateInstance: string): SignInFailure => ({ reason: 'instance-not-authorized', stateInstance });
const http = (status: number, serverMessage?: string): SignInFailure => ({
  reason: 'request-failed',
  errorKind: 'http',
  status,
  serverMessage,
});
const failed = (errorKind: 'network' | 'timeout' | 'parse' | 'aborted'): SignInFailure => ({
  reason: 'request-failed',
  errorKind,
});

const NOT_LINKED =
  "This instance isn't linked to a Telegram account yet. Authorize it in console.green-api.com and try again.";

describe('getSignInErrorMessage (FR-6.2, login column)', () => {
  it.each([
    ['a notAuthorized instance', state('notAuthorized'), NOT_LINKED],
    ['a pendingCode instance', state('pendingCode'), NOT_LINKED],
    ['a pendingPassword instance', state('pendingPassword'), NOT_LINKED],
    ['a starting instance', state('starting'), 'The instance is starting. Try again in a minute.'],
    ['a blocked instance', state('blocked'), 'The Telegram account of this instance is blocked.'],
    ['a suspended instance', state('suspended'), 'The instance is not ready (state: suspended).'],
    ['an instance in an unknown state', state('somethingNew'), 'The instance is not ready (state: somethingNew).'],
    ['a 400 with a server text', http(400, 'Instance account is expired.'), 'Instance account is expired.'],
    ['a 400 without one', http(400), 'GREEN-API rejected the request.'],
    ['a 401', http(401), 'Wrong API token.'],
    ['a 403', http(403), 'Wrong Instance ID or API URL.'],
    ['a 404', http(404), 'Wrong API URL.'],
    ['a 429', http(429), 'Too many requests. Wait a few seconds and try again.'],
    ['a 502', http(502, 'Bad Gateway'), 'GREEN-API is unavailable (HTTP 502). Try again later.'],
    ['a timeout', failed('timeout'), "GREEN-API didn't respond in time. Try again."],
    ['an unexpected response', failed('parse'), 'Unexpected response from GREEN-API. Check the API URL.'],
    ['an aborted request', failed('aborted'), 'The request was cancelled. Try again.'],
  ])('words %s', (_name, failure, expected) => {
    expect(getSignInErrorMessage(failure, API_URL)).toBe(expected);
  });

  it('names the effective API URL in the network message', () => {
    expect(getSignInErrorMessage(failed('network'), 'https://7103.api.green-api.com')).toBe(
      "Can't reach GREEN-API at https://7103.api.green-api.com. Check the Instance ID, the API URL and your connection.",
    );
  });
});
