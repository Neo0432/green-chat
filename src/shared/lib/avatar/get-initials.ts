const FALLBACK_INITIALS = '?';
const MAX_INITIALS = 2;
const ALPHANUMERIC = /[\p{L}\p{N}]/u;

export const getInitials = (title: string) => {
  const initials = title
    .split(/\s+/)
    .flatMap((word) => ALPHANUMERIC.exec(word)?.[0] ?? [])
    .slice(0, MAX_INITIALS)
    .join('')
    .toUpperCase();

  return initials || FALLBACK_INITIALS;
};
