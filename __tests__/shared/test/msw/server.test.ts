import { http, HttpResponse } from 'msw';

import { server } from '@shared/test/msw/server';

const PING_URL = 'https://api.example.test/ping';

describe('msw server', () => {
  it('answers with a handler registered for the test', async () => {
    server.use(http.get(PING_URL, () => HttpResponse.json({ ok: true })));

    const response = await fetch(PING_URL);

    expect(await response.json()).toEqual({ ok: true });
  });

  it('reports a request that has no handler as an error', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(fetch(PING_URL)).rejects.toThrow();

    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('without a matching request handler'));
  });
});
