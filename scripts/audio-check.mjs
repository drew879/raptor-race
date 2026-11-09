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
  const isMusic = r.name.startsWith('music');
  // Music sits about 8 dB under the SFX peaks (~-12 dBFS): its peak should land around -20 dBFS.
  if (isMusic && r.peakDb > -15) issues.push('music too hot');
  if (isMusic && r.peakDb < -28) issues.push('music too quiet');
  if (!isMusic && r.peakDb > -6) issues.push('peak too hot');
  if (r.peakDb < -30) issues.push('too quiet');
  if (!isMusic && !LONG_OK.has(r.name) && r.durMs > 400) issues.push('too long');
  if (issues.length) fail++;
  console.log(`${r.name.padEnd(11)} peak ${String(r.peakDb).padStart(6)} dBFS  rms ${String(r.rmsDb).padStart(6)} dB  ${String(r.durMs).padStart(5)} ms  ${issues.join(', ') || 'ok'}`);
}
process.exit(fail ? 1 : 0);
