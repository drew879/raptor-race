// Usage: node scripts/lab-shots.mjs <outDir> <query1> <query2> ...  (needs dev server on :5173)
import { chromium } from './lib/pw.mjs';
import { mkdirSync } from 'node:fs';
const [outDir, ...queries] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 520, height: 520 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error') console.log('console error:', m.text()); });
page.on('pageerror', (e) => console.log('page error:', e.message));
for (const q of queries) {
  await page.goto(`http://localhost:5173/lab.html?${q}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
  const name = q.replace(/[^a-z0-9]+/gi, '_');
  await page.screenshot({ path: `${outDir}/${name}.png` });
  console.log('shot', name);
}
await browser.close();
