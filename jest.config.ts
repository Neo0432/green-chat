import type { Config } from 'jest';

const MSW_ESM_PACKAGES = ['rettime', 'until-async', '@open-draft'];

const config: Config = {
  // A broken watchman install makes Jest exit 0 without running a single test.
  watchman: false,
  testEnvironment: 'jest-fixed-jsdom',
  // With nextTick and queueMicrotask faked, MSW answers an aborted request with a 500 instead of rejecting the fetch.
  fakeTimers: { doNotFake: ['nextTick', 'queueMicrotask'] },
  setupFilesAfterEnv: ['<rootDir>/src/shared/test/setup.ts'],
  testMatch: ['<rootDir>/__tests__/**/*.test.{ts,tsx}'],
  transform: {
    '^.+\\.[cm]?[tj]sx?$': [
      '@swc/jest',
      {
        jsc: {
          target: 'es2023',
          parser: { syntax: 'typescript', tsx: true },
          transform: { react: { runtime: 'automatic' } },
        },
      },
    ],
  },
  transformIgnorePatterns: [`/node_modules/(?!(${MSW_ESM_PACKAGES.join('|')})/)`],
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@pages/(.*)$': '<rootDir>/src/pages/$1',
    '^@widgets/(.*)$': '<rootDir>/src/widgets/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@entities/(.*)$': '<rootDir>/src/entities/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '\\.(css|scss|sass)$': 'identity-obj-proxy',
  },
  clearMocks: true,
  restoreMocks: true,
  coverageProvider: 'v8',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/index.ts',
    '!src/**/*.d.ts',
    '!src/shared/test/**',
    '!src/app/main.tsx',
    '!src/shared/config/env.ts',
  ],
};

export default config;
