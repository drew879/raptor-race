/**
 * Adaptive hunt music v2 (docs/AUDIO_BIBLE.md): a composed eight-bar theme in C# minor at 120 BPM, on kalimba
 * and marimba over hand drums, shaker and a warm bass, with a wind bed under it. A melody and a groove play
 * from the first bar; layers join as the hunt intensifies.
 *
 * The music takes its clock from the run itself (the song position is the running time to the raptor's
 * distance, see level.timeAt), so it stays locked to the amber, which levels place on the same beat grid.
 * Amber chimes snap onto the next sixteenth and play a tone of the current chord: collecting a line plays
 * part of the tune.
 *
 * Works with an AudioContext or an OfflineAudioContext (scripts/audio-check.mjs renders it to check levels).
 */
import { BEAT } from '../game/level';

const S16 = BEAT / 4; // a sixteenth
const BAR = 16; // sixteenths per bar
const LOOP = 8 * BAR;
const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

type Chord = { root: number; tones: number[] };
// i - VI - III - VII | i - VI - VII - i, roots in the bass register, tones as pitch classes (C# = 1).
const CHORDS: Chord[] = [
  { root: 37, tones: [1, 4, 8] }, // C#m
  { root: 33, tones: [9, 1, 4] }, // A
  { root: 40, tones: [4, 8, 11] }, // E
  { root: 35, tones: [11, 3, 6] }, // B
  { root: 37, tones: [1, 4, 8] },
  { root: 33, tones: [9, 1, 4] },
  { root: 35, tones: [11, 3, 6] },
  { root: 37, tones: [1, 4, 8] },
];

/** The theme: per bar, [sixteenth, MIDI note, length in sixteenths]. A 3+3+2 lilt, call and answer. */
const THEME: [number, number, number][][] = [
  [[0, 80, 3], [3, 83, 3], [6, 85, 4], [10, 83, 2], [12, 80, 2], [14, 76, 2]],
  [[0, 85, 6], [6, 83, 2], [8, 81, 2], [10, 80, 2], [12, 76, 4]],
  [[0, 80, 3], [3, 83, 3], [6, 88, 4], [10, 83, 2], [12, 80, 2], [14, 83, 2]],
  [[0, 78, 6], [6, 75, 2], [8, 78, 2], [10, 80, 2], [12, 78, 4]],
  [[0, 80, 3], [3, 83, 3], [6, 85, 4], [10, 83, 2], [12, 80, 2], [14, 76, 2]],
  [[0, 88, 4], [4, 85, 2], [6, 83, 2], [8, 85, 4], [12, 81, 2], [14, 80, 2]],
  [[0, 78, 3], [3, 80, 3], [6, 83, 4], [10, 78, 2], [12, 76, 2], [14, 78, 2]],
  [[0, 73, 8], [8, 80, 4], [12, 73, 4]],
];

export class Music {
  readonly out: GainNode;
  private ctx: BaseAudioContext;
  private noise: AudioBuffer;
  private wind: { src: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode } | null = null;
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

  constructor(ctx: BaseAudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.duck = ctx.createGain();
    this.tone = ctx.createBiquadFilter();
    this.tone.type = 'lowpass';
    this.tone.frequency.value = 16000;
    this.duck.connect(this.tone).connect(this.out).connect(destination);
    const len = Math.floor(ctx.sampleRate * 2);
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    let s = 4242;
    for (let i = 0; i < len; i++) { s = (s * 1664525 + 1013904223) >>> 0; d[i] = s / 2147483648 - 1; }
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
  private osc(t: number, type: OscillatorType, f: number, peak: number, attack: number, decay: number, dest: AudioNode, glideTo?: number) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + attack + decay);
    const g = this.env(t, peak, attack, decay);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + attack + decay + 0.03);
  }
  private panTo(pan: number) {
    if (!pan || typeof (this.ctx as AudioContext).createStereoPanner !== 'function') return this.duck;
    const p = this.ctx.createStereoPanner();
    p.pan.value = pan;
    p.connect(this.duck);
    return p;
  }
  /** Kalimba: a sine tine with a quick inharmonic overtone and a soft thumb click. */
  private kalimba(t: number, midi: number, gain: number, pan = 0) {
    const f = midiHz(midi), dest = this.panTo(pan);
    this.osc(t, 'sine', f, gain, 0.003, 0.9 - (midi - 70) * 0.012, dest);
    this.osc(t, 'sine', f * 5.95, gain * 0.22, 0.001, 0.07, dest);
    this.hiss(t, 0.012, gain * 0.25, 'bandpass', 3800, 1.5, pan);
  }
  /** Marimba: a wooden bar, fundamental plus the 4th and ~10th partials dying fast. */
  private marimba(t: number, midi: number, gain: number, pan = 0) {
    const f = midiHz(midi), dest = this.panTo(pan);
    this.osc(t, 'sine', f, gain, 0.002, 0.55, dest);
    this.osc(t, 'sine', f * 4, gain * 0.3, 0.001, 0.08, dest);
    this.osc(t, 'sine', f * 9.8, gain * 0.1, 0.001, 0.025, dest);
  }
  /** Warm round bass: triangle and sine, a little pitch drop at the start. */
  private bass(t: number, midi: number, gain: number, len: number) {
    const f = midiHz(midi);
    this.osc(t, 'triangle', f * 1.01, gain * 0.6, 0.006, Math.min(0.5, len), this.duck, f);
    this.osc(t, 'sine', f, gain, 0.006, Math.min(0.6, len + 0.1), this.duck);
  }
  private drum(t: number, f0: number, f1: number, dur: number, gain: number, click: number, clickF: number) {
    this.osc(t, 'sine', f0, gain, 0.003, dur, this.duck, f1);
    if (click > 0) this.hiss(t, 0.03, click, 'bandpass', clickF, 1.2);
  }
  private hiss(t: number, dur: number, gain: number, type: BiquadFilterType, f: number, q: number, pan = 0) {
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

  /** The pounce: a big drum and the home chord ringing out, then silence for the finish fanfare. */
  sting() {
    const t = this.ctx.currentTime + 0.02;
    this.drum(t, 120, 42, 0.9, 0.45, 0.12, 900);
    [73, 76, 80, 85].forEach((m, k) => this.marimba(t + k * 0.04, m, 0.16, (k - 1.5) * 0.25));
    this.bass(t, 37, 0.3, 1.2);
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
      this.schedule(k, Math.max(now, now + ((k - cur) * S16) / rate));
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
    const chord = CHORDS[Math.floor((((k % LOOP) + LOOP) % LOOP) / BAR)];
    // Chord tones from E5 upward, climbing one tone per piece in a chain.
    const ladder: number[] = [];
    for (let m = 76; m <= 100 && ladder.length < 8; m++) if (chord.tones.includes(m % 12)) ladder.push(m);
    const midi = ladder[Math.min(this.chain, ladder.length - 1)];
    this.chain++;
    const f = midiHz(midi);
    this.osc(t, 'sine', f, 0.13, 0.002, 0.11, this.duck);
    this.osc(t, 'sine', f * 2.76, 0.025, 0.001, 0.05, this.duck);
  }

  private schedule(k: number, t: number) {
    const I = this.intensity;
    const step = ((k % LOOP) + LOOP) % LOOP;
    const bar = Math.floor(step / BAR), s16 = step % BAR;
    const chord = CHORDS[bar];
    // Drums: a 3+3+2 frame-drum pulse, hand-drum backbeat, shaker eighths (sixteenths as it builds).
    if (s16 === 0 || s16 === 6 || s16 === 8 || (I > 0.55 && (s16 === 11 || s16 === 14))) this.drum(t, 95, 50, 0.3, s16 === 0 ? 0.19 : 0.14, 0.03, 420);
    if (s16 === 4 || s16 === 12) this.drum(t, 330, 250, 0.08, 0.1, 0.08, 2600);
    if (I > 0.45 && (s16 === 2 || s16 === 7 || s16 === 10 || s16 === 15)) this.drum(t, 360, 280, 0.05, 0.04, 0.035, 3000);
    if (s16 % 2 === 0 || I > 0.4) this.hiss(t, s16 % 4 === 2 ? 0.06 : 0.035, s16 % 4 === 2 ? 0.045 : 0.02, 'highpass', 6500, 0.7, 0.25);
    // Bass: root, root, fifth on the same lilt as the drums.
    if (s16 === 0) this.bass(t, chord.root, 0.18, 6 * S16);
    if (s16 === 6) this.bass(t, chord.root, 0.15, 2 * S16);
    if (s16 === 10) this.bass(t, chord.root + 7, 0.15, 3 * S16);
    if (I > 0.7 && s16 === 14) this.bass(t, chord.root + 12, 0.14, 2 * S16);
    // The theme on kalimba, doubled an octave down on marimba as the hunt heats up.
    for (const [st, m] of THEME[bar]) {
      if (st !== s16) continue;
      this.kalimba(t, m, 0.15, -0.12);
      if (I > 0.45) this.marimba(t + 0.005, m - 12, 0.1, 0.18);
    }
    // Close to the prey: a quiet sixteenth arpeggio of the chord on marimba.
    if (I > 0.75) {
      const tones: number[] = [];
      for (let m = 64; m <= 80; m++) if (chord.tones.includes(m % 12)) tones.push(m);
      this.marimba(t, tones[s16 % tones.length], 0.05, s16 % 2 ? 0.35 : -0.35);
    }
  }
}
