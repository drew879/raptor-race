import * as THREE from 'three';
import { GeomBuilder, jitterGeometry } from '../geom';
import { GOBI, col, mix, shade } from '../palette';
import { MATS } from '../materials';
import { Rng } from '../../core/rng';
import { addTube } from './props';

export type HazardType = 'boulder' | 'ledge' | 'ledgeWide' | 'arch' | 'ribArch';

const rockTone = (n: THREE.Vector3, rng: Rng, base = GOBI.hazardRock, light = GOBI.hazardRockLight) => {
  const up = n.y;
  const c = up > 0.45 ? mix(base, light, 0.9) : up < -0.3 ? shade(col(base), 0.8) : mix(base, light, 0.35);
  return shade(c, 0.94 + rng.next() * 0.12);
};

function boulder(): THREE.BufferGeometry {
  const g = new GeomBuilder();
  const rng = new Rng(11);
  const main = jitterGeometry(new THREE.IcosahedronGeometry(1, 1), 0.28, () => rng.next());
  g.appendGeometry(main, new THREE.Matrix4().compose(new THREE.Vector3(0, 0.68, 0), new THREE.Quaternion(), new THREE.Vector3(0.66, 0.74, 0.58)), (_i, _c, n) => rockTone(n, rng));
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

/** Eroded sandstone arch over one lane: tapered legs, banded strata, curved span. Slide under (clearance 0.66 m). */
function arch(): THREE.BufferGeometry {
  const g = new GeomBuilder();
  const rng = new Rng(23);
  const bands = [col(GOBI.cliffRed), col(GOBI.cliffLight), col(GOBI.cliffRed), mix(GOBI.cliffRed, GOBI.cliffShadow, 0.45)];
  const tone = (c: THREE.Vector3, n: THREE.Vector3) => {
    const b = bands[Math.floor((c.y + 0.4) / 0.28) % bands.length];
    return shade(n.y > 0.5 ? mix(GOBI.cliffLight, GOBI.cliffPale, 0.3) : b, (n.y < -0.3 ? 0.82 : 1) * (0.94 + rng.next() * 0.12));
  };
  for (const sx of [-1, 1]) {
    const leg = jitterGeometry(new THREE.CylinderGeometry(0.24, 0.4, 1.2, 7, 4), 0.07, () => rng.next());
    g.appendGeometry(leg, new THREE.Matrix4().makeTranslation(sx * 0.95, 0.6, 0), (_i, c, n) => tone(c, n));
  }
  // Curved span: a bent tube from leg top to leg top, thick in the middle.
  const span: THREE.Vector3[] = [];
  const radii: number[] = [];
  for (let k = 0; k <= 8; k++) {
    const t = k / 8;
    const x = (t - 0.5) * 2.1;
    span.push(new THREE.Vector3(x, 1.0 + 0.18 * Math.sin(Math.PI * t) + (rng.next() - 0.5) * 0.04, (rng.next() - 0.5) * 0.06));
    radii.push(0.3 + 0.05 * Math.sin(Math.PI * t));
  }
  const tmp = new GeomBuilder();
  addTube(tmp, span, radii, 8, () => col(GOBI.cliffRed));
  const tg = tmp.build();
  g.appendGeometry(tg, new THREE.Matrix4(), (_i, c, n) => tone(c, n));
  tg.dispose();
  return g.build();
}

/** Giant fallen rib bones braced across all lanes at head height: slide. */
function ribArch(): THREE.BufferGeometry {
  const g = new GeomBuilder();
  const rng = new Rng(31);
  const bone = col(GOBI.bone);
  const boneD = mix(GOBI.bone, GOBI.sandShadow, 0.55);
  // Two support rocks.
  for (const sx of [-1, 1]) {
    const r = jitterGeometry(new THREE.IcosahedronGeometry(1, 0), 0.3, () => rng.next());
    g.appendGeometry(r, new THREE.Matrix4().compose(new THREE.Vector3(sx * 2.85, 0.45, 0), new THREE.Quaternion(), new THREE.Vector3(0.6, 0.6, 0.6)), (_i, _c, n) => rockTone(n, rng));
  }
  // Main bone shaft with knobbed ends.
  const y = 0.9;
  addTube(g, [new THREE.Vector3(-3.0, y + 0.08, 0), new THREE.Vector3(-1.5, y - 0.02, 0.05), new THREE.Vector3(0, y - 0.05, 0), new THREE.Vector3(1.5, y - 0.02, -0.05), new THREE.Vector3(3.0, y + 0.08, 0)], [0.26, 0.21, 0.2, 0.21, 0.26], 7, (s) => (s % 2 ? bone : shade(bone, 0.95)));
  // Darken downward-facing bone faces (shadowed underside).
  for (let i = 0; i < g.colors.length; i += 9) {
    const yA = g.pos[i + 1], yB = g.pos[i + 4], yC = g.pos[i + 7];
    if (yA + yB + yC < (y - 0.08) * 3 && yA > 0.5) for (let k = 0; k < 9; k++) g.colors[i + k] *= 0.62;
  }
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
