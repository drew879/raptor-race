import { CONFIG, laneX } from './config';
import { clamp, easeOutCubic } from '../core/math';

export type RunnerAction = 'left' | 'right' | 'jump' | 'slide';
export type RunnerEvent = 'lane' | 'jump' | 'land' | 'slide' | 'fastfall';

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
        this.listener('lane', dir);
        return true;
      }
      case 'jump': {
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
    if (!this.grounded) {
      this.vy -= Runner.G * dt;
      this.y += this.vy * dt;
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
    this.slideWeight += ((this.sliding ? 1 : 0) - this.slideWeight) * (1 - Math.exp(-22 * dt));
    this.landImpulse = Math.max(0, this.landImpulse - dt * 5);
    this.stumble = Math.max(0, this.stumble - dt * 1.8);
  }
}
