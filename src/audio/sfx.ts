/**
 * Synthesized sound effects (WebAudio). Mirrors docs/AUDIO_BIBLE.md.
 * Works with an online AudioContext or an OfflineAudioContext (for automated loudness checks).
 */
import { Music } from './music';

/** Music bus level relative to SFX: keeps music peaks about 8 dB under SFX peaks (AUDIO_BIBLE mix targets). */
export const MUSIC_LEVEL = 0.3;

export type SfxName = 'amber' | 'lane' | 'jump' | 'land' | 'slide' | 'stumble' | 'egg' | 'powerup' | 'checkpoint' | 'finish';

const PENTA = [0, 2, 4, 7, 9]; // major pentatonic, semitones
const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export class Sfx {
  readonly out: GainNode;
  private noise: AudioBuffer;
  private rnd: () => number;
  private chain = 0;
  private lastAmberT = -10;

  constructor(private ctx: BaseAudioContext, destination: AudioNode, rnd: () => number = Math.random) {
    this.rnd = rnd;
    this.out = ctx.createGain();
    this.out.gain.value = 0.8;
    this.out.connect(destination);
    const len = Math.floor(ctx.sampleRate * 1.0);
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    let seed = 12345;
    for (let i = 0; i < len; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; d[i] = seed / 2147483648 - 1; }
  }

  /** +/-3% pitch and +/-1.5 dB gain variation keeps repeats from grating. */
  private vary() {
    return { pitch: 1 + (this.rnd() - 0.5) * 0.06, gain: Math.pow(10, ((this.rnd() - 0.5) * 3) / 20) };
  }

  private env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private tone(t: number, freq: number, type: OscillatorType, peak: number, attack: number, decay: number, dest: AudioNode, glideTo?: number) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + attack + decay);
    const g = this.ctx.createGain();
    this.env(g, t, peak, attack, decay);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
  }

  private noiseBurst(t: number, dur: number, peak: number, filter: { type: BiquadFilterType; f0: number; f1?: number; q?: number }, dest: AudioNode, attack = 0.01) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = filter.type;
    f.Q.value = filter.q ?? 0.8;
    f.frequency.setValueAtTime(filter.f0, t);
    if (filter.f1) f.frequency.exponentialRampToValueAtTime(filter.f1, t + dur);
    const g = this.ctx.createGain();
    this.env(g, t, peak, attack, dur);
    src.connect(f).connect(g).connect(dest);
    const off = this.rnd() * 0.5;
    src.start(t, off);
    src.stop(t + attack + dur + 0.05);
    return g;
  }

  private panned(pan: number) {
    if (typeof (this.ctx as AudioContext).createStereoPanner !== 'function') return this.out;
    const p = this.ctx.createStereoPanner();
    p.pan.value = pan;
    p.connect(this.out);
    return p;
  }

  play(name: SfxName, opts: { dir?: number; t?: number } = {}) {
    const t = opts.t ?? this.ctx.currentTime + 0.005;
    const v = this.vary();
    const o = this.out;
    switch (name) {
      case 'amber': {
        if (t - this.lastAmberT > 0.6) this.chain = 0;
        this.lastAmberT = t;
        const step = Math.min(this.chain, 9);
        const midi = 76 + PENTA[step % 5] + 12 * Math.floor(step / 5); // from E5, up two octaves
        this.chain++;
        const f = midiHz(midi) * v.pitch;
        this.tone(t, f, 'sine', 0.16 * v.gain, 0.002, 0.09, o);
        this.tone(t, f * 2.76, 'sine', 0.03 * v.gain, 0.001, 0.05, o); // glassy partial
        break;
      }
      case 'lane': {
        const dest = this.panned((opts.dir ?? 0) * 0.35);
        this.noiseBurst(t, 0.13, 0.5 * v.gain, { type: 'bandpass', f0: 900 * v.pitch, f1: 2600 * v.pitch, q: 1.1 }, dest, 0.02);
        break;
      }
      case 'jump': {
        this.tone(t, 150 * v.pitch, 'sine', 0.22 * v.gain, 0.004, 0.08, o, 75);
        this.noiseBurst(t + 0.01, 0.17, 0.12 * v.gain, { type: 'bandpass', f0: 700 * v.pitch, f1: 2000, q: 0.9 }, o, 0.03);
        break;
      }
      case 'land': {
        this.noiseBurst(t, 0.11, 0.3 * v.gain, { type: 'lowpass', f0: 650 * v.pitch, f1: 250, q: 0.7 }, o, 0.003);
        this.tone(t, 95 * v.pitch, 'sine', 0.2 * v.gain, 0.003, 0.07, o, 60);
        break;
      }
      case 'slide': {
        const g = this.noiseBurst(t, 0.3, 0.2 * v.gain, { type: 'bandpass', f0: 1500 * v.pitch, f1: 700, q: 0.7 }, o, 0.02);
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 26;
        const depth = this.ctx.createGain();
        depth.gain.value = 0.05;
        lfo.connect(depth).connect(g.gain);
        lfo.start(t);
        lfo.stop(t + 0.35);
        break;
      }
      case 'stumble': {
        this.tone(t, 110, 'sine', 0.3 * v.gain, 0.003, 0.12, o, 55);
        this.noiseBurst(t, 0.22, 0.18 * v.gain, { type: 'highpass', f0: 1800, q: 0.5 }, o, 0.002);
        this.noiseBurst(t, 0.16, 0.25 * v.gain, { type: 'lowpass', f0: 500, q: 0.6 }, o, 0.002);
        break;
      }
      case 'egg': {
        [76, 79, 84].forEach((m, i) => {
          const f = midiHz(m);
          this.tone(t + i * 0.09, f, 'triangle', 0.12, 0.004, 0.42, o);
          this.tone(t + i * 0.09, f * 2, 'sine', 0.035, 0.002, 0.25, o);
        });
        break;
      }
      case 'powerup': {
        for (let i = 0; i < 5; i++) this.tone(t + i * 0.05, midiHz(72 + PENTA[i]) , 'sine', 0.08, 0.01, 0.3, o, midiHz(84 + PENTA[i]));
        break;
      }
      case 'checkpoint': {
        this.tone(t, 680, 'sine', 0.2, 0.001, 0.05, o);
        this.tone(t + 0.11, 1020, 'sine', 0.18, 0.001, 0.06, o);
        break;
      }
      case 'finish': {
        [60, 64, 67, 72, 76].forEach((m, i) => {
          this.tone(t + i * 0.12, midiHz(m), 'triangle', 0.14, 0.003, 0.6, o);
          this.tone(t + i * 0.12, midiHz(m) * 4, 'sine', 0.02, 0.001, 0.1, o); // mallet click
        });
        this.tone(t, 80, 'sine', 0.3, 0.005, 0.5, o, 50);
        break;
      }
    }
  }
}

/** Lazily unlocked audio for the live game (iOS needs a user gesture). */
export class AudioEngine {
  ctx: AudioContext | null = null;
  sfx: Sfx | null = null;
  master: GainNode | null = null;
  music: Music | null = null;
  private musicBus: GainNode | null = null;
  private muted = false;
  private musicOn = true;
  unlock() {
    if (this.ctx) { void this.ctx.resume(); return; }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC({ latencyHint: 'interactive' });
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.003; comp.release.value = 0.15;
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(comp).connect(this.ctx.destination);
    this.sfx = new Sfx(this.ctx, this.master);
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = this.musicOn ? MUSIC_LEVEL : 0;
    this.musicBus.connect(this.master);
    this.music = new Music(this.ctx, this.musicBus);
  }
  setMusic(on: boolean) {
    this.musicOn = on;
    if (this.musicBus) this.musicBus.gain.value = on ? MUSIC_LEVEL : 0;
  }
  play(name: SfxName, opts?: { dir?: number }) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    this.sfx?.play(name, opts);
  }
  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 1;
  }
}
