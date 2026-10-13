export const APP_STORAGE_PREFIX = 'green-chat:';

export type WriteJsonResult = { ok: true } | { ok: false; reason: 'quota' | 'unavailable' };

const isQuotaError = (error: unknown) => error instanceof DOMException && error.name === 'QuotaExceededError';

/**
 * Every access to `window.localStorage` sits in a `try`: the getter itself throws when site data is blocked, and
 * the methods throw in some private modes or when the storage is full. A missing, corrupt or unreadable value is `null`.
 */
export const readJson = (key: string): unknown => {
  try {
    const raw = window.localStorage.getItem(key);

    if (raw === null) {
      return null;
    }

    const value: unknown = JSON.parse(raw);

    return value;
  } catch {
    // Unavailable storage and corrupt JSON both mean there is nothing usable to read.
    return null;
  }
};

export const writeJson = (key: string, value: unknown): WriteJsonResult => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));

    return { ok: true };
  } catch (error) {
    return { ok: false, reason: isQuotaError(error) ? 'quota' : 'unavailable' };
  }
};

export const removeKey = (key: string) => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Unavailable storage holds nothing to remove.
  }
};

/** Removes only the keys of this app: the origin may be shared with other apps (localhost in development). */
export const removeAllAppKeys = () => {
  try {
    const { localStorage } = window;
    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));

    for (const key of keys) {
      if (key?.startsWith(APP_STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Unavailable storage holds nothing to remove.
  }
};
