import {
  checkAccount,
  deleteNotification,
  getStateInstance,
  isQuotaError,
  parseNotification,
  receiveNotification,
  sendMessage,
} from '@shared/api/green-api';
import { createRecordingScheduler } from '@shared/test/create-recording-scheduler';
import { drainNotifications } from '@shared/test/drain-notifications';
import { getRejection } from '@shared/test/get-rejection';
import {
  createGreenApiHandlers,
  createGreenApiMockState,
  createMockCredentials,
  createSeed,
  type GreenApiSeed,
  MOCK_TOKEN,
  PRIMARY_INSTANCE_ID,
  type Scheduler,
} from '@shared/test/msw/green-api';
import { server } from '@shared/test/msw/server';
import { trackSettled } from '@shared/test/track-settled';

const credentials = createMockCredentials();
const BASE_URL = 'https://4100.api.green-api.com';

const useMock = ({ seed, scheduler }: { seed?: GreenApiSeed; scheduler?: Scheduler } = {}) => {
  const state = createGreenApiMockState({ seed });
  server.use(...createGreenApiHandlers(state, { latencyMs: 0, scheduler }));

  return state;
};

const rawUrl = (method: string, idInstance = PRIMARY_INSTANCE_ID, token = MOCK_TOKEN) =>
  `${BASE_URL}/waInstance${idInstance}/${method}/${token}`;

const post = (method: string, body: unknown) =>
  fetch(rawUrl(method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('getStateInstance', () => {
  it('answers the state that was set for the instance', async () => {
    const state = useMock();
    state.setStateInstance(PRIMARY_INSTANCE_ID, 'blocked');

    await expect(getStateInstance(credentials)).resolves.toBe('blocked');
  });
});

describe('checkAccount (MK-7)', () => {
  it('finds a phone and answers a deterministic 8-digit chat id built from its last 7 digits', async () => {
    useMock();

    await expect(checkAccount(credentials, { phoneNumber: '79001234567' })).resolves.toEqual({
      kind: 'found',
      chatId: '11234567',
    });
  });

  it('answers the same chat id for the same phone', async () => {
    useMock();

    const first = await checkAccount(credentials, { phoneNumber: '79995554433' });
    const second = await checkAccount(credentials, { phoneNumber: '79995554433' });

    expect(first).toEqual(second);
    expect(first).toEqual({ kind: 'found', chatId: '15554433' });
  });

  it('adds the 7 digits to 10000000 for a short phone as well', async () => {
    useMock();

    await expect(checkAccount(credentials, { phoneNumber: '1234567' })).resolves.toEqual({
      kind: 'found',
      chatId: '11234567',
    });
  });

  it('remembers which phone the chat id belongs to', async () => {
    const state = useMock();

    await checkAccount(credentials, { phoneNumber: '79001234567' });

    expect(state.getPhone('11234567')).toBe('79001234567');
  });

  it('answers with the live shape of a found account', async () => {
    useMock();

    const response = await post('checkAccount', { phoneNumber: 79001234567 });

    expect(await response.json()).toEqual({
      exist: true,
      chatId: '11234567',
      phoneNumber: 79001234567,
      fromCache: false,
    });
  });

  it('says a phone ending with 0000 does not exist', async () => {
    useMock();

    await expect(checkAccount(credentials, { phoneNumber: '79000000000' })).resolves.toEqual({ kind: 'not-found' });
    expect(await (await post('checkAccount', { phoneNumber: 79000000000 })).json()).toEqual({
      exist: false,
      chatId: '',
    });
  });

  it('does not remember a phone that does not exist', async () => {
    const state = useMock();

    await checkAccount(credentials, { phoneNumber: '79000000000' });

    expect(state.getPhone('10000000')).toBeNull();
  });

  it('answers 469 for a phone ending with 4690', async () => {
    useMock();

    const response = await post('checkAccount', { phoneNumber: 79001234690 });

    expect(response.status).toBe(469);
    expect(await response.json()).toEqual({ status: false, reason: 'Rate limited by messenger' });
    await expect(getRejection(checkAccount(credentials, { phoneNumber: '79001234690' }))).resolves.toMatchObject({
      kind: 'http',
      status: 469,
      serverMessage: 'Rate limited by messenger',
    });
  });

  it('answers a 200 rate limit with the reason nested in data for a phone ending with 2000', async () => {
    useMock();

    const response = await post('checkAccount', { phoneNumber: 79001232000 });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: false,
      data: { status: 'fail', reason: 'rate_limit_exceeded', retryAfter: 7200 },
    });
    await expect(checkAccount(credentials, { phoneNumber: '79001232000' })).resolves.toEqual({
      kind: 'unavailable',
      reason: 'rate_limit_exceeded',
    });
  });

  it('answers 500 for a phone ending with 5000', async () => {
    useMock();

    const response = await post('checkAccount', { phoneNumber: 79001235000 });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ status: false, reason: 'Messenger is temporarily unavailable' });
    await expect(getRejection(checkAccount(credentials, { phoneNumber: '79001235000' }))).resolves.toMatchObject({
      kind: 'http',
      status: 500,
      serverMessage: 'Messenger is temporarily unavailable',
    });
  });

  it('answers 429 for a phone ending with 4290', async () => {
    useMock();

    await expect(getRejection(checkAccount(credentials, { phoneNumber: '79001234290' }))).resolves.toMatchObject({
      kind: 'http',
      status: 429,
    });
  });

  it('is not available on an instance that is not authorized', async () => {
    const state = useMock();
    state.setStateInstance(PRIMARY_INSTANCE_ID, 'notAuthorized');

    await expect(checkAccount(credentials, { phoneNumber: '79001234567' })).resolves.toEqual({
      kind: 'unavailable',
      reason: 'instance is starting or not authorized',
    });
    expect(state.getPhone('11234567')).toBeNull();
  });

  it('answers the live 466 body when the quota of the instance is gone', async () => {
    useMock();
    const response = await fetch(rawUrl('checkAccount', '4100000006'), {
      method: 'POST',
      body: JSON.stringify({ phoneNumber: 79001234567 }),
    });

    expect(response.status).toBe(466);
    expect(await response.json()).toEqual({
      invokeStatus: {
        method: 'checkAccount',
        used: 100,
        total: 100,
        status: 'QUOTE_EXCEEDED',
        description: expect.stringContaining('Monthly quota has been exceeded') as unknown,
      },
    });
  });

  it('lets the client read the text of the 466', async () => {
    useMock();

    const error = await getRejection(checkAccount(createMockCredentials('4100000006'), { phoneNumber: '79001234567' }));

    expect(isQuotaError(error)).toBe(true);
    expect(error).toMatchObject({
      serverMessage: expect.stringContaining('Monthly quota has been exceeded') as unknown,
    });
  });

  it('answers a 200 with the reason when the request has no phone', async () => {
    useMock();

    const response = await post('checkAccount', {});

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: false,
      reason: "request should contain 'phoneNumber' or 'username'",
    });
  });

  it.each([
    ['a phone sent as a string', { phoneNumber: '79001234567' }],
    ['a negative phone', { phoneNumber: -79001234567 }],
    ['a phone with decimals', { phoneNumber: 7900.5 }],
    ['a body that is not an object', '[1]'],
    ['a body that is not JSON', 'phone=7900'],
  ])('rejects %s with a 400', async (_description, body) => {
    useMock();

    const response = await post('checkAccount', body);

    expect(response.status).toBe(400);
    expect(await response.text()).toContain('Validation failed');
  });
});

describe('sendMessage (MK-8)', () => {
  describe('validation', () => {
    it.each(['10000000', '-1000000000001', '79876543210@c.us'])('accepts the chat id %s', async (chatId) => {
      useMock({ scheduler: createRecordingScheduler().scheduler });

      await expect(sendMessage(credentials, { chatId, message: 'Hi #noreply' })).resolves.toEqual({
        idMessage: expect.stringMatching(/^\d{19}$/) as unknown,
      });
    });

    it.each(['', 'abc', '1.5', '@c.us', '123@g.us', 'phone@c.us', ' 10000000'])(
      'rejects the chat id %p with a 400',
      async (chatId) => {
        useMock();

        const response = await post('sendMessage', { chatId, message: 'Hi' });

        expect(response.status).toBe(400);
        expect(await response.text()).toContain("Validation failed. Details: 'chatId' must be one of the next formats");
      },
    );

    it.each([
      ['no chat id', { message: 'Hi' }],
      ['a numeric chat id', { chatId: 10000000, message: 'Hi' }],
    ])('rejects %s with a 400', async (_description, body) => {
      useMock();

      expect((await post('sendMessage', body)).status).toBe(400);
    });

    it.each([
      ['an empty message', ''],
      ['a message that is not a string', 5],
      ['a message of 4097 characters', 'x'.repeat(4097)],
    ])('rejects %s with the 4096 text', async (_description, message) => {
      useMock();

      const response = await post('sendMessage', { chatId: '10000000', message });

      expect(response.status).toBe(400);
      expect(await response.text()).toBe(
        "Validation failed. Details: 'message' length must be less than or equal to 4096 characters long",
      );
    });

    it('accepts a message of exactly 4096 characters', async () => {
      useMock({ scheduler: createRecordingScheduler().scheduler });

      const response = await post('sendMessage', { chatId: '10000000', message: 'x'.repeat(4096) });

      expect(response.status).toBe(200);
    });

    it('rejects a body that is not JSON with a 400', async () => {
      useMock();

      expect((await post('sendMessage', 'not json')).status).toBe(400);
    });

    it('queues nothing for a rejected message', async () => {
      const state = useMock();

      await post('sendMessage', { chatId: 'abc', message: 'Hi' });

      expect(state.getQueueLength(PRIMARY_INSTANCE_ID)).toBe(0);
    });
  });

  describe('instance that cannot send', () => {
    it('answers a 400 when the instance is not authorized', async () => {
      const state = useMock();
      state.setStateInstance(PRIMARY_INSTANCE_ID, 'blocked');

      await expect(
        getRejection(sendMessage(credentials, { chatId: '10000000', message: 'Hi' })),
      ).resolves.toMatchObject({
        kind: 'http',
        status: 400,
        serverMessage: 'instance is starting or not authorized',
      });
      expect(state.getQueueLength(PRIMARY_INSTANCE_ID)).toBe(0);
    });

    it('answers the quotaExceeded-shaped 466 when the quota of the instance is gone', async () => {
      const state = useMock();

      const response = await fetch(rawUrl('sendMessage', '4100000006'), {
        method: 'POST',
        body: JSON.stringify({ chatId: '10000000', message: 'Hi' }),
      });

      expect(response.status).toBe(466);
      expect(await response.json()).toMatchObject({
        typeWebhook: 'quotaExceeded',
        quotaData: { description: expect.any(String) as unknown },
      });
      expect(state.getQueueLength('4100000006')).toBe(0);
    });
  });

  describe('success', () => {
    it('answers a new 19-digit idMessage every time', async () => {
      useMock({ scheduler: createRecordingScheduler().scheduler });

      const ids = [
        await sendMessage(credentials, { chatId: '10000000', message: 'a' }),
        await sendMessage(credentials, { chatId: '10000000', message: 'a' }),
        await sendMessage(credentials, { chatId: '10000000', message: 'a' }),
      ].map(({ idMessage }) => idMessage);

      expect(new Set(ids).size).toBe(3);
      expect(ids.every((id) => /^\d{19}$/.test(id))).toBe(true);
    });

    it('has queued the API message by the time the response arrives', async () => {
      const state = useMock({ scheduler: createRecordingScheduler().scheduler });

      const { idMessage } = await sendMessage(credentials, { chatId: '11234567', message: 'Hello' });

      expect(drainNotifications(state)).toEqual([
        expect.objectContaining({
          type: 'message',
          source: 'outgoing-api',
          chatId: '11234567',
          idMessage,
          text: 'Hello',
          senderName: 'Mock Contact 4567',
        }),
      ]);
    });

    it('maps a phone chat id to the numeric chat id of the CheckAccount rule', async () => {
      const state = useMock({ scheduler: createRecordingScheduler().scheduler });

      await sendMessage(credentials, { chatId: '79001234567@c.us', message: 'Hello' });

      expect(drainNotifications(state)).toEqual([expect.objectContaining({ chatId: '11234567' })]);
      expect(state.getPhone('11234567')).toBe('79001234567');
    });

    it('schedules the statuses and the echo behind the API message', async () => {
      const { scheduled, scheduler } = createRecordingScheduler();
      useMock({ scheduler });

      await sendMessage(credentials, { chatId: '10000000', message: 'Hello' });

      expect(scheduled.map(({ delayMs }) => delayMs)).toEqual([1000, 2000, 3000]);
    });

    describe('with timers', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('plays the whole timeline: delivered after 1 s, read after 2 s, echo after 3 s', async () => {
        const state = useMock();
        const { idMessage } = await sendMessage(credentials, { chatId: '11234567', message: 'Hello' });
        drainNotifications(state);

        await jest.advanceTimersByTimeAsync(999);
        expect(drainNotifications(state)).toEqual([]);

        await jest.advanceTimersByTimeAsync(1);
        expect(drainNotifications(state)).toEqual([
          { type: 'status', chatId: '11234567', idMessage, status: 'delivered', description: null },
        ]);

        await jest.advanceTimersByTimeAsync(1000);
        expect(drainNotifications(state)).toEqual([
          { type: 'status', chatId: '11234567', idMessage, status: 'read', description: null },
        ]);

        await jest.advanceTimersByTimeAsync(999);
        expect(drainNotifications(state)).toEqual([]);

        await jest.advanceTimersByTimeAsync(1);
        expect(drainNotifications(state)).toEqual([
          expect.objectContaining({ type: 'message', source: 'incoming', chatId: '11234567', text: 'Echo: Hello' }),
        ]);
        expect(jest.getTimerCount()).toBe(0);
      });

      it('echoes the phone that CheckAccount remembered for the chat', async () => {
        const state = useMock();
        const found = await checkAccount(credentials, { phoneNumber: '79001234567' });
        const chatId = found.kind === 'found' ? found.chatId : '';

        await sendMessage(credentials, { chatId, message: 'Hello' });
        await jest.advanceTimersByTimeAsync(3000);

        expect(drainNotifications(state).at(-1)).toMatchObject({ type: 'message', senderPhone: '79001234567' });
      });
    });
  });

  describe('markers', () => {
    it('#fail answers 500 on every attempt and queues nothing', async () => {
      const state = useMock();

      const first = await getRejection(sendMessage(credentials, { chatId: '10000000', message: 'a #fail' }));
      const second = await getRejection(sendMessage(credentials, { chatId: '10000000', message: 'a #fail' }));

      expect(first).toMatchObject({ kind: 'http', status: 500, serverMessage: 'Internal Server Error' });
      expect(second).toMatchObject({ kind: 'http', status: 500 });
      expect(state.getQueueLength(PRIMARY_INSTANCE_ID)).toBe(0);
    });

    it('#fail-once fails the first attempt for the text and lets the retry through', async () => {
      const state = useMock({ scheduler: createRecordingScheduler().scheduler });
      const message = 'test #fail-once';

      await expect(getRejection(sendMessage(credentials, { chatId: '10000000', message }))).resolves.toMatchObject({
        kind: 'http',
        status: 500,
      });
      expect(state.getQueueLength(PRIMARY_INSTANCE_ID)).toBe(0);

      await expect(sendMessage(credentials, { chatId: '10000000', message })).resolves.toEqual({
        idMessage: expect.stringMatching(/^\d{19}$/) as unknown,
      });
      await expect(sendMessage(credentials, { chatId: '10000000', message })).resolves.toBeDefined();
    });

    it('#fail-once remembers each text and chat on its own', async () => {
      useMock({ scheduler: createRecordingScheduler().scheduler });

      const attempt = (chatId: string, message: string) => getRejection(sendMessage(credentials, { chatId, message }));

      await expect(attempt('10000000', 'a #fail-once')).resolves.toMatchObject({ status: 500 });
      await expect(attempt('10000001', 'a #fail-once')).resolves.toMatchObject({ status: 500 });
      await expect(attempt('10000000', 'b #fail-once')).resolves.toMatchObject({ status: 500 });
    });

    it('#429 answers 429', async () => {
      useMock();

      await expect(
        getRejection(sendMessage(credentials, { chatId: '10000000', message: 'a #429' })),
      ).resolves.toMatchObject({ kind: 'http', status: 429 });
    });

    it('#offline answers with a network error', async () => {
      const state = useMock();

      await expect(
        getRejection(sendMessage(credentials, { chatId: '10000000', message: 'a #offline' })),
      ).resolves.toMatchObject({ kind: 'network' });
      expect(state.getQueueLength(PRIMARY_INSTANCE_ID)).toBe(0);
    });

    it.each(['#failure', '#failed', '#fail-', '#fail_once', 'fail', '# fail', '#noreplyx'])(
      'does not take %s for a marker that fails the send',
      async (text) => {
        useMock({ scheduler: createRecordingScheduler().scheduler });

        await expect(sendMessage(credentials, { chatId: '10000000', message: `a ${text}` })).resolves.toBeDefined();
      },
    );

    it('sends a message with a marker in the middle of a longer text', async () => {
      useMock();

      await expect(
        getRejection(sendMessage(credentials, { chatId: '10000000', message: 'before #fail, after' })),
      ).resolves.toMatchObject({ status: 500 });
    });

    describe('with timers', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('#slow answers after 20 seconds', async () => {
        useMock({ scheduler: createRecordingScheduler().scheduler });
        const response = trackSettled(post('sendMessage', { chatId: '10000000', message: 'a #slow' }));

        await jest.advanceTimersByTimeAsync(19_999);
        expect(response.isSettled).toBe(false);

        await jest.advanceTimersByTimeAsync(1);
        expect(response.isSettled).toBe(true);
      });

      it('#slow runs into the client timeout, and the message shows up only once the response is due', async () => {
        const state = useMock();
        const error = getRejection(sendMessage(credentials, { chatId: '11234567', message: 'a #slow' }));

        await jest.advanceTimersByTimeAsync(15_000);
        await expect(error).resolves.toMatchObject({ kind: 'timeout' });
        await jest.advanceTimersByTimeAsync(4999);
        expect(drainNotifications(state)).toEqual([]);

        await jest.advanceTimersByTimeAsync(1);
        expect(drainNotifications(state)).toEqual([
          expect.objectContaining({ type: 'message', source: 'outgoing-api', text: 'a #slow' }),
        ]);
      });

      it('#slow plays the usual timeline from the moment the response is due', async () => {
        const state = useMock();
        void sendMessage(credentials, { chatId: '11234567', message: 'a #slow' }).catch(() => undefined);

        await jest.advanceTimersByTimeAsync(20_000);
        expect(drainNotifications(state).map((notification) => notification?.type)).toEqual(['message']);

        await jest.advanceTimersByTimeAsync(1000);
        expect(drainNotifications(state)).toEqual([expect.objectContaining({ type: 'status', status: 'delivered' })]);

        await jest.advanceTimersByTimeAsync(1000);
        expect(drainNotifications(state)).toEqual([expect.objectContaining({ type: 'status', status: 'read' })]);

        await jest.advanceTimersByTimeAsync(1000);
        expect(drainNotifications(state)).toEqual([
          expect.objectContaining({ type: 'message', source: 'incoming', text: 'Echo: a #slow' }),
        ]);
        expect(jest.getTimerCount()).toBe(0);
      });

      it('#slow still sends the message when the client aborts, and leaves no timer behind', async () => {
        const state = useMock();
        const controller = new AbortController();
        const error = getRejection(
          sendMessage(credentials, { chatId: '10000000', message: 'a #slow' }, { signal: controller.signal }),
        );

        await jest.advanceTimersByTimeAsync(5000);
        controller.abort();

        await expect(error).resolves.toMatchObject({ kind: 'aborted' });
        await jest.advanceTimersByTimeAsync(0);
        expect(jest.getTimerCount()).toBe(1);
        expect(state.getQueueLength(PRIMARY_INSTANCE_ID)).toBe(0);

        await jest.advanceTimersByTimeAsync(15_000 + 3000);
        expect(drainNotifications(state)).toHaveLength(4);
        expect(jest.getTimerCount()).toBe(0);
      });

      it('#status-failed answers 200, then a failed status with a description after 1 s, and no reply', async () => {
        const state = useMock();
        const { idMessage } = await sendMessage(credentials, { chatId: '11234567', message: 'x #status-failed' });
        drainNotifications(state);

        await jest.advanceTimersByTimeAsync(1000);
        expect(drainNotifications(state)).toEqual([
          {
            type: 'status',
            chatId: '11234567',
            idMessage,
            status: 'failed',
            description: 'Mock: Telegram rejected the message',
          },
        ]);

        await jest.advanceTimersByTimeAsync(5000);
        expect(drainNotifications(state)).toEqual([]);
      });

      it('#no-account answers 200, then a noAccount status with idMessage after 1 s, and no reply', async () => {
        const state = useMock();
        const { idMessage } = await sendMessage(credentials, { chatId: '11234567', message: 'x #no-account' });
        drainNotifications(state);

        await jest.advanceTimersByTimeAsync(1000);
        expect(state.peek(PRIMARY_INSTANCE_ID)?.body).toMatchObject({
          status: 'noAccount',
          idMessage,
          sendByApi: true,
        });
        expect(drainNotifications(state)).toEqual([
          expect.objectContaining({ type: 'status', idMessage, status: 'failed' }),
        ]);

        await jest.advanceTimersByTimeAsync(5000);
        expect(drainNotifications(state)).toEqual([]);
      });

      it('#noreply sends normally but gets no echo', async () => {
        const state = useMock();
        await sendMessage(credentials, { chatId: '11234567', message: 'x #noreply' });
        drainNotifications(state);

        await jest.advanceTimersByTimeAsync(5000);

        expect(drainNotifications(state)).toEqual([
          expect.objectContaining({ type: 'status', status: 'delivered' }),
          expect.objectContaining({ type: 'status', status: 'read' }),
        ]);
      });
    });
  });
});

describe('receiveNotification (MK-8)', () => {
  it('returns the head with its receipt id without removing it', async () => {
    const state = useMock({ seed: { [PRIMARY_INSTANCE_ID]: ['a', 'b'] } });

    await expect(receiveNotification(credentials)).resolves.toEqual({ receiptId: 1, body: 'a' });
    await expect(receiveNotification(credentials)).resolves.toEqual({ receiptId: 1, body: 'a' });
    expect(state.getQueueLength(PRIMARY_INSTANCE_ID)).toBe(2);
  });

  it('serves the next notification once the head is deleted', async () => {
    useMock({ seed: { [PRIMARY_INSTANCE_ID]: ['a', 'b'] } });

    await deleteNotification(credentials, { receiptId: 1 });

    await expect(receiveNotification(credentials)).resolves.toEqual({ receiptId: 2, body: 'b' });
  });

  describe('waiting', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('answers null after the timeout when the queue stays empty, and leaves no timer behind', async () => {
      useMock();
      const result = receiveNotification(credentials, { receiveTimeout: 7 });
      const tracker = trackSettled(result);

      await jest.advanceTimersByTimeAsync(6999);
      expect(tracker.isSettled).toBe(false);

      await jest.advanceTimersByTimeAsync(1);
      await expect(result).resolves.toBeNull();
      await jest.advanceTimersByTimeAsync(0);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('answers a JSON null body for an empty queue', async () => {
      useMock();
      const response = fetch(`${rawUrl('receiveNotification')}?receiveTimeout=5`);

      await jest.advanceTimersByTimeAsync(5000);

      expect(await (await response).text()).toBe('null');
    });

    it.each([
      ['below 5 seconds up to 5 seconds', '1', 5000],
      ['0 up to 5 seconds', '0', 5000],
      ['a negative value up to 5 seconds', '-3', 5000],
      ['a value in range as it is', '7', 7000],
      ['the mock cap of 10 seconds as it is', '10', 10_000],
      ['above the mock cap down to 10 seconds', '12', 10_000],
      ['above 60 seconds down to 10 seconds', '100', 10_000],
      ['a missing value to 5 seconds', null, 5000],
      ['a value that is not a number to 5 seconds', 'abc', 5000],
    ])('clamps receiveTimeout %s', async (_description, receiveTimeout, expectedMs) => {
      useMock();
      const query = receiveTimeout === null ? '' : `?receiveTimeout=${receiveTimeout}`;
      const result = trackSettled(fetch(`${rawUrl('receiveNotification')}${query}`));

      await jest.advanceTimersByTimeAsync(expectedMs - 1);
      expect(result.isSettled).toBe(false);

      await jest.advanceTimersByTimeAsync(1);
      expect(result.isSettled).toBe(true);
    });

    it('resolves early with the notification enqueued while it waits', async () => {
      const state = useMock();
      const result = receiveNotification(credentials, { receiveTimeout: 20 });
      const tracker = trackSettled(result);

      await jest.advanceTimersByTimeAsync(3000);
      expect(tracker.isSettled).toBe(false);

      state.enqueue(PRIMARY_INSTANCE_ID, { hello: 'world' });

      await expect(result).resolves.toEqual({ receiptId: 1, body: { hello: 'world' } });
      await jest.advanceTimersByTimeAsync(0);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('keeps waiting when only another instance gets a notification', async () => {
      const state = useMock();
      const result = receiveNotification(credentials, { receiveTimeout: 7 });
      const tracker = trackSettled(result);

      state.enqueue('4100000006', 'a');
      await jest.advanceTimersByTimeAsync(6999);
      expect(tracker.isSettled).toBe(false);

      await jest.advanceTimersByTimeAsync(1);
      await expect(result).resolves.toBeNull();
    });

    it('only sees the queue of its own instance', async () => {
      useMock({ seed: { '4100000006': ['a'] } });
      const tracker = trackSettled(receiveNotification(credentials, { receiveTimeout: 5 }));

      await jest.advanceTimersByTimeAsync(4999);
      expect(tracker.isSettled).toBe(false);

      await jest.advanceTimersByTimeAsync(1);
      expect(tracker.isSettled).toBe(true);
    });

    it('never waits longer than the 10 second cap, however long the app asks to', async () => {
      useMock();
      const result = receiveNotification(credentials, { receiveTimeout: 60 });
      const tracker = trackSettled(result);

      await jest.advanceTimersByTimeAsync(9999);
      expect(tracker.isSettled).toBe(false);

      await jest.advanceTimersByTimeAsync(1);
      await expect(result).resolves.toBeNull();
    });

    it('rejects as aborted when the request is aborted, and leaves no timer or waiter behind', async () => {
      const state = useMock();
      const controller = new AbortController();
      const error = getRejection(
        receiveNotification(credentials, { receiveTimeout: 20 }, { signal: controller.signal }),
      );

      await jest.advanceTimersByTimeAsync(3000);
      controller.abort();

      await expect(error).resolves.toMatchObject({ kind: 'aborted' });
      await jest.advanceTimersByTimeAsync(0);
      expect(jest.getTimerCount()).toBe(0);

      state.enqueue(PRIMARY_INSTANCE_ID, 'a');
      await jest.advanceTimersByTimeAsync(20_000);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('does not take a notification away from the next poll after an aborted one', async () => {
      const state = useMock();
      const controller = new AbortController();
      const aborted = getRejection(
        receiveNotification(credentials, { receiveTimeout: 20 }, { signal: controller.signal }),
      );
      await jest.advanceTimersByTimeAsync(1000);
      controller.abort();
      await aborted;

      state.enqueue(PRIMARY_INSTANCE_ID, 'a');

      await expect(receiveNotification(credentials)).resolves.toEqual({ receiptId: 1, body: 'a' });
    });

    it('fails with a network error at once when the mock goes offline during the wait', async () => {
      const state = useMock();
      const error = getRejection(receiveNotification(credentials, { receiveTimeout: 20 }));

      await jest.advanceTimersByTimeAsync(2000);
      state.setOffline(true);

      await expect(error).resolves.toMatchObject({ kind: 'network' });
      await jest.advanceTimersByTimeAsync(0);
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});

describe('deleteNotification (MK-8)', () => {
  it('removes the head when the receipt id matches', async () => {
    const state = useMock({ seed: { [PRIMARY_INSTANCE_ID]: ['a', 'b'] } });

    await expect(deleteNotification(credentials, { receiptId: 1 })).resolves.toEqual({ result: true });

    expect(state.getQueueLength(PRIMARY_INSTANCE_ID)).toBe(1);
  });

  it('answers result true with an empty reason', async () => {
    useMock({ seed: { [PRIMARY_INSTANCE_ID]: ['a'] } });

    const response = await fetch(`${rawUrl('deleteNotification')}/1`, { method: 'DELETE' });

    expect(await response.json()).toEqual({ result: true, reason: '' });
  });

  it.each([
    ['one that is not the head', 2],
    ['one that does not exist', 99],
    ['0', 0],
  ])('answers result false and removes nothing for a receipt id: %s', async (_description, receiptId) => {
    const state = useMock({ seed: { [PRIMARY_INSTANCE_ID]: ['a', 'b'] } });

    const response = await fetch(`${rawUrl('deleteNotification')}/${receiptId}`, { method: 'DELETE' });

    expect(await response.json()).toEqual({ result: false, reason: 'notification not found' });
    expect(state.getQueueLength(PRIMARY_INSTANCE_ID)).toBe(2);
  });

  it('answers result false for a notification that is already deleted', async () => {
    useMock({ seed: { [PRIMARY_INSTANCE_ID]: ['a', 'b'] } });
    await deleteNotification(credentials, { receiptId: 1 });

    await expect(deleteNotification(credentials, { receiptId: 1 })).resolves.toEqual({ result: false });
  });

  it.each(['abc', '1.5', '-1', '1e3'])('answers 400 for the receipt id %s', async (receiptId) => {
    const state = useMock({ seed: { [PRIMARY_INSTANCE_ID]: ['a'] } });

    const response = await fetch(`${rawUrl('deleteNotification')}/${receiptId}`, { method: 'DELETE' });

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Parameter receiptId must be a Number!');
    expect(state.getQueueLength(PRIMARY_INSTANCE_ID)).toBe(1);
  });

  it('answers 400 when the receipt id is missing', async () => {
    useMock();

    const response = await fetch(rawUrl('deleteNotification'), { method: 'DELETE' });

    expect(response.status).toBe(400);
  });
});

describe('draining the seed through the client', () => {
  it('delivers the 10 rows of MK-9 in order, each acknowledged before the next', async () => {
    const state = useMock({ seed: createSeed() });
    const parsed = [];

    for (let receiptId = 1; receiptId <= 10; receiptId += 1) {
      const received = await receiveNotification(credentials);

      expect(received?.receiptId).toBe(receiptId);
      parsed.push(parseNotification(received?.body, credentials.idInstance));
      await expect(deleteNotification(credentials, { receiptId })).resolves.toEqual({ result: true });
    }

    expect(parsed.map((notification) => notification?.type ?? null)).toEqual([
      'message',
      null,
      null,
      null,
      'message',
      'state',
      'message',
      null,
      null,
      'message',
    ]);
    expect(state.getQueueLength(PRIMARY_INSTANCE_ID)).toBe(0);
  });
});
