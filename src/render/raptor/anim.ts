import * as THREE from 'three';
import { B, restPos, type BoneName } from './model';
import { clamp, easeInOutSine, lerp, TAU } from '../../core/math';

/** Inputs the game feeds the animator each frame. All weights 0..1 unless noted. */
export interface RaptorAnimInput {
  speed: number; // m/s
  air: number;
  vy: number; // vertical velocity, m/s
  slide: number;
  lean: number; // -1..1, positive when moving right
  stumble: number;
  land: number;
  idle: number;
  glide: number;
  /** On the prey's back at the end of the hunt: crouched, gripping, wings beating for balance. */
  pin: number;
}

export const defaultAnimInput = (): RaptorAnimInput => ({ speed: 12, air: 0, vy: 0, slide: 0, lean: 0, stumble: 0, land: 0, idle: 0, glide: 0, pin: 0 });

const KEYS = [
  'pY', 'pZ', 'pPitch', 'pYaw', 'pRoll', 'chX', 'chY', 'chZ', 'n1X', 'n1Y', 'n2X', 'n2Y', 'hX', 'hY', 'hZ',
  't1X', 't1Y', 't2X', 't2Y', 't3X', 't3Y', 't4X', 't4Y',
  'uaLX', 'uaLY', 'uaLZ', 'faLX', 'faLY', 'faLZ', 'hdLX', 'hdLY', 'hdLZ',
  'uaRX', 'uaRY', 'uaRZ', 'faRX', 'faRY', 'faRZ', 'hdRX', 'hdRY', 'hdRZ',
  'fLY', 'fLZ', 'fLM', 'fLT', 'fRY', 'fRZ', 'fRM', 'fRT', 'headPitch', 'breath',
] as const;
type Key = (typeof KEYS)[number];
type Pose = Record<Key, number>;
const zeroPose = (): Pose => Object.fromEntries(KEYS.map((k) => [k, 0])) as Pose;
const blendInto = (out: Pose, b: Pose, w: number) => {
  if (w <= 0) return;
  for (const k of KEYS) out[k] = out[k] + (b[k] - out[k]) * w;
};

const ang = (dy: number, dz: number) => Math.atan2(-dz, -dy); // angle from straight down, + = forward (-Z)
const TOE_FLAT = 1.28;

export class RaptorAnimator {
  private bones: THREE.Bone[];
  private phase = 0;
  private t = 0;
  private lookYaw = 0;
  private lookTarget = 0;
  private lookTimer = 1.5;
  private rest: Record<string, number> = {};
  private restPelvis = restPos('pelvis');
  private hipLocal = { L: restPos('thighL').sub(restPos('pelvis')), R: restPos('thighR').sub(restPos('pelvis')) };
  private len = { thigh: 0, shin: 0, meta: 0 };
  private euler = new THREE.Euler();
  private poses = { run: zeroPose(), idle: zeroPose(), slide: zeroPose(), air: zeroPose(), glide: zeroPose(), pin: zeroPose(), out: zeroPose() };

  constructor(bones: THREE.Bone[]) {
    this.bones = bones;
    const H = restPos('thighR'), K = restPos('shinR'), A = restPos('metaR'), F = restPos('toeR');
    this.len.thigh = H.distanceTo(K);
    this.len.shin = K.distanceTo(A);
    this.len.meta = A.distanceTo(F);
    this.rest.thigh = ang(K.y - H.y, K.z - H.z);
    this.rest.shin = ang(A.y - K.y, A.z - K.z);
    this.rest.meta = ang(F.y - A.y, F.z - A.z);
    this.rest.toe = TOE_FLAT;
  }

  /** Foot ball target for a leg phase q in [0,1): stance then swing. */
  private foot(q: number, stride: number, out: { y: number; z: number; m: number; t: number }) {
    const D = 0.38;
    const half = 0.3 * stride;
    if (q < D) {
      const s = q / D;
      out.z = lerp(-half, half, s);
      out.y = 0.03;
      out.m = lerp(0.35, -0.55, s);
      out.t = TOE_FLAT;
    } else {
      const s = (q - D) / (1 - D);
      out.z = lerp(half, -half, easeInOutSine(s));
      out.y = 0.03 + 0.24 * stride * Math.pow(Math.sin(Math.PI * s), 0.8);
      out.m = s < 0.4 ? lerp(-0.55, -1.3, s / 0.4) : lerp(-1.3, 0.35, easeInOutSine((s - 0.4) / 0.6));
      out.t = s < 0.5 ? lerp(TOE_FLAT, 0.2, s / 0.5) : lerp(0.2, TOE_FLAT, (s - 0.5) / 0.5);
    }
  }

  update(dt: number, inp: RaptorAnimInput) {
    this.t += dt;
    const t = this.t;
    const stride = clamp(0.75 + inp.speed / 40, 0.75, 1.15);
    const strideLen = 2.1 * stride;
    this.phase = (this.phase + (Math.max(inp.speed, 0) / strideLen) * dt * (1 - inp.idle)) % 1;
    const p = this.phase;
    const k = clamp(inp.speed / 12, 0.3, 1.3);

    // ---------- Run ----------
    const run = this.poses.run;
    run.pY = -0.02 - 0.028 * Math.cos(2 * TAU * (p - 0.19));
    run.pZ = 0;
    run.pPitch = -0.08 * k + 0.02 * Math.sin(2 * TAU * p);
    run.pYaw = 0.05 * Math.sin(TAU * p);
    run.pRoll = 0.04 * Math.sin(TAU * p);
    run.chX = 0.03;
    run.chY = -0.6 * run.pYaw;
    run.chZ = -0.5 * run.pRoll;
    run.n1X = -0.18;
    run.n1Y = -0.3 * run.pYaw;
    run.n2X = 0.1;
    run.n2Y = -0.2 * run.pYaw;
    run.hY = 0;
    run.hZ = 0;
    run.headPitch = -0.04;
    run.t1X = -0.06 + 0.03 * Math.sin(2 * TAU * p - 0.6);
    run.t2X = 0.01 + 0.03 * Math.sin(2 * TAU * p - 1.3);
    run.t3X = 0.02 + 0.03 * Math.sin(2 * TAU * p - 2.0);
    run.t4X = 0.02 + 0.03 * Math.sin(2 * TAU * p - 2.7);
    run.t1Y = 0.06 * Math.sin(TAU * p - 0.7);
    run.t2Y = 0.06 * Math.sin(TAU * p - 1.4);
    run.t3Y = 0.07 * Math.sin(TAU * p - 2.1);
    run.t4Y = 0.08 * Math.sin(TAU * p - 2.8);
    const flutter = 0.05 * Math.sin(2 * TAU * p);
    run.uaLX = run.uaRX = 0.05;
    run.uaLY = run.uaRY = 0;
    run.uaLZ = -0.05 - flutter;
    run.uaRZ = 0.05 + flutter;
    run.faLX = run.faRX = 0;
    run.faLY = run.faLZ = run.faRY = run.faRZ = 0;
    run.hdLX = run.hdLY = run.hdLZ = run.hdRX = run.hdRY = run.hdRZ = 0;
    run.breath = 0;
    const f = { y: 0, z: 0, m: 0, t: 0 };
    this.foot(p, stride, f);
    run.fLY = f.y; run.fLZ = f.z; run.fLM = f.m; run.fLT = f.t;
    this.foot((p + 0.5) % 1, stride, f);
    run.fRY = f.y; run.fRZ = f.z; run.fRM = f.m; run.fRT = f.t;

    // ---------- Idle (menus) ----------
    const idle = this.poses.idle;
    if (inp.idle > 0) {
      this.lookTimer -= dt;
      if (this.lookTimer <= 0) {
        this.lookTarget = (Math.sin(t * 12.9898) * 43758.5453) % 1 * 0.9; // deterministic pseudo-random head turns
        this.lookTimer = 1.2 + Math.abs(Math.sin(t * 7.13)) * 2.2;
      }
      this.lookYaw += (this.lookTarget - this.lookYaw) * (1 - Math.exp(-18 * dt)); // quick bird-like snap
      Object.assign(idle, zeroPose());
      idle.pY = -0.06 + 0.006 * Math.sin(t * 2.2);
      idle.pPitch = 0.02;
      idle.chX = 0.0;
      idle.n1X = -0.12;
      idle.n2X = 0.1;
      idle.headPitch = -0.05 + 0.04 * Math.sin(t * 0.7);
      idle.hY = this.lookYaw;
      idle.hZ = 0.15 * this.lookYaw;
      idle.n2Y = 0.3 * this.lookYaw;
      idle.t1X = 0.02; idle.t2X = 0.03; idle.t3X = 0.02; idle.t4X = 0.0;
      idle.t1Y = 0.06 * Math.sin(t * 0.9);
      idle.t2Y = 0.07 * Math.sin(t * 0.9 - 0.6);
      idle.t3Y = 0.09 * Math.sin(t * 0.9 - 1.2);
      idle.t4Y = 0.11 * Math.sin(t * 0.9 - 1.8);
      idle.uaLZ = -0.04; idle.uaRZ = 0.04;
      idle.fLY = 0.03; idle.fLZ = -0.06; idle.fLM = 0.3; idle.fLT = TOE_FLAT;
      idle.fRY = 0.03; idle.fRZ = 0.1; idle.fRM = 0.2; idle.fRT = TOE_FLAT;
      idle.breath = 0.018 * Math.sin(t * 2.2);
    }

    // ---------- Slide ----------
    const sl = this.poses.slide;
    if (inp.slide > 0) {
      Object.assign(sl, run);
      sl.pY = -0.3 + 0.01 * Math.sin(t * 40);
      sl.pPitch = 0.04;
      sl.pYaw = 0; sl.pRoll = 0.02 * Math.sin(t * 31);
      sl.chX = -0.06; sl.chY = 0; sl.chZ = 0;
      sl.n1X = -0.38; sl.n2X = 0.18; sl.headPitch = -0.12;
      sl.t1X = -0.12; sl.t2X = 0.02; sl.t3X = 0.04; sl.t4X = 0.04;
      sl.t1Y = 0.03 * Math.sin(t * 9); sl.t2Y = 0.04 * Math.sin(t * 9 - 0.6); sl.t3Y = 0.05 * Math.sin(t * 9 - 1.2); sl.t4Y = 0.06 * Math.sin(t * 9 - 1.8);
      sl.uaLZ = -0.02; sl.uaRZ = 0.02; sl.uaLX = sl.uaRX = -0.1;
      sl.fLY = 0.03; sl.fLZ = -0.33; sl.fLM = 1.1; sl.fLT = 1.4;
      sl.fRY = 0.03; sl.fRZ = -0.14; sl.fRM = 0.9; sl.fRT = 1.35;
    }

    // ---------- Air ----------
    const air = this.poses.air;
    if (inp.air > 0 || inp.glide > 0) {
      Object.assign(air, run);
      const rising = clamp(inp.vy / 6, -1, 1);
      air.pY = 0.02;
      air.pPitch = 0.1 * rising - 0.02;
      air.pYaw = 0; air.pRoll = 0;
      air.chX = 0.02; air.chY = 0; air.chZ = 0;
      air.n1X = 0.05 + 0.08 * rising; air.n2X = 0.05; air.headPitch = -0.02;
      air.t1X = -0.16 * (0.5 + 0.5 * rising) - 0.04; air.t2X = -0.04; air.t3X = 0.0; air.t4X = 0.02;
      air.t1Y = 0.04 * Math.sin(t * 5); air.t2Y = 0.05 * Math.sin(t * 5 - 0.5); air.t3Y = 0.06 * Math.sin(t * 5 - 1); air.t4Y = 0.07 * Math.sin(t * 5 - 1.5);
      const spread = 0.55 + 0.1 * Math.sin(t * 14);
      air.uaLZ = -spread; air.uaRZ = spread; air.uaLX = air.uaRX = 0.25;
      air.faLY = 0.35; air.faRY = -0.35;
      const extend = clamp(-inp.vy / 8, 0, 1); // legs reach down when falling
      air.fLY = lerp(0.3, 0.08, extend); air.fLZ = lerp(-0.02, -0.18, extend); air.fLM = lerp(-1.5, 0.2, extend); air.fLT = lerp(0.35, 1.1, extend);
      air.fRY = lerp(0.34, 0.12, extend); air.fRZ = lerp(0.06, -0.06, extend); air.fRM = lerp(-1.5, 0.1, extend); air.fRT = lerp(0.35, 1.1, extend);
    }

    // ---------- Glide (Updraft): wings spread wide, legs tucked, tail fanned ----------
    const gl = this.poses.glide;
    if (inp.glide > 0) {
      Object.assign(gl, air);
      const flap = Math.sin(t * 3.2) * 0.08;
      gl.pPitch = -0.06 + 0.03 * Math.sin(t * 1.7);
      gl.n1X = -0.12; gl.n2X = 0.06; gl.headPitch = -0.08;
      gl.t1X = -0.08; gl.t2X = -0.02; gl.t3X = 0; gl.t4X = 0.02;
      gl.uaLZ = -1.25 - flap; gl.uaRZ = 1.25 + flap; gl.uaLX = gl.uaRX = 0.35;
      gl.faLY = 0.95; gl.faRY = -0.95; gl.faLZ = -0.2; gl.faRZ = 0.2;
      gl.hdLY = 0.35; gl.hdRY = -0.35;
      gl.fLY = 0.34; gl.fLZ = 0.05; gl.fLM = -1.55; gl.fLT = 0.3;
      gl.fRY = 0.34; gl.fRZ = 0.1; gl.fRM = -1.55; gl.fRT = 0.3;
    }

    // ---------- Pin: the raptor-prey-restraint pose. Feet grip the back, body low and forward,
    // wings beating for balance, tail up as a counterweight. No gore: it holds, it doesn't bite. ----------
    const pn = this.poses.pin;
    if (inp.pin > 0) {
      Object.assign(pn, zeroPose());
      const beat = Math.sin(t * 13);
      const sway = Math.sin(t * 5.3);
      pn.pY = -0.44 + 0.02 * Math.sin(t * 26);
      pn.pZ = 0.04;
      pn.pPitch = -0.3 + 0.05 * beat;
      pn.pRoll = 0.08 * sway;
      pn.chX = -0.12; pn.chZ = -0.05 * sway;
      pn.n1X = -0.22; pn.n2X = 0.0; pn.n1Y = 0.12 * Math.sin(t * 3.1);
      pn.headPitch = -0.55 + 0.08 * Math.sin(t * 7);
      pn.hY = 0.25 * Math.sin(t * 2.3);
      pn.t1X = 0.02; pn.t2X = -0.06; pn.t3X = -0.04; pn.t4X = -0.02;
      pn.t1Y = 0.14 * sway; pn.t2Y = 0.16 * Math.sin(t * 5.3 - 0.5); pn.t3Y = 0.18 * Math.sin(t * 5.3 - 1); pn.t4Y = 0.2 * Math.sin(t * 5.3 - 1.5);
      const spread = 1.05 + 0.45 * beat;
      pn.uaLZ = -spread; pn.uaRZ = spread; pn.uaLX = pn.uaRX = 0.35 + 0.15 * beat;
      pn.faLY = 0.8; pn.faRY = -0.8; pn.faLZ = -0.15; pn.faRZ = 0.15;
      pn.hdLY = 0.3; pn.hdRY = -0.3;
      // One foot forward on the shoulders, one back on the hips; claws hooked down.
      pn.fLY = 0.04; pn.fLZ = -0.22; pn.fLM = 0.7; pn.fLT = 0.9;
      pn.fRY = 0.0; pn.fRZ = 0.2; pn.fRM = 0.1; pn.fRT = 0.9;
    }

    // ---------- Blend ----------
    const out = this.poses.out;
    Object.assign(out, run);
    blendInto(out, idle, inp.idle);
    blendInto(out, sl, inp.slide);
    blendInto(out, air, inp.air);
    blendInto(out, gl, inp.glide);
    blendInto(out, pn, inp.pin);

    // Additive layers.
    const L = inp.lean;
    out.pRoll += -L * 0.32;
    out.pYaw += -L * 0.14;
    out.chY += -L * 0.08;
    out.t1Y += L * 0.3;
    out.t2Y += L * 0.18;
    out.t3Y += L * 0.1;
    out.n1Y += L * 0.12;
    const s = inp.stumble;
    if (s > 0) {
      out.pPitch += -0.22 * s * Math.sin(t * 26);
      out.pRoll += 0.18 * s * Math.sin(t * 17);
      out.n1X += 0.35 * s * Math.sin(t * 23 + 1);
      out.t1X += 0.25 * s * Math.sin(t * 19);
    }
    out.pY += -0.09 * inp.land;
    out.pPitch += -0.12 * inp.land;
    out.t1X += 0.18 * inp.land;
    out.n1X += -0.15 * inp.land;

    // Head stabilization: keep world head pitch near target.
    out.hX = out.headPitch - (out.pPitch + out.chX + out.n1X + out.n2X);

    this.apply(out);
  }

  private set(name: BoneName, x: number, y: number, z: number) {
    this.euler.set(x, y, z, 'YXZ');
    this.bones[B[name]].quaternion.setFromEuler(this.euler);
  }

  private apply(o: Pose) {
    const bones = this.bones;
    const pelvis = bones[B.pelvis];
    pelvis.position.set(0, this.restPelvis.y + o.pY, o.pZ);
    this.set('pelvis', o.pPitch, o.pYaw, o.pRoll);
    this.set('chest', o.chX, o.chY, o.chZ);
    const br = 1 + o.breath;
    bones[B.chest].scale.set(br, br, 1);
    this.set('neck1', o.n1X, o.n1Y, 0);
    this.set('neck2', o.n2X, o.n2Y, 0);
    this.set('head', o.hX, o.hY, o.hZ);
    this.set('tail1', o.t1X, o.t1Y, 0);
    this.set('tail2', o.t2X, o.t2Y, 0);
    this.set('tail3', o.t3X, o.t3Y, 0);
    this.set('tail4', o.t4X, o.t4Y, 0);
    this.set('upperArmL', o.uaLX, o.uaLY, o.uaLZ);
    this.set('foreArmL', o.faLX, o.faLY, o.faLZ);
    this.set('handL', o.hdLX, o.hdLY, o.hdLZ);
    this.set('upperArmR', o.uaRX, o.uaRY, o.uaRZ);
    this.set('foreArmR', o.faRX, o.faRY, o.faRZ);
    this.set('handR', o.hdRX, o.hdRY, o.hdRZ);
    this.leg('L', o.fLY, o.fLZ, o.fLM, o.fLT, o);
    this.leg('R', o.fRY, o.fRZ, o.fRM, o.fRT, o);
  }

  /** Planar 2-bone IK (hip-knee-ankle) in pelvis space, with metatarsus and toe angles prescribed. */
  private leg(side: 'L' | 'R', fy: number, fz: number, metaW: number, toeW: number, o: Pose) {
    const pitch = o.pPitch;
    // Foot target relative to pelvis pivot, rotated into pelvis-local frame.
    const ry = fy - (this.restPelvis.y + o.pY);
    const rz = fz - o.pZ;
    const c = Math.cos(-pitch), s = Math.sin(-pitch);
    const ly = ry * c - rz * s;
    const lz = ry * s + rz * c;
    const meta = metaW - pitch;
    const toe = toeW - pitch;
    // Ankle = ball - meta vector.
    const ay = ly + this.len.meta * Math.cos(meta);
    const az = lz + this.len.meta * Math.sin(meta);
    const hip = this.hipLocal[side];
    const dy = ay - hip.y, dz = az - hip.z;
    const L1 = this.len.thigh, L2 = this.len.shin;
    const d = clamp(Math.hypot(dy, dz), Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-3);
    const base = ang(dy, dz);
    const alpha = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const thighA = base + alpha; // knee bends forward
    const ky = hip.y - L1 * Math.cos(thighA);
    const kz = hip.z - L1 * Math.sin(thighA);
    const shinA = ang(ay - ky, az - kz);
    const tThigh = thighA - this.rest.thigh;
    const tShin = shinA - this.rest.shin - tThigh;
    const tMeta = meta - this.rest.meta - (shinA - this.rest.shin);
    const tToe = toe - this.rest.toe - (meta - this.rest.meta);
    const sx = side === 'L' ? -1 : 1;
    const splay = 0.04 * sx;
    this.set(`thigh${side}`, tThigh, 0, splay);
    this.set(`shin${side}`, tShin, 0, 0);
    this.set(`meta${side}`, tMeta, 0, 0);
    this.set(`toe${side}`, tToe, 0, 0);
  }
}
