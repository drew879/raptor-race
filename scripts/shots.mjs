// Phone-emulated screenshots of the style tile at deterministic moments.
// Usage: node scripts/shots.mjs [outDir] [--base=http://localhost:5173] [--dpr=2]
import { chromium } from './lib/pw.mjs';
import { mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith('--')) ?? 'artifacts/shots';
const base = (args.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:5173').slice(7);
const dpr = Number((args.find((a) => a.startsWith('--dpr=')) ?? '--dpr=2').slice(6));
mkdirSync(outDir, { recursive: true });

// [name, mode, seconds to advance from previous shot]
const PLAN = [
  ['01-run-start', 'run', 1.5],
  ['02-run-boulders', 'run', 1.7],
  ['03-run-jump', 'run', 1.6],
  ['04-run-arch-slide', 'run', 1.75],
  ['05-run-egg', 'run', 2.2],
  ['06-run-ribs', 'run', 1.0],
  ['07-hero', 'hero', 1.2],
  ['08-hero-later', 'hero', 2.0],
  ['09-title', 'title', 2.5],
];

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
page.on('pageerror', (e) => console.log('page error:', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`console ${m.type()}:`, m.text()); });
await page.goto(`${base}/styletile.html?shot=1${process.env.RR_QUERY ?? ''}`);
await page.waitForFunction(() => window.__rr?.ready === true, null, { timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
for (const [name, mode, secs] of PLAN) {
  await page.evaluate(([m, s]) => { window.__rr.setMode(m); window.__rr.advance(s); }, [mode, secs]);
  await page.waitForTimeout(450); // let CSS transitions settle
  await page.screenshot({ path: `${outDir}/${name}.png` });
  console.log('shot', name);
}
const stats = await page.evaluate(() => window.__rr.stats());
console.log('stats', JSON.stringify(stats));
// Full journal page (below the fold) for UI review.
await page.evaluate(() => window.scrollTo(0, window.innerHeight));
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/10-journal.png`, fullPage: true });
console.log('shot 10-journal');
await browser.close();
