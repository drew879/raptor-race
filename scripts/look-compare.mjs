// The three-version graphics test: matching stills and a frame-by-frame clip of the same stretch of Level 1 in
// each graphics version, plus a side-by-side clip. The run is deterministic (autoplay bot, fixed steps), so every
// version plays the exact same moves.
// Stretch: after checkpoint 2 (745 m): trees across two lanes (lane change), a stream (jump), a hollow trunk
// (slide), a log across the trail (jump).
// Usage: node scripts/look-compare.mjs <outDir> [--looks=1,2,3] [--fps=30] [--seconds=6.5] [--stills-only]
import { chromium } from './lib/pw.mjs';
import { mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith('--')) ?? 'artifacts/look-compare';
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split('=')[1];
const looks = opt('looks', '1,2,3').split(',').map(Number);
const fps = Number(opt('fps', 30)), seconds = Number(opt('seconds', 6.5));
const stillsOnly = args.includes('--stills-only');
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const START = 745;
for (const look of looks) {
  await page.goto(`http://localhost:5173/index.html?shot=1&nointro=1&level=jehol-forest&look=${look}`);
  await page.waitForFunction(() => window.__rr?.ready === true, null, { timeout: 90000 });
  await page.addStyleTag({ content: '.floats, .hint, #hint { display: none !important; }' });
  const still = async (name) => { await page.evaluate(() => window.__rr.draw()); await page.screenshot({ path: `${outDir}/v${look}-${name}.png` }); };
  await page.evaluate(() => { window.__rr.autoplay(); window.__rr.start(); window.__rr.advance(0.3); });
  // Stills: approaching the trees, the stream, the hollow trunk.
  for (const [d, name] of [[742, 'a-trees'], [772, 'b-stream'], [797, 'c-hollow']]) {
    await page.evaluate((d) => { window.__rr.warp(d); window.__rr.advance(0.6); }, d);
    await still(name);
  }
  if (stillsOnly) continue;
  // The clip: from the checkpoint, frame by frame.
  const frames = `${outDir}/frames-v${look}`;
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });
  await page.evaluate((d) => { window.__rr.warp(d); window.__rr.advance(0.4); }, START);
  const n = Math.round(seconds * fps);
  for (let i = 0; i < n; i++) {
    await page.evaluate((dt) => { window.__rr.advance(dt); window.__rr.draw(); }, 1 / fps);
    await page.screenshot({ path: `${frames}/${String(i).padStart(4, '0')}.png` });
  }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', `${frames}/%04d.png`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', `${outDir}/v${look}-clip.mp4`]);
  console.log('clip', look);
}
if (!stillsOnly && looks.length > 1) {
  // Side by side, labeled.
  const inputs = looks.flatMap((l) => ['-i', `${outDir}/v${l}-clip.mp4`]);
  const labels = looks.map((l, i) => `[${i}:v]drawtext=text='Version ${l}':x=12:y=h-40:fontsize=26:fontcolor=white:box=1:boxcolor=0x3A2A1Ecc:boxborderw=8[v${i}]`).join(';');
  const stack = `${looks.map((_, i) => `[v${i}]`).join('')}hstack=inputs=${looks.length}[out]`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', `${labels};${stack}`, '-map', '[out]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', `${outDir}/side-by-side.mp4`]);
  console.log('side-by-side');
}
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
