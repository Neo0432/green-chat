export const AVATAR_COLORS = ['red', 'orange', 'violet', 'green', 'cyan', 'blue', 'pink'] as const;

export type AvatarColor = (typeof AVATAR_COLORS)[number];

const SEED_LENGTH = 6;
const INTEGER = /^-?\d+$/;

const hashString = (value: string) => {
  let hash = 0;

  for (const char of value) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  }

  return hash;
};

export const getAvatarColor = (chatId: string): AvatarColor => {
  const seed = chatId.slice(-SEED_LENGTH);
  const index = (INTEGER.test(seed) ? Math.abs(Number(seed)) : hashString(chatId)) % AVATAR_COLORS.length;

  return AVATAR_COLORS[index];
};
