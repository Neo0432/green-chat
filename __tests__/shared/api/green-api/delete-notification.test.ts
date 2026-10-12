import { http, HttpResponse } from 'msw';

import { deleteNotification, isAuthError } from '@shared/api/green-api';
import { expectTokenFree } from '@shared/test/expect-token-free';
import { buildTestUrl, TEST_CREDENTIALS } from '@shared/test/fixtures/green-api';
import { getRejection } from '@shared/test/get-rejection';
import { server } from '@shared/test/msw/server';

const ENDPOINT_URL = buildTestUrl('deleteNotification', '/1234567');
const PARAMS = { receiptId: 1234567 };

describe('deleteNotification', () => {
  it('sends a DELETE with the receipt id after the token', async () => {
    server.use(http.delete(ENDPOINT_URL, () => HttpResponse.json({ result: true, reason: '' })));

    await expect(deleteNotification(TEST_CREDENTIALS, PARAMS)).resolves.toEqual({ result: true });
  });

  it('resolves with result false when the server did not delete anything', async () => {
    server.use(http.delete(ENDPOINT_URL, () => HttpResponse.json({ result: false, reason: 'notification not found' })));

    await expect(deleteNotification(TEST_CREDENTIALS, PARAMS)).resolves.toEqual({ result: false });
  });

  it('counts the 500 about an already gone notification as result false', async () => {
    server.use(
      http.delete(ENDPOINT_URL, () =>
        HttpResponse.text("Cannot read properties of undefined (reading 'findUnAckedMessage')", { status: 500 }),
      ),
    );

    await expect(deleteNotification(TEST_CREDENTIALS, PARAMS)).resolves.toEqual({ result: false });
  });

  it('counts the already gone 500 as result false when its text is in a JSON body', async () => {
    const body = { description: 'Internal Server Error', message: "reading 'findUnAckedMessage'" };
    server.use(http.delete(ENDPOINT_URL, () => HttpResponse.json(body, { status: 500 })));

    await expect(deleteNotification(TEST_CREDENTIALS, PARAMS)).resolves.toEqual({ result: false });
  });

  it('rejects on any other 500', async () => {
    server.use(http.delete(ENDPOINT_URL, () => HttpResponse.text('Internal Server Error', { status: 500 })));

    await expect(deleteNotification(TEST_CREDENTIALS, PARAMS)).rejects.toMatchObject({ kind: 'http', status: 500 });
  });

  it('rejects when findUnAckedMessage comes with another status', async () => {
    server.use(http.delete(ENDPOINT_URL, () => HttpResponse.text('findUnAckedMessage', { status: 502 })));

    await expect(deleteNotification(TEST_CREDENTIALS, PARAMS)).rejects.toMatchObject({ kind: 'http', status: 502 });
  });

  it('rejects with an auth error on 401, which has an empty body', async () => {
    server.use(http.delete(ENDPOINT_URL, () => new HttpResponse(null, { status: 401 })));

    const error = await getRejection(deleteNotification(TEST_CREDENTIALS, PARAMS));

    expect(isAuthError(error)).toBe(true);
    expectTokenFree(error, TEST_CREDENTIALS.apiTokenInstance);
  });

  it('rejects with a network error when the request fails', async () => {
    server.use(http.delete(ENDPOINT_URL, () => HttpResponse.error()));

    await expect(deleteNotification(TEST_CREDENTIALS, PARAMS)).rejects.toMatchObject({ kind: 'network' });
  });

  it.each([
    ['an empty body', new HttpResponse('', { status: 200 })],
    ['an empty object', HttpResponse.json({})],
    ['a result that is not a boolean', HttpResponse.json({ result: 'true' })],
  ])('rejects with a parse error for %s', async (_name, response) => {
    server.use(http.delete(ENDPOINT_URL, () => response));

    await expect(deleteNotification(TEST_CREDENTIALS, PARAMS)).rejects.toMatchObject({ kind: 'parse' });
  });
});
