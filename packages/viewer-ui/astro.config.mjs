import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  srcDir: 'src',
  outDir: 'dist',
  output: 'server',
  vite: {
    build: {
      lib: {
        entry: resolve(root, 'src/render.ts'),
        formats: ['es'],
        fileName: 'render',
      },
      rollupOptions: {
        external: [/^node:/, 'astro/container', 'astro/config', 'vite'],
      },
      ssr: true,
      emptyOutDir: false,
    },
  },
});
