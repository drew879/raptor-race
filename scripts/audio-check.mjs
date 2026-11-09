// Renders every SFX offline in Chromium and checks it against docs/AUDIO_BIBLE.md mix targets.
import { chromium } from './lib/pw.mjs';
const base = process.argv[2] ?? 'http://localhost:5173';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto(`${base}/audio-lab.html`);
const res = await p.evaluate(() => window.__audio);
await b.close();
const LONG_OK = new Set(['egg', 'finish', 'powerup']);
let fail = 0;
for (const r of res) {
  const issues = [];
  if (r.peakDb > -6) issues.push('peak too hot');
  if (r.peakDb < -30) issues.push('too quiet');
  if (!LONG_OK.has(r.name) && r.durMs > 400) issues.push('too long');
  if (issues.length) fail++;
  console.log(`${r.name.padEnd(11)} peak ${String(r.peakDb).padStart(6)} dBFS  rms ${String(r.rmsDb).padStart(6)} dB  ${String(r.durMs).padStart(5)} ms  ${issues.join(', ') || 'ok'}`);
}
process.exit(fail ? 1 : 0);
