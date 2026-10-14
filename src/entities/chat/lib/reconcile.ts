import type { Message } from '../model/types';

import { toServerLocalId } from './server-local-id';
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

/** What a notification tells about a message: its server id and the state that goes with it. */
const takeServerState = (message: Message, from: Message): Message => ({
  ...message,
  idMessage: from.idMessage,
  status: from.status,
  error: from.error,
});

/**
 * FR-4.8 (3): the response to SendMessage is the truth about the `idMessage` of `localId`. If a notification got
 * here first, the message it made is dropped and the local one keeps the higher status of the two. If the
 * notification was adopted by another local message with the same text (FR-4.8 (2) can only guess), the two swap
 * their server ids and states, so no bubble is lost or moved. Returns the same list when `localId` is gone, or
 * when the message holds this `idMessage` already.
 */
export const applySendSuccess = (messages: Message[], localId: string, idMessage: string): Message[] => {
  const local = messages.find((message) => message.localId === localId);

  if (!local || local.idMessage === idMessage) {
    return messages;
  }

  const holder = messages.find((message) => message.idMessage === idMessage);

  if (holder && holder.localId !== toServerLocalId(idMessage)) {
    return messages.map((message) => {
      if (message === local) {
        return takeServerState(local, holder);
      }

      return message === holder ? takeServerState(holder, local) : message;
    });
  }

  const sent: Message = { ...local, idMessage, status: 'sent', error: null };
  const reconciled = holder?.status ? withStatus(sent, holder.status, holder.error) : sent;

  return messages.filter((message) => message !== holder).map((message) => (message === local ? reconciled : message));
};
