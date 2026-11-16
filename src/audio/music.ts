/**
 * Adaptive hunt music engine (docs/AUDIO_BIBLE.md). The arrangement is data (a MusicStyle, see music-styles.ts);
 * this file holds the clock, the instruments, the amber chimes and the transport.
 *
 * The music takes its clock from the run itself (the song position is the running time to the raptor's
 * distance, see level.timeAt), so it stays locked to the amber, which levels place on the same 120 BPM grid.
 * Amber chimes snap onto the next sixteenth and play a tone of the current chord: collecting a line plays
 * part of the tune.
 *
 * Works with an AudioContext or an OfflineAudioContext (scripts/audio-check.mjs renders it to check levels).
 */
import { BEAT } from '../game/level';

export const S16 = BEAT / 4; // a sixteenth
export const BAR = 16; // sixteenths per bar
export const LOOP = 8 * BAR; // every style loops eight bars
export const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** A bar's harmony: bass root (MIDI) and chord tones as pitch classes (C = 0, C# = 1). */
export type Chord = { root: number; tones: number[] };

export interface MusicStyle {
  id: string;
  name: string;
  /** One chord per bar of the eight-bar loop. Amber chimes play these tones. */
  chords: Chord[];
  /** Relative gain (the original theme is 1) so every style peaks at the same level (checked offline). */
  level: number;
  /** Schedule sixteenth `s16` of bar `bar` at audio time `t`. `I` is the hunt's intensity, 0..1. */
  step(m: Music, bar: number, s16: number, t: number, I: number): void;
  /** The pounce. */
  sting(m: Music, t: number): void;
}

export interface SawOpts { cutoff?: number; q?: number; attack?: number; release?: number; detune?: number; filterEnv?: number; pan?: number; vibrato?: number; tremolo?: number; type?: OscillatorType }

export class Music {
  readonly out: GainNode;
  readonly ctx: BaseAudioContext;
  private noise: AudioBuffer;
  private wind: { src: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode } | null = null;
  private styleGain: GainNode;
  private duck: GainNode;
  private tone: BiquadFilterNode;
  private seed = 9;
  private lastStep = -Infinity;
  private playing = false;
  private chain = 0;
  private lastChimeSong = -10;
  /** 0..1: how many layers play. Set every frame from the hunt. */
  intensity = 0;
  /** 0..1: storm level swells the wind bed. */
  storm = 0;

  constructor(ctx: BaseAudioContext, destination: AudioNode, public style: MusicStyle) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.styleGain = ctx.createGain();
    this.styleGain.gain.value = style.level;
    this.duck = ctx.createGain();
    this.tone = ctx.createBiquadFilter();
    this.tone.type = 'lowpass';
    this.tone.frequency.value = 16000;
    this.duck.connect(this.tone).connect(this.styleGain).connect(this.out).connect(destination);
    const len = Math.floor(ctx.sampleRate * 2);
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    let s = 4242;
    for (let i = 0; i < len; i++) { s = (s * 1664525 + 1013904223) >>> 0; d[i] = s / 2147483648 - 1; }
  }

  setStyle(style: MusicStyle) {
    this.style = style;
    this.styleGain.gain.setValueAtTime(style.level, this.ctx.currentTime);
  }

  get isPlaying() { return this.playing; }
  private rnd() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; }

  // ---------------- Instruments ----------------
  private env(t: number, peak: number, attack: number, decay: number) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    return g;
  }
  osc(t: number, type: OscillatorType, f: number, peak: number, attack: number, decay: number, dest: AudioNode = this.duck, glideTo?: number) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + attack + decay);
    const g = this.env(t, peak, attack, decay);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + attack + decay + 0.03);
  }
  panTo(pan: number): AudioNode {
    if (!pan || typeof (this.ctx as AudioContext).createStereoPanner !== 'function') return this.duck;
    const p = this.ctx.createStereoPanner();
    p.pan.value = pan;
    p.connect(this.duck);
    return p;
  }
  /** Kalimba: a sine tine with a quick inharmonic overtone and a soft thumb click. */
  kalimba(t: number, midi: number, gain: number, pan = 0) {
    const f = midiHz(midi), dest = this.panTo(pan);
    this.osc(t, 'sine', f, gain, 0.003, 0.9 - (midi - 70) * 0.012, dest);
    this.osc(t, 'sine', f * 5.95, gain * 0.22, 0.001, 0.07, dest);
    this.hiss(t, 0.012, gain * 0.25, 'bandpass', 3800, 1.5, pan);
  }
  /** Marimba: a wooden bar, fundamental plus the 4th and ~10th partials dying fast. */
  marimba(t: number, midi: number, gain: number, pan = 0) {
    const f = midiHz(midi), dest = this.panTo(pan);
    this.osc(t, 'sine', f, gain, 0.002, 0.55, dest);
    this.osc(t, 'sine', f * 4, gain * 0.3, 0.001, 0.08, dest);
    this.osc(t, 'sine', f * 9.8, gain * 0.1, 0.001, 0.025, dest);
  }
  /** Warm round bass: triangle and sine, a little pitch drop at the start. */
  bass(t: number, midi: number, gain: number, len: number) {
    const f = midiHz(midi);
    this.osc(t, 'triangle', f * 1.01, gain * 0.6, 0.006, Math.min(0.5, len), this.duck, f);
    this.osc(t, 'sine', f, gain, 0.006, Math.min(0.6, len + 0.1), this.duck);
  }
  drum(t: number, f0: number, f1: number, dur: number, gain: number, click: number, clickF: number) {
    this.osc(t, 'sine', f0, gain, 0.003, dur, this.duck, f1);
    if (click > 0) this.hiss(t, 0.03, click, 'bandpass', clickF, 1.2);
  }
  /** A big low war drum: a long pitch-dropping boom and a burst of skin noise. */
  taiko(t: number, gain: number, pitch = 1) {
    this.osc(t, 'sine', 118 * pitch, gain, 0.004, 0.75, this.duck, 44 * pitch);
    this.osc(t, 'sine', 230 * pitch, gain * 0.25, 0.002, 0.07, this.duck, 120 * pitch);
    this.hiss(t, 0.14, gain * 0.55, 'lowpass', 380, 0.7);
  }
  snare(t: number, gain: number) {
    this.hiss(t, 0.15, gain, 'bandpass', 1900, 0.8);
    this.osc(t, 'triangle', 200, gain * 0.5, 0.002, 0.08, this.duck, 150);
  }
  /**
   * Bowed and brass sounds: detuned sawtooth pair through a low-pass (optionally swept), with attack, hold and
   * release, optional vibrato and tremolo.
   */
  saw(t: number, midi: number, gain: number, dur: number, o: SawOpts = {}) {
    const f = midiHz(midi), ctx = this.ctx;
    const attack = o.attack ?? 0.01, release = o.release ?? 0.08;
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.Q.value = o.q ?? 0.7;
    const cut = o.cutoff ?? 1500;
    if (o.filterEnv) { flt.frequency.setValueAtTime(cut * o.filterEnv, t); flt.frequency.exponentialRampToValueAtTime(cut, t + Math.min(0.25, dur)); }
    else flt.frequency.value = cut;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.setValueAtTime(gain, t + Math.max(attack, dur));
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(attack, dur) + release);
    const end = t + Math.max(attack, dur) + release + 0.03;
    let amp: AudioNode = g;
    if (o.tremolo) {
      const tg = ctx.createGain();
      tg.gain.value = 0.6;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = o.tremolo;
      const depth = ctx.createGain();
      depth.gain.value = 0.4;
      lfo.connect(depth).connect(tg.gain);
      lfo.start(t); lfo.stop(end);
      g.connect(tg);
      amp = tg;
    }
    flt.connect(g);
    amp.connect(this.panTo(o.pan ?? 0));
    for (const det of [-(o.detune ?? 7), o.detune ?? 7]) {
      const osc = ctx.createOscillator();
      osc.type = o.type ?? 'sawtooth';
      osc.frequency.setValueAtTime(f, t);
      osc.detune.value = det;
      if (o.vibrato) {
        const v = ctx.createOscillator();
        v.frequency.value = o.vibrato;
        const vd = ctx.createGain();
        vd.gain.value = 9;
        v.connect(vd).connect(osc.detune);
        v.start(t + 0.12); v.stop(end);
      }
      osc.connect(flt);
      osc.start(t);
      osc.stop(end);
    }
  }
  hiss(t: number, dur: number, gain: number, type: BiquadFilterType, f: number, q: number, pan = 0) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const flt = this.ctx.createBiquadFilter();
    flt.type = type;
    flt.frequency.value = f;
    flt.Q.value = q;
    const g = this.env(t, gain, 0.003, dur);
    src.connect(flt).connect(g).connect(this.panTo(pan));
    src.start(t, this.rnd() * 1.5);
    src.stop(t + dur + 0.03);
  }

  // ---------------- Transport ----------------
  /** Start (fades in). The first update after this picks up at the current song position. */
  start(at?: number) {
    const t = at ?? this.ctx.currentTime + 0.02;
    if (!this.wind) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      filter.Q.value = 0.4;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.02;
      src.connect(filter).connect(gain).connect(this.duck);
      src.start(t);
      this.wind = { src, filter, gain };
    }
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(Math.max(0.0001, this.out.gain.value), t);
    this.out.gain.linearRampToValueAtTime(1, t + 0.25);
    this.tone.frequency.setTargetAtTime(16000, t, 0.05);
    this.playing = true;
    this.lastStep = -Infinity;
  }

  /** Fade out over `fade` seconds and stop scheduling. */
  stop(fade = 0.8) {
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value, t);
    this.out.gain.linearRampToValueAtTime(0.0001, t + fade);
    this.playing = false;
  }

  /** Muffled while paused (the song position holds, so nothing new is scheduled). */
  setPaused(p: boolean) {
    const t = this.ctx.currentTime;
    this.tone.frequency.setTargetAtTime(p ? 600 : 16000, t, 0.08);
    this.duck.gain.setTargetAtTime(p ? 0.35 : 1, t, 0.08);
  }

  /** Dip 3 dB for a moment (inclusion pickup). */
  duckFor(seconds = 0.6) {
    const t = this.ctx.currentTime;
    this.duck.gain.cancelScheduledValues(t);
    this.duck.gain.setValueAtTime(0.7, t);
    this.duck.gain.setTargetAtTime(1, t + seconds, 0.15);
  }

  /** The moment before the pounce: a rising swell (air and a string glide up an octave) over ~1.2 s. */
  riser() {
    const t = this.ctx.currentTime + 0.01;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.setValueAtTime(2500, t);
    f.frequency.exponentialRampToValueAtTime(7000, t + 1.2);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.14, t + 1.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.35);
    src.connect(f).connect(g).connect(this.duck);
    src.start(t, this.rnd() * 0.5); // the 2 s noise buffer must outlast the 1.4 s swell
    src.stop(t + 1.4);
    const root = this.style.chords[0].root + 24;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(midiHz(root), t);
    o.frequency.exponentialRampToValueAtTime(midiHz(root + 12), t + 1.2);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.linearRampToValueAtTime(0.055, t + 1.0);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 1.35);
    o.connect(lp).connect(og).connect(this.duck);
    o.start(t);
    o.stop(t + 1.4);
  }

  /** The pounce: the style's sting, then silence for the finish fanfare. */
  sting() {
    const t = this.ctx.currentTime + 0.02;
    this.style.sting(this, t);
    this.playing = false;
    this.out.gain.setTargetAtTime(0.0001, t + 1.4, 0.4);
  }

  /**
   * Schedule everything due between the song position `song` (seconds of running) and `horizon` audio seconds
   * ahead. `rate` is how fast the song advances per audio second (the game's time scale; 0 holds it).
   */
  update(song: number, rate = 1, horizon = 0.12, now = this.ctx.currentTime) {
    if (this.wind) {
      const w = 0.02 + this.storm * 0.09 + 0.01 * Math.sin(now * 0.37);
      this.wind.gain.gain.setTargetAtTime(this.playing ? w : 0.0001, now, 0.3);
      this.wind.filter.frequency.setTargetAtTime(380 + this.storm * 900 + 120 * Math.sin(now * 0.23), now, 0.3);
    }
    if (!this.playing || rate <= 0) return;
    const cur = song / S16;
    // First update, a restart or a checkpoint (song jumped back), or a long stall: pick up from here.
    if (!(this.lastStep >= cur - 8) || this.lastStep > cur + 4) this.lastStep = Math.ceil(cur) - 1;
    const until = cur + (horizon * rate) / S16;
    while (this.lastStep + 1 <= until) {
      const k = ++this.lastStep;
      const step = ((k % LOOP) + LOOP) % LOOP;
      this.style.step(this, Math.floor(step / BAR), step % BAR, Math.max(now, now + ((k - cur) * S16) / rate), this.intensity);
    }
  }

  /** An amber pickup: a bell tone from the current chord, snapped onto the next sixteenth. */
  chime(song: number, rate = 1, now = this.ctx.currentTime) {
    // Pickups trigger a few centimeters before the amber's grid point; aim for the nearest sixteenth just ahead.
    let k = Math.round((song + 0.02) / S16);
    if (k * S16 < song - 0.03) k++;
    const t = Math.max(now, now + ((k * S16 - song) / Math.max(rate, 0.2)));
    if (song - this.lastChimeSong > 0.6) this.chain = 0;
    this.lastChimeSong = song;
    const chord = this.style.chords[Math.floor((((k % LOOP) + LOOP) % LOOP) / BAR)];
    // Chord tones from E5 upward, climbing one tone per piece in a chain.
    const ladder: number[] = [];
    for (let m = 76; m <= 100 && ladder.length < 8; m++) if (chord.tones.includes(m % 12)) ladder.push(m);
    const midi = ladder[Math.min(this.chain, ladder.length - 1)];
    this.chain++;
    const f = midiHz(midi);
    // Chimes keep the same loudness whatever the style's level.
    this.osc(t, 'sine', f, 0.13 / this.style.level, 0.002, 0.11, this.duck);
    this.osc(t, 'sine', f * 2.76, 0.025 / this.style.level, 0.001, 0.05, this.duck);
  }
}
