import {
  checkAccount,
  deleteNotification,
  getStateInstance,
  isQuotaError,
  isWebhookUrlError,
  parseNotification,
  receiveNotification,
  sendMessage,
} from '@shared/api/green-api';
import { getRejection } from '@shared/test/get-rejection';
import {
  createGreenApiHandlers,
  createGreenApiMockState,
  createMockCredentials,
  type GreenApiHandlersOptions,
  type GreenApiSeed,
  MOCK_TOKEN,
  PRIMARY_INSTANCE_ID,
  type Scheduler,
} from '@shared/test/msw/green-api';
import { server } from '@shared/test/msw/server';
import { trackSettled } from '@shared/test/track-settled';

interface UseMockOptions extends Partial<GreenApiHandlersOptions> {
  seed?: GreenApiSeed;
}

const ignoreEffects: Scheduler = () => undefined;

const useMock = ({ seed, latencyMs = 0, scheduler = ignoreEffects }: UseMockOptions = {}) => {
  const state = createGreenApiMockState({ seed });
  server.use(...createGreenApiHandlers(state, { latencyMs, scheduler }));

  return state;
};

const rawUrl = (method: string, { base = 'https://4100.api.green-api.com', idInstance = PRIMARY_INSTANCE_ID } = {}) =>
  `${base}/waInstance${idInstance}/${method}/${MOCK_TOKEN}`;

describe('createGreenApiHandlers', () => {
  describe('routing (MK-2)', () => {
    it('answers on the API URL derived from the instance id', async () => {
      useMock();

      await expect(getStateInstance(createMockCredentials())).resolves.toBe('authorized');
    });

    it.each(['https://example.test', 'http://localhost:3000', 'https://4100.api.green-api.com/'])(
      'answers on any origin: %s',
      async (apiUrl) => {
        useMock();

        await expect(getStateInstance({ ...createMockCredentials(), apiUrl })).resolves.toBe('authorized');
      },
    );

    it('answers behind the /green-api proxy prefix', async () => {
      useMock();

      const response = await fetch(rawUrl('getStateInstance', { base: 'http://localhost:3000/green-api' }));

      expect(await response.json()).toEqual({ stateInstance: 'authorized' });
    });

    it.each(['getstateinstance', 'GETSTATEINSTANCE', 'getStateInstance', 'GetStateInstance'])(
      'accepts the method name as %s',
      async (method) => {
        useMock();

        const response = await fetch(rawUrl(method));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ stateInstance: 'authorized' });
      },
    );

    it('accepts every method name in any letter case', async () => {
      useMock();

      const responses = await Promise.all([
        fetch(rawUrl('CHECKACCOUNT'), { method: 'POST', body: JSON.stringify({ phoneNumber: 79001234567 }) }),
        fetch(rawUrl('SENDMESSAGE'), { method: 'POST', body: JSON.stringify({ chatId: '1', message: 'a' }) }),
        fetch(`${rawUrl('RECEIVENOTIFICATION')}?receiveTimeout=5`),
        fetch(`${rawUrl('DELETENOTIFICATION')}/1`, { method: 'DELETE' }),
      ]);

      expect(responses.map(({ status }) => status)).toEqual([200, 200, 200, 200]);
    });

    it.each([
      ['an unknown method', 'GET', 'getSettings'],
      ['a known method with the wrong HTTP method', 'POST', 'getStateInstance'],
      ['a known method with the wrong HTTP method', 'GET', 'sendMessage'],
    ])('answers 404 for %s (%s %s)', async (_description, method, endpoint) => {
      useMock();

      const response = await fetch(rawUrl(endpoint), { method });

      expect(response.status).toBe(404);
    });
  });

  describe('credentials (MK-6)', () => {
    it.each([
      ['4100000001', 'authorized'],
      ['4100000002', 'notAuthorized'],
      ['4100000003', 'starting'],
      ['4100000004', 'blocked'],
      ['4100000005', 'authorized'],
      ['4100000006', 'authorized'],
    ])('instance %s is %s', async (idInstance, stateInstance) => {
      useMock();

      await expect(getStateInstance(createMockCredentials(idInstance))).resolves.toBe(stateInstance);
    });

    it('answers a 502 for the state of 4100000008', async () => {
      useMock();

      await expect(getRejection(getStateInstance(createMockCredentials('4100000008')))).resolves.toMatchObject({
        kind: 'http',
        status: 502,
      });
    });

    it('lets 4100000008 do everything but report its state', async () => {
      useMock();

      await expect(
        checkAccount(createMockCredentials('4100000008'), { phoneNumber: '79001234567' }),
      ).resolves.toMatchObject({ kind: 'found' });
    });

    it('fails every request of 4100000009 with a network error', async () => {
      useMock();
      const credentials = createMockCredentials('4100000009');

      const errors = await Promise.all([
        getRejection(getStateInstance(credentials)),
        getRejection(checkAccount(credentials, { phoneNumber: '79001234567' })),
        getRejection(sendMessage(credentials, { chatId: '10000000', message: 'Hi' })),
        getRejection(receiveNotification(credentials)),
        getRejection(deleteNotification(credentials, { receiptId: 1 })),
      ]);

      expect(errors).toHaveLength(5);
      for (const error of errors) {
        expect(error).toMatchObject({ kind: 'network' });
      }
    });

    it('fails 4100000009 with a network error even for a wrong token', async () => {
      useMock();

      await expect(getRejection(getStateInstance(createMockCredentials('4100000009', 'wrong')))).resolves.toMatchObject(
        { kind: 'network' },
      );
    });

    it('fails 4100000009 with a network error even for an unknown method', async () => {
      useMock();

      await expect(fetch(rawUrl('getSettings', { idInstance: '4100000009' }))).rejects.toThrow();
    });

    it('answers 401 with an empty body for a wrong token', async () => {
      useMock();

      const response = await fetch(rawUrl('getStateInstance').replace(MOCK_TOKEN, 'wrong'));

      expect(response.status).toBe(401);
      expect(await response.text()).toBe('');
      expect(response.headers.get('content-type')).toBe('application/json');
    });

    it.each(['4100000001', '4100000006'])('rejects a wrong token for the known instance %s', async (idInstance) => {
      useMock();

      await expect(getRejection(getStateInstance(createMockCredentials(idInstance, 'wrong')))).resolves.toMatchObject({
        kind: 'http',
        status: 401,
        serverMessage: undefined,
      });
    });

    it.each(['4100000007', '4100999999', '4100123456'])(
      'answers 401 for the unknown instance %s, even with the mock token',
      async (idInstance) => {
        useMock();

        await expect(getRejection(getStateInstance(createMockCredentials(idInstance)))).resolves.toMatchObject({
          kind: 'http',
          status: 401,
        });
      },
    );

    it('answers 401 for a wrong token on every endpoint', async () => {
      useMock();
      const credentials = createMockCredentials(PRIMARY_INSTANCE_ID, 'wrong');

      const errors = await Promise.all([
        getRejection(checkAccount(credentials, { phoneNumber: '79001234567' })),
        getRejection(sendMessage(credentials, { chatId: '10000000', message: 'Hi' })),
        getRejection(receiveNotification(credentials)),
        getRejection(deleteNotification(credentials, { receiptId: 1 })),
      ]);

      for (const error of errors) {
        expect(error).toMatchObject({ kind: 'http', status: 401 });
      }
    });

    describe('host of the request', () => {
      it('answers a known instance on the host that matches its first 4 digits', async () => {
        useMock();

        await expect(
          getStateInstance({ ...createMockCredentials(), apiUrl: 'https://4100.api.green-api.com' }),
        ).resolves.toBe('authorized');
      });

      it.each(['https://7103.api.green-api.com', 'https://1101.api.green-api.com'])(
        'fails with a network error on the host %s, which does not serve the instance',
        async (apiUrl) => {
          useMock();

          await expect(getRejection(getStateInstance({ ...createMockCredentials(), apiUrl }))).resolves.toMatchObject({
            kind: 'network',
          });
        },
      );

      it('fails with a network error for an unknown instance on a host of another range', async () => {
        useMock();

        await expect(
          getRejection(
            getStateInstance({ ...createMockCredentials('7103000000'), apiUrl: 'https://4100.api.green-api.com' }),
          ),
        ).resolves.toMatchObject({ kind: 'network' });
      });

      it('answers 401 for an unknown instance on the host of its own range', async () => {
        useMock();

        await expect(
          getRejection(
            getStateInstance({ ...createMockCredentials('7103000000'), apiUrl: 'https://7103.api.green-api.com' }),
          ),
        ).resolves.toMatchObject({ kind: 'http', status: 401 });
      });

      it.each([
        'http://localhost:3000/green-api',
        'https://example.test',
        'https://api.green-api.com',
        'https://41000.api.green-api.com',
      ])('does not check the instance against the host %s', async (base) => {
        useMock();

        const response = await fetch(rawUrl('getStateInstance', { base }));

        expect(response.status).toBe(200);
      });
    });

    describe('4100000005 (webhook url set)', () => {
      it('fails receiveNotification and deleteNotification with the webhook url 400', async () => {
        useMock({ seed: { '4100000005': ['a'] } });
        const credentials = createMockCredentials('4100000005');

        const errors = await Promise.all([
          getRejection(receiveNotification(credentials)),
          getRejection(deleteNotification(credentials, { receiptId: 1 })),
        ]);

        for (const error of errors) {
          expect(isWebhookUrlError(error)).toBe(true);
          expect(error).toMatchObject({ serverMessage: expect.stringContaining('4100000005') as unknown });
        }
      });

      it('answers receiveNotification at once instead of waiting', async () => {
        jest.useFakeTimers();

        try {
          useMock();
          const result = trackSettled(receiveNotification(createMockCredentials('4100000005')));

          await jest.advanceTimersByTimeAsync(0);

          expect(result.isSettled).toBe(true);
        } finally {
          jest.useRealTimers();
        }
      });

      it('lets everything else work', async () => {
        useMock();
        const credentials = createMockCredentials('4100000005');

        await expect(checkAccount(credentials, { phoneNumber: '79001234567' })).resolves.toMatchObject({
          kind: 'found',
        });
        await expect(sendMessage(credentials, { chatId: '10000000', message: 'Hi #noreply' })).resolves.toEqual({
          idMessage: expect.stringMatching(/^\d{19}$/) as unknown,
        });
      });
    });

    describe('4100000006 (quota exceeded)', () => {
      it('queues a quotaExceeded notification on every login', async () => {
        const state = useMock();
        const credentials = createMockCredentials('4100000006');

        await getStateInstance(credentials);
        await getStateInstance(credentials);

        expect(state.getQueueLength('4100000006')).toBe(2);
        expect(parseNotification(state.peek('4100000006')?.body, '4100000006')).toMatchObject({
          type: 'quota',
          description: expect.any(String) as unknown,
        });
      });

      it('queues nothing for the other instances', async () => {
        const state = useMock();

        await getStateInstance(createMockCredentials('4100000005'));
        await getStateInstance(createMockCredentials());

        expect(state.getQueueLength('4100000005')).toBe(0);
        expect(state.getQueueLength(PRIMARY_INSTANCE_ID)).toBe(0);
      });

      it('answers checkAccount and sendMessage with a 466', async () => {
        useMock();
        const credentials = createMockCredentials('4100000006');

        const errors = await Promise.all([
          getRejection(checkAccount(credentials, { phoneNumber: '79001234567' })),
          getRejection(sendMessage(credentials, { chatId: '10000000', message: 'Hi' })),
        ]);

        for (const error of errors) {
          expect(isQuotaError(error)).toBe(true);
          expect(error).toMatchObject({ serverMessage: expect.any(String) as unknown });
        }
      });
    });
  });

  describe('latency (MK-5)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('delays a call by the given time', async () => {
      useMock({ latencyMs: 300 });
      const result = trackSettled(getStateInstance(createMockCredentials()));

      await jest.advanceTimersByTimeAsync(299);
      expect(result.isSettled).toBe(false);

      await jest.advanceTimersByTimeAsync(1);
      expect(result.isSettled).toBe(true);
    });

    it.each([
      [0, 300],
      [0.5, 400],
      [0.999, 500],
    ])('draws the delay of a range from random value %p: %p ms', async (random, delayMs) => {
      jest.spyOn(Math, 'random').mockReturnValue(random);
      useMock({ latencyMs: { min: 300, max: 500 } });
      const result = trackSettled(getStateInstance(createMockCredentials()));

      await jest.advanceTimersByTimeAsync(delayMs - 2);
      expect(result.isSettled).toBe(false);

      await jest.advanceTimersByTimeAsync(2);
      expect(result.isSettled).toBe(true);
    });

    it.each([
      ['a rejected token', createMockCredentials(PRIMARY_INSTANCE_ID, 'wrong')],
      ['an unknown instance', createMockCredentials('4100000007')],
    ])('delays the answer for %s as well', async (_description, credentials) => {
      useMock({ latencyMs: 300 });
      const result = trackSettled(getStateInstance(credentials));

      await jest.advanceTimersByTimeAsync(299);
      expect(result.isSettled).toBe(false);

      await jest.advanceTimersByTimeAsync(1);
      expect(result.isSettled).toBe(true);
    });

    it.each([
      ['an instance that is unreachable', '4100000009', 'https://4100.api.green-api.com'],
      ['a host that does not serve the instance', PRIMARY_INSTANCE_ID, 'https://7103.api.green-api.com'],
    ])('delays the network error for %s, so the login spinner shows', async (_description, idInstance, apiUrl) => {
      useMock({ latencyMs: 300 });
      const result = trackSettled(getStateInstance({ ...createMockCredentials(idInstance), apiUrl }));

      await jest.advanceTimersByTimeAsync(299);
      expect(result.isSettled).toBe(false);

      await jest.advanceTimersByTimeAsync(1);
      expect(result.isSettled).toBe(true);
    });

    it('delays the 404 for an unknown method', async () => {
      useMock({ latencyMs: 300 });
      const result = trackSettled(fetch(rawUrl('getSettings')));

      await jest.advanceTimersByTimeAsync(299);
      expect(result.isSettled).toBe(false);

      await jest.advanceTimersByTimeAsync(1);
      expect(result.isSettled).toBe(true);
    });

    it('fails at once, without the delay, while the mock is offline', async () => {
      const state = useMock({ latencyMs: 300 });
      state.setOffline(true);
      const result = trackSettled(getStateInstance(createMockCredentials()));

      await jest.advanceTimersByTimeAsync(0);

      expect(result.isSettled).toBe(true);
    });

    it('does not delay receiveNotification', async () => {
      useMock({ latencyMs: 300, seed: { [PRIMARY_INSTANCE_ID]: ['a'] } });
      const result = trackSettled(receiveNotification(createMockCredentials()));

      await jest.advanceTimersByTimeAsync(0);

      expect(result.isSettled).toBe(true);
    });

    it('stops waiting when the request is aborted, without leaving a timer', async () => {
      useMock({ latencyMs: 300 });
      const controller = new AbortController();
      const rejection = getRejection(getStateInstance(createMockCredentials(), { signal: controller.signal }));

      await jest.advanceTimersByTimeAsync(100);
      controller.abort();

      await expect(rejection).resolves.toMatchObject({ kind: 'aborted' });
      await jest.advanceTimersByTimeAsync(0);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('does nothing for a request aborted during the delay', async () => {
      const state = useMock({ latencyMs: 300 });
      const controller = new AbortController();
      const rejection = getRejection(
        getStateInstance(createMockCredentials('4100000006'), { signal: controller.signal }),
      );

      controller.abort();
      await rejection;
      await jest.advanceTimersByTimeAsync(1000);

      expect(state.getQueueLength('4100000006')).toBe(0);
    });
  });

  describe('offline', () => {
    it('fails every request with a network error while the mock is offline', async () => {
      const state = useMock();
      state.setOffline(true);
      const credentials = createMockCredentials();

      const errors = await Promise.all([
        getRejection(getStateInstance(credentials)),
        getRejection(checkAccount(credentials, { phoneNumber: '79001234567' })),
        getRejection(sendMessage(credentials, { chatId: '10000000', message: 'Hi' })),
        getRejection(receiveNotification(credentials)),
        getRejection(deleteNotification(credentials, { receiptId: 1 })),
        getRejection(getStateInstance(createMockCredentials('4100000007'))),
      ]);

      for (const error of errors) {
        expect(error).toMatchObject({ kind: 'network' });
      }
    });

    it('answers again once it is back online', async () => {
      const state = useMock();
      state.setOffline(true);
      state.setOffline(false);

      await expect(getStateInstance(createMockCredentials())).resolves.toBe('authorized');
    });
  });

  describe('active instance', () => {
    it('is the one that was authenticated last', async () => {
      const state = useMock();

      await getStateInstance(createMockCredentials('4100000006'));

      expect(state.activeInstance).toBe('4100000006');
    });

    it('is not changed by a rejected request', async () => {
      const state = useMock();

      await getRejection(getStateInstance(createMockCredentials('4100000006', 'wrong')));
      await getRejection(getStateInstance(createMockCredentials('4100000007')));

      expect(state.activeInstance).toBe(PRIMARY_INSTANCE_ID);
    });
  });
});
