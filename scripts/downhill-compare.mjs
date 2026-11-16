// The downhill pass, before and after: matching stills and frame-by-frame clips of the same Level 1 stretches with
// the steady grade (?hill=1) and the new hill (?hill=2), plus a side-by-side clip. Deterministic (autoplay bot,
// fixed steps), so both play the exact same moves. Needs the dev server on :5173.
// Usage: node scripts/downhill-compare.mjs <outDir> [--fps=30] [--stills-only] [--look=3]
import { chromium } from './lib/pw.mjs';
import { mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith('--')) ?? 'artifacts/downhill-compare';
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split('=')[1];
const fps = Number(opt('fps', 30)), look = Number(opt('look', 3));
const stillsOnly = args.includes('--stills-only');
// Stills: before a pitch, tipping over its crest, looking down onto the obstacle at its foot.
const STILLS = [[150, 'a-before-pitch'], [163, 'b-crest'], [178, 'c-on-pitch'], [466, 'd-valley-view'], [490, 'e-pitch-2'], [728, 'f-pitch-3']];
// Clips: two pitches, each from the flat above it to the obstacle at its foot.
const CLIPS = [[138, 4.6], [458, 4.2]];
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
for (const hill of [1, 2]) {
  await page.goto(`http://localhost:5173/index.html?shot=1&nointro=1&level=jehol-forest&look=${look}&hill=${hill}`);
  await page.waitForFunction(() => window.__rr?.ready === true, null, { timeout: 90000 });
  await page.addStyleTag({ content: '.floats, .hint, #hint { display: none !important; }' });
  await page.evaluate(() => { window.__rr.autoplay(); window.__rr.start(); window.__rr.advance(0.3); });
  for (const [d, name] of STILLS) {
    await page.evaluate((d) => { window.__rr.warp(d); window.__rr.advance(0.6); window.__rr.draw(); }, d);
    await page.screenshot({ path: `${outDir}/hill${hill}-${name}.png` });
  }
  if (stillsOnly) continue;
  const parts = [];
  for (const [k, [start, seconds]] of CLIPS.entries()) {
    const frames = `${outDir}/frames-${hill}-${k}`;
    rmSync(frames, { recursive: true, force: true });
    mkdirSync(frames, { recursive: true });
    await page.evaluate((d) => { window.__rr.warp(d); window.__rr.advance(0.4); }, start);
    for (let i = 0; i < Math.round(seconds * fps); i++) {
      await page.evaluate((dt) => { window.__rr.advance(dt); window.__rr.draw(); }, 1 / fps);
      await page.screenshot({ path: `${frames}/${String(i).padStart(4, '0')}.png` });
    }
    parts.push(`${frames}/%04d.png`);
  }
  const inputs = parts.flatMap((p) => ['-framerate', String(fps), '-i', p]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', `${parts.map((_, i) => `[${i}:v]`).join('')}concat=n=${parts.length}:v=1[out]`, '-map', '[out]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', `${outDir}/hill${hill}-clip.mp4`]);
  console.log('clip', hill);
}
if (!stillsOnly) {
  const label = (i, t) => `[${i}:v]drawtext=text='${t}':x=12:y=h-40:fontsize=24:fontcolor=white:box=1:boxcolor=0x3A2A1Ecc:boxborderw=8[v${i}]`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', `${outDir}/hill1-clip.mp4`, '-i', `${outDir}/hill2-clip.mp4`, '-filter_complex', `${label(0, 'Before')};${label(1, 'After')};[v0][v1]hstack=inputs=2[out]`, '-map', '[out]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', `${outDir}/side-by-side.mp4`]);
  console.log('side-by-side');
}
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
