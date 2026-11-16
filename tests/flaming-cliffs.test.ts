import { describe, expect, it } from 'vitest';
import { FLAMING_CLIFFS } from '../src/game/flaming-cliffs';
import { Session } from '../src/game/session';
import { HAZARD_BOXES, hazardBox, testHit } from '../src/game/collision';
import { CRASH_COPY } from '../src/game/copy';
import { BEAT, distanceAtTime, speedAt, timeAt } from '../src/game/level';
import { GLIDE_SECONDS } from '../src/game/session';
import { Bot } from '../src/game/bot';
import { HUMANLIKE, PERFECT, playLevel } from '../src/game/bot';

describe('Flaming Cliffs (Level 2) data', () => {
  it('has exactly three eggs and two checkpoints', () => {
    expect(FLAMING_CLIFFS.pickups.filter((p) => p.kind === 'egg')).toHaveLength(3);
    expect(FLAMING_CLIFFS.checkpoints).toHaveLength(2);
  });
  it('never places amber inside a hazard volume', () => {
    const bad: string[] = [];
    for (const p of FLAMING_CLIFFS.pickups) {
      if (p.kind !== 'amber') continue;
      for (const h of FLAMING_CLIFFS.hazards) {
        const wide = h.type === 'gully' || h.type === 'ribArch';
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
    for (const h of FLAMING_CLIFFS.hazards) if (h.type === 'boulder') rows.set(h.d, (rows.get(h.d) ?? new Set()).add(h.lane));
    const walls = [...rows.entries()].filter(([, s]) => s.size === 3).map(([d]) => d);
    const k = FLAMING_CLIFFS.length / 1100;
    expect(walls.every((d) => d > 620 * k && d < 700 * k)).toBe(true);
  });
});

describe('forks', () => {
  const spines = FLAMING_CLIFFS.hazards.filter((h) => h.type === 'spine');
  it('level 1 has two forks, each with only jumpable or slidable obstacles on its routes', () => {
    expect(spines).toHaveLength(2);
    for (const sp of spines) {
      const inside = FLAMING_CLIFFS.hazards.filter((h) => h !== sp && h.d >= sp.d - 1 && h.d <= sp.d + sp.len! + 1);
      expect(inside.every((h) => h.type === 'ledge' || h.type === 'arch')).toBe(true);
      expect(inside.every((h) => h.lane !== sp.lane)).toBe(true);
    }
  });
  it('the runner can never be beside a spine in its lane, and swipes into it are refused', () => {
    const s = new Session(FLAMING_CLIFFS);
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

describe('setbacks and fork placement (owner playtest 4)', () => {
  const spines = FLAMING_CLIFFS.hazards.filter((h) => h.type === 'spine');
  it('every obstacle type has crash screen text', () => {
    for (const t of Object.keys(HAZARD_BOXES)) expect(CRASH_COPY[t as keyof typeof CRASH_COPY]?.[1], t).toBeTruthy();
  });
  it('running straight into a fin is a crash with the fin as its cause, and the run stays crashed', () => {
    const s = new Session(FLAMING_CLIFFS);
    s.start();
    s.resumeAt(spines[0].d - 18); // past the boulder that guards the approach
    let cause = '';
    for (let t = 0; t < 6 && !cause; t += 1 / 60) {
      s.step(1 / 60);
      for (const e of s.drainEvents()) if (e.t === 'crash') cause = e.cause;
    }
    expect(cause).toBe('spine');
    expect(s.state).toBe('caught');
    // Reviving puts you beside the fin, never inside it.
    expect(s.revive()).toBe(true);
    expect(s.runner.lane).not.toBe(0);
  });
  it('nothing tall stands in an updraft glide (gliding height would hit a slide obstacle or a fin)', () => {
    for (const p of FLAMING_CLIFFS.pickups.filter((q) => q.kind === 'updraft')) {
      const end = p.d + speedAt(FLAMING_CLIFFS, p.d) * GLIDE_SECONDS + 10;
      const tall = FLAMING_CLIFFS.hazards.filter((h) => (h.type === 'arch' || h.type === 'ribArch' || h.type === 'spine') && h.d + (h.len ?? 0) > p.d && h.d < end);
      expect(tall.map((h) => `${h.type}@${h.d}`)).toEqual([]);
    }
  });
  it('no fork starts within 3 s of an updraft glide landing, and no checkpoint sits inside a fork', () => {
    for (const p of FLAMING_CLIFFS.pickups.filter((q) => q.kind === 'updraft')) {
      const landing = p.d + speedAt(FLAMING_CLIFFS, p.d) * GLIDE_SECONDS;
      for (const sp of spines) if (sp.d > p.d) expect(sp.d - landing, `fork at ${sp.d}`).toBeGreaterThan(3 * speedAt(FLAMING_CLIFFS, landing));
    }
    for (const cp of FLAMING_CLIFFS.checkpoints) for (const sp of spines) expect(cp < sp.d - 5 || cp > sp.d + sp.len! + 5).toBe(true);
  });
});

describe('nesting ground and pterosaur', () => {
  it('a wanderer starts in one lane, walks across, and has settled in its final lane before you reach it', () => {
    const w = FLAMING_CLIFFS.hazards.find((h) => h.type === 'wanderer')!;
    const s = new Session(FLAMING_CLIFFS);
    s.start();
    s.resumeAt(w.d - 70);
    s.runner.snapToLane(w.lane === 0 ? 1 : 0); // stay out of its way
    s.invuln = 1e9; // ghost through the slide and gully in front of it; this test only watches the crossing
    const xs: number[] = [];
    let settledAt = -1;
    for (let t = 0; t < 4 && s.state === 'running'; t += 1 / 60) {
      s.step(1 / 60);
      s.drainEvents();
      const h = s.hazards.find((q) => q.type === 'wanderer');
      if (!h) break;
      xs.push(h.x);
      if (settledAt < 0 && Math.abs(h.x - w.lane * 1.5) < 1e-6) settledAt = h.d - s.distance;
    }
    expect(xs[0]).toBeCloseTo(w.from! * 1.5, 5);
    expect(settledAt).toBeGreaterThan(14); // in place with the better part of a second to spare
  });
  it('running straight into a settled wanderer crashes; a nester can be jumped; the pterosaur needs a slide', () => {
    const w = FLAMING_CLIFFS.hazards.find((h) => h.type === 'wanderer')!;
    const s = new Session(FLAMING_CLIFFS);
    s.start();
    s.resumeAt(w.d - 12);
    s.runner.snapToLane(w.lane);
    let cause = '';
    for (let t = 0; t < 2 && !cause; t += 1 / 60) { s.step(1 / 60); for (const e of s.drainEvents()) if (e.t === 'crash') cause = e.cause; }
    expect(cause).toBe('wanderer');
    const base = { x: 0, prevX: 0, y: 0, sliding: false, airborne: false };
    expect(testHit({ ...base, y: 0.5, airborne: true }, 0, 0, HAZARD_BOXES.nester)).toBe('none');
    expect(testHit(base, 0, 0, HAZARD_BOXES.pterosaur)).toBe('front');
    expect(testHit({ ...base, y: 1.25, airborne: true }, 0, 0, HAZARD_BOXES.pterosaur)).toBe('front');
    expect(testHit({ ...base, sliding: true }, 0, 0, HAZARD_BOXES.pterosaur)).toBe('none');
  });
});

describe('music sync', () => {
  it('time and distance convert both ways', () => {
    for (const d of [0, 100, 800, 1649]) expect(distanceAtTime(FLAMING_CLIFFS, timeAt(FLAMING_CLIFFS, d))).toBeCloseTo(d, 6);
  });
  it('every amber sits on the beat grid (lines on eighths, slides and jump arcs on sixteenths)', () => {
    const amber = FLAMING_CLIFFS.pickups.filter((p) => p.kind === 'amber');
    const onGrid = amber.filter((p) => { const k = timeAt(FLAMING_CLIFFS, p.d) / (BEAT / 4); return Math.abs(k - Math.round(k)) < 1e-4; });
    expect(onGrid.length).toBe(amber.length);
  });
});

describe('Flaming Cliffs (Level 2) playthrough', () => {
  it('a perfect player finishes cleanly and finds all three eggs', () => {
    const res = playLevel(new Session(FLAMING_CLIFFS), PERFECT);
    console.log('perfect run', res);
    expect(res.finished).toBe(true);
    expect(res.pounced).toBe(true);
    expect(res.lost).toBe(0);
    expect(res.caught).toBe(0);
    expect(res.stumbles).toBe(0);
    expect(res.eggs).toBe(3);
  });
  it('is fair but harder than the tutorial: a human-like player usually finishes without being caught twice', () => {
    const N = 120;
    let clean = 0, withRevive = 0, total = 0, neverLost = 0;
    for (let i = 0; i < N; i++) {
      const res = playLevel(new Session(FLAMING_CLIFFS), { ...HUMANLIKE, seed: 1000 + i });
      total += res.score;
      if (res.caught === 0) clean++;
      if (res.caught <= 1) withRevive++;
      if (res.lost === 0) neverLost++;
      expect(res.finished).toBe(true);
    }
    console.log(`human-like: clean ${((clean / N) * 100).toFixed(0)}%, within one revive ${((withRevive / N) * 100).toFixed(0)}%, never lost the prey ${((neverLost / N) * 100).toFixed(0)}%, avg score ${Math.round(total / N)}`);
    expect(neverLost / N).toBeGreaterThanOrEqual(0.8);
    expect(withRevive / N).toBeGreaterThanOrEqual(0.78); // was 0.85 as Level 1; it's Level 2 now and a little harder (owner)
  });
});
