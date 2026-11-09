// Warps the real game page through each landmark stretch and captures the chase view without HUD banners.
// Usage: node scripts/scenery-tour.mjs <outDir> [design-meter marks like 320:canyon,455:hoodoos]
import { chromium } from './lib/pw.mjs';
import { mkdirSync } from 'node:fs';
const [outDir = 'artifacts/tour', marksArg = '20:dunes,330:canyon,470:hoodoos,650:basin,735:bones,840:herd,1040:flats'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:5173/index.html?shot=1&nointro=1');
await page.waitForFunction(() => window.__rr?.ready === true, null, { timeout: 60000 });
await page.addStyleTag({ content: '.floats, .hint, #hint { display: none !important; }' });
await page.evaluate(() => { window.__rr.autoplay(); window.__rr.start(); window.__rr.advance(0.5); });
for (const m of marksArg.split(',')) {
  const [d, name] = m.split(':');
  await page.evaluate((d) => { window.__rr.warp(d); window.__rr.advance(1.2); window.__rr.draw(); }, Number(d) - 18);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/${name}.png` });
  console.log('shot', name, JSON.stringify(await page.evaluate(() => window.__rr.state().distance)));
}
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
