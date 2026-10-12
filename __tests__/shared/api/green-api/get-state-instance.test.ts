import { delay, http, HttpResponse } from 'msw';

import { getStateInstance, isAuthError } from '@shared/api/green-api';
import { expectTokenFree } from '@shared/test/expect-token-free';
import { buildTestUrl, TEST_CREDENTIALS } from '@shared/test/fixtures/green-api';
import { getRejection } from '@shared/test/get-rejection';
import { server } from '@shared/test/msw/server';

const ENDPOINT_URL = buildTestUrl('getStateInstance');

describe('getStateInstance', () => {
  it('resolves with the state of the instance', async () => {
    server.use(http.get(ENDPOINT_URL, () => HttpResponse.json({ stateInstance: 'authorized' })));

    await expect(getStateInstance(TEST_CREDENTIALS)).resolves.toBe('authorized');
  });

  it('passes an unknown state through', async () => {
    server.use(http.get(ENDPOINT_URL, () => HttpResponse.json({ stateInstance: 'somethingNew' })));

    await expect(getStateInstance(TEST_CREDENTIALS)).resolves.toBe('somethingNew');
  });

  it('rejects with an auth error on 401, which has an empty body', async () => {
    server.use(http.get(ENDPOINT_URL, () => new HttpResponse(null, { status: 401 })));

    const error = await getRejection(getStateInstance(TEST_CREDENTIALS));

    expect(isAuthError(error)).toBe(true);
    expect(error).toMatchObject({ kind: 'http', status: 401 });
    expectTokenFree(error, TEST_CREDENTIALS.apiTokenInstance);
  });

  it('rejects with a network error when the request fails', async () => {
    server.use(http.get(ENDPOINT_URL, () => HttpResponse.error()));

    await expect(getStateInstance(TEST_CREDENTIALS)).rejects.toMatchObject({ kind: 'network' });
  });

  it('rejects with a timeout error when the timeout option elapses', async () => {
    server.use(
      http.get(ENDPOINT_URL, async () => {
        await delay(300);
        return HttpResponse.json({ stateInstance: 'authorized' });
      }),
    );

    await expect(getStateInstance(TEST_CREDENTIALS, { timeoutMs: 20 })).rejects.toMatchObject({ kind: 'timeout' });
  });

  it.each([
    ['an empty object', {}],
    ['a missing state', { other: 1 }],
    ['an empty state', { stateInstance: '' }],
    ['a state that is not a string', { stateInstance: 1 }],
    ['null', null],
    ['an array', ['authorized']],
  ])('rejects with a parse error for %s', async (_name, payload) => {
    server.use(http.get(ENDPOINT_URL, () => HttpResponse.json(payload)));

    await expect(getStateInstance(TEST_CREDENTIALS)).rejects.toMatchObject({ kind: 'parse' });
  });
});
