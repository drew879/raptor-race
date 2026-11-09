// Captures the hunt's story beats in the real game page: the opening shot, the pounce and the pinned finale.
// Usage: node scripts/hunt-shots.mjs [outDir] [--base=http://localhost:5173] [--dpr=1]
import { chromium } from './lib/pw.mjs';
import { mkdirSync } from 'node:fs';
const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith('--')) ?? 'artifacts/hunt';
const base = (args.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:5173').slice(7);
const dpr = Number((args.find((a) => a.startsWith('--dpr=')) ?? '--dpr=1').slice(6));
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`${base}/index.html?shot=1`);
await page.waitForFunction(() => window.__rr?.ready === true, null, { timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
const shot = async (name) => { await page.evaluate(() => window.__rr.draw()); await page.waitForTimeout(250); await page.screenshot({ path: `${outDir}/${name}.png` }); console.log('shot', name, JSON.stringify(await page.evaluate(() => window.__rr.state()))); };
const adv = (s) => page.evaluate((s) => window.__rr.advance(s), s);
await adv(1.0);
await page.evaluate(() => { window.__rr.click('btnRun'); window.__rr.autoplay(); window.__rr.start(); });
await adv(0.9); await shot('01-intro-graze');
await adv(1.45); await shot('02-intro-alert');
await adv(0.7); await shot('03-intro-swing');
await adv(1.0); await shot('04-chase-begins');
// Fast-forward to the finale.
for (let i = 0; i < 600; i++) { const s = await page.evaluate(() => { window.__rr.advance(0.25); return window.__rr.state(); }); if (s.pounceReady || s.sstate !== 'running') break; }
await shot('05-pounce-ready');
for (let i = 0; i < 200; i++) { const s = await page.evaluate(() => { window.__rr.advance(1 / 60); return window.__rr.state(); }); if (s.sstate === 'pouncing') break; }
await adv(0.12); await shot('06-pounce-leap');
for (let i = 0; i < 200; i++) { const s = await page.evaluate(() => { window.__rr.advance(1 / 60); return window.__rr.state(); }); if (s.sstate === 'finished') break; }
await adv(0.5); await shot('07-pinned');

await page.waitForFunction(() => !document.getElementById('plate').hidden, null, { timeout: 8000 }); await page.screenshot({ path: `${outDir}/09-plate.png` });
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
