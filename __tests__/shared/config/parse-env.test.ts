import { parseEnv } from '@shared/config/parse-env';

describe('parseEnv', () => {
  it('disables api mocks when the variable is missing', () => {
    expect(parseEnv({})).toMatchObject({ enableApiMocks: false });
  });

  it('enables api mocks when the variable is "true"', () => {
    expect(parseEnv({ VITE_ENABLE_API_MOCKS: 'true' })).toMatchObject({ enableApiMocks: true });
  });

  it('disables api mocks when the variable is "false"', () => {
    expect(parseEnv({ VITE_ENABLE_API_MOCKS: 'false' })).toMatchObject({ enableApiMocks: false });
  });

  it('ignores variables it does not know', () => {
    expect(parseEnv({ MODE: 'test', VITE_UNKNOWN: 'x' })).toEqual({ enableApiMocks: false, greenApiProxyTarget: null });
  });

  it('throws a readable error when the variable has an unexpected value', () => {
    expect(() => parseEnv({ VITE_ENABLE_API_MOCKS: 'yes' })).toThrow(
      /Invalid environment variables[\s\S]*VITE_ENABLE_API_MOCKS/,
    );
  });

  describe('greenApiProxyTarget', () => {
    it('is null when the variable is missing', () => {
      expect(parseEnv({}).greenApiProxyTarget).toBeNull();
    });

    it('is null when the variable is empty', () => {
      expect(parseEnv({ VITE_GREEN_API_PROXY_TARGET: '' }).greenApiProxyTarget).toBeNull();
    });

    it.each(['https://4100.api.green-api.com', 'http://localhost:4000'])(
      'is the url when the variable is %s',
      (url) => {
        expect(parseEnv({ VITE_GREEN_API_PROXY_TARGET: url }).greenApiProxyTarget).toBe(url);
      },
    );

    it.each(['4100.api.green-api.com', 'not a url', 'ftp://example.com', 'javascript:alert(1)'])(
      'throws a readable error for %s',
      (value) => {
        expect(() => parseEnv({ VITE_GREEN_API_PROXY_TARGET: value })).toThrow(
          /Invalid environment variables[\s\S]*VITE_GREEN_API_PROXY_TARGET/,
        );
      },
    );
  });
});
