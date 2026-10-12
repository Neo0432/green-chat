import { redactToken } from '@shared/api/green-api';

describe('redactToken', () => {
  const token = 'secretToken123';

  it('replaces the token with asterisks', () => {
    expect(redactToken(`GET /waInstance1/getStateInstance/${token}`, token)).toBe(
      'GET /waInstance1/getStateInstance/***',
    );
  });

  it('replaces every occurrence', () => {
    expect(redactToken(`${token} and ${token}`, token)).toBe('*** and ***');
  });

  it('replaces the url-encoded form of the token', () => {
    const trickyToken = 'a/b c?d';

    expect(redactToken(`/waInstance1/send/${encodeURIComponent(trickyToken)}`, trickyToken)).toBe(
      '/waInstance1/send/***',
    );
  });

  it('treats the token literally, not as a pattern', () => {
    expect(redactToken('abc a.c', 'a.c')).toBe('abc ***');
  });

  it('returns the text unchanged when it holds no token', () => {
    expect(redactToken('nothing to hide', token)).toBe('nothing to hide');
  });

  it('returns the text unchanged when the token is empty', () => {
    expect(redactToken('keep me', '')).toBe('keep me');
  });
});
