import { clearCredentials, loadCredentials, saveCredentials } from '@entities/session/lib/credentials-storage';

import { createMockCredentials } from '@shared/test/msw/green-api';

const KEY = 'green-chat:v1:credentials';
const CREDENTIALS = createMockCredentials();

describe('credentials storage', () => {
  it('saves the credentials under the versioned key of FR-5.1 and loads them back', () => {
    expect(saveCredentials(CREDENTIALS)).toEqual({ ok: true });
    expect(window.localStorage.getItem(KEY)).toBe(JSON.stringify(CREDENTIALS));
    expect(loadCredentials()).toEqual(CREDENTIALS);
  });

  it('loads null when nothing is stored', () => {
    expect(loadCredentials()).toBeNull();
  });

  it('loads null for corrupt JSON', () => {
    window.localStorage.setItem(KEY, '{"idInstance": "41');

    expect(loadCredentials()).toBeNull();
  });

  it.each([
    ['not an object', 'credentials'],
    ['missing the token', { idInstance: CREDENTIALS.idInstance, apiUrl: CREDENTIALS.apiUrl }],
    ['with a blank field', { ...CREDENTIALS, apiUrl: ' ' }],
  ])('loads null for stored credentials %s', (_name, stored) => {
    window.localStorage.setItem(KEY, JSON.stringify(stored));

    expect(loadCredentials()).toBeNull();
  });

  it('loads null when the storage is unavailable', () => {
    saveCredentials(CREDENTIALS);
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Access is denied for this document.', 'SecurityError');
    });

    expect(loadCredentials()).toBeNull();
  });

  it('clears the credentials and nothing else', () => {
    saveCredentials(CREDENTIALS);
    window.localStorage.setItem('green-chat:v1:data:4100000001', '{}');

    clearCredentials();

    expect(Object.keys(window.localStorage)).toEqual(['green-chat:v1:data:4100000001']);
  });
});
