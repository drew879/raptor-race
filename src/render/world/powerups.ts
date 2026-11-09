import * as THREE from 'three';
import { GeomBuilder } from '../geom';
import { GOBI, RAPTOR_GOBI_STREAK, col, mix, shade } from '../palette';
import { MATS } from '../materials';
import { amberGeometry } from './collectibles';

/** Updraft: a whirl of teal feather blades around a vertical axis. */
function updraftGeometry() {
  const g = new GeomBuilder();
  const teal = col(RAPTOR_GOBI_STREAK.accent), light = mix(RAPTOR_GOBI_STREAK.accent, 0xffffff, 0.55), ink = col(0x1f4c50);
  const N = 9;
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2;
    const base = new THREE.Vector3(Math.cos(a) * 0.16, -0.38 + (k % 3) * 0.06, Math.sin(a) * 0.16);
    const dir = new THREE.Vector3(Math.cos(a + 1.1) * 0.55, 1, Math.sin(a + 1.1) * 0.55).normalize();
    const side = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
    const p = (t: number, w: number) => base.clone().addScaledVector(dir, 0.75 * t).addScaledVector(side, w);
    const c1 = k % 2 ? teal : shade(teal, 0.85);
    g.tri(base, p(0.35, 0.09), p(0.35, -0.09), ink);
    g.tri(p(0.35, 0.09), p(0.75, 0.06), p(0.35, -0.09), c1);
    g.tri(p(0.35, -0.09), p(0.75, 0.06), p(0.75, -0.06), c1);
    g.tri(p(0.75, 0.06), p(1, 0), p(0.75, -0.06), light);
  }
  return g.build();
}

/** Amber Sense: a large amber gem held in an ink-and-amber ring. */
function magnetGeometry() {
  const g = new GeomBuilder();
  g.appendGeometry(amberGeometry(), new THREE.Matrix4().makeScale(1.7, 1.7, 1.7), (_i, c) => (c.y > 0.1 ? col(GOBI.amberLight) : col(GOBI.amberCore)));
  const ring = new THREE.TorusGeometry(0.44, 0.045, 5, 18);
  g.appendGeometry(ring, new THREE.Matrix4(), (i) => (i % 2 ? col(0x5a2c0c) : col(GOBI.amberDeep)));
  return g.build();
}

export class PowerupView {
  readonly group = new THREE.Group();
  private geos = { updraft: updraftGeometry(), magnet: magnetGeometry() };
  private live = new Map<number, THREE.Mesh>();
  sync(items: Array<{ id: number; kind: string; x: number; y: number; d: number; taken: boolean }>, time: number) {
    const seen = new Set<number>();
    for (const it of items) {
      if (it.taken || (it.kind !== 'updraft' && it.kind !== 'magnet')) continue;
      seen.add(it.id);
      let m = this.live.get(it.id);
      if (!m) {
        m = new THREE.Mesh(this.geos[it.kind as 'updraft' | 'magnet'], MATS.glow);
        m.frustumCulled = false;
        this.group.add(m);
        this.live.set(it.id, m);
      }
      m.position.set(it.x, it.y + Math.sin(time * 2.4 + it.d) * 0.08, -it.d);
      m.rotation.y = time * (it.kind === 'updraft' ? 2.6 : 1.4);
    }
    for (const [id, m] of this.live) if (!seen.has(id)) { this.group.remove(m); this.live.delete(id); }
  }
}

/** The raptor's nest at the end of the level: a sand mound ringed with sticks and feathers. */
export function buildNest(): THREE.Mesh {
  const g = new GeomBuilder();
  const sand = col(GOBI.sandMid), sandL = col(GOBI.sandLight), stick = mix(0x8b7765, GOBI.sandShadow, 0.3);
  const R = 1.5, N = 14;
  const ringOuter = (r: number, y: number) => Array.from({ length: N }, (_, k) => new THREE.Vector3(Math.cos((k / N) * 6.283) * r, y, Math.sin((k / N) * 6.283) * r));
  const o = ringOuter(R + 0.9, 0), m = ringOuter(R, 0.42), i = ringOuter(R - 0.45, 0.18);
  const c = new THREE.Vector3(0, 0.08, 0);
  for (let k = 0; k < N; k++) {
    const k1 = (k + 1) % N;
    g.quad(o[k1], o[k], m[k], m[k1], shade(sand, 0.95 + (k % 3) * 0.04));
    g.quad(m[k1], m[k], i[k], i[k1], shade(sandL, 0.96 + (k % 2) * 0.05));
    g.tri(i[k1], i[k], c, shade(sand, 0.85));
  }
  // Sticks woven around the rim.
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * 6.283;
    const a2 = a + 0.9;
    const p0 = new THREE.Vector3(Math.cos(a) * (R + 0.05), 0.42, Math.sin(a) * (R + 0.05));
    const p1 = new THREE.Vector3(Math.cos(a2) * (R + 0.1), 0.5, Math.sin(a2) * (R + 0.1));
    const s = new THREE.Vector3().subVectors(p1, p0);
    const up = new THREE.Vector3(0, 0.05, 0);
    const side = new THREE.Vector3(-s.z, 0, s.x).normalize().multiplyScalar(0.04);
    g.quad(p0.clone().sub(side), p1.clone().sub(side), p1.clone().add(side).add(up), p0.clone().add(side).add(up), shade(stick, 0.9 + (k % 3) * 0.06));
  }
  const mesh = new THREE.Mesh(g.build(), MATS.world);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}
