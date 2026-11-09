// Smoke test in the real game page: every crash must reach the crash screen (a missing crash text once froze
// the run at the fork's rock fin), revive must work beside a fin, and the page must log no errors.
// Usage: node scripts/smoke.mjs [--base=http://localhost:5173]   (needs the dev server, or a served dist/)
import { chromium } from './lib/pw.mjs';
const base = (process.argv.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:5173').slice(7);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`${base}/index.html?shot=1&nointro=1`);
await page.waitForFunction(() => window.__rr?.ready === true, null, { timeout: 60000 });
let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fail++; };
const runUntil = async (pred, seconds) => {
  for (let t = 0; t < seconds; t += 0.25) {
    const s = await page.evaluate(() => { window.__rr.advance(0.25); return window.__rr.state(); });
    if (pred(s)) return s;
  }
  return page.evaluate(() => window.__rr.state());
};

await page.evaluate(() => window.__rr.start());
// 1. No input from the start: the first boulder in the middle lane ends it.
let s = await runUntil((x) => x.app === 'caught', 8);
check(s.app === 'caught', `boulder crash reaches the crash screen (app=${s.app})`);
check((await page.evaluate(() => window.__rr.text('caughtTitle'))) === 'Ran into a boulder', 'boulder crash text');
// 2. Revive, then warp just short of the first fork's fin in the middle lane: crash into the fin.
await page.evaluate(() => window.__rr.click('btnRevive'));
const nose = await page.evaluate(() => window.__rr.forkNose(0));
await page.evaluate((d) => window.__rr.warp(d - 12), nose);
s = await runUntil((x) => x.app === 'caught', 6);
check(s.app === 'caught', `fin crash reaches the crash screen (app=${s.app})`);
check((await page.evaluate(() => window.__rr.text('caughtTitle'))) === 'Ran into the rock fin', 'fin crash text');
// 3. Back to checkpoint works and the run carries on.
await page.evaluate(() => window.__rr.click('btnCheckpoint'));
s = await runUntil(() => false, 1);
check(s.app === 'playing' && s.sstate === 'running', `checkpoint restart resumes the run (app=${s.app}, ${s.sstate})`);
check(!(await page.evaluate(() => !!document.getElementById('hunt'))), 'distance meter is gone');
// 4. Run into a gully without jumping: a fall, with its own crash text.
const gully = await page.evaluate(() => window.__rr.firstOf('gully'));
await page.evaluate((d) => window.__rr.warp(d - 10), gully);
s = await runUntil((x) => x.app === 'caught', 6);
check(s.app === 'caught' && (await page.evaluate(() => window.__rr.text('caughtTitle'))) === 'Fell into a gully', `gully crash reaches the crash screen (app=${s.app})`);
check(errors.length === 0, errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors');
await browser.close();
process.exit(fail ? 1 : 0);
