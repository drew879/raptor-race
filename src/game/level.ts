import type { HazardType, Lane, PickupKind } from './types';
import { CONFIG } from './config';
import { Runner } from './runner';

export type HintKind = 'lanes' | 'jump' | 'slide' | 'updraft' | 'magnet' | 'fork';

/** `len` is set for long hazards (the fork spine): `d` is where it starts, and it runs `len` meters on. */
export interface HazardEvent { d: number; type: HazardType; lane: Lane; len?: number }
export interface PickupEvent { d: number; kind: PickupKind; lane: Lane; y: number }
export interface HintEvent { d: number; hint: HintKind }
/** The kinds of landmark stretch a level is built from (terrain and scenery change per stretch). */
export type SectionKind = 'dunes' | 'canyon' | 'hoodoos' | 'basin' | 'bones' | 'herd' | 'flats';
export interface SectionEvent { from: number; kind: SectionKind }
/** A visual bend in the track (the simulation stays straight). `amount` is signed curvature, + bends right. */
export interface CurveEvent { d: number; len: number; amount: number }

export interface PreyDef {
  species: 'protoceratops';
  /** Gap at the start, in meters ahead of the raptor. */
  startGap: number;
  /** Where the prey tires and the pounce window opens (meters before the end). */
  finale: number;
}

export interface LevelDef {
  id: string;
  name: string;
  prey: PreyDef;
  length: number;
  speed: { start: number; end: number };
  checkpoints: number[];
  hazards: HazardEvent[];
  pickups: PickupEvent[];
  hints: HintEvent[];
  curves: CurveEvent[];
  /** Landmark stretches in order; each runs to the next (world meters). */
  sections: SectionEvent[];
  /** Distance where the storm visibly starts to build (story beat). */
  stormRises: number;
  parScore: number;
}

export const speedAt = (lvl: Pick<LevelDef, 'length' | 'speed'>, d: number) =>
  lvl.speed.start + (lvl.speed.end - lvl.speed.start) * Math.min(1, Math.max(0, d / lvl.length));

/**
 * Seconds of running from the start to distance d. Speed depends only on distance (stumbles don't slow you),
 * so this is exact for every run: the music takes its clock from it, and amber is placed on its beat grid.
 */
export function timeAt(lvl: Pick<LevelDef, 'length' | 'speed'>, d: number) {
  const { start: v0, end: v1 } = lvl.speed, L = lvl.length;
  const dd = Math.max(0, Math.min(d, L));
  const t = v1 === v0 ? dd / v0 : (L / (v1 - v0)) * Math.log(speedAt(lvl, dd) / v0);
  return t + Math.max(0, d - L) / v1;
}
/** Inverse of timeAt. */
export function distanceAtTime(lvl: Pick<LevelDef, 'length' | 'speed'>, t: number) {
  const { start: v0, end: v1 } = lvl.speed, L = lvl.length;
  const tEnd = timeAt(lvl, L);
  if (t >= tEnd) return L + (t - tEnd) * v1;
  return v1 === v0 ? t * v0 : ((v0 * Math.exp((t * (v1 - v0)) / L) - v0) * L) / (v1 - v0);
}
/** Music tempo for every level: amber lines sit on this beat grid. */
export const BPM = 120;
export const BEAT = 60 / BPM;

/** Small authoring DSL: keeps level files readable and amber lines consistent with the movement model. */
export class LevelBuilder {
  hazards: HazardEvent[] = [];
  pickups: PickupEvent[] = [];
  hints: HintEvent[] = [];
  curves: CurveEvent[] = [];
  sections: SectionEvent[] = [];
  /** `k` scales authored distances (design meters) to world meters, preserving timing at higher speeds. */
  constructor(private speed: { start: number; end: number }, private length: number, private k = 1) {}

  hz(d: number, type: HazardType, ...lanes: Lane[]) {
    // Gullies are cut into the terrain on its row grid, so they sit on a row boundary.
    const at = type === 'gully' ? Math.round((d * this.k) / CONFIG.world.trackRow) * CONFIG.world.trackRow : d * this.k;
    for (const lane of lanes) this.hazards.push({ d: at, type, lane });
    return this;
  }
  /**
   * Straight amber line at running height, one piece every `beats` (default an eighth note), placed in time
   * rather than meters: you pick them up exactly on the music's beat at any speed.
   */
  line(from: number, to: number, lane: Lane, beats = 0.5, y = 0.75) {
    const lv = { speed: this.speed, length: this.length };
    const unit = beats * BEAT;
    const n0 = Math.ceil(timeAt(lv, from * this.k) / unit - 1e-6), n1 = Math.floor(timeAt(lv, to * this.k) / unit + 1e-6);
    for (let n = n0; n <= n1; n++) this.pickups.push({ d: distanceAtTime(lv, n * unit), kind: 'amber', lane, y });
    return this;
  }
  /** Low line for slides, on sixteenths. */
  low(from: number, to: number, lane: Lane) { return this.line(from, to, lane, 0.25, 0.36); }
  /**
   * Amber following the jump parabola over an obstacle (takeoff half a jump before it), one piece per
   * sixteenth note along the arc, so even jump arcs chime on the beat.
   */
  arcOver(obstacleD: number, lane: Lane, _n = 5) {
    const lv = { speed: this.speed, length: this.length };
    const T = CONFIG.jump.airTime, unit = BEAT / 4;
    const t0 = timeAt(lv, obstacleD * this.k) - T / 2;
    for (let n = Math.ceil((t0 + 0.06) / unit); n * unit < t0 + T - 0.06; n++) {
      const t = n * unit - t0;
      const y = Runner.V0 * t - 0.5 * Runner.G * t * t;
      this.pickups.push({ d: distanceAtTime(lv, n * unit), kind: 'amber', lane, y: 0.75 + y });
    }
    return this;
  }
  egg(d: number, lane: Lane, y = 0.8) { this.pickups.push({ d: d * this.k, kind: 'egg', lane, y }); return this; }
  power(d: number, kind: 'magnet' | 'updraft', lanes: Lane[] = [-1, 0, 1], y = 0.9) {
    for (const lane of lanes) this.pickups.push({ d: d * this.k, kind, lane, y });
    return this;
  }
  /** A fork: a sandstone fin fills the middle lane from `from` to `to`; each side lane becomes its own route. */
  fork(from: number, to: number) {
    this.hazards.push({ d: from * this.k, type: 'spine', lane: 0, len: (to - from) * this.k });
    return this;
  }
  /** An automatic bend from `from` to `to`: +1 is a medium right-hander, -1 a medium left-hander. */
  bend(from: number, to: number, amount: number) {
    this.curves.push({ d: from * this.k, len: (to - from) * this.k, amount });
    return this;
  }
  /** From design distance `from` on, the scenery is this kind of stretch. */
  section(from: number, kind: SectionKind) { this.sections.push({ from: from * this.k, kind }); return this; }
  hint(d: number, hint: HintKind) { this.hints.push({ d: d * this.k, hint }); return this; }
  /** High amber for glide sections. */
  sky(from: number, to: number, lane: Lane, y = 2.75, beats = 0.5) { return this.line(from, to, lane, beats, y); }
  build(meta: Omit<LevelDef, 'hazards' | 'pickups' | 'hints' | 'curves' | 'sections' | 'speed' | 'length'>): LevelDef {
    const by = <T extends { d: number }>(a: T, b: T) => a.d - b.d;
    return { ...meta, speed: this.speed, length: this.length, hazards: this.hazards.sort(by), pickups: this.pickups.sort(by), hints: this.hints.sort(by), curves: this.curves.sort(by), sections: this.sections.sort((a, b) => a.from - b.from) };
  }
}

/** Signed track curvature at distance d: each bend eases in and out over its first and last quarter. */
export function curvatureAt(curves: CurveEvent[], d: number) {
  let k = 0;
  for (const c of curves) {
    if (d < c.d || d > c.d + c.len) continue;
    const u = (d - c.d) / c.len;
    const e = Math.min(1, u / 0.25, (1 - u) / 0.25);
    k += c.amount * e * e * (3 - 2 * e);
  }
  return k;
}
