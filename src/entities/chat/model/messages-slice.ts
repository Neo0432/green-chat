import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

import { applySendSuccess, matchApiMessage } from '../lib/reconcile';
import { withStatus } from '../lib/status-rank';

import type { ApiMessage, Message, MessagesByChat, MessageStatus, ReceivedMessage } from './types';

const initialState: MessagesByChat = {};

const NO_MESSAGES: Message[] = [];

interface MessageRef {
  chatId: string;
  localId: string;
}

interface StatusUpdate {
  idMessage: string;
  chatId?: string;
  status: MessageStatus;
  error?: string;
}

const hasIdMessage = (list: Message[] | undefined, idMessage: string) =>
  list?.some((message) => message.idMessage === idMessage) ?? false;

const updateByLocalId = (list: Message[] | undefined, localId: string, update: (message: Message) => Message) => {
  const index = list?.findIndex((message) => message.localId === localId) ?? -1;

  if (list && index !== -1) {
    list[index] = update(list[index]);
  }
};

export const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    messagesHydrated: (_state, { payload }: PayloadAction<MessagesByChat>) => payload,
    messagesReset: () => initialState,
    outgoingMessageQueued: {
      reducer: (state, { payload }: PayloadAction<Message>) => {
        (state[payload.chatId] ??= []).push(payload);
      },
      prepare: ({ chatId, text }: { chatId: string; text: string }): { payload: Message } => ({
        payload: {
          localId: nanoid(),
          idMessage: null,
          chatId,
          direction: 'out',
          text,
          timestamp: Date.now(),
          status: 'pending',
          error: null,
        },
      }),
    },
    messageSendSucceeded: (state, { payload }: PayloadAction<MessageRef & { idMessage: string }>) => {
      const list = state[payload.chatId];

      if (list) {
        state[payload.chatId] = applySendSuccess(list, payload.localId, payload.idMessage);
      }
    },
    messageSendFailed: (state, { payload }: PayloadAction<MessageRef & { error: string }>) => {
      updateByLocalId(state[payload.chatId], payload.localId, (message) =>
        message.idMessage === null ? withStatus(message, 'failed', payload.error) : message,
      );
    },
    messageRetried: (state, { payload }: PayloadAction<MessageRef>) => {
      updateByLocalId(state[payload.chatId], payload.localId, (message) => ({
        ...message,
        idMessage: null,
        status: 'pending',
        error: null,
      }));
    },
    messageStatusUpdated: (state, { payload: { idMessage, chatId, status, error } }: PayloadAction<StatusUpdate>) => {
      const chatIds = chatId === undefined ? Object.keys(state) : [chatId, ...Object.keys(state)];

      for (const id of chatIds) {
        const list = state[id];
        const index = list?.findIndex((message) => message.idMessage === idMessage) ?? -1;

        if (list && index !== -1) {
          list[index] = withStatus(list[index], status, error);

          return;
        }
      }
    },
    messageReceived: (state, { payload }: PayloadAction<ReceivedMessage>) => {
      const list = (state[payload.chatId] ??= []);

      if (!hasIdMessage(list, payload.idMessage)) {
        list.push(payload);
      }
    },
    apiMessageReceived: (state, { payload }: PayloadAction<ApiMessage>) => {
      const list = (state[payload.chatId] ??= []);
      const match = matchApiMessage(list, { idMessage: payload.idMessage, text: payload.text, now: Date.now() });

      if (match === null) {
        list.push(payload);
      } else if (match !== 'duplicate') {
        list[match] = { ...withStatus(list[match], 'sent'), idMessage: payload.idMessage };
      }
    },
  },
  selectors: {
    selectAllMessages: (state) => state,
    selectMessagesByChat: (state, chatId: string) => state[chatId] ?? NO_MESSAGES,
    selectLastMessage: (state, chatId: string) => state[chatId]?.at(-1),
    selectHasMessage: (state, chatId: string, idMessage: string) => hasIdMessage(state[chatId], idMessage),
  },
});

export const { reducer: messagesReducer, actions: messagesActions } = messagesSlice;

export const { selectMessagesByChat, selectLastMessage, selectHasMessage } = messagesSlice.selectors;
