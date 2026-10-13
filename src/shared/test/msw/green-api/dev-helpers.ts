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
  /** Anything but a text type queues a file message, which the app ignores. */
  typeMessage?: string;
}

/** MK-10: console helpers that write to the queue of the instance that talked to the mock last. */
interface GreenChatMock {
  incoming: (chatIdOrPhone: string, text: string, options?: IncomingOptions) => void;
  /** A message sent from the phone, or from another Telegram client. */
  fromPhone: (chatIdOrPhone: string, text: string) => void;
  /** Changes what getStateInstance answers and queues a `stateInstanceChanged`. */
  setState: (stateInstance: StateInstance) => void;
  quota: () => void;
  raw: (body: unknown) => void;
  queue: () => number;
  /** While on, every request fails with a network error. Unlike the devtools "Offline", it works with the mock. */
  offline: (isOffline: boolean) => void;
}

declare global {
  interface Window {
    __greenChatMock?: GreenChatMock;
  }
}

/** A negative ID or up to 8 digits is a chat ID (the ones the mock makes have 8). Anything else is a phone number. */
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
