import * as THREE from 'three';
import { GeomBuilder, jitterGeometry } from '../geom';
import { FOREST as F, col, mix, shade } from '../palette';
import { Rng } from '../../core/rng';
import type { HazardType } from '../../game/types';
import { lookAt } from '../look';
import { addTube } from './props';

/** Graphics version 3: richer bark (ridges, moss, real roots), smooth-shaded with crisp folds. */
const RICH = () => lookAt(3);
const built = (g: GeomBuilder) => g.build(RICH() ? { smooth: 42 } : {});
/** Bark ridges: alternate vertices around a trunk stand a little proud (version 3). */
const ridge = (k: number) => (RICH() ? (k % 2 ? 1.07 : 0.95) : 1);
/** Moss cushions along the top of a log (version 3). */
function mossTop(g: GeomBuilder, a: THREE.Vector3, b: THREE.Vector3, r: number, rng: Rng) {
  const n = Math.max(2, Math.round(a.distanceTo(b) / 0.45));
  for (let i = 0; i < n; i++) {
    if (rng.chance(0.3)) continue;
    const c = a.clone().lerp(b, (i + rng.range(0.2, 0.8)) / n).add(new THREE.Vector3(rng.range(-0.08, 0.08) * r, r * 0.92, rng.range(-0.08, 0.08) * r));
    const s = rng.range(0.12, 0.22) * Math.min(1.5, r / 0.3);
    g.appendGeometry(jitterGeometry(new THREE.IcosahedronGeometry(1, 0), 0.3, () => rng.next()), new THREE.Matrix4().compose(c, new THREE.Quaternion(), new THREE.Vector3(s * 1.4, s * 0.45, s)), () => shade(mix(F.moss, F.mossLight, rng.next() * 0.6), 0.95 + rng.next() * 0.1));
  }
}
/** Curved roots running from a trunk's foot into the ground (version 3). */
function roots(g: GeomBuilder, R: number, count: number, rot: number, rng: Rng, skip?: (a: number) => boolean) {
  for (let k = 0; k < count; k++) {
    const a = rot + (k / count) * Math.PI * 2 + rng.range(-0.2, 0.2);
    if (skip?.(a)) continue;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const p0 = dir.clone().multiplyScalar(R * 0.8).setY(0.55), p1 = dir.clone().multiplyScalar(R * 1.25).setY(0.22), p2 = dir.clone().multiplyScalar(R * (1.7 + rng.range(0, 0.5))).setY(-0.04);
    addTube(g, [p0, p1, p2], [R * 0.3, R * 0.2, 0.03], 6, () => col(F.bark));
  }
}

/**
 * Jehol Forest obstacles: the same collision boxes as the Gobi's (collision.ts), dressed as forest.
 * - boulder (go around): a standing tree trunk with flared roots (three sizes)
 * - ledge (jump): a fallen log across the lane
 * - arch (slide, one lane): a giant old trunk with an arched hollow through its base
 * - ribArch (slide, all lanes): a fallen trunk propped across the trail at head height
 * - spine (fork): a huge fallen tree down the middle lane, its root plate facing you like a wall
 * Streams (gully) are cut into the terrain (forest.ts).
 */
const UP = new THREE.Vector3(0, 1, 0);
const tA = new THREE.Vector3(), tB = new THREE.Vector3(), tN = new THREE.Vector3();
function oquad(g: GeomBuilder, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, out: THREE.Vector3, color: THREE.Color, color2 = color) {
  tN.crossVectors(tA.subVectors(b, a), tB.subVectors(c, a));
  if (tN.dot(out) >= 0) g.quad(a, b, c, d, color, color2); else g.quad(d, c, b, a, color, color2);
}
function otri(g: GeomBuilder, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, out: THREE.Vector3, color: THREE.Color) {
  tN.crossVectors(tA.subVectors(b, a), tB.subVectors(c, a));
  if (tN.dot(out) >= 0) g.tri(a, b, c, color); else g.tri(a, c, b, color);
}
/** Bark tone: lit on the sun side, grooved in alternate faces, mossy on top. */
const bark = (out: THREE.Vector3, k: number, mossy = 0) => {
  if (out.y > 0.55 && mossy > 0) return mix(F.moss, F.mossLight, 0.3);
  const lit = 0.85 + 0.25 * Math.max(0, out.x * 0.6 + out.z * 0.5 + out.y * 0.4);
  return shade(k % 2 ? col(F.bark) : mix(F.bark, F.barkDark, 0.45), lit);
};

/** A horizontal log along `dir`, centered at `c`; returns nothing. Ends show pale wood with a ring. */
function log(g: GeomBuilder, c: THREE.Vector3, dir: THREE.Vector3, len: number, r: number, n: number, rng: Rng, ends = true) {
  const d = dir.clone().normalize();
  const side = new THREE.Vector3().crossVectors(d, UP).normalize();
  const up = new THREE.Vector3().crossVectors(side, d).normalize();
  const a = c.clone().addScaledVector(d, -len / 2), b = c.clone().addScaledVector(d, len / 2);
  const off = (t: number, rr = r) => side.clone().multiplyScalar(Math.cos(t) * rr).addScaledVector(up, Math.sin(t) * rr);
  if (RICH()) n = Math.max(n, 14) + (Math.max(n, 14) % 2); // an even count, so the ridges alternate all the way round
  const segs = Math.max(1, Math.round(len / (RICH() ? 0.8 : 1.2)));
  for (let s = 0; s < segs; s++) {
    const p0 = a.clone().lerp(b, s / segs), p1 = a.clone().lerp(b, (s + 1) / segs);
    const wob0 = 1 + 0.06 * Math.sin(s * 2.1), wob1 = 1 + 0.06 * Math.sin((s + 1) * 2.1);
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2;
      const out = off((a0 + a1) / 2, 1).normalize();
      oquad(g, p0.clone().add(off(a0, r * wob0 * ridge(k))), p0.clone().add(off(a1, r * wob0 * ridge(k + 1))), p1.clone().add(off(a1, r * wob1 * ridge(k + 1))), p1.clone().add(off(a0, r * wob1 * ridge(k))), out, bark(out, k, 1));
    }
  }
  if (RICH()) mossTop(g, a, b, r, rng);
  if (!ends) return;
  for (const [p, s] of [[a, -1], [b, 1]] as const) {
    const out = d.clone().multiplyScalar(s);
    // Version 3: a broken, splintered end (alternate points of the rim stick out) instead of a clean cut.
    const splinter = (k: number) => (RICH() && k % 3 === 0 ? d.clone().multiplyScalar(s * (0.08 + 0.06 * ((k * 7) % 3))) : new THREE.Vector3());
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2;
      otri(g, p, p.clone().add(off(a0, r * 0.55)), p.clone().add(off(a1, r * 0.55)), out, col(F.barkLight).lerp(col(0xe2c49a), 0.5));
      oquad(g, p.clone().add(off(a0, r * 0.55)), p.clone().add(off(a1, r * 0.55)), p.clone().add(off(a1, r * ridge(k + 1))).add(splinter(k + 1)), p.clone().add(off(a0, r * ridge(k))).add(splinter(k)), out, col(F.barkLight));
    }
  }
}

/** Lane blocker: a standing trunk (rising out of view) with root flares. Three sizes (all fill the lane). */
function blocker(variant: number): THREE.BufferGeometry {
  const g = new GeomBuilder();
  const rng = new Rng(300 + variant);
  const R = [0.5, 0.56, 0.62][variant % 3], H = 16, n = RICH() ? 16 : 10;
  const rot = rng.range(0, 6.28);
  for (let s = 0; s < 4; s++) {
    const y0 = [0, 0.6, 3, 8][s], y1 = [0.6, 3, 8, H][s];
    const r0 = R * [1.25, 1, 0.92, 0.82][s], r1 = R * [1, 0.92, 0.82, 0.6][s];
    for (let k = 0; k < n; k++) {
      const a0 = rot + (k / n) * Math.PI * 2, a1 = rot + ((k + 1) / n) * Math.PI * 2;
      const p = (y: number, r: number, a: number, kk: number) => new THREE.Vector3(Math.cos(a) * r * ridge(kk), y, Math.sin(a) * r * ridge(kk));
      const out = new THREE.Vector3(Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2));
      // Version 3: moss up the shaded side of the lower trunk.
      const mossy = RICH() && s < 2 && out.x * 0.6 + out.z * 0.5 < -0.35;
      oquad(g, p(y0, r0, a0, k), p(y0, r0, a1, k + 1), p(y1, r1, a1, k + 1), p(y1, r1, a0, k), out, mossy ? shade(mix(F.moss, F.mossDark, 0.4 + 0.3 * (k % 2)), s === 0 ? 1 : 0.9) : bark(out, k));
    }
  }
  if (RICH()) {
    roots(g, R, 6, rot, rng);
    // Two broken branch stubs, high up.
    for (const [y, a] of [[4.2, rot + 1.1], [6.5, rot + 3.9]] as const) {
      const dir = new THREE.Vector3(Math.cos(a), 0.45, Math.sin(a)).normalize();
      const b0 = new THREE.Vector3(Math.cos(a) * R * 0.8, y, Math.sin(a) * R * 0.8);
      addTube(g, [b0, b0.clone().addScaledVector(dir, 0.5), b0.clone().addScaledVector(dir, 0.85)], [0.12, 0.08, 0.04], 5, () => col(F.bark));
    }
  }
  // Root flares: wedges running out from the base.
  for (let k = 0; k < (RICH() ? 0 : 5); k++) {
    const a = rot + (k / 5) * Math.PI * 2 + 0.3;
    const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const side = new THREE.Vector3(-out.z, 0, out.x);
    const base = out.clone().multiplyScalar(R * 0.9), tip = out.clone().multiplyScalar(R * 1.9).setY(0.02), top = out.clone().multiplyScalar(R * 0.95).setY(0.75);
    otri(g, base.clone().addScaledVector(side, 0.14), tip, top, side, bark(side, k));
    otri(g, base.clone().addScaledVector(side, -0.14), top, tip, side.clone().negate(), bark(side.clone().negate(), k + 1));
  }
  // A ring of moss at the foot.
  for (let k = 0; k < 8; k++) {
    const a0 = (k / 8) * Math.PI * 2, a1 = ((k + 1) / 8) * Math.PI * 2;
    const p = (r: number, a: number, y: number) => new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    oquad(g, p(R * 1.2, a0, 0.12), p(R * 1.2, a1, 0.12), p(R * 1.6, a1, 0.01), p(R * 1.6, a0, 0.01), UP, mix(F.moss, F.mossDark, 0.3 + 0.2 * Math.sin(k)));
  }
  return built(g);
}

/** Jump: a fallen log across one lane, mossy on top, with a broken branch stub. */
function fallenLog(): THREE.BufferGeometry {
  const g = new GeomBuilder();
  const rng = new Rng(57);
  log(g, new THREE.Vector3(0, 0.25, 0), new THREE.Vector3(1, 0, 0.06), 1.62, 0.26, 9, rng);
  // Branch stub pointing up and back (low, below the jump line).
  const s0 = new THREE.Vector3(0.35, 0.42, -0.08), s1 = new THREE.Vector3(0.48, 0.62, -0.28);
  for (let k = 0; k < 4; k++) {
    const a0 = (k / 4) * Math.PI * 2, a1 = ((k + 1) / 4) * Math.PI * 2;
    const o = (a: number, r: number) => new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
    const out = o((a0 + a1) / 2, 1);
    oquad(g, s0.clone().add(o(a0, 0.05)), s0.clone().add(o(a1, 0.05)), s1.clone().add(o(a1, 0.025)), s1.clone().add(o(a0, 0.025)), out, col(F.bark));
  }
  // Moss pads drooping over the front, and leaf litter piled at its foot.
  for (let k = 0; k < 7; k++) {
    const x = -0.7 + k * 0.23;
    const r = 0.06 + 0.04 * Math.sin(k * 3.1);
    g.appendGeometry(jitterGeometry(new THREE.IcosahedronGeometry(1, 0), 0.3, () => rng.next()), new THREE.Matrix4().compose(new THREE.Vector3(x, 0.04, rng.chance(0.5) ? 0.3 : -0.3), new THREE.Quaternion(), new THREE.Vector3(r * 1.6, r * 0.5, r)), () => shade(col(F.litter), 0.9 + 0.2 * rng.next()));
  }
  return built(g);
}

/** Slide (one lane): a giant old trunk with a dark arched hollow through its base, rising out of view. The open
 * gap is 0.66-0.84 m tall (collision: the trunk starts at 0.66). */
function hollowTrunk(): THREE.BufferGeometry {
  const g = new GeomBuilder();
  const rng = new Rng(71);
  const R = 1.15, n = 16, H = 18;
  const HW = 0.68; // half-width of the hollow
  const hole = (x: number) => 0.7 + 0.24 * Math.sqrt(Math.max(0, 1 - (x / HW) ** 2)); // its arched roof
  const p = (y: number, r: number, a: number) => new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r);
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    const out = new THREE.Vector3(Math.sin(am), 0, Math.cos(am));
    const inHole = Math.abs(Math.sin(am) * R) < HW;
    // Lower band (0 to 1.3 m): skipped where the hollow passes through (front and back), roof filled above it.
    if (!inHole) oquad(g, p(0, R * 1.08, a0), p(0, R * 1.08, a1), p(1.3, R, a1), p(1.3, R, a0), out, bark(out, k));
    else oquad(g, p(hole(Math.sin(a0) * R), R * 1.02, a0), p(hole(Math.sin(a1) * R), R * 1.02, a1), p(1.3, R, a1), p(1.3, R, a0), out, bark(out, k));
    const ys = [1.3, 4, 9, H], rs = [R, R * 0.93, R * 0.84, R * 0.66];
    for (let s = 0; s < 3; s++) oquad(g, p(ys[s], rs[s], a0), p(ys[s], rs[s], a1), p(ys[s + 1], rs[s + 1], a1), p(ys[s + 1], rs[s + 1], a0), out, bark(out, k + s));
  }
  // The hollow: dark inner walls and an arched roof, running through along z.
  const dark = shade(col(F.barkDark), 0.45), darker = shade(col(F.barkDark), 0.3);
  const L = R * 1.05;
  for (const sx of [-1, 1]) oquad(g, new THREE.Vector3(sx * HW, 0, -L), new THREE.Vector3(sx * HW, 0, L), new THREE.Vector3(sx * HW, hole(sx * HW * 0.98), L), new THREE.Vector3(sx * HW, hole(sx * HW * 0.98), -L), new THREE.Vector3(-sx, 0, 0), dark);
  const M = 6;
  for (let i = 0; i < M; i++) {
    const x0 = -HW + (2 * HW * i) / M, x1 = -HW + (2 * HW * (i + 1)) / M;
    oquad(g, new THREE.Vector3(x0, hole(x0), -L), new THREE.Vector3(x1, hole(x1), -L), new THREE.Vector3(x1, hole(x1), L), new THREE.Vector3(x0, hole(x0), L), new THREE.Vector3(0, -1, 0), darker);
  }
  // The rim of the opening, pale wood, so the hole reads from far away.
  for (const sz of [-1, 1]) for (let i = 0; i < M; i++) {
    const x0 = -HW + (2 * HW * i) / M, x1 = -HW + (2 * HW * (i + 1)) / M;
    const z = sz * L * 0.99;
    oquad(g, new THREE.Vector3(x0, hole(x0), z), new THREE.Vector3(x1, hole(x1), z), new THREE.Vector3(x1, hole(x1) + 0.09, z), new THREE.Vector3(x0, hole(x0) + 0.09, z), new THREE.Vector3(0, 0, sz), col(F.barkLight).lerp(col(0xe2c49a), 0.35));
  }
  // Version 3: real roots at the corners, clear of the hollow; otherwise flat wedges.
  if (RICH()) roots(g, R, 4, 0.9, rng, (a) => Math.abs(Math.sin(a)) * R * 1.6 < HW + 0.2);
  for (const a of RICH() ? [] : [0.9, 2.25, 4.05, 5.4]) {
    const out = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    const side = new THREE.Vector3(out.z, 0, -out.x);
    const base = out.clone().multiplyScalar(R * 0.95), tip = out.clone().multiplyScalar(R * 1.7).setY(0.02), top = out.clone().multiplyScalar(R).setY(1.0);
    otri(g, base.clone().addScaledVector(side, 0.2), tip, top, side, bark(side, 1));
    otri(g, base.clone().addScaledVector(side, -0.2), top, tip, side.clone().negate(), bark(side.clone().negate(), 2));
  }
  void rng;
  return built(g);
}

/** Slide (all lanes): a big fallen trunk propped across the trail on its root plate and a broken stump, with moss
 * hanging off it. Its underside is ~1 m up (collision from 0.72) and its top well above any jump, so it reads as
 * something to duck under, never to hop (owner playtest 5). */
function proppedTrunk(): THREE.BufferGeometry {
  const g = new GeomBuilder();
  const rng = new Rng(83);
  const r = 0.52, cy = 1.52;
  log(g, new THREE.Vector3(0, cy, 0), new THREE.Vector3(1, 0.04, 0), 7.6, r, 10, rng, false);
  // Root plate on the left: a broad disc of roots and soil standing on edge.
  const rp = new THREE.Vector3(-3.9, 1.5, 0);
  for (let k = 0; k < 12; k++) {
    const a0 = (k / 12) * Math.PI * 2, a1 = ((k + 1) / 12) * Math.PI * 2;
    const q = (a: number, rr: number) => rp.clone().add(new THREE.Vector3(0, Math.sin(a) * rr, Math.cos(a) * rr));
    oquad(g, q(a0, 0.3), q(a1, 0.3), q(a1, 1.35), q(a0, 1.35), new THREE.Vector3(1, 0, 0), shade(mix(F.litterDark, F.bark, 0.4), 0.9 + 0.15 * Math.sin(k * 2.3)));
    oquad(g, q(a0, 0.3), q(a1, 0.3), q(a1, 1.35), q(a0, 1.35), new THREE.Vector3(-1, 0, 0), shade(col(F.litterDark), 0.8));
  }
  // A broken stump under the right end, the trunk resting on it.
  for (let k = 0; k < 8; k++) {
    const a0 = (k / 8) * Math.PI * 2, a1 = ((k + 1) / 8) * Math.PI * 2;
    const p = (a: number, y: number, rr: number) => new THREE.Vector3(3.55 + Math.cos(a) * rr, y, Math.sin(a) * rr);
    const out = new THREE.Vector3(Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2));
    oquad(g, p(a0, 0, 0.55), p(a1, 0, 0.55), p(a1, cy - r + 0.05 + (k % 3) * 0.06, 0.45), p(a0, cy - r + 0.05 + ((k + 2) % 3) * 0.06, 0.45), out, bark(out, k));
  }
  // Hanging moss: strands under the trunk (ending well above the slide line).
  for (let k = 0; k < 16; k++) {
    const x = -3.1 + k * 0.4 + rng.range(-0.1, 0.1);
    const top = new THREE.Vector3(x, cy - r * 0.9, rng.range(-0.15, 0.15)), len = rng.range(0.1, 0.24);
    oquad(g, top.clone().add(new THREE.Vector3(-0.04, 0, 0)), top.clone().add(new THREE.Vector3(0.04, 0, 0)), top.clone().add(new THREE.Vector3(0.01, -len, 0)), top.clone().add(new THREE.Vector3(-0.01, -len, 0)), new THREE.Vector3(0, 0, 1), mix(F.moss, F.mossLight, rng.next()));
  }
  return built(g);
}

/** Fork: a huge fallen tree lying down the middle lane from z = 0 to -len; its root plate faces the runner. */
function fallenGiant(len: number): THREE.BufferGeometry {
  const g = new GeomBuilder();
  const rng = new Rng(Math.round(len * 10) + 7);
  const r = 0.92;
  log(g, new THREE.Vector3(0, r * 0.95, -len / 2 - 0.3), new THREE.Vector3(0, 0, -1), len - 0.6, r, 12, rng, false);
  // Root plate: a tall oval of roots and soil (narrower than the lane gap either side), tilted back a little.
  const rp = new THREE.Vector3(0, 1.45, 0.1);
  const W = 0.95, Hh = 1.55;
  for (let k = 0; k < 16; k++) {
    const a0 = (k / 16) * Math.PI * 2, a1 = ((k + 1) / 16) * Math.PI * 2;
    const q = (a: number, s: number, dz = 0) => rp.clone().add(new THREE.Vector3(Math.cos(a) * W * s, Math.max(-1.45, Math.sin(a) * Hh * s), dz));
    const tone = shade(mix(F.litterDark, F.bark, 0.35 + 0.25 * Math.sin(k * 1.9)), 0.95);
    oquad(g, q(a0, 0.25), q(a1, 0.25), q(a1, 1), q(a0, 1), new THREE.Vector3(0, 0, 1), tone);
    oquad(g, q(a0, 1), q(a1, 1), q(a1, 1, -0.5), q(a0, 1, -0.5), new THREE.Vector3(Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2), 0), shade(col(F.litterDark), 0.85));
    otri(g, rp, q(a0, 0.25), q(a1, 0.25), new THREE.Vector3(0, 0, 1), shade(col(F.barkDark), 0.8));
  }
  // Root ends sticking out of the plate.
  for (let k = 0; k < 9; k++) {
    const a = rng.range(0, 6.28), s = rng.range(0.5, 0.95);
    const b = rp.clone().add(new THREE.Vector3(Math.cos(a) * W * s, Math.max(-1.3, Math.sin(a) * Hh * s), 0.05));
    const tip = b.clone().add(new THREE.Vector3(Math.cos(a) * 0.25, Math.sin(a) * 0.25, rng.range(0.2, 0.45)));
    const side = new THREE.Vector3(-Math.sin(a), Math.cos(a), 0).multiplyScalar(0.05);
    otri(g, b.clone().add(side), b.clone().sub(side), tip, new THREE.Vector3(0, 0, 1), col(F.bark));
  }
  // Moss along its top and a few broken branch stubs.
  for (let z = -1.5; z > -len + 1; z -= rng.range(3, 6)) {
    const s0 = new THREE.Vector3(rng.range(-0.3, 0.3), r * 1.7, z), s1 = s0.clone().add(new THREE.Vector3(rng.range(-0.4, 0.4), rng.range(0.5, 0.9), rng.range(-0.3, 0.3)));
    for (let k = 0; k < 4; k++) {
      const a0 = (k / 4) * Math.PI * 2, a1 = ((k + 1) / 4) * Math.PI * 2;
      const o = (a: number, rr: number) => new THREE.Vector3(Math.cos(a) * rr, 0, Math.sin(a) * rr);
      oquad(g, s0.clone().add(o(a0, 0.07)), s0.clone().add(o(a1, 0.07)), s1.clone().add(o(a1, 0.03)), s1.clone().add(o(a0, 0.03)), o((a0 + a1) / 2, 1), col(F.bark));
    }
  }
  return built(g);
}

const GEOMS = new Map<string, THREE.BufferGeometry>();
const EMPTY = new THREE.BufferGeometry();
/** Forest obstacle geometry (cached per type, variant and length). */
export function forestHazardGeometry(type: HazardType, variant = 0, len = 0): THREE.BufferGeometry {
  if (type === 'gully' || type === 'nester' || type === 'wanderer' || type === 'pterosaur') return EMPTY;
  const key = type === 'spine' ? `spine${Math.round(len * 10)}` : type === 'boulder' ? `boulder${variant % 3}` : type;
  if (!GEOMS.has(key)) {
    GEOMS.set(key, type === 'boulder' ? blocker(variant % 3) : type === 'ledge' ? fallenLog() : type === 'arch' ? hollowTrunk() : type === 'ribArch' ? proppedTrunk() : fallenGiant(len));
  }
  return GEOMS.get(key)!;
}
