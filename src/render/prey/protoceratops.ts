import * as THREE from 'three';
import { GeomBuilder } from '../geom';
import { MATS } from '../materials';
import { col, mix, shade } from '../palette';
import { addTube } from '../world/props';

/** Protoceratops andrewsi palette: sandy hide, darker saddle bands, pale belly, rust-edged frill. */
const P = { hide: 0xc9a47a, back: 0x8c6a4a, belly: 0xe6d3b0, frill: 0xb4583a, frillEdge: 0x6e3f2a, beak: 0x3a2a22, eye: 0x1c1410 };

/** Lofted body section around the z axis: rings of (z, y, rx, ry). Faces colored by height on the ring. */
function loft(g: GeomBuilder, rings: Array<[number, number, number, number]>, n: number, color: (i: number, up: number) => THREE.Color, capStart = true, capEnd = true) {
  const R = rings.map(([z, y, rx, ry]) => Array.from({ length: n }, (_, j) => {
    const a = (j / n) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * rx, y + Math.sin(a) * ry, z);
  }));
  for (let i = 0; i < R.length - 1; i++) for (let j = 0; j < n; j++) {
    const j1 = (j + 1) % n, up = Math.sin(((j + 0.5) / n) * Math.PI * 2);
    const c = color(i, up);
    g.quad(R[i][j], R[i][j1], R[i + 1][j1], R[i + 1][j], c);
  }
  const cap = (ring: THREE.Vector3[], z: number, y: number, c: THREE.Color, flip: boolean) => {
    const ctr = new THREE.Vector3(0, y, z);
    for (let j = 0; j < n; j++) flip ? g.tri(ring[(j + 1) % n], ring[j], ctr, c) : g.tri(ring[j], ring[(j + 1) % n], ctr, c);
  };
  if (capStart) cap(R[0], rings[0][0] - 0.04, rings[0][1], color(0, 0), true);
  if (capEnd) cap(R[R.length - 1], rings[rings.length - 1][0] + 0.04, rings[rings.length - 1][1], color(rings.length - 2, 0), false);
}

const hideColor = (bandEvery = 0) => (i: number, up: number) =>
  up > 0.55 ? (bandEvery && i % bandEvery === 0 ? col(P.back) : mix(P.hide, P.back, 0.55)) : up < -0.45 ? col(P.belly) : col(P.hide);

export class Protoceratops {
  readonly root = new THREE.Group();
  private head: THREE.Mesh;
  private tail: THREE.Mesh;
  private legs: THREE.Mesh[] = [];
  private phase = 0;

  constructor() {
    const mat = MATS.character;
    // Body: barrel-shaped, high hips.
    const gb = new GeomBuilder();
    loft(gb, [[-0.42, 0.5, 0.15, 0.17], [-0.3, 0.54, 0.22, 0.24], [-0.1, 0.57, 0.26, 0.27], [0.1, 0.6, 0.25, 0.27], [0.3, 0.58, 0.19, 0.21], [0.4, 0.55, 0.13, 0.15]], 9, hideColor(2));
    const body = new THREE.Mesh(gb.build(), mat);
    // Head: deep beaked skull with a bony frill fanning up and back.
    const gh = new GeomBuilder();
    loft(gh, [[0.0, 0.0, 0.12, 0.13], [-0.12, -0.01, 0.13, 0.15], [-0.26, -0.04, 0.1, 0.12], [-0.38, -0.08, 0.06, 0.08], [-0.46, -0.13, 0.025, 0.05]], 8,
      (i, up) => (i >= 3 ? col(P.beak) : up > 0.5 ? mix(P.hide, P.back, 0.4) : up < -0.4 ? col(P.belly) : col(P.hide)), true, true);
    const frillBase = new THREE.Vector3(0, 0.05, 0.02);
    const F = 9;
    for (let k = 0; k < F; k++) {
      const a0 = Math.PI * (0.08 + (0.84 * k) / F), a1 = Math.PI * (0.08 + (0.84 * (k + 1)) / F);
      const pt = (a: number, r: number) => frillBase.clone().add(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r * 0.9, r * 0.65));
      const inner0 = pt(a0, 0.1), inner1 = pt(a1, 0.1), outer0 = pt(a0, 0.3), outer1 = pt(a1, 0.3), rim0 = pt(a0, 0.34), rim1 = pt(a1, 0.34);
      gh.quad(inner0, inner1, outer1, outer0, k % 2 ? col(P.frill) : shade(col(P.frill), 0.9));
      gh.quad(outer0, outer1, rim1, rim0, col(P.frillEdge));
    }
    for (const sx of [-1, 1]) { // eyes
      const e = new THREE.Vector3(sx * 0.115, 0.02, -0.14);
      const s = 0.024;
      gh.tri(e.clone().add(new THREE.Vector3(0, s, 0)), e.clone().add(new THREE.Vector3(0, -s * 0.6, -s)), e.clone().add(new THREE.Vector3(0, -s * 0.6, s)), col(P.eye));
    }
    this.head = new THREE.Mesh(gh.build(), mat);
    this.head.position.set(0, 0.56, -0.45);
    // Tail: tall and flattened side to side (Protoceratops had tall tail spines).
    const gt = new GeomBuilder();
    loft(gt, [[0.0, 0.0, 0.11, 0.15], [0.25, -0.02, 0.07, 0.17], [0.5, -0.06, 0.045, 0.13], [0.75, -0.1, 0.025, 0.07], [0.92, -0.13, 0.01, 0.03]], 7, hideColor(1), false, true);
    this.tail = new THREE.Mesh(gt.build(), mat);
    this.tail.position.set(0, 0.56, 0.38);
    // Legs: short and sturdy; hind legs larger.
    const legGeo = (hind: boolean) => {
      const gl = new GeomBuilder();
      const h = hind ? 0.5 : 0.44, r = hind ? 0.085 : 0.07;
      addTube(gl, [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -h * 0.5, hind ? 0.04 : -0.02), new THREE.Vector3(0, -h + 0.03, 0.0), new THREE.Vector3(0, -h, -0.06)], [r, r * 0.75, r * 0.55, r * 0.5], 6, (s) => (s === 0 ? col(P.hide) : mix(P.hide, P.back, 0.5)));
      return gl.build();
    };
    for (const [x, z, hind] of [[-0.16, -0.27, false], [0.16, -0.27, false], [-0.18, 0.22, true], [0.18, 0.22, true]] as const) {
      const leg = new THREE.Mesh(legGeo(hind), mat);
      leg.position.set(x, hind ? 0.5 : 0.44, z);
      this.legs.push(leg);
      this.root.add(leg);
    }
    this.root.add(body, this.head, this.tail);
    this.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    this.root.scale.setScalar(1.2);
  }

  /** Galloping trot; `speed` in m/s, `lean` -1..1 while changing lanes, `hop` 0..1 over ledges. */
  update(dt: number, speed: number, lean: number, hop: number) {
    this.phase = (this.phase + (speed / 1.9) * dt) % 1;
    const t = this.phase * Math.PI * 2;
    const swing = Math.min(1, speed / 8) * 0.65;
    // Diagonal pairs (front-left with hind-right) for a trot.
    this.legs[0].rotation.x = Math.sin(t) * swing;
    this.legs[3].rotation.x = Math.sin(t) * swing;
    this.legs[1].rotation.x = Math.sin(t + Math.PI) * swing;
    this.legs[2].rotation.x = Math.sin(t + Math.PI) * swing;
    const bob = Math.abs(Math.sin(t)) * 0.05 * Math.min(1, speed / 6);
    this.root.position.y = bob + hop * 0.65;
    this.head.rotation.x = Math.sin(t * 2) * 0.06 - hop * 0.2;
    this.tail.rotation.y = Math.sin(t) * 0.18 - lean * 0.3;
    this.tail.rotation.x = 0.05 + hop * 0.25;
    this.root.rotation.z = -lean * 0.15;
    this.root.rotation.y = -lean * 0.25;
  }
}
