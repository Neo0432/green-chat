import { parseNotification } from '@shared/api/green-api';
import { isPlainObject } from '@shared/lib';
import {
  createDevHelpers,
  createGreenApiMockState,
  type GreenApiMockState,
  installDevHelpers,
  PRIMARY_INSTANCE_ID,
} from '@shared/test/msw/green-api';

const OTHER_INSTANCE_ID = '4100000006';

const setUp = () => {
  const state = createGreenApiMockState();

  return { state, mock: createDevHelpers(state) };
};

/** The oldest queued notification of the instance, parsed the way the app parses it. */
const peekParsed = (state: GreenApiMockState, idInstance = PRIMARY_INSTANCE_ID) =>
  parseNotification(state.peek(idInstance)?.body, idInstance);

const readIdMessage = (body: unknown) => (isPlainObject(body) ? body.idMessage : undefined);

describe('createDevHelpers', () => {
  describe('incoming', () => {
    it('queues a text message from a chat id', () => {
      const { state, mock } = setUp();

      mock.incoming('15554433', 'Ping');

      expect(peekParsed(state)).toMatchObject({
        type: 'message',
        source: 'incoming',
        chatId: '15554433',
        text: 'Ping',
        senderName: 'Mock Contact 4433',
        senderPhone: null,
      });
    });

    it('maps a phone to its chat id by the CheckAccount rule and remembers the phone', () => {
      const { state, mock } = setUp();

      mock.incoming('+7 999 555-44-33', 'New person');

      expect(peekParsed(state)).toMatchObject({ chatId: '15554433', senderPhone: '79995554433' });
      expect(state.getPhone('15554433')).toBe('79995554433');
    });

    it('takes a short number for a chat id and a negative one for a group', () => {
      const { state, mock } = setUp();

      mock.incoming('20000001', 'a');
      mock.incoming('-1000000000001', 'b');

      expect(state.peek(PRIMARY_INSTANCE_ID)?.body).toMatchObject({ senderData: { chatId: '20000001' } });
      state.acknowledge(PRIMARY_INSTANCE_ID, 1);
      expect(state.peek(PRIMARY_INSTANCE_ID)?.body).toMatchObject({ senderData: { chatId: '-1000000000001' } });
    });

    it('uses the given sender name', () => {
      const { state, mock } = setUp();

      mock.incoming('15554433', 'Ping', { senderName: 'Bob' });

      expect(peekParsed(state)).toMatchObject({ senderName: 'Bob' });
    });

    it('queues a file message, which the app ignores, for a type other than text', () => {
      const { state, mock } = setUp();

      mock.incoming('15554433', 'Look', { typeMessage: 'imageMessage' });

      expect(state.peek(PRIMARY_INSTANCE_ID)?.body).toMatchObject({ messageData: { typeMessage: 'imageMessage' } });
      expect(peekParsed(state)).toBeNull();
    });

    it('gives every message an id of its own', () => {
      const { state, mock } = setUp();

      mock.incoming('15554433', 'a');
      mock.incoming('15554433', 'a');
      const first = state.peek(PRIMARY_INSTANCE_ID);
      state.acknowledge(PRIMARY_INSTANCE_ID, first?.receiptId ?? 0);
      const second = state.peek(PRIMARY_INSTANCE_ID);

      expect(readIdMessage(first?.body)).toMatch(/^\d{19}$/);
      expect(readIdMessage(second?.body)).toMatch(/^\d{19}$/);
      expect(readIdMessage(second?.body)).not.toBe(readIdMessage(first?.body));
    });
  });

  describe('fromPhone', () => {
    it('queues an outgoing message from the phone to the chat', () => {
      const { state, mock } = setUp();

      mock.fromPhone('15554433', 'From my phone');

      expect(peekParsed(state)).toMatchObject({
        type: 'message',
        source: 'outgoing-phone',
        chatId: '15554433',
        text: 'From my phone',
        senderName: 'Mock Contact 4433',
      });
    });

    it('maps a phone to a chat id as incoming does', () => {
      const { state, mock } = setUp();

      mock.fromPhone('79995554433', 'From my phone');

      expect(peekParsed(state)).toMatchObject({ chatId: '15554433' });
    });
  });

  describe('setState', () => {
    it('changes the state of the instance and queues a state change', () => {
      const { state, mock } = setUp();

      mock.setState('notAuthorized');

      expect(state.getInstance(PRIMARY_INSTANCE_ID)?.stateInstance).toBe('notAuthorized');
      expect(peekParsed(state)).toEqual({ type: 'state', stateInstance: 'notAuthorized' });
    });
  });

  describe('quota', () => {
    it('queues a quotaExceeded notification', () => {
      const { state, mock } = setUp();

      mock.quota();

      expect(peekParsed(state)).toMatchObject({ type: 'quota' });
    });
  });

  describe('raw', () => {
    it.each([[{ typeWebhook: 'incomingMessageReceived' }], ['garbage'], [null]])('queues %p as it is', (body) => {
      const { state, mock } = setUp();

      mock.raw(body);

      expect(state.peek(PRIMARY_INSTANCE_ID)?.body).toEqual(body);
    });
  });

  describe('queue', () => {
    it('returns the length of the queue', () => {
      const { mock } = setUp();
      expect(mock.queue()).toBe(0);

      mock.raw(1);
      mock.raw(2);

      expect(mock.queue()).toBe(2);
    });
  });

  describe('offline', () => {
    it('switches the offline flag of the mock', () => {
      const { state, mock } = setUp();

      mock.offline(true);
      expect(state.isOffline).toBe(true);

      mock.offline(false);
      expect(state.isOffline).toBe(false);
    });
  });

  describe('target instance', () => {
    it('is the one that talked to the mock last', () => {
      const { state, mock } = setUp();

      state.setActiveInstance(OTHER_INSTANCE_ID);
      mock.raw('a');
      mock.quota();

      expect(state.getQueueLength(OTHER_INSTANCE_ID)).toBe(2);
      expect(state.getQueueLength(PRIMARY_INSTANCE_ID)).toBe(0);
      expect(mock.queue()).toBe(2);
      expect(peekParsed(state, OTHER_INSTANCE_ID)).toBeNull();
    });
  });
});

describe('installDevHelpers', () => {
  afterEach(() => {
    delete window.__greenChatMock;
  });

  it('exposes the helpers as window.__greenChatMock', () => {
    const state = createGreenApiMockState();

    installDevHelpers(state);
    window.__greenChatMock?.raw('a');

    expect(window.__greenChatMock?.queue()).toBe(1);
    expect(state.getQueueLength(PRIMARY_INSTANCE_ID)).toBe(1);
  });

  it('is not installed by creating the helpers', () => {
    createDevHelpers(createGreenApiMockState());

    expect(window.__greenChatMock).toBeUndefined();
  });
});
