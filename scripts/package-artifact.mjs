// Packages a built page (dist/<page>.html) into one self-contained HTML file:
// inlines the JS bundle, the CSS, and the fonts (as data URIs). Output: artifacts/publish/<name>.html
// Usage: node scripts/package-artifact.mjs <page> <outName> "<Title>"
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';

const [page = 'styletile', outName = 'raptor-race-style-tile', title = 'Raptor Race Style Tile'] = process.argv.slice(2);
const dist = 'dist';
const html = readFileSync(join(dist, `${page}.html`), 'utf8');
const js = [...html.matchAll(/<script[^>]*src="\.?\/?([^"]+)"[^>]*><\/script>/g)].map((m) => m[1]);
const css = [...html.matchAll(/<link rel="stylesheet"[^>]*href="\.?\/?([^"]+)"[^>]*>/g)].map((m) => m[1]);

const mime = { woff2: 'font/woff2', woff: 'font/woff', png: 'image/png', svg: 'image/svg+xml' };
let styles = '';
for (const href of css) {
  let text = readFileSync(join(dist, href), 'utf8');
  text = text.replace(/url\((['"]?)([^'")]+\.(woff2|woff|png|svg))\1\)/g, (_m, _q, p, ext) => {
    const file = p.startsWith('/') ? join(dist, p) : join(dist, dirname(href), basename(p));
    return `url(data:${mime[ext]};base64,${readFileSync(file).toString('base64')})`;
  });
  styles += text;
}
let scripts = '';
for (const src of js) scripts += readFileSync(join(dist, src), 'utf8').replace(/<\/script/gi, '<\\/script');

const out = `<title>${title}</title>
<meta name="theme-color" content="#F4CFA0">
<style>${styles}</style>
<script type="module">${scripts}</script>
`;
mkdirSync('artifacts/publish', { recursive: true });
const path = `artifacts/publish/${outName}.html`;
writeFileSync(path, out);
console.log(path, (out.length / 1024).toFixed(0) + ' KB', { js, css });
