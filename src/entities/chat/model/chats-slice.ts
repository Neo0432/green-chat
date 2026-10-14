import {
  createEntityAdapter,
  createSelector,
  createSlice,
  type EntityState,
  isAnyOf,
  type PayloadAction,
} from '@reduxjs/toolkit';

import { messagesActions, messagesSlice } from './messages-slice';
import type { Chat, ChatData } from './types';

export const chatsAdapter = createEntityAdapter<Chat, string>({ selectId: (chat) => chat.chatId });

export interface ChatsState extends EntityState<Chat, string> {
  activeChatId: string | null;
}

const { selectAll } = chatsAdapter.getSelectors();

/** Reads the draft: the adapter's selectById returns a current() snapshot, so writes to it would be lost. */
const findChat = (state: ChatsState, chatId: string): Chat | undefined => state.entities[chatId];

const initialState: ChatsState = chatsAdapter.getInitialState({ activeChatId: null });

interface NewChat {
  chatId: string;
  phone: string | null;
  title: string;
  /** A chat made from a notification starts at the time of its first message, so that the list sorts by it. */
  createdAt?: number;
}

export const chatsSlice = createSlice({
  name: 'chats',
  initialState,
  reducers: {
    chatCreated: {
      reducer: (state, { payload }: PayloadAction<Chat>) => {
        chatsAdapter.addOne(state, payload);
      },
      prepare: ({ chatId, phone, title, createdAt = Date.now() }: NewChat) => ({
        payload: {
          chatId,
          phone,
          title,
          isTitleFromName: false,
          createdAt,
          lastActivityAt: createdAt,
          unreadCount: 0,
        },
      }),
    },
    /** Only fills a missing phone: a chat reached by two numbers keeps the first one. */
    chatPhoneSet: (state, { payload }: PayloadAction<{ chatId: string; phone: string }>) => {
      const chat = findChat(state, payload.chatId);

      if (chat?.phone === null) {
        chat.phone = payload.phone;
      }
    },
    /** FR-2.8: a name replaces the placeholder title once, and is never overwritten afterwards. */
    chatTitleSetFromName: (state, { payload }: PayloadAction<{ chatId: string; title: string }>) => {
      const chat = findChat(state, payload.chatId);

      if (chat && !chat.isTitleFromName) {
        chat.title = payload.title;
        chat.isTitleFromName = true;
      }
    },
    /** FR-4.5 (f) */
    chatUnreadIncremented: (state, { payload: chatId }: PayloadAction<string>) => {
      const chat = findChat(state, chatId);

      if (chat) {
        chat.unreadCount += 1;
      }
    },
    /** FR-2.7 */
    chatActivated: (state, { payload: chatId }: PayloadAction<string>) => {
      const chat = findChat(state, chatId);

      if (chat) {
        state.activeChatId = chatId;
        chat.unreadCount = 0;
      }
    },
    chatDeactivated: (state) => {
      state.activeChatId = null;
    },
    chatsHydrated: (state, { payload }: PayloadAction<Pick<ChatData, 'chats' | 'activeChatId'>>) => {
      chatsAdapter.setAll(state, payload.chats);
      state.activeChatId = payload.activeChatId;
    },
    chatsReset: () => initialState,
  },
  extraReducers: (builder) => {
    // FR-5.2: the activity of a chat is the time of its last message.
    builder.addMatcher(
      isAnyOf(
        messagesActions.outgoingMessageQueued,
        messagesActions.messageReceived,
        messagesActions.apiMessageReceived,
      ),
      (state, { payload }) => {
        const chat = findChat(state, payload.chatId);

        if (chat) {
          chat.lastActivityAt = Math.max(chat.lastActivityAt, payload.timestamp);
        }
      },
    );
  },
  selectors: {
    /** Insertion order. */
    selectAllChats: selectAll,
    selectActiveChatId: (state) => state.activeChatId,
    selectChatById: (state, chatId: string): Chat | undefined => findChat(state, chatId),
    selectActiveChat: (state): Chat | undefined =>
      state.activeChatId === null ? undefined : findChat(state, state.activeChatId),
    selectChatByPhone: (state, phone: string) => selectAll(state).find((chat) => chat.phone === phone),
    /** FR-2.1: the sort is stable, so ties keep the insertion order. */
    selectSortedChats: createSelector([selectAll], (chats) =>
      chats.toSorted((a, b) => b.lastActivityAt - a.lastActivityAt),
    ),
  },
});

export const { reducer: chatsReducer, actions: chatsActions } = chatsSlice;

export const {
  selectAllChats,
  selectActiveChatId,
  selectChatById,
  selectActiveChat,
  selectChatByPhone,
  selectSortedChats,
} = chatsSlice.selectors;

/** What gets persisted. It reads both slices, but it is the chats that it describes. */
export const selectChatData = createSelector(
  [selectAllChats, messagesSlice.selectors.selectAllMessages, selectActiveChatId],
  (chats, messages, activeChatId): ChatData => ({ chats, messages, activeChatId }),
);
