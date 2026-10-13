import type { Credentials } from '@shared/api/green-api';
import { APP_STORAGE_PREFIX, isNonBlankString, isPlainObject, readJson, removeKey, writeJson } from '@shared/lib';

const CREDENTIALS_KEY = `${APP_STORAGE_PREFIX}v1:credentials`;

const isCredentials = (value: unknown): value is Credentials =>
  isPlainObject(value) &&
  isNonBlankString(value.idInstance) &&
  isNonBlankString(value.apiTokenInstance) &&
  isNonBlankString(value.apiUrl);

export const loadCredentials = (): Credentials | null => {
  const stored = readJson(CREDENTIALS_KEY);

  return isCredentials(stored) ? stored : null;
};

export const saveCredentials = (credentials: Credentials) => writeJson(CREDENTIALS_KEY, credentials);

export const clearCredentials = () => {
  removeKey(CREDENTIALS_KEY);
};
