import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MATS } from '../materials';
import { Protoceratops } from './protoceratops';
import { groundHeight } from '../world/terrain';
import { Rng } from '../../core/rng';

/** Bakes a Protoceratops pose into one merged geometry (vertex colors kept). */
function bakePose(phaseSeconds: number) {
  const p = new Protoceratops();
  p.update(phaseSeconds, 4, 0, 0);
  p.root.updateMatrixWorld(true);
  const parts: THREE.BufferGeometry[] = [];
  p.root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const g = m.geometry.clone();
    g.applyMatrix4(m.matrixWorld);
    parts.push(g);
  });
  const merged = mergeGeometries(parts)!;
  parts.forEach((g) => g.dispose());
  return merged;
}

/**
 * A distant herd of Protoceratops walking the dunes (a landmark for the storm stretch). Two baked walk poses
 * as instanced meshes, alternated per animal, so the whole herd costs two draw calls.
 */
export class Herd {
  readonly group = new THREE.Group();
  private meshes: THREE.InstancedMesh[];
  private animals: { x: number; d0: number; speed: number; phase: number; yaw: number }[] = [];
  private t = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private s = new THREE.Vector3();
  private p = new THREE.Vector3();

  constructor(from: number, to: number, seed = 5) {
    const rng = new Rng(seed);
    // Small groups at the trail's edge. A sheep-sized animal only reads in a narrow portrait view when it's close
    // to the trail (lab check: 15 m out on the dunes it's a few pixels), so they're placed like the near rocks:
    // walking toward the runner, face first (the frill and beak read best head-on), and flashing past.
    const groups = 6;
    for (let gIdx = 0; gIdx < groups; gIdx++) {
      const side = gIdx % 2 ? -1 : 1;
      const d0 = from + 40 + ((to - from - 80) * gIdx) / (groups - 1);
      const x0 = side * rng.range(3.9, 4.8);
      const n = rng.int(2, 3);
      for (let i = 0; i < n; i++) {
        this.animals.push({ x: x0 + side * i * rng.range(0.9, 1.4), d0: d0 + i * rng.range(1.8, 2.8), speed: rng.range(1.0, 1.6), phase: rng.range(0, 1), yaw: Math.PI + side * rng.range(0.05, 0.2) });
      }
    }
    const poses = [bakePose(0.1), bakePose(0.29)]; // half a stride apart
    this.meshes = poses.map((g) => {
      const im = new THREE.InstancedMesh(g, MATS.character, this.animals.length);
      im.frustumCulled = false;
      im.castShadow = false;
      return im;
    });
    this.group.add(...this.meshes);
    this.update(0, -1e9);
  }

  /** dt in seconds; `runnerD` hides the herd when the runner is far from it. */
  update(dt: number, runnerD: number) {
    this.t += dt;
    let any = false;
    this.animals.forEach((a, i) => {
      // Their walk is keyed to the runner's progress, so restarts and checkpoints always find them in place.
      const walked = Math.max(0, runnerD - (a.d0 - 150)) * (a.speed / 19);
      const d = a.d0 + Math.cos(a.yaw) * walked;
      const x = a.x - Math.sin(a.yaw) * walked;
      const near = d - runnerD > -20 && d - runnerD < 200;
      any ||= near;
      const z = -d;
      const step = (this.t * a.speed * 0.7 + a.phase) % 1;
      const bob = Math.abs(Math.sin(step * Math.PI * 2)) * 0.06;
      this.p.set(x, groundHeight(x, z) - 0.05 + bob, z);
      this.e.set(0, a.yaw, 0);
      this.q.setFromEuler(this.e);
      const which = step < 0.5 ? 0 : 1;
      for (let k = 0; k < 2; k++) {
        this.s.setScalar(near && k === which ? 1 : 0); // the baked pose already carries the model's scale
        this.m.compose(this.p, this.q, this.s);
        this.meshes[k].setMatrixAt(i, this.m);
      }
    });
    for (const im of this.meshes) im.instanceMatrix.needsUpdate = true;
    this.group.visible = any;
  }
}
