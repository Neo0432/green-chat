import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, normalizePath, type Plugin } from 'vite';

const resolvePath = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/**
 * Single source of truth for aliases: read by Vite and Sass alike.
 * Keep tsconfig `paths` and jest.config.ts `moduleNameMapper` in sync.
 */
const alias = {
  '@app': resolvePath('./src/app'),
  '@pages': resolvePath('./src/pages'),
  '@widgets': resolvePath('./src/widgets'),
  '@features': resolvePath('./src/features'),
  '@entities': resolvePath('./src/entities'),
  '@shared': resolvePath('./src/shared'),
};

const STYLES_ROOT = normalizePath(resolvePath('./src/shared/assets/styles'));

/** The MSW worker script must sit in public/ for the dev server, but it has no business in production. */
const excludeMswWorker = (): Plugin => {
  let workerPath = '';

  return {
    name: 'exclude-msw-worker',
    apply: 'build',
    configResolved({ root, build }) {
      workerPath = resolve(root, build.outDir, 'mockServiceWorker.js');
    },
    closeBundle() {
      rmSync(workerPath, { force: true });
    },
  };
};

export default defineConfig({
  plugins: [react(), excludeMswWorker()],

  resolve: { alias },

  css: {
    modules: {
      generateScopedName: '[name]__[local]--[hash:base64:5]',
    },
    preprocessorOptions: {
      scss: {
        /**
         * Inject the mixins into every scss file except the style helpers
         * themselves — a repeated `@use ... as *` makes Sass throw.
         */
        additionalData: (source: string, filename: string) =>
          normalizePath(filename).startsWith(STYLES_ROOT)
            ? source
            : `@use '@shared/assets/styles/mixins/mixins' as *;\n${source}`,
      },
    },
  },

  server: {
    port: 3000,
    strictPort: true,
  },
});
