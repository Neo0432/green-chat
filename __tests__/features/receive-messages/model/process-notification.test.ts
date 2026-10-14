import { createAppStore } from '@app/store';

import { processNotification } from '@features/receive-messages/model/process-notification';

import { chatsActions, messagesActions, selectChatById, selectMessagesByChat } from '@entities/chat';

import { createMockCredentials, PRIMARY_INSTANCE_ID } from '@shared/test/msw/green-api';
import {
  createIncomingNotification,
  createOutgoingNotification,
  createQuotaExceededNotification,
  createStateChangedNotification,
  createStatusNotification,
} from '@shared/test/msw/green-api/notification-factories';

const CHAT_ID = '20000001';
const SECOND_CHAT_ID = '20000002';

const createStore = () => {
  const store = createAppStore({
    session: { credentials: createMockCredentials(), instanceState: 'authorized', forcedSignOut: null },
  });

  store.dispatch(chatsActions.chatCreated({ chatId: CHAT_ID, phone: null, title: 'Alice' }));

  return store;
};

type Store = ReturnType<typeof createStore>;

const handle = (store: Store, body: unknown) => {
  processNotification(store, PRIMARY_INSTANCE_ID, body);
};

const incoming = (overrides: Partial<Parameters<typeof createIncomingNotification>[0]> = {}) =>
  createIncomingNotification({
    idInstance: PRIMARY_INSTANCE_ID,
    chatId: CHAT_ID,
    idMessage: 'in-1',
    text: 'Hi',
    senderName: 'Alice (mock)',
    timestamp: 1_000,
    ...overrides,
  });

const outgoing = (source: 'phone' | 'api', overrides: Partial<Parameters<typeof createOutgoingNotification>[0]> = {}) =>
  createOutgoingNotification({
    idInstance: PRIMARY_INSTANCE_ID,
    chatId: CHAT_ID,
    idMessage: 'out-1',
    text: 'Hello',
    source,
    recipientName: 'Alice (mock)',
    timestamp: 1_000,
    ...overrides,
  });

const status = (
  overrides: Pick<Parameters<typeof createStatusNotification>[0], 'status'> & {
    idMessage?: string;
    description?: string;
  },
) => createStatusNotification({ idInstance: PRIMARY_INSTANCE_ID, chatId: CHAT_ID, idMessage: 'out-1', ...overrides });

const getChat = (store: Store, chatId = CHAT_ID) => selectChatById(store.getState(), chatId);

const getMessages = (store: Store, chatId = CHAT_ID) => selectMessagesByChat(store.getState(), chatId);

describe('processNotification', () => {
  describe('an incoming message (FR-4.5)', () => {
    it('appends it to the chat, as a received message with a server localId, and counts it as unread', () => {
      const store = createStore();

      handle(store, incoming());

      expect(getMessages(store)).toEqual([
        {
          localId: 'srv-in-1',
          idMessage: 'in-1',
          chatId: CHAT_ID,
          direction: 'in',
          text: 'Hi',
          timestamp: 1_000_000,
          status: null,
          error: null,
        },
      ]);
      expect(getChat(store)?.unreadCount).toBe(1);
    });

    it('does not count it as unread when its chat is the active one', () => {
      const store = createStore();
      store.dispatch(chatsActions.chatActivated(CHAT_ID));

      handle(store, incoming());

      expect(getMessages(store)).toHaveLength(1);
      expect(getChat(store)?.unreadCount).toBe(0);
    });

    it('leaves the active chat alone when the message is for another chat (AC-16)', () => {
      const store = createStore();
      store.dispatch(chatsActions.chatCreated({ chatId: SECOND_CHAT_ID, phone: null, title: 'Bob' }));
      store.dispatch(chatsActions.chatActivated(CHAT_ID));

      handle(store, incoming({ chatId: SECOND_CHAT_ID, text: 'Ping' }));

      expect(getChat(store)?.unreadCount).toBe(0);
      expect(getChat(store, SECOND_CHAT_ID)?.unreadCount).toBe(1);
      expect(getMessages(store)).toEqual([]);
    });

    it('adds a message that comes again only once, and counts it as unread once (FR-4.9)', () => {
      const store = createStore();

      handle(store, incoming());
      handle(store, incoming());

      expect(getMessages(store)).toHaveLength(1);
      expect(getChat(store)?.unreadCount).toBe(1);
    });

    it('creates a missing chat, titled by the sender name and with the sender phone (AC-17)', () => {
      const store = createStore();

      handle(store, incoming({ chatId: '99', senderName: 'Newcomer', senderPhone: 79995554433 }));

      expect(getChat(store, '99')).toMatchObject({
        title: 'Newcomer',
        isTitleFromName: true,
        phone: '79995554433',
        unreadCount: 1,
        createdAt: 1_000_000,
        lastActivityAt: 1_000_000,
      });
    });

    it.each([
      ['the phone', 79995554433, '+79995554433', '79995554433'],
      ['the chat ID', 0, 'Telegram ID 99', null],
    ])('titles a missing chat of a sender without a name by %s', (_name, senderPhone, title, phone) => {
      const store = createStore();

      handle(store, incoming({ chatId: '99', senderName: '', senderPhone }));

      expect(getChat(store, '99')).toMatchObject({ title, phone, isTitleFromName: false });
    });

    it('replaces a placeholder title with the name once, and never overwrites a name (FR-2.8)', () => {
      const store = createStore();

      handle(store, incoming({ senderName: 'Alice (mock)' }));
      handle(store, incoming({ idMessage: 'in-2', senderName: 'Someone else' }));

      expect(getChat(store)).toMatchObject({ title: 'Alice (mock)', isTitleFromName: true });
    });

    it('moves the chat up to the time of the message', () => {
      const store = createStore();

      handle(store, incoming({ timestamp: 4_000_000_000 }));

      expect(getChat(store)?.lastActivityAt).toBe(4_000_000_000_000);
    });
  });

  describe('a message sent from the phone (FR-4.6)', () => {
    it('is shown as a sent outgoing message and is not unread', () => {
      const store = createStore();

      handle(store, outgoing('phone'));

      expect(getMessages(store)).toEqual([
        expect.objectContaining({ localId: 'srv-out-1', direction: 'out', status: 'sent', text: 'Hello' }),
      ]);
      expect(getChat(store)?.unreadCount).toBe(0);
    });

    it('creates a missing chat titled by the recipient name, without a phone', () => {
      const store = createStore();

      handle(store, outgoing('phone', { chatId: '99', recipientName: 'Recipient' }));

      expect(getChat(store, '99')).toMatchObject({ title: 'Recipient', phone: null, isTitleFromName: true });
    });

    it('is not duplicated when it comes again', () => {
      const store = createStore();

      handle(store, outgoing('phone'));
      handle(store, outgoing('phone'));

      expect(getMessages(store)).toHaveLength(1);
    });
  });

  describe('a message sent through the API (FR-4.7, FR-4.8)', () => {
    it('adopts the pending message of the same text instead of adding a second bubble (AC-11)', () => {
      const store = createStore();
      store.dispatch(messagesActions.outgoingMessageQueued({ chatId: CHAT_ID, text: 'Hello' }));

      handle(store, outgoing('api'));

      expect(getMessages(store)).toEqual([
        expect.objectContaining({ text: 'Hello', idMessage: 'out-1', status: 'sent' }),
      ]);
      expect(getMessages(store)[0].localId).not.toBe('srv-out-1');
    });

    it('renames a phone-titled chat from the notification of a message the response already reconciled', () => {
      const store = createStore();
      store.dispatch(chatsActions.chatCreated({ chatId: '99', phone: '79001234567', title: '+79001234567' }));
      const queued = messagesActions.outgoingMessageQueued({ chatId: '99', text: 'Hello' });
      store.dispatch(queued);
      store.dispatch(
        messagesActions.messageSendSucceeded({ chatId: '99', localId: queued.payload.localId, idMessage: 'out-1' }),
      );

      handle(store, outgoing('api', { chatId: '99', recipientName: 'Ivan' }));

      expect(getChat(store, '99')).toMatchObject({ title: 'Ivan', isTitleFromName: true });
      expect(getMessages(store, '99')).toHaveLength(1);
    });

    it('appends a message that was not sent from here, and creates its chat', () => {
      const store = createStore();

      handle(store, outgoing('api', { chatId: '99', recipientName: 'Recipient' }));

      expect(getMessages(store, '99')).toEqual([
        expect.objectContaining({ localId: 'srv-out-1', direction: 'out', status: 'sent' }),
      ]);
      expect(getChat(store, '99')).toMatchObject({ title: 'Recipient', phone: null });
    });
  });

  describe('a status (FR-4.10)', () => {
    const createSentMessageStore = () => {
      const store = createStore();

      handle(store, outgoing('phone'));

      return store;
    };

    it('raises the status of the message, and never lowers it again', () => {
      const store = createSentMessageStore();

      handle(store, status({ status: 'read' }));
      handle(store, status({ status: 'delivered' }));

      expect(getMessages(store)[0].status).toBe('read');
    });

    it('fails the message with the description of the notification (AC-15)', () => {
      const store = createSentMessageStore();

      handle(store, status({ status: 'failed', description: 'Mock: Telegram rejected the message' }));

      expect(getMessages(store)[0]).toMatchObject({ status: 'failed', error: 'Mock: Telegram rejected the message' });
    });

    it('fails the message with a default text when the notification has no description', () => {
      const store = createSentMessageStore();

      handle(store, status({ status: 'failed' }));

      expect(getMessages(store)[0]).toMatchObject({ status: 'failed', error: 'Telegram rejected the message' });
    });

    it('fails the message of a number without an account, with the text from the parser', () => {
      const store = createSentMessageStore();

      handle(store, status({ status: 'noAccount' }));

      expect(getMessages(store)[0]).toMatchObject({
        status: 'failed',
        error: 'There is no Telegram account for this recipient',
      });
    });

    it('ignores a status of a message it does not know', () => {
      const store = createStore();

      handle(store, status({ idMessage: 'nope', status: 'read' }));

      expect(getMessages(store)).toEqual([]);
    });
  });

  it('stores the state of the instance (FR-4.11, AC-18)', () => {
    const store = createStore();

    handle(store, createStateChangedNotification({ idInstance: PRIMARY_INSTANCE_ID, stateInstance: 'notAuthorized' }));

    expect(store.getState().session.instanceState).toBe('notAuthorized');
  });

  it('shows the quota error with its description, or a default one (FR-4.12)', () => {
    const store = createStore();

    handle(store, createQuotaExceededNotification({ idInstance: PRIMARY_INSTANCE_ID }));

    expect(store.getState().receive.error).toMatch(/^The monthly limit of chats has been reached/);

    handle(store, { typeWebhook: 'quotaExceeded' });

    expect(store.getState().receive.error).toBe('Tariff limit reached.');
  });

  it.each([
    ['an unknown type', { typeWebhook: 'incomingCall' }],
    ['a malformed body', { foo: 1 }],
    ['garbage', 'garbage'],
    ['a message without a chat', { typeWebhook: 'incomingMessageReceived' }],
    ['a file message', incoming({ typeMessage: 'imageMessage' })],
    ['a message of another instance', { ...incoming(), instanceData: { idInstance: 1 } }],
    ['null', null],
  ])('ignores %s without a change or a throw (AC-21)', (_name, body) => {
    const store = createStore();
    const before = store.getState();

    expect(() => {
      handle(store, body);
    }).not.toThrow();
    expect(store.getState()).toBe(before);
  });
});
