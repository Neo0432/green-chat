export const APP_STORAGE_PREFIX = 'green-chat:';

export type WriteJsonResult = { ok: true } | { ok: false; reason: 'quota' | 'unavailable' };

const isQuotaError = (error: unknown) => error instanceof DOMException && error.name === 'QuotaExceededError';

export const readJson = (key: string): unknown => {
  try {
    const raw = window.localStorage.getItem(key);

    if (raw === null) {
      return null;
    }

    const value: unknown = JSON.parse(raw);

    return value;
  } catch {
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

const ignoreStorageFailure = (action: () => void) => {
  try {
    action();
  } catch {
    return;
  }
};

export const removeKey = (key: string) => {
  ignoreStorageFailure(() => {
    window.localStorage.removeItem(key);
  });
};

export const removeAllAppKeys = () => {
  ignoreStorageFailure(() => {
    const { localStorage } = window;
    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));

    for (const key of keys) {
      if (key?.startsWith(APP_STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  });
};
