import { MUSIC_LEVEL, Sfx, type SfxName } from '../audio/sfx';
import { Music } from '../audio/music';

// Renders each SFX offline and reports peak/RMS/duration (used by scripts/audio-check.mjs).
const NAMES: SfxName[] = ['amber', 'lane', 'jump', 'land', 'slide', 'stumble', 'egg', 'powerup', 'checkpoint', 'finish'];
async function measure(name: SfxName) {
  const sr = 44100;
  const ctx = new OfflineAudioContext(2, sr * 2, sr);
  let s = 1;
  const sfx = new Sfx(ctx, ctx.destination, () => ((s = (s * 16807) % 2147483647) / 2147483647));
  sfx.play(name, { t: 0.01, dir: 1 });
  const buf = await ctx.startRendering();
  const d = buf.getChannelData(0);
  let peak = 0, sum = 0, last = 0;
  for (let i = 0; i < d.length; i++) {
    const a = Math.abs(d[i]);
    if (a > peak) peak = a;
    sum += d[i] * d[i];
    if (a > 0.001) last = i;
  }
  const dur = last / sr;
  const rms = Math.sqrt(sum / Math.max(1, last));
  return { name, peakDb: +(20 * Math.log10(peak + 1e-9)).toFixed(1), rmsDb: +(20 * Math.log10(rms + 1e-9)).toFixed(1), durMs: Math.round(dur * 1000) };
}
/** Ten seconds of music at a given intensity, through the music bus level, measured like the SFX. */
async function measureMusic(intensity: number, storm: number) {
  const sr = 44100;
  const ctx = new OfflineAudioContext(2, sr * 10, sr);
  const bus = ctx.createGain();
  bus.gain.value = MUSIC_LEVEL;
  bus.connect(ctx.destination);
  const m = new Music(ctx, bus);
  m.intensity = intensity;
  m.storm = storm;
  m.start(0);
  m.update(9.5);
  const buf = await ctx.startRendering();
  let peak = 0, sum = 0;
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; sum += d[i] * d[i]; }
  }
  const rms = Math.sqrt(sum / (2 * buf.length));
  return { name: `music@${intensity}`, peakDb: +(20 * Math.log10(peak + 1e-9)).toFixed(1), rmsDb: +(20 * Math.log10(rms + 1e-9)).toFixed(1), durMs: 10000 };
}
(window as unknown as { __audio: Promise<unknown> }).__audio = Promise.all([...NAMES.map(measure), measureMusic(0.25, 0), measureMusic(1, 0.6)]);
