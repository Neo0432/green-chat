import { http, HttpResponse } from 'msw';

import { createAppStore } from '@app/store';

import { getCreateChatErrorMessage } from '@features/create-chat/lib/get-create-chat-error-message';
import { createChat } from '@features/create-chat/model/create-chat';

import { chatsActions } from '@entities/chat';
import { sessionActions } from '@entities/session';

import { mockGreenApi } from '@shared/test/mock-green-api';
import { createMockCredentials } from '@shared/test/msw/green-api';
import { server } from '@shared/test/msw/server';

import { buildChat } from '../../../entities/chat/fixtures';

/** The mock answers a phone with the chat id `10000000 + <last 7 digits>` (MK-7). */
const PHONE = '79001234567';
const CHAT_ID = '11234567';

const createSignedInStore = (credentials = createMockCredentials()) =>
  createAppStore({ session: { credentials, instanceState: 'authorized', forcedSignOut: null } });

const createChatFor = async (store: ReturnType<typeof createSignedInStore>, phone: string) => {
  const result = await store.dispatch(createChat(phone)).unwrap();
  const message = result.ok ? null : getCreateChatErrorMessage(result.failure);

  return { result, message };
};

describe('createChat', () => {
  const onRequest = jest.fn();

  beforeEach(() => {
    mockGreenApi();
    server.events.on('request:start', onRequest);
  });

  afterEach(() => {
    server.events.removeAllListeners();
  });

  it('creates a chat titled with the phone, and opens it (FR-2.6, AC-7)', async () => {
    const store = createSignedInStore();

    const { result } = await createChatFor(store, PHONE);

    expect(result).toEqual({ ok: true });
    expect(Object.values(store.getState().chats.entities)).toEqual([
      expect.objectContaining({ chatId: CHAT_ID, phone: PHONE, title: `+${PHONE}`, unreadCount: 0 }),
    ]);
    expect(store.getState().chats.activeChatId).toBe(CHAT_ID);
  });

  it('opens the chat of a known phone without a request (FR-2.5, AC-8)', async () => {
    const store = createSignedInStore();
    store.dispatch(
      chatsActions.chatsHydrated({ chats: [buildChat({ chatId: CHAT_ID, phone: PHONE })], activeChatId: null }),
    );

    const { result } = await createChatFor(store, PHONE);

    expect(result).toEqual({ ok: true });
    expect(store.getState().chats.activeChatId).toBe(CHAT_ID);
    expect(onRequest).not.toHaveBeenCalled();
  });

  it('gives the phone to an existing chat with the same chat id, and opens it', async () => {
    const store = createSignedInStore();
    store.dispatch(
      chatsActions.chatsHydrated({
        chats: [buildChat({ chatId: CHAT_ID, phone: null, unreadCount: 2 })],
        activeChatId: null,
      }),
    );

    await createChatFor(store, PHONE);

    expect(Object.values(store.getState().chats.entities)).toEqual([
      expect.objectContaining({ chatId: CHAT_ID, phone: PHONE, title: 'Alice', unreadCount: 0 }),
    ]);
    expect(store.getState().chats.activeChatId).toBe(CHAT_ID);
  });

  it.each([
    [
      'a number that is not on Telegram (AC-9)',
      '79000000000',
      "This number isn't on Telegram, or its owner hides it in privacy settings.",
    ],
    [
      'Telegram restricting the lookups',
      '79004694690',
      'Telegram restricted number lookups for this account. Try again in a few hours.',
    ],
    [
      'a rate limit answered with HTTP 200',
      '79002002000',
      'Too many number checks. Telegram asks to pause for about 2 hours.',
    ],
    ['Telegram being unavailable', '79005005000', 'Telegram is temporarily unavailable. Try again in a few minutes.'],
  ])('fails without creating a chat for %s', async (_name, phone, expectedMessage) => {
    const store = createSignedInStore();

    const { result, message } = await createChatFor(store, phone);

    expect(result.ok).toBe(false);
    expect(message).toBe(expectedMessage);
    expect(Object.values(store.getState().chats.entities)).toEqual([]);
    expect(store.getState().chats.activeChatId).toBeNull();
  });

  it('fails when the monthly limit of number checks is reached', async () => {
    const { result, message } = await createChatFor(createSignedInStore(createMockCredentials('4100000006')), PHONE);

    expect(result).toMatchObject({ ok: false, failure: { reason: 'request-failed', status: 466 } });
    expect(message).toBe('The monthly limit of number checks is reached on this tariff.');
  });

  it('signs the user out when GREEN-API rejects the token (401)', async () => {
    const store = createSignedInStore(createMockCredentials('4100000001', 'wrong'));

    const { result } = await createChatFor(store, PHONE);

    expect(result.ok).toBe(false);
    expect(store.getState().session).toMatchObject({ credentials: null, forcedSignOut: { idInstance: '4100000001' } });
    expect(Object.values(store.getState().chats.entities)).toEqual([]);
  });

  it('writes no chat into the state of a session that ended while it waited', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post('*/checkAccount/*', async () => {
        await gate;

        return HttpResponse.json({ exist: true, chatId: CHAT_ID });
      }),
    );
    const store = createSignedInStore();

    const pending = store.dispatch(createChat(PHONE));
    store.dispatch(sessionActions.signedOut());
    release();
    await pending.unwrap();

    expect(Object.values(store.getState().chats.entities)).toEqual([]);
    expect(store.getState().chats.activeChatId).toBeNull();
  });
});
