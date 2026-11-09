import * as THREE from 'three';
import { GeomBuilder, jitterGeometry } from '../geom';
import { GOBI, col, mix, shade } from '../palette';
import { MATS } from '../materials';
import { Rng } from '../../core/rng';
import { addTube } from './props';

export type HazardType = 'boulder' | 'ledge' | 'ledgeWide' | 'arch' | 'ribArch';

const rockTone = (n: THREE.Vector3, rng: Rng, base = GOBI.hazardRock, light = GOBI.hazardRockLight) => {
  const up = n.y;
  const c = up > 0.45 ? mix(base, light, 0.75) : up < -0.3 ? shade(col(base), 0.75) : col(base);
  return shade(c, 0.94 + rng.next() * 0.12);
};

function boulder(): THREE.BufferGeometry {
  const g = new GeomBuilder();
  const rng = new Rng(11);
  const main = jitterGeometry(new THREE.IcosahedronGeometry(1, 1), 0.28, () => rng.next());
  g.appendGeometry(main, new THREE.Matrix4().compose(new THREE.Vector3(0, 0.55, 0), new THREE.Quaternion(), new THREE.Vector3(0.66, 0.6, 0.58)), (_i, _c, n) => rockTone(n, rng));
  for (const [x, z, s] of [[-0.55, 0.25, 0.28], [0.5, 0.3, 0.22], [0.35, -0.4, 0.18]] as const) {
    const pebble = jitterGeometry(new THREE.IcosahedronGeometry(1, 0), 0.3, () => rng.next());
    g.appendGeometry(pebble, new THREE.Matrix4().compose(new THREE.Vector3(x, s * 0.5, z), new THREE.Quaternion(), new THREE.Vector3(s, s * 0.8, s)), (_i, _c, n) => rockTone(n, rng));
  }
  return g.build();
}

/** Low rock shelf to jump over. Width covers one lane (1.4) or all three (4.6). */
function ledge(width: number): THREE.BufferGeometry {
  const g = new GeomBuilder();
  const rng = new Rng(Math.round(width * 100));
  const box = new THREE.BoxGeometry(width, 0.6, 0.8, Math.max(2, Math.round(width * 2.5)), 2, 2);
  jitterGeometry(box, 0.12, () => rng.next());
  const stripe = col(GOBI.cliffShadow);
  g.appendGeometry(box, new THREE.Matrix4().makeTranslation(0, 0.29, 0), (_i, c, n) => {
    if (n.y > 0.5) return shade(mix(GOBI.hazardRockLight, GOBI.cliffLight, 0.25), 0.95 + rng.next() * 0.12);
    return c.y > 0.18 && c.y < 0.32 ? shade(stripe, 0.95 + rng.next() * 0.1) : rockTone(n, rng);
  });
  return g.build();
}

/** Natural sandstone arch over one lane: slide under the lintel (clearance 0.62 m). */
function arch(): THREE.BufferGeometry {
  const g = new GeomBuilder();
  const rng = new Rng(23);
  const red = mix(GOBI.cliffShadow, GOBI.cliffRed, 0.55), redL = mix(GOBI.cliffRed, GOBI.cliffLight, 0.35);
  const tone = (n: THREE.Vector3) => shade(n.y > 0.4 ? redL : red, 0.93 + rng.next() * 0.14);
  for (const sx of [-1, 1]) {
    const pillar = jitterGeometry(new THREE.CylinderGeometry(0.3, 0.42, 1.3, 7, 3), 0.08, () => rng.next());
    g.appendGeometry(pillar, new THREE.Matrix4().makeTranslation(sx * 0.98, 0.64, 0), (_i, _c, n) => tone(n));
  }
  const lintel = jitterGeometry(new THREE.CylinderGeometry(0.34, 0.34, 2.7, 8, 6), 0.09, () => rng.next());
  lintel.rotateZ(Math.PI / 2);
  lintel.scale(1, 0.85, 1.05);
  g.appendGeometry(lintel, new THREE.Matrix4().makeTranslation(0, 0.62 + 0.29, 0), (_i, _c, n) => tone(n));
  return g.build();
}

/** Giant fallen rib bones braced across all lanes at head height: slide. */
function ribArch(): THREE.BufferGeometry {
  const g = new GeomBuilder();
  const rng = new Rng(31);
  const bone = col(GOBI.bone);
  const boneD = mix(GOBI.bone, GOBI.sandShadow, 0.45);
  // Two support rocks.
  for (const sx of [-1, 1]) {
    const r = jitterGeometry(new THREE.IcosahedronGeometry(1, 0), 0.3, () => rng.next());
    g.appendGeometry(r, new THREE.Matrix4().compose(new THREE.Vector3(sx * 2.85, 0.45, 0), new THREE.Quaternion(), new THREE.Vector3(0.6, 0.6, 0.6)), (_i, _c, n) => rockTone(n, rng));
  }
  // Main bone shaft with knobbed ends.
  const y = 0.9;
  addTube(g, [new THREE.Vector3(-3.0, y + 0.08, 0), new THREE.Vector3(-1.5, y - 0.02, 0.05), new THREE.Vector3(0, y - 0.05, 0), new THREE.Vector3(1.5, y - 0.02, -0.05), new THREE.Vector3(3.0, y + 0.08, 0)], [0.26, 0.21, 0.2, 0.21, 0.26], 7, (s) => (s % 2 ? bone : shade(bone, 0.95)));
  for (const sx of [-1, 1]) {
    const knob = jitterGeometry(new THREE.IcosahedronGeometry(1, 0), 0.2, () => rng.next());
    g.appendGeometry(knob, new THREE.Matrix4().compose(new THREE.Vector3(sx * 3.05, y + 0.1, 0), new THREE.Quaternion(), new THREE.Vector3(0.3, 0.26, 0.28)), () => shade(boneD, 1.1 + rng.next() * 0.1));
  }
  return g.build();
}

const GEOMS: Partial<Record<HazardType, THREE.BufferGeometry>> = {};
export function hazardGeometry(type: HazardType): THREE.BufferGeometry {
  if (!GEOMS[type]) {
    GEOMS[type] =
      type === 'boulder' ? boulder() : type === 'ledge' ? ledge(1.4) : type === 'ledgeWide' ? ledge(4.6) : type === 'arch' ? arch() : ribArch();
  }
  return GEOMS[type]!;
}

export function createHazard(type: HazardType): THREE.Mesh {
  const m = new THREE.Mesh(hazardGeometry(type), MATS.hazard);
  m.castShadow = true;
  m.receiveShadow = true;
  m.name = type;
  return m;
}
