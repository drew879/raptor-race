import { Runner, type RunnerAction } from './runner';
import { CONFIG, laneX } from './config';
import { HAZARD_BOXES, testHit } from './collision';
import { speedAt, type HintKind, type LevelDef } from './level';
import type { HazardType, Lane, PickupKind } from './types';

export interface LiveHazard { id: number; type: HazardType; lane: Lane; d: number; x: number; hit: boolean; passed: boolean }
export interface LivePickup { id: number; kind: PickupKind; lane: Lane; d: number; x: number; y: number; taken: boolean; eggIndex: number }

export type GameEvent =
  | { t: 'amber'; x: number; y: number; d: number; chain: number }
  | { t: 'egg'; x: number; y: number; d: number; index: number }
  | { t: 'power'; kind: 'magnet' | 'updraft'; x: number; y: number; d: number }
  | { t: 'stumble' }
  | { t: 'crash'; cause: HazardType | 'storm' }
  | { t: 'clear'; bonus: number }
  | { t: 'combo'; combo: number }
  | { t: 'checkpoint'; index: number }
  | { t: 'hint'; hint: HintKind }
  | { t: 'finish' }
  | { t: 'move'; e: 'lane' | 'jump' | 'land' | 'slide' | 'fastfall' | 'glide'; dir?: number };

export type SessionState = 'ready' | 'running' | 'caught' | 'finished';

export const STORM_WINDOW = 8; // seconds: a second stumble inside this window means caught
export const MAGNET_SECONDS = 8;
export const GLIDE_SECONDS = 6.5;

/** One run of a level. Pure simulation: no rendering, no DOM, deterministic for a given input sequence. */
export class Session {
  readonly runner = new Runner();
  state: SessionState = 'ready';
  score = 0;
  amber = 0;
  eggs: boolean[];
  combo = 1;
  chain = 0;
  storm = 0;
  magnetLeft = 0;
  invuln = 0;
  reviveUsed = false;
  checkpoint = -1;
  time = 0;
  hazards: LiveHazard[] = [];
  pickups: LivePickup[] = [];
  events: GameEvent[] = [];
  private hzCursor = 0;
  private pkCursor = 0;
  private hintCursor = 0;
  private nextId = 1;
  private snap = { score: 0, amber: 0, combo: 1 };
  private eggOrder: number[] = [];

  constructor(readonly level: LevelDef) {
    this.eggs = level.pickups.filter((p) => p.kind === 'egg').map(() => false);
    level.pickups.forEach((p, i) => { if (p.kind === 'egg') this.eggOrder.push(i); });
    this.runner.listener = (e, dir) => this.events.push({ t: 'move', e, dir });
    this.runner.speed = level.speed.start;
  }

  start() {
    if (this.state === 'ready') this.state = 'running';
  }

  input(a: RunnerAction) {
    if (this.state === 'running') this.runner.request(a);
  }

  get distance() { return this.runner.distance; }
  get progress() { return Math.min(1, this.runner.distance / this.level.length); }
  get stars(): [boolean, boolean, boolean] {
    return [this.state === 'finished', this.eggs.every(Boolean), this.score >= this.level.parScore];
  }

  private stream() {
    const d = this.runner.distance;
    const ahead = d + 150;
    const L = this.level;
    while (this.hzCursor < L.hazards.length && L.hazards[this.hzCursor].d < ahead) {
      const h = L.hazards[this.hzCursor++];
      const wide = h.type === 'ledgeWide' || h.type === 'ribArch';
      this.hazards.push({ id: this.nextId++, type: h.type, lane: h.lane, d: h.d, x: wide ? 0 : laneX(h.lane), hit: false, passed: false });
    }
    while (this.pkCursor < L.pickups.length && L.pickups[this.pkCursor].d < ahead) {
      const idx = this.pkCursor++;
      const p = L.pickups[idx];
      const eggIndex = p.kind === 'egg' ? this.eggOrder.indexOf(idx) : -1;
      if (eggIndex >= 0 && this.eggs[eggIndex]) continue; // already found on an earlier attempt
      this.pickups.push({ id: this.nextId++, kind: p.kind, lane: p.lane, d: p.d, x: laneX(p.lane), y: p.y, taken: false, eggIndex });
    }
    while (this.hintCursor < L.hints.length && L.hints[this.hintCursor].d <= d) this.events.push({ t: 'hint', hint: L.hints[this.hintCursor++].hint });
    this.hazards = this.hazards.filter((h) => h.d > d - 15);
    this.pickups = this.pickups.filter((p) => !p.taken && p.d > d - 15);
  }

  private stumble() {
    this.runner.stumble = 1;
    this.combo = 1;
    this.chain = 0;
    if (this.storm > 0) {
      this.crash('storm');
      return;
    }
    this.storm = 1;
    this.invuln = 0.8;
    this.events.push({ t: 'stumble' });
  }

  private crash(cause: HazardType | 'storm') {
    this.state = 'caught';
    this.runner.stumble = 1;
    this.events.push({ t: 'crash', cause });
  }

  step(dt: number) {
    this.time += dt;
    if (this.state !== 'running') {
      if (this.state === 'finished') {
        // Coast into the nest.
        this.runner.speed = Math.max(0, this.runner.speed - 22 * dt); // stop within ~10 m
        this.runner.update(dt);
      }
      return;
    }
    const r = this.runner;
    r.speed = speedAt(this.level, r.distance);
    const prevX = r.x;
    const prevD = r.distance;
    r.update(dt);
    this.score += r.distance - prevD;
    this.invuln = Math.max(0, this.invuln - dt);
    this.storm = Math.max(0, this.storm - dt / STORM_WINDOW);
    this.magnetLeft = Math.max(0, this.magnetLeft - dt);
    this.stream();

    // Hazards.
    for (const h of this.hazards) {
      if (h.hit || h.passed) continue;
      const dz = h.d - r.distance;
      if (dz < -0.9) {
        h.passed = true;
        // Cleared an obstacle in our own lane by jumping or sliding: small style bonus.
        const box = HAZARD_BOXES[h.type];
        if (h.type !== 'boulder' && Math.abs(r.x - h.x) < box.hx + 0.26) {
          this.score += 50;
          this.events.push({ t: 'clear', bonus: 50 });
        }
        continue;
      }
      if (this.invuln > 0 || Math.abs(dz) > 1.2) continue;
      const hit = testHit({ x: r.x, prevX, y: r.y, sliding: r.sliding, airborne: !r.grounded }, dz, h.x, HAZARD_BOXES[h.type]);
      if (hit === 'none') continue;
      h.hit = true;
      if (hit === 'front') { this.crash(h.type); return; }
      if (hit === 'side') r.bounce();
      this.stumble();
      if (this.state !== 'running') return;
    }

    // Pickups.
    const centerY = r.y + (r.sliding ? 0.36 : r.glideLeft > 0 ? 0.6 : 0.75);
    for (const p of this.pickups) {
      if (p.taken) continue;
      const dz = p.d - r.distance;
      if (this.magnetLeft > 0 && p.kind === 'amber' && dz < 9 && dz > -1) {
        const k = 1 - Math.exp(-9 * dt);
        p.x += (r.x - p.x) * k;
        p.y += (centerY - p.y) * k;
      }
      if (Math.abs(dz) > 0.9 || Math.abs(p.x - r.x) > 0.72 || Math.abs(p.y - centerY) > 0.8) continue;
      p.taken = true;
      switch (p.kind) {
        case 'amber':
          this.amber++;
          this.chain++;
          this.score += 10 * this.combo;
          this.events.push({ t: 'amber', x: p.x, y: p.y, d: p.d, chain: this.chain });
          if (this.chain % 25 === 0 && this.combo < 5) {
            this.combo++;
            this.events.push({ t: 'combo', combo: this.combo });
          }
          break;
        case 'egg':
          this.eggs[p.eggIndex] = true;
          this.score += 500;
          this.events.push({ t: 'egg', x: p.x, y: p.y, d: p.d, index: p.eggIndex });
          break;
        case 'magnet':
          this.magnetLeft = MAGNET_SECONDS;
          this.events.push({ t: 'power', kind: 'magnet', x: p.x, y: p.y, d: p.d });
          break;
        case 'updraft':
          if (r.glideLeft <= 0) {
            r.startGlide(GLIDE_SECONDS);
            this.events.push({ t: 'power', kind: 'updraft', x: p.x, y: p.y, d: p.d });
          }
          // Taking one updraft consumes the whole row.
          for (const q of this.pickups) if (q.kind === 'updraft' && Math.abs(q.d - p.d) < 1) q.taken = true;
          break;
      }
    }

    // Checkpoints and finish.
    const cps = this.level.checkpoints;
    while (this.checkpoint + 1 < cps.length && r.distance >= cps[this.checkpoint + 1]) {
      this.checkpoint++;
      this.snap = { score: this.score, amber: this.amber, combo: this.combo };
      this.events.push({ t: 'checkpoint', index: this.checkpoint });
    }
    if (r.distance >= this.level.length) {
      this.state = 'finished';
      this.events.push({ t: 'finish' });
    }
  }

  /** Get back up where you fell: brief invulnerability, storm cleared. Once per run. */
  revive() {
    if (this.state !== 'caught' || this.reviveUsed) return false;
    this.reviveUsed = true;
    this.state = 'running';
    this.storm = 0;
    this.invuln = 2;
    this.runner.stumble = 0;
    for (const h of this.hazards) if (h.d - this.runner.distance < 4) h.passed = true;
    return true;
  }

  /** Restart from the last checkpoint passed (or the start). Eggs already found stay found. */
  restartFromCheckpoint() {
    const cpD = this.checkpoint >= 0 ? this.level.checkpoints[this.checkpoint] : 0;
    if (this.checkpoint >= 0) {
      this.score = this.snap.score; this.amber = this.snap.amber; this.combo = this.snap.combo;
    } else {
      this.score = 0; this.amber = 0; this.combo = 1;
    }
    this.chain = 0; this.storm = 0; this.magnetLeft = 0; this.invuln = 0.5;
    this.runner.reset(cpD);
    this.hazards = []; this.pickups = [];
    this.hzCursor = this.level.hazards.findIndex((h) => h.d > cpD + 2);
    if (this.hzCursor < 0) this.hzCursor = this.level.hazards.length;
    this.pkCursor = this.level.pickups.findIndex((p) => p.d > cpD + 2);
    if (this.pkCursor < 0) this.pkCursor = this.level.pickups.length;
    this.hintCursor = this.level.hints.findIndex((h) => h.d > cpD);
    if (this.hintCursor < 0) this.hintCursor = this.level.hints.length;
    this.state = 'running';
    this.events.push({ t: 'move', e: 'land' });
  }

  drainEvents(): GameEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}

export { CONFIG };
