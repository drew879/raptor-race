import * as THREE from 'three';
import { GOBI } from './palette';

/**
 * Shared uniforms for the whole world. The curved-world bend is applied to gl_Position only,
 * so lighting, fog and shadows stay computed in unbent space (consistent and cheap).
 */
export const worldUniforms = {
  uCurve: { value: 0.0007 },
  uRimColor: { value: new THREE.Color(GOBI.sunGlow) },
};

export const rimColors: Record<string, THREE.Color> = {};
type Patchable = THREE.MeshLambertMaterial | THREE.MeshBasicMaterial | THREE.PointsMaterial;

export function patchWorld<T extends Patchable>(mat: T, opts: { rim?: number; bend?: boolean; rimColor?: number } = {}): T {
  const rim = opts.rim ?? 0;
  const rimCol = opts.rimColor !== undefined ? new THREE.Color(opts.rimColor) : null;
  const bend = opts.bend ?? true;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uCurve = worldUniforms.uCurve;
    shader.uniforms.uRimColor = rimCol ? { value: rimCol } : worldUniforms.uRimColor;
    if (bend) {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uCurve;')
        .replace(
          '#include <project_vertex>',
          `#include <project_vertex>
          { vec4 bentPos = mvPosition; bentPos.y -= uCurve * bentPos.z * bentPos.z; gl_Position = projectionMatrix * bentPos; }`,
        );
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
  mat.customProgramCacheKey = () => `rr-world-${rim.toFixed(3)}-${bend ? 1 : 0}-${rimCol ? rimCol.getHexString() : 'w'}`;
  return mat;
}

/** Flat-shaded, vertex-colored lit material used by almost everything in the world. */
export function litMaterial(opts: { rim?: number; side?: THREE.Side; bend?: boolean } = {}) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: opts.side ?? THREE.FrontSide });
  return patchWorld(m, { rim: opts.rim ?? 0.0, bend: opts.bend });
}

/** Unlit vertex-colored material (emissive look for amber, sky props). */
export function unlitMaterial(opts: { fog?: boolean; bend?: boolean; transparent?: boolean; toneMapped?: boolean } = {}) {
  const m = new THREE.MeshBasicMaterial({ vertexColors: true, fog: opts.fog ?? true, transparent: opts.transparent ?? false });
  m.toneMapped = opts.toneMapped ?? true;
  return patchWorld(m, { bend: opts.bend });
}

/** Shared material instances (one program each). */
export const MATS = {
  world: litMaterial({ rim: 0.12 }),
  hazard: litMaterial({ rim: 0.28 }),
  character: patchWorld(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide }), { rim: 0.7, rimColor: 0xcfe3ff }),
  glow: unlitMaterial({ toneMapped: false }),
  backdrop: unlitMaterial({ fog: false, bend: false }),
  egg: patchWorld(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: new THREE.Color(0x8a6a34) }), { rim: 0.5 }),
  outline: patchWorld(new THREE.MeshBasicMaterial({ color: new THREE.Color(0x5a2c0c), side: THREE.BackSide, fog: true }), {}),
};
