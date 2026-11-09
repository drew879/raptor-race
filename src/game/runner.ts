import { CONFIG, laneX } from './config';
import { clamp, easeOutCubic } from '../core/math';

export type RunnerAction = 'left' | 'right' | 'jump' | 'slide';
export type RunnerEvent = 'lane' | 'jump' | 'land' | 'slide' | 'fastfall' | 'glide';
export const GLIDE_HEIGHT = 2.6;

/**
 * Player movement model: lanes, jump, slide, fast-fall, input buffering and coyote time.
 * Pure simulation (no rendering), deterministic for a given input sequence.
 */
export class Runner {
  lane = 0;
  x = 0;
  y = 0;
  vy = 0;
  distance = 0;
  speed: number = CONFIG.speed.start;
  grounded = true;
  slideLeft = 0;
  private laneFromX = 0;
  private laneT = 1;
  private coyote = 0;
  private buffered: { a: RunnerAction; t: number } | null = null;
  private slideOnLand = false;
  private lastDir = 0;
  glideLeft = 0;
  glideWeight = 0;
  landImpulse = 0;
  stumble = 0;
  lean = 0;
  airWeight = 0;
  slideWeight = 0;
  listener: (e: RunnerEvent, dir?: number) => void = () => {};

  static readonly G = (8 * CONFIG.jump.height) / (CONFIG.jump.airTime * CONFIG.jump.airTime);
  static readonly V0 = (4 * CONFIG.jump.height) / CONFIG.jump.airTime;

  get sliding() {
    return this.slideLeft > 0;
  }

  request(a: RunnerAction) {
    if (!this.tryAction(a)) this.buffered = { a, t: CONFIG.input.buffer };
  }

  private tryAction(a: RunnerAction): boolean {
    switch (a) {
      case 'left':
      case 'right': {
        const dir = a === 'left' ? -1 : 1;
        const target = clamp(this.lane + dir, -1, 1);
        if (target === this.lane) return true; // at the edge: consume silently
        this.laneFromX = this.x;
        this.lane = target;
        this.laneT = 0;
        this.lastDir = dir;
        this.listener('lane', dir);
        return true;
      }
      case 'jump': {
        if (this.glideLeft > 0) return true; // already airborne on the updraft
        if (!(this.grounded || this.coyote > 0)) return false;
        this.slideLeft = 0;
        this.slideOnLand = false;
        this.vy = Runner.V0;
        this.grounded = false;
        this.coyote = 0;
        this.listener('jump');
        return true;
      }
      case 'slide': {
        if (this.glideLeft > 0) return true; // the updraft holds you up; swiping down does nothing
        if (!this.grounded) {
          this.vy = Math.min(this.vy, -CONFIG.fastFallSpeed);
          this.slideOnLand = true;
          this.listener('fastfall');
          return true;
        }
        this.slideLeft = CONFIG.slide.duration;
        this.listener('slide');
        return true;
      }
    }
  }

  /** Ride an updraft: rise to glide height and stay there for `seconds`. Lanes still work. */
  startGlide(seconds: number) {
    this.slideLeft = 0;
    this.slideOnLand = false;
    this.glideLeft = Math.max(this.glideLeft, seconds);
    this.grounded = false;
    this.listener('glide');
  }

  /** Knocked back toward the lane we came from after clipping something sideways. */
  bounce() {
    const back = Math.max(-1, Math.min(1, this.lane - this.lastDir));
    this.laneFromX = this.x;
    this.lane = back;
    this.laneT = 0;
    this.lastDir = -this.lastDir;
  }

  /** Reset for a fresh start or checkpoint restart. */
  reset(distance: number) {
    this.lane = 0; this.x = 0; this.y = 0; this.vy = 0; this.distance = distance;
    this.grounded = true; this.slideLeft = 0; this.laneT = 1; this.laneFromX = 0; this.coyote = 0;
    this.buffered = null; this.slideOnLand = false; this.glideLeft = 0; this.glideWeight = 0;
    this.landImpulse = 0; this.stumble = 0; this.lean = 0; this.airWeight = 0; this.slideWeight = 0;
  }

  update(dt: number) {
    if (this.buffered) {
      this.buffered.t -= dt;
      if (this.tryAction(this.buffered.a)) this.buffered = null;
      else if (this.buffered.t <= 0) this.buffered = null;
    }
    // Lanes.
    const prevX = this.x;
    if (this.laneT < 1) {
      this.laneT = Math.min(1, this.laneT + dt / CONFIG.lanes.changeTime);
      this.x = this.laneFromX + (laneX(this.lane) - this.laneFromX) * easeOutCubic(this.laneT);
    } else this.x = laneX(this.lane);
    const vx = (this.x - prevX) / Math.max(dt, 1e-4);
    const leanTarget = clamp(vx / (CONFIG.lanes.spacing / CONFIG.lanes.changeTime) * 1.6, -1, 1);
    this.lean += (leanTarget - this.lean) * (1 - Math.exp(-14 * dt));

    // Vertical.
    if (this.glideLeft > 0) {
      this.glideLeft = Math.max(0, this.glideLeft - dt);
      const prevY = this.y;
      this.y += (GLIDE_HEIGHT - this.y) * (1 - Math.exp(-5 * dt));
      this.vy = (this.y - prevY) / Math.max(dt, 1e-4);
      this.grounded = false;
      if (this.glideLeft === 0) this.vy = 0;
    } else if (!this.grounded) {
      // Exact for constant gravity, so jump height and air time match CONFIG at any step size.
      this.y += this.vy * dt - 0.5 * Runner.G * dt * dt;
      this.vy -= Runner.G * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.grounded = true;
        this.landImpulse = 1;
        this.listener('land');
        if (this.slideOnLand) {
          this.slideOnLand = false;
          this.slideLeft = CONFIG.slide.duration;
          this.listener('slide');
        }
      }
    } else {
      this.coyote = CONFIG.input.coyote;
    }
    if (!this.grounded) this.coyote = Math.max(0, this.coyote - dt);
    if (this.slideLeft > 0) this.slideLeft = Math.max(0, this.slideLeft - dt);

    // Forward.
    this.distance += this.speed * dt;

    // Animation weights.
    const k = 1 - Math.exp(-18 * dt);
    this.airWeight += ((this.grounded ? 0 : 1) - this.airWeight) * k;
    this.glideWeight += ((this.glideLeft > 0 ? 1 : 0) - this.glideWeight) * (1 - Math.exp(-6 * dt));
    this.slideWeight += ((this.sliding ? 1 : 0) - this.slideWeight) * (1 - Math.exp(-22 * dt));
    this.landImpulse = Math.max(0, this.landImpulse - dt * 5);
    this.stumble = Math.max(0, this.stumble - dt * 1.8);
  }
}
