const PRIVATE_CHAT_ID_PATTERN = /^\d+$/;

export const isPrivateChatId = (value: unknown): value is string =>
  typeof value === 'string' && PRIVATE_CHAT_ID_PATTERN.test(value);
