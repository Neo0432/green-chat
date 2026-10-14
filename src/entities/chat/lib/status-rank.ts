import type { Message, MessageStatus } from '../model/types';

const RANKS = { failed: -1, pending: 0, sent: 1, delivered: 2, read: 3 } satisfies Record<MessageStatus, number>;

/** FR-3.8: a status never goes down, except to `failed`, which replaces anything but `read`. */
export const getNextStatus = (current: MessageStatus, incoming: MessageStatus): MessageStatus => {
  if (incoming === 'failed') {
    return current === 'read' ? current : incoming;
  }

  return RANKS[incoming] > RANKS[current] ? incoming : current;
};

/**
 * The message with the status the rank rule allows, or the very same message when nothing changes. The error text
 * belongs to `failed` only. An incoming message has no status to change.
 */
export const withStatus = (message: Message, incoming: MessageStatus, error: string | null = null): Message => {
  if (message.status === null) {
    return message;
  }

  const status = getNextStatus(message.status, incoming);
  const nextError = status === 'failed' ? (error ?? message.error) : null;

  return status === message.status && nextError === message.error ? message : { ...message, status, error: nextError };
};
