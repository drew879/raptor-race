import * as THREE from 'three';
import { GOBI, col } from './palette';
import { createBackdrop, createSky } from './sky';
import { CONFIG } from '../game/config';
import { damp } from '../core/math';

export const SUN_DIR = new THREE.Vector3(0.76, 0.52, 0.44).normalize();
export const FOG = { near: 42, far: 235 };

/** Renderer, scene, lights, sky and the chase camera. */
export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly world = new THREE.Group();
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  /** Direction toward the sun; looks may change it (call syncSun after). */
  readonly sunDir = SUN_DIR.clone();
  readonly sky: THREE.Mesh;
  readonly backdrop: THREE.Mesh;
  private camX = 0;
  baseFov: number = CONFIG.camera.fov;
  private camY = 0;
  onResize: (w: number, h: number) => void = () => {};

  constructor(container: HTMLElement, opts: { preserveDrawingBuffer?: boolean } = {}) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: opts.preserveDrawingBuffer ?? false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap; // PCFSoft was removed in this three.js; PCF + radius softens edges
    container.appendChild(this.renderer.domElement);

    this.scene.fog = new THREE.Fog(col(GOBI.horizon), FOG.near, FOG.far);
    this.hemi = new THREE.HemisphereLight(GOBI.hemiSky, GOBI.hemiGround, 2.6);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(GOBI.keyLight, 2.9);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -7; sc.right = 7; sc.top = 13; sc.bottom = -11; sc.near = 1; sc.far = 90;
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.02;
    this.sun.shadow.radius = 2.5;
    this.scene.add(this.sun, this.sun.target);

    this.camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1, 0.1, 900);
    this.sky = createSky(SUN_DIR);
    this.backdrop = createBackdrop();
    this.scene.add(this.sky, this.backdrop, this.world);
    this.resize(container.clientWidth, container.clientHeight);
  }

  resize(w: number, h: number) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Keep the three lanes framed in tall portrait screens by widening the vertical FOV.
    this.camera.fov = this.baseFov = CONFIG.camera.fov + Math.max(0, 0.55 - w / h) * 20;
    this.camera.updateProjectionMatrix();
    this.onResize(this.renderer.domElement.height, this.camera.fov);
  }

  /** Chase camera behind the runner. */
  chase(x: number, y: number, z: number, dt: number, snap = false) {
    const c = CONFIG.camera;
    const tx = x * c.laneFollow;
    this.camX = snap ? tx : damp(this.camX, tx, 9, dt);
    this.camY = snap ? y : damp(this.camY, y, 6, dt);
    this.camera.position.set(this.camX, c.height + this.camY * 0.45, z + c.back);
    this.camera.lookAt(this.camX * 0.85, c.lookHeight + this.camY * 0.5, z - c.lookAhead);
    this.follow(this.camX, z);
  }

  /** Keep sun shadow box, sky and backdrop centered on the action. */
  follow(x: number, z: number) {
    const focus = new THREE.Vector3(x, 0, z - 8);
    this.sun.target.position.copy(focus);
    this.sun.position.copy(focus).addScaledVector(this.sunDir, 40);
    this.sky.position.set(this.camera.position.x, 0, this.camera.position.z);
    this.backdrop.position.set(this.camera.position.x, 0, this.camera.position.z);
  }

  syncSun() {
    ((this.sky.material as THREE.ShaderMaterial).uniforms.sunDir.value as THREE.Vector3).copy(this.sunDir);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
