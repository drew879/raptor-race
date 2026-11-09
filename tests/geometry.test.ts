import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { amberGeometry, eggGeometry } from '../src/render/world/collectibles';

/** Every face of a closed convex mesh must face away from its center, or front-face culling eats it. */
function inwardFaces(g: THREE.BufferGeometry) {
  const p = g.getAttribute('position');
  const center = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) center.add(new THREE.Vector3().fromBufferAttribute(p, i));
  center.divideScalar(p.count);
  let bad = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    const n = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a));
    const cen = a.clone().add(b).add(c).multiplyScalar(1 / 3);
    if (n.dot(cen.sub(center)) <= 0) bad++;
  }
  return bad;
}

describe('collectible geometry winding', () => {
  it('amber faces all point outward', () => expect(inwardFaces(amberGeometry())).toBe(0));
  it('egg faces all point outward', () => expect(inwardFaces(eggGeometry())).toBe(0));
});
