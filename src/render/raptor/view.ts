import * as THREE from 'three';
import { buildRaptor } from './model';
import { RaptorAnimator, defaultAnimInput, type RaptorAnimInput } from './anim';
import type { RaptorPlumage } from '../palette';
import type { Runner } from '../../game/runner';

/** Visual raptor that mirrors a Runner's state. */
export class RaptorView {
  readonly root = new THREE.Group();
  readonly anim: RaptorAnimator;
  readonly input: RaptorAnimInput = defaultAnimInput();
  constructor(plumage: RaptorPlumage) {
    const { mesh, bones } = buildRaptor(plumage);
    this.root.add(mesh);
    this.anim = new RaptorAnimator(bones);
  }
  sync(r: Runner, dt: number, idle = 0) {
    this.root.position.set(r.x, r.y, -r.distance);
    this.root.rotation.y = -r.lean * 0.12;
    const i = this.input;
    i.speed = r.speed * (1 - idle);
    i.air = r.airWeight;
    i.vy = r.vy;
    i.slide = r.slideWeight;
    i.lean = r.lean;
    i.land = r.landImpulse;
    i.stumble = r.stumble;
    i.idle = idle;
    this.anim.update(dt, i);
  }
}
