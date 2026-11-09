import type { HazardType, Lane, PickupKind } from './types';
import { CONFIG } from './config';
import { Runner } from './runner';

export type HintKind = 'lanes' | 'jump' | 'slide' | 'updraft' | 'magnet';

export interface HazardEvent { d: number; type: HazardType; lane: Lane }
export interface PickupEvent { d: number; kind: PickupKind; lane: Lane; y: number }
export interface HintEvent { d: number; hint: HintKind }

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
  /** Distance where the storm visibly starts to build (story beat). */
  stormRises: number;
  parScore: number;
}

export const speedAt = (lvl: Pick<LevelDef, 'length' | 'speed'>, d: number) =>
  lvl.speed.start + (lvl.speed.end - lvl.speed.start) * Math.min(1, Math.max(0, d / lvl.length));

/** Small authoring DSL: keeps level files readable and amber lines consistent with the movement model. */
export class LevelBuilder {
  hazards: HazardEvent[] = [];
  pickups: PickupEvent[] = [];
  hints: HintEvent[] = [];
  /** `k` scales authored distances (design meters) to world meters, preserving timing at higher speeds. */
  constructor(private speed: { start: number; end: number }, private length: number, private k = 1) {}
  private v(d: number) { return speedAt({ speed: this.speed, length: this.length }, d); }

  hz(d: number, type: HazardType, ...lanes: Lane[]) {
    for (const lane of lanes) this.hazards.push({ d: d * this.k, type, lane });
    return this;
  }
  /** Straight amber line at running height. */
  line(from: number, to: number, lane: Lane, step = 2.4, y = 0.75) {
    for (let d = from; d <= to + 1e-6; d += step) this.pickups.push({ d: d * this.k, kind: 'amber', lane, y });
    return this;
  }
  /** Low line for slides. */
  low(from: number, to: number, lane: Lane) { return this.line(from, to, lane, 1.7, 0.36); }
  /** Amber following the jump parabola, for a takeoff at d0 (centered over an obstacle at d0 + half the jump). */
  arcOver(obstacleD: number, lane: Lane, n = 5) {
    const T = CONFIG.jump.airTime, v = this.v(obstacleD * this.k);
    const d0 = obstacleD * this.k - (v * T) / 2;
    for (let i = 1; i <= n; i++) {
      const t = (i / (n + 1)) * T;
      const y = Runner.V0 * t - 0.5 * Runner.G * t * t;
      this.pickups.push({ d: d0 + v * t, kind: 'amber', lane, y: 0.75 + y });
    }
    return this;
  }
  egg(d: number, lane: Lane, y = 0.8) { this.pickups.push({ d: d * this.k, kind: 'egg', lane, y }); return this; }
  power(d: number, kind: 'magnet' | 'updraft', lanes: Lane[] = [-1, 0, 1], y = 0.9) {
    for (const lane of lanes) this.pickups.push({ d: d * this.k, kind, lane, y });
    return this;
  }
  hint(d: number, hint: HintKind) { this.hints.push({ d: d * this.k, hint }); return this; }
  /** High amber for glide sections. */
  sky(from: number, to: number, lane: Lane, y = 2.75, step = 3) { return this.line(from, to, lane, step, y); }
  build(meta: Omit<LevelDef, 'hazards' | 'pickups' | 'hints' | 'speed' | 'length'>): LevelDef {
    const by = <T extends { d: number }>(a: T, b: T) => a.d - b.d;
    return { ...meta, speed: this.speed, length: this.length, hazards: this.hazards.sort(by), pickups: this.pickups.sort(by), hints: this.hints.sort(by) };
  }
}
