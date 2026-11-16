import * as THREE from 'three';
import { GeomBuilder, jitterGeometry } from '../geom';
import { GOBI, col, mix, shade } from '../palette';
import { Rng } from '../../core/rng';
import { scenery, type SceneryName } from './scenery';

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const ICO = new THREE.IcosahedronGeometry(1, 0);
const ICO1 = new THREE.IcosahedronGeometry(1, 1);

function xform(pos: THREE.Vector3, scale: THREE.Vector3, rotY: number, tiltX = 0, tiltZ = 0) {
  tmpE.set(tiltX, rotY, tiltZ);
  tmpQ.setFromEuler(tmpE);
  return tmpM.compose(pos, tmpQ, scale);
}

/** Lighting-independent tonal variation per face (sun-facing tops a touch lighter). */
const faceTone = (base: THREE.Color, n: THREE.Vector3, rng: Rng, vary = 0.06) =>
  shade(base, 1 + (rng.next() - 0.5) * vary * 2 + Math.max(0, n.y) * 0.06);

/** Scanned rock cluster (Poly Haven, CC0) scaled to `size` meters tall. */
export function addScanRock(g: GeomBuilder, pos: THREE.Vector3, size: number, rng: Rng) {
  const name: SceneryName = rng.chance(0.5) ? 'stones' : 'rockB';
  const geo = scenery(name);
  const h = geo.boundingBox!.max.y || 1;
  const k = size / h;
  const xz = k * rng.range(0.25, 0.6); // the scans are wide clusters; keep them compact
  g.appendColored(geo, xform(pos, new THREE.Vector3(xz, k, xz), rng.range(0, 6.28)), rng.range(0.95, 1.05));
}

export function addRock(g: GeomBuilder, pos: THREE.Vector3, size: number, rng: Rng, base = mix(GOBI.sandShadow, GOBI.cliffRed, 0.35)) {
  const geo = jitterGeometry(ICO.clone(), 0.35, () => rng.next());
  const s = new THREE.Vector3(size * rng.range(0.8, 1.3), size * rng.range(0.5, 0.8), size * rng.range(0.8, 1.2));
  g.appendGeometry(geo, xform(pos, s, rng.range(0, 6.28), rng.range(-0.2, 0.2), rng.range(-0.2, 0.2)), (_i, _c, n) => faceTone(base, n, rng));
  geo.dispose();
}

/** Scanned dry bush (Poly Haven, CC0). */
export function addScanBush(g: GeomBuilder, pos: THREE.Vector3, size: number, rng: Rng) {
  const geo = scenery('bush');
  const h = geo.boundingBox!.max.y || 1;
  const k = size / h;
  g.appendColored(geo, xform(pos, new THREE.Vector3(k * 0.45, k, k * 0.6), rng.range(0, 6.28)), rng.range(0.92, 1.06));
}

export function addBush(g: GeomBuilder, pos: THREE.Vector3, size: number, rng: Rng) {
  const n = rng.int(3, 5);
  const sage = col(GOBI.scrubSage), olive = col(GOBI.scrubOlive);
  for (let i = 0; i < n; i++) {
    const a = rng.range(0, 6.28), r = size * rng.range(0.1, 0.5);
    const p = pos.clone().add(new THREE.Vector3(Math.cos(a) * r, size * rng.range(0.15, 0.45), Math.sin(a) * r));
    const geo = jitterGeometry(ICO.clone(), 0.3, () => rng.next());
    const sc = size * rng.range(0.32, 0.55);
    const c = rng.chance(0.5) ? sage : olive;
    g.appendGeometry(geo, xform(p, new THREE.Vector3(sc, sc * 0.8, sc), rng.range(0, 6.28)), (_i, _c, nn) => faceTone(c, nn, rng, 0.08));
    geo.dispose();
  }
}

/** Static tapered tube (no skinning) for branches and bones. */
export function addTube(g: GeomBuilder, pts: THREE.Vector3[], radii: number[], n: number, color: (seg: number) => THREE.Color) {
  const rings: THREE.Vector3[][] = [];
  for (let i = 0; i < pts.length; i++) {
    const t = new THREE.Vector3().subVectors(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]).normalize();
    const ref = Math.abs(t.y) > 0.9 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
    const side = new THREE.Vector3().crossVectors(ref, t).normalize();
    const up = new THREE.Vector3().crossVectors(t, side).normalize();
    rings.push(Array.from({ length: n }, (_, j) => {
      const th = (j / n) * Math.PI * 2;
      return pts[i].clone().addScaledVector(side, Math.cos(th) * radii[i]).addScaledVector(up, Math.sin(th) * radii[i]);
    }));
  }
  for (let i = 0; i < pts.length - 1; i++) {
    for (let j = 0; j < n; j++) {
      const j1 = (j + 1) % n;
      const c = shade(color(i), 0.92 + 0.16 * (Math.sin(((j + 0.5) / n) * Math.PI * 2) * 0.5 + 0.5));
      g.quad(rings[i][j], rings[i][j1], rings[i + 1][j1], rings[i + 1][j], c);
    }
  }
}

/** Scanned dead quiver tree (Poly Haven, CC0). */
export function addScanTree(g: GeomBuilder, pos: THREE.Vector3, h: number, rng: Rng) {
  const geo = scenery('deadTree');
  const k = h / (geo.boundingBox!.max.y || 1);
  g.appendColored(geo, xform(pos.clone().add(new THREE.Vector3(0, -0.1, 0)), new THREE.Vector3(k, k, k), rng.range(0, 6.28), rng.range(-0.08, 0.08), rng.range(-0.08, 0.08)));
}

export function addDeadTree(g: GeomBuilder, pos: THREE.Vector3, h: number, rng: Rng) {
  const wood = mix(0x8b7765, GOBI.sandShadow, 0.2);
  const lean = new THREE.Vector3(rng.range(-0.15, 0.15), 1, rng.range(-0.15, 0.15)).normalize();
  const pts = [pos.clone().add(new THREE.Vector3(0, -0.2, 0))];
  for (let i = 1; i <= 4; i++) pts.push(pos.clone().addScaledVector(lean, (h * i) / 4).add(new THREE.Vector3(rng.range(-0.15, 0.15), 0, rng.range(-0.15, 0.15))));
  addTube(g, pts, [0.16 * h / 3, 0.12 * h / 3, 0.09 * h / 3, 0.06 * h / 3, 0.02], 5, () => wood);
  const nb = rng.int(2, 4);
  for (let b = 0; b < nb; b++) {
    const from = pts[rng.int(1, 3)];
    const a = rng.range(0, 6.28);
    const dir = new THREE.Vector3(Math.cos(a), rng.range(0.3, 0.9), Math.sin(a)).normalize();
    const len = h * rng.range(0.25, 0.45);
    const mid = from.clone().addScaledVector(dir, len * 0.5).add(new THREE.Vector3(0, rng.range(-0.1, 0.15), 0));
    addTube(g, [from, mid, from.clone().addScaledVector(dir, len)], [0.05 * h / 3, 0.03 * h / 3, 0.008], 4, () => wood);
  }
}

/** Scanned cliff (Poly Haven, CC0) recolored to Flaming Cliffs strata, scaled to `height`. */
export function addScanCliff(g: GeomBuilder, pos: THREE.Vector3, height: number, rng: Rng, faceToward: number) {
  const name: SceneryName = rng.pick(['cliffA', 'cliffB', 'cliffC'] as const);
  const geo = scenery(name);
  const k = height / (geo.boundingBox!.max.y || 1);
  // Face the scanned (detailed) side toward the track.
  g.appendColored(geo, xform(pos, new THREE.Vector3(k, k, k), faceToward + rng.range(-0.5, 0.5)), rng.range(0.95, 1.05));
}

/** Layered sandstone butte, the Flaming Cliffs signature. */
export function addMesa(g: GeomBuilder, pos: THREE.Vector3, radius: number, height: number, rng: Rng) {
  const M = rng.int(8, 11);
  const basePoly = Array.from({ length: M }, (_, k) => {
    const a = (k / M) * Math.PI * 2 + rng.range(-0.15, 0.15);
    const r = radius * rng.range(0.75, 1.15);
    return new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r * rng.range(0.7, 1.0));
  });
  const strata = [GOBI.cliffRed, GOBI.cliffLight, GOBI.cliffRed, 0xa8452f, GOBI.cliffLight, GOBI.cliffRed, GOBI.cliffPale];
  const layers = rng.int(4, 6);
  const talusH = height * 0.12;
  const ringAt = (scale: number, y: number, wobble: number) =>
    basePoly.map((v) => new THREE.Vector3(pos.x + v.x * scale * (1 + rng.range(-wobble, wobble)), pos.y + y, pos.z + v.y * scale * (1 + rng.range(-wobble, wobble))));
  // Talus skirt.
  const skirt = ringAt(1.5, -2.5, 0.12);
  let prev = ringAt(1.0, talusH, 0.04);
  const talusCol = mix(GOBI.cliffRed, GOBI.sandMid, 0.55);
  for (let k = 0; k < M; k++) {
    const k1 = (k + 1) % M;
    g.quad(skirt[k], skirt[k1], prev[k1], prev[k], shade(talusCol, rng.range(0.94, 1.06)));
  }
  let y = talusH;
  const startStrata = rng.int(0, 3);
  for (let L = 0; L < layers; L++) {
    const h = ((height - talusH) / layers) * rng.range(0.8, 1.2);
    y += h;
    const taper = 1 - (L + 1) * 0.045 + rng.range(-0.03, 0.03);
    const top = ringAt(taper, y, 0.035);
    const c = col(strata[(L + startStrata) % strata.length]);
    for (let k = 0; k < M; k++) {
      const k1 = (k + 1) % M;
      g.quad(prev[k], prev[k1], top[k1], top[k], shade(c, rng.range(0.95, 1.05)));
    }
    // Ledge lip between strata: a thin inset ring for horizontal banding.
    if (L < layers - 1) {
      const inset = top.map((v) => v.clone().sub(pos).multiplyScalar(0.97).add(pos).setY(v.y));
      const lipCol = shade(c, 0.78);
      for (let k = 0; k < M; k++) {
        const k1 = (k + 1) % M;
        g.quad(top[k], top[k1], inset[k1], inset[k], lipCol);
      }
      prev = inset;
    } else prev = top;
  }
  // Cap.
  const center = new THREE.Vector3(pos.x, pos.y + y + height * 0.02, pos.z);
  const capCol = mix(GOBI.cliffPale, GOBI.sandLight, 0.4);
  for (let k = 0; k < M; k++) g.tri(prev[(k + 1) % M], prev[k], center, shade(capCol, rng.range(0.96, 1.04)));
}

/** Half-buried bleached ribcage, a quiet storytelling prop. */
export function addRibcage(g: GeomBuilder, pos: THREE.Vector3, size: number, rotY: number, rng: Rng) {
  const bone = mix(GOBI.bone, GOBI.sandShadow, 0.18); // aged bone, a touch darker than the pale sand
  const fwd = new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY));
  const side = new THREE.Vector3(fwd.z, 0, -fwd.x);
  const spineA = pos.clone().addScaledVector(fwd, -size * 0.9).add(new THREE.Vector3(0, size * 0.55, 0));
  const spineB = pos.clone().addScaledVector(fwd, size * 0.9).add(new THREE.Vector3(0, size * 0.45, 0));
  addTube(g, [spineA, spineA.clone().lerp(spineB, 0.5).add(new THREE.Vector3(0, size * 0.06, 0)), spineB], [size * 0.07, size * 0.08, size * 0.06], 5, () => bone);
  const ribs = 6;
  for (let r = 0; r < ribs; r++) {
    const t = r / (ribs - 1);
    const top = spineA.clone().lerp(spineB, 0.1 + t * 0.8);
    const span = size * (0.55 + 0.35 * Math.sin(Math.PI * (0.2 + t * 0.7)));
    for (const sgn of [-1, 1]) {
      if (rng.chance(0.15)) continue; // broken ribs
      const mid = top.clone().addScaledVector(side, sgn * span * 0.85).add(new THREE.Vector3(0, -size * 0.12, 0));
      const end = top.clone().addScaledVector(side, sgn * span * 0.75).add(new THREE.Vector3(0, -size * 0.65, 0));
      addTube(g, [top, mid, end], [size * 0.045, size * 0.04, size * 0.025], 4, () => bone);
    }
  }
}

export { ICO1 };

/** Hoodoo: an eroded sandstone pillar, banded, pinched at the waist, under a darker, wider caprock. */
export function addHoodoo(g: GeomBuilder, pos: THREE.Vector3, h: number, rng: Rng) {
  const r0 = h * rng.range(0.13, 0.18);
  // Close tones so the bands read as strata, not stripes.
  const strata = [mix(GOBI.cliffLight, GOBI.cliffRed, 0.3), GOBI.cliffRed, mix(GOBI.cliffLight, GOBI.cliffPale, 0.4), mix(GOBI.cliffRed, GOBI.cliffLight, 0.25), mix(GOBI.cliffRed, 0xa8452f, 0.5)].map((c) => (typeof c === 'number' ? col(c) : c));
  const M = 7;
  const seg = 6;
  const lean = new THREE.Vector3(rng.range(-0.06, 0.06), 1, rng.range(-0.06, 0.06)).normalize();
  const rings: THREE.Vector3[][] = [];
  for (let s = 0; s <= seg; s++) {
    const t = s / seg;
    const waist = 1 - 0.38 * Math.sin(Math.PI * Math.min(1, t * 1.15)); // pinched in the middle, flared base
    const r = r0 * (t < 0.12 ? 1.35 - t * 2.5 : waist) * rng.range(0.92, 1.08);
    const c = pos.clone().addScaledVector(lean, h * t * 0.88);
    rings.push(Array.from({ length: M }, (_, k) => {
      const a = (k / M) * Math.PI * 2 + s * 0.3;
      return c.clone().add(new THREE.Vector3(Math.cos(a) * r * rng.range(0.9, 1.1), (t === 0 ? -0.6 : 0), Math.sin(a) * r * rng.range(0.9, 1.1)));
    }));
  }
  const s0 = rng.int(0, strata.length - 1);
  for (let s = 0; s < seg; s++) for (let k = 0; k < M; k++) {
    const k1 = (k + 1) % M;
    g.quad(rings[s][k], rings[s][k1], rings[s + 1][k1], rings[s + 1][k], shade(strata[(s + s0) % strata.length], rng.range(0.93, 1.05)));
  }
  // Caprock: a flat, darker slab overhanging the column.
  const top = rings[seg];
  const cTop = pos.clone().addScaledVector(lean, h * 0.88);
  const capR = r0 * rng.range(1.25, 1.6), capH = h * rng.range(0.07, 0.11);
  const capCol = mix(GOBI.hazardRock, GOBI.cliffShadow, 0.4);
  const under = Array.from({ length: M }, (_, k) => { const a = (k / M) * Math.PI * 2; return cTop.clone().add(new THREE.Vector3(Math.cos(a) * capR, 0, Math.sin(a) * capR * rng.range(0.8, 1.0))); });
  const over = under.map((p) => p.clone().add(new THREE.Vector3(rng.range(-0.05, 0.05), capH, rng.range(-0.05, 0.05))));
  const peak = cTop.clone().add(new THREE.Vector3(0, capH * 1.25, 0));
  for (let k = 0; k < M; k++) {
    const k1 = (k + 1) % M;
    g.quad(top[k], top[k1], under[k1], under[k], shade(capCol, 0.7)); // shadowed underside
    g.quad(under[k], under[k1], over[k1], over[k], shade(capCol, rng.range(0.95, 1.05)));
    g.tri(over[k], over[k1], peak, shade(mix(GOBI.hazardRockLight, GOBI.cliffPale, 0.3), rng.range(0.96, 1.04)));
  }
}

/** A bleached ceratopsian skull lying in the sand: beaked snout, eye sockets and a broad frill. */
export function addSkull(g: GeomBuilder, pos: THREE.Vector3, size: number, rotY: number, rng: Rng) {
  const bone = col(GOBI.bone), boneS = shade(col(GOBI.bone), 0.78), hole = col(0x4a3a30);
  const m = new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(-0.15, 0.15), rotY, rng.range(-0.2, 0.2))), new THREE.Vector3(size, size, size));
  const P = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(m);
  // Snout wedge.
  const tip = P(0, 0.12, -0.75), l0 = P(-0.22, 0.05, -0.1), r0 = P(0.22, 0.05, -0.1), t0 = P(0, 0.42, -0.15), b0 = P(0, -0.05, -0.2);
  g.tri(tip, t0, l0, bone); g.tri(tip, r0, t0, bone); g.tri(tip, l0, b0, boneS); g.tri(tip, b0, r0, boneS);
  // Eye sockets.
  for (const sx of [-1, 1]) g.tri(P(sx * 0.17, 0.22, -0.28), P(sx * 0.2, 0.3, -0.16), P(sx * 0.21, 0.16, -0.14), hole);
  // Frill fan rising behind.
  const F = 7;
  for (let k = 0; k < F; k++) {
    const a0 = Math.PI * (k / F), a1 = Math.PI * ((k + 1) / F);
    const o0 = P(Math.cos(a0) * 0.55, 0.1 + Math.sin(a0) * 0.5, 0.25), o1 = P(Math.cos(a1) * 0.55, 0.1 + Math.sin(a1) * 0.5, 0.25);
    g.tri(t0, o1, o0, k % 2 ? bone : shade(bone, 0.92));
    g.tri(l0, o0, t0, boneS); g.tri(r0, t0, o1, boneS);
  }
  void rng;
}

/** A run of vertebrae half out of the sand, spines up. */
export function addVertebrae(g: GeomBuilder, pos: THREE.Vector3, len: number, rotY: number, rng: Rng) {
  const bone = col(GOBI.bone);
  const dir = new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY));
  const n = Math.max(4, Math.round(len / 0.35));
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const s = 0.16 * (1 - 0.6 * t) * rng.range(0.9, 1.1);
    const c = pos.clone().addScaledVector(dir, (t - 0.5) * len).add(new THREE.Vector3(0, s * 0.4 + Math.sin(t * 3) * 0.05, 0));
    g.appendGeometry(ICO, xform(c, new THREE.Vector3(s, s * 0.9, s * 0.8), rotY), (_i, _c, nn) => shade(bone, 0.86 + Math.max(0, nn.y) * 0.18));
    addTube(g, [c.clone().add(new THREE.Vector3(0, s * 0.5, 0)), c.clone().add(new THREE.Vector3(0, s * 2.4, 0)).addScaledVector(dir, -s * 0.6)], [s * 0.3, s * 0.08], 4, () => shade(bone, 0.95));
  }
}

/** A Protoceratops nest: a low sand mound ringed with elongated eggs, laid in a circle and tipped outward. */
export function addNest(g: GeomBuilder, pos: THREE.Vector3, size: number, rng: Rng) {
  const sand = mix(GOBI.sandMid, GOBI.sandShadow, 0.35), rim = mix(GOBI.sandMid, GOBI.sandLight, 0.4);
  const M = 10, R = size, r0 = size * 0.45;
  const outer = Array.from({ length: M }, (_, k) => { const a = (k / M) * Math.PI * 2; return pos.clone().add(new THREE.Vector3(Math.cos(a) * R * 1.35, -0.05, Math.sin(a) * R * 1.35)); });
  const top = Array.from({ length: M }, (_, k) => { const a = (k / M) * Math.PI * 2 + 0.2; return pos.clone().add(new THREE.Vector3(Math.cos(a) * R * 0.9, size * 0.22, Math.sin(a) * R * 0.9)); });
  const inner = Array.from({ length: M }, (_, k) => { const a = (k / M) * Math.PI * 2; return pos.clone().add(new THREE.Vector3(Math.cos(a) * r0, size * 0.08, Math.sin(a) * r0)); });
  const ctr = pos.clone().add(new THREE.Vector3(0, size * 0.04, 0));
  for (let k = 0; k < M; k++) {
    const k1 = (k + 1) % M;
    g.quad(outer[k], outer[k1], top[k1], top[k], shade(rim, rng.range(0.94, 1.04)));
    g.quad(top[k], top[k1], inner[k1], inner[k], shade(sand, rng.range(0.9, 1.0)));
    g.tri(inner[k], inner[k1], ctr, shade(sand, 0.82));
  }
  // Eggs: pale, elongated, half-buried in a ring.
  const egg = mix(0xf1e6cf, GOBI.sandLight, 0.25);
  const n = rng.int(8, 12);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.1, 0.1);
    const p = pos.clone().add(new THREE.Vector3(Math.cos(a) * R * 0.62, size * 0.16, Math.sin(a) * R * 0.62));
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(a) * 0.9, -a, -Math.cos(a) * 0.9));
    g.appendGeometry(ICO1, new THREE.Matrix4().compose(p, q, new THREE.Vector3(size * 0.09, size * 0.16, size * 0.09)), (_i, _c, nn) => shade(egg, 0.82 + Math.max(0, nn.y) * 0.22));
  }
}

/**
 * A Flaming Cliffs canyon wall along one side of the trail, from distance zNear to zFar (world z, negative ahead):
 * stacked sandstone strata stepping back in terraces, with vertical erosion grooves and a talus apron. Shapes
 * come from world position (not the chunk's random stream), so walls in neighboring chunks meet seamlessly.
 * `heightAt(z)` scales the wall (0 = flat, 1 = full), for easing in and out of the canyon.
 */
export function addCanyonWall(g: GeomBuilder, sgn: 1 | -1, zNear: number, zFar: number, heightAt: (z: number) => number) {
  const strata = [mix(GOBI.cliffRed, GOBI.cliffShadow, 0.15), col(GOBI.cliffLight), col(GOBI.cliffRed), mix(GOBI.cliffLight, GOBI.cliffPale, 0.5), mix(GOBI.cliffRed, 0xa8452f, 0.6), col(GOBI.cliffLight), mix(GOBI.cliffPale, GOBI.sandLight, 0.3)];
  const talus = mix(GOBI.cliffRed, GOBI.sandMid, 0.55);
  const STEP = 1.6;
  const zs: number[] = [];
  for (let z = zNear; z > zFar - 1e-6; z -= STEP) zs.push(z);
  if (zs[zs.length - 1] > zFar + 0.01) zs.push(zFar);
  const groove = (z: number) => 0.6 * Math.sin(z * 0.45 + 1.3) + 0.25 * Math.sin(z * 1.1 + 0.4);
  const crown = (z: number) => 12 + 2.2 * Math.sin(z * 0.11 + 2) + 1.4 * Math.sin(z * 0.37) + 0.6 * Math.sin(z * 1.3);
  const LAYERS = [0, 1.3, 3.1, 4.6, 6.6, 8.2, 10.3, 99];
  const faceX = (z: number, layer: number) => sgn * (6.6 + layer * 0.32 + groove(z) * (1 - layer * 0.07) + (layer % 2 ? 0.12 : 0));
  // Each layer is a band of quads facing the trail, plus a terrace top where the next layer steps back.
  for (let i = 0; i < zs.length - 1; i++) {
    const za = zs[i], zb = zs[i + 1];
    const ha = heightAt(za), hb = heightAt(zb);
    if (ha <= 0.01 && hb <= 0.01) continue;
    const topA = crown(za) * ha, topB = crown(zb) * hb;
    // Talus apron from the trail edge up to the foot of the wall.
    const ta = new THREE.Vector3(sgn * 4.4, -0.05, za), tb = new THREE.Vector3(sgn * 4.4, -0.05, zb);
    const fa = new THREE.Vector3(faceX(za, 0), Math.min(1.1, topA), za), fb = new THREE.Vector3(faceX(zb, 0), Math.min(1.1, topB), zb);
    if (sgn > 0) g.quad(ta, tb, fb, fa, shade(talus, 0.95 + 0.06 * Math.sin(za * 1.7)));
    else g.quad(tb, ta, fa, fb, shade(talus, 0.95 + 0.06 * Math.sin(za * 1.7)));
    for (let L = 0; L < LAYERS.length - 1; L++) {
      const y0a = Math.max(1.1 * Math.min(1, ha * 3), LAYERS[L] * ha), y0b = Math.max(1.1 * Math.min(1, hb * 3), LAYERS[L] * hb);
      const y1a = Math.min(topA, LAYERS[L + 1] * ha), y1b = Math.min(topB, LAYERS[L + 1] * hb);
      if (y1a <= y0a && y1b <= y0b) continue;
      const xa = faceX(za, L), xb = faceX(zb, L);
      const p0 = new THREE.Vector3(xa, y0a, za), p1 = new THREE.Vector3(xb, y0b, zb);
      const p2 = new THREE.Vector3(xb, Math.max(y0b, y1b), zb), p3 = new THREE.Vector3(xa, Math.max(y0a, y1a), za);
      const c = shade(strata[L % strata.length], 0.97 + 0.03 * Math.sin(za * 0.2 + L)); // gentle drift: no tiled seams
      if (sgn > 0) g.quad(p0, p1, p2, p3, c); else g.quad(p1, p0, p3, p2, c);
      // Terrace: from this layer's face back to the next layer's face (or the crown).
      const last = y1a >= topA - 1e-3 && y1b >= topB - 1e-3;
      const xa2 = last ? xa + sgn * 3 : faceX(za, L + 1), xb2 = last ? xb + sgn * 3 : faceX(zb, L + 1);
      const q0 = p3, q1 = p2, q2 = new THREE.Vector3(xb2, p2.y, zb), q3 = new THREE.Vector3(xa2, p3.y, za);
      const top = shade(mix(GOBI.cliffPale, GOBI.sandLight, 0.35), 0.98 + 0.02 * Math.sin(za * 0.2 + L));
      if (sgn > 0) g.quad(q0, q1, q2, q3, top); else g.quad(q1, q0, q3, q2, top);
      if (last) break;
    }
  }
}
