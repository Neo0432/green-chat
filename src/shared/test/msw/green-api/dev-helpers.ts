import type { StateInstance } from '@shared/api/green-api';

import type { GreenApiMockState } from './mock-state';
import {
  createIncomingNotification,
  createOutgoingNotification,
  createQuotaExceededNotification,
  createStateChangedNotification,
  getContactName,
} from './notification-factories';

interface IncomingOptions {
  senderName?: string;
  typeMessage?: string;
}

interface GreenChatMock {
  incoming: (chatIdOrPhone: string, text: string, options?: IncomingOptions) => void;
  fromPhone: (chatIdOrPhone: string, text: string) => void;
  setState: (stateInstance: StateInstance) => void;
  quota: () => void;
  raw: (body: unknown) => void;
  queue: () => number;
  offline: (isOffline: boolean) => void;
}

declare global {
  interface Window {
    __greenChatMock?: GreenChatMock;
  }
}

const CHAT_ID_INPUT_PATTERN = /^(-\d+|\d{1,8})$/;

const resolveChatId = (state: GreenApiMockState, chatIdOrPhone: string) => {
  const value = chatIdOrPhone.trim();

  return CHAT_ID_INPUT_PATTERN.test(value) ? value : state.registerPhone(value.replaceAll(/\D/g, ''));
};

export const createDevHelpers = (state: GreenApiMockState): GreenChatMock => ({
  incoming: (chatIdOrPhone, text, { senderName, typeMessage } = {}) => {
    const { activeInstance: idInstance } = state;
    const chatId = resolveChatId(state, chatIdOrPhone);

    state.enqueue(
      idInstance,
      createIncomingNotification({
        idInstance,
        chatId,
        text,
        typeMessage,
        idMessage: state.createMessageId(),
        senderName: senderName ?? getContactName(chatId),
        senderPhone: Number(state.getPhone(chatId) ?? 0),
      }),
    );
  },

  fromPhone: (chatIdOrPhone, text) => {
    const { activeInstance: idInstance } = state;
    const chatId = resolveChatId(state, chatIdOrPhone);

    state.enqueue(
      idInstance,
      createOutgoingNotification({
        idInstance,
        chatId,
        text,
        source: 'phone',
        idMessage: state.createMessageId(),
        recipientName: getContactName(chatId),
      }),
    );
  },

  setState: (stateInstance) => {
    const { activeInstance: idInstance } = state;

    state.setStateInstance(idInstance, stateInstance);
    state.enqueue(idInstance, createStateChangedNotification({ idInstance, stateInstance }));
  },

  quota: () => {
    const { activeInstance: idInstance } = state;

    state.enqueue(idInstance, createQuotaExceededNotification({ idInstance }));
  },

  raw: (body) => {
    state.enqueue(state.activeInstance, body);
  },

  queue: () => state.getQueueLength(state.activeInstance),

  offline: (isOffline) => {
    state.setOffline(isOffline);
  },
});

export const installDevHelpers = (state: GreenApiMockState) => {
  window.__greenChatMock = createDevHelpers(state);
};
