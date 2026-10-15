import { APP_STORAGE_PREFIX, isPlainObject, readJson, writeJson } from '@shared/lib';

import { type Chat, type ChatData, type Message, MESSAGE_STATUSES, type MessagesByChat } from '../model/types';

const DATA_VERSION = 1;
const MAX_MESSAGES_PER_CHAT = 500;
const UNSENT_ERROR = 'Not sent';

interface StoredChatData extends ChatData {
  version: typeof DATA_VERSION;
}

const getDataKey = (idInstance: string) => `${APP_STORAGE_PREFIX}v1:data:${idInstance}`;

const isFiniteNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value);

const isNullOrString = (value: unknown) => value === null || typeof value === 'string';

const isChat = (value: unknown): value is Chat =>
  isPlainObject(value) &&
  typeof value.chatId === 'string' &&
  isNullOrString(value.phone) &&
  typeof value.title === 'string' &&
  typeof value.isTitleFromName === 'boolean' &&
  isFiniteNumber(value.createdAt) &&
  isFiniteNumber(value.lastActivityAt) &&
  isFiniteNumber(value.unreadCount);

const isMessage = (value: unknown): value is Message =>
  isPlainObject(value) &&
  typeof value.localId === 'string' &&
  isNullOrString(value.idMessage) &&
  typeof value.chatId === 'string' &&
  (value.direction === 'in' || value.direction === 'out') &&
  typeof value.text === 'string' &&
  isFiniteNumber(value.timestamp) &&
  (value.status === null || MESSAGE_STATUSES.some((status) => status === value.status)) &&
  isNullOrString(value.error);

const isMessagesByChat = (value: unknown): value is MessagesByChat =>
  isPlainObject(value) && Object.values(value).every((list) => Array.isArray(list) && list.every(isMessage));

const isStoredChatData = (value: unknown): value is StoredChatData =>
  isPlainObject(value) &&
  value.version === DATA_VERSION &&
  Array.isArray(value.chats) &&
  value.chats.every(isChat) &&
  isMessagesByChat(value.messages) &&
  isNullOrString(value.activeChatId);

const failPending = (message: Message): Message =>
  message.status === 'pending' ? { ...message, status: 'failed', error: UNSENT_ERROR } : message;

export const loadChatData = (idInstance: string): ChatData | null => {
  const stored = readJson(getDataKey(idInstance));

  if (!isStoredChatData(stored)) {
    return null;
  }

  const messages = Object.fromEntries(
    Object.entries(stored.messages).map(([chatId, list]) => [chatId, list?.map(failPending)]),
  );
  const hasActiveChat = stored.chats.some((chat) => chat.chatId === stored.activeChatId);

  return { chats: stored.chats, messages, activeChatId: hasActiveChat ? stored.activeChatId : null };
};

export const saveChatData = (idInstance: string, { chats, messages, activeChatId }: ChatData) => {
  const lastMessages = Object.fromEntries(
    Object.entries(messages).map(([chatId, list]) => [chatId, list?.slice(-MAX_MESSAGES_PER_CHAT)]),
  );

  writeJson(getDataKey(idInstance), { version: DATA_VERSION, chats, messages: lastMessages, activeChatId });
};
