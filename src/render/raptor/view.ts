import * as THREE from 'three';
import { buildRaptor } from './model';
import { buildCaudipteryx, caudRest } from '../caudipteryx/model';
import { velociraptorBody } from './assets';
import { RaptorAnimator, defaultAnimInput, type RaptorAnimInput } from './anim';
import type { RaptorPlumage } from '../palette';
import type { Runner } from '../../game/runner';
import { lookAt } from '../look';

/** Visual raptor that mirrors a Runner's state. */
/** Caudipteryx is drawn 20% larger than its model (hips ~0.72 m): still smaller than the Velociraptor. */
export const CAUD_SCALE = 1.2;

export class RaptorView {
  readonly root = new THREE.Group();
  readonly anim: RaptorAnimator;
  readonly input: RaptorAnimInput = defaultAnimInput();
  /** Caudipteryx's tail fan pivot, and how far it's lifted (radians). */
  private fan?: THREE.Group;
  private fanLift = 0.8;
  /** Code-built body by default (it won the blind A/B review); `blenderBody` opts into the Blender mesh.
   * `species` picks the hero: the Velociraptor, or Caudipteryx (same skeleton and animations, its own body). */
  constructor(plumage: RaptorPlumage, opts: { blenderBody?: boolean; species?: 'velociraptor' | 'caudipteryx' } = {}) {
    if (opts.species === 'caudipteryx') {
      const { mesh, bones, fan } = buildCaudipteryx(plumage);
      mesh.scale.setScalar(CAUD_SCALE); // a little larger than life, so it reads from the chase camera
      this.root.add(mesh);
      this.fan = fan;
      this.anim = new RaptorAnimator(bones, { rest: caudRest, finale: 'brood', strideScale: 0.85 });
      return;
    }
    const { mesh, bones } = buildRaptor(plumage, opts.blenderBody ? { body: velociraptorBody() } : {});
    this.root.add(mesh);
    this.anim = new RaptorAnimator(bones);
  }
  /** `speed` overrides the runner's speed for the legs (a walk in the opening shot). */
  sync(r: Runner, dt: number, idle = 0, pin = 0, speed?: number) {
    this.root.position.set(r.x, r.y, -r.distance);
    this.root.rotation.y = -r.lean * 0.12;
    const i = this.input;
    i.speed = (speed ?? r.speed) * (1 - idle);
    i.air = r.airWeight;
    i.vy = r.vy;
    i.slide = r.slideWeight;
    i.lean = r.lean;
    i.land = r.landImpulse;
    i.stumble = r.stumble;
    i.idle = idle;
    i.glide = r.glideWeight;
    i.pin = pin;
    this.anim.update(dt, i);
    if (this.fan) {
      // Version 2: the fan rides at ~45 degrees while running (the stripes still read from behind, and more of the
      // body shows) and opens up on jumps, turns, the menus and the brood. Version 1 holds it at ~60 degrees.
      const target = lookAt(2) ? Math.min(1.3, 0.8 + 0.5 * r.airWeight + 0.5 * Math.abs(r.lean) + 0.3 * idle + 0.5 * pin) : 1.05;
      this.fanLift += (target - this.fanLift) * Math.min(1, dt * 8);
      this.fan.rotation.x = -this.fanLift;
      this.fan.scale.x = lookAt(2) ? 0.88 + 0.24 * Math.min(1, (this.fanLift - 0.8) / 0.5) : 1;
    }
  }
}
