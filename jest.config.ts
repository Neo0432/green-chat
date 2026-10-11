import type { Config } from 'jest';

/** ESM-only dependencies of MSW: Jest runs CommonJS, so SWC has to transform them. */
const ESM_PACKAGES = ['rettime', 'until-async', '@open-draft'];

const config: Config = {
  // A broken watchman install makes Jest exit 0 without running a single test.
  watchman: false,
  // Plain jsdom lacks fetch, Response and TextEncoder, which MSW 2 relies on.
  testEnvironment: 'jest-fixed-jsdom',
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
  transformIgnorePatterns: [`/node_modules/(?!(${ESM_PACKAGES.join('|')})/)`],
  // Mirrors `paths` in tsconfig.json and `alias` in vite.config.ts.
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
