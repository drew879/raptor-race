import * as THREE from 'three';
import { GeomBuilder } from '../geom';
import { GOBI, col, mix, shade } from '../palette';
import { MATS } from '../materials';
import { Noise2D } from '../../core/noise';
import { Rng, hash2 } from '../../core/rng';
import { smoothstep } from '../../core/math';
import { CONFIG } from '../../game/config';
import { addBush, addHoodoo, addMesa, addRibcage, addRock, addScanBush, addScanCliff, addScanRock, addScanTree, addSkull, addVertebrae } from './props';

const noise = new Noise2D(1923);
const TRACK = CONFIG.world.trackHalfWidth;

/** Ground height at world (x, z). Track is flat at 0; dunes rise with distance from it. */
export function groundHeight(x: number, z: number): number {
  const ax = Math.abs(x);
  if (ax <= TRACK) return 0;
  const lip = smoothstep(TRACK, TRACK + 0.6, ax) * 0.12;
  const rise = smoothstep(TRACK + 0.8, 16, ax);
  // Dunes: long crests running diagonally, plus broad swells.
  const u = x * 0.045 + z * 0.018;
  const v = z * 0.03 - x * 0.012;
  const ridge = 1 - Math.abs(noise.get(u, v));
  const swell = noise.fbm(x * 0.012, z * 0.01, 3) * 0.5 + 0.5;
  const far = smoothstep(20, 70, ax);
  return lip + rise * (ridge * ridge * (1.6 + far * 4.5) + swell * (0.8 + far * 6));
}

// Column x-positions for the side terrain (one side, outward). Wider cells further out.
const SIDE_COLS = [TRACK, 3.2, 4.2, 5.5, 7.2, 9.4, 12.2, 15.8, 20.5, 26.5, 34, 43, 54, 67, 82, 100, 125];
const TRACK_COLS = [-TRACK, -2.05, -1.45, -0.95, -0.55, -0.18, 0.18, 0.55, 0.95, 1.45, 2.05, TRACK];

import type { SectionKind } from '../../game/level';
export type { SectionKind };
/** Level-specific terrain features, known up front so chunks can be pregenerated with them. */
export interface TerrainLayout {
  /** Gully centers (world meters along the course, on a track-row boundary): each cuts two rows out of the track. */
  gullies: number[];
  /** Landmark stretches, each running from `from` (world meters) to the next one. */
  sections?: { from: number; kind: SectionKind }[];
}
export function sectionAt(layout: TerrainLayout | undefined, d: number): SectionKind {
  let k: SectionKind = 'dunes';
  for (const s of layout?.sections ?? []) if (d >= s.from) k = s.kind;
  return k;
}
const GULLY_DEPTH = 0.75;

export interface Chunk {
  index: number;
  mesh: THREE.Mesh;
}

/** Builds one 40 m world chunk: track, dune terrain, scenery. One merged mesh, one draw call. */
export function buildChunk(index: number, opts: { mesas?: boolean; layout?: TerrainLayout } = {}): Chunk {
  const L = CONFIG.world.chunkLength;
  const z0 = -index * L; // near edge
  const g = new GeomBuilder(false);
  const rng = new Rng(index * 7919 + 17);

  // ---------- Track ----------
  const rowStepT = CONFIG.world.trackRow;
  const rowsT = Math.round(L / rowStepT);
  // Gullies: each removes the two track rows either side of its center and gets walls and a floor instead.
  const cutRows = new Set<number>();
  for (const d of opts.layout?.gullies ?? []) { const g0 = Math.round(d / rowStepT); cutRows.add(g0 - 1); cutRows.add(g0); }
  const gullyNear = (zWorld: number) => {
    let best = Infinity;
    for (const d of opts.layout?.gullies ?? []) best = Math.min(best, Math.abs(-zWorld - d));
    return best;
  };
  const trackBase = col(GOBI.track);
  const trackSeam = col(GOBI.trackSeam);
  const tp = (ci: number, ri: number) => {
    const gr = index * rowsT + ri; // global row
    const x = TRACK_COLS[ci] + (ci > 0 && ci < TRACK_COLS.length - 1 ? (hash2(ci, gr, 3) - 0.5) * 0.12 : 0);
    const z = z0 - ri * rowStepT + (hash2(ci, gr, 5) - 0.5) * 0.5;
    return new THREE.Vector3(x, 0, z);
  };
  for (let r = 0; r < rowsT; r++) {
    if (cutRows.has(index * rowsT + r)) { gullyRow(g, r, index * rowsT + r, tp, cutRows); continue; }
    for (let c = 0; c < TRACK_COLS.length - 1; c++) {
      const a = tp(c, r), b = tp(c + 1, r), cc = tp(c + 1, r + 1), d = tp(c, r + 1);
      const xm = (TRACK_COLS[c] + TRACK_COLS[c + 1]) / 2;
      const nearSeam = Math.abs(Math.abs(xm) - 0.75) < 0.25;
      const edge = Math.abs(xm) > 2.2;
      const gr = index * rowsT + r;
      const v1 = 1 + (hash2(c, gr, 11) - 0.5) * 0.07;
      const v2 = 1 + (hash2(c, gr, 13) - 0.5) * 0.07;
      const base = nearSeam ? mix(GOBI.track, GOBI.trackSeam, 0.35) : edge ? mix(GOBI.track, GOBI.sandMid, 0.35) : trackBase;
      void trackSeam;
      // Winding: a(near-left) b(near-right) c(far-right) d(far-left); viewed from above, CCW is a,b,c.
      if ((c + r) % 2 === 0) g.quad(a, b, cc, d, shade(base, v1), shade(base, v2));
      else {
        g.tri(a, b, d, shade(base, v1));
        g.tri(b, cc, d, shade(base, v2));
      }
    }
  }

  // ---------- Side terrain ----------
  const rowStep = 2.5;
  const rows = Math.round(L / rowStep);
  const sandL = GOBI.sandLight, sandM = GOBI.sandMid, sandS = GOBI.sandShadow;
  for (const sgn of [-1, 1]) {
    const pt = (ci: number, ri: number) => {
      const gr = index * rows + ri;
      const w = ci > 0 && ci < SIDE_COLS.length - 1 ? (SIDE_COLS[ci + 1] - SIDE_COLS[ci - 1]) * 0.18 : 0;
      const x = sgn * (SIDE_COLS[ci] + (hash2(ci * sgn, gr, 7) - 0.5) * w);
      const z = z0 - ri * rowStep + (ci > 0 ? (hash2(ci * sgn, gr, 9) - 0.5) * 1.4 : 0);
      return new THREE.Vector3(x, groundHeight(x, z), z);
    };
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < SIDE_COLS.length - 1; c++) {
        let a = pt(c, r), b = pt(c + 1, r), cc = pt(c + 1, r + 1), d = pt(c, r + 1);
        if (sgn < 0) { [a, b] = [b, a]; [cc, d] = [d, cc]; }
        const hAvg = (a.y + b.y + cc.y + d.y) / 4;
        const gr = index * rows + r;
        const n = hash2(c * sgn, gr, 21);
        const t = smoothstep(0, 6, hAvg);
        let base = t > 0.5 ? mix(sandM, sandL, (t - 0.5) * 2) : mix(sandS, sandM, 0.55 + t * 0.9);
        // A darker wash fanning out from each gully's ends, so the ditch reads as part of the land.
        const wash = (1 - Math.min(1, gullyNear((a.z + cc.z) / 2) / 3.2)) * (1 - smoothstep(TRACK, TRACK + 7, Math.abs((a.x + cc.x) / 2)));
        if (wash > 0) base = base.clone().lerp(col(sandS), wash * 0.75);
        const c1 = shade(base, 0.95 + n * 0.1);
        const c2 = shade(base, 0.95 + hash2(c * sgn, gr, 23) * 0.1);
        g.quad(a, b, cc, d, c1, c2);
      }
    }
  }

  // Rocks plug each gully's ends on the shoulders.
  for (const d of opts.layout?.gullies ?? []) {
    if (-d > z0 || -d < z0 - L) continue;
    for (const sgn of [-1, 1]) for (let k = 0; k < 3; k++) {
      const x = sgn * rng.range(2.75, 3.6), z = -d + rng.range(-1.1, 1.1);
      addRock(g, new THREE.Vector3(x, groundHeight(x, z) - 0.06, z), rng.range(0.22, 0.42), rng);
    }
  }

  // ---------- Scenery ----------
  // Each stretch of the level has its own landmarks (owner playtest: the landscape felt repetitive).
  const dMid = index * L + L / 2;
  const kind = sectionAt(opts.layout, dMid);
  // Canyon walls rise and fall over the first and last chunk of a canyon instead of popping in.
  const canyonEdge = kind === 'canyon' ? Math.min(1, 0.45 + 0.55 * Number(sectionAt(opts.layout, dMid - L) === 'canyon'), 0.45 + 0.55 * Number(sectionAt(opts.layout, dMid + L) === 'canyon')) : 0;
  const busy = kind === 'basin' ? 0.3 : kind === 'canyon' ? 0.6 : kind === 'flats' ? 0.5 : 1;

  // Near-field detail right at the track edge: whips past the camera and sells speed.
  for (const sgn of [-1, 1]) {
    for (let d = rng.range(0, 3); d < L; d += rng.range(2.2, 4.5) / Math.max(0.4, busy)) {
      const x = sgn * rng.range(2.85, 4.6), z = z0 - d;
      if (rng.chance(0.55)) addRock(g, new THREE.Vector3(x, groundHeight(x, z) - 0.05, z), rng.range(0.12, 0.32), rng);
      else addBush(g, new THREE.Vector3(x, groundHeight(x, z) - 0.04, z), rng.range(0.28, 0.5), rng);
    }
  }
  for (const sgn of [-1, 1]) {
    const nb = Math.round(rng.int(5, 9) * busy);
    for (let i = 0; i < nb; i++) {
      const x = sgn * rng.range(3.6, 26), z = z0 - rng.range(0, L);
      addScanBush(g, new THREE.Vector3(x, groundHeight(x, z) - 0.05, z), rng.range(0.5, 1.0), rng);
    }
    const nr = Math.round(rng.int(3, 6) * busy);
    for (let i = 0; i < nr; i++) {
      const x = sgn * rng.range(3.4, 30), z = z0 - rng.range(0, L);
      addScanRock(g, new THREE.Vector3(x, groundHeight(x, z) - 0.08, z), rng.range(0.3, 1.0), rng);
    }
    if ((kind === 'dunes' || kind === 'herd') && rng.chance(0.35)) {
      const x = sgn * rng.range(6, 18), z = z0 - rng.range(0, L);
      addScanTree(g, new THREE.Vector3(x, groundHeight(x, z), z), rng.range(2.6, 4.2), rng);
    }
    if (kind !== 'bones' && kind !== 'canyon' && rng.chance(0.18)) {
      const x = sgn * rng.range(5, 12), z = z0 - rng.range(5, L - 5);
      addRibcage(g, new THREE.Vector3(x, groundHeight(x, z) - 0.25, z), rng.range(1.0, 1.6), rng.range(0, 6.28), rng);
    }

    if (kind === 'canyon') {
      // The Flaming Cliffs close in: a near-continuous wall of banded cliffs either side, boulders at their feet.
      for (let d = rng.range(0, 4); d < L; d += rng.range(11, 14)) {
        const x = sgn * rng.range(7.2, 9.5), z = z0 - d;
        addScanCliff(g, new THREE.Vector3(x, groundHeight(x, z) - 1.2, z), rng.range(11, 16) * canyonEdge, rng, sgn > 0 ? Math.PI / 2 : -Math.PI / 2);
      }
      for (let i = 0; i < 3; i++) {
        const x = sgn * rng.range(5.2, 6.8), z = z0 - rng.range(0, L);
        addScanRock(g, new THREE.Vector3(x, groundHeight(x, z) - 0.2, z), rng.range(1.0, 2.0), rng);
      }
    } else if (kind === 'hoodoos') {
      // A garden of hoodoos: a few close enough to whip past, taller ones further out.
      const near = rng.int(1, 3), mid = rng.int(2, 3);
      for (let i = 0; i < near; i++) {
        const x = sgn * rng.range(4.8, 9), z = z0 - rng.range(0, L);
        addHoodoo(g, new THREE.Vector3(x, groundHeight(x, z) - 0.1, z), rng.range(3, 6.5), rng);
      }
      for (let i = 0; i < mid; i++) {
        const x = sgn * rng.range(12, 34), z = z0 - rng.range(0, L);
        addHoodoo(g, new THREE.Vector3(x, groundHeight(x, z) - 0.3, z), rng.range(6, 12), rng);
      }
    } else if (kind === 'bones') {
      // A bone field: the remains of a herd caught by a collapsing dune.
      for (let i = 0; i < rng.int(2, 3); i++) {
        const x = sgn * rng.range(4.2, 9), z = z0 - rng.range(3, L - 3);
        addRibcage(g, new THREE.Vector3(x, groundHeight(x, z) - 0.3, z), rng.range(1.8, 2.8), rng.range(0, 6.28), rng);
      }
      for (let i = 0; i < rng.int(2, 4); i++) {
        const x = sgn * rng.range(3.3, 7), z = z0 - rng.range(0, L);
        addSkull(g, new THREE.Vector3(x, groundHeight(x, z) - 0.05, z), rng.range(0.9, 1.4), rng.range(0, 6.28), rng);
      }
      for (let i = 0; i < rng.int(1, 3); i++) {
        const x = sgn * rng.range(3.4, 8), z = z0 - rng.range(0, L);
        addVertebrae(g, new THREE.Vector3(x, groundHeight(x, z) - 0.06, z), rng.range(2.4, 4.2), rng.range(0, 6.28), rng);
      }
    }
    // Far landmarks: buttes and cliffs on the horizon (not inside the canyon, whose walls block the view).
    if (opts.mesas !== false && kind !== 'canyon') {
      const nm = rng.chance(kind === 'flats' || kind === 'basin' ? 0.9 : 0.6) ? 1 : 0;
      for (let i = 0; i < nm; i++) {
        const x = sgn * rng.range(34, 95), z = z0 - rng.range(0, L);
        const r = rng.range(7, 16);
        let base = Infinity;
        for (let a = 0; a < 6.28; a += 0.8) base = Math.min(base, groundHeight(x + Math.cos(a) * r * 1.4, z + Math.sin(a) * r * 1.4));
        if (rng.chance(0.7)) addScanCliff(g, new THREE.Vector3(x, base - 1.5, z), rng.range(16, 34), rng, sgn > 0 ? Math.PI / 2 : -Math.PI / 2);
        else addMesa(g, new THREE.Vector3(x, base - 1.5, z), r, rng.range(14, 36), rng);
      }
    }
  }

  const mesh = new THREE.Mesh(g.build(), MATS.world);
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.name = `chunk-${index}`;
  return { index, mesh };
}

/** One track row turned into a dry gully: banded sandstone walls (only where the cut starts or ends), end
 * walls at the track edges and a pebbly floor. All faces point into the hole. */
function gullyRow(g: GeomBuilder, r: number, gr: number, tp: (ci: number, ri: number) => THREE.Vector3, cut: Set<number>) {
  const D = GULLY_DEPTH, IN = 0.16;
  const first = !cut.has(gr - 1), last = !cut.has(gr + 1);
  const n = TRACK_COLS.length;
  const near = Array.from({ length: n }, (_, c) => tp(c, r));
  const far = Array.from({ length: n }, (_, c) => tp(c, r + 1));
  const down = (p: THREE.Vector3, dz: number) => new THREE.Vector3(p.x, -D, p.z + dz);
  const nb = near.map((p) => down(p, first ? -IN : 0));
  const fb = far.map((p) => down(p, last ? IN : 0));
  const band = (y: number) => (y > -0.12 ? mix(GOBI.track, GOBI.sandShadow, 0.55) : y > -0.45 ? col(GOBI.cliffLight) : shade(col(GOBI.cliffRed), 0.85));
  const wall = (top0: THREE.Vector3, top1: THREE.Vector3, bot0: THREE.Vector3, bot1: THREE.Vector3, out: THREE.Vector3) => {
    // Three bands from the lip down: crust, pale sandstone, red sandstone.
    const lv = [0, -0.12, -0.45, -D];
    for (let k = 0; k < 3; k++) {
      const t0 = -lv[k] / D, t1 = -lv[k + 1] / D;
      const a = top0.clone().lerp(bot0, t0), b = top1.clone().lerp(bot1, t0), c = top1.clone().lerp(bot1, t1), d = top0.clone().lerp(bot0, t1);
      orientQuad(g, a, b, c, d, out, shade(band(lv[k] - 0.01), 0.97 + hash2(gr, k, 31) * 0.06));
    }
  };
  for (let c = 0; c < n - 1; c++) {
    // Floor.
    orientQuad(g, nb[c], nb[c + 1], fb[c + 1], fb[c], new THREE.Vector3(0, 1, 0), shade(mix(GOBI.sandShadow, GOBI.cliffShadow, 0.35), 0.92 + hash2(c, gr, 33) * 0.12));
    if (first) wall(near[c], near[c + 1], nb[c], nb[c + 1], new THREE.Vector3(0, 0, -1)); // faces away from the runner
    if (last) wall(far[c], far[c + 1], fb[c], fb[c + 1], new THREE.Vector3(0, 0, 1)); // the lit wall the runner sees
  }
  // End walls at the track edges.
  wall(near[0], far[0], nb[0], fb[0], new THREE.Vector3(1, 0, 0));
  wall(near[n - 1], far[n - 1], nb[n - 1], fb[n - 1], new THREE.Vector3(-1, 0, 0));
}

/** A quad wound so it faces `outward`. */
function orientQuad(g: GeomBuilder, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, outward: THREE.Vector3, color: THREE.Color) {
  const n = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(b, a), new THREE.Vector3().subVectors(c, a));
  if (n.dot(outward) >= 0) g.quad(a, b, c, d, color);
  else g.quad(d, c, b, a, color);
}

/**
 * Keeps chunks visible around the player's distance. Building a chunk costs ~10-30 ms (more on phones),
 * so levels pregenerate every chunk up front (`pregenerateStep` during menus) and keep them cached;
 * the run itself then never builds terrain. Endless contexts can disable `retain` to evict.
 */
export class ChunkStreamer {
  private cache = new Map<number, Chunk>();
  private attached = new Set<number>();
  private nextToBuild = 0;
  constructor(private parent: THREE.Object3D, private retain = true, private layout?: TerrainLayout) {}

  /** Build at most one missing chunk up to `maxIndex`. Returns true when all are built. */
  pregenerateStep(maxIndex: number) {
    while (this.nextToBuild <= maxIndex && this.cache.has(this.nextToBuild)) this.nextToBuild++;
    if (this.nextToBuild > maxIndex) return true;
    this.cache.set(this.nextToBuild, buildChunk(this.nextToBuild, { layout: this.layout }));
    this.nextToBuild++;
    return this.nextToBuild > maxIndex;
  }
  get built() { return this.cache.size; }

  update(distance: number) {
    const L = CONFIG.world.chunkLength;
    const cur = Math.floor(distance / L);
    const lo = cur - CONFIG.world.chunksBehind, hi = cur + CONFIG.world.chunksAhead;
    for (const i of [...this.attached]) {
      if (i < lo || i > hi) {
        const ch = this.cache.get(i)!;
        this.parent.remove(ch.mesh);
        this.attached.delete(i);
        if (!this.retain) { ch.mesh.geometry.dispose(); this.cache.delete(i); }
      }
    }
    let builtThisFrame = false;
    for (let i = Math.max(0, lo); i <= hi; i++) {
      if (this.attached.has(i)) continue;
      let ch = this.cache.get(i);
      if (!ch) {
        if (builtThisFrame) continue; // fallback path: at most one build per frame
        ch = buildChunk(i, { layout: this.layout });
        this.cache.set(i, ch);
        builtThisFrame = true;
      }
      this.parent.add(ch.mesh);
      this.attached.add(i);
    }
  }
  prewarm(distance: number) {
    for (let k = 0; k < 12; k++) this.update(distance);
  }
  stats() {
    let tris = 0;
    for (const i of this.attached) tris += this.cache.get(i)!.mesh.geometry.getAttribute('position').count / 3;
    return { chunks: this.attached.size, cached: this.cache.size, tris };
  }
}
