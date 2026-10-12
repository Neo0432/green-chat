import { delay, http, HttpResponse } from 'msw';

import { GreenApiError } from '@shared/api/green-api';
import { DEFAULT_TIMEOUT_MS, request } from '@shared/api/green-api/request';
import { ENV } from '@shared/config';
import { expectTokenFree } from '@shared/test/expect-token-free';
import { buildTestUrl, TEST_CREDENTIALS } from '@shared/test/fixtures/green-api';
import { getRejection } from '@shared/test/get-rejection';
import { server } from '@shared/test/msw/server';

const { apiTokenInstance } = TEST_CREDENTIALS;
const GET_STATE = { method: 'GET', endpoint: 'getStateInstance' } as const;
const STATE_URL = buildTestUrl('getStateInstance');

describe('request', () => {
  describe('success', () => {
    it('resolves with the parsed JSON body', async () => {
      server.use(http.get(STATE_URL, () => HttpResponse.json({ stateInstance: 'authorized' })));

      await expect(request(TEST_CREDENTIALS, GET_STATE)).resolves.toEqual({ stateInstance: 'authorized' });
    });

    it('sends a GET without a body and without a content type', async () => {
      let seen: Request | undefined;
      server.use(
        http.get(STATE_URL, ({ request: incoming }) => {
          seen = incoming;
          return HttpResponse.json({});
        }),
      );

      await request(TEST_CREDENTIALS, GET_STATE);

      expect(seen?.method).toBe('GET');
      expect(seen?.headers.get('content-type')).toBeNull();
      expect(seen?.body).toBeNull();
    });

    it('sends a POST body as JSON with a content type', async () => {
      let seen: { contentType: string | null; body: unknown } | undefined;
      server.use(
        http.post(buildTestUrl('sendMessage'), async ({ request: incoming }) => {
          seen = { contentType: incoming.headers.get('content-type'), body: await incoming.json() };
          return HttpResponse.json({ idMessage: '1' });
        }),
      );

      await request(TEST_CREDENTIALS, {
        method: 'POST',
        endpoint: 'sendMessage',
        body: { chatId: '1', message: 'Hi' },
      });

      expect(seen).toEqual({ contentType: 'application/json', body: { chatId: '1', message: 'Hi' } });
    });

    it('sends a DELETE with the suffix after the token and no content type', async () => {
      let seen: Request | undefined;
      server.use(
        http.delete(buildTestUrl('deleteNotification', '/42'), ({ request: incoming }) => {
          seen = incoming;
          return HttpResponse.json({ result: true });
        }),
      );

      await request(TEST_CREDENTIALS, { method: 'DELETE', endpoint: 'deleteNotification', suffix: '42' });

      expect(seen?.method).toBe('DELETE');
      expect(seen?.headers.get('content-type')).toBeNull();
    });

    it('sends the query string', async () => {
      let seenQuery: string | null = null;
      server.use(
        http.get(buildTestUrl('receiveNotification'), ({ request: incoming }) => {
          seenQuery = new URL(incoming.url).searchParams.get('receiveTimeout');
          return HttpResponse.json(null);
        }),
      );

      await request(TEST_CREDENTIALS, { method: 'GET', endpoint: 'receiveNotification', query: { receiveTimeout: 5 } });

      expect(seenQuery).toBe('5');
    });

    it.each([
      ['an empty body', ''],
      ['a whitespace body', ' \n'],
      ['a null body', 'null'],
    ])('resolves with null for %s', async (_name, text) => {
      server.use(http.get(STATE_URL, () => new HttpResponse(text, { status: 200 })));

      await expect(request(TEST_CREDENTIALS, GET_STATE)).resolves.toBeNull();
    });

    it('resolves with null for 204 No Content', async () => {
      server.use(http.get(STATE_URL, () => new HttpResponse(null, { status: 204 })));

      await expect(request(TEST_CREDENTIALS, GET_STATE)).resolves.toBeNull();
    });

    it('requests the same-origin proxy path when the proxy is configured', async () => {
      jest.replaceProperty(ENV, 'greenApiProxyTarget', 'https://4100.api.green-api.com');
      server.use(
        http.get(`/green-api/waInstance4100000000/getStateInstance/${apiTokenInstance}`, () =>
          HttpResponse.json({ stateInstance: 'authorized' }),
        ),
      );

      await expect(request(TEST_CREDENTIALS, GET_STATE)).resolves.toEqual({ stateInstance: 'authorized' });
    });
  });

  describe('parse errors', () => {
    it('rejects with a parse error when the body is not JSON', async () => {
      server.use(http.get(STATE_URL, () => HttpResponse.text('<html>Bad gateway page</html>')));

      await expect(request(TEST_CREDENTIALS, GET_STATE)).rejects.toMatchObject({ kind: 'parse' });
    });
  });

  describe('http errors', () => {
    it('rejects with the status and the server text on a non-2xx response', async () => {
      server.use(http.get(STATE_URL, () => HttpResponse.text('Internal Server Error', { status: 500 })));

      const error = await getRejection(request(TEST_CREDENTIALS, GET_STATE));

      expect(error).toBeInstanceOf(GreenApiError);
      expect(error).toMatchObject({ kind: 'http', status: 500, serverMessage: 'Internal Server Error' });
    });

    it('has no server message for a 401, whose body is empty', async () => {
      server.use(http.get(STATE_URL, () => new HttpResponse(null, { status: 401 })));

      const error = await getRejection(request(TEST_CREDENTIALS, GET_STATE));

      expect(error).toMatchObject({ kind: 'http', status: 401, serverMessage: undefined });
    });

    it('reads the human text of a JSON error body', async () => {
      server.use(
        http.get(STATE_URL, () =>
          HttpResponse.json({ status: false, reason: 'Rate limited by messenger' }, { status: 469 }),
        ),
      );

      await expect(request(TEST_CREDENTIALS, GET_STATE)).rejects.toMatchObject({
        kind: 'http',
        status: 469,
        serverMessage: 'Rate limited by messenger',
      });
    });

    it('reads the nested description of a 466 body instead of returning raw JSON', async () => {
      const body = { invokeStatus: { method: 'checkAccount', used: 100, total: 100, description: 'Quota exceeded' } };
      server.use(http.get(STATE_URL, () => HttpResponse.json(body, { status: 466 })));

      await expect(request(TEST_CREDENTIALS, GET_STATE)).rejects.toMatchObject({
        kind: 'http',
        status: 466,
        serverMessage: 'Quota exceeded',
      });
    });

    it('keeps at most 300 characters of the server text', async () => {
      server.use(http.get(STATE_URL, () => HttpResponse.text('x'.repeat(5000), { status: 500 })));

      const error = await getRejection(request(TEST_CREDENTIALS, GET_STATE));

      expect(error).toMatchObject({ serverMessage: 'x'.repeat(300) });
    });

    it('redacts the token from the server message and from the error text', async () => {
      server.use(
        http.get(STATE_URL, ({ request: incoming }) =>
          HttpResponse.text(`Cannot GET ${new URL(incoming.url).pathname}`, { status: 404 }),
        ),
      );

      const error = await getRejection(request(TEST_CREDENTIALS, GET_STATE));

      expect(error).toMatchObject({
        status: 404,
        serverMessage: `Cannot GET /waInstance4100000000/getStateInstance/***`,
      });
      expectTokenFree(error, apiTokenInstance);
    });
  });

  describe('bad arguments', () => {
    it('throws a token that cannot be put into a url as is, instead of reporting a network error', async () => {
      const credentials = { ...TEST_CREDENTIALS, apiTokenInstance: `broken${String.fromCharCode(0xd800)}token` };

      const error = await getRejection(request(credentials, GET_STATE));

      expect(error).toBeInstanceOf(URIError);
    });
  });

  describe('network errors', () => {
    it('rejects with a network error when the request cannot be made', async () => {
      server.use(http.get(STATE_URL, () => HttpResponse.error()));

      const error = await getRejection(request(TEST_CREDENTIALS, GET_STATE));

      expect(error).toBeInstanceOf(GreenApiError);
      expect(error).toMatchObject({ kind: 'network', status: undefined });
    });

    it('does not keep the original error, which could hold the request url', async () => {
      server.use(http.get(STATE_URL, () => HttpResponse.error()));

      const error = await getRejection(request(TEST_CREDENTIALS, GET_STATE));

      expect(error instanceof Error ? error.cause : null).toBeUndefined();
      expectTokenFree(error, apiTokenInstance);
    });
  });

  describe('timeout', () => {
    it('rejects with a timeout error when the server is too slow', async () => {
      server.use(
        http.get(STATE_URL, async () => {
          await delay(300);
          return HttpResponse.json({});
        }),
      );

      const error = await getRejection(request(TEST_CREDENTIALS, GET_STATE, { timeoutMs: 20 }));

      expect(error).toMatchObject({ kind: 'timeout' });
      expectTokenFree(error, apiTokenInstance);
    });

    it('uses a 15 second timeout by default', async () => {
      const setTimeoutSpy = jest.spyOn(globalThis, 'setTimeout');
      server.use(http.get(STATE_URL, () => HttpResponse.json({})));

      await request(TEST_CREDENTIALS, GET_STATE);

      expect(DEFAULT_TIMEOUT_MS).toBe(15_000);
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 15_000);
    });

    it('times out even when the caller passes a signal', async () => {
      server.use(
        http.get(STATE_URL, async () => {
          await delay(300);
          return HttpResponse.json({});
        }),
      );

      const error = await getRejection(
        request(TEST_CREDENTIALS, GET_STATE, { signal: new AbortController().signal, timeoutMs: 20 }),
      );

      expect(error).toMatchObject({ kind: 'timeout' });
    });

    it('stops its own timer once the request is done', async () => {
      const setTimeoutSpy = jest.spyOn(globalThis, 'setTimeout');
      const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');
      server.use(http.get(STATE_URL, () => HttpResponse.json({})));

      await request(TEST_CREDENTIALS, GET_STATE, { timeoutMs: 12_345 });

      const timerCall = setTimeoutSpy.mock.calls.findIndex(([, delayMs]) => delayMs === 12_345);
      const timerId: unknown = setTimeoutSpy.mock.results.at(timerCall)?.value;

      expect(timerCall).toBeGreaterThanOrEqual(0);
      expect(clearTimeoutSpy).toHaveBeenCalledWith(timerId);
    });
  });

  describe('abort', () => {
    it('rejects with an aborted error when the caller aborts the request', async () => {
      const controller = new AbortController();
      server.use(
        http.get(STATE_URL, async () => {
          await delay(300);
          return HttpResponse.json({});
        }),
      );

      const pending = getRejection(request(TEST_CREDENTIALS, GET_STATE, { signal: controller.signal }));
      setTimeout(() => {
        controller.abort();
      }, 20);

      const error = await pending;

      expect(error).toBeInstanceOf(GreenApiError);
      expect(error).toMatchObject({ kind: 'aborted' });
      expectTokenFree(error, apiTokenInstance);
    });

    it('rejects with an aborted error when the signal is already aborted', async () => {
      server.use(http.get(STATE_URL, () => HttpResponse.json({})));

      const error = await getRejection(request(TEST_CREDENTIALS, GET_STATE, { signal: AbortSignal.abort() }));

      expect(error).toMatchObject({ kind: 'aborted' });
    });
  });
});
