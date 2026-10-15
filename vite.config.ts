import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, normalizePath, type Plugin, type ProxyOptions } from 'vite';

import { GREEN_API_PROXY_PATH } from './src/shared/config/green-api-proxy.ts';
import { parseEnv } from './src/shared/config/parse-env.ts';

const resolvePath = (path: string) => fileURLToPath(new URL(path, import.meta.url));

const alias = {
  '@app': resolvePath('./src/app'),
  '@pages': resolvePath('./src/pages'),
  '@widgets': resolvePath('./src/widgets'),
  '@features': resolvePath('./src/features'),
  '@entities': resolvePath('./src/entities'),
  '@shared': resolvePath('./src/shared'),
};

const STYLES_ROOT = normalizePath(resolvePath('./src/shared/assets/styles'));

const isStyleHelper = (filename: string) => normalizePath(filename).startsWith(STYLES_ROOT);

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

const createGreenApiProxy = (mode: string): Record<string, ProxyOptions> | undefined => {
  const { greenApiProxyTarget } = parseEnv(loadEnv(mode, process.cwd(), 'VITE_'));

  if (greenApiProxyTarget === null) {
    return undefined;
  }

  return {
    [GREEN_API_PROXY_PATH]: {
      target: greenApiProxyTarget,
      changeOrigin: true,
      rewrite: (path) => path.slice(GREEN_API_PROXY_PATH.length),
    },
  };
};

export default defineConfig(({ mode }) => ({
  plugins: [react(), excludeMswWorker()],

  resolve: { alias },

  css: {
    modules: {
      generateScopedName: '[name]__[local]--[hash:base64:5]',
    },
    preprocessorOptions: {
      scss: {
        additionalData: (source: string, filename: string) =>
          isStyleHelper(filename) ? source : `@use '@shared/assets/styles/mixins/mixins' as *;\n${source}`,
      },
    },
  },

  server: {
    port: 3000,
    strictPort: true,
    proxy: createGreenApiProxy(mode),
  },

  preview: {
    proxy: createGreenApiProxy(mode),
  },
}));
