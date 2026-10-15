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
  activationCount: number;
}

const { selectAll } = chatsAdapter.getSelectors();

const findChat = (state: ChatsState, chatId: string): Chat | undefined => state.entities[chatId];

const initialState: ChatsState = chatsAdapter.getInitialState({ activeChatId: null, activationCount: 0 });

interface NewChat {
  chatId: string;
  phone: string | null;
  title: string;
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
    chatPhoneSet: (state, { payload }: PayloadAction<{ chatId: string; phone: string }>) => {
      const chat = findChat(state, payload.chatId);

      if (chat?.phone === null) {
        chat.phone = payload.phone;
      }
    },
    chatTitleSetFromName: (state, { payload }: PayloadAction<{ chatId: string; title: string }>) => {
      const chat = findChat(state, payload.chatId);

      if (chat && !chat.isTitleFromName) {
        chat.title = payload.title;
        chat.isTitleFromName = true;
      }
    },
    chatUnreadIncremented: (state, { payload: chatId }: PayloadAction<string>) => {
      const chat = findChat(state, chatId);

      if (chat) {
        chat.unreadCount += 1;
      }
    },
    chatActivated: (state, { payload: chatId }: PayloadAction<string>) => {
      const chat = findChat(state, chatId);

      if (chat) {
        state.activeChatId = chatId;
        state.activationCount += 1;
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
    selectAllChats: selectAll,
    selectActiveChatId: (state) => state.activeChatId,
    selectActivationCount: (state) => state.activationCount,
    selectChatById: (state, chatId: string): Chat | undefined => findChat(state, chatId),
    selectActiveChat: (state): Chat | undefined =>
      state.activeChatId === null ? undefined : findChat(state, state.activeChatId),
    selectChatByPhone: (state, phone: string) => selectAll(state).find((chat) => chat.phone === phone),
    selectSortedChats: createSelector([selectAll], (chats) =>
      chats.toSorted((a, b) => b.lastActivityAt - a.lastActivityAt),
    ),
  },
});

export const { reducer: chatsReducer, actions: chatsActions } = chatsSlice;

export const {
  selectAllChats,
  selectActiveChatId,
  selectActivationCount,
  selectChatById,
  selectActiveChat,
  selectChatByPhone,
  selectSortedChats,
} = chatsSlice.selectors;

export const selectChatData = createSelector(
  [selectAllChats, messagesSlice.selectors.selectAllMessages, selectActiveChatId],
  (chats, messages, activeChatId): ChatData => ({ chats, messages, activeChatId }),
);
