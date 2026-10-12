const PRIVATE_CHAT_ID_PATTERN = /^\d+$/;

/** A positive integer string is a private Telegram chat. Groups and channels have negative IDs. */
export const isPrivateChatId = (value: unknown): value is string =>
  typeof value === 'string' && PRIVATE_CHAT_ID_PATTERN.test(value);
