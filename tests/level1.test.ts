import { describe, expect, it } from 'vitest';
import { LEVEL1 } from '../src/game/level1';
import { Session } from '../src/game/session';
import { hazardBox } from '../src/game/collision';
import { Bot } from '../src/game/bot';
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
        const box = hazardBox(h.type, h.len);
        if (Math.abs(h.d + (h.len ?? 0) / 2 - p.d) > box.hz + 0.5) continue;
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

describe('forks', () => {
  const spines = LEVEL1.hazards.filter((h) => h.type === 'spine');
  it('level 1 has two forks, each with only jumpable or slidable obstacles on its routes', () => {
    expect(spines).toHaveLength(2);
    for (const sp of spines) {
      const inside = LEVEL1.hazards.filter((h) => h !== sp && h.d >= sp.d - 1 && h.d <= sp.d + sp.len! + 1);
      expect(inside.every((h) => h.type === 'ledge' || h.type === 'arch')).toBe(true);
      expect(inside.every((h) => h.lane !== sp.lane)).toBe(true);
    }
  });
  it('the runner can never be beside a spine in its lane, and swipes into it are refused', () => {
    const s = new Session(LEVEL1);
    const bot = new Bot(s, PERFECT);
    s.start();
    let refused = 0, alongsideInSpineLane = 0, preyInSpineLane = 0;
    for (let t = 0; t < 200 && s.state === 'running'; t += 1 / 60) {
      bot.step(1 / 60);
      const sp = s.spineAt(s.distance);
      if (sp) {
        // Try to swipe into the fin every half second.
        if (Math.round(t * 60) % 30 === 0) {
          const before = s.runner.lane;
          s.input(s.runner.lane < 0 ? 'right' : 'left');
          if (s.runner.lane === before) refused++;
        }
        if (s.runner.lane === sp.lane && s.distance > sp.d + 2) alongsideInSpineLane++;
      }
      const ps = s.spineAt(s.preyD);
      if (ps && s.preyD > ps.d + 3 && Math.abs(s.preyX) < 0.6) preyInSpineLane++;
      s.step(1 / 60);
      s.drainEvents();
    }
    expect(refused).toBeGreaterThan(4);
    expect(alongsideInSpineLane).toBe(0);
    expect(preyInSpineLane).toBe(0);
  });
});

describe('level 1 playthrough', () => {
  it('a perfect player finishes cleanly and finds all three eggs', () => {
    const res = playLevel(new Session(LEVEL1), PERFECT);
    console.log('perfect run', res);
    expect(res.finished).toBe(true);
    expect(res.pounced).toBe(true);
    expect(res.lost).toBe(0);
    expect(res.caught).toBe(0);
    expect(res.stumbles).toBe(0);
    expect(res.eggs).toBe(3);
  });
  it('is fairly easy: a human-like player usually finishes without being caught twice', () => {
    const N = 120;
    let clean = 0, withRevive = 0, total = 0, neverLost = 0;
    for (let i = 0; i < N; i++) {
      const res = playLevel(new Session(LEVEL1), { ...HUMANLIKE, seed: 1000 + i });
      total += res.score;
      if (res.caught === 0) clean++;
      if (res.caught <= 1) withRevive++;
      if (res.lost === 0) neverLost++;
      expect(res.finished).toBe(true);
    }
    console.log(`human-like: clean ${((clean / N) * 100).toFixed(0)}%, within one revive ${((withRevive / N) * 100).toFixed(0)}%, never lost the prey ${((neverLost / N) * 100).toFixed(0)}%, avg score ${Math.round(total / N)}`);
    expect(neverLost / N).toBeGreaterThanOrEqual(0.8);
    expect(withRevive / N).toBeGreaterThanOrEqual(0.85);
  });
});
