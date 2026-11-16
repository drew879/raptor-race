import type { LevelDef } from './level';

/** A level's visual downhill (LevelDef.slope). */
export type HillDef = NonNullable<LevelDef['slope']>;

/** A smooth ramp: 0 well before 0, x well after, bending over about `w` meters either side. */
const softplus = (x: number, w: number) => Math.max(x, 0) + w * Math.log(1 + Math.exp(-Math.abs(x) / w));
const sigmoid = (x: number, w: number) => 1 / (1 + Math.exp(-x / w));
const PITCH_SOFT = 5;

/** The hill's height (meters, 0 at the crest, negative going down) at course distance d. The world shaders compute
 * the same thing (render/materials.ts HILL_GLSL); keep them in step. */
export function hillAt(hill: HillDef | undefined, d: number): number {
  if (!hill) return 0;
  let h = -hill.grade * (softplus(d - hill.from, 8) - softplus(d - hill.to, 8));
  for (const p of hill.pitches ?? []) {
    const w = p.soft ?? PITCH_SOFT;
    h -= p.extra * (softplus(d - p.from, w) - softplus(d - p.to, w));
  }
  return h;
}

/** The hill's local grade (drop per meter) at course distance d. */
export function gradeAt(hill: HillDef | undefined, d: number): number {
  if (!hill) return 0;
  let g = hill.grade * (sigmoid(d - hill.from, 8) - sigmoid(d - hill.to, 8));
  for (const p of hill.pitches ?? []) {
    const w = p.soft ?? PITCH_SOFT;
    g += p.extra * (sigmoid(d - p.from, w) - sigmoid(d - p.to, w));
  }
  return g;
}
