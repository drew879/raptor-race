import type { HazardType } from './types';

/** Axis-aligned box relative to the hazard origin (lane center, ground, hazard z). */
export interface Box { hx: number; y0: number; y1: number; hz: number }

/** Collision volumes. Slightly smaller than visuals (forgiving), per the GDD feel rules. */
export const HAZARD_BOXES: Record<HazardType, Box> = {
  boulder: { hx: 0.55, y0: 0, y1: 2.2, hz: 0.45 }, // unjumpable: go around
  ledge: { hx: 0.62, y0: 0, y1: 0.52, hz: 0.32 },
  ledgeWide: { hx: 2.25, y0: 0, y1: 0.52, hz: 0.32 },
  arch: { hx: 0.7, y0: 0.66, y1: 1.3, hz: 0.28 },
  ribArch: { hx: 2.4, y0: 0.72, y1: 1.2, hz: 0.18 },
};

export const RAPTOR_BOX = { hx: 0.26, hz: 0.35, standTop: 1.02, slideTop: 0.5, airBottom: 0.22 };

export type Hit = 'none' | 'side' | 'front' | 'graze';

export interface RaptorShape { x: number; prevX: number; y: number; sliding: boolean; airborne: boolean }

/**
 * Classify the contact between the raptor and a hazard this frame.
 * - front: the raptor ran into it (crash)
 * - side: the raptor moved sideways into it (stumble, bounced back)
 * - graze: clipped the very top of a low obstacle (stumble, keep going)
 */
export function testHit(r: RaptorShape, dz: number, hx: number, box: Box): Hit {
  if (Math.abs(dz) > box.hz + RAPTOR_BOX.hz) return 'none';
  const bottom = r.y + (r.airborne ? RAPTOR_BOX.airBottom : 0);
  const top = r.y + (r.sliding ? RAPTOR_BOX.slideTop : RAPTOR_BOX.standTop);
  if (top <= box.y0 || bottom >= box.y1) return 'none';
  const overlapX = (x: number) => Math.abs(x - hx) < box.hx + RAPTOR_BOX.hx;
  if (!overlapX(r.x)) return 'none';
  if (!overlapX(r.prevX)) return 'side';
  if (box.y0 === 0 && bottom > box.y1 - 0.14) return 'graze';
  return 'front';
}
