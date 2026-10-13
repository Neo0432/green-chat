import { createRecordingScheduler } from '@shared/test/create-recording-scheduler';
import { drainNotifications } from '@shared/test/drain-notifications';
import { createGreenApiMockState, PRIMARY_INSTANCE_ID } from '@shared/test/msw/green-api';
import { startSendEffects, timerScheduler } from '@shared/test/msw/green-api/send-effects';

const CHAT_ID = '11234567';
const ID_MESSAGE = '1769676078000000001';

const setUp = (text = 'Hello', markers: string[] = []) => {
  const state = createGreenApiMockState();
  const { scheduler, scheduled, runAll } = createRecordingScheduler();

  startSendEffects({
    state,
    scheduler,
    idInstance: PRIMARY_INSTANCE_ID,
    chatId: CHAT_ID,
    idMessage: ID_MESSAGE,
    text,
    markers: new Set(markers),
  });

  return { state, scheduled, runAll };
};

describe('startSendEffects', () => {
  it('queues the API message right away, before anything is scheduled to run', () => {
    const { state } = setUp('Hello');

    expect(drainNotifications(state)).toEqual([
      expect.objectContaining({
        type: 'message',
        source: 'outgoing-api',
        chatId: CHAT_ID,
        idMessage: ID_MESSAGE,
        text: 'Hello',
        senderName: 'Mock Contact 4567',
        senderPhone: null,
      }),
    ]);
  });

  it('schedules delivered after 1 s, read after 2 s and the echo after 3 s', () => {
    const { scheduled } = setUp();

    expect(scheduled.map(({ delayMs }) => delayMs)).toEqual([1000, 2000, 3000]);
  });

  it('plays the timeline: delivered, read, then an echo from the same chat', () => {
    const { state, runAll } = setUp('Hello');
    drainNotifications(state);

    runAll();

    expect(drainNotifications(state)).toEqual([
      { type: 'status', chatId: CHAT_ID, idMessage: ID_MESSAGE, status: 'delivered', description: null },
      { type: 'status', chatId: CHAT_ID, idMessage: ID_MESSAGE, status: 'read', description: null },
      expect.objectContaining({
        type: 'message',
        source: 'incoming',
        chatId: CHAT_ID,
        text: 'Echo: Hello',
        senderName: 'Mock Contact 4567',
      }),
    ]);
  });

  it('gives the echo an id of its own', () => {
    const { state, runAll } = setUp();
    drainNotifications(state);

    runAll();

    const echo = drainNotifications(state).at(-1);
    expect(echo).toMatchObject({ type: 'message' });
    expect(echo).not.toMatchObject({ idMessage: ID_MESSAGE });
    expect(echo).toMatchObject({ idMessage: expect.stringMatching(/^\d{19}$/) as unknown });
  });

  it('cuts the echoed text to 200 characters', () => {
    const { state, runAll } = setUp('x'.repeat(300));
    drainNotifications(state);

    runAll();

    expect(drainNotifications(state).at(-1)).toMatchObject({ text: `Echo: ${'x'.repeat(200)}` });
  });

  it('puts the remembered phone of the chat on the echo', () => {
    const { state, runAll } = setUp();
    state.registerPhone('79001234567');
    drainNotifications(state);

    runAll();

    expect(drainNotifications(state).at(-1)).toMatchObject({ senderPhone: '79001234567' });
  });

  it('leaves the phone of the echo out when the chat has none', () => {
    const { state, runAll } = setUp();
    drainNotifications(state);

    runAll();

    expect(drainNotifications(state).at(-1)).toMatchObject({ senderPhone: null });
  });

  describe('with a fake clock', () => {
    beforeEach(() => {
      jest.useFakeTimers({ now: new Date('2026-01-01T00:00:00Z') });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('stamps every notification when it is queued, not when the effects start', () => {
      const { state, runAll } = setUp();
      drainNotifications(state);

      jest.setSystemTime(new Date('2026-01-01T00:00:03Z'));
      runAll();

      expect(drainNotifications(state).at(-1)).toMatchObject({ timestamp: Date.parse('2026-01-01T00:00:03Z') });
    });
  });

  describe('markers', () => {
    it('#noreply skips the echo only', () => {
      const { state, runAll } = setUp('Hi #noreply', ['#noreply']);
      drainNotifications(state);

      runAll();

      expect(drainNotifications(state)).toEqual([
        expect.objectContaining({ type: 'status', status: 'delivered' }),
        expect.objectContaining({ type: 'status', status: 'read' }),
      ]);
    });

    it('#status-failed answers with a failure after 1 s instead of the usual timeline', () => {
      const { state, scheduled, runAll } = setUp('x #status-failed', ['#status-failed']);
      drainNotifications(state);

      runAll();

      expect(scheduled.map(({ delayMs }) => delayMs)).toEqual([1000]);
      expect(drainNotifications(state)).toEqual([
        {
          type: 'status',
          chatId: CHAT_ID,
          idMessage: ID_MESSAGE,
          status: 'failed',
          description: 'Mock: Telegram rejected the message',
        },
      ]);
    });

    it('#no-account answers with noAccount and an idMessage after 1 s instead of the usual timeline', () => {
      const { state, scheduled, runAll } = setUp('x #no-account', ['#no-account']);
      drainNotifications(state);

      runAll();

      expect(scheduled.map(({ delayMs }) => delayMs)).toEqual([1000]);
      expect(drainNotifications(state)).toEqual([
        expect.objectContaining({ type: 'status', idMessage: ID_MESSAGE, status: 'failed' }),
      ]);
      expect(state.peek(PRIMARY_INSTANCE_ID)).toBeUndefined();
    });

    it('still queues the API message for a message that fails later', () => {
      const { state } = setUp('x #status-failed', ['#status-failed']);

      expect(drainNotifications(state)).toEqual([expect.objectContaining({ source: 'outgoing-api' })]);
    });
  });
});

describe('timerScheduler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('runs the callback after the delay', () => {
    const callback = jest.fn();

    timerScheduler(callback, 1000);

    jest.advanceTimersByTime(999);
    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
