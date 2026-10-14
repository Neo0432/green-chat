export interface Chat {
  /** Telegram chat ID, digits. */
  chatId: string;
  /** Normalized digits, no `+`. */
  phone: string | null;
  title: string;
  isTitleFromName: boolean;
  /** Milliseconds since the epoch. */
  createdAt: number;
  /** `max(createdAt, last message timestamp)`, milliseconds. */
  lastActivityAt: number;
  unreadCount: number;
}

export const MESSAGE_STATUSES = ['pending', 'sent', 'delivered', 'read', 'failed'] as const;

export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export interface Message {
  /** A uuid for local sends, `srv-<idMessage>` for received ones. */
  localId: string;
  idMessage: string | null;
  chatId: string;
  direction: 'in' | 'out';
  text: string;
  /** Milliseconds since the epoch. */
  timestamp: number;
  /** `null` for incoming messages. */
  status: MessageStatus | null;
  /** Human-readable, for a failed message. */
  error: string | null;
}

export type MessagesByChat = Partial<Record<string, Message[]>>;

/** What the storage holds for one instance (FR-5.1), without the version. */
export interface ChatData {
  chats: Chat[];
  messages: MessagesByChat;
  activeChatId: string | null;
}

/** A message GREEN-API told us about: it has its `idMessage`. */
export interface ReceivedMessage extends Message {
  idMessage: string;
}

/** A message GREEN-API reported as sent through the API: outgoing, with its `idMessage` and a status. */
export interface ApiMessage extends ReceivedMessage {
  direction: 'out';
  status: MessageStatus;
}
