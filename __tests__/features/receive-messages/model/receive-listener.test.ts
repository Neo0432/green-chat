import { createAppStore } from '@app/store';

import { startReceiveListener } from '@features/receive-messages';
import { sendMessage } from '@features/send-message/model/send-message';

import { chatsActions, selectChatById, selectMessagesByChat } from '@entities/chat';
import { sessionActions } from '@entities/session';

import type { Credentials } from '@shared/api/green-api';
import { mockGreenApi } from '@shared/test/mock-green-api';
import { createMockCredentials, createSeed, PRIMARY_INSTANCE_ID } from '@shared/test/msw/green-api';
import { createIncomingNotification } from '@shared/test/msw/green-api/notification-factories';
import { server } from '@shared/test/msw/server';

const ALICE_CHAT_ID = '20000001';

const createStore = (credentials: Credentials | null = createMockCredentials()) =>
  createAppStore({
    session: { credentials, instanceState: credentials === null ? null : 'authorized', forcedSignOut: null },
  });

type Store = ReturnType<typeof createStore>;

const incoming = (text: string, idMessage: string, chatId = ALICE_CHAT_ID) =>
  createIncomingNotification({
    idInstance: PRIMARY_INSTANCE_ID,
    chatId,
    idMessage,
    text,
    senderName: 'Alice (mock)',
    timestamp: 1_000,
  });

/** The mock answers through promises and timers, so the test lets both run until the condition holds. */
const advanceUntil = async (isDone: () => boolean, stepMs = 100, maxSteps = 200) => {
  for (let step = 0; step < maxSteps && !isDone(); step += 1) {
    await jest.advanceTimersByTimeAsync(stepMs);
  }
};

describe('receive listener', () => {
  const onRequest = jest.fn();
  const stores: Store[] = [];

  const startStore = (store: Store) => {
    stores.push(store);
    startReceiveListener(store);

    return store;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    server.events.on('request:start', onRequest);
  });

  afterEach(() => {
    for (const store of stores.splice(0)) {
      store.dispatch(sessionActions.signedOut());
    }

    server.events.removeAllListeners();
    jest.useRealTimers();
  });

  it('polls for a session restored from the storage, and processes and deletes what the queue holds', async () => {
    const state = mockGreenApi({ [PRIMARY_INSTANCE_ID]: [incoming('Hi', 'in-1')] });
    const store = startStore(createStore());

    await advanceUntil(() => state.getQueueLength(PRIMARY_INSTANCE_ID) === 0);

    expect(selectMessagesByChat(store.getState(), ALICE_CHAT_ID)).toEqual([
      expect.objectContaining({ text: 'Hi', direction: 'in' }),
    ]);
    expect(selectChatById(store.getState(), ALICE_CHAT_ID)).toMatchObject({ title: 'Alice (mock)', unreadCount: 1 });
    expect(state.getQueueLength(PRIMARY_INSTANCE_ID)).toBe(0);
  });

  it('starts polling when the user signs in, and not before', async () => {
    mockGreenApi();
    const store = startStore(createStore(null));

    await jest.advanceTimersByTimeAsync(5_000);

    expect(onRequest).not.toHaveBeenCalled();

    store.dispatch(sessionActions.signedIn(createMockCredentials()));
    await advanceUntil(() => onRequest.mock.calls.length > 0);

    expect(onRequest).toHaveBeenCalled();
  });

  it('stops polling when the user logs out (AC-6)', async () => {
    mockGreenApi();
    const store = startStore(createStore());
    await advanceUntil(() => onRequest.mock.calls.length > 0);

    store.dispatch(sessionActions.signedOut());
    await jest.advanceTimersByTimeAsync(0);
    onRequest.mockClear();
    await jest.advanceTimersByTimeAsync(60_000);

    expect(onRequest).not.toHaveBeenCalled();
  });

  it('signs the user out when GREEN-API rejects the token (401)', async () => {
    mockGreenApi();
    const store = startStore(createStore(createMockCredentials(PRIMARY_INSTANCE_ID, 'wrong')));

    await advanceUntil(() => store.getState().session.credentials === null);

    expect(store.getState().session).toMatchObject({
      credentials: null,
      forcedSignOut: { idInstance: PRIMARY_INSTANCE_ID },
    });
  });

  it('shows "Connecting…" from the second failed poll while GREEN-API cannot be reached, and clears it once it can (AC-24)', async () => {
    const state = mockGreenApi();
    state.setOffline(true);
    const store = startStore(createStore());

    await advanceUntil(() => onRequest.mock.calls.length > 0);
    await jest.advanceTimersByTimeAsync(100);

    expect(store.getState().receive.isConnecting).toBe(false);

    await advanceUntil(() => store.getState().receive.isConnecting);

    expect(store.getState().receive.isConnecting).toBe(true);

    state.setOffline(false);
    await advanceUntil(() => !store.getState().receive.isConnecting, 500);

    expect(store.getState().receive.isConnecting).toBe(false);
  });

  it('shows the webhook URL problem of the instance (AC-19)', async () => {
    mockGreenApi();
    const store = startStore(createStore(createMockCredentials('4100000005')));

    await advanceUntil(() => store.getState().receive.error !== null);

    expect(store.getState().receive).toMatchObject({
      isConnecting: false,
      error: expect.stringMatching(/webhook URL/) as unknown,
    });
  });

  it('survives a body that is not a notification and deletes it (AC-21)', async () => {
    const state = mockGreenApi({
      [PRIMARY_INSTANCE_ID]: ['garbage', { typeWebhook: 'incomingMessageReceived' }, incoming('Hi', 'in-1')],
    });
    const store = startStore(createStore());

    await advanceUntil(() => state.getQueueLength(PRIMARY_INSTANCE_ID) === 0);

    expect(selectMessagesByChat(store.getState(), ALICE_CHAT_ID)).toHaveLength(1);
  });

  describe('with the seeded mock', () => {
    it('builds the chat of the seeded queue (AC-1)', async () => {
      const state = mockGreenApi(createSeed());
      const store = startStore(createStore(null));

      store.dispatch(sessionActions.signedIn(createMockCredentials()));
      await advanceUntil(() => state.getQueueLength(PRIMARY_INSTANCE_ID) === 0);

      const { chats } = store.getState();

      expect(chats.ids).toEqual([ALICE_CHAT_ID]);
      expect(chats.entities[ALICE_CHAT_ID]).toMatchObject({
        title: 'Alice (mock)',
        phone: '79990000001',
        unreadCount: 2,
      });
      expect(
        selectMessagesByChat(store.getState(), ALICE_CHAT_ID).map(({ direction, text }) => `${direction}: ${text}`),
      ).toEqual([
        'in: Hi! This chat was created from an incoming message.',
        'in: Docs: https://green-api.com/en/telegram/docs/',
        'out: Sent from my phone',
      ]);
      expect(store.getState().session.instanceState).toBe('authorized');
    });

    it('shows one "Hello" that gets read, and its echo (AC-11)', async () => {
      const state = mockGreenApi(createSeed());
      const store = startStore(createStore());
      await advanceUntil(() => state.getQueueLength(PRIMARY_INSTANCE_ID) === 0);
      store.dispatch(chatsActions.chatActivated(ALICE_CHAT_ID));

      await store.dispatch(sendMessage({ chatId: ALICE_CHAT_ID, text: 'Hello' }));
      await advanceUntil(() =>
        selectMessagesByChat(store.getState(), ALICE_CHAT_ID).some(({ text }) => text === 'Echo: Hello'),
      );
      await advanceUntil(() => state.getQueueLength(PRIMARY_INSTANCE_ID) === 0);

      const messages = selectMessagesByChat(store.getState(), ALICE_CHAT_ID).slice(3);

      expect(messages).toEqual([
        expect.objectContaining({ text: 'Hello', direction: 'out', status: 'read' }),
        expect.objectContaining({ text: 'Echo: Hello', direction: 'in' }),
      ]);
      expect(selectChatById(store.getState(), ALICE_CHAT_ID)?.unreadCount).toBe(0);
    });
  });
});
