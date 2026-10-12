import { deriveApiUrl, normalizeApiUrl } from '@shared/api/green-api';

describe('deriveApiUrl', () => {
  it('builds the host from the first four digits of the instance id', () => {
    expect(deriveApiUrl('4100000000')).toBe('https://4100.api.green-api.com');
    expect(deriveApiUrl('7103123456')).toBe('https://7103.api.green-api.com');
  });
});

describe('normalizeApiUrl', () => {
  it('keeps a clean https url', () => {
    expect(normalizeApiUrl('https://4100.api.green-api.com')).toEqual({
      ok: true,
      apiUrl: 'https://4100.api.green-api.com',
    });
  });

  it('trims spaces and strips trailing slashes', () => {
    expect(normalizeApiUrl('  https://4100.api.green-api.com//  ')).toEqual({
      ok: true,
      apiUrl: 'https://4100.api.green-api.com',
    });
  });

  it('keeps a path prefix of a reverse proxy', () => {
    expect(normalizeApiUrl('https://example.com/green/')).toEqual({ ok: true, apiUrl: 'https://example.com/green' });
  });

  it('drops the query string and the hash', () => {
    expect(normalizeApiUrl('https://example.com/?a=1#top')).toEqual({ ok: true, apiUrl: 'https://example.com' });
  });

  it.each(['http://localhost', 'http://localhost:8080/', 'http://localhost:8080/green-api'])(
    'allows %s for a dev proxy',
    (input) => {
      expect(normalizeApiUrl(input)).toMatchObject({ ok: true });
    },
  );

  it.each([
    'https://4100.api.green-api.com/waInstance4100000000/getStateInstance/token',
    'https://4100.api.green-api.com/waInstance4100000000',
    '4100.api.green-api.com/WAINSTANCE1',
  ])('rejects %s because it holds the instance path', (input) => {
    expect(normalizeApiUrl(input)).toEqual({ ok: false, reason: 'contains-instance-path' });
  });

  it.each([
    '',
    '   ',
    '4100.api.green-api.com',
    'not a url',
    'http://4100.api.green-api.com',
    'http://localhost.example.com',
    'http://127.0.0.1:3000',
    'ftp://example.com',
    'javascript:alert(1)',
  ])('rejects %p as an invalid url', (input) => {
    expect(normalizeApiUrl(input)).toEqual({ ok: false, reason: 'invalid-url' });
  });
});
