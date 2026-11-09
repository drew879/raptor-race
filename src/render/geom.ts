import * as THREE from 'three';

/**
 * Builds non-indexed, per-face-colored geometry for the faceted low-poly look.
 * Optional skin attributes for the skinned raptor.
 */
export class GeomBuilder {
  pos: number[] = [];
  colors: number[] = [];
  skinIdx: number[] = [];
  skinW: number[] = [];
  skinned: boolean;
  private curSkin: [number, number, number, number, number, number, number, number] = [0, 0, 0, 0, 1, 0, 0, 0];

  constructor(skinned = false) {
    this.skinned = skinned;
  }

  /** Set the skin binding applied to subsequent vertices: up to 2 bones. */
  bind(boneA: number, boneB = boneA, wB = 0) {
    this.curSkin = [boneA, boneB, 0, 0, 1 - wB, wB, 0, 0];
    return this;
  }

  private v(p: THREE.Vector3, c: THREE.Color, skin?: number[]) {
    this.pos.push(p.x, p.y, p.z);
    this.colors.push(c.r, c.g, c.b);
    if (this.skinned) {
      const s = skin ?? this.curSkin;
      this.skinIdx.push(s[0], s[1], s[2], s[3]);
      this.skinW.push(s[4], s[5], s[6], s[7]);
    }
  }

  tri(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, color: THREE.Color, skins?: [number[], number[], number[]]) {
    // Skip degenerate (zero-area) triangles, e.g. at tube poles.
    const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z, vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z;
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    if (cx * cx + cy * cy + cz * cz < 1e-14) return this;
    this.v(a, color, skins?.[0]);
    this.v(b, color, skins?.[1]);
    this.v(c, color, skins?.[2]);
    return this;
  }

  /** Quad a-b-c-d (counter-clockwise when viewed from the front). */
  quad(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, color: THREE.Color, color2?: THREE.Color, skins?: [number[], number[], number[], number[]]) {
    this.tri(a, b, c, color, skins ? [skins[0], skins[1], skins[2]] : undefined);
    this.tri(a, c, d, color2 ?? color, skins ? [skins[0], skins[2], skins[3]] : undefined);
    return this;
  }

  /** Append another non-indexed geometry (positions + optional colors) transformed by a matrix. */
  appendGeometry(g: THREE.BufferGeometry, m: THREE.Matrix4, colorFn: (faceIndex: number, centroid: THREE.Vector3, normal: THREE.Vector3) => THREE.Color) {
    const src = g.index ? g.toNonIndexed() : g;
    const p = src.getAttribute('position');
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const cen = new THREE.Vector3(), n = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
    for (let i = 0; i < p.count; i += 3) {
      a.fromBufferAttribute(p, i).applyMatrix4(m);
      b.fromBufferAttribute(p, i + 1).applyMatrix4(m);
      c.fromBufferAttribute(p, i + 2).applyMatrix4(m);
      cen.copy(a).add(b).add(c).multiplyScalar(1 / 3);
      n.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a)).normalize();
      this.tri(a, b, c, colorFn(i / 3, cen, n));
    }
    if (src !== g) src.dispose();
    return this;
  }

  /** For closed convex shapes: flip any triangle whose normal points toward `center`. */
  orientOutward(center: THREE.Vector3) {
    const P = this.pos;
    const v = (i: number) => new THREE.Vector3(P[i], P[i + 1], P[i + 2]);
    for (let t = 0; t < P.length; t += 9) {
      const a = v(t), b = v(t + 3), c = v(t + 6);
      const n = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a));
      const cen = a.clone().add(b).add(c).multiplyScalar(1 / 3).sub(center);
      if (n.dot(cen) < 0) {
        for (let k = 0; k < 3; k++) { const tmp = P[t + 3 + k]; P[t + 3 + k] = P[t + 6 + k]; P[t + 6 + k] = tmp; }
        const C = this.colors;
        for (let k = 0; k < 3; k++) { const tmp = C[t + 3 + k]; C[t + 3 + k] = C[t + 6 + k]; C[t + 6 + k] = tmp; }
      }
    }
    return this;
  }

  get vertexCount() {
    return this.pos.length / 3;
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    if (this.skinned) {
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.skinIdx, 4));
      g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.skinW, 4));
    }
    g.computeVertexNormals();
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

/** Jitter the vertices of a geometry deterministically (shared positions move together). */
export function jitterGeometry(g: THREE.BufferGeometry, amount: number, rand: () => number) {
  const p = g.getAttribute('position');
  const map = new Map<string, [number, number, number]>();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
    let d = map.get(key);
    if (!d) {
      d = [(rand() - 0.5) * amount, (rand() - 0.5) * amount, (rand() - 0.5) * amount];
      map.set(key, d);
    }
    p.setXYZ(i, p.getX(i) + d[0], p.getY(i) + d[1], p.getZ(i) + d[2]);
  }
  p.needsUpdate = true;
  return g;
}
