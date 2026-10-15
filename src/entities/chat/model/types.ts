export interface Chat {
  chatId: string;
  phone: string | null;
  title: string;
  isTitleFromName: boolean;
  createdAt: number;
  lastActivityAt: number;
  unreadCount: number;
}

export const MESSAGE_STATUSES = ['pending', 'sent', 'delivered', 'read', 'failed'] as const;

export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export interface Message {
  localId: string;
  idMessage: string | null;
  chatId: string;
  direction: 'in' | 'out';
  text: string;
  timestamp: number;
  status: MessageStatus | null;
  error: string | null;
}

export type MessagesByChat = Partial<Record<string, Message[]>>;

export interface ChatData {
  chats: Chat[];
  messages: MessagesByChat;
  activeChatId: string | null;
}

export interface ReceivedMessage extends Message {
  idMessage: string;
}

export interface ApiMessage extends ReceivedMessage {
  direction: 'out';
  status: MessageStatus;
}
