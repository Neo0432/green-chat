import { getSendErrorMessage } from '@features/send-message/lib/get-send-error-message';

import { GreenApiError, type GreenApiErrorKind } from '@shared/api/green-api';

const http = (status: number, serverMessage?: string) => new GreenApiError({ kind: 'http', status, serverMessage });

describe('getSendErrorMessage', () => {
  it.each<[string, GreenApiError, string]>([
    ['a 400 with the server text', http(400, 'Instance account is expired.'), 'Not sent: Instance account is expired.'],
    ['a 400 without a text', http(400), 'Not sent.'],
    ['a 404', http(404), 'Not sent: wrong API URL.'],
    ['a 429', http(429), 'Not sent: too many requests. Retry in a few seconds.'],
    [
      'a 466 with the tariff text',
      http(466, 'Monthly quota has been exceeded.'),
      'Not sent: tariff limit reached (Monthly quota has been exceeded.).',
    ],
    ['a 466 without a text', http(466), 'Not sent: tariff limit reached.'],
    ['a 500', http(500, 'Internal Server Error'), 'Not sent: GREEN-API error (HTTP 500).'],
    ['a 502', http(502), 'Not sent: GREEN-API error (HTTP 502).'],
  ])('describes %s (FR-6.2)', (_name, error, expected) => {
    expect(getSendErrorMessage(error)).toBe(expected);
  });

  it.each<[GreenApiErrorKind, string]>([
    ['network', 'Not sent: no connection.'],
    ['timeout', 'Not sent: request timed out.'],
    ['parse', 'Not sent: unexpected response from GREEN-API.'],
    ['aborted', 'Not sent: request was cancelled.'],
  ])('describes a %s failure', (kind, expected) => {
    expect(getSendErrorMessage(new GreenApiError({ kind }))).toBe(expected);
  });
});
