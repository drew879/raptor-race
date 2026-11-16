import * as THREE from 'three';
import { HaloField } from './world/collectibles';
import { GOBI, col, mix } from './palette';

interface P { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; size: number; grow: number; alpha: number; c: THREE.Color; g: number; drag: number }

/** Soft sand puffs and sparkles. Pooled, CPU-simulated, one draw call each. */
export class Particles {
  readonly field: HaloField;
  private ps: P[] = [];
  constructor(capacity: number, blending: THREE.Blending, fog = { near: 30, far: 150 }) {
    this.field = new HaloField(capacity, fog, blending);
  }
  /** `side` adds sideways velocity (wind, lane changes); `gravity` and `drag` default to a settling puff (3.5, 2.5). */
  emit(x: number, y: number, z: number, n: number, o: { spread?: number; up?: number; back?: number; side?: number; size?: number; grow?: number; life?: number; alpha?: number; color?: THREE.Color; gravity?: number; drag?: number; rand: () => number }) {
    for (let i = 0; i < n && this.ps.length < this.field.capacity; i++) {
      const r = o.rand;
      const sp = o.spread ?? 1;
      this.ps.push({
        x: x + (r() - 0.5) * 0.3 * sp, y, z: z + (r() - 0.5) * 0.3 * sp,
        vx: (o.side ?? 0) + (r() - 0.5) * 2.2 * sp, vy: (o.up ?? 1) * (0.5 + r()), vz: (o.back ?? 0) + (r() - 0.5) * 1.5 * sp,
        life: 0, max: (o.life ?? 0.6) * (0.7 + r() * 0.6), size: (o.size ?? 0.35) * (0.7 + r() * 0.6), grow: o.grow ?? 1.2,
        alpha: o.alpha ?? 0.5, c: o.color ?? SAND, g: o.gravity ?? 3.5, drag: o.drag ?? 2.5,
      });
    }
  }
  update(dt: number) {
    let n = 0;
    const keep: P[] = [];
    for (const p of this.ps) {
      p.life += dt;
      if (p.life >= p.max) continue;
      p.vy -= p.g * dt;
      p.vx *= 1 - p.drag * dt; p.vz *= 1 - p.drag * dt;
      p.x += p.vx * dt; p.y = Math.max(0.02, p.y + p.vy * dt); p.z += p.vz * dt;
      const t = p.life / p.max;
      this.field.set(n++, p.x, p.y, p.z, p.size * (1 + p.grow * t), p.alpha * (1 - t) * Math.min(1, t * 8), p.c);
      keep.push(p);
    }
    this.ps = keep;
    this.field.commit(n);
  }
}

/** Dust a shade darker and warmer than the track, so puffs read against it (art review: they were invisible). */
export const SAND = mix(GOBI.sandShadow, GOBI.sandMid, 0.45);
export const SPARK = col(GOBI.amberLight);
