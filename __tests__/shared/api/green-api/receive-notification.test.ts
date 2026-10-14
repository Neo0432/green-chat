import { http, HttpResponse } from 'msw';

import { isAuthError, isWebhookUrlError, receiveNotification } from '@shared/api/green-api';
import { expectTokenFree } from '@shared/test/expect-token-free';
import { buildTestUrl, incomingTextNotification, TEST_CREDENTIALS } from '@shared/test/fixtures/green-api';
import { getRejection } from '@shared/test/get-rejection';
import { server } from '@shared/test/msw/server';

const ENDPOINT_URL = buildTestUrl('receiveNotification');

describe('receiveNotification', () => {
  it('resolves with the receipt id and the body', async () => {
    server.use(http.get(ENDPOINT_URL, () => HttpResponse.json({ receiptId: 1234567, body: incomingTextNotification })));

    await expect(receiveNotification(TEST_CREDENTIALS)).resolves.toEqual({
      receiptId: 1234567,
      body: incomingTextNotification,
    });
  });

  it('asks the server to wait 20 seconds by default', async () => {
    let query: string | null = null;
    server.use(
      http.get(ENDPOINT_URL, ({ request }) => {
        query = new URL(request.url).searchParams.get('receiveTimeout');
        return HttpResponse.json(null);
      }),
    );

    await receiveNotification(TEST_CREDENTIALS);

    expect(query).toBe('20');
  });

  it('asks the server to wait for the given number of seconds', async () => {
    let query: string | null = null;
    server.use(
      http.get(ENDPOINT_URL, ({ request }) => {
        query = new URL(request.url).searchParams.get('receiveTimeout');
        return HttpResponse.json(null);
      }),
    );

    await receiveNotification(TEST_CREDENTIALS, { receiveTimeout: 5 });

    expect(query).toBe('5');
  });

  it('waits for the server 10 seconds longer than the server waits', async () => {
    const setTimeoutSpy = jest.spyOn(globalThis, 'setTimeout');
    server.use(http.get(ENDPOINT_URL, () => HttpResponse.json(null)));

    await receiveNotification(TEST_CREDENTIALS);
    await receiveNotification(TEST_CREDENTIALS, { receiveTimeout: 5 });

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 30_000);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 15_000);
  });

  it('lets the caller override the client timeout', async () => {
    const setTimeoutSpy = jest.spyOn(globalThis, 'setTimeout');
    server.use(http.get(ENDPOINT_URL, () => HttpResponse.json(null)));

    await receiveNotification(TEST_CREDENTIALS, {}, { timeoutMs: 1234 });

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1234);
  });

  it.each([
    ['an empty body', new HttpResponse('', { status: 200 })],
    ['a null body', HttpResponse.json(null)],
    ['an empty object', HttpResponse.json({})],
    ['an object without a receipt id', HttpResponse.json({ body: incomingTextNotification })],
    ['a receipt id that is a string', HttpResponse.json({ receiptId: '1234567', body: {} })],
    ['a receipt id that is not an integer', HttpResponse.json({ receiptId: 1.5, body: {} })],
    ['a body that is not an object', HttpResponse.json('garbage')],
  ])('resolves with null for %s', async (_name, response) => {
    server.use(http.get(ENDPOINT_URL, () => response));

    await expect(receiveNotification(TEST_CREDENTIALS)).resolves.toBeNull();
  });

  it('resolves with an undefined body when the notification has none', async () => {
    server.use(http.get(ENDPOINT_URL, () => HttpResponse.json({ receiptId: 7 })));

    await expect(receiveNotification(TEST_CREDENTIALS)).resolves.toEqual({ receiptId: 7, body: undefined });
  });

  it('rejects with a parse error when the body is not JSON', async () => {
    server.use(http.get(ENDPOINT_URL, () => HttpResponse.text('<html></html>')));

    await expect(receiveNotification(TEST_CREDENTIALS)).rejects.toMatchObject({ kind: 'parse' });
  });

  it('rejects with a webhook url error on the 400 of an instance with a webhook url', async () => {
    server.use(
      http.get(ENDPOINT_URL, () =>
        HttpResponse.text('Message cannot be received because custom webhook url is set. Go to cabinet', {
          status: 400,
        }),
      ),
    );

    expect(isWebhookUrlError(await getRejection(receiveNotification(TEST_CREDENTIALS)))).toBe(true);
  });

  it('recognizes the webhook url error when its text is in the message field of a JSON body', async () => {
    const body = {
      description: 'Bad Request',
      message: 'Message cannot be received because custom webhook url is set. Go to cabinet',
    };
    server.use(http.get(ENDPOINT_URL, () => HttpResponse.json(body, { status: 400 })));

    expect(isWebhookUrlError(await getRejection(receiveNotification(TEST_CREDENTIALS)))).toBe(true);
  });

  it('rejects with an auth error on 401, which has an empty body', async () => {
    server.use(http.get(ENDPOINT_URL, () => new HttpResponse(null, { status: 401 })));

    const error = await getRejection(receiveNotification(TEST_CREDENTIALS));

    expect(isAuthError(error)).toBe(true);
    expectTokenFree(error, TEST_CREDENTIALS.apiTokenInstance);
  });

  it('rejects with a network error when the request fails', async () => {
    server.use(http.get(ENDPOINT_URL, () => HttpResponse.error()));

    await expect(receiveNotification(TEST_CREDENTIALS)).rejects.toMatchObject({ kind: 'network' });
  });

  it('rejects with an aborted error when the caller aborts', async () => {
    server.use(http.get(ENDPOINT_URL, () => HttpResponse.json(null)));

    await expect(receiveNotification(TEST_CREDENTIALS, {}, { signal: AbortSignal.abort() })).rejects.toMatchObject({
      kind: 'aborted',
    });
  });
});
