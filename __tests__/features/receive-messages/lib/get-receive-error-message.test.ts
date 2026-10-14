import { getQuotaMessage, getReceiveErrorMessage } from '@features/receive-messages/lib/get-receive-error-message';

import { GreenApiError } from '@shared/api/green-api';

describe('getReceiveErrorMessage', () => {
  it('explains a webhook URL that blocks the queue (AC-19)', () => {
    const error = new GreenApiError({
      kind: 'http',
      status: 400,
      serverMessage: 'Message cannot be received because custom webhook url is set.',
    });

    expect(getReceiveErrorMessage(error)).toMatch(/^Incoming messages are blocked: the instance has a webhook URL set/);
  });

  it('gives the text of the server for an exhausted quota', () => {
    const error = new GreenApiError({ kind: 'http', status: 466, serverMessage: 'Monthly quota has been exceeded.' });

    expect(getReceiveErrorMessage(error)).toBe('Monthly quota has been exceeded.');
  });

  it.each([
    ['a network error', new GreenApiError({ kind: 'network' })],
    ['a timeout', new GreenApiError({ kind: 'timeout' })],
    ['a malformed response', new GreenApiError({ kind: 'parse' })],
    ['a server error', new GreenApiError({ kind: 'http', status: 502 })],
    [
      'another 400',
      new GreenApiError({ kind: 'http', status: 400, serverMessage: 'Parameter idInstance not an integer' }),
    ],
    ['a plain Error', new Error('boom')],
  ])('leaves %s to "Connecting…"', (_name, error) => {
    expect(getReceiveErrorMessage(error)).toBeNull();
  });
});

describe('getQuotaMessage', () => {
  it('prefers the description', () => {
    expect(getQuotaMessage('Monthly quota has been exceeded.')).toBe('Monthly quota has been exceeded.');
  });

  it.each([null, undefined])('falls back to a default when the description is %s', (description) => {
    expect(getQuotaMessage(description)).toBe('Tariff limit reached.');
  });
});
