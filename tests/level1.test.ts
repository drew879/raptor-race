import { describe, expect, it } from 'vitest';
import { LEVEL1 } from '../src/game/level1';
import { Session } from '../src/game/session';
import { HAZARD_BOXES } from '../src/game/collision';
import { HUMANLIKE, PERFECT, playLevel } from '../src/game/bot';

describe('level 1 data', () => {
  it('has exactly three eggs and two checkpoints', () => {
    expect(LEVEL1.pickups.filter((p) => p.kind === 'egg')).toHaveLength(3);
    expect(LEVEL1.checkpoints).toHaveLength(2);
  });
  it('never places amber inside a hazard volume', () => {
    const bad: string[] = [];
    for (const p of LEVEL1.pickups) {
      if (p.kind !== 'amber') continue;
      for (const h of LEVEL1.hazards) {
        const wide = h.type === 'ledgeWide' || h.type === 'ribArch';
        if (!wide && h.lane !== p.lane) continue;
        const box = HAZARD_BOXES[h.type];
        if (Math.abs(h.d - p.d) > box.hz + 0.5) continue;
        if (p.y > box.y0 - 0.25 && p.y < box.y1 + 0.25) bad.push(`amber d=${p.d.toFixed(1)} lane=${p.lane} y=${p.y.toFixed(2)} vs ${h.type}@${h.d}`);
      }
    }
    expect(bad).toEqual([]);
  });
  it('never blocks all three lanes with boulders outside the updraft section', () => {
    const rows = new Map<number, Set<number>>();
    for (const h of LEVEL1.hazards) if (h.type === 'boulder') rows.set(h.d, (rows.get(h.d) ?? new Set()).add(h.lane));
    const walls = [...rows.entries()].filter(([, s]) => s.size === 3).map(([d]) => d);
    const k = LEVEL1.length / 1100;
    expect(walls.every((d) => d > 620 * k && d < 700 * k)).toBe(true);
  });
});

describe('level 1 playthrough', () => {
  it('a perfect player finishes cleanly and finds all three eggs', () => {
    const res = playLevel(new Session(LEVEL1), PERFECT);
    console.log('perfect run', res);
    expect(res.finished).toBe(true);
    expect(res.caught).toBe(0);
    expect(res.stumbles).toBe(0);
    expect(res.eggs).toBe(3);
  });
  it('is fairly easy: a human-like player usually finishes without being caught twice', () => {
    const N = 120;
    let clean = 0, withRevive = 0, total = 0;
    for (let i = 0; i < N; i++) {
      const res = playLevel(new Session(LEVEL1), { ...HUMANLIKE, seed: 1000 + i });
      total += res.score;
      if (res.caught === 0) clean++;
      if (res.caught <= 1) withRevive++;
    }
    console.log(`human-like: clean ${((clean / N) * 100).toFixed(0)}%, within one revive ${((withRevive / N) * 100).toFixed(0)}%, avg score ${Math.round(total / N)}`);
    expect(withRevive / N).toBeGreaterThanOrEqual(0.85);
  });
});
