import * as THREE from 'three';
import { GOBI } from './palette';

/**
 * Shared uniforms for the whole world. The curved-world bend is applied to gl_Position only,
 * so lighting, fog and shadows stay computed in unbent space (consistent and cheap).
 */
export const worldUniforms = {
  uCurve: { value: 0.0007 },
  /** Lateral bend (track curves): + bends the world to the right with distance. Animated per frame. */
  uBend: { value: 0 },
  uRimColor: { value: new THREE.Color(GOBI.sunGlow) },
  /** Visual downhill, as a hill profile along the course: flat until `uSlopeFrom` (the crest), then dropping
   * `uSlope` meters per meter until it levels out at `uSlopeTo` (the bottom), with soft bends at both ends. The
   * drop is applied to screen positions relative to the camera, so the trail falls away while trees stay upright.
   * 0 on level ground. */
  uSlope: { value: 0 },
  uSlopeFrom: { value: 0 },
  uSlopeTo: { value: 1e6 },
};

/** The hill profile's height at course distance d (matches the shader). */
const softplus = (x: number) => Math.max(x, 0) + 8 * Math.log(1 + Math.exp(-Math.abs(x) / 8));
export const hillHeight = (d: number) => -worldUniforms.uSlope.value * (softplus(d - worldUniforms.uSlopeFrom.value) - softplus(d - worldUniforms.uSlopeTo.value));
/** The hill's local grade at course distance d (0 on the flats). */
export const hillGrade = (d: number) => {
  const sig = (x: number) => 1 / (1 + Math.exp(-x / 8));
  return worldUniforms.uSlope.value * (sig(d - worldUniforms.uSlopeFrom.value) - sig(d - worldUniforms.uSlopeTo.value));
};

/** Bends grow with distance squared, softening past this many meters so the far terrain never swings off its edge. */
export const BEND_KNEE = 90;

export const rimColors: Record<string, THREE.Color> = {};
type Patchable = THREE.MeshLambertMaterial | THREE.MeshBasicMaterial | THREE.PointsMaterial;

export function patchWorld<T extends Patchable>(mat: T, opts: { rim?: number; bend?: boolean; rimColor?: number; sand?: boolean } = {}): T {
  const rim = opts.rim ?? 0;
  const rimCol = opts.rimColor !== undefined ? new THREE.Color(opts.rimColor) : null;
  const bend = opts.bend ?? true;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uCurve = worldUniforms.uCurve;
    shader.uniforms.uBend = worldUniforms.uBend;
    shader.uniforms.uSlope = worldUniforms.uSlope;
    shader.uniforms.uSlopeFrom = worldUniforms.uSlopeFrom;
    shader.uniforms.uSlopeTo = worldUniforms.uSlopeTo;
    shader.uniforms.uRimColor = rimCol ? { value: rimCol } : worldUniforms.uRimColor;
    if (bend) {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
          uniform float uCurve, uBend, uSlope, uSlopeFrom, uSlopeTo;
          float rrSoftplus(float x) { return max(x, 0.0) + 8.0 * log(1.0 + exp(-abs(x) / 8.0)); }
          float rrHill(float d) { return -uSlope * (rrSoftplus(d - uSlopeFrom) - rrSoftplus(d - uSlopeTo)); }`)
        .replace(
          '#include <project_vertex>',
          `#include <project_vertex>
          { vec4 bentPos = mvPosition; float zz = bentPos.z * bentPos.z; bentPos.y -= uCurve * zz;
            if (uSlope != 0.0) {
              // The hill's height here relative to the camera's, applied along world up in view space.
              vec3 wpos = transpose(mat3(viewMatrix)) * (mvPosition.xyz - viewMatrix[3].xyz);
              bentPos.xyz += (viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz * (rrHill(-wpos.z) - rrHill(-cameraPosition.z));
            }
            bentPos.x += uBend * zz / (1.0 + abs(bentPos.z) / ${BEND_KNEE.toFixed(1)}); gl_Position = projectionMatrix * bentPos; }`,
        );
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
  mat.customProgramCacheKey = () => `rr-world-${rim.toFixed(3)}-${bend ? 1 : 0}-${rimCol ? rimCol.getHexString() : 'w'}-${opts.sand ? 's' : ''}`;
  return mat;
}

/** Flat-shaded, vertex-colored lit material used by almost everything in the world. */
export function litMaterial(opts: { rim?: number; side?: THREE.Side; bend?: boolean; sand?: boolean } = {}) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: opts.side ?? THREE.FrontSide });
  return patchWorld(m, { rim: opts.rim ?? 0.0, bend: opts.bend, sand: opts.sand });
}

/** Unlit vertex-colored material (emissive look for amber, sky props). */
export function unlitMaterial(opts: { fog?: boolean; bend?: boolean; transparent?: boolean; toneMapped?: boolean } = {}) {
  const m = new THREE.MeshBasicMaterial({ vertexColors: true, fog: opts.fog ?? true, transparent: opts.transparent ?? false });
  m.toneMapped = opts.toneMapped ?? true;
  return patchWorld(m, { bend: opts.bend });
}

/** Shared material instances (one program each). */
export const MATS = {
  world: litMaterial({ rim: 0.12, sand: true }),
  hazard: litMaterial({ rim: 0.4 }),
  character: patchWorld(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide }), { rim: 0.95, rimColor: 0xffd29a }), // warm sun-edge rim
  glow: unlitMaterial({ toneMapped: false }),
  backdrop: unlitMaterial({ fog: false, bend: false }),
  /** The forest's terrain (no sand detail). */
  forest: litMaterial({ rim: 0.1 }),
  egg: patchWorld(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: new THREE.Color(0x8a6a34) }), { rim: 0.5 }),
  outline: patchWorld(new THREE.MeshBasicMaterial({ color: new THREE.Color(0x5a2c0c), side: THREE.BackSide, fog: true }), {}),
};
