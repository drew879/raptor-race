import * as THREE from 'three';
import { GeomBuilder } from '../geom';
import { FOREST as F, col, mix, shade } from '../palette';
import { MATS } from '../materials';
import { Noise2D } from '../../core/noise';
import { Rng, hash2 } from '../../core/rng';
import { smoothstep } from '../../core/math';
import { CONFIG } from '../../game/config';
import { addRock, addTube } from './props';
import { lookAt } from '../look';
import { sectionAt, type Chunk, type TerrainLayout } from './terrain';

/**
 * Jehol Forest terrain: a dirt trail winding down through a forest of conifers, ginkgos and tree ferns, with
 * moss and leaf litter, ferns and horsetails (no grass: it hadn't spread yet), and clear streams that cross the
 * trail (the level's jump-across gaps). The valley walls further out are painted as forest canopy seen from
 * above. One merged mesh per chunk, one draw call, like the Gobi.
 */
const noise = new Noise2D(125);
const TRACK = CONFIG.world.trackHalfWidth;
const TRACK_COLS = [-TRACK, -2.05, -1.45, -0.95, -0.55, -0.18, 0.18, 0.55, 0.95, 1.45, 2.05, TRACK];
const SIDE_COLS = [TRACK, 3.1, 3.8, 4.7, 5.9, 7.4, 9.4, 12, 15.5, 20, 26, 34, 44, 57, 74, 96, 125];
const STREAM_HALF = 1.25; // a stream is two track rows wide
const WATER_Y = -0.12; // brimming: lower water hides behind the near bank from the chase camera
const BED_Y = -0.7;

/** Graphics version 3: the trail runs across a hillside. +1: the hill rises on the right (+x); -1: on the left.
 * It swaps sides every few hundred meters with a soft turn. */
export const uphillSide = (d: number) => Math.tanh(Math.sin(d / 110 + 0.9) * 3);
/** Version 3: how much of the hillside there is at course distance d (none at the crest or in the clearing). */
const hillsideAmount = (d: number) => smoothstep(18, 60, d) * (1 - smoothstep(985, 1030, d));
/** Version 3: stretches where the drop side opens onto the valley (few trees there). */
const openingAt = (d: number) => smoothstep(0.3, 0.75, Math.sin(d / 47 + 2.0));

/** Ground height beside the trail before streams cut it. Versions 1-2: a low berm, a gentle rise, then valley
 * walls on both sides. Version 3: a hillside: a bank on the uphill side, a long drop on the other. */
function forestBase(x: number, z: number): number {
  const ax = Math.abs(x);
  if (ax <= TRACK) return 0;
  const berm = smoothstep(TRACK, TRACK + 0.9, ax) * 0.16;
  const mounds = noise.fbm(x * 0.09, z * 0.09, 2) * 0.32 * smoothstep(TRACK, TRACK + 3, ax);
  const rise = smoothstep(TRACK + 0.8, 16, ax) * (1.1 + 0.6 * noise.get(x * 0.03, z * 0.02));
  const walls = smoothstep(16, 80, ax) * (9 + 9 * (noise.fbm(x * 0.012, z * 0.01, 3) * 0.5 + 0.5));
  const valley = rise + walls;
  if (!lookAt(3)) return berm + valley + mounds;
  const d = -z;
  const k = 0.5 + 0.5 * uphillSide(d) * Math.sign(x); // 1 on the uphill side, 0 on the drop side
  const up = smoothstep(TRACK + 0.5, TRACK + 3.2, ax) * (1.6 + 0.5 * noise.get(x * 0.2, z * 0.15)) + smoothstep(TRACK + 3, 28, ax) * 10 + smoothstep(28, 90, ax) * 14;
  const down = -(smoothstep(TRACK + 1.6, 13, ax) * 4.5 + smoothstep(13, 60, ax) * 26);
  const hill = up * k + down * (1 - k);
  return berm + mounds + valley + (hill - valley) * hillsideAmount(d);
}

/** Ground height beside the trail, with the streams cut across it (a stream only ever lowers the ground). */
export function forestHeight(x: number, z: number, streams: number[] = []): number {
  let h = forestBase(x, z);
  if (Math.abs(x) <= TRACK) return h;
  for (const d of streams) {
    const dz = Math.abs(-z - d);
    if (dz < 3.2 && h > BED_Y) h += (BED_Y - h) * (1 - smoothstep(STREAM_HALF * 0.9, 3.0, dz)) * (1 - smoothstep(30, 60, Math.abs(x)));
  }
  return h;
}

// ---------- Helpers: faces wound to face a hint direction (so FrontSide materials never cull them) ----------
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpN = new THREE.Vector3();
function otri(g: GeomBuilder, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, out: THREE.Vector3, color: THREE.Color) {
  tmpN.crossVectors(tmpA.subVectors(b, a), tmpB.subVectors(c, a));
  if (tmpN.dot(out) >= 0) g.tri(a, b, c, color);
  else g.tri(a, c, b, color);
}
function oquad(g: GeomBuilder, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, out: THREE.Vector3, color: THREE.Color, color2 = color) {
  tmpN.crossVectors(tmpA.subVectors(b, a), tmpB.subVectors(c, a));
  if (tmpN.dot(out) >= 0) g.quad(a, b, c, d, color, color2);
  else g.quad(d, c, b, a, color, color2);
}
const UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);

/** A tapered trunk (n-sided), slightly leaning. */
function trunk(g: GeomBuilder, base: THREE.Vector3, h: number, r0: number, r1: number, lean: THREE.Vector3, rng: Rng, c: THREE.Color, n = 6) {
  const top = base.clone().add(new THREE.Vector3(lean.x * h, h, lean.z * h));
  const rot = rng.range(0, 6.28);
  for (let k = 0; k < n; k++) {
    const a0 = rot + (k / n) * Math.PI * 2, a1 = rot + ((k + 1) / n) * Math.PI * 2;
    const p = (o: THREE.Vector3, r: number, a: number) => o.clone().add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    const out = new THREE.Vector3(Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2));
    const lit = 0.82 + 0.3 * Math.max(0, out.x * 0.6 + out.z * 0.5 + 0.2);
    // Bark: vertical bands of the base color and a darker groove.
    oquad(g, p(base, r0, a0), p(base, r0, a1), p(top, r1, a1), p(top, r1, a0), out, shade(k % 2 ? c : mix(F.bark, F.barkDark, 0.4), lit));
  }
  return top;
}

/** A cone skirt (apex up) with a shallow darker underside, for conifer tiers. */
function skirt(g: GeomBuilder, center: THREE.Vector3, r: number, h: number, n: number, rng: Rng, top: THREE.Color, side: THREE.Color, under: THREE.Color) {
  const apex = center.clone().add(new THREE.Vector3(0, h, 0));
  const below = center.clone().add(new THREE.Vector3(0, -h * 0.18, 0));
  const rot = rng.range(0, 6.28);
  const ring = Array.from({ length: n }, (_, k) => {
    const a = rot + (k / n) * Math.PI * 2, rr = r * rng.range(0.82, 1.12);
    return center.clone().add(new THREE.Vector3(Math.cos(a) * rr, rng.range(-0.15, 0.1) * h, Math.sin(a) * rr));
  });
  for (let k = 0; k < n; k++) {
    const p0 = ring[k], p1 = ring[(k + 1) % n];
    const mid = p0.clone().add(p1).multiplyScalar(0.5).sub(center).setY(0).normalize();
    const lit = Math.max(0, mid.x * 0.75 + mid.z * 0.45);
    otri(g, apex, p0, p1, mid.clone().setY(0.6), top.clone().lerp(side, 1 - lit).multiplyScalar(0.92 + 0.12 * rng.next()));
    otri(g, below, p1, p0, DOWN, under);
  }
}

export function addConifer(g: GeomBuilder, pos: THREE.Vector3, h: number, rng: Rng) {
  const lean = new THREE.Vector3(rng.range(-0.02, 0.02), 0, rng.range(-0.02, 0.02));
  const r0 = h * rng.range(0.022, 0.03);
  const top = trunk(g, pos.clone().add(new THREE.Vector3(0, -0.2, 0)), h * 0.92, r0, r0 * 0.35, lean, rng, col(F.bark));
  const tiers = rng.int(4, 6);
  const start = rng.range(0.32, 0.45);
  const dark = col(F.coniferDark), mid = col(F.conifer), light = col(F.coniferLight);
  for (let i = 0; i < tiers; i++) {
    const u = start + ((1 - start) * i) / tiers;
    const c = pos.clone().lerp(top, u);
    const r = h * 0.2 * (1 - u * 0.8) * rng.range(0.85, 1.1);
    skirt(g, c, r, h * (1 - start) / tiers * 1.7, 8, rng, i === tiers - 1 ? light : mid.clone().lerp(light, i / tiers * 0.6), dark, shade(dark, 0.7));
  }
}

/** A low-poly blob (an octahedron with jitter) for ginkgo crowns and bushes. */
function blob(g: GeomBuilder, c: THREE.Vector3, r: THREE.Vector3, rng: Rng, top: THREE.Color, bottom: THREE.Color) {
  const n = 7;
  const ring = Array.from({ length: n }, (_, k) => {
    const a = (k / n) * Math.PI * 2 + rng.range(-0.2, 0.2);
    return c.clone().add(new THREE.Vector3(Math.cos(a) * r.x * rng.range(0.85, 1.1), rng.range(-0.12, 0.12) * r.y, Math.sin(a) * r.z * rng.range(0.85, 1.1)));
  });
  const up = c.clone().add(new THREE.Vector3(rng.range(-0.1, 0.1) * r.x, r.y, 0)), dn = c.clone().add(new THREE.Vector3(0, -r.y * 0.7, 0));
  for (let k = 0; k < n; k++) {
    const p0 = ring[k], p1 = ring[(k + 1) % n];
    const out = p0.clone().add(p1).multiplyScalar(0.5).sub(c).normalize();
    const lit = Math.max(0, out.x * 0.7 + out.z * 0.4 + 0.3);
    otri(g, up, p0, p1, out.clone().add(UP), top.clone().multiplyScalar(0.85 + 0.25 * lit));
    otri(g, dn, p1, p0, out.clone().add(DOWN), bottom);
  }
}

export function addGinkgo(g: GeomBuilder, pos: THREE.Vector3, h: number, rng: Rng) {
  const top = trunk(g, pos.clone().add(new THREE.Vector3(0, -0.2, 0)), h * 0.75, h * 0.04, h * 0.018, new THREE.Vector3(rng.range(-0.05, 0.05), 0, rng.range(-0.05, 0.05)), rng, col(F.barkLight));
  const n = rng.int(5, 8);
  const gold = col(F.ginkgoLight), green = col(F.ginkgo), under = shade(mix(F.ginkgo, F.conifer, 0.5), 0.75);
  for (let i = 0; i < n; i++) {
    const a = rng.range(0, 6.28), d = rng.range(0.4, 1) * h * 0.2;
    const c = top.clone().add(new THREE.Vector3(Math.cos(a) * d, rng.range(-0.25, 0.15) * h, Math.sin(a) * d));
    const r = h * rng.range(0.12, 0.18);
    blob(g, c, new THREE.Vector3(r, r * 0.75, r), rng, green.clone().lerp(gold, rng.range(0.2, 0.8)), under);
  }
}

/** A tree fern: a thin dark trunk and a crown of long arching fronds. */
export function addTreeFern(g: GeomBuilder, pos: THREE.Vector3, h: number, rng: Rng) {
  const top = trunk(g, pos, h, 0.11, 0.08, new THREE.Vector3(rng.range(-0.06, 0.06), 0, rng.range(-0.06, 0.06)), rng, col(F.barkDark), 5);
  fronds(g, top, rng.int(8, 11), h * 0.55, 0.32, rng, col(F.fern), col(F.fernLight), 0.25);
}

/** A rosette of fronds: each a long tapering leaf that arches out and droops. */
function fronds(g: GeomBuilder, base: THREE.Vector3, n: number, len: number, w: number, rng: Rng, c0: THREE.Color, c1: THREE.Color, lift: number) {
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rng.range(-0.25, 0.25);
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const L = len * rng.range(0.8, 1.15);
    const pts = [0, 0.33, 0.66, 1].map((u) => base.clone().addScaledVector(dir, L * u).add(new THREE.Vector3(0, L * (lift * Math.sin(Math.PI * u * 0.9) - 0.35 * u * u), 0)));
    const widths = [0.25, 1, 0.75, 0].map((x) => x * w * L * 0.5);
    for (let i = 0; i < 3; i++) {
      const a0 = pts[i].clone().addScaledVector(side, widths[i]), b0 = pts[i].clone().addScaledVector(side, -widths[i]);
      const a1 = pts[i + 1].clone().addScaledVector(side, widths[i + 1]), b1 = pts[i + 1].clone().addScaledVector(side, -widths[i + 1]);
      const cc = c0.clone().lerp(c1, i / 2.5).multiplyScalar(0.9 + 0.15 * rng.next());
      oquad(g, a0, b0, b1, a1, UP, cc, shade(cc, 0.92));
      oquad(g, a0, b0, b1, a1, DOWN, shade(cc, 0.72)); // the underside, seen when the frond arches over
    }
  }
}

/** A ground fern clump (near-field detail that whips past). */
export function addFern(g: GeomBuilder, pos: THREE.Vector3, size: number, rng: Rng) {
  fronds(g, pos.clone().add(new THREE.Vector3(0, 0.02, 0)), rng.int(5, 8), size, 0.4, rng, col(F.fern), col(F.fernLight), 0.9);
}

/** Horsetails: a clump of thin jointed green stems (by the streams). */
export function addHorsetails(g: GeomBuilder, pos: THREE.Vector3, size: number, rng: Rng) {
  const n = rng.int(5, 9);
  for (let i = 0; i < n; i++) {
    const b = pos.clone().add(new THREE.Vector3(rng.range(-0.35, 0.35) * size, 0, rng.range(-0.35, 0.35) * size));
    const h = size * rng.range(0.7, 1.4);
    const lean = new THREE.Vector3(rng.range(-0.08, 0.08), 0, rng.range(-0.08, 0.08));
    const r = 0.025 * size;
    for (let s = 0; s < 3; s++) {
      const p0 = b.clone().add(new THREE.Vector3(lean.x * h * s / 3, h * s / 3, lean.z * h * s / 3));
      const p1 = b.clone().add(new THREE.Vector3(lean.x * h * (s + 1) / 3, h * (s + 1) / 3, lean.z * h * (s + 1) / 3));
      const c = s % 2 ? col(F.horsetail) : shade(col(F.horsetail), 0.75);
      for (let k = 0; k < 3; k++) {
        const a0 = (k / 3) * Math.PI * 2, a1 = ((k + 1) / 3) * Math.PI * 2;
        const o = new THREE.Vector3(Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2));
        oquad(g, p0.clone().add(new THREE.Vector3(Math.cos(a0) * r, 0, Math.sin(a0) * r)), p0.clone().add(new THREE.Vector3(Math.cos(a1) * r, 0, Math.sin(a1) * r)),
          p1.clone().add(new THREE.Vector3(Math.cos(a1) * r * 0.8, 0, Math.sin(a1) * r * 0.8)), p1.clone().add(new THREE.Vector3(Math.cos(a0) * r * 0.8, 0, Math.sin(a0) * r * 0.8)), o, c);
      }
    }
  }
}

/** A fallen log lying among the trees (scenery, not an obstacle). */
export function addLog(g: GeomBuilder, pos: THREE.Vector3, len: number, rotY: number, rng: Rng) {
  const dir = new THREE.Vector3(Math.cos(rotY), 0, Math.sin(rotY));
  const r = rng.range(0.25, 0.45);
  const a = pos.clone().addScaledVector(dir, -len / 2).add(new THREE.Vector3(0, r * 0.8, 0)), b = pos.clone().addScaledVector(dir, len / 2).add(new THREE.Vector3(0, r * 0.7, 0));
  const side = new THREE.Vector3(-dir.z, 0, dir.x);
  const n = 7;
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2;
    const off = (t: number) => side.clone().multiplyScalar(Math.cos(t) * r).add(new THREE.Vector3(0, Math.sin(t) * r, 0));
    const out = off((a0 + a1) / 2).normalize();
    const c = out.y > 0.5 ? col(F.moss) : k % 2 ? col(F.bark) : col(F.barkDark);
    oquad(g, a.clone().add(off(a0)), a.clone().add(off(a1)), b.clone().add(off(a1)), b.clone().add(off(a0)), out, c);
  }
  for (const [p, s] of [[a, -1], [b, 1]] as const) {
    const ring = Array.from({ length: n }, (_, k) => p.clone().add(side.clone().multiplyScalar(Math.cos((k / n) * 6.283) * r)).add(new THREE.Vector3(0, Math.sin((k / n) * 6.283) * r, 0)));
    for (let k = 0; k < n; k++) otri(g, p, ring[k], ring[(k + 1) % n], dir.clone().multiplyScalar(s), col(F.barkLight));
  }
}

/** Builds one 40 m chunk of Jehol Forest. */
export function buildForestChunk(index: number, layout?: TerrainLayout): Chunk {
  const L = CONFIG.world.chunkLength;
  const z0 = -index * L;
  const g = new GeomBuilder(false);
  const rng = new Rng(index * 6151 + 29);
  const streams = layout?.gullies ?? [];
  const nearStream = (zw: number) => streams.reduce((m, d) => Math.min(m, Math.abs(-zw - d)), Infinity);

  // ---------- The trail ----------
  const rowStepT = CONFIG.world.trackRow;
  const rowsT = Math.round(L / rowStepT);
  const cutRows = new Set<number>();
  for (const d of streams) { const g0 = Math.round(d / rowStepT); cutRows.add(g0 - 1); cutRows.add(g0); }
  const tp = (ci: number, ri: number) => {
    const gr = index * rowsT + ri;
    const x = TRACK_COLS[ci] + (ci > 0 && ci < TRACK_COLS.length - 1 ? (hash2(ci, gr, 3) - 0.5) * 0.12 : 0);
    return new THREE.Vector3(x, 0, z0 - ri * rowStepT + (hash2(ci, gr, 5) - 0.5) * 0.5);
  };
  for (let r = 0; r < rowsT; r++) {
    const gr = index * rowsT + r;
    if (cutRows.has(gr)) { streamRow(g, r, gr, tp, cutRows); continue; }
    for (let c = 0; c < TRACK_COLS.length - 1; c++) {
      const a = tp(c, r), b = tp(c + 1, r), cc = tp(c + 1, r + 1), d = tp(c, r + 1);
      const xm = (TRACK_COLS[c] + TRACK_COLS[c + 1]) / 2;
      const zm = (a.z + cc.z) / 2;
      // A ragged verge: moss and leaf litter creep in by different amounts along the trail.
      const creep = 0.45 * noise.get(Math.sign(xm) * 3.1, zm * 0.21) + 0.2 * noise.get(Math.sign(xm) * 7.7, zm * 0.9);
      const edge = smoothstep(1.85 - creep, 2.55 - creep * 0.5, Math.abs(xm));
      const patch = noise.get(xm * 0.7, zm * 0.12);
      // Dirt, darker in the worn lane centers, with drifts of leaf litter; moss and litter at the verge.
      let base = mix(F.track, F.trackDark, Math.max(0, patch) * 0.45);
      if (lookAt(3)) {
        // Three worn running strips (darker, packed) between lighter seams: the lanes read without walls.
        const lane = Math.min(Math.abs(xm + 1.5), Math.abs(xm), Math.abs(xm - 1.5));
        const worn = 1 - smoothstep(0.3, 0.5, lane);
        base = mix(F.track, F.trackDark, 0.08 + 0.34 * worn + Math.max(0, patch) * 0.12).lerp(col(0xc49a6e), 0.3 * (1 - worn));
      } else if (Math.abs(Math.abs(xm) - 1.5) < 0.25 || Math.abs(xm) < 0.2) base = base.lerp(col(F.trackSeam), 0.25);
      const drift = noise.get(xm * 1.3 + 9, zm * 0.33);
      if (drift > 0.42) base = base.lerp(col(F.litter), 0.55);
      else if (drift < -0.5) base = base.lerp(col(F.trackDark), 0.4);
      base = base.lerp(hash2(c, gr, 15) > 0.5 ? col(F.mossDark) : col(F.litterDark), edge * 0.75);
      const v1 = 0.95 + hash2(c, gr, 11) * 0.1, v2 = 0.95 + hash2(c, gr, 13) * 0.1;
      if ((c + r) % 2 === 0) g.quad(a, b, cc, d, shade(base, v1), shade(base, v2));
      else { g.tri(a, b, d, shade(base, v1)); g.tri(b, cc, d, shade(base, v2)); }
    }
  }

  // Version 3: low flat stones here and there along the seams between the lanes (flush with the dirt).
  if (lookAt(3)) for (const sx of [-0.75, 0.75]) {
    for (let dd = rng.range(1, 6); dd < L; dd += rng.range(4, 9)) {
      const z = z0 - dd;
      if (nearStream(z) < 2) continue;
      const c = new THREE.Vector3(sx + rng.range(-0.08, 0.08), 0.012, z), r = rng.range(0.1, 0.2);
      const n = 6, rot = rng.range(0, 6.28);
      const ring = Array.from({ length: n }, (_, k) => c.clone().add(new THREE.Vector3(Math.cos(rot + (k / n) * 6.283) * r * rng.range(0.8, 1.2), 0, Math.sin(rot + (k / n) * 6.283) * r * 0.75)));
      const tone = shade(mix(F.rock, 0xb8b4a2, 0.4), rng.range(0.9, 1.08));
      for (let k = 0; k < n; k++) otri(g, c.clone().setY(0.03), ring[k], ring[(k + 1) % n], UP, tone);
    }
  }

  // ---------- Forest floor and valley walls ----------
  const rowStep = 2.5, rows = Math.round(L / rowStep);
  const soft = sectionAt(layout, index * L + L / 2) === 'clearing'; // the mossy clearing at the bottom: soft and even
  for (const sgn of [-1, 1]) {
    const pt = (ci: number, ri: number) => {
      const gr = index * rows + ri;
      const w = ci > 0 && ci < SIDE_COLS.length - 1 ? (SIDE_COLS[ci + 1] - SIDE_COLS[ci - 1]) * 0.18 : 0;
      const x = sgn * (SIDE_COLS[ci] + (hash2(ci * sgn, gr, 7) - 0.5) * w);
      const z = z0 - ri * rowStep + (ci > 0 ? (hash2(ci * sgn, gr, 9) - 0.5) * 1.2 : 0);
      return new THREE.Vector3(x, forestHeight(x, z, streams), z);
    };
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < SIDE_COLS.length - 1; c++) {
        let a = pt(c, r), b = pt(c + 1, r), cc = pt(c + 1, r + 1), d = pt(c, r + 1);
        if (sgn < 0) { [a, b] = [b, a]; [cc, d] = [d, cc]; }
        const xm = Math.abs((a.x + cc.x) / 2), zm = (a.z + cc.z) / 2;
        const gr = index * rows + r;
        const n1 = noise.get(xm * 0.15 * sgn, zm * 0.15);
        // Near: moss and leaf litter. Far (the valley walls): forest canopy seen from above, mottled greens.
        const far = smoothstep(14, 30, xm);
        let base = soft
          ? mix(F.moss, n1 > 0.2 ? F.mossDark : F.mossLight, 0.25 + 0.2 * hash2(c * sgn, gr, 23))
          : n1 > 0.15 ? mix(F.litter, F.litterDark, hash2(c, gr, 21) * 0.6) : mix(F.moss, F.mossLight, hash2(c * sgn, gr, 23) * 0.6);
        base = base.lerp(n1 > 0 ? col(F.conifer) : col(F.coniferDark), far);
        if (far > 0.5 && hash2(c * sgn, gr, 25) > 0.8) base = base.lerp(col(F.ginkgo), 0.45);
        const wet = 1 - Math.min(1, nearStream(zm) / 3);
        if (wet > 0) base = base.lerp(col(F.mossDark), wet * 0.6);
        g.quad(a, b, cc, d, shade(base, 0.94 + hash2(c * sgn, gr, 27) * 0.12), shade(base, 0.94 + hash2(c * sgn, gr, 29) * 0.12));
      }
    }
  }

  // ---------- Streams beyond the trail: water ribbons and rocky banks ----------
  for (const d of streams) {
    if (-d > z0 + 3 || -d < z0 - L - 3) continue;
    for (const sgn of [-1, 1]) {
      const xs = [TRACK, 3.6, 5, 7, 10, 14, 19, 26, 34, 44];
      for (let k = 0; k < xs.length - 1; k++) {
        const x0 = sgn * xs[k], x1 = sgn * xs[k + 1];
        const wob = (x: number) => Math.sin(x * 0.35 + d) * 0.6;
        // Version 3: on the drop side the stream runs down the hillside (the water follows the ground down).
        const wy = (x: number) => (lookAt(3) ? Math.min(WATER_Y, forestBase(x, -d) - 0.12) : WATER_Y);
        const p = (x: number, dz: number) => new THREE.Vector3(x, wy(x), -d + dz + wob(x));
        oquad(g, p(x0, -STREAM_HALF * 0.8), p(x1, -STREAM_HALF * 0.8), p(x1, STREAM_HALF * 0.8), p(x0, STREAM_HALF * 0.8), UP, mix(F.water, F.waterDeep, 0.25 + 0.2 * hash2(k, sgn, 31)), col(F.water));
        if (k % 2 === 0) {
          const fz = rng.range(-0.6, 0.6);
          const lift = (q: THREE.Vector3) => q.setY(q.y + 0.01);
          oquad(g, lift(p(x0, fz - 0.05)), lift(p(x1, fz - 0.05)), lift(p(x1, fz + 0.05)), lift(p(x0, fz + 0.05)), UP, col(F.foam));
        }
      }
      for (let k = 0; k < 5; k++) {
        const x = sgn * rng.range(2.8, 9), z = -d + rng.range(-1.6, 1.6) * (rng.chance(0.5) ? 1 : -1);
        addRock(g, new THREE.Vector3(x, Math.max(WATER_Y, forestHeight(x, z, streams)) - 0.08, z), rng.range(0.2, 0.5), rng, mix(F.rock, F.rockMoss, rng.next()));
      }
      for (let k = 0; k < 3; k++) {
        const x = sgn * rng.range(3, 8), z = -d + (rng.chance(0.5) ? 1 : -1) * rng.range(1.8, 2.8);
        addHorsetails(g, new THREE.Vector3(x, forestHeight(x, z, streams) - 0.02, z), rng.range(0.7, 1.2), rng);
      }
    }
  }

  // ---------- Trees and plants ----------
  const dMid = index * L + L / 2;
  const kind = sectionAt(layout, dMid);
  const D = {
    hilltop: { conifer: 1, ginkgo: 1, treefern: 0, near: 0.5 },
    conifers: { conifer: 9, ginkgo: 1, treefern: 1, near: 1 },
    ginkgo: { conifer: 3, ginkgo: 6, treefern: 1, near: 0.9 },
    ferns: { conifer: 4, ginkgo: 1, treefern: 5, near: 1.3 },
    streamside: { conifer: 5, ginkgo: 2, treefern: 2, near: 1.1 },
    clearing: { conifer: 3, ginkgo: 2, treefern: 2, near: 2.2 },
  }[kind as 'hilltop'] ?? { conifer: 6, ginkgo: 2, treefern: 2, near: 1 };
  const ok = (x: number, z: number, clear = 2.6) => nearStream(z) > clear && Math.abs(x) > TRACK + 0.9;
  const at = (x: number, z: number) => new THREE.Vector3(x, forestHeight(x, z, streams), z);
  if (lookAt(3)) plantClusters(g, rng, kind, z0, L, ok, at);
  else for (const sgn of [-1, 1]) {
    // Near-field ferns and mossy rocks at the trail edge: they whip past and sell the speed.
    for (let dd = rng.range(0, 2); dd < L; dd += rng.range(1.6, 3.4) / D.near) {
      const x = sgn * rng.range(2.9, 4.4), z = z0 - dd;
      if (nearStream(z) < 1.8) continue;
      if (rng.chance(0.72)) addFern(g, at(x, z), rng.range(0.55, 1.0), rng);
      else addRock(g, at(x, z).add(new THREE.Vector3(0, -0.06, 0)), rng.range(0.14, 0.32), rng, mix(F.rock, F.rockMoss, 0.6));
    }
    for (let i = 0; i < D.conifer; i++) {
      const x = sgn * (i < D.conifer / 2 ? rng.range(4.2, 10) : rng.range(10, 24)), z = z0 - rng.range(0, L);
      if (ok(x, z)) addConifer(g, at(x, z), rng.range(11, 22), rng);
    }
    for (let i = 0; i < D.ginkgo; i++) {
      const x = sgn * rng.range(4.6, 16), z = z0 - rng.range(0, L);
      if (ok(x, z)) addGinkgo(g, at(x, z), rng.range(7, 12), rng);
    }
    for (let i = 0; i < D.treefern; i++) {
      const x = sgn * rng.range(3.8, 11), z = z0 - rng.range(0, L);
      if (ok(x, z, 2)) addTreeFern(g, at(x, z), rng.range(2.2, 3.6), rng);
    }
    for (let i = 0; i < Math.round(4 * D.near); i++) {
      const x = sgn * rng.range(4.5, 14), z = z0 - rng.range(0, L);
      if (ok(x, z, 2)) addFern(g, at(x, z), rng.range(0.7, 1.3), rng);
    }
    if (rng.chance(0.35)) {
      const x = sgn * rng.range(5, 12), z = z0 - rng.range(4, L - 4);
      if (ok(x, z, 4)) addLog(g, at(x, z), rng.range(3, 6), rng.range(-0.6, 0.6) + (sgn > 0 ? 0 : Math.PI), rng);
    }
  }

  const mesh = new THREE.Mesh(g.build(), MATS.forest);
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.name = `forest-chunk-${index}`;
  return { index, mesh };
}

/**
 * Graphics version 3: vegetation in composed clusters with gaps between them. Each cluster is a big tree with roots
 * running into the ground, ferns and a rock or two around its foot, and a patch of shade under it; near the trail
 * the clusters frame it, further out a second row, then scattered trees into the distance. On the hillside's drop
 * side, some stretches open onto the valley (few trees there).
 */
function plantClusters(g: GeomBuilder, rng: Rng, kind: string, z0: number, L: number, ok: (x: number, z: number, clear?: number) => boolean, at: (x: number, z: number) => THREE.Vector3) {
  const W: Record<string, [number, number, number]> = { // conifer, ginkgo, tree fern weights
    hilltop: [1, 1, 0], conifers: [8, 1, 1], ginkgo: [3, 6, 1], ferns: [4, 1, 5], streamside: [6, 2, 2], clearing: [2, 2, 1],
  };
  const [wc, wg, wf] = W[kind] ?? [6, 2, 2];
  const pick = () => { const r = rng.range(0, wc + wg + wf); return r < wc ? 'conifer' : r < wc + wg ? 'ginkgo' : 'treefern'; };
  const sparse = kind === 'hilltop' || kind === 'clearing' ? 0.55 : 1;
  for (const sgn of [-1, 1]) {
    const dropSide = (z: number) => uphillSide(-z) * sgn < 0 && hillsideAmount(-z) > 0.5;
    const rows: [number, number, number, number][] = [[3.9, 6.2, 7, 15], [8, 13, 9, 17]]; // x from, x to, spacing from, to
    for (const [xa, xb, sa, sb] of rows) {
      for (let dd = rng.range(0, sa); dd < L; dd += rng.range(sa, sb) / sparse) {
        const z = z0 - dd, x = sgn * rng.range(xa, xb);
        if (!ok(x, z, 3)) continue;
        if (dropSide(z) && openingAt(-z) > 0.5 && rng.chance(0.8)) continue; // a view onto the valley
        cluster(g, rng, at, pick(), x, z, sgn);
      }
    }
    // Scattered trees further out, into the distance.
    const far = Math.round((kind === 'conifers' ? 6 : 4) * sparse);
    for (let i = 0; i < far; i++) {
      const x = sgn * rng.range(14, 26), z = z0 - rng.range(0, L);
      if (!ok(x, z) || (dropSide(z) && openingAt(-z) > 0.4)) continue;
      const t = pick();
      if (t === 'ginkgo') addGinkgo(g, at(x, z), rng.range(7, 12), rng);
      else addConifer(g, at(x, z), rng.range(12, 22), rng);
    }
    // A few small ferns at the trail edge between clusters, so the verge isn't bare.
    for (let dd = rng.range(0, 4); dd < L; dd += rng.range(3.5, 7)) {
      const x = sgn * rng.range(2.9, 3.6), z = z0 - dd;
      if (ok(x, z, 1.8)) addFern(g, at(x, z), rng.range(0.45, 0.8), rng);
    }
  }
}

/** One planted group: a tree rooted into the ground, ferns and rocks around its foot, shade under it. */
function cluster(g: GeomBuilder, rng: Rng, at: (x: number, z: number) => THREE.Vector3, type: string, x: number, z: number, sgn: number) {
  const base = at(x, z);
  // Shade under the group: a soft irregular patch of dark litter and moss on the ground.
  const R = type === 'treefern' ? 1.4 : rng.range(1.8, 2.6);
  const n = 9;
  const ring = Array.from({ length: n }, (_, k) => {
    const a = (k / n) * Math.PI * 2, rr = R * rng.range(0.75, 1.15);
    const px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr;
    return at(px, pz).add(new THREE.Vector3(0, 0.035, 0));
  });
  const ctr = base.clone().add(new THREE.Vector3(0, 0.04, 0));
  const shadeCol = mix(F.litterDark, F.mossDark, 0.45).multiplyScalar(0.82);
  for (let k = 0; k < n; k++) otri(g, ctr, ring[k], ring[(k + 1) % n], UP, shadeCol);
  // The tree, with roots running out into the ground.
  if (type === 'treefern') addTreeFern(g, base, rng.range(2.4, 3.8), rng);
  else {
    const h = type === 'ginkgo' ? rng.range(8, 13) : rng.range(13, 24);
    if (type === 'ginkgo') addGinkgo(g, base, h, rng); else addConifer(g, base, h, rng);
    const r0 = type === 'ginkgo' ? h * 0.04 : h * 0.026;
    for (let k = 0; k < 4; k++) {
      const a = rng.range(0, 6.28) + k * 1.57;
      const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const p0 = base.clone().add(dir.clone().multiplyScalar(r0 * 0.6)).add(new THREE.Vector3(0, 0.35, 0));
      const tipXZ = base.clone().add(dir.clone().multiplyScalar(r0 + rng.range(0.7, 1.2)));
      const p2 = at(tipXZ.x, tipXZ.z).add(new THREE.Vector3(0, -0.04, 0));
      const p1 = p0.clone().lerp(p2, 0.5).add(new THREE.Vector3(0, 0.06, 0));
      addTube(g, [p0, p1, p2], [r0 * 0.35, r0 * 0.2, 0.02], 5, () => col(F.bark));
    }
  }
  // Ferns around its foot (more on the trail side), and a mossy rock or two.
  for (let k = 0; k < rng.int(2, 4); k++) {
    const a = rng.range(0, 6.28), rr = rng.range(0.9, 1.7);
    const fx = x + Math.cos(a) * rr - sgn * rng.range(0, 0.6), fz = z + Math.sin(a) * rr;
    if (Math.abs(fx) > TRACK + 0.3) addFern(g, at(fx, fz), rng.range(0.6, 1.15), rng);
  }
  for (let k = 0; k < rng.int(0, 2); k++) {
    const a = rng.range(0, 6.28), rr = rng.range(0.8, 1.6);
    const rx = x + Math.cos(a) * rr, rz = z + Math.sin(a) * rr;
    if (Math.abs(rx) > TRACK + 0.4) addRock(g, at(rx, rz).add(new THREE.Vector3(0, -0.05, 0)), rng.range(0.18, 0.4), rng, mix(F.rock, F.rockMoss, 0.65));
  }
}

/** A track row turned into a stream: soil and rock walls, a pebbly bed, and the water surface. */
function streamRow(g: GeomBuilder, r: number, gr: number, tp: (ci: number, ri: number) => THREE.Vector3, cut: Set<number>) {
  const first = !cut.has(gr - 1), last = !cut.has(gr + 1);
  const n = TRACK_COLS.length;
  const near = Array.from({ length: n }, (_, c) => tp(c, r));
  const far = Array.from({ length: n }, (_, c) => tp(c, r + 1));
  const down = (p: THREE.Vector3, dz: number) => new THREE.Vector3(p.x, BED_Y, p.z + dz);
  const nb = near.map((p) => down(p, first ? -0.18 : 0));
  const fb = far.map((p) => down(p, last ? 0.18 : 0));
  const wall = (t0: THREE.Vector3, t1: THREE.Vector3, b0: THREE.Vector3, b1: THREE.Vector3, out: THREE.Vector3) => {
    const lv = [0, -0.12, BED_Y];
    for (let k = 0; k < 2; k++) {
      const u0 = -lv[k] / -BED_Y, u1 = -lv[k + 1] / -BED_Y;
      const a = t0.clone().lerp(b0, u0), b = t1.clone().lerp(b1, u0), c = t1.clone().lerp(b1, u1), d = t0.clone().lerp(b0, u1);
      oquad(g, a, b, c, d, out, shade(k === 0 ? col(F.mossDark) : mix(F.litterDark, F.rock, 0.4), 0.95 + hash2(gr, k, 31) * 0.08));
    }
  };
  for (let c = 0; c < n - 1; c++) {
    oquad(g, nb[c], nb[c + 1], fb[c + 1], fb[c], UP, shade(mix(F.rock, F.litterDark, 0.5), 0.9 + hash2(c, gr, 33) * 0.12));
    const w = (p: THREE.Vector3) => p.clone().setY(WATER_Y);
    oquad(g, w(nb[c]), w(nb[c + 1]), w(fb[c + 1]), w(fb[c]), UP, mix(F.water, F.waterDeep, (c % 3) * 0.12), col(F.water));
    if (first) wall(near[c], near[c + 1], nb[c], nb[c + 1], new THREE.Vector3(0, 0, -1));
    if (last) wall(far[c], far[c + 1], fb[c], fb[c + 1], new THREE.Vector3(0, 0, 1));
  }
  // Foam along both banks and a streak down the middle, so it reads as running water from far up the trail.
  const foam = (row: THREE.Vector3[], dz: number, w: number) => {
    for (let c = 0; c < n - 1; c++) {
      if ((c + gr) % 4 === 3) continue; // broken, not a painted line
      const a = row[c].clone().setY(WATER_Y + 0.01), b = row[c + 1].clone().setY(WATER_Y + 0.01);
      a.z += dz; b.z += dz;
      oquad(g, a, b, b.clone().add(new THREE.Vector3(0, 0, -w)), a.clone().add(new THREE.Vector3(0, 0, -w)), UP, col(F.foam));
    }
  };
  if (first) foam(nb, -0.02, 0.16);
  if (last) foam(fb, 0.18, 0.16);
  // Stones half in the water along the far bank (below the trail, never in the way).
  if (last) for (let c = 0; c < n - 1; c += 2) {
    const p = fb[c].clone().lerp(fb[c + 1], 0.5).setY(WATER_Y - 0.05).add(new THREE.Vector3(0, 0, 0.3));
    const r = 0.13 + hash2(c, gr, 37) * 0.08;
    for (let k = 0; k < 6; k++) {
      const a0 = (k / 6) * Math.PI * 2, a1 = ((k + 1) / 6) * Math.PI * 2;
      const q = (a: number) => p.clone().add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r * 0.8));
      otri(g, p.clone().add(new THREE.Vector3(0, r * 0.7, 0)), q(a0), q(a1), UP, shade(mix(F.rock, F.rockMoss, 0.4), 0.9 + 0.2 * hash2(c, k, 39)));
    }
  }
}
