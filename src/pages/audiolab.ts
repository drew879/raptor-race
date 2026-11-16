import { MUSIC_LEVEL, Sfx, type SfxName } from '../audio/sfx';
import { Music } from '../audio/music';
import { MUSIC_STYLES } from '../audio/music-styles';

// Renders each SFX offline and reports peak/RMS/duration (used by scripts/audio-check.mjs).
const NAMES: SfxName[] = ['amber', 'lane', 'jump', 'land', 'slide', 'stumble', 'egg', 'powerup', 'checkpoint', 'finish', 'screech', 'peck'];
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
async function measureMusic(intensity: number, storm: number, styleId = 'journal') {
  const sr = 44100;
  const ctx = new OfflineAudioContext(2, sr * 10, sr);
  const bus = ctx.createGain();
  bus.gain.value = MUSIC_LEVEL;
  bus.connect(ctx.destination);
  const m = new Music(ctx, bus, MUSIC_STYLES[styleId]);
  m.intensity = intensity;
  m.storm = storm;
  m.start(0);
  for (let s = 0; s < 9.6; s += 0.1) m.update(s, 1, 0.1, s);
  const buf = await ctx.startRendering();
  let peak = 0, sum = 0;
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; sum += d[i] * d[i]; }
  }
  const rms = Math.sqrt(sum / (2 * buf.length));
  return { name: `music:${styleId}@${intensity}`, peakDb: +(20 * Math.log10(peak + 1e-9)).toFixed(1), rmsDb: +(20 * Math.log10(rms + 1e-9)).toFixed(1), durMs: 10000 };
}
/** The level ending at full intensity: the pounce at 1 s, the landing 1.71 s later (the pounce's 0.6 s at 0.35 slow
 * motion). Reports the peak and how long it rings after the landing (to -60 dB). */
async function measureEnding(styleId: string) {
  const sr = 44100;
  const ctx = new OfflineAudioContext(2, sr * 8, sr);
  const bus = ctx.createGain();
  bus.gain.value = MUSIC_LEVEL;
  bus.connect(ctx.destination);
  const m = new Music(ctx, bus, MUSIC_STYLES[styleId]);
  m.intensity = 1;
  m.start(0);
  for (let s = 0; s < 1; s += 0.1) m.update(s, 1, 0.1, s);
  const pounce = 1, land = 2.71;
  void ctx.suspend(pounce).then(() => { m.sting(); void ctx.resume(); });
  void ctx.suspend(land).then(() => { m.finale(); void ctx.resume(); });
  const buf = await ctx.startRendering();
  let peak = 0, last = 0;
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; if (a > 0.001) last = Math.max(last, i); }
  }
  return { name: `music:${styleId}:ending`, peakDb: +(20 * Math.log10(peak + 1e-9)).toFixed(1), rmsDb: 0, durMs: Math.round((last / sr - land) * 1000) };
}
(window as unknown as { __audio: Promise<unknown> }).__audio = Promise.all([...NAMES.map(measure), ...Object.keys(MUSIC_STYLES).flatMap((id) => [measureMusic(0.25, 0, id), measureMusic(1, 0.6, id), measureEnding(id)])]);

/** Renders a music preview (scripts/music-preview.mjs): low intensity, then full, with on-beat amber chains. */
(window as unknown as { __renderPreview: (styleId?: string, ending?: boolean) => Promise<number[][]> }).__renderPreview = async (styleId = 'journal', ending = false) => {
  if (ending) return renderEnding(styleId);
  const sr = 44100, secs = 34;
  const ctx = new OfflineAudioContext(2, sr * secs, sr);
  const bus = ctx.createGain();
  bus.gain.value = MUSIC_LEVEL;
  bus.connect(ctx.destination);
  const m = new Music(ctx, bus, MUSIC_STYLES[styleId]);
  m.start(0);
  for (let s = 0; s < secs - 1; s += 0.05) {
    m.intensity = s < 16 ? 0.25 : 0.9;
    m.update(s, 1, 0.05, s);
    // A line of amber, one piece every eighth note, in each half.
    const eighth = 0.25;
    for (const [a, b] of [[4, 6.5], [20, 23]]) {
      const n = Math.round(s / eighth);
      if (s >= a && s <= b && Math.abs(s - n * eighth) < 0.026) m.chime(s - 0.03, 1, s - 0.03);
    }
  }
  const buf = await ctx.startRendering();
  return [Array.from(buf.getChannelData(0)), Array.from(buf.getChannelData(1))];
};

/** The end of a level as the player hears it: 8 s of the chase at full intensity, the pounce riser, the pounce, and
 * the landing 1.71 s later, left to ring out. */
async function renderEnding(styleId: string) {
  const sr = 44100, secs = 15;
  const ctx = new OfflineAudioContext(2, sr * secs, sr);
  const bus = ctx.createGain();
  bus.gain.value = MUSIC_LEVEL;
  bus.connect(ctx.destination);
  const m = new Music(ctx, bus, MUSIC_STYLES[styleId]);
  m.intensity = 0.95;
  m.start(0);
  for (let s = 0; s < 8; s += 0.05) m.update(s, 1, 0.05, s);
  void ctx.suspend(6.6).then(() => { m.riser(); void ctx.resume(); });
  void ctx.suspend(8).then(() => { m.sting(); void ctx.resume(); });
  void ctx.suspend(9.71).then(() => { m.finale(); void ctx.resume(); });
  const buf = await ctx.startRendering();
  return [Array.from(buf.getChannelData(0)), Array.from(buf.getChannelData(1))];
}
