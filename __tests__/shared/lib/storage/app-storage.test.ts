import { APP_STORAGE_PREFIX, readJson, removeAllAppKeys, removeKey, writeJson } from '@shared/lib/storage';

const KEY = `${APP_STORAGE_PREFIX}v1:test`;

const throwSecurityError = () => {
  throw new DOMException('Access is denied for this document.', 'SecurityError');
};

describe('app storage', () => {
  describe('readJson', () => {
    it('returns the stored value', () => {
      window.localStorage.setItem(KEY, JSON.stringify({ items: [1, 2] }));

      expect(readJson(KEY)).toEqual({ items: [1, 2] });
    });

    it('returns null for a missing key and for corrupt JSON', () => {
      expect(readJson(KEY)).toBeNull();

      window.localStorage.setItem(KEY, '{"items": [');

      expect(readJson(KEY)).toBeNull();
    });
  });

  describe('writeJson', () => {
    it('stores the value as JSON', () => {
      expect(writeJson(KEY, { id: '1' })).toEqual({ ok: true });
      expect(window.localStorage.getItem(KEY)).toBe('{"id":"1"}');
    });

    it('reports a full storage as "quota"', () => {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      });

      expect(writeJson(KEY, { id: '1' })).toEqual({ ok: false, reason: 'quota' });
    });

    it('reports any other failure as "unavailable"', () => {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(throwSecurityError);

      expect(writeJson(KEY, { id: '1' })).toEqual({ ok: false, reason: 'unavailable' });
    });
  });

  describe('removeKey', () => {
    it('removes only the given key', () => {
      window.localStorage.setItem(KEY, '1');
      window.localStorage.setItem(`${KEY}-other`, '2');

      removeKey(KEY);

      expect(Object.keys(window.localStorage)).toEqual([`${KEY}-other`]);
    });
  });

  describe('removeAllAppKeys', () => {
    it('removes every key with the app prefix and leaves the others alone', () => {
      window.localStorage.setItem('green-chat:v1:credentials', '1');
      window.localStorage.setItem('green-chat:v1:data:4100000001', '2');
      window.localStorage.setItem('theme', 'dark');
      window.localStorage.setItem('my-green-chat:v1', '3');

      removeAllAppKeys();

      expect(Object.keys(window.localStorage).toSorted()).toEqual(['my-green-chat:v1', 'theme']);
    });
  });

  describe('with a storage that throws', () => {
    beforeEach(() => {
      jest.spyOn(window, 'localStorage', 'get').mockImplementation(throwSecurityError);
    });

    it('never throws to the caller', () => {
      expect(readJson(KEY)).toBeNull();
      expect(writeJson(KEY, 1)).toEqual({ ok: false, reason: 'unavailable' });
      expect(() => removeKey(KEY)).not.toThrow();
      expect(() => removeAllAppKeys()).not.toThrow();
    });
  });
});
