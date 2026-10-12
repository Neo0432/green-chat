import { http, HttpResponse } from 'msw';

import { isAuthError, isQuotaError, sendMessage } from '@shared/api/green-api';
import { expectTokenFree } from '@shared/test/expect-token-free';
import { buildTestUrl, TEST_CREDENTIALS } from '@shared/test/fixtures/green-api';
import { getRejection } from '@shared/test/get-rejection';
import { server } from '@shared/test/msw/server';

const ENDPOINT_URL = buildTestUrl('sendMessage');
const PARAMS = { chatId: '10000000', message: 'Hello' };

describe('sendMessage', () => {
  it('posts the chat id and the text and resolves with the message id', async () => {
    let body: unknown;
    server.use(
      http.post(ENDPOINT_URL, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ idMessage: '1769676078000' });
      }),
    );

    await expect(sendMessage(TEST_CREDENTIALS, PARAMS)).resolves.toEqual({ idMessage: '1769676078000' });
    expect(body).toEqual({ chatId: '10000000', message: 'Hello' });
  });

  it('rejects with an auth error on 401, which has an empty body', async () => {
    server.use(http.post(ENDPOINT_URL, () => new HttpResponse(null, { status: 401 })));

    const error = await getRejection(sendMessage(TEST_CREDENTIALS, PARAMS));

    expect(isAuthError(error)).toBe(true);
    expectTokenFree(error, TEST_CREDENTIALS.apiTokenInstance);
  });

  it('rejects with a quota error on 466 and reads the nested description', async () => {
    const body = {
      correspondentsStatus: { method: 'correspondents', used: 3, total: 3, description: 'Chat quota exceeded' },
    };
    server.use(http.post(ENDPOINT_URL, () => HttpResponse.json(body, { status: 466 })));

    const error = await getRejection(sendMessage(TEST_CREDENTIALS, PARAMS));

    expect(isQuotaError(error)).toBe(true);
    expect(error).toMatchObject({ serverMessage: 'Chat quota exceeded' });
  });

  it('rejects with the server text on a 400 validation error', async () => {
    server.use(http.post(ENDPOINT_URL, () => HttpResponse.text('Validation failed', { status: 400 })));

    await expect(sendMessage(TEST_CREDENTIALS, PARAMS)).rejects.toMatchObject({
      kind: 'http',
      status: 400,
      serverMessage: 'Validation failed',
    });
  });

  it('rejects with a network error when the request fails', async () => {
    server.use(http.post(ENDPOINT_URL, () => HttpResponse.error()));

    await expect(sendMessage(TEST_CREDENTIALS, PARAMS)).rejects.toMatchObject({ kind: 'network' });
  });

  it('rejects with an aborted error when the caller aborts', async () => {
    server.use(http.post(ENDPOINT_URL, () => HttpResponse.json({ idMessage: '1' })));

    await expect(sendMessage(TEST_CREDENTIALS, PARAMS, { signal: AbortSignal.abort() })).rejects.toMatchObject({
      kind: 'aborted',
    });
  });

  it.each([
    ['an empty object', {}],
    ['an empty id', { idMessage: '' }],
    ['an id that is not a string', { idMessage: 123 }],
    ['null', null],
  ])('rejects with a parse error for %s', async (_name, payload) => {
    server.use(http.post(ENDPOINT_URL, () => HttpResponse.json(payload)));

    await expect(sendMessage(TEST_CREDENTIALS, PARAMS)).rejects.toMatchObject({ kind: 'parse' });
  });
});
