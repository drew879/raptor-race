import * as THREE from 'three';
import { GeomBuilder } from '../geom';
import { MATS } from '../materials';
import { col, mix, shade } from '../palette';
import { addTube } from '../world/props';

/**
 * Protoceratops andrewsi, built to read at a glance: a big, deep head (about a third of the body) with a
 * hooked parrot beak, cheek flares and a broad bony frill; a deep barrel body with high hips; a tall,
 * flattened tail with a crest of spines; short sturdy legs. Faces -Z, origin on the ground under the hips.
 *
 * Rotation signs (three.js, facing -Z): +x pitch lifts the nose, +y yaw turns the nose toward -X.
 */
const P = {
  hide: 0xcba579, back: 0x8c6a4a, band: 0x6f5238, belly: 0xe8d7b5, leg: 0xa9865e,
  frill: 0xc76b3e, frillRim: 0x5e3524, spot: 0xf1d9a8, beak: 0x3a2a22, eye: 0x1c1410, cheek: 0xd9b98c,
};

/** A boxy lofted section: each slice is [z, yTop, yBottom, halfWidth]; superellipse corners keep it chunky. */
type Slice = [z: number, top: number, bot: number, w: number];
function loftBox(g: GeomBuilder, slices: Slice[], n: number, color: (i: number, up: number, side: number) => THREE.Color, caps: [boolean, boolean] = [true, true], round = 0.7) {
  const sp = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), round);
  const R = slices.map(([z, top, bot, w]) => {
    const mid = (top + bot) / 2, h = (top - bot) / 2;
    return Array.from({ length: n }, (_, j) => {
      const a = (j / n) * Math.PI * 2;
      return new THREE.Vector3(sp(Math.cos(a)) * w, mid + sp(Math.sin(a)) * h, z);
    });
  });
  for (let i = 0; i < R.length - 1; i++) for (let j = 0; j < n; j++) {
    const j1 = (j + 1) % n, a = ((j + 0.5) / n) * Math.PI * 2;
    g.quad(R[i][j], R[i][j1], R[i + 1][j1], R[i + 1][j], color(i, Math.sin(a), Math.cos(a)));
  }
  const cap = (k: number, flip: boolean) => {
    const [z, top, bot] = slices[k];
    const ctr = new THREE.Vector3(0, (top + bot) / 2, z);
    const c = color(Math.min(k, slices.length - 2), 0, 1);
    for (let j = 0; j < n; j++) flip ? g.tri(R[k][(j + 1) % n], R[k][j], ctr, c) : g.tri(R[k][j], R[k][(j + 1) % n], ctr, c);
  };
  if (caps[0]) cap(0, true);
  if (caps[1]) cap(slices.length - 1, false);
  return R;
}

/** A two-segment leg (upper pivots at the hip/shoulder, lower at the knee/elbow), with a rest bend. */
class Leg {
  readonly upper = new THREE.Group();
  readonly lower = new THREE.Group();
  constructor(parent: THREE.Object3D, at: THREE.Vector3, upperLen: number, lowerLen: number, r: number, haunch: number, readonly restU: number, readonly restL: number, mat: THREE.Material) {
    const gu = new GeomBuilder(), gl = new GeomBuilder();
    addTube(gu, [new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(0, -upperLen * 0.45, 0.0), new THREE.Vector3(0, -upperLen - 0.02, 0)], [r * haunch, r * 1.05, r * 0.8], 8, (s) => (s === 0 ? col(P.hide) : col(P.leg)));
    addTube(gl, [new THREE.Vector3(0, 0.03, 0), new THREE.Vector3(0, -lowerLen * 0.6, 0.0), new THREE.Vector3(0, -lowerLen, -0.02)], [r * 0.85, r * 0.7, r * 0.8], 7, () => col(P.leg));
    // A broad, flat foot with blunt claws.
    const f = new THREE.Vector3(0, -lowerLen - 0.005, -0.02);
    const fw = r * 1.1;
    gl.quad(f.clone().add(new THREE.Vector3(-fw, 0, 0.05)), f.clone().add(new THREE.Vector3(fw, 0, 0.05)), f.clone().add(new THREE.Vector3(fw * 0.9, 0, -0.1)), f.clone().add(new THREE.Vector3(-fw * 0.9, 0, -0.1)), col(P.beak));
    this.upper.add(new THREE.Mesh(gu.build(), mat));
    this.lower.position.y = -upperLen;
    this.lower.add(new THREE.Mesh(gl.build(), mat));
    this.upper.add(this.lower);
    this.upper.position.copy(at);
    this.upper.rotation.x = restU;
    this.lower.rotation.x = restL;
    parent.add(this.upper);
  }
}

export type ProtoPose = 'run' | 'graze' | 'alert' | 'pinned';

export class Protoceratops {
  readonly root = new THREE.Group();
  private body = new THREE.Group();
  private head = new THREE.Group();
  private tail = new THREE.Group();
  private legs: Leg[] = [];
  private phase = 0;
  private t = 0;
  private headPitch = 0;
  private headYaw = 0;
  pose: ProtoPose = 'run';

  constructor() {
    const mat = MATS.character;
    this.root.add(this.body);

    // ---- Body: deep barrel, back dipping behind the head and rising to high hips ----
    const gb = new GeomBuilder();
    const bodyCol = (i: number, up: number) => (up > 0.6 ? (i % 2 ? col(P.band) : col(P.back)) : up > 0.15 ? col(P.hide) : up < -0.55 ? col(P.belly) : mix(P.hide, P.belly, 0.45));
    loftBox(gb, [
      [-0.4, 0.55, 0.3, 0.12], [-0.3, 0.62, 0.24, 0.18], [-0.12, 0.73, 0.2, 0.24], [0.06, 0.84, 0.23, 0.24], [0.22, 0.86, 0.3, 0.19], [0.34, 0.82, 0.4, 0.13],
    ], 12, bodyCol, [true, true], 0.75);
    this.body.add(new THREE.Mesh(gb.build(), mat));

    // ---- Head: pivot at the back of the skull, under the frill ----
    const gh = new GeomBuilder();
    const BEAK_Z = -0.4;
    const slices: Slice[] = [
      [0.04, 0.08, -0.1, 0.1], [-0.06, 0.11, -0.17, 0.12], [-0.17, 0.08, -0.2, 0.105], [-0.27, 0.05, -0.19, 0.08], [-0.34, 0.06, -0.17, 0.064], [BEAK_Z, 0.01, -0.15, 0.05], [-0.46, -0.04, -0.14, 0.035],
    ];
    const headCol = (i: number, up: number) => (slices[i][0] <= BEAK_Z + 0.001 ? col(P.beak) : up > 0.6 ? mix(P.hide, P.back, 0.5) : up < -0.55 ? col(P.belly) : col(P.hide));
    const H = loftBox(gh, slices, 10, headCol, [true, false], 0.65);
    // Hooked upper beak: the last ring closes to a tip that curls below the jaw line.
    const tip = new THREE.Vector3(0, -0.19, -0.5);
    const last = H[H.length - 1];
    for (let j = 0; j < last.length; j++) gh.tri(last[j], last[(j + 1) % last.length], tip, col(P.beak));
    // Mouth line along each side, from the beak back under the eye.
    for (const sx of [-1, 1]) {
      const a = new THREE.Vector3(sx * 0.098, -0.115, -0.2), b = new THREE.Vector3(sx * 0.052, -0.125, -0.42);
      const d = new THREE.Vector3(0, 0.014, 0);
      sx > 0 ? gh.quad(a, b, b.clone().add(d), a.clone().add(d), col(P.beak)) : gh.quad(b, a, a.clone().add(d), b.clone().add(d), col(P.beak));
    }
    // Cheek flares (jugal horns): little pyramids pointing out and down below the eyes.
    for (const sx of [-1, 1]) {
      const base = [new THREE.Vector3(sx * 0.11, -0.04, -0.07), new THREE.Vector3(sx * 0.11, -0.16, -0.05), new THREE.Vector3(sx * 0.11, -0.12, -0.17)];
      const apex = new THREE.Vector3(sx * 0.21, -0.2, -0.1);
      const c = col(P.cheek), c2 = shade(col(P.cheek), 0.82);
      for (let k = 0; k < 3; k++) {
        const u = base[k], v = base[(k + 1) % 3];
        sx > 0 ? gh.tri(u, v, apex, k % 2 ? c2 : c) : gh.tri(v, u, apex, k % 2 ? c2 : c);
      }
    }
    // Nasal bump on the snout.
    gh.tri(new THREE.Vector3(-0.04, 0.05, -0.3), new THREE.Vector3(0.04, 0.05, -0.3), new THREE.Vector3(0, 0.1, -0.34), shade(col(P.hide), 0.9));
    gh.tri(new THREE.Vector3(0.04, 0.05, -0.3), new THREE.Vector3(0, 0.06, -0.38), new THREE.Vector3(0, 0.1, -0.34), shade(col(P.hide), 0.8));
    gh.tri(new THREE.Vector3(0, 0.06, -0.38), new THREE.Vector3(-0.04, 0.05, -0.3), new THREE.Vector3(0, 0.1, -0.34), shade(col(P.hide), 0.8));
    // Big eyes with a pale ring and a brow ridge, high on the skull.
    for (const sx of [-1, 1]) {
      const e = new THREE.Vector3(sx * 0.108, 0.01, -0.16);
      const ring = (r: number, out: number) => Array.from({ length: 8 }, (_, k) => { const a = (k / 8) * Math.PI * 2; return e.clone().add(new THREE.Vector3(sx * out, Math.sin(a) * r, Math.cos(a) * r)); });
      const outer = ring(0.036, 0), inner = ring(0.022, 0.006), ctr = e.clone().add(new THREE.Vector3(sx * 0.012, 0, 0));
      for (let k = 0; k < 8; k++) {
        const k1 = (k + 1) % 8;
        sx > 0 ? gh.quad(outer[k], outer[k1], inner[k1], inner[k], col(P.spot)) : gh.quad(outer[k1], outer[k], inner[k], inner[k1], col(P.spot));
        sx > 0 ? gh.tri(inner[k], inner[k1], ctr, col(P.eye)) : gh.tri(inner[k1], inner[k], ctr, col(P.eye));
      }
      const brow = [e.clone().add(new THREE.Vector3(0, 0.04, 0.05)), e.clone().add(new THREE.Vector3(0, 0.05, -0.04)), e.clone().add(new THREE.Vector3(sx * 0.025, 0.035, 0.0))];
      sx > 0 ? gh.tri(brow[0], brow[1], brow[2], shade(col(P.back), 1.05)) : gh.tri(brow[1], brow[0], brow[2], shade(col(P.back), 1.05));
    }
    // The frill: a broad shield sweeping up and back from the skull, with a dark rim and two bold eye-spots.
    const F = 12;
    // A shallow cone opening up and back, so it reads as a shield from the front, a dome from behind and a
    // long sloping plate in profile (not a flat disc that vanishes edge-on).
    const fp = (a: number, r: number) => new THREE.Vector3(Math.cos(a) * r * 1.02, 0.04 + Math.sin(a) * r * 0.9 - (1 - Math.sin(a)) * r * 0.12, 0.02 + r * (0.62 + 0.22 * Math.sin(a)));
    for (let k = 0; k < F; k++) {
      const a0 = Math.PI * (-0.04 + (1.08 * k) / F), a1 = Math.PI * (-0.04 + (1.08 * (k + 1)) / F);
      const i0 = fp(a0, 0.07), i1 = fp(a1, 0.07), m0 = fp(a0, 0.27), m1 = fp(a1, 0.27), o0 = fp(a0, 0.36), o1 = fp(a1, 0.36);
      const spot = k === 3 || k === 8;
      gh.quad(i0, i1, m1, m0, spot ? col(P.spot) : k % 2 ? col(P.frill) : shade(col(P.frill), 0.86));
      gh.quad(m0, m1, o1, o0, col(P.frillRim));
    }
    this.head.add(new THREE.Mesh(gh.build(), mat));
    this.head.position.set(0, 0.58, -0.36);
    this.body.add(this.head);

    // ---- Tail: tall and flattened, drooping, with a crest of spines ----
    const gt = new GeomBuilder();
    loftBox(gt, [[0.0, 0.2, -0.2, 0.11], [0.2, 0.17, -0.22, 0.075], [0.42, 0.08, -0.22, 0.05], [0.62, -0.02, -0.2, 0.03], [0.8, -0.12, -0.2, 0.012]], 8,
      (i, up) => (up > 0.5 ? (i % 2 ? col(P.band) : col(P.back)) : up < -0.5 ? col(P.belly) : col(P.hide)), [false, true]);
    for (let k = 0; k < 8; k++) { // the crest: tall neural spines along the top
      const z = 0.03 + k * 0.085, top = 0.2 - k * 0.04, h = 0.12 * (1 - k / 9);
      const c = k % 2 ? col(P.band) : col(P.back);
      gt.tri(new THREE.Vector3(0, top - 0.02, z - 0.04), new THREE.Vector3(0, top + h, z + 0.015), new THREE.Vector3(0, top - 0.02, z + 0.05), c);
    }
    this.tail.add(new THREE.Mesh(gt.build(), mat));
    this.tail.position.set(0, 0.62, 0.34);
    this.body.add(this.tail);

    // ---- Legs: short and sturdy; the hind pair longer, with big haunches ----
    // [x, hipY, z, upper, lower, radius, haunch, restUpper, restLower]
    const L: [number, number, number, number, number, number, number, number, number][] = [
      [-0.15, 0.42, -0.26, 0.2, 0.2, 0.062, 1.35, -0.12, 0.22], [0.15, 0.42, -0.26, 0.2, 0.2, 0.062, 1.35, -0.12, 0.22],
      [-0.17, 0.52, 0.16, 0.26, 0.26, 0.075, 1.6, 0.38, -0.62], [0.17, 0.52, 0.16, 0.26, 0.26, 0.075, 1.6, 0.38, -0.62],
    ];
    for (const [x, y, z, ul, ll, r, hn, ru, rl] of L) {
      // Hip height so the bent leg's foot just touches the ground.
      const drop = ul * Math.cos(ru) + ll * Math.cos(ru + rl);
      this.legs.push(new Leg(this.body, new THREE.Vector3(x, Math.max(y, drop + 0.012), z), ul, ll, r, hn, ru, rl, mat));
    }
    this.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    this.root.scale.setScalar(1.1);
  }

  /** speed m/s; lean -1..1 while changing lanes; hop 0..1 over obstacles. */
  update(dt: number, speed: number, lean: number, hop: number) {
    this.t += dt;
    const t = this.t;
    const run = Math.min(1, speed / 6);
    this.phase = (this.phase + (speed / 1.5) * dt) % 1;
    const ph = this.phase * Math.PI * 2;
    // Gallop: front pair, then the hind pair, slightly offset.
    const swing = 0.7 * run;
    const legPhase = [ph, ph + 0.5, ph + Math.PI, ph + Math.PI + 0.5];
    this.legs.forEach((leg, i) => {
      leg.upper.rotation.x = leg.restU + Math.sin(legPhase[i]) * swing;
      leg.lower.rotation.x = leg.restL + Math.sign(leg.restL) * Math.max(0, Math.cos(legPhase[i])) * 0.8 * run; // fold further during the swing
    });
    const bob = Math.abs(Math.sin(ph)) * 0.05 * run;
    this.body.position.y = bob + hop * 0.7;
    this.body.rotation.set(Math.sin(ph * 2) * 0.03 * run + hop * 0.12, 0, 0);
    this.root.rotation.z = -lean * 0.12;
    this.root.rotation.y = -lean * 0.3;
    this.tail.rotation.y = Math.sin(ph) * 0.1 * run;
    this.tail.rotation.x = 0.04 - hop * 0.15;

    let pitch = Math.sin(ph * 2) * 0.05 * run, yaw = 0;
    switch (this.pose) {
      case 'graze':
        // Head down, nibbling, tail swaying lazily.
        pitch = -0.5 + Math.sin(t * 6) * 0.05;
        yaw = Math.sin(t * 0.7) * 0.12;
        this.tail.rotation.y = Math.sin(t * 1.3) * 0.1;
        break;
      case 'alert':
        // Head up and turned back over the shoulder toward the threat.
        pitch = 0.25;
        yaw = 0.6;
        this.tail.rotation.y = -0.15;
        break;
      case 'pinned':
        // Pressed down, head thrown up, braced and struggling.
        this.body.position.y = -0.09 + Math.sin(t * 18) * 0.012;
        this.body.rotation.set(0.06, 0, Math.sin(t * 7) * 0.04);
        pitch = 0.3 + Math.sin(t * 9) * 0.1;
        yaw = 0.45 + Math.sin(t * 5) * 0.15;
        this.tail.rotation.y = Math.sin(t * 11) * 0.3;
        this.legs.forEach((leg, i) => { leg.upper.rotation.x = leg.restU + (i < 2 ? 0.25 : -0.2); leg.lower.rotation.x = leg.restL * 1.25; });
        break;
    }
    // Ease the head so pose changes don't snap.
    const k = 1 - Math.exp(-12 * dt);
    this.headPitch += (pitch - this.headPitch) * k;
    this.headYaw += (yaw - this.headYaw) * k;
    this.head.rotation.set(this.headPitch, this.headYaw, 0, 'YXZ');
  }
}
