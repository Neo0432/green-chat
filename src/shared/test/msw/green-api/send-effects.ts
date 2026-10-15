import type { GreenApiMockState } from './mock-state';
import {
  createIncomingNotification,
  createOutgoingNotification,
  createStatusNotification,
  getContactName,
} from './notification-factories';

export type Scheduler = (callback: () => void, delayMs: number) => void;

export const timerScheduler: Scheduler = (callback, delayMs) => {
  setTimeout(callback, delayMs);
};

const DELIVERED_AFTER_MS = 1000;
const READ_AFTER_MS = 2000;
const ECHO_AFTER_MS = 3000;
const STATUS_FAILURE_AFTER_MS = 1000;
const ECHO_TEXT_MAX_LENGTH = 200;

interface SendEffectsParams {
  state: GreenApiMockState;
  scheduler: Scheduler;
  idInstance: string;
  chatId: string;
  idMessage: string;
  text: string;
  markers: ReadonlySet<string>;
}

export const startSendEffects = ({
  state,
  scheduler,
  idInstance,
  chatId,
  idMessage,
  text,
  markers,
}: SendEffectsParams) => {
  const later = (delayMs: number, createBody: () => unknown) => {
    scheduler(() => {
      state.enqueue(idInstance, createBody());
    }, delayMs);
  };
  const createStatus = (status: 'delivered' | 'read' | 'failed' | 'noAccount', description?: string) =>
    createStatusNotification({ idInstance, chatId, idMessage, status, description });

  state.enqueue(
    idInstance,
    createOutgoingNotification({
      idInstance,
      chatId,
      idMessage,
      text,
      source: 'api',
      recipientName: getContactName(chatId),
    }),
  );

  if (markers.has('#status-failed')) {
    later(STATUS_FAILURE_AFTER_MS, () => createStatus('failed', 'Mock: Telegram rejected the message'));

    return;
  }

  if (markers.has('#no-account')) {
    later(STATUS_FAILURE_AFTER_MS, () => createStatus('noAccount'));

    return;
  }

  later(DELIVERED_AFTER_MS, () => createStatus('delivered'));
  later(READ_AFTER_MS, () => createStatus('read'));

  if (!markers.has('#noreply')) {
    later(ECHO_AFTER_MS, () =>
      createIncomingNotification({
        idInstance,
        chatId,
        idMessage: state.createMessageId(),
        text: `Echo: ${text.slice(0, ECHO_TEXT_MAX_LENGTH)}`,
        senderName: getContactName(chatId),
        senderPhone: Number(state.getPhone(chatId) ?? 0),
      }),
    );
  }
};
