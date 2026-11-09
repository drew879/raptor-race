import * as THREE from 'three';
import { GeomBuilder } from './geom';
import { GOBI, col, mix, shade } from './palette';
import { MATS, worldUniforms } from './materials';
import { Rng } from '../core/rng';

/** Painterly gradient sky dome with sun glow. Follows the camera. */
export function createSky(sunDir: THREE.Vector3) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      zenith: { value: col(GOBI.skyZenith) },
      mid: { value: col(GOBI.skyMid) },
      horizon: { value: col(GOBI.horizon) },
      sunColor: { value: col(GOBI.sunGlow) },
      sunDir: { value: sunDir.clone().normalize() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 zenith, mid, horizon, sunColor, sunDir;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 c = mix(horizon, mid, smoothstep(0.0, 0.14, h));
        c = mix(c, zenith, smoothstep(0.14, 0.55, h));
        // Golden-hour warmth hugging the horizon.
        c += sunColor * 0.16 * (1.0 - smoothstep(0.0, 0.2, h));
        // Warm haze band hugging the horizon.
        c = mix(c, horizon * 1.04, (1.0 - smoothstep(-0.02, 0.06, h)) * 0.9);
        float s = max(dot(d, normalize(sunDir)), 0.0);
        c += sunColor * (pow(s, 6.0) * 0.28 + pow(s, 48.0) * 0.45);
        c = mix(c, vec3(1.0, 0.97, 0.9) * 1.6, smoothstep(0.9990, 0.9994, s));
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), mat);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  mesh.name = 'sky';
  return mesh;
}

/**
 * Distant mesa silhouettes and soft clouds: a matte-painting layer that follows the camera
 * (no parallax), pre-tinted toward the horizon so it never competes with gameplay.
 */
export function createBackdrop() {
  const g = new GeomBuilder(false);
  const rng = new Rng(75);
  const hazeNear = mix(GOBI.cliffRed, GOBI.horizon, 0.45);
  const hazeFar = mix(GOBI.cliffLight, GOBI.horizon, 0.66);
  const ringLayer = (dist: number, count: number, hMin: number, hMax: number, tint: THREE.Color, arc: number) => {
    const bandA = tint, bandB = shade(tint, 1.13), lip = shade(tint, 0.84);
    // The world bends away with distance; extend bases down to where the bent ground meets the horizon.
    const sink = -worldUniforms.uCurve.value * dist * dist - 6;
    for (let i = 0; i < count; i++) {
      const a = -arc + (2 * arc * (i + rng.range(0.1, 0.9))) / count; // angle from -Z
      const cx = Math.sin(a) * dist, cz = -Math.cos(a) * dist;
      const w = rng.range(22, 66), h = rng.range(hMin, hMax) * rng.range(0.7, 1.3);
      const right = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const M = 9;
      // Tiered butte profile: steep flanks, a shoulder step, flat top.
      const prof: number[] = [];
      const shoulder = rng.range(0.5, 0.7);
      for (let k = 0; k < M; k++) {
        const t = k / (M - 1);
        const e = Math.min(t, 1 - t);
        prof.push(e < 0.08 ? 0 : e < 0.2 ? h * shoulder * rng.range(0.9, 1) : h * rng.range(0.95, 1.0));
      }
      const levels = [sink, 0.3, 0.55, 0.78];
      for (let k = 0; k < M - 1; k++) {
        const x0 = (k / (M - 1) - 0.5) * w, x1 = ((k + 1) / (M - 1) - 0.5) * w;
        const p0 = new THREE.Vector3(cx, 0, cz).addScaledVector(right, x0), p1 = new THREE.Vector3(cx, 0, cz).addScaledVector(right, x1);
        for (let b = 0; b < levels.length; b++) {
          const yb0 = b === 0 ? levels[0] : Math.min(prof[k], h * levels[b]);
          const yb1 = b === 0 ? levels[0] : Math.min(prof[k + 1], h * levels[b]);
          const yt0 = b === levels.length - 1 ? prof[k] : Math.min(prof[k], h * levels[b + 1]);
          const yt1 = b === levels.length - 1 ? prof[k + 1] : Math.min(prof[k + 1], h * levels[b + 1]);
          if (yt0 <= yb0 && yt1 <= yb1) continue;
          const c = b === levels.length - 1 ? lip : b % 2 ? bandB : bandA;
          g.quad(p1.clone().setY(yb1), p0.clone().setY(yb0), p0.clone().setY(yt0), p1.clone().setY(yt1), shade(c, rng.range(0.98, 1.02)));
        }
      }
    }
  };
  ringLayer(430, 15, 16, 40, hazeFar, 1.45);
  ringLayer(310, 11, 14, 32, hazeNear, 1.3);
  // Nearest layer: hazy dune ridges overlapping the butte bases.
  const duneHaze = mix(GOBI.sandMid, GOBI.horizon, 0.5);
  const dist = 215, sinkD = -worldUniforms.uCurve.value * dist * dist - 4;
  const M = 64;
  for (let k = 0; k < M; k++) {
    const a0 = -1.5 + (3 * k) / M, a1 = -1.5 + (3 * (k + 1)) / M;
    const h0 = 3 + 7 * Math.pow(Math.abs(Math.sin(a0 * 5.3 + 1.1)), 1.6) + 3 * Math.sin(a0 * 13.1);
    const h1 = 3 + 7 * Math.pow(Math.abs(Math.sin(a1 * 5.3 + 1.1)), 1.6) + 3 * Math.sin(a1 * 13.1);
    const p0 = new THREE.Vector3(Math.sin(a0) * dist, 0, -Math.cos(a0) * dist), p1 = new THREE.Vector3(Math.sin(a1) * dist, 0, -Math.cos(a1) * dist);
    g.quad(p1.clone().setY(sinkD), p0.clone().setY(sinkD), p0.clone().setY(h0), p1.clone().setY(h1), shade(duneHaze, 0.97 + 0.06 * Math.sin(k * 1.7)));
  }
  // Soft stylized clouds: rows of half-disc puffs, bright tops.
  const top = mix(0xffffff, GOBI.sunGlow, 0.35), low = mix(GOBI.sunGlow, GOBI.horizon, 0.55);
  for (let i = 0; i < 14; i++) {
    const a = i < 7 ? rng.range(-1.2, 1.2) : rng.range(-3.1, 3.1);
    const dist = rng.range(400, 470);
    const cx = Math.sin(a) * dist, cz = -Math.cos(a) * dist, cy = i < 7 ? rng.range(70, 150) : rng.range(150, 260);
    const right = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const puffs = rng.int(3, 6);
    let off = -puffs * 6;
    for (let p = 0; p < puffs; p++) {
      const r = rng.range(6, 13) * (p === 0 || p === puffs - 1 ? 0.7 : 1);
      off += r * 0.9;
      const center = new THREE.Vector3(cx, cy, cz).addScaledVector(right, off);
      const S = 8;
      for (let k = 0; k < S; k++) {
        const t0 = (k / S) * Math.PI, t1 = ((k + 1) / S) * Math.PI;
        const q0 = center.clone().addScaledVector(right, Math.cos(t0) * r).add(new THREE.Vector3(0, Math.sin(t0) * r * 0.75, 0));
        const q1 = center.clone().addScaledVector(right, Math.cos(t1) * r).add(new THREE.Vector3(0, Math.sin(t1) * r * 0.75, 0));
        const lift = Math.sin((t0 + t1) / 2);
        g.tri(center, q1, q0, low.clone().lerp(top, 0.35 + lift * 0.65));
      }
      off += r * 0.9;
    }
  }
  const mat = MATS.backdrop;
  mat.side = THREE.DoubleSide;
  mat.depthWrite = true; // real depth, so post effects can tell distant buttes from sky
  const mesh = new THREE.Mesh(g.build(), mat);
  mesh.renderOrder = -5;
  mesh.frustumCulled = false;
  mesh.name = 'backdrop';
  return mesh;
}
