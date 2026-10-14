import dayjs from 'dayjs';

import type { Message } from '@entities/chat';

export type MessageListItem =
  { type: 'date'; key: string; timestamp: number } | { type: 'message'; key: string; message: Message };

/** §7.10: a date separator goes before the first message of every calendar day. */
export const buildMessageItems = (messages: Message[]) => {
  const items: MessageListItem[] = [];
  let previousTimestamp: number | null = null;

  for (const message of messages) {
    if (previousTimestamp === null || !dayjs(message.timestamp).isSame(previousTimestamp, 'day')) {
      items.push({ type: 'date', key: `date-${message.localId}`, timestamp: message.timestamp });
    }

    items.push({ type: 'message', key: message.localId, message });
    previousTimestamp = message.timestamp;
  }

  return items;
};
