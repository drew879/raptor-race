import { describe, expect, it } from 'vitest';
import { Runner } from '../src/game/runner';
import { CONFIG, laneX } from '../src/game/config';
import { classifySwipe } from '../src/core/input';

const DT = 1 / 60;
const run = (r: Runner, seconds: number) => { for (let i = 0; i < Math.round(seconds / DT); i++) r.update(DT); };

describe('swipe classification', () => {
  it('ignores tiny or slow gestures', () => {
    expect(classifySwipe(5, 3, 0.1)).toBeNull();
    expect(classifySwipe(80, 0, 1.0)).toBeNull();
  });
  it('maps the four directions', () => {
    expect(classifySwipe(-40, 5, 0.1)).toBe('left');
    expect(classifySwipe(40, -5, 0.1)).toBe('right');
    expect(classifySwipe(3, -40, 0.1)).toBe('jump');
    expect(classifySwipe(3, 40, 0.1)).toBe('slide');
  });
  it('treats near-diagonals as vertical', () => {
    expect(classifySwipe(30, -28, 0.1)).toBe('jump');
  });
});

describe('runner', () => {
  it('changes lanes within bounds', () => {
    const r = new Runner();
    r.request('left'); run(r, 0.3);
    expect(r.lane).toBe(-1);
    expect(r.x).toBeCloseTo(laneX(-1), 5);
    r.request('left'); run(r, 0.3);
    expect(r.lane).toBe(-1);
  });
  it('jumps to the configured height and lands after the configured air time', () => {
    const r = new Runner();
    r.request('jump');
    let peak = 0, t = 0;
    while (!r.grounded || t === 0) { r.update(DT); t += DT; peak = Math.max(peak, r.y); if (t > 2) break; }
    expect(peak).toBeGreaterThan(CONFIG.jump.height * 0.97);
    expect(peak).toBeLessThan(CONFIG.jump.height * 1.03);
    expect(t).toBeGreaterThan(CONFIG.jump.airTime - 0.05);
    expect(t).toBeLessThan(CONFIG.jump.airTime + 0.05);
  });
  it('buffers a jump pressed just before landing', () => {
    const r = new Runner();
    r.request('jump');
    run(r, CONFIG.jump.airTime - 0.06);
    expect(r.grounded).toBe(false);
    r.request('jump'); // too early, should be buffered
    run(r, 0.12);
    expect(r.grounded).toBe(false); // second jump fired on landing
  });
  it('slide during a jump fast-falls and slides on landing', () => {
    const r = new Runner();
    r.request('jump');
    run(r, 0.15);
    r.request('slide');
    let t = 0;
    while (!r.grounded && t < 1) { r.update(DT); t += DT; }
    expect(t).toBeLessThan(0.2);
    expect(r.sliding).toBe(true);
  });
  it('a slide ends after its duration', () => {
    const r = new Runner();
    r.request('slide');
    run(r, CONFIG.slide.duration + 0.05);
    expect(r.sliding).toBe(false);
  });
});

import { testHit, HAZARD_BOXES } from '../src/game/collision';
describe('collision', () => {
  const base = { x: 0, prevX: 0, y: 0, sliding: false, airborne: false };
  it('running into a boulder is a crash', () => {
    expect(testHit(base, 0, 0, HAZARD_BOXES.boulder)).toBe('front');
  });
  it('a neighbouring lane is clear', () => {
    expect(testHit(base, 0, 1.5, HAZARD_BOXES.boulder)).toBe('none');
  });
  it('moving sideways into a boulder is a side clip', () => {
    expect(testHit({ ...base, x: 1.0, prevX: 0.6 }, 0, 1.5, HAZARD_BOXES.boulder)).toBe('side');
  });
  it('sliding clears an arch and a rib arch; standing does not', () => {
    expect(testHit({ ...base, sliding: true }, 0, 0, HAZARD_BOXES.arch)).toBe('none');
    expect(testHit({ ...base, sliding: true }, 0, 0, HAZARD_BOXES.ribArch)).toBe('none');
    expect(testHit(base, 0, 0, HAZARD_BOXES.arch)).toBe('front');
  });
  it('a jump at moderate height clears a ledge', () => {
    expect(testHit({ ...base, y: 0.5, airborne: true }, 0, 0, HAZARD_BOXES.ledge)).toBe('none');
    expect(testHit(base, 0, 0, HAZARD_BOXES.ledge)).toBe('front');
  });
  it('running into a gully is a fall, sliding does not help, and a jump clears it', () => {
    expect(testHit(base, 0, 0, HAZARD_BOXES.gully)).toBe('front');
    expect(testHit({ ...base, sliding: true }, 0, 0, HAZARD_BOXES.gully)).toBe('front');
    expect(testHit({ ...base, y: 0.4, airborne: true }, 0, 0, HAZARD_BOXES.gully)).toBe('none');
  });
});
