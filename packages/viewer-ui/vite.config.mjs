import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { getViteConfig } from 'astro/config';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig(async () => {
  const astroViteConfig = getViteConfig(
    {
      build: {
        lib: {
          entry: resolve(root, 'src/render.ts'),
          formats: ['es'],
          fileName: 'render',
        },
        rollupOptions: {
          external: [/^node:/, 'astro/container'],
        },
        ssr: true,
        outDir: 'dist',
        emptyOutDir: true,
      },
    },
    { root, srcDir: resolve(root, 'src') },
  );

  const resolved = await astroViteConfig({ command: 'build', mode: 'production' });
  return resolved;
});
