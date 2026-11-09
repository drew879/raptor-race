import * as THREE from 'three';
import { GeomBuilder } from '../geom';
import { MATS } from '../materials';
import { col, mix, shade, type RaptorPlumage } from '../palette';

/** Bone table. Rest positions in model space (meters). Raptor faces -Z, +X is its right side. */
export const BONE_DEFS = [
  ['root', -1, [0, 0, 0]],
  ['pelvis', 0, [0, 0.67, 0]],
  ['chest', 1, [0, 0.69, -0.24]],
  ['neck1', 2, [0, 0.76, -0.44]],
  ['neck2', 3, [0, 0.87, -0.57]],
  ['head', 4, [0, 0.96, -0.66]],
  ['tail1', 1, [0, 0.68, 0.14]],
  ['tail2', 6, [0, 0.675, 0.38]],
  ['tail3', 7, [0, 0.67, 0.62]],
  ['tail4', 8, [0, 0.665, 0.86]],
  ['thighL', 1, [-0.1, 0.64, 0]],
  ['shinL', 10, [-0.11, 0.42, -0.08]],
  ['metaL', 11, [-0.11, 0.17, 0.06]],
  ['toeL', 12, [-0.11, 0.03, 0]],
  ['thighR', 1, [0.1, 0.64, 0]],
  ['shinR', 14, [0.11, 0.42, -0.08]],
  ['metaR', 15, [0.11, 0.17, 0.06]],
  ['toeR', 16, [0.11, 0.03, 0]],
  ['upperArmL', 2, [-0.15, 0.68, -0.33]],
  ['foreArmL', 18, [-0.205, 0.6, -0.24]],
  ['handL', 19, [-0.215, 0.62, -0.375]],
  ['upperArmR', 2, [0.15, 0.68, -0.33]],
  ['foreArmR', 21, [0.205, 0.6, -0.24]],
  ['handR', 22, [0.215, 0.62, -0.375]],
] as const;

export type BoneName = (typeof BONE_DEFS)[number][0];
export const B = Object.fromEntries(BONE_DEFS.map((d, i) => [d[0], i])) as Record<BoneName, number>;
export const restPos = (name: BoneName) => new THREE.Vector3(...(BONE_DEFS[B[name]][2] as unknown as [number, number, number]));

type Ring = { y: number; z: number; rx: number; ry: number; a: BoneName; b?: BoneName; w?: number; tag: 'snout' | 'head' | 'neck' | 'body' | 'tail' };

/** Body loft from snout to tail. Tip points are added at each end. */
const BODY: Ring[] = [
  { y: 0.968, z: -0.97, rx: 0.03, ry: 0.028, a: 'head', tag: 'snout' },
  { y: 0.966, z: -0.9, rx: 0.045, ry: 0.046, a: 'head', tag: 'snout' },
  { y: 0.97, z: -0.83, rx: 0.058, ry: 0.061, a: 'head', tag: 'snout' },
  { y: 0.982, z: -0.765, rx: 0.072, ry: 0.076, a: 'head', tag: 'head' },
  { y: 0.978, z: -0.7, rx: 0.078, ry: 0.08, a: 'head', tag: 'head' },
  { y: 0.948, z: -0.645, rx: 0.07, ry: 0.075, a: 'head', b: 'neck2', w: 0.5, tag: 'neck' },
  { y: 0.893, z: -0.59, rx: 0.07, ry: 0.078, a: 'neck2', tag: 'neck' },
  { y: 0.833, z: -0.53, rx: 0.078, ry: 0.088, a: 'neck2', b: 'neck1', w: 0.5, tag: 'neck' },
  { y: 0.773, z: -0.465, rx: 0.095, ry: 0.105, a: 'neck1', tag: 'neck' },
  { y: 0.725, z: -0.385, rx: 0.13, ry: 0.14, a: 'neck1', b: 'chest', w: 0.7, tag: 'body' },
  { y: 0.695, z: -0.28, rx: 0.18, ry: 0.168, a: 'chest', tag: 'body' },
  { y: 0.678, z: -0.16, rx: 0.19, ry: 0.172, a: 'chest', b: 'pelvis', w: 0.5, tag: 'body' },
  { y: 0.678, z: -0.04, rx: 0.172, ry: 0.156, a: 'pelvis', tag: 'body' },
  { y: 0.682, z: 0.07, rx: 0.14, ry: 0.124, a: 'pelvis', tag: 'body' },
  { y: 0.685, z: 0.19, rx: 0.106, ry: 0.088, a: 'pelvis', b: 'tail1', w: 0.6, tag: 'tail' },
  { y: 0.681, z: 0.33, rx: 0.082, ry: 0.066, a: 'tail1', tag: 'tail' },
  { y: 0.676, z: 0.49, rx: 0.057, ry: 0.05, a: 'tail1', b: 'tail2', w: 0.7, tag: 'tail' },
  { y: 0.671, z: 0.66, rx: 0.044, ry: 0.038, a: 'tail2', b: 'tail3', w: 0.6, tag: 'tail' },
  { y: 0.667, z: 0.83, rx: 0.032, ry: 0.028, a: 'tail3', b: 'tail4', w: 0.4, tag: 'tail' },
  { y: 0.663, z: 0.98, rx: 0.022, ry: 0.019, a: 'tail4', tag: 'tail' },
];
const SNOUT_TIP = new THREE.Vector3(0, 0.97, -1.015);
const TAIL_TIP = new THREE.Vector3(0, 0.66, 1.09);

const skinOf = (a: number, b = a, w = 0) => [a, b, 0, 0, 1 - w, w, 0, 0];

function ringFrame(t: THREE.Vector3) {
  const ref = Math.abs(t.y) > 0.9 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
  const side = new THREE.Vector3().crossVectors(ref, t).normalize();
  const up = new THREE.Vector3().crossVectors(t, side).normalize();
  return { side, up };
}

/** Generic tapered tube between points (for limbs). Rigid binding to one bone per segment. */
function limbTube(
  g: GeomBuilder,
  pts: THREE.Vector3[],
  radii: number[],
  bones: number[],
  n: number,
  colorFn: (seg: number, j: number, upness: number) => THREE.Color,
  capEnd = true,
) {
  const rings: THREE.Vector3[][] = [];
  for (let i = 0; i < pts.length; i++) {
    const t = new THREE.Vector3().subVectors(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]).normalize();
    const { side, up } = ringFrame(t);
    const ring: THREE.Vector3[] = [];
    for (let j = 0; j < n; j++) {
      const th = (j / n) * Math.PI * 2;
      ring.push(pts[i].clone().addScaledVector(side, Math.cos(th) * radii[i]).addScaledVector(up, Math.sin(th) * radii[i]));
    }
    rings.push(ring);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const s0 = skinOf(bones[i]);
    const s1 = skinOf(bones[Math.min(i + 1, bones.length - 1)]);
    for (let j = 0; j < n; j++) {
      const j1 = (j + 1) % n;
      const upness = Math.sin(((j + 0.5) / n) * Math.PI * 2);
      const c = colorFn(i, j, upness);
      g.quad(rings[i][j], rings[i][j1], rings[i + 1][j1], rings[i + 1][j], c, c, [s0, s0, s1, s1]);
    }
  }
  if (capEnd) {
    const last = rings.length - 1;
    const tip = pts[last];
    const s = skinOf(bones[Math.min(last, bones.length - 1)]);
    for (let j = 0; j < n; j++) g.tri(rings[last][j], rings[last][(j + 1) % n], tip, colorFn(last - 1, j, 0), [s, s, s]);
  }
}

/** Diamond feather shard with a colored tip band. Double-sided material renders both faces. */
function feather(
  g: GeomBuilder,
  base: THREE.Vector3,
  dir: THREE.Vector3,
  normal: THREE.Vector3,
  len: number,
  width: number,
  cBase: THREE.Color,
  cTip: THREE.Color,
  skin: number[],
) {
  const d = dir.clone().normalize();
  const s = new THREE.Vector3().crossVectors(d, normal).normalize();
  const p = (along: number, across: number) => base.clone().addScaledVector(d, len * along).addScaledVector(s, width * across);
  const lw = p(0.3, 0.5), rw = p(0.3, -0.5), ln = p(0.72, 0.3), rn = p(0.72, -0.3), tip = p(1, 0);
  const sk: [number[], number[], number[]] = [skin, skin, skin];
  g.tri(base, lw, rw, cBase, sk);
  g.tri(lw, ln, rn, cBase, sk);
  g.tri(lw, rn, rw, shade(cBase, 0.92), sk);
  g.tri(ln, tip, rn, cTip, sk);
}

export interface RaptorBuild {
  mesh: THREE.SkinnedMesh;
  bones: THREE.Bone[];
}

export function buildRaptor(pl: RaptorPlumage): RaptorBuild {
  const g = new GeomBuilder(true);
  const N = 8;
  const C = {
    base: col(pl.base),
    dark: col(pl.dark),
    light: col(pl.light),
    under: col(pl.under),
    accent: col(pl.accent),
    patch: col(pl.eyePatch),
    rim: col(pl.eyeRim),
    eye: col(pl.eye),
    claw: col(pl.claw),
    skin: col(pl.skin),
    baseLight: mix(pl.base, pl.light, 0.25),
    baseDark: mix(pl.base, pl.dark, 0.45),
    underWarm: mix(pl.under, pl.base, 0.2),
  };

  // ---------- Body loft ----------
  const centers = BODY.map((r) => new THREE.Vector3(0, r.y, r.z));
  const rings: THREE.Vector3[][] = [];
  const skins: number[][] = [];
  for (let i = 0; i < BODY.length; i++) {
    const r = BODY[i];
    const prev = i === 0 ? SNOUT_TIP : centers[i - 1];
    const next = i === BODY.length - 1 ? TAIL_TIP : centers[i + 1];
    const t = new THREE.Vector3().subVectors(next, prev).normalize();
    const { side, up } = ringFrame(t);
    const ring: THREE.Vector3[] = [];
    for (let j = 0; j < N; j++) {
      const th = (j / N) * Math.PI * 2;
      // Flatten the belly slightly and give the back a soft ridge.
      const s = Math.sin(th);
      const ry = r.ry * (s < 0 ? 0.92 : 1.0);
      ring.push(centers[i].clone().addScaledVector(side, Math.cos(th) * r.rx).addScaledVector(up, s * ry));
    }
    rings.push(ring);
    skins.push(skinOf(B[r.a], B[r.b ?? r.a], r.w ?? 0));
  }

  const bodyColor = (i: number, j: number): THREE.Color => {
    const r = BODY[i];
    const th = ((j + 0.5) / N) * Math.PI * 2;
    const s = Math.sin(th);
    const lateral = Math.abs(Math.cos(th)) > 0.7;
    if (r.tag === 'snout') {
      if (s > 0.3) return i === 0 ? C.dark : C.baseDark;
      if (s < -0.3) return C.under;
      return i === 0 ? C.dark : C.skin;
    }
    if (r.tag === 'head') {
      if (s > 0.6) return C.dark;
      if (s > 0 && lateral) return i === 3 ? C.patch : C.rim;
      if (s < -0.3) return C.under;
      return C.light;
    }
    if (s < -0.5) return r.tag === 'tail' ? C.underWarm : C.under;
    const band = i % 2 === 0;
    if (r.tag === 'tail') {
      // Bold bands read clearly from the chase camera.
      if (s > 0) return band ? C.light : C.dark;
      return band ? mix(pl.light, pl.under, 0.5) : C.baseDark;
    }
    if (r.tag === 'neck') {
      if (s > 0.5) return C.dark;
      if (s > 0) return C.base;
      return C.underWarm;
    }
    // Body: dark banded back over a pale belly, with a light flank streak.
    if (s > 0.5) return band ? C.base : C.dark;
    if (s > 0) return band ? C.baseLight : C.base;
    return lateral && i > 9 && i < 13 ? C.light : C.underWarm;
  };

  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < N; j++) {
      const j1 = (j + 1) % N;
      const c = bodyColor(i, j);
      g.quad(rings[i][j], rings[i][j1], rings[i + 1][j1], rings[i + 1][j], c, c, [skins[i], skins[i], skins[i + 1], skins[i + 1]]);
    }
  }
  // End caps.
  const sHead = skinOf(B.head);
  for (let j = 0; j < N; j++) g.tri(rings[0][(j + 1) % N], rings[0][j], SNOUT_TIP, C.dark, [sHead, sHead, sHead]);
  const last = rings.length - 1;
  const sT4 = skinOf(B.tail4);
  for (let j = 0; j < N; j++) g.tri(rings[last][j], rings[last][(j + 1) % N], TAIL_TIP, C.dark, [sT4, sT4, sT4]);

  // ---------- Eyes ----------
  for (const sx of [-1, 1]) {
    const c0 = new THREE.Vector3(sx * 0.07, 1.005, -0.77);
    const nrm = new THREE.Vector3(sx, 0.2, -0.3).normalize();
    const { side, up } = ringFrame(nrm);
    const ring = (rad: number, out: number) =>
      Array.from({ length: 6 }, (_, k) => {
        const th = (k / 6) * Math.PI * 2;
        return c0.clone().addScaledVector(nrm, out).addScaledVector(side, Math.cos(th) * rad).addScaledVector(up, Math.sin(th) * rad);
      });
    const outer = ring(0.022, 0.0), iris = ring(0.017, 0.006), pupil = ring(0.007, 0.0085);
    const ctr = c0.clone().addScaledVector(nrm, 0.009);
    const sk: [number[], number[], number[]] = [sHead, sHead, sHead];
    for (let k = 0; k < 6; k++) {
      const k1 = (k + 1) % 6;
      const a = sx > 0 ? k : k1, b = sx > 0 ? k1 : k;
      g.quad(outer[a], outer[b], iris[b], iris[a], C.dark, C.dark, [sHead, sHead, sHead, sHead]);
      g.quad(iris[a], iris[b], pupil[b], pupil[a], C.eye, C.eye, [sHead, sHead, sHead, sHead]);
      g.tri(pupil[a], pupil[b], ctr, C.dark, sk);
    }
    // Glint
    const gl = c0.clone().addScaledVector(nrm, 0.0095).addScaledVector(up, 0.006).addScaledVector(side, 0.004);
    g.tri(gl, gl.clone().addScaledVector(up, 0.004), gl.clone().addScaledVector(side, sx * 0.004), col(0xfff6e6), sk);
  }

  // ---------- Feathers: crest, neck ruff, back, tail fan ----------
  const upV = new THREE.Vector3(0, 1, 0);
  const crest: Array<[number, number, number, number, BoneName]> = [
    // z, y, length, tilt-back, bone
    [-0.73, 1.05, 0.07, 1.0, 'head'],
    [-0.68, 1.05, 0.09, 1.05, 'head'],
    [-0.63, 1.02, 0.1, 1.1, 'neck2'],
    [-0.575, 0.97, 0.1, 1.15, 'neck2'],
    [-0.52, 0.915, 0.1, 1.2, 'neck1'],
  ];
  for (const [z, y, len, tilt, bone] of crest) {
    const dir = new THREE.Vector3(0, Math.cos(tilt), Math.sin(tilt));
    feather(g, new THREE.Vector3(0, y, z), dir, new THREE.Vector3(1, 0, 0), len, 0.035, C.dark, C.accent, skinOf(B[bone]));
  }
  // Neck ruff: shards around the base of the neck, pointing back.
  for (let k = 0; k < 7; k++) {
    const th = Math.PI * (0.05 + (k / 6) * 0.9);
    const base = new THREE.Vector3(Math.cos(th) * 0.11, 0.74 + Math.sin(th) * 0.115, -0.42);
    const dir = new THREE.Vector3(Math.cos(th) * 0.5, Math.sin(th) * 0.4, 1).normalize();
    const nrm = new THREE.Vector3(-Math.sin(th), Math.cos(th), 0);
    feather(g, base, dir, nrm, 0.12, 0.05, k % 2 ? C.base : C.baseDark, k % 2 ? C.light : C.dark, skinOf(B.neck1, B.chest, 0.3));
  }
  // Back ridge shards, lying almost flat.
  for (let k = 0; k < 4; k++) {
    const z = -0.3 + k * 0.11;
    const y = 0.86 - k * 0.012 - (k > 1 ? (k - 1) * 0.022 : 0);
    const bone = k < 2 ? 'chest' : 'pelvis';
    feather(g, new THREE.Vector3(0, y - 0.012, z), new THREE.Vector3(0, 0.28, 1), new THREE.Vector3(1, 0, 0), 0.09, 0.05, C.dark, C.base, skinOf(B[bone]));
  }
  // Tail fan: pairs of shards spreading outward, longest near the tip.
  const fan: Array<[number, number, BoneName, number]> = [
    [0.5, 0.672, 'tail2', 0.14],
    [0.62, 0.67, 'tail2', 0.17],
    [0.74, 0.668, 'tail3', 0.2],
    [0.86, 0.666, 'tail3', 0.22],
    [0.97, 0.663, 'tail4', 0.24],
    [1.06, 0.661, 'tail4', 0.24],
  ];
  fan.forEach(([z, y, bone, len], k) => {
    for (const sx of [-1, 1]) {
      const spread = 0.42 + k * 0.07;
      const dir = new THREE.Vector3(sx * Math.sin(spread), 0.04, Math.cos(spread));
      const base = new THREE.Vector3(sx * 0.015, y + 0.005, z);
      feather(g, base, dir, upV, len, 0.085, k % 2 ? C.base : C.dark, k >= 3 ? C.accent : C.light, skinOf(B[bone]));
    }
  });
  feather(g, TAIL_TIP.clone().add(new THREE.Vector3(0, 0, -0.04)), new THREE.Vector3(0, 0.02, 1), upV, 0.2, 0.08, C.dark, C.accent, skinOf(B.tail4));

  // ---------- Legs ----------
  for (const side of ['L', 'R'] as const) {
    const sx = side === 'L' ? -1 : 1;
    const H = restPos(`thigh${side}`), K = restPos(`shin${side}`), A = restPos(`meta${side}`), F = restPos(`toe${side}`);
    const bT = B[`thigh${side}`], bS = B[`shin${side}`], bM = B[`meta${side}`], bToe = B[`toe${side}`];
    const hipTop = H.clone().add(new THREE.Vector3(sx * 0.015, 0.05, 0.02));
    // Thigh: thick feathered drumstick.
    limbTube(g, [hipTop, H.clone().lerp(K, 0.5).add(new THREE.Vector3(sx * 0.012, 0, -0.01)), K], [0.09, 0.08, 0.045], [bT, bT, bT], 7, (_s, j, up) =>
      up > 0.4 ? C.baseDark : j % 3 === 0 ? C.light : C.base, false);
    // Thigh "trousers": downward shards.
    for (let k = 0; k < 5; k++) {
      const th = Math.PI * 2 * (k / 5) + 0.3;
      const base = H.clone().lerp(K, 0.7).add(new THREE.Vector3(Math.cos(th) * 0.045, 0, Math.sin(th) * 0.045));
      const dir = new THREE.Vector3(Math.cos(th) * 0.3, -1, 0.35 + Math.sin(th) * 0.3).normalize();
      feather(g, base, dir, new THREE.Vector3(-Math.sin(th), 0, Math.cos(th)), 0.09, 0.045, C.base, C.dark, skinOf(bT));
    }
    // Shin (knee to ankle), metatarsus (ankle to ball).
    limbTube(g, [K, K.clone().lerp(A, 0.5), A], [0.038, 0.03, 0.022], [bS, bS, bS], 6, (_s, _j, up) => (up > 0 ? C.base : C.baseDark), false);
    limbTube(g, [A, A.clone().lerp(F, 0.5), F], [0.022, 0.019, 0.017], [bM, bM, bM], 6, () => C.skin, false);
    // Toes III and IV forward, with dark claw tips.
    for (const off of [-0.012, 0.016]) {
      const t0 = F.clone().add(new THREE.Vector3(sx * off, -0.005, 0));
      const t1 = t0.clone().add(new THREE.Vector3(sx * off * 0.6, -0.015, -0.07));
      const t2 = t1.clone().add(new THREE.Vector3(0, -0.01, -0.035));
      limbTube(g, [t0, t1, t2], [0.014, 0.01, 0.0], [bToe, bToe, bToe], 5, (seg) => (seg === 0 ? C.skin : C.claw), false);
    }
    // Digit II with the raised sickle claw.
    const d0 = F.clone().add(new THREE.Vector3(-sx * 0.014, 0.0, -0.005));
    const d1 = d0.clone().add(new THREE.Vector3(-sx * 0.006, 0.02, -0.035));
    const c1 = d1.clone().add(new THREE.Vector3(0, 0.035, -0.02));
    const c2 = c1.clone().add(new THREE.Vector3(0, 0.012, -0.04));
    const c3 = c2.clone().add(new THREE.Vector3(0, -0.025, -0.03));
    limbTube(g, [d0, d1, c1, c2, c3], [0.013, 0.011, 0.01, 0.006, 0.0], [bToe, bToe, bToe, bToe, bToe], 5, (seg) => (seg === 0 ? C.skin : C.claw), false);
  }

  // ---------- Arms with folded wing feathers ----------
  for (const side of ['L', 'R'] as const) {
    const sx = side === 'L' ? -1 : 1;
    const S = restPos(`upperArm${side}`), E = restPos(`foreArm${side}`), W = restPos(`hand${side}`);
    const bU = B[`upperArm${side}`], bF = B[`foreArm${side}`], bH = B[`hand${side}`];
    const tipH = W.clone().add(new THREE.Vector3(sx * 0.005, -0.03, -0.06));
    limbTube(g, [S, E], [0.03, 0.024], [bU, bU], 6, (_s, j) => (j % 2 ? C.base : C.baseDark), false);
    limbTube(g, [E, W], [0.024, 0.017], [bF, bF], 6, () => C.base, false);
    limbTube(g, [W, tipH], [0.016, 0.0], [bH, bH], 5, () => C.claw, false);
    // Wing feathers lying along the flank, pointing back. Plane normal faces outward.
    const nrm = new THREE.Vector3(sx, 0.15, 0).normalize();
    const nF = 6;
    for (let k = 0; k < nF; k++) {
      const t = k / (nF - 1);
      const onHand = t > 0.6;
      const base = onHand ? W.clone().lerp(tipH, (t - 0.6) / 0.4) : E.clone().lerp(W, t / 0.6);
      base.x += sx * 0.012;
      const len = 0.2 + t * 0.14;
      const dir = new THREE.Vector3(sx * 0.12, -0.3 + t * 0.12, 1).normalize();
      feather(g, base, dir, nrm, len, 0.07, k % 2 ? C.base : C.dark, t > 0.45 ? C.accent : C.light, skinOf(onHand ? bH : bF));
    }
  }

  const geometry = g.build();

  // Skeleton
  const bones: THREE.Bone[] = [];
  BONE_DEFS.forEach(([name, parentIdx, p]) => {
    const parent = parentIdx as number;
    const b = new THREE.Bone();
    b.name = name;
    const pos = new THREE.Vector3(...(p as unknown as [number, number, number]));
    if (parent >= 0) {
      const pp = new THREE.Vector3(...((BONE_DEFS[parent] as (typeof BONE_DEFS)[number])[2] as unknown as [number, number, number]));
      b.position.copy(pos.sub(pp));
      bones[parent].add(b);
    } else b.position.copy(pos);
    bones.push(b);
  });
  const skeleton = new THREE.Skeleton(bones);
  const mesh = new THREE.SkinnedMesh(geometry, MATS.character);
  mesh.add(bones[0]);
  mesh.bind(skeleton);
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  mesh.name = 'raptor';
  return { mesh, bones };
}
