import * as THREE from 'three';
import { patchWorld } from './materials';

/**
 * Three-toed footprints pressed into the sand behind the raptor (and anything else that walks), fading out over
 * a couple of seconds. One instanced mesh, one draw call; prints recycle round-robin.
 */
export class Footprints {
  readonly mesh: THREE.InstancedMesh;
  private age: Float32Array;
  private next = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3();
  private p = new THREE.Vector3();
  private c = new THREE.Color();

  constructor(private capacity = 48, private life = 2.4) {
    // A print: three toe slots fanning forward from a heel pad, in the XZ plane, pointing -Z.
    const g = new THREE.BufferGeometry();
    const v: number[] = [];
    const quad = (cx: number, cz: number, w: number, l: number, ang: number) => {
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const pt = (x: number, z: number) => [cx + x * ca - z * sa, 0, cz + x * sa + z * ca];
      const a = pt(-w, -l), b = pt(w, -l), c = pt(w, l), d = pt(-w, l);
      v.push(...a, ...d, ...c, ...a, ...c, ...b);
    };
    quad(0, 0.02, 0.035, 0.035, 0); // heel
    quad(0, -0.1, 0.018, 0.09, 0); // middle toe
    quad(-0.05, -0.07, 0.016, 0.07, -0.45); // inner toe
    quad(0.05, -0.07, 0.016, 0.07, 0.45); // outer toe
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.computeVertexNormals();
    const mat = patchWorld(new THREE.MeshBasicMaterial({ color: 0x8c5a35, transparent: true, opacity: 1, depthWrite: false, fog: true }), {});
    this.mesh = new THREE.InstancedMesh(g, mat, capacity);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.age = new Float32Array(capacity).fill(life);
    for (let i = 0; i < capacity; i++) this.hide(i);
  }

  private hide(i: number) {
    this.m.makeScale(0, 0, 0);
    this.mesh.setMatrixAt(i, this.m);
  }

  /** Press a print at (x, z) on flat ground, pointing along -Z, scaled by `size`. */
  add(x: number, z: number, size = 1, yaw = 0) {
    const i = this.next;
    this.next = (this.next + 1) % this.capacity;
    this.age[i] = 0;
    this.p.set(x, 0.012, z);
    this.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    this.s.setScalar(size);
    this.m.compose(this.p, this.q, this.s);
    this.mesh.setMatrixAt(i, this.m);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /** Fade prints toward the sand color as they age (the material blends, so "fading" is a color lerp). */
  update(dt: number, sand: THREE.Color) {
    for (let i = 0; i < this.capacity; i++) {
      if (this.age[i] >= this.life) continue;
      this.age[i] += dt;
      const k = Math.min(1, this.age[i] / this.life);
      this.c.setHex(0x8c5a35).lerp(sand, k * k);
      this.mesh.setColorAt(i, this.c);
      if (this.age[i] >= this.life) { this.hide(i); this.mesh.instanceMatrix.needsUpdate = true; }
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  clear() {
    this.age.fill(this.life);
    for (let i = 0; i < this.capacity; i++) this.hide(i);
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
