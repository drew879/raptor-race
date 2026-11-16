import * as THREE from 'three';
import { GeomBuilder } from '../geom';
import { col, mix, shade, type RaptorPlumage } from '../palette';
import { B, BONE_DEFS, feather, limbTube, ringFrame, skinOf, skinned, type BoneName, type RaptorBuild } from '../raptor/model';
import { MATS } from '../materials';
import { lookAt } from '../look';

/**
 * Caudipteryx: a peacock-sized oviraptorosaur (Oviraptor's cousin). Short deep skull with a stubby beak, a long
 * S-curved neck, a plump body, long running legs, short arms with a fan of banded feathers on each hand, and a
 * banded fan at the tail tip. Same bones as the raptor (so it shares every animation), its own proportions.
 * Scaled up a little from life (hips ~0.6 m) so it reads from the chase camera. Faces -Z, +X is its right.
 */
const REST: Record<BoneName, [number, number, number]> = {
  root: [0, 0, 0],
  pelvis: [0, 0.6, 0],
  chest: [0, 0.64, -0.2],
  neck1: [0, 0.74, -0.31],
  neck2: [0, 0.9, -0.38],
  head: [0, 1.04, -0.42],
  tail1: [0, 0.62, 0.12],
  tail2: [0, 0.625, 0.27],
  tail3: [0, 0.63, 0.4],
  tail4: [0, 0.635, 0.52],
  thighL: [-0.09, 0.58, 0],
  shinL: [-0.1, 0.36, -0.07],
  metaL: [-0.1, 0.16, 0.06],
  toeL: [-0.1, 0.03, 0],
  thighR: [0.09, 0.58, 0],
  shinR: [0.1, 0.36, -0.07],
  metaR: [0.1, 0.16, 0.06],
  toeR: [0.1, 0.03, 0],
  upperArmL: [-0.11, 0.66, -0.27],
  foreArmL: [-0.15, 0.6, -0.2],
  handL: [-0.16, 0.6, -0.3],
  upperArmR: [0.11, 0.66, -0.27],
  foreArmR: [0.15, 0.6, -0.2],
  handR: [0.16, 0.6, -0.3],
};
export const caudRest = (name: BoneName) => new THREE.Vector3(...REST[name]);
void BONE_DEFS;

type Ring = { y: number; z: number; rx: number; ry: number; a: BoneName; b?: BoneName; w?: number; tag: 'beak' | 'head' | 'neck' | 'body' | 'tail' };
const BODY: Ring[] = [
  { y: 1.02, z: -0.56, rx: 0.014, ry: 0.016, a: 'head', tag: 'beak' },
  { y: 1.026, z: -0.54, rx: 0.026, ry: 0.03, a: 'head', tag: 'beak' },
  { y: 1.035, z: -0.52, rx: 0.042, ry: 0.05, a: 'head', tag: 'head' },
  { y: 1.045, z: -0.48, rx: 0.054, ry: 0.06, a: 'head', tag: 'head' },
  { y: 1.045, z: -0.44, rx: 0.052, ry: 0.058, a: 'head', tag: 'head' },
  { y: 1.02, z: -0.41, rx: 0.04, ry: 0.044, a: 'head', b: 'neck2', w: 0.5, tag: 'neck' },
  { y: 0.95, z: -0.395, rx: 0.038, ry: 0.044, a: 'neck2', tag: 'neck' },
  { y: 0.87, z: -0.37, rx: 0.044, ry: 0.05, a: 'neck2', b: 'neck1', w: 0.5, tag: 'neck' },
  { y: 0.79, z: -0.335, rx: 0.056, ry: 0.064, a: 'neck1', tag: 'neck' },
  { y: 0.72, z: -0.27, rx: 0.1, ry: 0.11, a: 'neck1', b: 'chest', w: 0.7, tag: 'body' },
  { y: 0.67, z: -0.19, rx: 0.14, ry: 0.15, a: 'chest', tag: 'body' },
  { y: 0.645, z: -0.09, rx: 0.152, ry: 0.158, a: 'chest', b: 'pelvis', w: 0.5, tag: 'body' },
  { y: 0.63, z: 0.0, rx: 0.138, ry: 0.138, a: 'pelvis', tag: 'body' },
  { y: 0.628, z: 0.09, rx: 0.108, ry: 0.1, a: 'pelvis', tag: 'body' },
  { y: 0.625, z: 0.19, rx: 0.074, ry: 0.064, a: 'pelvis', b: 'tail1', w: 0.6, tag: 'tail' },
  { y: 0.627, z: 0.31, rx: 0.05, ry: 0.044, a: 'tail1', b: 'tail2', w: 0.6, tag: 'tail' },
  { y: 0.63, z: 0.43, rx: 0.034, ry: 0.03, a: 'tail2', b: 'tail3', w: 0.6, tag: 'tail' },
  { y: 0.633, z: 0.53, rx: 0.022, ry: 0.02, a: 'tail3', b: 'tail4', w: 0.5, tag: 'tail' },
];
const BEAK_TIP = new THREE.Vector3(0, 1.012, -0.58);
const TAIL_TIP = new THREE.Vector3(0, 0.636, 0.6);

const BACK = new THREE.Vector3(0, 1, 1).normalize();
function backFrame(t: THREE.Vector3) {
  const side = new THREE.Vector3().crossVectors(BACK, t).normalize();
  const up = new THREE.Vector3().crossVectors(t, side).normalize();
  return { side, up };
}

/** A long feather as a strip of bands (dark, light, dark, light tip): the banded fans read from far away. */
function bandedFeather(g: GeomBuilder, base: THREE.Vector3, dir: THREE.Vector3, normal: THREE.Vector3, len: number, width: number, dark: THREE.Color, light: THREE.Color, skin: number[]) {
  const d = dir.clone().normalize();
  const s = new THREE.Vector3().crossVectors(d, normal).normalize();
  const p = (along: number, across: number) => base.clone().addScaledVector(d, len * along).addScaledVector(s, width * across);
  const stops = [0, 0.32, 0.5, 0.68, 0.84, 1];
  // Version 2: broader, with a rounded tip.
  const half = lookAt(2)
    ? (u: number) => (u < 0.2 ? 0.3 + u * 1.8 : u > 0.8 ? 0.62 * Math.sqrt(Math.max(0, 1 - ((u - 0.8) / 0.2) ** 2)) : 0.62)
    : (u: number) => (u < 0.2 ? 0.25 + u * 1.5 : u > 0.85 ? (1 - u) * 3 : 0.5);
  const sk: [number[], number[], number[]] = [skin, skin, skin];
  for (let k = 0; k < stops.length - 1; k++) {
    const u0 = stops[k], u1 = stops[k + 1];
    const c = k % 2 === 0 ? dark : light;
    const a = p(u0, half(u0)), b = p(u0, -half(u0)), cc = p(u1, -half(u1)), dd = p(u1, half(u1));
    if (k === stops.length - 2) g.tri(a, b, p(1, 0), c, sk);
    else { g.tri(a, b, cc, c, sk); g.tri(a, cc, dd, shade(c, 0.94), sk); }
  }
}

export function buildCaudipteryx(pl: RaptorPlumage): RaptorBuild {
  const g = new GeomBuilder(true);
  const N = 10;
  const C = {
    base: col(pl.base), dark: col(pl.dark), light: col(pl.light), under: col(pl.under), accent: col(pl.accent),
    mask: col(pl.eyePatch), ring: col(pl.eyeRim), eye: col(pl.eye), claw: col(pl.claw), skin: col(pl.skin),
    baseLight: mix(pl.base, pl.light, 0.22), baseDark: mix(pl.base, pl.dark, 0.5), belly: mix(pl.under, 0xffffff, 0.25),
  };

  // ---------- Body loft ----------
  const centers = BODY.map((r) => new THREE.Vector3(0, r.y, r.z));
  const rings: THREE.Vector3[][] = [];
  const skins: number[][] = [];
  for (let i = 0; i < BODY.length; i++) {
    const r = BODY[i];
    const prev = i === 0 ? BEAK_TIP : centers[i - 1];
    const next = i === BODY.length - 1 ? TAIL_TIP : centers[i + 1];
    const t = new THREE.Vector3().subVectors(next, prev).normalize();
    // Version 2: a frame whose "back" faces up-and-back, so on the near-vertical neck the dark nape faces the
    // chase camera (version 1's frame flipped there and showed the pale throat from behind).
    const { side, up } = lookAt(2) ? backFrame(t) : ringFrame(t);
    const ring: THREE.Vector3[] = [];
    for (let j = 0; j < N; j++) {
      const th = (j / N) * Math.PI * 2;
      const s = Math.sin(th);
      ring.push(centers[i].clone().addScaledVector(side, Math.cos(th) * r.rx).addScaledVector(up, s * r.ry * (s < 0 ? 0.94 : 1)));
    }
    rings.push(ring);
    skins.push(skinOf(B[r.a], B[r.b ?? r.a], r.w ?? 0));
  }
  const bodyColor = (i: number, j: number): THREE.Color => {
    const r = BODY[i];
    const s = Math.sin(((j + 0.5) / N) * Math.PI * 2);
    const spine = j === 2, back = j === 1 || j === 3, upper = j === 0 || j === 4, lower = j === 9 || j === 5;
    if (r.tag === 'beak') return s < -0.3 ? shade(C.accent, 0.82) : C.accent;
    if (r.tag === 'head') {
      if (spine || back) return C.baseDark; // dark crown
      if (upper) return i === 3 ? C.mask : C.base;
      if (lower) return C.light; // pale cheeks
      return C.belly;
    }
    if (r.tag === 'neck') return s < -0.3 ? C.belly : lower ? C.light : spine ? C.baseDark : C.base;
    if (s < -0.6) return C.belly;
    if (spine) return C.baseDark;
    if (back) return C.base;
    if (upper) return r.tag === 'tail' ? C.base : C.baseLight;
    if (lower) return C.under;
    return C.belly;
  };
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < N; j++) {
      const j1 = (j + 1) % N;
      const c = bodyColor(i, j);
      g.quad(rings[i][j], rings[i][j1], rings[i + 1][j1], rings[i + 1][j], c, c, [skins[i], skins[i], skins[i + 1], skins[i + 1]]);
    }
  }
  const sHead = skinOf(B.head);
  for (let j = 0; j < N; j++) g.tri(rings[0][(j + 1) % N], rings[0][j], BEAK_TIP, shade(C.accent, 0.9), [sHead, sHead, sHead]);
  const last = rings.length - 1;
  const sT4 = skinOf(B.tail4);
  for (let j = 0; j < N; j++) g.tri(rings[last][j], rings[last][(j + 1) % N], TAIL_TIP, C.dark, [sT4, sT4, sT4]);

  // ---------- Eyes: big, round, with a bright ring (appeal: this is the kids' level) ----------
  for (const sx of [-1, 1]) {
    const c0 = new THREE.Vector3(sx * 0.047, 1.058, -0.478);
    const nrm = new THREE.Vector3(sx, 0.15, -0.3).normalize();
    const { side, up } = ringFrame(nrm);
    const E = 12;
    const ring = (rad: number, out: number) => Array.from({ length: E }, (_, k) => {
      const th = (k / E) * Math.PI * 2;
      return c0.clone().addScaledVector(nrm, out).addScaledVector(side, Math.cos(th) * rad).addScaledVector(up, Math.sin(th) * rad);
    });
    const outer = ring(0.026, -0.002), iris = ring(0.02, 0.003), pupil = ring(0.011, 0.0045);
    const ctr = c0.clone().addScaledVector(nrm, 0.005);
    const sk4: [number[], number[], number[], number[]] = [sHead, sHead, sHead, sHead], sk3: [number[], number[], number[]] = [sHead, sHead, sHead];
    for (let k = 0; k < E; k++) {
      const k1 = (k + 1) % E;
      const a = sx > 0 ? k : k1, b = sx > 0 ? k1 : k;
      g.quad(outer[a], outer[b], iris[b], iris[a], C.ring, C.ring, sk4);
      g.quad(iris[a], iris[b], pupil[b], pupil[a], C.eye, C.eye, sk4);
      g.tri(pupil[a], pupil[b], ctr, C.dark, sk3);
    }
    const glc = c0.clone().addScaledVector(nrm, 0.006).addScaledVector(up, 0.008).addScaledVector(side, -sx * 0.006);
    const gl = (dx: number, dy: number) => glc.clone().addScaledVector(side, dx).addScaledVector(up, dy);
    g.tri(gl(-0.005, -0.005), sx > 0 ? gl(0.005, -0.005) : gl(0, 0.006), sx > 0 ? gl(0, 0.006) : gl(0.005, -0.005), col(0xfffaf0), sk3);
  }

  // ---------- Feathers ----------
  // A fluffy crest on the crown.
  for (const [z, y, len, tilt] of [[-0.47, 1.1, 0.09, 1.2], [-0.44, 1.1, 0.11, 1.35], [-0.415, 1.085, 0.1, 1.5]] as const) {
    feather(g, new THREE.Vector3(0, y, z), new THREE.Vector3(0, Math.cos(tilt), Math.sin(tilt)), new THREE.Vector3(1, 0, 0), len, 0.05, C.baseDark, C.accent, sHead);
  }
  // Neck ruff and back mantle: soft blades swept back.
  for (let k = 0; k < 7; k++) {
    const th = Math.PI * (0.05 + (k / 6) * 0.9);
    const base = new THREE.Vector3(Math.cos(th) * 0.07, 0.75 + Math.sin(th) * 0.07, -0.31);
    const dir = new THREE.Vector3(Math.cos(th) * 0.35, Math.sin(th) * 0.15, 1).normalize();
    feather(g, base, dir, new THREE.Vector3(-Math.sin(th), Math.cos(th), 0), 0.15, 0.07, k % 2 ? C.base : C.baseDark, C.baseDark, skinOf(B.neck1, B.chest, 0.3));
  }
  for (let k = 0; k < 6; k++) {
    const sx = k % 2 ? 1 : -1;
    const z = -0.24 + Math.floor(k / 2) * 0.13;
    const base = new THREE.Vector3(sx * 0.06, 0.79 - Math.floor(k / 2) * 0.03, z);
    feather(g, base, new THREE.Vector3(sx * 0.45, -0.06, 1).normalize(), new THREE.Vector3(sx * 0.3, 1, 0).normalize(), 0.18, 0.08, C.base, C.baseDark, skinOf(k < 4 ? B.chest : B.pelvis));
  }
  // The tail fan: a half-circle of long banded feathers at the tip (its name means "tail feather"), built flat on
  // its own pivot at the tail tip; the view lifts it (held up ~60 degrees in version 1 so the chase camera sees a
  // striped half-disc; in version 2 it rides low while running and opens on jumps, turns and the brood).
  const fg = new GeomBuilder(false);
  const FAN = 11;
  for (let k = 0; k < FAN; k++) {
    const a = (k / (FAN - 1) - 0.5) * 2.1; // across the fan, radians
    const len = 0.3 + 0.08 * Math.cos(a * 1.4);
    const base = new THREE.Vector3(Math.sin(a) * 0.02, 0, Math.abs(a) * 0.02);
    bandedFeather(fg, base, new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), new THREE.Vector3(0, 1, 0), len, 0.075, C.dark, C.light, []);
  }
  const fan = new THREE.Group();
  const fanMesh = new THREE.Mesh(fg.build(), MATS.character);
  fanMesh.castShadow = true;
  fanMesh.frustumCulled = false;
  fan.add(fanMesh);
  fan.position.copy(new THREE.Vector3(0, 0.645, 0.5).sub(caudRest('tail4'))); // in the tail tip bone's space
  fan.rotation.x = -1.05;
  // Thigh trousers.
  for (const side of ['L', 'R'] as const) {
    const H = caudRest(`thigh${side}`), K = caudRest(`shin${side}`);
    for (let k = 0; k < 6; k++) {
      const th = Math.PI * 2 * (k / 6) + 0.3;
      const base = H.clone().lerp(K, 0.7).add(new THREE.Vector3(Math.cos(th) * 0.07, 0, Math.sin(th) * 0.07));
      feather(g, base, new THREE.Vector3(Math.cos(th) * 0.3, -1, 0.35 + Math.sin(th) * 0.3).normalize(), new THREE.Vector3(-Math.sin(th), 0, Math.cos(th)), 0.12, 0.07, C.base, C.baseDark, skinOf(B[`thigh${side}`]));
    }
  }

  // ---------- Legs: long and slender, three forward toes ----------
  for (const side of ['L', 'R'] as const) {
    const sx = side === 'L' ? -1 : 1;
    const H = caudRest(`thigh${side}`), K = caudRest(`shin${side}`), A = caudRest(`meta${side}`), F = caudRest(`toe${side}`);
    const bT = B[`thigh${side}`], bS = B[`shin${side}`], bM = B[`meta${side}`], bToe = B[`toe${side}`];
    const hipTop = H.clone().add(new THREE.Vector3(sx * 0.012, 0.05, 0.02));
    limbTube(g, [hipTop, H.clone().lerp(K, 0.55).add(new THREE.Vector3(sx * 0.03, 0, -0.012)), K.clone()], [0.14, 0.105, 0.05], [bT, bT, bT], 7, (_s, j, up) => (up > 0.4 ? C.base : j % 3 === 0 ? C.baseLight : C.base), false);
    limbTube(g, [K, K.clone().lerp(A, 0.5), A], [0.034, 0.024, 0.016], [bS, bS, bS], 6, () => C.skin, false);
    limbTube(g, [A, A.clone().lerp(F, 0.5), F], [0.018, 0.016, 0.015], [bM, bM, bM], 6, () => C.skin, false);
    for (const [off, ang] of [[-0.016, -0.25], [0.0, 0], [0.016, 0.25]] as const) {
      const t0 = F.clone().add(new THREE.Vector3(sx * off, -0.005, 0));
      const t1 = t0.clone().add(new THREE.Vector3(sx * Math.sin(ang) * 0.06, -0.012, -0.065));
      const t2 = t1.clone().add(new THREE.Vector3(sx * Math.sin(ang) * 0.02, -0.008, -0.03));
      limbTube(g, [t0, t1, t2], [0.012, 0.009, 0.0], [bToe, bToe, bToe], 5, (seg) => (seg === 0 ? C.skin : C.claw), false);
    }
  }

  // ---------- Arms: short, with a banded fan on each hand (folded along the flank, pointing back) ----------
  for (const side of ['L', 'R'] as const) {
    const sx = side === 'L' ? -1 : 1;
    const S = caudRest(`upperArm${side}`), E = caudRest(`foreArm${side}`), W = caudRest(`hand${side}`);
    const bU = B[`upperArm${side}`], bF = B[`foreArm${side}`], bH = B[`hand${side}`];
    const tipH = W.clone().add(new THREE.Vector3(sx * 0.004, -0.02, -0.05));
    limbTube(g, [S, E], [0.028, 0.022], [bU, bU], 6, () => C.base, false);
    limbTube(g, [E, W], [0.022, 0.016], [bF, bF], 6, () => C.base, false);
    limbTube(g, [W, tipH], [0.014, 0.0], [bH, bH], 5, () => C.claw, false);
    const nrm = new THREE.Vector3(sx, 0.15, 0).normalize();
    const nF = 6;
    for (let k = 0; k < nF; k++) {
      const t = k / (nF - 1);
      const onHand = t > 0.45;
      const base = onHand ? W.clone().lerp(tipH, (t - 0.45) / 0.55) : E.clone().lerp(W, t / 0.45);
      base.x += sx * 0.01;
      const len = 0.16 + t * 0.1;
      const dir = new THREE.Vector3(sx * 0.05, -0.32 + t * 0.2, 1).normalize();
      bandedFeather(g, base, dir, nrm, len, 0.06, C.dark, C.light, skinOf(onHand ? bH : bF));
    }
  }

  const build = skinned(g.build(lookAt(2) ? { smooth: 55 } : {}), caudRest, 'caudipteryx');
  build.bones[B.tail4].add(fan);
  return { ...build, fan };
}
