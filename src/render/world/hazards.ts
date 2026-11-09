import * as THREE from 'three';
import { GeomBuilder, jitterGeometry } from '../geom';
import { GOBI, col, mix, shade } from '../palette';
import { MATS } from '../materials';
import { Rng } from '../../core/rng';
import { addTube } from './props';
import { scenery } from './scenery';

import type { HazardType } from '../../game/types';
export type { HazardType };

/** Smooth, position-based tonal drift (no per-face randomness, so no checkerboard "quilt"). */
const drift = (c: THREE.Vector3) => 1 + 0.05 * Math.sin(c.x * 4.1 + c.y * 3.3 + c.z * 2.7) + 0.03 * Math.sin(c.x * 9.7 - c.z * 7.1);
const rockTone = (n: THREE.Vector3, c: THREE.Vector3, base = GOBI.hazardRock, light = GOBI.hazardRockLight) => {
  const up = n.y;
  const k = up > 0.45 ? mix(base, light, 0.9) : up < -0.3 ? shade(col(base), 0.8) : mix(base, light, 0.35);
  return shade(k, drift(c));
};

/** Hand-built fallbacks (kept for reference and the asset lab). */
export function boulder(): THREE.BufferGeometry {
  const g = new GeomBuilder();
  const rng = new Rng(11);
  const main = jitterGeometry(new THREE.IcosahedronGeometry(1, 1), 0.28, () => rng.next());
  g.appendGeometry(main, new THREE.Matrix4().compose(new THREE.Vector3(0, 0.68, 0), new THREE.Quaternion(), new THREE.Vector3(0.66, 0.74, 0.58)), (_i, c, n) => rockTone(n, c));
  for (const [x, z, s] of [[-0.55, 0.25, 0.28], [0.5, 0.3, 0.22], [0.35, -0.4, 0.18]] as const) {
    const pebble = jitterGeometry(new THREE.IcosahedronGeometry(1, 0), 0.3, () => rng.next());
    g.appendGeometry(pebble, new THREE.Matrix4().compose(new THREE.Vector3(x, s * 0.5, z), new THREE.Quaternion(), new THREE.Vector3(s, s * 0.8, s)), (_i, c, n) => rockTone(n, c));
  }
  return g.build();
}

/** Low rock shelf to jump over. Width covers one lane (1.4) or all three (4.6). */
export function ledge(width: number): THREE.BufferGeometry {
  const g = new GeomBuilder();
  const rng = new Rng(Math.round(width * 100));
  const box = new THREE.BoxGeometry(width, 0.6, 0.8, Math.max(2, Math.round(width * 2.5)), 2, 2);
  jitterGeometry(box, 0.12, () => rng.next());
  const stripe = col(GOBI.cliffShadow);
  g.appendGeometry(box, new THREE.Matrix4().makeTranslation(0, 0.29, 0), (_i, c, n) => {
    if (n.y > 0.5) return shade(mix(GOBI.hazardRockLight, GOBI.cliffLight, 0.25), drift(c));
    return c.y > 0.18 && c.y < 0.32 ? shade(stripe, drift(c)) : rockTone(n, c);
  });
  return g.build();
}

/** Eroded sandstone arch over one lane: tapered legs, banded strata, curved span. Slide under (clearance 0.66 m). */
function arch(): THREE.BufferGeometry {
  const g = new GeomBuilder();
  const rng = new Rng(23);
  const bands = [mix(GOBI.cliffRed, GOBI.hazardRock, 0.3), mix(GOBI.cliffLight, GOBI.hazardRockLight, 0.35), mix(GOBI.cliffRed, GOBI.hazardRock, 0.3), mix(GOBI.cliffRed, GOBI.cliffShadow, 0.5)];
  const tone = (c: THREE.Vector3, n: THREE.Vector3) => {
    const b = bands[Math.floor((c.y + 0.4) / 0.28) % bands.length];
    return shade(n.y > 0.5 ? mix(GOBI.cliffLight, GOBI.cliffPale, 0.3) : b, (n.y < -0.3 ? 0.7 : 1) * drift(c));
  };
  // Legs stay inside this lane (|x| <= 1.0) so they never clip a raptor in the next lane.
  for (const sx of [-1, 1]) {
    const leg = jitterGeometry(new THREE.CylinderGeometry(0.19, 0.28, 1.1, 7, 4), 0.05, () => rng.next());
    g.appendGeometry(leg, new THREE.Matrix4().makeTranslation(sx * 0.74, 0.55, 0), (_i, c, n) => tone(c, n));
  }
  // Curved span: a bent tube from leg top to leg top, thick in the middle.
  const span: THREE.Vector3[] = [];
  const radii: number[] = [];
  for (let k = 0; k <= 8; k++) {
    const t = k / 8;
    const x = (t - 0.5) * 1.62;
    span.push(new THREE.Vector3(x, 0.94 + 0.14 * Math.sin(Math.PI * t) + (rng.next() - 0.5) * 0.03, (rng.next() - 0.5) * 0.06));
    radii.push(0.28 + 0.05 * Math.sin(Math.PI * t));
  }
  const tmp = new GeomBuilder();
  addTube(tmp, span, radii, 8, () => col(GOBI.cliffRed));
  const tg = tmp.build();
  g.appendGeometry(tg, new THREE.Matrix4(), (_i, c, n) => tone(c, n));
  tg.dispose();
  return g.build();
}

/** Giant fallen rib bones braced across all lanes at head height: slide. */
function ribArch(): THREE.BufferGeometry {
  const g = new GeomBuilder();
  const rng = new Rng(31);
  const bone = col(0xcdbb9a);
  const boneD = col(0x8f6650);
  // Two support rocks.
  for (const sx of [-1, 1]) {
    const r = jitterGeometry(new THREE.IcosahedronGeometry(1, 0), 0.3, () => rng.next());
    g.appendGeometry(r, new THREE.Matrix4().compose(new THREE.Vector3(sx * 2.85, 0.45, 0), new THREE.Quaternion(), new THREE.Vector3(0.6, 0.6, 0.6)), (_i, c, n) => rockTone(n, c));
  }
  // Main bone shaft with knobbed ends.
  const y = 0.9;
  addTube(g, [new THREE.Vector3(-3.0, y + 0.08, 0), new THREE.Vector3(-1.5, y - 0.02, 0.05), new THREE.Vector3(0, y - 0.05, 0), new THREE.Vector3(1.5, y - 0.02, -0.05), new THREE.Vector3(3.0, y + 0.08, 0)], [0.26, 0.21, 0.2, 0.21, 0.26], 7, (s) => (s % 2 ? bone : shade(bone, 0.95)));
  // Darken downward-facing bone faces (shadowed underside).
  for (let i = 0; i < g.colors.length; i += 9) {
    const yA = g.pos[i + 1], yB = g.pos[i + 4], yC = g.pos[i + 7];
    if (yA + yB + yC < (y - 0.08) * 3 && yA > 0.5) for (let k = 0; k < 9; k++) g.colors[i + k] *= 0.62;
  }
  for (const sx of [-1, 1]) {
    const knob = jitterGeometry(new THREE.IcosahedronGeometry(1, 0), 0.2, () => rng.next());
    g.appendGeometry(knob, new THREE.Matrix4().compose(new THREE.Vector3(sx * 3.05, y + 0.1, 0), new THREE.Quaternion(), new THREE.Vector3(0.3, 0.26, 0.28)), () => shade(boneD, 1.1 + rng.next() * 0.1));
  }
  return g.build();
}

/**
 * A fork's sandstone fin: a tall, narrow wall of banded rock down the middle lane, from z = 0 back to
 * z = -len. Its prow is steep so it reads as a wall to go around (never something to jump).
 */
function spine(len: number): THREE.BufferGeometry {
  const g = new GeomBuilder();
  const rng = new Rng(Math.round(len * 10));
  const bands = [mix(GOBI.cliffRed, GOBI.hazardRock, 0.25), mix(GOBI.cliffLight, GOBI.hazardRockLight, 0.3), mix(GOBI.cliffRed, GOBI.cliffShadow, 0.35), mix(GOBI.cliffRed, GOBI.hazardRock, 0.25), mix(GOBI.cliffLight, GOBI.cliffPale, 0.25)];
  const top = mix(GOBI.cliffLight, GOBI.cliffPale, 0.35);
  const tone = (y: number, ny: number, z: number) => {
    const b = bands[Math.floor((y + 0.1 * Math.sin(z * 0.7)) / 0.36) % bands.length];
    return shade(ny > 0.55 ? top : b, (ny < -0.2 ? 0.72 : 1) * (1 + 0.04 * Math.sin(z * 1.9 + y * 3.1)));
  };
  // Cross-section, as (x fraction of half-width, y fraction of height), left to right over the top.
  const prof: [number, number][] = [[-1, 0], [-0.96, 0.35], [-0.82, 0.7], [-0.5, 0.94], [0, 1], [0.5, 0.94], [0.82, 0.7], [0.96, 0.35], [1, 0]];
  const N = Math.max(4, Math.round(len / 1.2));
  const ring = (k: number) => {
    const z = -(k / N) * len;
    const fromNose = (k / N) * len, fromTail = len - fromNose;
    const ramp = (m: number, over: number) => Math.min(1, m / over);
    const hScale = 0.55 + 0.45 * ramp(fromNose, 2.2) * ramp(fromTail, 2.2);
    const h = (2.15 + 0.35 * Math.sin(k * 0.53 + 1) + 0.2 * Math.sin(k * 1.37) + (rng.next() - 0.5) * 0.12) * hScale;
    const w = 0.56 * (0.8 + 0.2 * ramp(fromNose, 1.5) * ramp(fromTail, 1.5)) * (1 + (rng.next() - 0.5) * 0.08);
    return prof.map(([fx, fy]) => new THREE.Vector3(fx * w + (fy > 0.5 ? (rng.next() - 0.5) * 0.05 : 0), fy * h, z + (fy > 0 && fy < 1 ? (rng.next() - 0.5) * 0.15 : 0)));
  };
  let prev = ring(0);
  const first = prev;
  for (let k = 1; k <= N; k++) {
    const cur = ring(k);
    for (let j = 0; j < prof.length - 1; j++) {
      const a = prev[j], b = prev[j + 1], c = cur[j + 1], d = cur[j];
      const n = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(b, a), new THREE.Vector3().subVectors(d, a)).normalize();
      const mid = a.clone().add(c).multiplyScalar(0.5);
      g.quad(a, b, c, d, tone(mid.y, n.y, mid.z)); // outward-facing (n is the outward normal)
    }
    prev = cur;
  }
  // End caps: the prow facing the runner and the tail.
  const capCol = (y: number) => tone(y, 0, 0);
  const ctr0 = new THREE.Vector3(0, first[4].y * 0.45, 0.25), ctr1 = new THREE.Vector3(0, prev[4].y * 0.45, -len - 0.25);
  for (let j = 0; j < prof.length - 1; j++) {
    g.tri(first[j + 1], first[j], ctr0, capCol((first[j].y + first[j + 1].y) / 2)); // faces +z, toward the runner
    g.tri(prev[j], prev[j + 1], ctr1, capCol((prev[j].y + prev[j + 1].y) / 2));
  }
  return g.build();
}

const GEOMS: Partial<Record<HazardType, THREE.BufferGeometry>> = {};
const SPINES = new Map<number, THREE.BufferGeometry>();
const BOULDERS = ['boulderA', 'boulderB', 'boulderC'] as const;
export function hazardGeometry(type: HazardType, variant = 0, len = 0): THREE.BufferGeometry {
  if (type === 'spine') {
    const key = Math.round(len * 10);
    if (!SPINES.has(key)) SPINES.set(key, spine(len));
    return SPINES.get(key)!;
  }
  // Scanned rocks (Poly Haven, CC0) for boulders and ledges; arches and bones stay hand-built.
  if (type === 'boulder') return scenery(BOULDERS[variant % BOULDERS.length]);
  if (type === 'ledge') return scenery('ledge');
  if (type === 'ledgeWide') return scenery('ledgeWide');
  if (!GEOMS[type]) {
    GEOMS[type] =
      type === 'arch' ? arch() : ribArch();
  }
  return GEOMS[type]!;
}

export function createHazard(type: HazardType, variant = 0, len = 0): THREE.Mesh {
  const m = new THREE.Mesh(hazardGeometry(type, variant, len), MATS.hazard);
  if (type === 'boulder') m.rotation.y = (variant * 2.39996) % (Math.PI * 2); // golden-angle spin for variety
  m.castShadow = true;
  m.receiveShadow = true;
  m.name = type;
  return m;
}
