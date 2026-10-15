import type { Message } from '../model/types';

import { toServerLocalId } from './server-local-id';
import { withStatus } from './status-rank';

const LOCAL_MESSAGE_ADOPTION_WINDOW_MS = 5 * 60 * 1000;

interface ApiMessageParams {
  idMessage: string;
  text: string;
  now: number;
}

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
      now - message.timestamp <= LOCAL_MESSAGE_ADOPTION_WINDOW_MS,
  );

  return index === -1 ? null : index;
};

const takeServerState = (message: Message, from: Message): Message => ({
  ...message,
  idMessage: from.idMessage,
  status: from.status,
  error: from.error,
});

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
