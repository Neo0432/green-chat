import { parseEnv } from '@shared/config/parse-env';

describe('parseEnv', () => {
  it('disables api mocks when the variable is missing', () => {
    expect(parseEnv({})).toEqual({ enableApiMocks: false });
  });

  it('enables api mocks when the variable is "true"', () => {
    expect(parseEnv({ VITE_ENABLE_API_MOCKS: 'true' })).toEqual({ enableApiMocks: true });
  });

  it('disables api mocks when the variable is "false"', () => {
    expect(parseEnv({ VITE_ENABLE_API_MOCKS: 'false' })).toEqual({ enableApiMocks: false });
  });

  it('ignores variables it does not know', () => {
    expect(parseEnv({ MODE: 'test', VITE_UNKNOWN: 'x' })).toEqual({ enableApiMocks: false });
  });

  it('throws a readable error when the variable has an unexpected value', () => {
    expect(() => parseEnv({ VITE_ENABLE_API_MOCKS: 'yes' })).toThrow(
      /Invalid environment variables[\s\S]*VITE_ENABLE_API_MOCKS/,
    );
  });
});
