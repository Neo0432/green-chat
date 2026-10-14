import { createAppStore } from '@app/store';

import {
  type ApiMessage,
  chatsActions,
  type Message,
  messagesActions,
  type MessagesByChat,
  messagesReducer,
  selectHasMessage,
  selectLastMessage,
  selectMessagesByChat,
} from '@entities/chat';

import { buildChat, buildMessage } from '../fixtures';

type MessagesState = ReturnType<typeof messagesReducer>;

const CHAT_ID = '10000001';

const reduce = (state: MessagesState | undefined, ...actions: Parameters<typeof messagesReducer>[1][]) =>
  actions.reduce(messagesReducer, state ?? messagesReducer(undefined, { type: 'init' }));

const queue = (text = 'Hello') => messagesActions.outgoingMessageQueued({ chatId: CHAT_ID, text });

const getList = (state: MessagesState, chatId = CHAT_ID): Message[] => state[chatId] ?? [];

const createApiMessage = ({
  idMessage = 'srv-1',
  ...overrides
}: { idMessage?: string; text?: string; timestamp?: number } = {}): ApiMessage => ({
  ...buildMessage({ localId: `srv-${idMessage}`, timestamp: 5_000, ...overrides }),
  direction: 'out',
  status: 'sent',
  idMessage,
});

describe('messages slice', () => {
  describe('reducer', () => {
    it('starts empty', () => {
      expect(messagesReducer(undefined, { type: 'init' })).toEqual({});
    });

    it('replaces the messages on hydration and empties them on reset', () => {
      const messages = { [CHAT_ID]: [buildMessage()] };

      const hydrated = messagesReducer(undefined, messagesActions.messagesHydrated(messages));

      expect(hydrated).toEqual(messages);
      expect(messagesReducer(hydrated, messagesActions.messagesReset())).toEqual({});
    });
  });

  describe('sending', () => {
    beforeEach(() => {
      jest.useFakeTimers({ now: 5_000 });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('queues a pending outgoing message with its own localId and the current time', () => {
      const first = queue();
      const second = queue();

      const state = reduce(undefined, first, second);

      expect(getList(state)).toEqual([
        {
          localId: expect.any(String) as unknown,
          idMessage: null,
          chatId: CHAT_ID,
          direction: 'out',
          text: 'Hello',
          timestamp: 5_000,
          status: 'pending',
          error: null,
        },
        expect.objectContaining({ text: 'Hello' }),
      ]);
      expect(first.payload.localId).not.toBe(second.payload.localId);
    });

    it('marks the message as sent with its idMessage', () => {
      const queued = queue();
      const { localId } = queued.payload;

      const state = reduce(
        undefined,
        queued,
        messagesActions.messageSendSucceeded({ chatId: CHAT_ID, localId, idMessage: 'srv-1' }),
      );

      expect(getList(state)).toEqual([expect.objectContaining({ localId, idMessage: 'srv-1', status: 'sent' })]);
    });

    it('ignores the result for a message that is gone', () => {
      const messages = { [CHAT_ID]: [buildMessage()] };

      const state = reduce(
        messages,
        messagesActions.messageSendSucceeded({ chatId: CHAT_ID, localId: 'missing', idMessage: 'srv-1' }),
        messagesActions.messageSendSucceeded({ chatId: '404', localId: 'local-1', idMessage: 'srv-1' }),
        messagesActions.messageSendFailed({ chatId: '404', localId: 'local-1', error: 'Not sent' }),
      );

      expect(state).toEqual(messages);
    });

    it('fails a message with the error, and retries it in place as pending (FR-3.7)', () => {
      const queued = queue();
      const { localId } = queued.payload;

      const failed = reduce(
        undefined,
        queued,
        queue('Second'),
        messagesActions.messageSendFailed({ chatId: CHAT_ID, localId, error: 'Not sent: no connection.' }),
      );

      expect(getList(failed)[0]).toMatchObject({ status: 'failed', error: 'Not sent: no connection.' });

      const retried = reduce(failed, messagesActions.messageRetried({ chatId: CHAT_ID, localId }));

      expect(getList(retried).map(({ text, status, error }) => ({ text, status, error }))).toEqual([
        { text: 'Hello', status: 'pending', error: null },
        { text: 'Second', status: 'pending', error: null },
      ]);
    });

    it('retries a message that had an idMessage as a new send, so its notification does not make a second bubble', () => {
      const queued = queue();
      const { localId } = queued.payload;
      const failedByServer = reduce(
        undefined,
        queued,
        messagesActions.apiMessageReceived(createApiMessage({ idMessage: 'srv-A' })),
        messagesActions.messageStatusUpdated({
          idMessage: 'srv-A',
          status: 'failed',
          error: 'Mock: Telegram rejected the message',
        }),
      );

      const retried = reduce(failedByServer, messagesActions.messageRetried({ chatId: CHAT_ID, localId }));

      expect(getList(retried)).toEqual([
        expect.objectContaining({ localId, idMessage: null, status: 'pending', error: null }),
      ]);

      const notified = reduce(retried, messagesActions.apiMessageReceived(createApiMessage({ idMessage: 'srv-B' })));

      expect(getList(notified)).toEqual([expect.objectContaining({ localId, idMessage: 'srv-B', status: 'sent' })]);

      const answered = reduce(
        notified,
        messagesActions.messageSendSucceeded({ chatId: CHAT_ID, localId, idMessage: 'srv-B' }),
      );

      expect(getList(answered)).toEqual([expect.objectContaining({ localId, idMessage: 'srv-B', status: 'sent' })]);
    });

    it('does not fail a message that the server knows, when the request times out later', () => {
      const queued = queue();
      const { localId } = queued.payload;

      const state = reduce(
        undefined,
        queued,
        messagesActions.apiMessageReceived(createApiMessage()),
        messagesActions.messageStatusUpdated({ idMessage: 'srv-1', status: 'delivered' }),
        messagesActions.messageSendFailed({ chatId: CHAT_ID, localId, error: 'Not sent: request timed out.' }),
      );

      expect(getList(state)).toEqual([
        expect.objectContaining({ idMessage: 'srv-1', status: 'delivered', error: null }),
      ]);
    });

    it('does not raise a message that the server failed, when the response arrives late', () => {
      const queued = queue();
      const { localId } = queued.payload;

      const state = reduce(
        undefined,
        queued,
        messagesActions.apiMessageReceived(createApiMessage()),
        messagesActions.messageStatusUpdated({
          idMessage: 'srv-1',
          status: 'failed',
          error: 'Mock: Telegram rejected the message',
        }),
        messagesActions.messageSendSucceeded({ chatId: CHAT_ID, localId, idMessage: 'srv-1' }),
      );

      expect(getList(state)).toEqual([
        expect.objectContaining({ status: 'failed', error: 'Mock: Telegram rejected the message' }),
      ]);
    });

    it('drops the copy that the API notification made first (FR-4.8 (3))', () => {
      const queued = queue();
      const { localId } = queued.payload;
      // The notification arrives after the local message was failed by the timeout, and takes its place as a copy.
      const state = reduce(
        undefined,
        queued,
        messagesActions.messageSendFailed({ chatId: CHAT_ID, localId, error: 'Not sent: request timed out.' }),
        messagesActions.apiMessageReceived(createApiMessage({ text: 'Not the same text' })),
        messagesActions.messageSendSucceeded({ chatId: CHAT_ID, localId, idMessage: 'srv-1' }),
      );

      expect(getList(state)).toEqual([expect.objectContaining({ localId, idMessage: 'srv-1', status: 'sent' })]);
    });
  });

  describe('status updates', () => {
    const createMessages = () => ({
      '10000001': [buildMessage({ localId: 'a', idMessage: 'srv-1', status: 'sent' })],
      '10000002': [buildMessage({ localId: 'b', chatId: '10000002', idMessage: 'srv-2', status: 'sent' })],
    });

    const getStatuses = (state: MessagesState) =>
      Object.values(state).flatMap((list) => list?.map(({ idMessage, status }) => `${idMessage}:${status}`) ?? []);

    it('raises the status, and never lowers it', () => {
      const delivered = reduce(
        createMessages(),
        messagesActions.messageStatusUpdated({ idMessage: 'srv-1', chatId: CHAT_ID, status: 'delivered' }),
      );
      const read = reduce(delivered, messagesActions.messageStatusUpdated({ idMessage: 'srv-1', status: 'read' }));
      const late = reduce(
        read,
        messagesActions.messageStatusUpdated({ idMessage: 'srv-1', status: 'delivered' }),
        messagesActions.messageStatusUpdated({ idMessage: 'srv-1', status: 'failed', error: 'Too late' }),
      );

      expect(getStatuses(delivered)).toEqual(['srv-1:delivered', 'srv-2:sent']);
      expect(getStatuses(late)).toEqual(['srv-1:read', 'srv-2:sent']);
      expect(getList(late)[0].error).toBeNull();
    });

    it('finds the message in another chat when the named one does not hold it', () => {
      const state = reduce(
        createMessages(),
        messagesActions.messageStatusUpdated({ idMessage: 'srv-2', chatId: CHAT_ID, status: 'read' }),
        messagesActions.messageStatusUpdated({ idMessage: 'srv-1', chatId: '77777777777@c.us', status: 'delivered' }),
      );

      expect(getStatuses(state)).toEqual(['srv-1:delivered', 'srv-2:read']);
    });

    it('fails a message with the error text of the notification', () => {
      const state = reduce(
        createMessages(),
        messagesActions.messageStatusUpdated({
          idMessage: 'srv-1',
          status: 'failed',
          error: 'Mock: Telegram rejected the message',
        }),
      );

      expect(getList(state)[0]).toMatchObject({ status: 'failed', error: 'Mock: Telegram rejected the message' });
    });

    it('ignores an idMessage it does not know', () => {
      const messages = createMessages();

      expect(reduce(messages, messagesActions.messageStatusUpdated({ idMessage: 'srv-9', status: 'read' }))).toEqual(
        messages,
      );
    });
  });

  describe('received messages', () => {
    it('appends a message, and does not append it twice (FR-4.9)', () => {
      const received = messagesActions.messageReceived(createApiMessage({ idMessage: 'srv-1' }));

      const once = reduce(undefined, received);
      const twice = reduce(once, received);

      expect(getList(once)).toHaveLength(1);
      expect(twice).toEqual(once);
    });

    it('keeps messages with other idMessages, also those with the same text', () => {
      const state = reduce(
        undefined,
        messagesActions.messageReceived(createApiMessage({ idMessage: 'srv-1' })),
        messagesActions.messageReceived(createApiMessage({ idMessage: 'srv-2' })),
      );

      expect(getList(state).map(({ idMessage }) => idMessage)).toEqual(['srv-1', 'srv-2']);
    });
  });

  describe('API messages', () => {
    beforeEach(() => {
      jest.useFakeTimers({ now: 5_000 });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('takes the idMessage and the sent status into the pending message it belongs to (FR-4.8 (2))', () => {
      const queued = queue();

      const state = reduce(undefined, queued, messagesActions.apiMessageReceived(createApiMessage()));

      expect(getList(state)).toEqual([
        expect.objectContaining({ localId: queued.payload.localId, idMessage: 'srv-1', status: 'sent' }),
      ]);
    });

    it('adds a message that matches nothing', () => {
      const state = reduce(undefined, queue('Other'), messagesActions.apiMessageReceived(createApiMessage()));

      expect(getList(state).map(({ text, status }) => `${text}:${status}`)).toEqual(['Other:pending', 'Hello:sent']);
    });

    it('does not add a message twice (FR-4.9)', () => {
      const received = messagesActions.apiMessageReceived(createApiMessage());

      const once = reduce(undefined, received);
      const twice = reduce(once, received);

      expect(getList(twice)).toHaveLength(1);
      expect(twice).toEqual(once);
    });
  });

  describe('selectors', () => {
    const first = buildMessage({ localId: 'a', text: 'First' });
    const last = buildMessage({ localId: 'b', text: 'Last' });

    const createState = () => {
      const store = createAppStore({});
      store.dispatch(messagesActions.messagesHydrated({ [CHAT_ID]: [first, last] }));

      return store.getState();
    };

    it('returns the messages of a chat, and one stable empty list for a chat without any', () => {
      const state = createState();

      expect(selectMessagesByChat(state, CHAT_ID)).toEqual([first, last]);
      expect(selectMessagesByChat(state, '404')).toEqual([]);
      expect(selectMessagesByChat(state, '404')).toBe(selectMessagesByChat(state, '405'));
    });

    it('tells whether the chat holds a message with an idMessage', () => {
      const store = createAppStore({});
      store.dispatch(messagesActions.messagesHydrated({ [CHAT_ID]: [buildMessage({ idMessage: 'srv-1' })] }));

      expect(selectHasMessage(store.getState(), CHAT_ID, 'srv-1')).toBe(true);
      expect(selectHasMessage(store.getState(), CHAT_ID, 'srv-2')).toBe(false);
      expect(selectHasMessage(store.getState(), '404', 'srv-1')).toBe(false);
    });

    it('returns the last message of a chat, if there is one', () => {
      const state = createState();

      expect(selectLastMessage(state, CHAT_ID)).toEqual(last);
      expect(selectLastMessage(state, '404')).toBeUndefined();
    });
  });

  describe('chat activity', () => {
    beforeEach(() => {
      jest.useFakeTimers({ now: 5_000 });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const createStore = (lastActivityAt = 1_000, messages: MessagesByChat = {}) => {
      const store = createAppStore({});

      store.dispatch(
        chatsActions.chatsHydrated({ chats: [buildChat({ chatId: CHAT_ID, lastActivityAt })], activeChatId: null }),
      );
      store.dispatch(messagesActions.messagesHydrated(messages));

      return store;
    };

    const getActivity = (store: ReturnType<typeof createStore>) =>
      store.getState().chats.entities[CHAT_ID].lastActivityAt;

    it('moves the chat to the time of a message that is sent', () => {
      const store = createStore();

      store.dispatch(queue());

      expect(getActivity(store)).toBe(5_000);
    });

    it('moves the chat to the time of a message that the API reports', () => {
      const store = createStore();

      store.dispatch(messagesActions.apiMessageReceived(createApiMessage({ timestamp: 7_000 })));

      expect(getActivity(store)).toBe(7_000);
    });

    it('moves the chat to the time of a message that was received', () => {
      const store = createStore();

      store.dispatch(messagesActions.messageReceived(createApiMessage({ timestamp: 7_000 })));

      expect(getActivity(store)).toBe(7_000);
    });

    it('never moves the chat back, and a status change does not move it', () => {
      const store = createStore(9_000, { [CHAT_ID]: [buildMessage({ idMessage: 'srv-1', timestamp: 100 })] });

      store.dispatch(messagesActions.apiMessageReceived(createApiMessage({ idMessage: 'srv-2', timestamp: 200 })));
      store.dispatch(messagesActions.messageStatusUpdated({ idMessage: 'srv-1', status: 'read' }));

      expect(getActivity(store)).toBe(9_000);
    });
  });
});
