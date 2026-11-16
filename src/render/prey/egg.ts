import * as THREE from 'three';
import { GeomBuilder } from '../geom';
import { MATS, litMaterial, patchWorld } from '../materials';
import { col, mix, shade } from '../palette';
import type { ProtoPose } from './protoceratops';
import { lookAt } from '../look';

/**
 * The runaway egg: long and narrow like oviraptorosaur eggs, blue-green (a 2017 study found the pigments of
 * blue-green eggs in a cousin's eggshells), speckled. Scaled up from life so it reads from the chase camera.
 * It takes the prey's poses: `graze` twitches in the nest, `alert` rocks hard, `run` rolls (wobbling, hopping
 * when the chick kicks), `pinned` is held upright and hatches: the cap pops off and a chick peeks out.
 */
export const EGG = { length: 0.46, radius: 0.135, crackAt: 0.68 };
const P = { shell: 0x86c9b6, light: 0xbfe8d9, speck: 0x4f8f80, inside: 0xf4efe2, down: 0xe6d9bf, downDark: 0xbca684, beak: 0xf0a640, eye: 0x1a1412 };

/** Version 1: faceted with a glow and a strong pale rim. Version 2: smooth and matte; the shape, speckles,
 * contact shadow and wobble say "egg". Built on first use (after the graphics version is set). */
let eggMat: THREE.Material | null = null;
const EGG_MAT = () => (eggMat ??= lookAt(2)
  ? patchWorld(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: false, emissive: new THREE.Color(0x061210), side: THREE.DoubleSide }), { rim: 0.22, rimColor: 0xeafff7, dapple: true })
  : patchWorld(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: new THREE.Color(0x163a34), side: THREE.DoubleSide }), { rim: 0.8, rimColor: 0xeafff7 }));

const NEST_MAT = litMaterial({ rim: 0.15, side: THREE.DoubleSide });
const hash = (a: number, b: number) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
/** Radius of the egg at height fraction u (0 = blunt bottom, 1 = narrower top). */
const profile = (u: number) => EGG.radius * Math.sqrt(Math.max(0, 1 - (2 * u - 1) ** 2)) * (1 - 0.12 * (2 * u - 1));

/** The shell from u0 to u1, centered on the egg's middle; `jag` gives the crack ring its zigzag. */
function shell(u0: number, u1: number, jagAt: number | null): THREE.BufferGeometry {
  const g = new GeomBuilder(false);
  const S = lookAt(2) ? 20 : 14, rows = lookAt(2) ? 16 : 12;
  const us: number[] = [];
  for (let i = 0; i <= rows; i++) { const u = i / rows; if (u > u0 + 1e-6 && u < u1 - 1e-6) us.push(u); }
  us.unshift(u0); us.push(u1);
  const ring = (u: number, k: number) => {
    const uu = jagAt !== null && Math.abs(u - jagAt) < 1e-6 ? u + (k % 2 ? 0.035 : -0.035) : u;
    const r = profile(Math.min(1, Math.max(0, uu)));
    const th = (k / S) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(th) * r, (uu - 0.5) * EGG.length, Math.sin(th) * r);
  };
  for (let i = 0; i < us.length - 1; i++) {
    for (let k = 0; k < S; k++) {
      const a = ring(us[i], k), b = ring(us[i], k + 1), c = ring(us[i + 1], k + 1), d = ring(us[i + 1], k);
      const h = hash(i + u0 * 40, k);
      if (lookAt(2)) {
        // Matte shell, smooth: a calm blue-green with small, scattered dark speckles.
        const base = h > 0.9 ? col(P.speck) : shade(col(P.shell), 0.97 + h * 0.05);
        g.quad(a, d, c, b, base, h > 0.95 ? col(P.speck) : base);
        continue;
      }
      const base = h > 0.86 ? col(P.speck) : us[i] > 0.55 && (k + i) % 3 === 0 ? mix(P.shell, P.light, 0.5) : shade(col(P.shell), 0.94 + h * 0.1);
      g.quad(a, d, c, b, base, h > 0.93 ? col(P.speck) : shade(base, 0.97));
    }
  }
  // Close the ends that are real ends of the egg (tips), and paint the inside of the crack edge pale.
  const tip = (u: number) => new THREE.Vector3(0, (u - 0.5) * EGG.length, 0);
  if (u0 === 0) for (let k = 0; k < S; k++) g.tri(ring(0.0001, k), ring(0.0001, k + 1), tip(0), col(P.shell));
  if (u1 === 1) for (let k = 0; k < S; k++) g.tri(ring(0.9999, k + 1), ring(0.9999, k), tip(1), col(P.light));
  return g.build(lookAt(2) ? { smooth: 60 } : {});
}

function chick(): THREE.Group {
  const grp = new THREE.Group();
  const g = new GeomBuilder(false);
  // A round fluffy head on a short neck: pale damp down (it reads against its dark parent), a darker crown and a
  // little crest, big glossy eyes, a short orange beak with the white egg tooth it used to crack the shell.
  const head = new THREE.Vector3(0, 0.1, 0), R = 0.082;
  const rings = 12, S = 18;
  const pt = (i: number, k: number) => {
    const ph = (i / rings) * Math.PI, th = (k / S) * Math.PI * 2;
    const fluff = 1 + 0.035 * Math.sin(th * 5 + i * 1.7) * Math.sin(ph); // a little uneven, like down
    return head.clone().add(new THREE.Vector3(Math.sin(ph) * Math.cos(th) * R * fluff, Math.cos(ph) * R * 0.95, Math.sin(ph) * Math.sin(th) * R * 1.06 * fluff));
  };
  for (let i = 0; i < rings; i++) for (let k = 0; k < S; k++) {
    const c = i < 3 ? mix(P.downDark, P.down, i / 3 * 0.5) : shade(col(P.down), 0.96 + hash(i, k) * 0.06);
    g.quad(pt(i, k), pt(i, k + 1), pt(i + 1, k + 1), pt(i + 1, k), c);
  }
  // Neck down into the shell.
  const NS = 14;
  for (let k = 0; k < NS; k++) {
    const th0 = (k / NS) * Math.PI * 2, th1 = ((k + 1) / NS) * Math.PI * 2;
    const r0 = 0.04, r1 = 0.046, y0 = 0.04, y1 = -0.09;
    g.quad(new THREE.Vector3(Math.cos(th0) * r0, y0, Math.sin(th0) * r0), new THREE.Vector3(Math.cos(th0) * r1, y1, Math.sin(th0) * r1), new THREE.Vector3(Math.cos(th1) * r1, y1, Math.sin(th1) * r1), new THREE.Vector3(Math.cos(th1) * r0, y0, Math.sin(th1) * r0), col(P.down));
  }
  // A fluffy crest: a few soft tufts sticking up.
  for (const [x, z, h, lean] of [[0, 0.01, 0.05, -0.2], [-0.02, 0.03, 0.04, -0.6], [0.02, 0.03, 0.04, 0.6], [0, 0.04, 0.035, 0]] as const) {
    const b = head.clone().add(new THREE.Vector3(x, R * 0.88, z)), tip = b.clone().add(new THREE.Vector3(lean * 0.02, h, 0.015));
    g.tri(b.clone().add(new THREE.Vector3(-0.012, 0, 0)), b.clone().add(new THREE.Vector3(0.012, 0, 0)), tip, col(P.downDark));
    g.tri(b.clone().add(new THREE.Vector3(0.012, 0, 0)), b.clone().add(new THREE.Vector3(-0.012, 0, 0)), tip, mix(P.downDark, P.down, 0.4));
  }
  // Beak: a short cone (forward is -Z), and the white egg tooth on top near the tip.
  const BS = 8, bBase = head.clone().add(new THREE.Vector3(0, -0.014, -0.072)), bTip = head.clone().add(new THREE.Vector3(0, -0.026, -0.118));
  for (let k = 0; k < BS; k++) {
    const a0 = (k / BS) * Math.PI * 2, a1 = ((k + 1) / BS) * Math.PI * 2;
    const q = (a: number) => bBase.clone().add(new THREE.Vector3(Math.cos(a) * 0.022, Math.sin(a) * 0.016, 0));
    g.tri(q(a1), q(a0), bTip, shade(col(P.beak), 0.88 + 0.12 * Math.max(0, Math.sin((a0 + a1) / 2))));
  }
  const tooth = bTip.clone().add(new THREE.Vector3(0, 0.012, 0.012));
  g.tri(tooth.clone().add(new THREE.Vector3(-0.004, 0, 0.004)), tooth.clone().add(new THREE.Vector3(0.004, 0, 0.004)), tooth.clone().add(new THREE.Vector3(0, 0.006, -0.002)), col(0xfffaf0));
  // Eyes: big, dark and glossy, with two catchlights.
  for (const sx of [-1, 1]) {
    const c = head.clone().add(new THREE.Vector3(sx * 0.057, 0.018, -0.044));
    const n = new THREE.Vector3(sx, 0.12, -0.55).normalize();
    const side = new THREE.Vector3().crossVectors(n, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(side, n).normalize();
    const E = 14;
    const ctr = c.clone().addScaledVector(n, 0.006);
    for (let k = 0; k < E; k++) {
      const a0 = (k / E) * Math.PI * 2, a1 = ((k + 1) / E) * Math.PI * 2;
      const p0 = c.clone().addScaledVector(side, Math.cos(a0) * 0.026).addScaledVector(up, Math.sin(a0) * 0.028);
      const p1 = c.clone().addScaledVector(side, Math.cos(a1) * 0.026).addScaledVector(up, Math.sin(a1) * 0.028);
      g.tri(sx > 0 ? p0 : p1, sx > 0 ? p1 : p0, ctr, col(P.eye));
    }
    for (const [dx, dy, r] of [[-0.007, 0.009, 0.007], [0.008, -0.008, 0.0035]] as const) {
      const gl = c.clone().addScaledVector(n, 0.008).addScaledVector(up, dy).addScaledVector(side, dx * sx);
      g.tri(gl.clone().addScaledVector(up, r), gl.clone().addScaledVector(side, sx * r), gl.clone().addScaledVector(side, -sx * r), col(0xffffff));
    }
  }
  grp.add(new THREE.Mesh(g.build(lookAt(2) ? { smooth: 70 } : {}), MATS.character));
  return grp;
}

/** Hatching cracks along the shell's crack line (the ring where the cap will come off), in three stages: a short
 * crack, a longer one with branches, then all the way round. Thin dark strips just outside the shell. */
function crackStages(S: number): THREE.BufferGeometry[] {
  const out = 0.004, w = 0.0065;
  const at = (u: number, k: number) => {
    const uu = u + (k % 2 ? 0.035 : -0.035);
    const r = profile(Math.min(1, Math.max(0, uu))) + out, th = (k / S) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(th) * r, (uu - 0.5) * EGG.length, Math.sin(th) * r);
  };
  const strip = (g: GeomBuilder, a: THREE.Vector3, b: THREE.Vector3) => {
    const d = new THREE.Vector3().subVectors(b, a);
    const n = a.clone().setY(0).normalize();
    const s = new THREE.Vector3().crossVectors(d, n).normalize().multiplyScalar(w);
    g.quad(a.clone().add(s), b.clone().add(s), b.clone().sub(s), a.clone().sub(s), col(0x2a1c12));
  };
  const span = (from: number, to: number, branches: number[]) => {
    const g = new GeomBuilder(false);
    for (let k = from; k < to; k++) strip(g, at(EGG.crackAt, k), at(EGG.crackAt, k + 1));
    // Branches: short cracks running off the line toward the top.
    for (const k of branches) {
      const a = at(EGG.crackAt, k), b = a.clone().add(new THREE.Vector3(0, 0.05, 0)).multiply(new THREE.Vector3(0.95, 1, 0.95));
      const c = b.clone().add(new THREE.Vector3(0, 0.03, 0)).multiply(new THREE.Vector3(0.9, 1, 0.9)).add(new THREE.Vector3(0.01, 0, 0.01));
      strip(g, a, b);
      strip(g, b, c);
    }
    return g.build();
  };
  const q = Math.round(S / 4);
  return [span(0, q, [1]), span(0, Math.round(S * 0.6), [1, q + 1, q + 3]), span(0, S, [1, q + 1, q + 3, S - 3])];
}

export class EggView {
  readonly root = new THREE.Group();
  pose: ProtoPose = 'graze';
  /** Seconds since the egg was caught (drives the hatch). */
  hatchT = 0;
  private body = new THREE.Group();
  private cap = new THREE.Group();
  private chick = chick();
  private t = 0;
  private spin = 0;
  private kick = 0;
  private kickTimer = 1.4;
  private upright = 0;
  private contact: THREE.Mesh | null = null;
  /** 0..1: how far hatching has cracked the shell (the opening drives it; the egg rolls off cracked). */
  crack = 0;
  private cracks: THREE.Mesh[] = [];
  private beakTip: THREE.Mesh;
  private yaw = Math.PI - 0.25;
  /** Drawn larger while it rolls away (so it reads from far behind), back to life size once caught. */
  rollScale = 1.4;
  private scale = 1.4;

  constructor() {
    const lower = new THREE.Mesh(shell(0, EGG.crackAt, EGG.crackAt), EGG_MAT());
    const top = new THREE.Mesh(shell(EGG.crackAt, 1, EGG.crackAt), EGG_MAT());
    if (lookAt(2)) {
      // A soft contact shadow, so it sits on the trail (it fades as the egg hops).
      const sg = new THREE.CircleGeometry(EGG.radius * 1.5, 20);
      sg.rotateX(-Math.PI / 2);
      this.contact = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: 0x2a1c12, transparent: true, opacity: 0.32, depthWrite: false }));
      patchWorld(this.contact.material as THREE.MeshBasicMaterial, {});
      this.contact.position.y = 0.015;
      this.contact.scale.set(1.5, 1, 1);
      this.contact.renderOrder = 1;
      this.root.add(this.contact);
    }
    // The cap pivots at the middle of the crack (it rides up on the chick's head like a hat when it hatches).
    const crackY = (EGG.crackAt - 0.5) * EGG.length;
    this.cap.position.set(0, crackY, 0);
    top.position.set(0, -crackY, 0);
    this.cap.add(top);
    this.chick.position.set(0, crackY - 0.08, 0);
    this.chick.visible = false;
    // Hatching cracks along the cap's line, shown in stages; and the tip of a beak that pokes through the top.
    const crackMat = patchWorld(new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, side: THREE.DoubleSide }), {});
    this.cracks = crackStages(lookAt(2) ? 20 : 14).map((geo) => { const m = new THREE.Mesh(geo, crackMat); m.visible = false; return m; });
    const bg = new THREE.ConeGeometry(0.026, 0.065, 8);
    bg.translate(0, 0.0325, 0);
    this.beakTip = new THREE.Mesh(bg, new THREE.MeshLambertMaterial({ color: P.beak }));
    patchWorld(this.beakTip.material as THREE.MeshLambertMaterial, {});
    this.beakTip.visible = false;
    this.body.add(lower, this.cap, this.chick, ...this.cracks, this.beakTip);
    this.root.add(this.body);
    this.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  }

  /** Back to a whole egg in its nest (a new run after it hatched). */
  reset() {
    this.hatchT = 0;
    this.crack = 0;
    this.yaw = Math.PI - 0.25;
    this.upright = 0;
    this.spin = 0;
    this.kick = 0;
    this.kickTimer = 1.4;
    this.pose = 'graze';
    this.chick.visible = false;
    this.chick.position.y = (EGG.crackAt - 0.5) * EGG.length - 0.08;
    this.cap.position.set(0, (EGG.crackAt - 0.5) * EGG.length, 0);
    this.cap.rotation.set(0, 0, 0);
    this.scale = this.rollScale;
  }

  /** `speed` m/s along the trail, `turn` -1..1 as it swerves, `hop` 0..1 over an obstacle. */
  update(dt: number, speed: number, turn: number, hop: number) {
    this.t += dt;
    const t = this.t;
    const R = EGG.radius;
    let y = R, rx = 0, ry = 0, rz = Math.PI / 2;
    if (this.pose === 'pinned') {
      // Caught: it rights itself, shakes, the cap pops and the chick peeks out, looking around.
      this.hatchT += dt;
      const h = this.hatchT;
      this.upright = Math.min(1, this.upright + dt * 4);
      const u = this.upright * this.upright * (3 - 2 * this.upright);
      rz = (Math.PI / 2) * (1 - u) + 0.12 * u;
      y = R + (EGG.length / 2 - R) * u;
      const shake = h > 0.25 && h < 0.6 ? Math.sin(h * 70) * 0.09 : 0;
      rx = shake;
      // The chick pushes up through the top; the cap rides up on its head, tipped over like a hat.
      const crackY = (EGG.crackAt - 0.5) * EGG.length;
      const rise = Math.min(1, Math.max(0, (h - 0.6) / 0.35));
      const e = rise * rise * (3 - 2 * rise);
      const pop = Math.sin(Math.PI * Math.min(1, Math.max(0, (h - 0.6) / 0.25))) * 0.05;
      this.chick.visible = h > 0.6;
      this.chick.position.y = crackY - 0.08 + 0.115 * e;
      this.chick.rotation.y = 0.45 * Math.sin(h * 2.4) * e;
      this.chick.rotation.x = -0.12 * e;
      this.cap.position.set(0.03 * e, crackY + 0.19 * e + pop, 0.02 * e);
      this.cap.rotation.set(0.35 * e, 0, -0.55 * e);
    } else if (this.pose === 'graze' || this.pose === 'alert') {
      // In the nest: little twitches, then hard rocking (the chick is kicking).
      const hard = this.pose === 'alert';
      const twitch = hard ? Math.sin(t * 9) * 0.32 : (Math.sin(t * 17) * 0.06) * Math.max(0, Math.sin(t * 2.3));
      rx = twitch;
      y = R + (hard ? Math.abs(Math.sin(t * 9)) * 0.03 : 0);
      // In the nest its top end turns toward the camera, so the cracks and the poking beak are in view.
      this.yaw += (Math.PI - 0.25 - this.yaw) * Math.min(1, dt * 6);
      ry = this.yaw;
    } else {
      // Rolling on its side about its long axis, the long axis swinging as it wobbles; the chick kicks now and
      // then and it bounces.
      this.spin -= (speed / R) * dt * 0.45;
      rx = this.spin;
      this.yaw += (0.32 * Math.sin(t * 3.1) + turn * 0.5 - this.yaw) * Math.min(1, dt * 5); // turns as it tumbles out
      ry = this.yaw;
      this.kickTimer -= dt;
      if (this.kickTimer <= 0 && speed > 1) { this.kick = 1; this.kickTimer = 1.6 + ((t * 7.31) % 1.3); }
      this.kick = Math.max(0, this.kick - dt * 2.6);
      const bounce = Math.sin(Math.PI * (1 - this.kick)) * 0.22 * (this.kick > 0 ? 1 : 0) + Math.abs(Math.sin(t * 11)) * 0.02 * Math.min(1, speed / 6);
      y = R + bounce + hop * 0.6;
      rz = Math.PI / 2 + Math.sin(Math.PI * hop) * 0.6;
    }
    this.scale += ((this.pose === 'pinned' ? 1 : this.rollScale) - this.scale) * Math.min(1, dt * 6);
    this.root.scale.setScalar(this.scale);
    this.body.position.set(0, y, 0);
    this.body.rotation.set(rx, ry, rz, 'YXZ');
    // Cracks spread as it hatches (gone once the cap comes off at the end).
    const stages = [0.2, 0.55, 0.85];
    const stage = stages.filter((s) => this.crack >= s).length - 1; // each stage's mesh includes the ones before
    this.cracks.forEach((m, i) => { m.visible = i === stage && this.hatchT < 0.6; });
    // While it rocks hard in the nest, the tip of a beak pokes out of the top, again and again.
    const rocking = this.pose === 'alert';
    const poke = 0.5 + 0.5 * Math.sin(t * 6);
    this.beakTip.visible = rocking;
    this.beakTip.position.set(0, EGG.length / 2 - 0.03 + 0.045 * poke, 0);
    if (this.contact) {
      const lift = Math.max(0, y - R);
      (this.contact.material as THREE.MeshBasicMaterial).opacity = 0.32 * Math.max(0.15, 1 - lift * 2.2);
      this.contact.rotation.y = ry;
      this.contact.scale.set(this.pose === 'pinned' ? 1 : 1.5, 1, 1);
    }
  }
}

/** The nest at the top of the hill: a low ring of mud and twigs in leaf litter. */
export function buildNest(): THREE.Mesh {
  const g = new GeomBuilder(false);
  const S = 16;
  const mud = 0x6b4a33, rim = 0x8a6440, twig = 0x4a3324;
  for (let k = 0; k < S; k++) {
    const a0 = (k / S) * Math.PI * 2, a1 = ((k + 1) / S) * Math.PI * 2;
    const p = (a: number, r: number, y: number) => new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    const h = hash(k, 3);
    g.quad(p(a0, 0.62, 0.0), p(a1, 0.62, 0.0), p(a1, 0.42, 0.16 + h * 0.03), p(a0, 0.42, 0.16 + h * 0.03), shade(col(mud), 0.9 + h * 0.15));
    g.quad(p(a0, 0.42, 0.16 + h * 0.03), p(a1, 0.42, 0.16 + h * 0.03), p(a1, 0.26, 0.03), p(a0, 0.26, 0.03), shade(col(rim), 0.85 + h * 0.15));
    g.quad(p(a0, 0.26, 0.03), p(a1, 0.26, 0.03), p(a1, 0.0, 0.01), p(a0, 0.0, 0.01), shade(col(mud), 0.75));
    // Twigs laid across the rim.
    if (k % 2 === 0) {
      const c = p(a0, 0.44, 0.17), d = new THREE.Vector3(-Math.sin(a0), 0.05, Math.cos(a0)).multiplyScalar(0.18);
      const s = new THREE.Vector3(Math.cos(a0), 0, Math.sin(a0)).multiplyScalar(0.012);
      g.quad(c.clone().sub(d).sub(s), c.clone().add(d).sub(s), c.clone().add(d).add(s).add(new THREE.Vector3(0, 0.02, 0)), c.clone().sub(d).add(s).add(new THREE.Vector3(0, 0.02, 0)), col(twig));
    }
  }
  const m = new THREE.Mesh(g.build(), NEST_MAT);
  m.receiveShadow = true;
  m.castShadow = true;
  return m;
}
