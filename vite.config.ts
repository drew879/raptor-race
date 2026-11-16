import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

/** The build's id: the commit it was built from (the deploy runs on a checkout), with the build date. */
const commit = (() => { try { return execSync('git rev-parse --short HEAD').toString().trim(); } catch { return 'dev'; } })();
const BUILD = `${commit}-${new Date().toISOString().slice(0, 10)}`;
/** Writes version.json next to the page, so a copy kept open on a phone can check for a newer build. */
const versionFile = (): Plugin => ({
  name: 'rr-version',
  generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD }) }); },
});

// RR_PAGE=<name> builds a single page with no shared chunks (used for single-file publishing).
const single = process.env.RR_PAGE;
const pages: Record<string, string> = {
  index: resolve(__dirname, 'index.html'),
  styletile: resolve(__dirname, 'styletile.html'),
};

export default defineConfig({
  base: './',
  assetsInclude: ['**/*.rrm', '**/*.rrs'],
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
  define: { __BUILD__: JSON.stringify(BUILD) },
  plugins: [versionFile()],
});
