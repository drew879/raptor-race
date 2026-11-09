import * as THREE from 'three';
import { GeomBuilder, jitterGeometry } from '../geom';
import { GOBI, col, mix, shade } from '../palette';
import { Rng } from '../../core/rng';

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

export function addRock(g: GeomBuilder, pos: THREE.Vector3, size: number, rng: Rng, base = mix(GOBI.sandShadow, GOBI.cliffRed, 0.35)) {
  const geo = jitterGeometry(ICO.clone(), 0.35, () => rng.next());
  const s = new THREE.Vector3(size * rng.range(0.8, 1.3), size * rng.range(0.5, 0.8), size * rng.range(0.8, 1.2));
  g.appendGeometry(geo, xform(pos, s, rng.range(0, 6.28), rng.range(-0.2, 0.2), rng.range(-0.2, 0.2)), (_i, _c, n) => faceTone(base, n, rng));
  geo.dispose();
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
  const bone = col(GOBI.bone);
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
