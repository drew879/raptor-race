// Renders a WAV preview of the music offline in Chromium: 16 s at low intensity, then full, with amber chains.
// Usage: node scripts/music-preview.mjs <out.wav> [--base=http://localhost:5173]
import { chromium } from './lib/pw.mjs';
import { writeFileSync } from 'node:fs';
const out = process.argv[2] ?? 'artifacts/music-preview.wav';
const base = (process.argv.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:5173').slice(7);
const b = await chromium.launch();
const p = await b.newPage();
await p.goto(`${base}/audio-lab.html`);
await p.waitForFunction(() => typeof window.__renderPreview === 'function');
const [L, R] = await p.evaluate(() => window.__renderPreview());
await b.close();
const n = L.length, data = Buffer.alloc(44 + n * 4);
data.write('RIFF', 0); data.writeUInt32LE(36 + n * 4, 4); data.write('WAVE', 8); data.write('fmt ', 12);
data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22); data.writeUInt32LE(44100, 24);
data.writeUInt32LE(44100 * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(n * 4, 40);
// Normalize the preview to a comfortable listening level (the game mixes it under the sound effects).
let peak = 1e-9; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const g = 0.5 / peak;
for (let i = 0; i < n; i++) {
  data.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(L[i] * g * 32767))), 44 + i * 4);
  data.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(R[i] * g * 32767))), 46 + i * 4);
}
writeFileSync(out, data);
console.log('wrote', out, (data.length / 1e6).toFixed(1), 'MB');
