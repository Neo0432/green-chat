import { createAppStore } from '@app/store';

import { signOut } from '@features/sign-out/model/sign-out';

import { chatsActions, loadChatData, saveChatData } from '@entities/chat';
import { sessionActions } from '@entities/session';

import { createMockCredentials } from '@shared/test/msw/green-api';

import { buildChat, buildMessage } from '../../entities/chat/fixtures';

const CREDENTIALS = createMockCredentials();
const ID_INSTANCE = CREDENTIALS.idInstance;
const DATA_KEY = `green-chat:v1:data:${ID_INSTANCE}`;

const STORED = {
  chats: [buildChat({ chatId: '10000001', title: 'Alice' })],
  messages: {
    '10000001': [
      buildMessage({ localId: 'sent', text: 'Hi' }),
      buildMessage({ localId: 'stuck', text: 'Anyone?', status: 'pending' }),
    ],
  },
  activeChatId: '10000001',
};

const createSignedInStore = () =>
  createAppStore({ session: { credentials: CREDENTIALS, instanceState: 'authorized', forcedSignOut: null } });

const createNewChat = (store: ReturnType<typeof createAppStore>, chatId: string) => {
  store.dispatch(chatsActions.chatCreated({ chatId, phone: null, title: `Chat ${chatId}` }));
};

const getStoredChatIds = () => loadChatData(ID_INSTANCE)?.chats.map((chat) => chat.chatId);

describe('chat persistence', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('hydration', () => {
    it('restores the chats of the stored session at start, a pending message turned failed (AC-5)', () => {
      saveChatData(ID_INSTANCE, STORED);

      const { chats, messages } = createSignedInStore().getState();

      expect(chats.activeChatId).toBe('10000001');
      expect(chats.ids).toEqual(['10000001']);
      expect(messages['10000001']?.map(({ localId, status }) => [localId, status])).toEqual([
        ['sent', 'sent'],
        ['stuck', 'failed'],
      ]);
    });

    it('starts empty when nothing is stored', () => {
      const { chats, messages } = createSignedInStore().getState();

      expect(chats.ids).toEqual([]);
      expect(messages).toEqual({});
    });

    it('restores the chats of the instance that signs in', () => {
      saveChatData(ID_INSTANCE, STORED);
      const store = createAppStore({});

      store.dispatch(sessionActions.signedIn(CREDENTIALS));

      expect(store.getState().chats.ids).toEqual(['10000001']);
      expect(store.getState().chats.activeChatId).toBe('10000001');
    });
  });

  describe('saving', () => {
    it('saves 500 ms after the last change, once for a burst of changes', async () => {
      const setItem = jest.spyOn(Storage.prototype, 'setItem');
      const store = createSignedInStore();

      createNewChat(store, '1');
      await jest.advanceTimersByTimeAsync(300);
      createNewChat(store, '2');
      await jest.advanceTimersByTimeAsync(499);

      expect(window.localStorage.getItem(DATA_KEY)).toBeNull();

      await jest.advanceTimersByTimeAsync(1);

      expect(getStoredChatIds()).toEqual(['1', '2']);
      expect(setItem).toHaveBeenCalledTimes(1);
    });

    it('saves the active chat too', async () => {
      const store = createSignedInStore();
      createNewChat(store, '1');
      store.dispatch(chatsActions.chatActivated('1'));

      await jest.advanceTimersByTimeAsync(500);

      expect(loadChatData(ID_INSTANCE)?.activeChatId).toBe('1');
    });

    it('saves at once when the page is hidden', () => {
      const store = createSignedInStore();
      createNewChat(store, '1');

      window.dispatchEvent(new Event('pagehide'));

      expect(getStoredChatIds()).toEqual(['1']);
    });

    it('writes nothing without a session', async () => {
      createNewChat(createAppStore({}), '1');

      await jest.advanceTimersByTimeAsync(1_000);

      expect(window.localStorage).toHaveLength(0);
    });

    it('keeps working in memory when the storage is full', async () => {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      });
      const store = createSignedInStore();

      createNewChat(store, '1');
      await jest.advanceTimersByTimeAsync(500);

      expect(Object.values(store.getState().chats.entities)).toHaveLength(1);
    });
  });

  describe('end of the session', () => {
    it('empties the chats on logout, leaves no key behind and starts empty on the next sign-in (FR-1.8)', async () => {
      const store = createSignedInStore();
      createNewChat(store, '1');
      await jest.advanceTimersByTimeAsync(500);
      createNewChat(store, '2');

      store.dispatch(signOut());
      await jest.advanceTimersByTimeAsync(1_000);

      expect(store.getState().chats.ids).toEqual([]);
      expect(window.localStorage).toHaveLength(0);

      store.dispatch(sessionActions.signedIn(CREDENTIALS));

      expect(store.getState().chats.ids).toEqual([]);
    });

    it('empties the chats on a forced sign-out but keeps the history, the unsaved changes too (FR-1.9)', async () => {
      const store = createSignedInStore();
      createNewChat(store, '1');
      await jest.advanceTimersByTimeAsync(500);
      createNewChat(store, '2');

      store.dispatch(sessionActions.forcedSignOut());
      await jest.advanceTimersByTimeAsync(1_000);

      expect(store.getState().chats.ids).toEqual([]);
      expect(getStoredChatIds()).toEqual(['1', '2']);

      store.dispatch(sessionActions.signedIn(CREDENTIALS));

      expect(store.getState().chats.ids).toEqual(['1', '2']);
    });
  });
});
