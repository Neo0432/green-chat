import type { Message } from '../model/types';

import { withStatus } from './status-rank';

/** FR-4.8 (2): a notification only adopts a local message created at most this long ago. */
const RECONCILE_WINDOW_MS = 5 * 60 * 1000;

interface ApiMessageParams {
  idMessage: string;
  text: string;
  now: number;
}

/**
 * FR-4.8 (1)(2): what to do with a message GREEN-API reports as sent through the API. Returns the index of the
 * local message it is, `'duplicate'` when it is known already, and `null` when it is a new message.
 */
export const matchApiMessage = (
  messages: Message[],
  { idMessage, text, now }: ApiMessageParams,
): number | 'duplicate' | null => {
  if (messages.some((message) => message.idMessage === idMessage)) {
    return 'duplicate';
  }

  const index = messages.findIndex(
    (message) =>
      message.direction === 'out' &&
      message.idMessage === null &&
      (message.status === 'pending' || message.status === 'failed') &&
      message.text === text &&
      now - message.timestamp <= RECONCILE_WINDOW_MS,
  );

  return index === -1 ? null : index;
};

/**
 * FR-4.8 (3): the response to SendMessage. If the notification of the same message got here first, its copy is
 * dropped and the local message keeps the higher status of the two. Returns the same list when `localId` is gone,
 * or when the message holds an `idMessage` already: the server has told us about it, and the response adds nothing.
 */
export const applySendSuccess = (messages: Message[], localId: string, idMessage: string): Message[] => {
  const local = messages.find((message) => message.localId === localId);

  if (local?.idMessage !== null) {
    return messages;
  }

  const copy = messages.find((message) => message.idMessage === idMessage && message.localId !== localId);
  const sent = { ...withStatus(local, 'sent'), idMessage };
  const reconciled = copy?.status ? withStatus(sent, copy.status, copy.error) : sent;

  return messages.filter((message) => message !== copy).map((message) => (message === local ? reconciled : message));
};
