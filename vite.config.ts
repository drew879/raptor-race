import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// RR_PAGE=<name> builds a single page with no shared chunks (used for single-file publishing).
const single = process.env.RR_PAGE;
const pages: Record<string, string> = {
  index: resolve(__dirname, 'index.html'),
  styletile: resolve(__dirname, 'styletile.html'),
};

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    modulePreload: { polyfill: false },
    outDir: single ? `dist-${single}` : 'dist',
    rollupOptions: {
      input: single ? { [single]: pages[single] } : pages,
    },
  },
  server: { host: true },
});
