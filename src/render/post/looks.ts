import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export type LookName = 'journal' | 'mural' | 'amber' | 'graphic' | 'current';

/** Shared GLSL helpers: value noise, fbm, linear depth, depth-edge detection. */
const COMMON = /* glsl */ `
  #include <packing>
  uniform sampler2D tDiffuse, tDepth;
  uniform vec2 res;
  uniform float cNear, cFar, dpr;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
  float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }
  float viewZ(vec2 uv) { float d = texture2D(tDepth, uv).x; return -perspectiveDepthToViewZ(d, cNear, cFar); }
  // Second-derivative (Laplacian) depth edges: true breaks only, so ground seen at grazing angles stays clean.
  float depthEdge(vec2 uv, float px, float thresh) {
    vec2 o = px * dpr / res;
    float c = viewZ(uv);
    float lx = abs(viewZ(uv + vec2(o.x, 0.0)) + viewZ(uv - vec2(o.x, 0.0)) - 2.0 * c);
    float ly = abs(viewZ(uv + vec2(0.0, o.y)) + viewZ(uv - vec2(0.0, o.y)) - 2.0 * c);
    return smoothstep(thresh * 0.5, thresh, max(lx, ly) / max(c, 0.5));
  }
  float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
`;
const VERT = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

/** Living field journal: dip-pen ink outlines, light interior hatching lines, gentle watercolor washes on paper. */
const JOURNAL = /* glsl */ `${COMMON}
  float lumaAt(vec2 uv) { return luma(texture2D(tDiffuse, uv).rgb); }
  void main() {
    vec2 uv = vUv;
    vec2 wob = (vec2(noise(uv * res / 14.0), noise(uv * res / 14.0 + 7.3)) - 0.5) * 2.0 / res;
    vec3 c = texture2D(tDiffuse, uv + wob).rgb;
    float sky = step(0.9999, texture2D(tDepth, uv).x);
    // Watercolor washes: lighten and soften toward the paper, gentle value steps (no blotches).
    float l = luma(c);
    float steps = 4.0;
    float lq = mix(l, (floor(l * steps + 0.5)) / steps, 0.45);
    vec3 wash = c * (lq / max(l, 0.02));
    wash = mix(vec3(luma(wash)), wash, 0.9);
    vec3 paper = vec3(0.965, 0.925, 0.845);
    float grain = fbm(uv * res / 2.5) * 0.55 + fbm(uv * res / 90.0) * 0.45;
    float bloom = fbm(uv * res / 220.0); // large, soft pigment variation
    wash = mix(paper, wash, 0.78 + 0.14 * bloom) * (0.93 + 0.1 * grain);
    vec3 skyWash = mix(paper, c, 0.5 + 0.3 * smoothstep(0.35, 0.75, fbm(uv * vec2(4.0, 10.0)))) * (0.94 + 0.08 * grain);
    vec3 col = mix(wash, skyWash, sky);
    // Ink: strong depth contours (dip pen), lighter interior lines from value breaks.
    float e = depthEdge(uv + wob * 0.6, 1.2, 0.04);
    vec2 o = 1.0 / res;
    float gx = lumaAt(uv + vec2(o.x, 0.0)) - lumaAt(uv - vec2(o.x, 0.0));
    float gy = lumaAt(uv + vec2(0.0, o.y)) - lumaAt(uv - vec2(0.0, o.y));
    float inner = smoothstep(0.12, 0.22, length(vec2(gx, gy))) * (1.0 - sky);
    float broken = smoothstep(0.3, 0.6, noise(uv * res / 5.0) + 0.3);
    vec3 ink = vec3(0.19, 0.13, 0.1);
    col = mix(col, ink, clamp(e * 0.95 + inner * 0.45 * broken, 0.0, 1.0));
    gl_FragColor = vec4(col, 1.0);
  }`;

/** Paleo-art mural: Kuwahara oil-paint filter, canvas weave, rich warm grade. */
const MURAL = /* glsl */ `${COMMON}
  void main() {
    vec2 uv = vUv;
    const int R = 7;
    vec3 m[4]; vec3 s[4];
    for (int k = 0; k < 4; k++) { m[k] = vec3(0.0); s[k] = vec3(0.0); }
    for (int j = -R; j <= R; j++) for (int i = -R; i <= R; i++) {
      vec3 c = texture2D(tDiffuse, uv + vec2(float(i), float(j)) * dpr / res).rgb;
      vec3 c2 = c * c;
      if (i <= 0 && j <= 0) { m[0] += c; s[0] += c2; }
      if (i >= 0 && j <= 0) { m[1] += c; s[1] += c2; }
      if (i <= 0 && j >= 0) { m[2] += c; s[2] += c2; }
      if (i >= 0 && j >= 0) { m[3] += c; s[3] += c2; }
    }
    float n = float((R + 1) * (R + 1));
    float best = 1e9; vec3 col = vec3(0.0);
    for (int k = 0; k < 4; k++) {
      vec3 mu = m[k] / n; vec3 v = abs(s[k] / n - mu * mu);
      float sv = v.r + v.g + v.b;
      if (sv < best) { best = sv; col = mu; }
    }
    // Rich, warm museum-mural grade.
    float l = luma(col);
    col = mix(vec3(l), col, 1.15);
    col = pow(col, vec3(1.08, 1.02, 0.98));
    col *= mix(vec3(0.92, 0.95, 1.05), vec3(1.06, 1.0, 0.9), smoothstep(0.2, 0.8, l));
    // Canvas weave and brush direction.
    float weave = sin(uv.x * res.x * 0.9) * sin(uv.y * res.y * 0.9);
    col *= 0.96 + 0.035 * weave + 0.05 * (fbm(uv * res / vec2(30.0, 6.0)) - 0.5);
    float vig = smoothstep(1.15, 0.35, length((uv - 0.5) * vec2(1.0, 1.2)));
    gl_FragColor = vec4(col * mix(0.72, 1.0, vig), 1.0);
  }`;

/** Amber-lit cinematic: split-tone grade (teal shadows, amber highlights), haze, grain, vignette. */
const AMBER = /* glsl */ `${COMMON}
  uniform float time;
  void main() {
    vec2 uv = vUv;
    vec3 c = texture2D(tDiffuse, uv).rgb;
    float z = viewZ(uv);
    float l = luma(c);
    vec3 shadowTint = vec3(0.12, 0.33, 0.36), highTint = vec3(1.0, 0.72, 0.35);
    c = mix(c, c * mix(shadowTint * 2.2, highTint * 1.25, smoothstep(0.05, 0.85, l)), 0.55);
    c = (c - 0.5) * 1.12 + 0.5;
    // Atmospheric amber haze with distance.
    c = mix(c, vec3(1.0, 0.74, 0.42), smoothstep(30.0, 200.0, z) * 0.45);
    float vig = smoothstep(1.1, 0.3, length((uv - 0.5) * vec2(1.0, 1.25)));
    c *= mix(0.55, 1.0, vig);
    c += (hash(uv * res + time) - 0.5) * 0.035;
    gl_FragColor = vec4(c, 1.0);
  }`;

/** Bold graphic poster: hue-preserving posterization (few hues, two saturations, three values), crisp outlines. */
const GRAPHIC = /* glsl */ `${COMMON}
  vec3 rgb2hsv(vec3 c) { vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0); vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r)); float d = q.x - min(q.w, q.y); float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x); }
  vec3 hsv2rgb(vec3 c) { vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0); return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y); }
  void main() {
    vec2 uv = vUv;
    vec3 c = texture2D(tDiffuse, uv).rgb;
    float sky = step(0.9999, texture2D(tDepth, uv).x);
    vec3 h = rgb2hsv(c);
    h.x = floor(h.x * 10.0 + 0.5) / 10.0;
    h.y = h.y < 0.32 ? 0.22 : 0.62;
    h.z = h.z < 0.42 ? 0.32 : h.z < 0.74 ? 0.66 : 0.93;
    vec3 col = hsv2rgb(h);
    // Sky: two flat bands keyed off the real sky color.
    vec3 sh = rgb2hsv(c);
    vec3 skyc = sh.y < 0.28 ? vec3(0.98, 0.84, 0.64) : vec3(0.45, 0.66, 0.8);
    col = mix(col, skyc, sky);
    float e = depthEdge(uv, 1.3, 0.05);
    col = mix(col, vec3(0.17, 0.12, 0.1), e);
    gl_FragColor = vec4(col, 1.0);
  }`;

export class LookPipeline {
  readonly composer: EffectComposer;
  private pass: ShaderPass | null = null;
  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, readonly look: LookName) {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType });
    rt.depthTexture = new THREE.DepthTexture(size.x, size.y);
    this.composer = new EffectComposer(renderer, rt);
    this.composer.addPass(new RenderPass(scene, camera));
    if (look === 'amber') this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.55, 0.7, 0.8));
    this.composer.addPass(new OutputPass());
    const frag = { journal: JOURNAL, mural: MURAL, amber: AMBER, graphic: GRAPHIC, current: '' }[look];
    if (frag) {
      const uniforms: Record<string, THREE.IUniform> = {
        tDiffuse: { value: null }, tDepth: { value: rt.depthTexture }, res: { value: new THREE.Vector2(size.x, size.y) },
        cNear: { value: camera.near }, cFar: { value: camera.far }, time: { value: 0 }, dpr: { value: renderer.getPixelRatio() },
      };
      this.pass = new ShaderPass(new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: frag }));
      this.composer.addPass(this.pass);
    }
  }
  render() {
    // The scene renders into the composer's current read buffer (a clone of our target), so bind
    // that buffer's depth each frame.
    if (this.pass) this.pass.uniforms.tDepth.value = this.composer.readBuffer.depthTexture;
    this.composer.render();
  }
}

/** Per-look lighting and atmosphere tweaks applied to the shared stage. */
export function applyLookLighting(look: LookName, ctx: { sun: THREE.DirectionalLight; hemi: THREE.HemisphereLight; fog: THREE.Fog; sunDir: THREE.Vector3 }) {
  const { sun, hemi, fog } = ctx;
  switch (look) {
    case 'journal':
      sun.intensity = 2.2; hemi.intensity = 3.0;
      break;
    case 'mural':
      ctx.sunDir.set(0.85, 0.32, -0.42).normalize(); // low, raking, from front-right: drama
      sun.intensity = 3.6; sun.color.set(0xffc98a); hemi.intensity = 1.7;
      fog.near = 30; fog.far = 190;
      break;
    case 'amber':
      ctx.sunDir.set(0.25, 0.22, -0.94).normalize(); // backlit, sun ahead and low: rims and glow
      sun.intensity = 3.4; sun.color.set(0xffb766); hemi.intensity = 1.9;
      fog.color.set(0xf6b36e); fog.near = 20; fog.far = 170;
      break;
    case 'graphic':
      sun.intensity = 2.6; hemi.intensity = 2.8;
      break;
  }
}
