import { createAppStore } from '@app/store';

import {
  type Chat,
  chatsActions,
  chatsReducer,
  messagesActions,
  type MessagesByChat,
  selectActiveChat,
  selectActiveChatId,
  selectChatById,
  selectChatByPhone,
  selectChatData,
  selectSortedChats,
} from '@entities/chat';

import { buildChat, buildMessage } from '../fixtures';

type ChatsState = ReturnType<typeof chatsReducer>;

const reduce = (state: ChatsState | undefined, ...actions: Parameters<typeof chatsReducer>[1][]) =>
  actions.reduce(chatsReducer, state ?? chatsReducer(undefined, { type: 'init' }));

const createStore = (chats: Chat[] = [], activeChatId: string | null = null, messages: MessagesByChat = {}) => {
  const store = createAppStore({});

  store.dispatch(chatsActions.chatsHydrated({ chats, activeChatId }));
  store.dispatch(messagesActions.messagesHydrated(messages));

  return store;
};

describe('chats slice', () => {
  describe('reducer', () => {
    beforeEach(() => {
      jest.useFakeTimers({ now: 5_000 });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('creates a chat with the current time and no unread messages', () => {
      const state = reduce(
        undefined,
        chatsActions.chatCreated({ chatId: '11', phone: '79001234567', title: '+79001234567' }),
      );

      expect(state.entities['11']).toEqual({
        chatId: '11',
        phone: '79001234567',
        title: '+79001234567',
        isTitleFromName: false,
        createdAt: 5_000,
        lastActivityAt: 5_000,
        unreadCount: 0,
      });
      expect(state.activeChatId).toBeNull();
    });

    it('creates a chat at the time it is given, so the list sorts by the time of its first message', () => {
      const state = reduce(
        undefined,
        chatsActions.chatCreated({ chatId: '11', phone: null, title: 'Alice', createdAt: 1_000 }),
      );

      expect(state.entities['11']).toMatchObject({ createdAt: 1_000, lastActivityAt: 1_000 });
    });

    it('does not replace a chat that already exists', () => {
      const state = reduce(
        undefined,
        chatsActions.chatCreated({ chatId: '11', phone: null, title: 'First' }),
        chatsActions.chatCreated({ chatId: '11', phone: null, title: 'Second' }),
      );

      expect(state.ids).toEqual(['11']);
      expect(state.entities['11'].title).toBe('First');
    });

    it('sets the phone of a chat that has none', () => {
      const state = reduce(
        undefined,
        chatsActions.chatCreated({ chatId: '11', phone: null, title: 'Alice' }),
        chatsActions.chatPhoneSet({ chatId: '11', phone: '79001234567' }),
      );

      expect(state.entities['11'].phone).toBe('79001234567');
    });

    it('keeps the phone a chat already has', () => {
      const state = reduce(
        undefined,
        chatsActions.chatCreated({ chatId: '11', phone: '79001234567', title: 'Alice' }),
        chatsActions.chatPhoneSet({ chatId: '11', phone: '79990000000' }),
      );

      expect(state.entities['11'].phone).toBe('79001234567');
    });

    it('replaces a placeholder title with a name once, and never overwrites a name (FR-2.8)', () => {
      const state = reduce(
        undefined,
        chatsActions.chatCreated({ chatId: '11', phone: '79001234567', title: '+79001234567' }),
        chatsActions.chatTitleSetFromName({ chatId: '11', title: 'Alice' }),
        chatsActions.chatTitleSetFromName({ chatId: '11', title: 'Bob' }),
      );

      expect(state.entities['11']).toMatchObject({ title: 'Alice', isTitleFromName: true });
    });

    it('ignores a name for a chat that does not exist', () => {
      const state = reduce(undefined, chatsActions.chatTitleSetFromName({ chatId: '404', title: 'Alice' }));

      expect(state.ids).toEqual([]);
    });

    it('counts unread messages', () => {
      const state = reduce(
        undefined,
        chatsActions.chatCreated({ chatId: '11', phone: null, title: 'Alice' }),
        chatsActions.chatUnreadIncremented('11'),
        chatsActions.chatUnreadIncremented('11'),
        chatsActions.chatUnreadIncremented('404'),
      );

      expect(state.entities['11'].unreadCount).toBe(2);
      expect(state.ids).toEqual(['11']);
    });

    it('activates a chat and resets its unread count (FR-2.7)', () => {
      const hydrated = reduce(
        undefined,
        chatsActions.chatsHydrated({
          chats: [buildChat({ chatId: '11', unreadCount: 3 }), buildChat({ chatId: '12', unreadCount: 2 })],
          activeChatId: null,
        }),
      );

      const state = reduce(hydrated, chatsActions.chatActivated('11'));

      expect(state.activeChatId).toBe('11');
      expect(state.entities['11'].unreadCount).toBe(0);
      expect(state.entities['12'].unreadCount).toBe(2);
    });

    it('ignores the activation of an unknown chat', () => {
      const state = reduce(undefined, chatsActions.chatActivated('404'));

      expect(state.activeChatId).toBeNull();
    });

    it('replaces everything on hydration', () => {
      const state = reduce(
        undefined,
        chatsActions.chatCreated({ chatId: '11', phone: null, title: 'Old' }),
        chatsActions.chatsHydrated({ chats: [buildChat({ chatId: '12' })], activeChatId: '12' }),
      );

      expect(state.ids).toEqual(['12']);
      expect(state.activeChatId).toBe('12');
    });

    it('empties the state on reset', () => {
      const state = reduce(
        undefined,
        chatsActions.chatCreated({ chatId: '11', phone: null, title: 'Alice' }),
        chatsActions.chatActivated('11'),
        chatsActions.chatsReset(),
      );

      expect(state.ids).toEqual([]);
      expect(state.activeChatId).toBeNull();
    });
  });

  describe('selectSortedChats', () => {
    it('sorts by last activity, newest first (FR-2.1)', () => {
      const store = createStore([
        buildChat({ chatId: '1', lastActivityAt: 100 }),
        buildChat({ chatId: '2', lastActivityAt: 300 }),
        buildChat({ chatId: '3', lastActivityAt: 200 }),
      ]);

      expect(selectSortedChats(store.getState()).map((chat) => chat.chatId)).toEqual(['2', '3', '1']);
    });

    it('keeps the insertion order of chats with the same last activity', () => {
      const store = createStore([
        buildChat({ chatId: '1', lastActivityAt: 100 }),
        buildChat({ chatId: '2', lastActivityAt: 200 }),
        buildChat({ chatId: '3', lastActivityAt: 100 }),
        buildChat({ chatId: '4', lastActivityAt: 200 }),
      ]);

      expect(selectSortedChats(store.getState()).map((chat) => chat.chatId)).toEqual(['2', '4', '1', '3']);
    });

    it('returns the same array until the chats change', () => {
      const store = createStore([buildChat()]);

      expect(selectSortedChats(store.getState())).toBe(selectSortedChats(store.getState()));
    });
  });

  describe('chat lookups', () => {
    const chats = [buildChat({ chatId: '1', phone: '79001234567' }), buildChat({ chatId: '2', phone: null })];

    it('finds a chat by id', () => {
      const store = createStore(chats);

      expect(selectChatById(store.getState(), '2')).toEqual(chats[1]);
      expect(selectChatById(store.getState(), '404')).toBeUndefined();
    });

    it('finds a chat by its phone', () => {
      const store = createStore(chats);

      expect(selectChatByPhone(store.getState(), '79001234567')?.chatId).toBe('1');
      expect(selectChatByPhone(store.getState(), '79990000000')).toBeUndefined();
    });

    it('returns the active chat and its id, or nothing when no chat is active', () => {
      const active = createStore(chats, '2').getState();
      const inactive = createStore(chats).getState();

      expect(selectActiveChat(active)?.chatId).toBe('2');
      expect(selectActiveChatId(active)).toBe('2');
      expect(selectActiveChat(inactive)).toBeUndefined();
      expect(selectActiveChatId(inactive)).toBeNull();
    });
  });

  describe('selectChatData', () => {
    it('gathers what gets persisted, and stays the same object until the state changes', () => {
      const chats = [buildChat({ chatId: '1' })];
      const messages = { '1': [buildMessage({ chatId: '1' })] };
      const store = createStore(chats, '1', messages);

      const data = selectChatData(store.getState());

      expect(data).toEqual({ chats, messages, activeChatId: '1' });
      expect(selectChatData(store.getState())).toBe(data);

      store.dispatch(chatsActions.chatActivated('1'));
      store.dispatch(chatsActions.chatCreated({ chatId: '2', phone: null, title: 'Bob' }));

      expect(selectChatData(store.getState())).not.toBe(data);
    });
  });
});
