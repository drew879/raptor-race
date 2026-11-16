import * as THREE from 'three';
import { GeomBuilder, jitterGeometry } from '../geom';
import { GOBI, col, mix, shade } from '../palette';
import { MATS } from '../materials';
import { Rng } from '../../core/rng';
import { addTube } from './props';
import { scenery } from './scenery';
import { forestHazardGeometry } from './forest-hazards';
import { lookAt } from '../look';

import type { HazardType } from '../../game/types';
export type { HazardType };

/** Smooth, position-based tonal drift (no per-face randomness, so no checkerboard "quilt"). */
const drift = (c: THREE.Vector3) => 1 + 0.05 * Math.sin(c.x * 4.1 + c.y * 3.3 + c.z * 2.7) + 0.03 * Math.sin(c.x * 9.7 - c.z * 7.1);
const rockTone = (n: THREE.Vector3, c: THREE.Vector3, base: number = GOBI.hazardRock, light: number = GOBI.hazardRockLight) => {
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

/**
 * A tall sandstone overhang across one lane with a low, dark tunnel under it: slide (clearance 0.66 m). Owner
 * playtest 5: the old arch's thin span looked like something you could hop over, so the rock now rises well
 * above any jump and only the gap at the bottom is open.
 */
function arch(): THREE.BufferGeometry {
  const g = new GeomBuilder();
  const rng = new Rng(23);
  const bands = [mix(GOBI.cliffRed, GOBI.hazardRock, 0.3), mix(GOBI.cliffLight, GOBI.hazardRockLight, 0.35), mix(GOBI.cliffRed, GOBI.hazardRock, 0.3), mix(GOBI.cliffRed, GOBI.cliffShadow, 0.5)];
  const band = (y: number) => bands[Math.floor((y + 0.4) / 0.32) % bands.length];
  const top = mix(GOBI.cliffLight, GOBI.cliffPale, 0.3);
  const tunnel = shade(col(GOBI.cliffShadow), 0.55); // the open gap reads dark
  // Slices across the lane (x): the rock reaches the ground at the edges (|x| <= 1.0 keeps it in its lane),
  // and the underside arches from 0.68 m at the sides to 0.84 m in the middle.
  const N = 10, W = 1.0, D = 0.4;
  const xs = Array.from({ length: N + 1 }, (_, i) => -W + (2 * W * i) / N);
  const under = (x: number) => (Math.abs(x) > 0.76 ? 0 : 0.68 + 0.16 * Math.cos((Math.PI * x) / 1.52));
  const slices = xs.map((x) => {
    const yb = under(x), yt = 2.3 + 0.18 * Math.sin(x * 2.7 + 1) + (rng.next() - 0.5) * 0.12;
    const d = D * (1 + (rng.next() - 0.5) * 0.08);
    return [new THREE.Vector3(x, yb, d), new THREE.Vector3(x, yt - 0.08, d * 0.9), new THREE.Vector3(x, yt, 0), new THREE.Vector3(x, yt - 0.08, -d * 0.9), new THREE.Vector3(x, yb, -d)];
  });
  for (let i = 0; i < N; i++) {
    const a = slices[i], b = slices[i + 1];
    // Front and back faces, split into strata bands.
    for (const [j0, j1, out] of [[0, 1, 1], [3, 4, -1]] as const) {
      const lv = [0, 0.66, 1.0, 1.35, 1.7, 2.05, 9];
      for (let k = 0; k < lv.length - 1; k++) {
        const clip = (p: THREE.Vector3, q: THREE.Vector3, y: number) => (q.y === p.y ? p.clone() : p.clone().lerp(q, Math.min(1, Math.max(0, (y - p.y) / (q.y - p.y)))));
        const lo = Math.max(lv[k], Math.min(a[j0].y, b[j0].y)), hi = Math.min(lv[k + 1], Math.max(a[j1].y, b[j1].y));
        if (hi <= lo) continue;
        const p0 = clip(a[j0], a[j1], Math.max(lv[k], a[j0].y)), p1 = clip(b[j0], b[j1], Math.max(lv[k], b[j0].y));
        const p2 = clip(b[j0], b[j1], Math.min(lv[k + 1], b[j1].y)), p3 = clip(a[j0], a[j1], Math.min(lv[k + 1], a[j1].y));
        if (out > 0) face(g, p0, p1, p2, p3, new THREE.Vector3(0, 0, 1), shade(band((p0.y + p2.y) / 2), drift(p0)));
        else face(g, p0, p1, p2, p3, new THREE.Vector3(0, 0, -1), shade(band((p0.y + p2.y) / 2), 0.85 * drift(p0)));
      }
    }
    face(g, a[1], b[1], b[2], a[2], new THREE.Vector3(0, 1, 0.3), shade(top, drift(a[1])));
    face(g, a[2], b[2], b[3], a[3], new THREE.Vector3(0, 1, -0.3), shade(top, 0.95 * drift(a[2])));
    if (a[0].y > 0.01 || b[0].y > 0.01) face(g, a[0], b[0], b[4], a[4], new THREE.Vector3(0, -1, 0), tunnel);
  }
  // End caps.
  for (const [sl, sx] of [[slices[0], -1], [slices[N], 1]] as const) {
    const c = new THREE.Vector3(sl[0].x, 1.2, 0);
    for (let j = 0; j < sl.length; j++) {
      const p = sl[j], q = sl[(j + 1) % sl.length];
      const n = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(q, p), new THREE.Vector3().subVectors(c, p));
      const colr = shade(band((p.y + q.y) / 2), 0.9);
      if (n.x * sx >= 0) g.tri(p, q, c, colr); else g.tri(q, p, c, colr);
    }
  }
  // Rubble at its feet.
  for (let k = 0; k < 5; k++) {
    const r = rng.range(0.08, 0.16);
    const p = new THREE.Vector3(rng.chance(0.5) ? rng.range(-1.05, -0.8) : rng.range(0.8, 1.05), r * 0.4, rng.range(-0.55, 0.55));
    g.appendGeometry(jitterGeometry(new THREE.IcosahedronGeometry(1, 0), 0.25, () => rng.next()), new THREE.Matrix4().compose(p, new THREE.Quaternion(), new THREE.Vector3(r, r * 0.7, r)), (_i, c, n) => rockTone(n, c));
  }
  return g.build();
}

/**
 * A fallen giant's ribcage braced across all three lanes: a spine high overhead on two tall rocks, ribs hanging
 * down to just above sliding height. Owner playtest 5: the old single bone at hip height looked jumpable.
 */
function ribArch(): THREE.BufferGeometry {
  const g = new GeomBuilder();
  const rng = new Rng(31);
  const bone = col(0xcdbb9a);
  const boneD = col(0x8f6650);
  // Two tall support rocks just off the trail.
  for (const sx of [-1, 1]) {
    const r = jitterGeometry(new THREE.IcosahedronGeometry(1, 1), 0.18, () => rng.next());
    g.appendGeometry(r, new THREE.Matrix4().compose(new THREE.Vector3(sx * 2.95, 1.15, 0), new THREE.Quaternion(), new THREE.Vector3(0.62, 1.35, 0.6)), (_i, c, n) => rockTone(n, c));
  }
  // The spine: a thick bone beam with vertebra knobs, sagging slightly in the middle.
  const Y = 2.35;
  const beam = [-3.0, -1.5, 0, 1.5, 3.0].map((x) => new THREE.Vector3(x, Y - 0.12 * Math.cos((Math.PI * x) / 6), 0));
  addTube(g, beam, [0.2, 0.17, 0.16, 0.17, 0.2], 8, (s2) => (s2 % 2 ? bone : shade(bone, 0.94)));
  for (let x = -2.7; x <= 2.71; x += 0.45) {
    const k = jitterGeometry(new THREE.IcosahedronGeometry(1, 0), 0.15, () => rng.next());
    g.appendGeometry(k, new THREE.Matrix4().compose(new THREE.Vector3(x, Y + 0.12 - 0.12 * Math.cos((Math.PI * x) / 6), 0), new THREE.Quaternion(), new THREE.Vector3(0.13, 0.17, 0.13)), () => shade(bone, 1.03));
  }
  // Ribs hang down from the spine and curve back, ending just above sliding height (0.78 m).
  for (let x = -2.45, i = 0; x <= 2.46; x += 0.49, i++) {
    const top = new THREE.Vector3(x, Y - 0.12 * Math.cos((Math.PI * x) / 6) - 0.1, 0);
    const z = (i % 2 ? 1 : -1) * 0.08;
    const tip = 0.78 + (i % 3) * 0.05;
    addTube(g, [top, new THREE.Vector3(x + 0.06, 1.75, z + 0.1), new THREE.Vector3(x + 0.1, 1.15, z + 0.14), new THREE.Vector3(x + 0.06, tip, z + 0.08)], [0.075, 0.06, 0.045, 0.025], 5, () => (i % 2 ? bone : shade(bone, 0.93)));
  }
  // Darken downward-facing bone faces (shadowed undersides).
  for (let i = 0; i < g.colors.length; i += 9) {
    const yA = g.pos[i + 1], yB = g.pos[i + 4], yC = g.pos[i + 7];
    if (yA > 2.2 && yA + yB + yC < (Y - 0.05) * 3) for (let k = 0; k < 9; k++) g.colors[i + k] *= 0.7;
  }
  for (const sx of [-1, 1]) {
    const knob = jitterGeometry(new THREE.IcosahedronGeometry(1, 0), 0.2, () => rng.next());
    g.appendGeometry(knob, new THREE.Matrix4().compose(new THREE.Vector3(sx * 3.05, Y + 0.1, 0), new THREE.Quaternion(), new THREE.Vector3(0.3, 0.26, 0.28)), () => shade(boneD, 1.1 + rng.next() * 0.1));
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

/** Builds a quad whose winding faces `outward`, whatever order the corners come in. */
function face(g: GeomBuilder, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, outward: THREE.Vector3, color: THREE.Color) {
  const n = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(b, a), new THREE.Vector3().subVectors(c, a));
  if (n.dot(outward) >= 0) g.quad(a, b, c, d, color);
  else g.quad(d, c, b, a, color);
}

/**
 * Flat sandstone slab across one whole lane (a low wall to jump): crisp pale top, banded front, dark strata
 * line. Built to read nothing like a boulder (owner playtest: rock ledges looked like boulders and didn't
 * look like they blocked the lane).
 */
function slab(): THREE.BufferGeometry {
  const g = new GeomBuilder();
  const rng = new Rng(41);
  const W = 0.74, N = 5;
  // Cross-section (z, y), front (+z, facing the runner) to back, over the top.
  const prof: [number, number][] = [[0.38, 0], [0.38, 0.16], [0.375, 0.25], [0.355, 0.44], [0.29, 0.5], [-0.29, 0.52], [-0.35, 0.46], [-0.38, 0]];
  const bandCol = (y: number, front: boolean) => {
    if (y > 0.47) return shade(mix(GOBI.cliffPale, GOBI.sandLight, 0.45), 1.04);
    if (!front) return shade(col(GOBI.cliffRed), 0.82);
    if (y < 0.16) return shade(col(GOBI.cliffRed), 0.96);
    if (y < 0.25) return col(GOBI.cliffShadow);
    return col(GOBI.cliffLight);
  };
  const slices = Array.from({ length: N + 1 }, (_, i) => {
    const x = -W + (2 * W * i) / N;
    const lift = i === 0 || i === N ? -0.04 : (rng.next() - 0.5) * 0.04;
    return prof.map(([z, y]) => new THREE.Vector3(x, y > 0.4 ? y + lift : y, z + (y > 0 ? (rng.next() - 0.5) * 0.02 : 0)));
  });
  for (let i = 0; i < N; i++) for (let j = 0; j < prof.length - 1; j++) {
    const a = slices[i][j], b = slices[i + 1][j], c = slices[i + 1][j + 1], d = slices[i][j + 1];
    const zMid = (prof[j][0] + prof[j + 1][0]) / 2, yMid = (prof[j][1] + prof[j + 1][1]) / 2;
    const out = new THREE.Vector3(0, yMid > 0.47 ? 1 : 0, yMid > 0.47 ? 0 : Math.sign(zMid));
    face(g, a, b, c, d, out, shade(bandCol(yMid, zMid > 0), 1 + (rng.next() - 0.5) * 0.05));
  }
  // End caps, banded like the front.
  for (const [i, sx] of [[0, -1], [N, 1]] as const) {
    const ring = slices[i];
    const ctr = new THREE.Vector3(ring[0].x, 0.25, 0);
    for (let j = 0; j < prof.length - 1; j++) {
      const a = ring[j], b = ring[j + 1];
      const n = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(b, a), new THREE.Vector3().subVectors(ctr, a));
      const c = bandCol((a.y + b.y) / 2, true);
      if (n.x * sx >= 0) g.tri(a, b, ctr, c); else g.tri(b, a, ctr, c);
    }
  }
  // Crumbs at its foot.
  for (let k = 0; k < 6; k++) {
    const r = rng.range(0.05, 0.11);
    const p = new THREE.Vector3(rng.range(-0.8, 0.8), r * 0.4, rng.chance(0.5) ? rng.range(0.42, 0.6) : rng.range(-0.6, -0.42));
    g.appendGeometry(jitterGeometry(new THREE.IcosahedronGeometry(1, 0), 0.25, () => rng.next()), new THREE.Matrix4().compose(p, new THREE.Quaternion(), new THREE.Vector3(r, r * 0.7, r)), (_i, c, n) => rockTone(n, c, GOBI.cliffRed, GOBI.cliffLight));
  }
  return g.build();
}

const GEOMS: Partial<Record<HazardType, THREE.BufferGeometry>> = {};
const EMPTY = new THREE.BufferGeometry();
const SPINES = new Map<number, THREE.BufferGeometry>();
const BOULDERS = ['boulderA', 'boulderB', 'boulderC'] as const;
export function hazardGeometry(type: HazardType, variant = 0, len = 0): THREE.BufferGeometry {
  if (type === 'spine') {
    const key = Math.round(len * 10);
    if (!SPINES.has(key)) SPINES.set(key, spine(len));
    return SPINES.get(key)!;
  }
  // Scanned rocks (Poly Haven, CC0) for boulders; slabs, arches and bones are hand-built.
  if (type === 'boulder') return scenery(BOULDERS[variant % BOULDERS.length]);
  if (type === 'gully') return EMPTY; // cut into the terrain itself (see terrain.ts)
  if (type === 'nester' || type === 'wanderer' || type === 'pterosaur') return EMPTY; // animated creatures, drawn by the game page
  if (!GEOMS[type]) {
    GEOMS[type] = type === 'ledge' ? slab() : type === 'arch' ? arch() : ribArch();
  }
  return GEOMS[type]!;
}

export function createHazard(type: HazardType, variant = 0, len = 0, biome: 'gobi' | 'forest' = 'gobi'): THREE.Mesh {
  const forest = biome === 'forest';
  const m = new THREE.Mesh(forest ? forestHazardGeometry(type, variant, len) : hazardGeometry(type, variant, len), forest && lookAt(3) ? MATS.hazardSmooth : MATS.hazard);
  if (type === 'boulder') m.rotation.y = (variant * 2.39996) % (Math.PI * 2); // golden-angle spin for variety
  m.castShadow = true;
  m.receiveShadow = true;
  m.name = type;
  return m;
}
