import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { Message, MessagesByChat } from './types';

const initialState: MessagesByChat = {};

const NO_MESSAGES: Message[] = [];

export const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    messagesHydrated: (_state, { payload }: PayloadAction<MessagesByChat>) => payload,
    messagesReset: () => initialState,
  },
  selectors: {
    selectAllMessages: (state) => state,
    /** One stable empty list for a chat without messages, so a component does not re-render for nothing. */
    selectMessagesByChat: (state, chatId: string) => state[chatId] ?? NO_MESSAGES,
    selectLastMessage: (state, chatId: string) => state[chatId]?.at(-1),
  },
});

export const { reducer: messagesReducer, actions: messagesActions } = messagesSlice;

export const { selectMessagesByChat, selectLastMessage } = messagesSlice.selectors;
