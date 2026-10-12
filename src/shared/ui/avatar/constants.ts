export const AVATAR_SIZES = [54, 42] as const;

export type AvatarSize = (typeof AVATAR_SIZES)[number];
