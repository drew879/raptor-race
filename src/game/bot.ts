import type { Session } from './session';
import type { RunnerAction } from './runner';
import { CONFIG } from './config';
import { Rng } from '../core/rng';
import type { Lane } from './types';

export interface BotProfile {
  reaction: number; // seconds between deciding and the input landing
  jitter: number; // +/- seconds of timing noise
  errorRate: number; // chance an intended input is dropped or mistimed badly
  greedEggs: boolean;
  seed: number;
}
export const PERFECT: BotProfile = { reaction: 0, jitter: 0, errorRate: 0, greedEggs: true, seed: 1 };
export const HUMANLIKE: BotProfile = { reaction: 0.3, jitter: 0.07, errorRate: 0.03, greedEggs: false, seed: 1 };

type Need = 'free' | 'block' | 'jump' | 'slide';
const NEED: Record<string, Need> = { boulder: 'block', ledge: 'jump', ledgeWide: 'jump', arch: 'slide', ribArch: 'slide' };

/** Plays a Session through its public input API, the same way a player would. */
export class Bot {
  private rng: Rng;
  private queue: Array<{ at: number; a: RunnerAction }> = [];
  private committed = new Set<number>(); // row distances already acted on
  private laneCooldown = 0;
  constructor(private s: Session, private p: BotProfile) {
    this.rng = new Rng(p.seed);
  }

  private send(a: RunnerAction) {
    const at = this.s.time + this.p.reaction + (this.rng.next() - 0.5) * 2 * this.p.jitter;
    if (this.rng.chance(this.p.errorRate)) {
      if (this.rng.chance(0.5)) return; // missed swipe
      this.queue.push({ at: at + this.rng.range(0.12, 0.25) * (this.rng.chance(0.5) ? 1 : -1), a }); // badly mistimed
      return;
    }
    this.queue.push({ at, a });
  }

  /** Requirements per lane for the hazard row nearest ahead (rows grouped by distance). */
  private rows(range: number) {
    const s = this.s, d = s.distance;
    const rows = new Map<number, Record<Lane, Need>>();
    for (const h of s.hazards) {
      if (h.passed || h.d < d - 0.5 || h.d > d + range) continue;
      const key = Math.round(h.d);
      const row = rows.get(key) ?? ({ [-1]: 'free', 0: 'free', 1: 'free' } as Record<Lane, Need>);
      const need = NEED[h.type];
      const lanes: Lane[] = h.type === 'ledgeWide' || h.type === 'ribArch' ? [-1, 0, 1] : [h.lane];
      for (const l of lanes) if (row[l] === 'free' || need === 'block') row[l] = need;
      rows.set(key, row);
    }
    return [...rows.entries()].sort((a, b) => a[0] - b[0]);
  }

  private laneScore(lane: Lane, from: number, to: number) {
    let v = 0;
    for (const p of this.s.pickups) {
      if (p.taken || p.lane !== lane || p.d < from || p.d > to) continue;
      if (p.kind === 'egg') v += this.p.greedEggs ? 50 : 0;
      else if (p.kind === 'amber' && p.y < 2) v += 1;
      else if (p.kind === 'magnet') v += 3;
    }
    return v;
  }

  private lastD = 0;

  step(dt: number) {
    const s = this.s, r = s.runner;
    // A checkpoint restart rewinds the run: forget rows acted on in the previous attempt.
    if (s.distance < this.lastD - 1) { this.committed.clear(); this.queue.length = 0; }
    this.lastD = s.distance;
    // Deliver due inputs.
    this.queue.sort((a, b) => a.at - b.at);
    while (this.queue.length && this.queue[0].at <= s.time) s.input(this.queue.shift()!.a);
    if (s.state !== 'running') return;
    if (s.pounceReady && !this.queue.some((q) => q.a === 'jump')) { this.send('jump'); return; }
    this.laneCooldown = Math.max(0, this.laneCooldown - dt);

    const v = r.speed;
    const lead = v * this.p.reaction; // anticipate the delay, as players do
    const rows = this.rows(v * 2.2 + lead);
    const gliding = r.glideLeft > 0.6;

    // Pick the lane for the next two rows.
    const cur = r.lane as Lane;
    const pending = this.queue.filter((q) => q.a === 'left' || q.a === 'right').reduce((acc, q) => acc + (q.a === 'left' ? -1 : 1), 0);
    const planned = Math.max(-1, Math.min(1, cur + pending)) as Lane;
    let target: Lane = planned;
    // Only commit to dodging rows within ~1.1 s; until then, follow pickups like a player would.
    const urgent = rows.filter(([d]) => d - s.distance < v * 1.1 + lead);
    if (!gliding && urgent.length) {
      const [, r0] = rows[0];
      const r1 = rows[1]?.[1];
      let best = -1e9;
      for (const l of [-1, 0, 1] as Lane[]) {
        if (r0[l] === 'block') continue;
        let sc = -Math.abs(l - planned) * 3;
        if (r1 && r1[l] === 'block') sc -= 2;
        sc += this.laneScore(l, s.distance, rows[0][0] + v * 0.8);
        if (sc > best) { best = sc; target = l; }
      }
    } else {
      let best = -1e9;
      for (const l of [-1, 0, 1] as Lane[]) {
        const sc = this.laneScore(l, s.distance, s.distance + v * 1.3) * 2 - Math.abs(l - planned) * 1.5;
        if (sc > best) { best = sc; target = l; }
      }
      if (gliding) {
        // Collect sky amber and the high egg while gliding.
        // Prefer the high egg, then sky amber, within ~1.2 s.
        const sky = s.pickups.filter((p) => !p.taken && p.y > 2 && p.d > s.distance && p.d < s.distance + v * 1.2);
        const pick = sky.find((p) => p.kind === 'egg') ?? sky[0];
        if (pick) target = pick.lane;
      }
    }
    if (target !== planned && this.laneCooldown <= 0) {
      this.send(target < planned ? 'left' : 'right');
      this.laneCooldown = CONFIG.lanes.changeTime + 0.04;
    }

    // Jump or slide timing for the nearest row in the target lane.
    if (gliding) return;
    for (const [rd, row] of rows) {
      if (this.committed.has(rd)) continue;
      const need = row[target];
      const dist = rd - s.distance - lead;
      if (need === 'jump' && dist <= (v * CONFIG.jump.airTime) / 2 + 0.2) {
        this.send('jump');
        this.committed.add(rd);
      } else if (need === 'slide' && dist <= 2.6) {
        this.send('slide');
        this.committed.add(rd);
      }
      break;
    }
  }
}

/** Run a whole level with a bot. Uses the free revive, then checkpoint restarts, like a persistent player. */
export function playLevel(s: Session, profile: BotProfile, maxSeconds = 400) {
  const bot = new Bot(s, profile);
  const dt = 1 / 60;
  let caught = 0, stumbles = 0, lost = 0, pounced = false;
  s.start();
  for (let t = 0; t < maxSeconds && s.state !== 'finished'; t += dt) {
    bot.step(dt);
    s.step(dt);
    for (const e of s.drainEvents()) {
      if (e.t === 'stumble') stumbles++;
      if (e.t === 'crash') caught++;
      if (e.t === 'preyLost') lost++;
      if (e.t === 'pounce') pounced = true;
    }
    if (s.state === 'caught') {
      if (!s.revive()) s.restartFromCheckpoint();
    }
    if (s.state === 'lost') s.retryHunt();
  }
  return { finished: s.state === 'finished', pounced, lost, caught, stumbles, score: Math.round(s.score), amber: s.amber, eggs: s.eggs.filter(Boolean).length, time: s.time };
}
