import { CONFIG } from '../game/config';
import type { RunnerAction } from '../game/runner';

/** Classify a gesture delta (pixels, seconds). Returns null if it isn't a swipe yet. */
export function classifySwipe(dx: number, dy: number, dt: number, minPx = CONFIG.input.swipeMinPx, maxTime = CONFIG.input.swipeMaxTime): RunnerAction | null {
  if (dt > maxTime) return null;
  const ax = Math.abs(dx), ay = Math.abs(dy);
  if (Math.max(ax, ay) < minPx) return null;
  // Slight bias toward vertical so diagonal flicks up/down still jump/slide.
  if (ax > ay * 1.15) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'jump' : 'slide';
}

/**
 * Swipe + keyboard input. Swipes fire as soon as the threshold is crossed (not on release),
 * which shaves ~60-100 ms of perceived latency.
 */
export class Input {
  private start: { x: number; y: number; t: number; id: number } | null = null;
  private fired = false;
  enabled = true;
  constructor(private el: HTMLElement, private onAction: (a: RunnerAction) => void) {
    el.addEventListener('pointerdown', this.down, { passive: true });
    el.addEventListener('pointermove', this.move, { passive: true });
    el.addEventListener('pointerup', this.up, { passive: true });
    el.addEventListener('pointercancel', this.up, { passive: true });
    window.addEventListener('keydown', this.key);
  }
  private down = (e: PointerEvent) => {
    if (!this.enabled) return;
    this.start = { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId };
    this.fired = false;
  };
  private move = (e: PointerEvent) => {
    if (!this.start || this.fired || e.pointerId !== this.start.id) return;
    const a = classifySwipe(e.clientX - this.start.x, e.clientY - this.start.y, (e.timeStamp - this.start.t) / 1000);
    if (a) {
      this.fired = true;
      this.onAction(a);
    }
  };
  private up = (e: PointerEvent) => {
    if (this.start && !this.fired && e.pointerId === this.start.id) {
      const a = classifySwipe(e.clientX - this.start.x, e.clientY - this.start.y, (e.timeStamp - this.start.t) / 1000);
      if (a) this.onAction(a);
    }
    this.start = null;
  };
  private key = (e: KeyboardEvent) => {
    if (!this.enabled || e.repeat) return;
    const map: Record<string, RunnerAction> = {
      ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right',
      ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'jump', ArrowDown: 'slide', s: 'slide', S: 'slide',
    };
    const a = map[e.key];
    if (a) {
      e.preventDefault();
      this.onAction(a);
    }
  };
  dispose() {
    this.el.removeEventListener('pointerdown', this.down);
    this.el.removeEventListener('pointermove', this.move);
    this.el.removeEventListener('pointerup', this.up);
    this.el.removeEventListener('pointercancel', this.up);
    window.removeEventListener('keydown', this.key);
  }
}
