import { getCreateChatErrorMessage } from '@features/create-chat/lib/get-create-chat-error-message';
import type { CreateChatFailure } from '@features/create-chat/model/types';

const unavailable = (serverReason: string): CreateChatFailure => ({ reason: 'unavailable', serverReason });
const http = (status: number, serverMessage?: string): CreateChatFailure => ({
  reason: 'request-failed',
  errorKind: 'http',
  status,
  serverMessage,
});
const failed = (errorKind: 'network' | 'timeout' | 'parse' | 'aborted'): CreateChatFailure => ({
  reason: 'request-failed',
  errorKind,
});

describe('getCreateChatErrorMessage (FR-6.2, CheckAccount column)', () => {
  it.each([
    [
      'a number that does not exist',
      { reason: 'not-found' } satisfies CreateChatFailure,
      "This number isn't on Telegram, or its owner hides it in privacy settings.",
    ],
    [
      'a 200 rate limit, whose reason is nested',
      unavailable('rate_limit_exceeded'),
      'Too many number checks. Telegram asks to pause for about 2 hours.',
    ],
    [
      'an instance that is starting',
      unavailable('instance is starting or not authorized'),
      'The instance is starting or not authorized.',
    ],
    ['a status:false without a reason', unavailable(''), 'The instance is starting or not authorized.'],
    ['a status:false with another reason', unavailable('something odd'), "Couldn't check the number: something odd"],
    ['a 400 with a server text', http(400, 'Wrong format.'), "Couldn't check the number: Wrong format."],
    ['a 400 without one', http(400), "Couldn't check the number."],
    ['a 404', http(404), 'Wrong API URL.'],
    ['a 429', http(429), 'Too many requests. Wait a few seconds and try again.'],
    [
      'a 466 whose description is nested',
      http(466, 'Monthly quota has been exceeded.'),
      'The monthly limit of number checks is reached on this tariff.',
    ],
    [
      'a 469',
      http(469, 'Rate limited by messenger'),
      'Telegram restricted number lookups for this account. Try again in a few hours.',
    ],
    [
      'a 500 from the messenger',
      http(500, 'Messenger is temporarily unavailable'),
      'Telegram is temporarily unavailable. Try again in a few minutes.',
    ],
    ['a plain 500', http(500, 'Internal Server Error'), 'GREEN-API is unavailable (HTTP 500). Try again later.'],
    ['a 502', http(502), 'GREEN-API is unavailable (HTTP 502). Try again later.'],
    ['another 4xx with a server text', http(418, 'I am a teapot'), 'I am a teapot'],
    ['another 4xx without one', http(418), 'GREEN-API rejected the request.'],
    ['a network error', failed('network'), "Can't reach GREEN-API."],
    ['a timeout', failed('timeout'), "GREEN-API didn't respond in time. Try again."],
    ['an unexpected response', failed('parse'), 'Unexpected response from GREEN-API.'],
    ['an aborted request', failed('aborted'), 'The request was cancelled. Try again.'],
  ])('words %s', (_name, failure, expected) => {
    expect(getCreateChatErrorMessage(failure)).toBe(expected);
  });
});
