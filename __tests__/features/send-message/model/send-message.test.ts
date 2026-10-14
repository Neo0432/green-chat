import { http, HttpResponse } from 'msw';

import { createAppStore } from '@app/store';

import { retryMessage } from '@features/send-message';
import { sendMessage } from '@features/send-message/model/send-message';

import { chatsActions, selectMessagesByChat } from '@entities/chat';
import { sessionActions } from '@entities/session';

import { mockGreenApi } from '@shared/test/mock-green-api';
import { createMockCredentials } from '@shared/test/msw/green-api';
import { server } from '@shared/test/msw/server';

import { buildChat } from '../../../entities/chat/fixtures';

const CHAT_ID = '10000001';

const createSignedInStore = (credentials = createMockCredentials()) => {
  const store = createAppStore({ session: { credentials, instanceState: 'authorized', forcedSignOut: null } });

  store.dispatch(chatsActions.chatsHydrated({ chats: [buildChat({ chatId: CHAT_ID })], activeChatId: CHAT_ID }));

  return store;
};

type Store = ReturnType<typeof createSignedInStore>;

const send = (store: Store, text: string) => store.dispatch(sendMessage({ chatId: CHAT_ID, text }));

const getMessages = (store: Store) => selectMessagesByChat(store.getState(), CHAT_ID);

describe('sendMessage', () => {
  const onRequest = jest.fn();

  beforeEach(() => {
    mockGreenApi();
    server.events.on('request:start', onRequest);
  });

  afterEach(() => {
    server.events.removeAllListeners();
    jest.useRealTimers();
  });

  it('shows the message as pending at once, and as sent with its idMessage after the response (AC-11)', async () => {
    const store = createSignedInStore();

    const sending = send(store, 'Hello');

    expect(getMessages(store)).toEqual([
      expect.objectContaining({ text: 'Hello', direction: 'out', status: 'pending', idMessage: null }),
    ]);

    await sending;

    expect(getMessages(store)).toEqual([
      expect.objectContaining({
        text: 'Hello',
        status: 'sent',
        idMessage: expect.stringMatching(/^\d{19}$/) as unknown,
      }),
    ]);
  });

  it('keeps several sends in a row in order, without waiting for each other (FR-3.9)', async () => {
    const store = createSignedInStore();

    const sending = [send(store, 'one'), send(store, 'two'), send(store, 'three')];

    expect(getMessages(store).map(({ text, status }) => `${text}:${status}`)).toEqual([
      'one:pending',
      'two:pending',
      'three:pending',
    ]);

    await Promise.all(sending);

    expect(getMessages(store).map(({ status }) => status)).toEqual(['sent', 'sent', 'sent']);
  });

  it('fails the message with the reason when the server errors (#fail)', async () => {
    const store = createSignedInStore();

    await send(store, 'Hello #fail');

    expect(getMessages(store)).toEqual([
      expect.objectContaining({ status: 'failed', idMessage: null, error: 'Not sent: GREEN-API error (HTTP 500).' }),
    ]);
  });

  it('fails the message and sends it again with the same localId (#fail-once, AC-14)', async () => {
    const store = createSignedInStore();

    await send(store, 'test #fail-once');
    const [failed] = getMessages(store);

    expect(failed).toMatchObject({ status: 'failed', error: 'Not sent: GREEN-API error (HTTP 500).' });

    const retrying = store.dispatch(retryMessage({ chatId: CHAT_ID, localId: failed.localId }));

    expect(getMessages(store)).toEqual([
      expect.objectContaining({ localId: failed.localId, status: 'pending', error: null }),
    ]);

    await retrying;

    expect(getMessages(store)).toEqual([
      expect.objectContaining({ localId: failed.localId, status: 'sent', idMessage: expect.any(String) as unknown }),
    ]);
  });

  it('leaves a message that did not fail alone when it is retried', async () => {
    const store = createSignedInStore();
    await send(store, 'Hello');
    const [sent] = getMessages(store);
    onRequest.mockClear();

    await store.dispatch(retryMessage({ chatId: CHAT_ID, localId: sent.localId }));

    expect(getMessages(store)).toEqual([sent]);
    expect(onRequest).not.toHaveBeenCalled();
  });

  it('fails the message when the response takes longer than 15 seconds (#slow)', async () => {
    jest.useFakeTimers();
    const store = createSignedInStore();

    const sending = send(store, 'Hello #slow');
    await jest.advanceTimersByTimeAsync(14_999);

    expect(getMessages(store)[0].status).toBe('pending');

    await jest.advanceTimersByTimeAsync(1);
    await sending;

    expect(getMessages(store)).toEqual([
      expect.objectContaining({ status: 'failed', error: 'Not sent: request timed out.' }),
    ]);
  });

  it('signs the user out when GREEN-API rejects the token (401)', async () => {
    const store = createSignedInStore(createMockCredentials('4100000001', 'wrong'));

    await send(store, 'Hello');

    expect(store.getState().session).toMatchObject({ credentials: null, forcedSignOut: { idInstance: '4100000001' } });
  });

  it('fails the message when something unexpected goes wrong, so it does not wait forever', async () => {
    // A lone surrogate cannot be put in a URL: the client throws a URIError that is not a GreenApiError.
    const store = createSignedInStore(createMockCredentials('4100000001', '\uD800'));

    const result = await send(store, 'Hello');

    expect(result.meta.requestStatus).toBe('rejected');
    expect(getMessages(store)).toEqual([expect.objectContaining({ status: 'failed', error: 'Not sent.' })]);
    expect(onRequest).not.toHaveBeenCalled();
  });

  it('does not sign a new session out because of a rejection that the old one caused', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post('*/sendMessage/*', async () => {
        await gate;

        return new HttpResponse(null, { status: 401 });
      }),
    );
    const store = createSignedInStore();

    const sending = send(store, 'Hello');
    store.dispatch(sessionActions.signedOut());
    store.dispatch(sessionActions.signedIn(createMockCredentials()));
    release();
    await sending;

    expect(store.getState().session).toMatchObject({ credentials: expect.any(Object) as unknown, forcedSignOut: null });
  });
});
