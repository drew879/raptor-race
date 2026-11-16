/**
 * Music arrangements for the engine in music.ts. All share the 120 BPM grid and an eight-bar loop, so amber
 * stays on the beat whatever plays. Owner playtest 5: v2 ("Journal") felt on the beat but too light for a hunt;
 * two darker, more intense candidates follow for the owner to choose between.
 */
import type { Chord, Music, MusicStyle } from './music';

type Note = [step: number, midi: number, len: number];
const S = 0.125; // seconds per sixteenth at 120 BPM

// ---------------- v2: "Journal" (kalimba theme over hand drums) ----------------
const JOURNAL_CHORDS: Chord[] = [
  { root: 37, tones: [1, 4, 8] }, { root: 33, tones: [9, 1, 4] }, { root: 40, tones: [4, 8, 11] }, { root: 35, tones: [11, 3, 6] },
  { root: 37, tones: [1, 4, 8] }, { root: 33, tones: [9, 1, 4] }, { root: 35, tones: [11, 3, 6] }, { root: 37, tones: [1, 4, 8] },
];
const JOURNAL_THEME: Note[][] = [
  [[0, 80, 3], [3, 83, 3], [6, 85, 4], [10, 83, 2], [12, 80, 2], [14, 76, 2]],
  [[0, 85, 6], [6, 83, 2], [8, 81, 2], [10, 80, 2], [12, 76, 4]],
  [[0, 80, 3], [3, 83, 3], [6, 88, 4], [10, 83, 2], [12, 80, 2], [14, 83, 2]],
  [[0, 78, 6], [6, 75, 2], [8, 78, 2], [10, 80, 2], [12, 78, 4]],
  [[0, 80, 3], [3, 83, 3], [6, 85, 4], [10, 83, 2], [12, 80, 2], [14, 76, 2]],
  [[0, 88, 4], [4, 85, 2], [6, 83, 2], [8, 85, 4], [12, 81, 2], [14, 80, 2]],
  [[0, 78, 3], [3, 80, 3], [6, 83, 4], [10, 78, 2], [12, 76, 2], [14, 78, 2]],
  [[0, 73, 8], [8, 80, 4], [12, 73, 4]],
];
export const JOURNAL: MusicStyle = {
  id: 'journal',
  name: 'Journal',
  chords: JOURNAL_CHORDS,
  level: 1,
  step(m, bar, s16, t, I) {
    const chord = JOURNAL_CHORDS[bar];
    if (s16 === 0 || s16 === 6 || s16 === 8 || (I > 0.55 && (s16 === 11 || s16 === 14))) m.drum(t, 95, 50, 0.3, s16 === 0 ? 0.19 : 0.14, 0.03, 420);
    if (s16 === 4 || s16 === 12) m.drum(t, 330, 250, 0.08, 0.1, 0.08, 2600);
    if (I > 0.45 && (s16 === 2 || s16 === 7 || s16 === 10 || s16 === 15)) m.drum(t, 360, 280, 0.05, 0.04, 0.035, 3000);
    if (s16 % 2 === 0 || I > 0.4) m.hiss(t, s16 % 4 === 2 ? 0.06 : 0.035, s16 % 4 === 2 ? 0.045 : 0.02, 'highpass', 6500, 0.7, 0.25);
    if (s16 === 0) m.bass(t, chord.root, 0.18, 6 * S);
    if (s16 === 6) m.bass(t, chord.root, 0.15, 2 * S);
    if (s16 === 10) m.bass(t, chord.root + 7, 0.15, 3 * S);
    if (I > 0.7 && s16 === 14) m.bass(t, chord.root + 12, 0.14, 2 * S);
    for (const [st, n] of JOURNAL_THEME[bar]) {
      if (st !== s16) continue;
      m.kalimba(t, n, 0.15, -0.12);
      if (I > 0.45) m.marimba(t + 0.005, n - 12, 0.1, 0.18);
    }
    if (I > 0.75) {
      const tones: number[] = [];
      for (let n = 64; n <= 80; n++) if (chord.tones.includes(n % 12)) tones.push(n);
      m.marimba(t, tones[s16 % tones.length], 0.05, s16 % 2 ? 0.35 : -0.35);
    }
  },
  sting(m, t) {
    m.drum(t, 120, 42, 0.9, 0.45, 0.12, 900);
    [73, 76, 80, 85].forEach((n, k) => m.marimba(t + k * 0.04, n, 0.16, (k - 1.5) * 0.25));
    m.bass(t, 37, 0.3, 1.2);
  },
};

// ---------------- Candidate A: "War Drums" ----------------
// C# Phrygian: the flat second (D) over C# is the menace. i - bII - i - bVII | i - bII - bVI - V.
const WAR_CHORDS: Chord[] = [
  { root: 37, tones: [1, 4, 8] }, { root: 38, tones: [2, 6, 9] }, { root: 37, tones: [1, 4, 8] }, { root: 35, tones: [11, 3, 6] },
  { root: 37, tones: [1, 4, 8] }, { root: 38, tones: [2, 6, 9] }, { root: 33, tones: [9, 1, 4] }, { root: 44, tones: [8, 0, 3] },
];
/** A low horn line that leans on the half step C#-D. */
const WAR_HORN: Note[][] = [
  [[0, 61, 6], [6, 62, 2], [8, 61, 8]],
  [[0, 56, 6], [6, 59, 2], [8, 62, 4], [12, 61, 4]],
  [[0, 61, 6], [6, 64, 2], [8, 62, 6], [14, 61, 2]],
  [[0, 59, 8], [8, 56, 8]],
  [[0, 61, 6], [6, 62, 2], [8, 61, 8]],
  [[0, 64, 6], [6, 62, 2], [8, 61, 4], [12, 62, 4]],
  [[0, 64, 6], [6, 62, 2], [8, 61, 8]],
  [[0, 60, 8], [8, 56, 8]],
];
/** A driving low staccato riff on the Phrygian pedal: C# C# D C# C# G# E D. */
const WAR_RIFF = [49, 49, 50, 49, 49, 56, 52, 50];
export const WAR_DRUMS: MusicStyle = {
  id: 'war-drums',
  name: 'War Drums',
  chords: WAR_CHORDS,
  level: 0.8, // measured ~2 dB louder on average than the others
  step(m, bar, s16, t, I) {
    const chord = WAR_CHORDS[bar];
    // Taiko: DUN . . dun . . dun . DUN, rolling as it builds.
    const hits: Record<number, number> = { 0: 0.3, 3: 0.17, 6: 0.21, 8: 0.27 };
    if (I > 0.5) Object.assign(hits, { 11: 0.15, 12: 0.2, 14: 0.17, 15: 0.14 });
    if (hits[s16]) m.taiko(t, hits[s16], s16 === 0 || s16 === 8 ? 1 : 1.25);
    if (I > 0.25 && (s16 === 4 || s16 === 12)) m.hiss(t, 0.03, 0.09, 'bandpass', 2300, 1.4, 0.2); // rim
    if (I > 0.65 && s16 % 2 === 1) m.hiss(t, 0.02, 0.035, 'bandpass', 3200, 1.6, -0.25);
    // A dark drone under every bar: root and fifth, low and filtered.
    if (s16 === 0) {
      m.saw(t, chord.root, 0.06, 1.9, { cutoff: 240 + I * 160, attack: 0.25, release: 0.3, detune: 9 });
      m.saw(t, chord.root + 7, 0.04, 1.9, { cutoff: 240 + I * 160, attack: 0.25, release: 0.3, detune: 9 });
    }
    // The riff: eighth-note staccato pulses, brighter as the hunt heats up.
    if (I > 0.18 && s16 % 2 === 0) m.saw(t, WAR_RIFF[s16 / 2], s16 === 0 ? 0.085 : 0.065, 0.09, { cutoff: 700 + I * 900, release: 0.05, filterEnv: 2.2 });
    // Brass stabs on the downbeats.
    if (I > 0.55 && bar % 2 === 0 && (s16 === 0 || s16 === 6)) {
      for (const iv of [12, 19, 24]) m.saw(t, chord.root + iv, 0.045, 0.28, { cutoff: 1400, filterEnv: 2.5, release: 0.15, detune: 12 });
    }
    // The horn line.
    if (I > 0.38) for (const [st, n, len] of WAR_HORN[bar]) if (st === s16) m.saw(t, n, 0.07, len * S * 0.95, { cutoff: 1100 + I * 600, attack: 0.07, release: 0.18, vibrato: 4.5, detune: 5, pan: -0.1 });
    // High tremolo strings when the prey is close.
    if (I > 0.75 && s16 === 0) m.saw(t, 72 + ((chord.tones[0] - 0 + 12) % 12), 0.03, 1.9, { cutoff: 3500, attack: 0.3, release: 0.25, tremolo: 13, pan: 0.3 });
  },
  sting(m, t) {
    m.taiko(t, 0.42, 0.9);
    m.taiko(t + 0.25, 0.3, 1.1);
    for (const n of [49, 56, 61, 64]) m.saw(t, n, 0.06, 1.0, { cutoff: 1600, filterEnv: 2, release: 0.6, detune: 12 });
  },
};

// ---------------- Candidate B: "Chase Strings" ----------------
// C# harmonic minor with a Neapolitan turn: i - VI - iv - V | i - VI - bII - V. Spiccato strings drive it.
const CHASE_CHORDS: Chord[] = [
  { root: 37, tones: [1, 4, 8] }, { root: 33, tones: [9, 1, 4] }, { root: 42, tones: [6, 9, 1] }, { root: 44, tones: [8, 0, 3] },
  { root: 37, tones: [1, 4, 8] }, { root: 33, tones: [9, 1, 4] }, { root: 38, tones: [2, 6, 9] }, { root: 44, tones: [8, 0, 3] },
];
/** Spiccato pattern per bar, as offsets from the bar's root an octave up; accents on the 3+3+2 grouping. */
const CHASE_OST = [0, 0, 7, 0, 12, 0, 7, 0, 0, 0, 7, 0, 12, 7, 0, 7];
const CHASE_ACC = new Set([0, 3, 6, 8, 11, 14]);
const CHASE_VIOLIN: Note[][] = [
  [[0, 73, 4], [4, 76, 4], [8, 80, 6], [14, 81, 2]],
  [[0, 80, 4], [4, 76, 4], [8, 73, 8]],
  [[0, 78, 4], [4, 81, 4], [8, 85, 6], [14, 84, 2]],
  [[0, 80, 8], [8, 84, 4], [12, 80, 4]],
  [[0, 73, 4], [4, 76, 4], [8, 80, 6], [14, 81, 2]],
  [[0, 81, 4], [4, 80, 4], [8, 76, 4], [12, 73, 4]],
  [[0, 74, 4], [4, 78, 4], [8, 81, 6], [14, 80, 2]],
  [[0, 80, 4], [4, 75, 4], [8, 72, 8]],
];
export const CHASE_STRINGS: MusicStyle = {
  id: 'chase-strings',
  name: 'Chase Strings',
  chords: CHASE_CHORDS,
  level: 1.15, // measured ~1 dB quieter on average
  step(m, bar, s16, t, I) {
    const chord = CHASE_CHORDS[bar];
    const r = chord.root + 12;
    // Spiccato sixteenths, from the first bar.
    m.saw(t, r + CHASE_OST[s16], CHASE_ACC.has(s16) ? 0.07 : 0.045, 0.07, { cutoff: 1500 + I * 1200, release: 0.04, filterEnv: 1.8, pan: s16 % 2 ? 0.15 : -0.15 });
    if (I > 0.7) m.saw(t, r + 12 + CHASE_OST[s16], 0.03, 0.06, { cutoff: 2600, release: 0.04, pan: 0.3 });
    // Cellos on half notes.
    if (I > 0.22 && (s16 === 0 || s16 === 8)) m.saw(t, chord.root, 0.075, 0.9, { cutoff: 520, attack: 0.04, release: 0.12, detune: 6 });
    // Kit: kick, snare backbeat, hats.
    if (s16 === 0 || s16 === 8 || (I > 0.5 && s16 === 10)) m.drum(t, 92, 42, 0.28, 0.2, 0.03, 300);
    if (I > 0.3 && (s16 === 4 || s16 === 12)) m.snare(t, 0.09);
    if ((I > 0.4 && s16 % 2 === 0) || I > 0.65) m.hiss(t, 0.025, s16 % 4 === 2 ? 0.035 : 0.02, 'highpass', 8000, 0.7, 0.25);
    if (I > 0.5 && bar === 7 && s16 >= 12) m.drum(t, 180 - (s16 - 12) * 25, 90, 0.18, 0.11, 0.02, 600); // tom fill into the loop
    // Violins: a tense line over the top.
    if (I > 0.38) for (const [st, n, len] of CHASE_VIOLIN[bar]) if (st === s16) m.saw(t, n, 0.05, len * S * 0.97, { cutoff: 3200, attack: 0.04, release: 0.12, vibrato: 5.5, detune: 6, pan: 0.12 });
    // Tremolo on the fifth when the prey is close.
    if (I > 0.75 && s16 === 0) m.saw(t, 80 + ((chord.tones[2] - 8 + 12) % 12), 0.025, 1.9, { cutoff: 4000, attack: 0.2, release: 0.2, tremolo: 14, pan: -0.3 });
  },
  sting(m, t) {
    m.drum(t, 110, 40, 0.8, 0.35, 0.1, 500);
    m.hiss(t, 1.2, 0.08, 'highpass', 5000, 0.5);
    for (const n of [49, 56, 61, 64, 68]) m.saw(t, n, 0.05, 0.9, { cutoff: 2600, filterEnv: 1.5, release: 0.5, detune: 9 });
  },
};

export const MUSIC_STYLES: Record<string, MusicStyle> = { journal: JOURNAL, 'war-drums': WAR_DRUMS, 'chase-strings': CHASE_STRINGS };
/** The style the game plays until the owner picks one. */
export const DEFAULT_STYLE = JOURNAL;
export type { Music };
