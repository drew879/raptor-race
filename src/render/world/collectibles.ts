import * as THREE from 'three';
import { GeomBuilder } from '../geom';
import { GOBI, col, mix, shade } from '../palette';
import { MATS, worldUniforms } from '../materials';
import { Rng } from '../../core/rng';

/** Faceted teardrop of amber. Unlit and untonemapped so it is always the warmest glow on screen. */
export function amberGeometry(): THREE.BufferGeometry {
  const g = new GeomBuilder();
  const top = new THREE.Vector3(0, 0.26, 0), bot = new THREE.Vector3(0, -0.17, 0);
  const N = 6;
  const ringA = Array.from({ length: N }, (_, k) => { const a = (k / N) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * 0.1, 0.08, Math.sin(a) * 0.1); });
  const ringB = Array.from({ length: N }, (_, k) => { const a = ((k + 0.5) / N) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * 0.15, -0.04, Math.sin(a) * 0.15); });
  const light = col(GOBI.amberLight), core = col(GOBI.amberCore), deep = col(GOBI.amberDeep);
  for (let k = 0; k < N; k++) {
    const k1 = (k + 1) % N;
    g.tri(ringA[k1], ringA[k], top, k % 2 ? light : mix(GOBI.amberLight, 0xffffff, 0.35));
    g.tri(ringA[k], ringB[k], ringA[k1], core);
    g.tri(ringA[k1], ringB[k], ringB[k1], k % 2 ? shade(core, 0.9) : mix(GOBI.amberCore, GOBI.amberLight, 0.4));
    g.tri(ringB[k1], ringB[k], bot, k % 2 ? deep : mix(GOBI.amberDeep, GOBI.amberCore, 0.5));
  }
  return g.build();
}

export function eggGeometry(): THREE.BufferGeometry {
  const g = new GeomBuilder();
  const rng = new Rng(4);
  // Elongated egg profile (radius, y).
  const prof: Array<[number, number]> = [[0, -0.2], [0.09, -0.18], [0.135, -0.11], [0.15, -0.01], [0.14, 0.09], [0.11, 0.17], [0.06, 0.225], [0, 0.245]];
  const N = 9;
  const shell = col(0xf4ead6), speck = col(0xa98f6c), speckD = col(0x7d6650);
  const ring = (i: number) => Array.from({ length: N }, (_, k) => {
    const a = (k / N) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * prof[i][0], prof[i][1], Math.sin(a) * prof[i][0]);
  });
  for (let i = 0; i < prof.length - 1; i++) {
    const r0 = ring(i), r1 = ring(i + 1);
    for (let k = 0; k < N; k++) {
      const k1 = (k + 1) % N;
      const r = rng.next();
      const c = r < 0.16 ? speck : r < 0.22 ? speckD : shade(shell, 0.96 + rng.next() * 0.06);
      g.quad(r0[k1], r0[k], r1[k], r1[k1], c);
    }
  }
  return g.build();
}

/** Soft additive halos rendered as bent, fog-faded points. */
export class HaloField {
  readonly points: THREE.Points;
  private pos: Float32Array;
  private size: Float32Array;
  private alpha: Float32Array;
  private color: Float32Array;
  private geo: THREE.BufferGeometry;
  readonly capacity: number;
  constructor(capacity: number, fog: { near: number; far: number }, blending: THREE.Blending = THREE.AdditiveBlending) {
    this.capacity = capacity;
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(capacity * 3);
    this.size = new Float32Array(capacity);
    this.alpha = new Float32Array(capacity);
    this.color = new Float32Array(capacity * 3);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aColor', new THREE.BufferAttribute(this.color, 3).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uCurve: worldUniforms.uCurve, uScale: { value: 800 }, uFogNear: { value: fog.near }, uFogFar: { value: fog.far } },
      vertexShader: /* glsl */ `
        uniform float uCurve, uScale, uFogNear, uFogFar;
        attribute float aSize, aAlpha; attribute vec3 aColor;
        varying float vAlpha; varying vec3 vColor;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float dist = -mv.z;
          vAlpha = aAlpha * (1.0 - smoothstep(uFogNear, uFogFar, dist));
          vColor = aColor;
          mv.y -= uCurve * mv.z * mv.z;
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uScale / max(dist, 0.1);
        }`,
      fragmentShader: /* glsl */ `
        varying float vAlpha; varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float a = pow(max(1.0 - d, 0.0), 2.2) * vAlpha;
          gl_FragColor = vec4(vColor * a, a);
        }`,
      blending,
      premultipliedAlpha: true,
      depthWrite: false,
      transparent: true,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    this.geo.setDrawRange(0, 0);
  }
  setScale(viewportHeightPx: number, fovDeg: number) {
    (this.points.material as THREE.ShaderMaterial).uniforms.uScale.value = viewportHeightPx / (2 * Math.tan((fovDeg * Math.PI) / 360));
  }
  /** Write halo i. Call commit(count) after writing. */
  set(i: number, x: number, y: number, z: number, size: number, alpha: number, c: THREE.Color) {
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.size[i] = size; this.alpha[i] = alpha;
    this.color[i * 3] = c.r; this.color[i * 3 + 1] = c.g; this.color[i * 3 + 2] = c.b;
  }
  commit(count: number) {
    this.geo.setDrawRange(0, count);
    for (const k of ['position', 'aSize', 'aAlpha', 'aColor']) (this.geo.getAttribute(k) as THREE.BufferAttribute).needsUpdate = true;
  }
}

export interface Collectible {
  kind: 'amber' | 'egg';
  x: number;
  y: number;
  z: number;
  active: boolean;
  phase: number;
}

/** Instanced amber and eggs with bob/spin animation and glow halos. */
export class CollectibleField {
  readonly group = new THREE.Group();
  private amberMesh: THREE.InstancedMesh;
  private eggMesh: THREE.InstancedMesh;
  readonly halos: HaloField;
  items: Collectible[] = [];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private s = new THREE.Vector3();
  private p = new THREE.Vector3();
  private amberHalo = mix(GOBI.amberCore, GOBI.amberLight, 0.4);
  private eggHalo = mix(0xfff1d6, GOBI.amberLight, 0.3);
  constructor(capacity = 300, fog = { near: 30, far: 150 }) {
    this.amberMesh = new THREE.InstancedMesh(amberGeometry(), MATS.glow, capacity);
    this.eggMesh = new THREE.InstancedMesh(eggGeometry(), MATS.character, 8);
    this.eggMesh.castShadow = true;
    for (const im of [this.amberMesh, this.eggMesh]) { im.frustumCulled = false; im.count = 0; }
    this.halos = new HaloField(capacity + 8, fog);
    this.group.add(this.amberMesh, this.eggMesh, this.halos.points);
  }
  add(kind: Collectible['kind'], x: number, y: number, z: number) {
    const it = { kind, x, y, z, active: true, phase: (x * 1.7 + z * 0.37) % 6.28 };
    this.items.push(it);
    return it;
  }
  /** Drop items behind the camera to keep the arrays small. */
  prune(behindZ: number) {
    this.items = this.items.filter((it) => it.active && it.z < behindZ);
  }
  update(time: number) {
    let na = 0, ne = 0, nh = 0;
    for (const it of this.items) {
      if (!it.active) continue;
      const bob = Math.sin(time * 3 + it.phase) * 0.06;
      if (it.kind === 'amber') {
        this.e.set(0.25, time * 2.2 + it.phase, 0);
        this.q.setFromEuler(this.e);
        this.s.setScalar(1.35);
        this.p.set(it.x, it.y + bob, it.z);
        this.m.compose(this.p, this.q, this.s);
        this.amberMesh.setMatrixAt(na++, this.m);
        this.halos.set(nh++, it.x, it.y + bob, it.z, 1.05, 0.55, this.amberHalo);
      } else {
        this.e.set(0.15, time * 1.3, 0.1);
        this.q.setFromEuler(this.e);
        this.s.setScalar(1.25);
        this.p.set(it.x, it.y + bob, it.z);
        this.m.compose(this.p, this.q, this.s);
        this.eggMesh.setMatrixAt(ne++, this.m);
        this.halos.set(nh++, it.x, it.y + bob, it.z, 1.7 + 0.15 * Math.sin(time * 4), 0.6, this.eggHalo);
      }
    }
    this.amberMesh.count = na;
    this.eggMesh.count = ne;
    this.amberMesh.instanceMatrix.needsUpdate = true;
    this.eggMesh.instanceMatrix.needsUpdate = true;
    this.halos.commit(nh);
  }
}
