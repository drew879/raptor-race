// Renders style frames for each art direction: node scripts/look-shots.mjs <outDir> [--dpr=2]
import { chromium } from './lib/pw.mjs';
import { mkdirSync } from 'node:fs';
const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith('--')) ?? 'artifacts/looks';
const dpr = Number((args.find((a) => a.startsWith('--dpr=')) ?? '--dpr=2').slice(6));
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr });
page.on('pageerror', (e) => console.log('page error:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text()); });
for (const look of ['current', 'journal', 'mural', 'amber', 'graphic']) {
  for (const view of ['run', 'hero', 'wide']) {
    await page.goto(`http://localhost:5173/looks.html?look=${look}&view=${view}`);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    await page.screenshot({ path: `${outDir}/${look}-${view}.png` });
    console.log('shot', look, view);
  }
}
await browser.close();
