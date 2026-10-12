const FALLBACK_INITIALS = '?';
const MAX_WORDS = 2;
const ALPHANUMERIC = /[\p{L}\p{N}]/u;

export const getInitials = (title: string) => {
  const initials = title
    .trim()
    .split(/\s+/)
    .slice(0, MAX_WORDS)
    .map((word) => ALPHANUMERIC.exec(word)?.[0].toUpperCase() ?? '')
    .join('');

  return initials || FALLBACK_INITIALS;
};
