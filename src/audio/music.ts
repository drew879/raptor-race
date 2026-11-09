/**
 * Adaptive hunt music, synthesized (docs/AUDIO_BIBLE.md): hand drums, shaker, a low wind bed and plucked
 * Karplus-Strong motifs in C# minor pentatonic (the same notes as the amber chimes, so pickups always fit).
 * Layers come in as intensity rises; the storm swells the wind. Scheduled ahead on the audio clock.
 *
 * Works with an AudioContext or an OfflineAudioContext (scripts/audio-check.mjs renders it to check levels).
 */
const BPM = 104;
const STEP = 60 / BPM / 4; // a sixteenth
const SCALE = [61, 64, 66, 68, 71, 73, 76, 78]; // C#4 E4 F#4 G#4 B4 C#5 E5 F#5
const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** Two-bar motifs: [step 0..31, scale index, accent]. Chosen per phrase, so the hunt never loops identically. */
const MOTIFS: [number, number, number][][] = [
  [[0, 0, 1], [3, 2, 0], [6, 3, 0], [10, 2, 0], [16, 4, 1], [19, 3, 0], [22, 2, 0], [26, 1, 0]],
  [[0, 3, 1], [2, 2, 0], [4, 0, 0], [8, 2, 1], [14, 3, 0], [16, 5, 1], [20, 4, 0], [24, 3, 0], [28, 2, 0]],
  [[0, 0, 1], [4, 0, 0], [6, 1, 0], [8, 2, 1], [12, 4, 0], [18, 3, 0], [20, 2, 0], [24, 0, 1]],
  [[0, 5, 1], [3, 4, 0], [6, 3, 0], [8, 4, 0], [11, 3, 0], [14, 2, 0], [16, 3, 1], [22, 1, 0], [24, 0, 0]],
];
const BASS = [37, 37, 44, 42]; // C#2, C#2, G#2, F#2: one root per bar of a four-bar phrase

export class Music {
  readonly out: GainNode;
  private ctx: BaseAudioContext;
  private noise: AudioBuffer;
  private plucks = new Map<number, AudioBuffer>();
  private wind: { src: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode } | null = null;
  private duck: GainNode;
  private tone: BiquadFilterNode;
  private seed = 9;
  private step = 0;
  private nextT = 0;
  private playing = false;
  private motif = 0;
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
    for (const m of [...SCALE, ...SCALE.map((x) => x + 12), ...BASS]) this.plucks.set(m, this.renderPluck(midiHz(m), m < 50 ? 2.2 : 1.5, m < 50 ? 0.9985 : 0.996));
  }

  private rnd() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; }

  /** Karplus-Strong plucked string rendered once into a buffer (a feedback DelayNode can't go above ~340 Hz). */
  private renderPluck(freq: number, dur: number, loss: number) {
    const sr = this.ctx.sampleRate;
    const N = Math.max(2, Math.round(sr / freq));
    const len = Math.round(sr * dur);
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const ring = new Float32Array(N);
    let s = Math.round(freq * 1000) || 1, prev = 0;
    for (let i = 0; i < N; i++) { s = (s * 16807) % 2147483647; const w = s / 1073741823.5 - 1; prev = prev * 0.45 + w * 0.55; ring[i] = prev; } // softened excitation: warm, not twangy
    let idx = 0;
    for (let i = 0; i < len; i++) {
      const a = ring[idx], b = ring[(idx + 1) % N];
      d[i] = a;
      ring[idx] = loss * 0.5 * (a + b);
      idx = (idx + 1) % N;
    }
    const fade = Math.round(sr * 0.08);
    for (let i = 0; i < fade; i++) d[len - 1 - i] *= i / fade;
    return buf;
  }

  private pluck(t: number, midi: number, gain: number, pan = 0) {
    const buf = this.plucks.get(midi);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    let node: AudioNode = g;
    if (pan && typeof (this.ctx as AudioContext).createStereoPanner === 'function') {
      const p = this.ctx.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      node = p;
    }
    src.connect(g);
    node.connect(this.duck);
    src.start(t);
  }

  private drum(t: number, f0: number, f1: number, dur: number, gain: number, click: number, clickF: number) {
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.duck);
    o.start(t);
    o.stop(t + dur + 0.02);
    if (click > 0) this.hiss(t, 0.03, click, 'bandpass', clickF, 1.2);
  }

  private hiss(t: number, dur: number, gain: number, type: BiquadFilterType, f: number, q: number, pan = 0) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const flt = this.ctx.createBiquadFilter();
    flt.type = type;
    flt.frequency.value = f;
    flt.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt).connect(g);
    if (pan && typeof (this.ctx as AudioContext).createStereoPanner === 'function') {
      const p = this.ctx.createStereoPanner();
      p.pan.value = pan;
      g.connect(p).connect(this.duck);
    } else g.connect(this.duck);
    src.start(t, this.rnd() * 1.5);
    src.stop(t + dur + 0.02);
  }

  get isPlaying() { return this.playing; }

  /** Start the loop (fades in). `at` defaults to now. */
  start(at?: number) {
    const t = at ?? this.ctx.currentTime + 0.05;
    if (!this.wind) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      filter.Q.value = 0.4;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.03;
      src.connect(filter).connect(gain).connect(this.duck);
      src.start(t);
      this.wind = { src, filter, gain };
    }
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(Math.max(0.0001, this.out.gain.value), t);
    this.out.gain.linearRampToValueAtTime(1, t + 0.6);
    this.tone.frequency.setTargetAtTime(16000, t, 0.1);
    if (!this.playing) { this.playing = true; this.step = 0; this.nextT = t; }
  }

  /** Fade out over `fade` seconds and stop scheduling. */
  stop(fade = 0.8) {
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value, t);
    this.out.gain.linearRampToValueAtTime(0.0001, t + fade);
    this.playing = false;
  }

  /** Muffled and quiet while paused. */
  setPaused(p: boolean) {
    const t = this.ctx.currentTime;
    this.tone.frequency.setTargetAtTime(p ? 600 : 16000, t, 0.08);
    this.duck.gain.setTargetAtTime(p ? 0.35 : 1, t, 0.08);
  }

  /** Dip 3 dB for a moment (egg pickup). */
  duckFor(seconds = 0.6) {
    const t = this.ctx.currentTime;
    this.duck.gain.cancelScheduledValues(t);
    this.duck.gain.setValueAtTime(0.7, t);
    this.duck.gain.setTargetAtTime(1, t + seconds, 0.15);
  }

  /** The pounce: a big drum and a held chord, then silence for the finish fanfare. */
  sting() {
    const t = this.ctx.currentTime + 0.02;
    this.drum(t, 120, 42, 0.9, 0.5, 0.12, 900);
    [0, 2, 4].forEach((i, k) => this.pluck(t + k * 0.05, SCALE[i], 0.22, (k - 1) * 0.3));
    this.pluck(t, BASS[0], 0.35);
    this.playing = false;
    this.out.gain.setTargetAtTime(0.0001, t + 1.2, 0.4);
  }

  /** Schedule notes up to `horizon` seconds ahead. Call every frame. */
  update(horizon = 0.15) {
    const now = this.ctx.currentTime;
    if (this.wind) {
      const w = 0.025 + this.storm * 0.09 + 0.012 * Math.sin(now * 0.37);
      this.wind.gain.gain.setTargetAtTime(this.playing ? w : 0.0001, now, 0.3);
      this.wind.filter.frequency.setTargetAtTime(380 + this.storm * 900 + 120 * Math.sin(now * 0.23), now, 0.3);
    }
    if (!this.playing) return;
    if (this.nextT < now - 0.2) this.nextT = now + 0.02; // fell behind (tab hidden): skip ahead, don't burst
    while (this.nextT < now + horizon) {
      this.schedule(this.step, this.nextT);
      this.step = (this.step + 1) % 64; // four-bar phrase
      this.nextT += STEP;
    }
  }

  private schedule(step: number, t: number) {
    const I = this.intensity;
    const s16 = step % 16, bar = Math.floor(step / 16), s32 = step % 32;
    const swing = s16 % 2 === 1 ? STEP * 0.12 : 0; // a little shuffle
    t += swing;
    if (step === 0) this.motif = Math.floor(this.rnd() * MOTIFS.length);
    // Low frame drum (doum): the pulse, always on.
    if (s16 === 0 || s16 === 10 || (I > 0.55 && (s16 === 6 || s16 === 13))) this.drum(t, 92, 48, 0.32, s16 === 0 ? 0.26 : 0.19, 0.03, 400);
    // Bass pluck: phrase roots.
    if (I > 0.15 && s16 === 0) this.pluck(t, BASS[bar], 0.3);
    if (I > 0.7 && s16 === 8) this.pluck(t, BASS[bar] + 12, 0.16);
    // Hand drum (tak) on the backbeat, ghost notes as it builds.
    if (I > 0.3 && (s16 === 4 || s16 === 12)) this.drum(t, 340, 260, 0.07, 0.12, 0.09, 2600);
    if (I > 0.65 && (s16 === 3 || s16 === 9 || s16 === 15)) this.drum(t, 360, 280, 0.05, 0.05, 0.04, 3000);
    // Shaker sixteenths, accented off-beats.
    if (I > 0.22) this.hiss(t, s16 % 4 === 2 ? 0.06 : 0.035, (s16 % 4 === 2 ? 0.05 : 0.022) * Math.min(1, (I - 0.22) * 4), 'highpass', 6500, 0.7, 0.25);
    // Plucked motif, doubled an octave up at full intensity.
    if (I > 0.38) {
      for (const [st, idx, acc] of MOTIFS[this.motif]) {
        if (st !== s32) continue;
        const m = SCALE[(idx + (bar >= 2 ? 1 : 0)) % SCALE.length]; // second half of the phrase lifts a step
        this.pluck(t, m, acc ? 0.2 : 0.14, -0.15);
        if (I > 0.8) this.pluck(t + 0.01, m + 12, 0.07, 0.3);
      }
    }
  }
}
