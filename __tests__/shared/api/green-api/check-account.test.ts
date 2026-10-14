import { http, HttpResponse } from 'msw';

import { checkAccount, isAuthError, isQuotaError } from '@shared/api/green-api';
import { expectTokenFree } from '@shared/test/expect-token-free';
import { buildTestUrl, TEST_CREDENTIALS } from '@shared/test/fixtures/green-api';
import { getRejection } from '@shared/test/get-rejection';
import { server } from '@shared/test/msw/server';

const ENDPOINT_URL = buildTestUrl('checkAccount');
const PARAMS = { phoneNumber: '79876543210' };

describe('checkAccount', () => {
  it('posts the phone number as an integer', async () => {
    let body: unknown;
    server.use(
      http.post(ENDPOINT_URL, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ exist: true, chatId: '10000000' });
      }),
    );

    await checkAccount(TEST_CREDENTIALS, PARAMS);

    expect(body).toEqual({ phoneNumber: 79876543210 });
  });

  it('accepts a phone number of 15 digits, which is still an exact integer', async () => {
    let body: unknown;
    server.use(
      http.post(ENDPOINT_URL, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ exist: false, chatId: '' });
      }),
    );

    await checkAccount(TEST_CREDENTIALS, { phoneNumber: '999999999999999' });

    expect(body).toEqual({ phoneNumber: 999999999999999 });
  });

  it.each(['', ' ', '+79876543210', '7 987 654 32 10', '79876543210abc', '1234567890123456', 'NaN', '-5', '1.5'])(
    'throws for the phone number %p without making a request',
    async (phoneNumber) => {
      const handler = jest.fn(() => HttpResponse.json({ exist: true, chatId: '10000000' }));
      server.use(http.post(ENDPOINT_URL, handler));

      await expect(checkAccount(TEST_CREDENTIALS, { phoneNumber })).rejects.toThrow(RangeError);
      expect(handler).not.toHaveBeenCalled();
    },
  );

  it('resolves with the chat id when the account exists', async () => {
    server.use(http.post(ENDPOINT_URL, () => HttpResponse.json({ exist: true, chatId: '10000000' })));

    await expect(checkAccount(TEST_CREDENTIALS, PARAMS)).resolves.toEqual({ kind: 'found', chatId: '10000000' });
  });

  it('ignores the username, the phone number and the cache flag of a found account', async () => {
    const body = {
      exist: true,
      chatId: '10000000',
      username: '@username',
      phoneNumber: 79876543210,
      fromCache: true,
    };
    server.use(http.post(ENDPOINT_URL, () => HttpResponse.json(body)));

    await expect(checkAccount(TEST_CREDENTIALS, PARAMS)).resolves.toEqual({ kind: 'found', chatId: '10000000' });
  });

  it('resolves with not-found when the account does not exist', async () => {
    server.use(http.post(ENDPOINT_URL, () => HttpResponse.json({ exist: false, chatId: '' })));

    await expect(checkAccount(TEST_CREDENTIALS, PARAMS)).resolves.toEqual({ kind: 'not-found' });
  });

  it('resolves with unavailable and the reason when the instance cannot check', async () => {
    server.use(
      http.post(ENDPOINT_URL, () =>
        HttpResponse.json({ status: false, reason: 'instance is starting or not authorized' }),
      ),
    );

    await expect(checkAccount(TEST_CREDENTIALS, PARAMS)).resolves.toEqual({
      kind: 'unavailable',
      reason: 'instance is starting or not authorized',
    });
  });

  it('resolves with unavailable and the nested reason of a rate limit answered with HTTP 200', async () => {
    const body = { status: false, data: { status: 'fail', reason: 'rate_limit_exceeded', retryAfter: 11930619 } };
    server.use(http.post(ENDPOINT_URL, () => HttpResponse.json(body)));

    await expect(checkAccount(TEST_CREDENTIALS, PARAMS)).resolves.toEqual({
      kind: 'unavailable',
      reason: 'rate_limit_exceeded',
    });
  });

  it('prefers the top-level reason to the nested one', async () => {
    const body = { status: false, reason: 'top', data: { reason: 'nested' } };
    server.use(http.post(ENDPOINT_URL, () => HttpResponse.json(body)));

    await expect(checkAccount(TEST_CREDENTIALS, PARAMS)).resolves.toEqual({ kind: 'unavailable', reason: 'top' });
  });

  it('resolves with unavailable and an empty reason when the reason is missing', async () => {
    server.use(http.post(ENDPOINT_URL, () => HttpResponse.json({ status: false })));

    await expect(checkAccount(TEST_CREDENTIALS, PARAMS)).resolves.toEqual({ kind: 'unavailable', reason: '' });
  });

  it.each([
    ['top-level', { status: false, reason: `bad ${TEST_CREDENTIALS.apiTokenInstance}` }],
    ['nested', { status: false, data: { reason: `bad ${TEST_CREDENTIALS.apiTokenInstance}` } }],
  ])('keeps the token out of a %s reason', async (_name, body) => {
    server.use(http.post(ENDPOINT_URL, () => HttpResponse.json(body)));

    await expect(checkAccount(TEST_CREDENTIALS, PARAMS)).resolves.toEqual({ kind: 'unavailable', reason: 'bad ***' });
  });

  it('rejects with the status 469 and the reason when Telegram restricts the lookups', async () => {
    server.use(
      http.post(ENDPOINT_URL, () =>
        HttpResponse.json({ status: false, reason: 'Rate limited by messenger' }, { status: 469 }),
      ),
    );

    await expect(checkAccount(TEST_CREDENTIALS, PARAMS)).rejects.toMatchObject({
      kind: 'http',
      status: 469,
      serverMessage: 'Rate limited by messenger',
    });
  });

  it('rejects with the status 500 and the reason when the messenger is unavailable', async () => {
    server.use(
      http.post(ENDPOINT_URL, () =>
        HttpResponse.json({ status: false, reason: 'Messenger is temporarily unavailable' }, { status: 500 }),
      ),
    );

    await expect(checkAccount(TEST_CREDENTIALS, PARAMS)).rejects.toMatchObject({
      kind: 'http',
      status: 500,
      serverMessage: 'Messenger is temporarily unavailable',
    });
  });

  it('rejects with a quota error on 466 and reads the nested description', async () => {
    const body = {
      invokeStatus: {
        method: 'checkAccount',
        used: 100,
        total: 100,
        status: 'QUOTE_EXCEEDED',
        description: 'Monthly quota has been exceeded.',
      },
    };
    server.use(http.post(ENDPOINT_URL, () => HttpResponse.json(body, { status: 466 })));

    const error = await getRejection(checkAccount(TEST_CREDENTIALS, PARAMS));

    expect(isQuotaError(error)).toBe(true);
    expect(error).toMatchObject({ serverMessage: 'Monthly quota has been exceeded.' });
  });

  it('rejects with an auth error on 401, which has an empty body', async () => {
    server.use(http.post(ENDPOINT_URL, () => new HttpResponse(null, { status: 401 })));

    const error = await getRejection(checkAccount(TEST_CREDENTIALS, PARAMS));

    expect(isAuthError(error)).toBe(true);
    expectTokenFree(error, TEST_CREDENTIALS.apiTokenInstance);
  });

  it('rejects with a network error when the request fails', async () => {
    server.use(http.post(ENDPOINT_URL, () => HttpResponse.error()));

    await expect(checkAccount(TEST_CREDENTIALS, PARAMS)).rejects.toMatchObject({ kind: 'network' });
  });

  it.each([
    ['an empty object', {}],
    ['null', null],
    ['an existing account without a chat id', { exist: true }],
    ['an existing account with an empty chat id', { exist: true, chatId: '' }],
    ['a group chat id', { exist: true, chatId: '-1000000000001' }],
    ['a chat id that is not a string', { exist: true, chatId: 10000000 }],
    ['an exist flag that is not a boolean', { exist: 'yes', chatId: '10000000' }],
  ])('rejects with a parse error for %s', async (_name, payload) => {
    server.use(http.post(ENDPOINT_URL, () => HttpResponse.json(payload)));

    await expect(checkAccount(TEST_CREDENTIALS, PARAMS)).rejects.toMatchObject({ kind: 'parse' });
  });
});
