import * as THREE from 'three';
import { GeomBuilder } from '../geom';
import { MATS } from '../materials';
import { col, mix, shade } from '../palette';
import { addTube } from '../world/props';

/**
 * An azhdarchid pterosaur: a big crested head with a long pointed beak on a long stiff neck, a small body, and
 * long membrane wings (about 6 m across) braced by the wing finger. Faces -Z. Wings flap at the shoulders.
 */
const P = { body: 0x6b5446, belly: 0xc9b49a, wingTop: 0x5a463b, wingUnder: 0xb79a7c, crest: 0xc4532f, beak: 0x2f2a28, finger: 0x3c302a };

function wing(side: 1 | -1) {
  const g = new GeomBuilder();
  // Leading edge: arm then the long wing finger; trailing edge sweeps back to the leg.
  const lead = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(side * 0.8, 0.08, -0.12), new THREE.Vector3(side * 1.6, 0.14, -0.05), new THREE.Vector3(side * 2.4, 0.1, 0.12), new THREE.Vector3(side * 3.0, 0.02, 0.38)];
  const trail = [new THREE.Vector3(0, -0.02, 0.55), new THREE.Vector3(side * 0.8, 0.02, 0.62), new THREE.Vector3(side * 1.6, 0.06, 0.58), new THREE.Vector3(side * 2.3, 0.05, 0.5), new THREE.Vector3(side * 3.0, 0.02, 0.38)];
  for (let i = 0; i < lead.length - 1; i++) {
    const shadeK = 0.92 + i * 0.03;
    const [a, b, c, d] = side > 0 ? [lead[i], lead[i + 1], trail[i + 1], trail[i]] : [lead[i + 1], lead[i], trail[i], trail[i + 1]];
    g.quad(a, b, c, d, shade(mix(P.wingTop, P.wingUnder, i % 2 ? 0.12 : 0), shadeK));
  }
  addTube(g, lead, [0.05, 0.045, 0.035, 0.025, 0.01], 4, () => col(P.finger));
  return g.build();
}

export class Pterosaur {
  readonly root = new THREE.Group();
  private wingL = new THREE.Group();
  private wingR = new THREE.Group();
  private neck = new THREE.Group();
  private t = 0;

  constructor() {
    const mat = MATS.character;
    const g = new GeomBuilder();
    // Body: a short, deep torso.
    addTube(g, [new THREE.Vector3(0, 0, -0.35), new THREE.Vector3(0, -0.02, 0), new THREE.Vector3(0, -0.04, 0.4)], [0.16, 0.2, 0.08], 7, (s) => (s === 1 ? col(P.body) : shade(col(P.body), 0.92)));
    // Legs trailing behind.
    for (const sx of [-1, 1]) addTube(g, [new THREE.Vector3(sx * 0.1, -0.08, 0.3), new THREE.Vector3(sx * 0.14, -0.12, 0.7), new THREE.Vector3(sx * 0.16, -0.1, 0.95)], [0.04, 0.03, 0.02], 4, () => col(P.finger));
    this.root.add(new THREE.Mesh(g.build(), mat));
    // Neck and head, pivoting at the shoulders.
    const gn = new GeomBuilder();
    addTube(gn, [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.12, -0.6), new THREE.Vector3(0, 0.18, -1.15)], [0.1, 0.075, 0.07], 6, () => col(P.body));
    // Head: long tapering beak with a tall crest.
    const hb = new THREE.Vector3(0, 0.2, -1.2);
    addTube(gn, [hb, hb.clone().add(new THREE.Vector3(0, -0.02, -0.5)), hb.clone().add(new THREE.Vector3(0, -0.08, -1.15))], [0.12, 0.07, 0.008], 6, (s) => (s === 0 ? col(P.body) : col(P.beak)));
    gn.tri(hb.clone().add(new THREE.Vector3(0, 0.08, 0.1)), hb.clone().add(new THREE.Vector3(0, 0.62, 0.3)), hb.clone().add(new THREE.Vector3(0, 0.1, -0.35)), col(P.crest));
    gn.tri(hb.clone().add(new THREE.Vector3(0, 0.1, -0.35)), hb.clone().add(new THREE.Vector3(0, 0.62, 0.3)), hb.clone().add(new THREE.Vector3(0, 0.08, 0.1)), shade(col(P.crest), 0.8));
    for (const sx of [-1, 1]) gn.tri(hb.clone().add(new THREE.Vector3(sx * 0.1, 0.06, -0.12)), hb.clone().add(new THREE.Vector3(sx * 0.1, 0.1, -0.2)), hb.clone().add(new THREE.Vector3(sx * 0.1, 0.02, -0.2)), col(0x14100e));
    this.neck.add(new THREE.Mesh(gn.build(), mat));
    this.neck.position.set(0, 0.05, -0.3);
    this.root.add(this.neck);
    this.wingL.add(new THREE.Mesh(wing(-1), mat));
    this.wingR.add(new THREE.Mesh(wing(1), mat));
    this.wingL.position.set(-0.12, 0.04, -0.2);
    this.wingR.position.set(0.12, 0.04, -0.2);
    this.root.add(this.wingL, this.wingR);
    this.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  }

  /** `flap` 0 glides (wings held level), 1 beats hard. */
  update(dt: number, flap: number) {
    this.t += dt;
    const beat = Math.sin(this.t * 7) * 0.55 * flap;
    const glide = 0.08 * Math.sin(this.t * 1.3);
    this.wingL.rotation.z = -(beat + glide);
    this.wingR.rotation.z = beat + glide;
    this.neck.rotation.x = -0.05 + Math.sin(this.t * 2.1) * 0.04;
  }
}
