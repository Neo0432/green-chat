import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import boundaries from 'eslint-plugin-boundaries';
import jest from 'eslint-plugin-jest';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import testingLibrary from 'eslint-plugin-testing-library';
import unusedImports from 'eslint-plugin-unused-imports';
import prettier from 'eslint-config-prettier/flat';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const LAYERS_BOTTOM_UP = ['shared', 'entities', 'features', 'widgets', 'pages', 'app'];

const SLICED_LAYERS = ['entities', 'features', 'widgets', 'pages'];

const layerPolicies = LAYERS_BOTTOM_UP.map((layer, index) => {
  const allowedTypes =
    layer === 'shared' || layer === 'app' ? LAYERS_BOTTOM_UP.slice(0, index + 1) : LAYERS_BOTTOM_UP.slice(0, index);

  return {
    from: { element: { type: layer } },
    allow: { to: { element: { types: { anyOf: allowedTypes } } } },
  };
});

const entryPointPolicy = {
  disallow: {
    to: {
      element: { types: { anyOf: SLICED_LAYERS }, fileInternalPath: '!index.ts' },
    },
  },
};

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'node_modules', 'public/mockServiceWorker.js']),

  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },
    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^\\u0000'],
            ['^node:', '^react$', '^react-dom', '^@?\\w'],
            ['^@app(/.*)?$'],
            ['^@pages(/.*)?$'],
            ['^@widgets(/.*)?$'],
            ['^@features(/.*)?$'],
            ['^@entities(/.*)?$'],
            ['^@shared(/.*)?$'],
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
            ['^.+\\.s?css$'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
      'unused-imports/no-unused-imports': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-import-type-side-effects': 'error',

      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],

      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],

      'react-hooks/exhaustive-deps': 'error',

      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-param-reassign': 'error',
      'object-shorthand': ['error', 'always'],
    },
  },

  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'boundaries/include': ['src/**/*'],
      // Patterns name the element root: 'src/pages/*/**/*' matches nothing and the rule silently passes every violation.
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app', partialMatch: false },
        { type: 'pages', pattern: 'src/pages/*', capture: ['slice'], partialMatch: false },
        { type: 'widgets', pattern: 'src/widgets/*', capture: ['slice'], partialMatch: false },
        { type: 'features', pattern: 'src/features/*', capture: ['slice'], partialMatch: false },
        { type: 'entities', pattern: 'src/entities/*', capture: ['slice'], partialMatch: false },
        { type: 'shared', pattern: 'src/shared', partialMatch: false },
      ],
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
    },
    rules: {
      'boundaries/dependencies': ['error', { default: 'disallow', policies: [...layerPolicies, entryPointPolicy] }],
    },
  },

  {
    files: ['src/**/*.tsx'],
    extends: [reactRefresh.configs.vite],
  },

  {
    files: ['__tests__/**/*.{ts,tsx}', 'src/shared/test/**/*.{ts,tsx}'],
    extends: [jest.configs['flat/recommended'], testingLibrary.configs['flat/react']],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      'jest/no-focused-tests': 'error',
    },
  },

  {
    files: ['*.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['*.js'],
    extends: [js.configs.recommended],
  },

  prettier,
]);
