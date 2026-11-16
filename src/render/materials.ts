import * as THREE from 'three';
import { GOBI } from './palette';
import { type HillDef, gradeAt, hillAt } from '../game/hill';

/** How many steeper pitches a level's hill can have (shader uniform slots). */
export const MAX_PITCHES = 6;

/**
 * Shared uniforms for the whole world. The curved-world bend is applied to gl_Position only,
 * so lighting, fog and shadows stay computed in unbent space (consistent and cheap).
 */
export const worldUniforms = {
  uCurve: { value: 0.0007 },
  /** Lateral bend (track curves): + bends the world to the right with distance. Animated per frame. */
  uBend: { value: 0 },
  uRimColor: { value: new THREE.Color(GOBI.sunGlow) },
  /** Dappled canopy light (forest, graphics version 3): 0 off, 1 full. */
  uDapple: { value: 0 },
  /** Seconds, for slow drifts (the canopy's light pattern sways). */
  uTime: { value: 0 },
  /** Visual downhill, as a hill profile along the course: flat until `uSlopeFrom` (the crest), then dropping
   * `uSlope` meters per meter until it levels out at `uSlopeTo` (the bottom), with soft bends at both ends. The
   * drop is applied to screen positions relative to the camera, so the trail falls away while trees stay upright.
   * 0 on level ground. */
  uSlope: { value: 0 },
  uSlopeFrom: { value: 0 },
  uSlopeTo: { value: 1e6 },
  /** Steeper pitches on top of that grade: (from, to, extra grade, bend softness in meters); unused slots are 0. */
  uPitch: { value: Array.from({ length: MAX_PITCHES }, () => new THREE.Vector4()) },
};

/** GLSL for the hill profile (declarations and functions), shared by every shader that draws into the world. */
export const HILL_GLSL = `
  uniform float uSlope, uSlopeFrom, uSlopeTo;
  uniform vec4 uPitch[${MAX_PITCHES}];
  float rrSoftplus(float x, float w) { return max(x, 0.0) + w * log(1.0 + exp(-abs(x) / w)); }
  float rrHill(float d) {
    float h = -uSlope * (rrSoftplus(d - uSlopeFrom, 8.0) - rrSoftplus(d - uSlopeTo, 8.0));
    for (int i = 0; i < ${MAX_PITCHES}; i++) {
      vec4 p = uPitch[i];
      if (p.z != 0.0) h -= p.z * (rrSoftplus(d - p.x, p.w) - rrSoftplus(d - p.y, p.w));
    }
    return h;
  }
  /** Raise or drop a view-space position by the hill's height there relative to the camera's. */
  vec3 rrHillWarp(vec3 mv) {
    if (uSlope == 0.0) return mv;
    vec3 wpos = transpose(mat3(viewMatrix)) * (mv - viewMatrix[3].xyz);
    return mv + (viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz * (rrHill(-wpos.z) - rrHill(-cameraPosition.z));
  }`;
export const hillUniforms = () => ({ uSlope: worldUniforms.uSlope, uSlopeFrom: worldUniforms.uSlopeFrom, uSlopeTo: worldUniforms.uSlopeTo, uPitch: worldUniforms.uPitch });

let hill: HillDef | undefined;
/** The hill's height at course distance d (game/hill.ts, which the shader matches). */
export const hillHeight = (d: number) => hillAt(hill, d);
/** The hill's local grade at course distance d (0 on the flats). */
export const hillGrade = (d: number) => gradeAt(hill, d);
/** Set the level's hill (grade from the crest to the bottom, plus any steeper pitches). */
export function setHill(def: HillDef | undefined) {
  hill = def;
  const u = worldUniforms;
  u.uSlope.value = def?.grade ?? 0;
  u.uSlopeFrom.value = def?.from ?? 0;
  u.uSlopeTo.value = def?.to ?? 1e6;
  u.uPitch.value.forEach((v, i) => {
    const p = def?.pitches?.[i];
    v.set(p?.from ?? 0, p?.to ?? 0, p?.extra ?? 0, p?.soft ?? 5);
  });
}

/** Bends grow with distance squared, softening past this many meters so the far terrain never swings off its edge. */
export const BEND_KNEE = 90;

export const rimColors: Record<string, THREE.Color> = {};
type Patchable = THREE.MeshLambertMaterial | THREE.MeshBasicMaterial | THREE.PointsMaterial;

export function patchWorld<T extends Patchable>(mat: T, opts: { rim?: number; bend?: boolean; rimColor?: number; sand?: boolean; dapple?: boolean } = {}): T {
  const rim = opts.rim ?? 0;
  const rimCol = opts.rimColor !== undefined ? new THREE.Color(opts.rimColor) : null;
  const bend = opts.bend ?? true;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uCurve = worldUniforms.uCurve;
    shader.uniforms.uBend = worldUniforms.uBend;
    shader.uniforms.uSlope = worldUniforms.uSlope;
    shader.uniforms.uSlopeFrom = worldUniforms.uSlopeFrom;
    shader.uniforms.uSlopeTo = worldUniforms.uSlopeTo;
    shader.uniforms.uPitch = worldUniforms.uPitch;
    shader.uniforms.uRimColor = rimCol ? { value: rimCol } : worldUniforms.uRimColor;
    if (bend) {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
          uniform float uCurve, uBend;
          ${HILL_GLSL}`)
        .replace(
          '#include <project_vertex>',
          `#include <project_vertex>
          { vec4 bentPos = mvPosition; float zz = bentPos.z * bentPos.z; bentPos.y -= uCurve * zz;
            bentPos.xyz += rrHillWarp(mvPosition.xyz) - mvPosition.xyz; // the hill, measured where the vertex really is
            bentPos.x += uBend * zz / (1.0 + abs(bentPos.z) / ${BEND_KNEE.toFixed(1)}); gl_Position = projectionMatrix * bentPos; }`,
        );
    }
    if (opts.dapple) {
      // Dappled canopy light: soft pools of warm sun and cool shade, fixed in the world (with a slow sway), so
      // you run through them. Painted onto the surface color (the illustrated look), on ground, obstacles and
      // characters alike.
      shader.uniforms.uDapple = worldUniforms.uDapple;
      shader.uniforms.uTime = worldUniforms.uTime;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vDapPos;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvDapPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vDapPos;
          uniform float uDapple, uTime;
          float dapHash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 23758.5453); }
          float dapNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(dapHash(i), dapHash(i + vec2(1, 0)), f.x), mix(dapHash(i + vec2(0, 1)), dapHash(i + vec2(1, 1)), f.x), f.y); }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          if (uDapple > 0.0) {
            // Sun spots ~1.5-3 m across over cool canopy shade, about a third of the ground lit.
            vec2 w = vDapPos.xz * 0.42 + vec2(vDapPos.y * 0.12, vDapPos.y * 0.25) + vec2(sin(uTime * 0.21), cos(uTime * 0.17)) * 0.18;
            float n = dapNoise(w) * 0.6 + dapNoise(w * 2.3 + 13.1) * 0.4;
            float lit = smoothstep(0.47, 0.57, n);
            diffuseColor.rgb *= mix(vec3(1.0), mix(vec3(0.72, 0.77, 0.86), vec3(1.3, 1.19, 1.0), lit), uDapple);
          }`);
    }
    if (opts.sand) {
      // Sand surface detail on flat ground: thin wind-ripple troughs and crusty patches, in world space, fading out
      // with distance (so they never shimmer). Strong enough to survive the post pass's value bands.
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vSandPos;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvSandPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vSandPos;
          float sandHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float sandNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(sandHash(i), sandHash(i + vec2(1, 0)), f.x), mix(sandHash(i + vec2(0, 1)), sandHash(i + vec2(1, 1)), f.x), f.y); }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          {
            vec3 sn = normalize(cross(dFdx(vSandPos), dFdy(vSandPos)));
            float sandFlat = smoothstep(0.86, 0.97, abs(sn.y)) * (1.0 - step(2.5, vSandPos.y)); // ('flat' is reserved in GLSL ES 3)
            float fade = sandFlat * (1.0 - smoothstep(10.0, 28.0, length(vViewPosition)));
            if (fade > 0.001) {
              vec2 w = vSandPos.xz;
              // Short, wavy ripple strokes in patches (hand-drawn hatching), ~0.6 m apart.
              float wav = sin((w.x * 0.35 + w.y * 0.94) * 10.0 + 2.2 * sin(w.y * 0.6 + w.x * 0.4) + 3.0 * sandNoise(w * 0.8));
              float trough = smoothstep(0.9, 0.99, wav) * smoothstep(0.45, 0.75, sandNoise(w * 0.9 + 3.0));
              float crust = sandNoise(w * 0.45) - 0.5;
              diffuseColor.rgb *= 1.0 - fade * (0.32 * trough - 0.07 * crust);
            }
          }`);
    }
    if (rim > 0 && shader.fragmentShader.includes('vViewPosition')) {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uRimColor;')
        .replace(
          '#include <opaque_fragment>',
          `{ float rimF = 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) );
             outgoingLight += uRimColor * pow( rimF, 3.0 ) * ${rim.toFixed(3)}; }
          #include <opaque_fragment>`,
        );
    }
  };
  mat.customProgramCacheKey = () => `rr-world-${rim.toFixed(3)}-${bend ? 1 : 0}-${rimCol ? rimCol.getHexString() : 'w'}-${opts.sand ? 's' : ''}-${opts.dapple ? 'd' : ''}`;
  return mat;
}

/** Flat-shaded, vertex-colored lit material used by almost everything in the world. */
export function litMaterial(opts: { rim?: number; side?: THREE.Side; bend?: boolean; sand?: boolean; dapple?: boolean; smooth?: boolean } = {}) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: !opts.smooth, side: opts.side ?? THREE.FrontSide });
  return patchWorld(m, { rim: opts.rim ?? 0.0, bend: opts.bend, sand: opts.sand, dapple: opts.dapple });
}

/** Unlit vertex-colored material (emissive look for amber, sky props). */
export function unlitMaterial(opts: { fog?: boolean; bend?: boolean; transparent?: boolean; toneMapped?: boolean } = {}) {
  const m = new THREE.MeshBasicMaterial({ vertexColors: true, fog: opts.fog ?? true, transparent: opts.transparent ?? false });
  m.toneMapped = opts.toneMapped ?? true;
  return patchWorld(m, { bend: opts.bend });
}

/** Graphics version 2+: characters are smooth-shaded (their geometry carries crease-angle normals). Call once,
 * after the look is set and before the first frame. */
export function applyLookMaterials(smooth: boolean) {
  MATS.character.flatShading = !smooth;
  MATS.character.needsUpdate = true;
}

/** Shared material instances (one program each). */
export const MATS = {
  world: litMaterial({ rim: 0.12, sand: true }),
  hazard: litMaterial({ rim: 0.4, dapple: true }),
  /** Organic forest obstacles in graphics version 3: smooth-shaded bark (their geometry carries crease normals). */
  hazardSmooth: litMaterial({ rim: 0.35, dapple: true, smooth: true }),
  character: patchWorld(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide }), { rim: 0.95, rimColor: 0xffd29a, dapple: true }), // warm sun-edge rim
  glow: unlitMaterial({ toneMapped: false }),
  backdrop: unlitMaterial({ fog: false, bend: false }),
  /** The forest's terrain (no sand detail). */
  forest: litMaterial({ rim: 0.1, dapple: true }),
  egg: patchWorld(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: new THREE.Color(0x8a6a34) }), { rim: 0.5 }),
  outline: patchWorld(new THREE.MeshBasicMaterial({ color: new THREE.Color(0x5a2c0c), side: THREE.BackSide, fog: true }), {}),
};
