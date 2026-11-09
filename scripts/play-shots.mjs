// Plays Level 1 in the real game page with the perfect bot and captures phone screenshots along the way.
// Usage: node scripts/play-shots.mjs [outDir] [--base=http://localhost:5173] [--dpr=2] [--marks=704:fork,470:bend]
// --marks takes design-meter distances (1100 m course) and shot names, replacing the default tour.
import { chromium } from './lib/pw.mjs';
import { mkdirSync } from 'node:fs';
const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith('--')) ?? 'artifacts/play';
const base = (args.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:5173').slice(7);
const dpr = Number((args.find((a) => a.startsWith('--dpr=')) ?? '--dpr=1').slice(6));
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`${base}/index.html?shot=1&nointro=1`);
await page.waitForFunction(() => window.__rr?.ready === true, null, { timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
const shot = async (name) => { await page.evaluate(() => window.__rr.draw()); await page.waitForTimeout(350); await page.screenshot({ path: `${outDir}/${name}.png` }); console.log('shot', name, JSON.stringify(await page.evaluate(() => window.__rr.state()))); };
await page.evaluate(() => window.__rr.advance(1.5));
await shot('00-title');
await page.evaluate(() => window.__rr.click('btnRun'));
await shot('01-prerun');
await page.evaluate(() => { window.__rr.autoplay(); window.__rr.start(); window.__rr.advance(1.2); });
await shot('02-run-hint-lanes');
// Capture at chosen distances along the course.
// Marks as fractions of the course (authored in design meters for an 1100 m course).
const len = (await page.evaluate(() => window.__rr.state())).length;
const custom = (args.find((a) => a.startsWith('--marks=')) ?? '').slice(8);
const marks = (custom ? custom.split(',').map((m) => m.split(':')).map(([d, n]) => [Number(d), n]) : [[150, '03-jump-hint'], [300, '04-slide'], [372, '05-egg-arch'], [450, '06-magnet'], [622, '07-updraft-glide'], [660, '08-glide-egg'], [800, '09-storm-combo'], [960, '10-storm-late'], [1090, '11-final-dash']]).map(([d, n]) => [(d / 1100) * len, n]);
for (const [d, name] of marks) {
  for (let i = 0; i < 400; i++) {
    const s = await page.evaluate(() => { window.__rr.advance(0.25); return window.__rr.state(); });
    if (s.distance >= d || s.app !== 'playing') break;
  }
  await shot(name);
}
for (let i = 0; i < 160; i++) { const s = await page.evaluate(() => { window.__rr.advance(0.25); return window.__rr.state(); }); if (s.app === 'results') break; }
await page.waitForTimeout(1600);
await page.evaluate(() => window.__rr.advance(0.5));
await shot('12-results');
console.log('stats', JSON.stringify(await page.evaluate(() => window.__rr.stats())));
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
