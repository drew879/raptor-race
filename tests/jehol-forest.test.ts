import { describe, expect, it } from 'vitest';
import { JEHOL_FOREST as LV } from '../src/game/jehol-forest';
import { FLAMING_CLIFFS } from '../src/game/flaming-cliffs';
import { Session } from '../src/game/session';
import { hazardBox } from '../src/game/collision';
import { BEAT, timeAt } from '../src/game/level';
import { LEVEL_COPY } from '../src/game/level-copy';
import { HUMANLIKE, PERFECT, playLevel } from '../src/game/bot';

describe('Jehol Forest (Level 1, the tutorial) data', () => {
  it('has three inclusions, two checkpoints, one fork and every lesson hint in order', () => {
    expect(LV.pickups.filter((p) => p.kind === 'egg')).toHaveLength(3);
    expect(LV.checkpoints).toHaveLength(2);
    expect(LV.hazards.filter((h) => h.type === 'spine')).toHaveLength(1);
    expect(LV.hints.map((h) => h.hint)).toEqual(['lanes', 'jump', 'slide', 'fork', 'magnet']);
    expect(LV.pickups.some((p) => p.kind === 'updraft')).toBe(false); // Caudipteryx couldn't fly
  });
  it('only uses forest obstacles (no Gobi creatures)', () => {
    expect(LV.hazards.every((h) => ['boulder', 'ledge', 'gully', 'arch', 'ribArch', 'spine'].includes(h.type))).toBe(true);
  });
  it('never places amber inside an obstacle', () => {
    const bad: string[] = [];
    for (const p of LV.pickups) {
      if (p.kind !== 'amber') continue;
      for (const h of LV.hazards) {
        const wide = h.type === 'gully' || h.type === 'ribArch';
        if (!wide && h.lane !== p.lane) continue;
        const box = hazardBox(h.type, h.len);
        if (Math.abs(h.d + (h.len ?? 0) / 2 - p.d) > box.hz + 0.5) continue;
        if (p.y > box.y0 - 0.25 && p.y < box.y1 + 0.25) bad.push(`amber d=${p.d.toFixed(1)} lane=${p.lane} y=${p.y.toFixed(2)} vs ${h.type}@${h.d}`);
      }
    }
    expect(bad).toEqual([]);
  });
  it('never walls off all three lanes with trees', () => {
    const rows = new Map<number, Set<number>>();
    for (const h of LV.hazards) if (h.type === 'boulder') rows.set(h.d, (rows.get(h.d) ?? new Set()).add(h.lane));
    expect([...rows.values()].every((s) => s.size < 3)).toBe(true);
  });
  it('gives at least ~1.4 s between decisions (it is the tutorial)', () => {
    const ds = [...new Set(LV.hazards.map((h) => h.d))].sort((a, b) => a - b);
    const spine = LV.hazards.find((h) => h.type === 'spine')!;
    const tight: string[] = [];
    for (let i = 1; i < ds.length; i++) {
      // Obstacles on a fork's routes count from where you picked your side.
      const inFork = ds[i] > spine.d && ds[i] < spine.d + spine.len!;
      const gap = timeAt(LV, ds[i]) - timeAt(LV, ds[i - 1]);
      if (!inFork && gap < 1.4) tight.push(`${ds[i - 1]} -> ${ds[i]}: ${gap.toFixed(2)} s`);
    }
    expect(tight).toEqual([]);
  });
  it('every amber sits on the beat grid', () => {
    const amber = LV.pickups.filter((p) => p.kind === 'amber');
    const onGrid = amber.filter((p) => { const k = timeAt(LV, p.d) / (BEAT / 4); return Math.abs(k - Math.round(k)) < 1e-4; });
    expect(onGrid.length).toBe(amber.length);
  });
  it('has its own copy, with crash text for every obstacle it uses', () => {
    const c = LEVEL_COPY[LV.id];
    expect(c.species).toBe('Caudipteryx');
    for (const t of new Set(LV.hazards.map((h) => h.type))) expect(c.crash?.[t]?.[1], t).toBeTruthy();
  });
  it('is shorter and slower than the Velociraptor hunt', () => {
    expect(timeAt(LV, LV.length)).toBeLessThan(timeAt(FLAMING_CLIFFS, FLAMING_CLIFFS.length));
    expect(LV.speed.end).toBeLessThan(FLAMING_CLIFFS.speed.end);
  });
});

describe('the egg', () => {
  it('rolls straight through a hollow trunk instead of steering round it', () => {
    const s = new Session(LV);
    s.start();
    const arch = LV.hazards.find((h) => h.type === 'arch' && h.lane === 0)!;
    s.resumeAt(arch.d - 30);
    s.invuln = 1e9;
    let preyXAtArch = NaN;
    for (let t = 0; t < 6 && Number.isNaN(preyXAtArch); t += 1 / 60) {
      s.step(1 / 60);
      if (Math.abs(s.preyD - arch.d) < 0.5) preyXAtArch = s.preyX;
    }
    // The trees either side leave only the hollow; an animal would have had nowhere to go.
    expect(Math.abs(preyXAtArch)).toBeLessThan(0.3);
  });
  it('lands the hero behind the egg on the ground (no pin on its back)', () => {
    const s = new Session(LV);
    expect(s.hunt.pinHeight).toBe(0);
    expect(s.hunt.pinOffset).toBeGreaterThan(0.5);
  });
});

describe('Jehol Forest playthrough', () => {
  it('a perfect player catches the egg cleanly and finds all three inclusions', () => {
    const res = playLevel(new Session(LV), PERFECT);
    console.log('forest perfect run', res);
    expect(res.finished).toBe(true);
    expect(res.pounced).toBe(true);
    expect(res.caught).toBe(0);
    expect(res.stumbles).toBe(0);
    expect(res.eggs).toBe(3);
    expect(res.score).toBeGreaterThan(LV.parScore);
  });
  it('is easy: a human-like player nearly always finishes within one revive and keeps the egg in sight', { timeout: 30000 }, () => {
    const N = 120;
    let clean = 0, withRevive = 0, neverLost = 0, total = 0;
    for (let i = 0; i < N; i++) {
      const res = playLevel(new Session(LV), { ...HUMANLIKE, seed: 2000 + i });
      total += res.score;
      if (res.caught === 0) clean++;
      if (res.caught <= 1) withRevive++;
      if (res.lost === 0) neverLost++;
      expect(res.finished).toBe(true);
    }
    console.log(`forest human-like: clean ${((clean / N) * 100).toFixed(0)}%, within one revive ${((withRevive / N) * 100).toFixed(0)}%, never lost the egg ${((neverLost / N) * 100).toFixed(0)}%, avg score ${Math.round(total / N)}`);
    expect(withRevive / N).toBeGreaterThanOrEqual(0.93);
    expect(neverLost / N).toBeGreaterThanOrEqual(0.9);
  });
});
