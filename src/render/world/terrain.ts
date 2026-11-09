import * as THREE from 'three';
import { GeomBuilder } from '../geom';
import { GOBI, col, mix, shade } from '../palette';
import { MATS } from '../materials';
import { Noise2D } from '../../core/noise';
import { Rng, hash2 } from '../../core/rng';
import { smoothstep } from '../../core/math';
import { CONFIG } from '../../game/config';
import { addBush, addDeadTree, addMesa, addRibcage, addRock } from './props';

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

export interface Chunk {
  index: number;
  mesh: THREE.Mesh;
}

/** Builds one 40 m world chunk: track, dune terrain, scenery. One merged mesh, one draw call. */
export function buildChunk(index: number, opts: { mesas?: boolean } = {}): Chunk {
  const L = CONFIG.world.chunkLength;
  const z0 = -index * L; // near edge
  const g = new GeomBuilder(false);
  const rng = new Rng(index * 7919 + 17);

  // ---------- Track ----------
  const rowStepT = 1.25;
  const rowsT = Math.round(L / rowStepT);
  const trackBase = col(GOBI.track);
  const trackSeam = col(GOBI.trackSeam);
  const tp = (ci: number, ri: number) => {
    const gr = index * rowsT + ri; // global row
    const x = TRACK_COLS[ci] + (ci > 0 && ci < TRACK_COLS.length - 1 ? (hash2(ci, gr, 3) - 0.5) * 0.12 : 0);
    const z = z0 - ri * rowStepT + (hash2(ci, gr, 5) - 0.5) * 0.5;
    return new THREE.Vector3(x, 0, z);
  };
  for (let r = 0; r < rowsT; r++) {
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
        const base = t > 0.5 ? mix(sandM, sandL, (t - 0.5) * 2) : mix(sandS, sandM, 0.55 + t * 0.9);
        const c1 = shade(base, 0.95 + n * 0.1);
        const c2 = shade(base, 0.95 + hash2(c * sgn, gr, 23) * 0.1);
        g.quad(a, b, cc, d, c1, c2);
      }
    }
  }

  // ---------- Scenery ----------
  for (const sgn of [-1, 1]) {
    const nb = rng.int(5, 9);
    for (let i = 0; i < nb; i++) {
      const x = sgn * rng.range(3.6, 26), z = z0 - rng.range(0, L);
      addBush(g, new THREE.Vector3(x, groundHeight(x, z) - 0.05, z), rng.range(0.45, 1.1), rng);
    }
    const nr = rng.int(3, 6);
    for (let i = 0; i < nr; i++) {
      const x = sgn * rng.range(3.4, 30), z = z0 - rng.range(0, L);
      addRock(g, new THREE.Vector3(x, groundHeight(x, z) - 0.1, z), rng.range(0.2, 0.9), rng);
    }
    if (rng.chance(0.35)) {
      const x = sgn * rng.range(6, 18), z = z0 - rng.range(0, L);
      addDeadTree(g, new THREE.Vector3(x, groundHeight(x, z), z), rng.range(2.2, 3.6), rng);
    }
    if (rng.chance(0.18)) {
      const x = sgn * rng.range(5, 12), z = z0 - rng.range(5, L - 5);
      addRibcage(g, new THREE.Vector3(x, groundHeight(x, z) - 0.25, z), rng.range(1.0, 1.6), rng.range(0, 6.28), rng);
    }
    if (opts.mesas !== false) {
      const nm = rng.chance(0.75) ? rng.int(1, 2) : 0;
      for (let i = 0; i < nm; i++) {
        const x = sgn * rng.range(34, 95), z = z0 - rng.range(0, L);
        addMesa(g, new THREE.Vector3(x, groundHeight(x, z) - 1, z), rng.range(7, 16), rng.range(12, 34), rng);
      }
    }
  }

  const mesh = new THREE.Mesh(g.build(), MATS.world);
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.name = `chunk-${index}`;
  return { index, mesh };
}

/** Keeps chunks streamed around the player's distance. */
export class ChunkStreamer {
  private chunks = new Map<number, Chunk>();
  constructor(private parent: THREE.Object3D) {}
  update(distance: number) {
    const L = CONFIG.world.chunkLength;
    const cur = Math.floor(distance / L);
    const lo = cur - CONFIG.world.chunksBehind, hi = cur + CONFIG.world.chunksAhead;
    for (const [i, ch] of this.chunks) {
      if (i < lo || i > hi) {
        this.parent.remove(ch.mesh);
        ch.mesh.geometry.dispose();
        this.chunks.delete(i);
      }
    }
    for (let i = Math.max(0, lo); i <= hi; i++) {
      if (!this.chunks.has(i)) {
        const ch = buildChunk(i);
        this.chunks.set(i, ch);
        this.parent.add(ch.mesh);
        return; // build at most one chunk per frame to avoid hitches
      }
    }
  }
  prewarm(distance: number) {
    for (let k = 0; k < 12; k++) this.update(distance);
  }
  stats() {
    let tris = 0;
    for (const ch of this.chunks.values()) tris += ch.mesh.geometry.getAttribute('position').count / 3;
    return { chunks: this.chunks.size, tris };
  }
}
