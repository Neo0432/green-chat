import type { Chat, Message } from '@entities/chat';

export const buildChat = (overrides: Partial<Chat> = {}): Chat => ({
  chatId: '10000001',
  phone: null,
  title: 'Alice',
  isTitleFromName: false,
  createdAt: 1_000,
  lastActivityAt: 1_000,
  unreadCount: 0,
  ...overrides,
});

export const buildMessage = (overrides: Partial<Message> = {}): Message => ({
  localId: 'local-1',
  idMessage: null,
  chatId: '10000001',
  direction: 'out',
  text: 'Hello',
  timestamp: 1_000,
  status: 'sent',
  error: null,
  ...overrides,
});
