import * as THREE from 'three';
import { buildRaptor } from '../render/raptor/model';
import { velociraptorBody } from '../render/raptor/assets';
import { RaptorAnimator, defaultAnimInput } from '../render/raptor/anim';
import { RAPTOR_GOBI_STREAK, GOBI } from '../render/palette';

// Asset lab: ?pose=run|idle|slide|air|land&t=0.3&view=side|back|front|three&speed=12
const q = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(GOBI.horizon);
scene.add(new THREE.HemisphereLight(GOBI.hemiSky, GOBI.hemiGround, 2.6));
const sun = new THREE.DirectionalLight(GOBI.keyLight, 2.9);
sun.position.set(3, 2.2, -2.5);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 0.1, far: 10 });
scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshLambertMaterial({ color: GOBI.track }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const { mesh, bones } = buildRaptor(RAPTOR_GOBI_STREAK, q.get('body') === 'blender' ? { body: velociraptorBody() } : {});
scene.add(mesh);
const anim = new RaptorAnimator(bones);
const inp = defaultAnimInput();
const pose = q.get('pose') ?? 'run';
inp.speed = Number(q.get('speed') ?? 12);
if (pose === 'idle') inp.idle = 1;
if (pose === 'slide') inp.slide = 1;
if (pose === 'air') { inp.air = 1; inp.vy = Number(q.get('vy') ?? 3); }
if (pose === 'land') inp.land = 1;
if (pose === 'lean') inp.lean = 1;
const tAdvance = Number(q.get('t') ?? 0.3);
// Advance the animation deterministically.
const steps = Math.round(tAdvance * 60);
for (let i = 0; i < Math.max(steps, 1); i++) anim.update(1 / 60, inp);

const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.05, 50);
const view = q.get('view') ?? 'three';
const views: Record<string, [number[], number[]]> = {
  side: [[4.2, 0.6, -0.05], [0, 0.55, -0.05]],
  back: [[0, 1.6, 4.0], [0, 0.6, -0.2]],
  front: [[0.4, 0.9, -4.2], [0, 0.65, -0.2]],
  three: [[2.8, 1.4, -2.8], [0, 0.55, -0.1]],
  head: [[0.9, 1.05, -1.6], [0, 0.95, -0.8]],
  top: [[0, 4.5, 0.01], [0, 0, 0]],
};
const [cp, ct] = views[view] ?? views.three;
camera.position.set(cp[0], cp[1], cp[2]);
camera.lookAt(ct[0], ct[1], ct[2]);
renderer.render(scene, camera);
(window as unknown as { __ready: boolean }).__ready = true;
