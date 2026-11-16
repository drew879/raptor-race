// Renders public/icon.svg into the PNG icons the home screen needs (iPhone apple-touch-icon, manifest sizes).
// Usage: node scripts/make-icons.mjs
import { chromium } from './lib/pw.mjs';
import { readFileSync } from 'node:fs';
const svg = readFileSync('public/icon.svg', 'utf8');
const browser = await chromium.launch();
for (const [size, name] of [[180, 'apple-touch-icon.png'], [192, 'icon-192.png'], [512, 'icon-512.png']]) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;background:#000">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: `public/${name}`, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
  console.log('wrote', `public/${name}`);
}
await browser.close();
