import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        sidepanel: resolve(rootDir, 'src/sidepanel/index.html'),
        background: resolve(rootDir, 'src/background/service-worker.ts'),
        content: resolve(rootDir, 'src/content/content-script.ts'),
      },
      output: {
        entryFileNames: '[name]/[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  test: {
    globals: true,
  },
});
