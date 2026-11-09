import * as THREE from 'three';
import { buildRaptor } from '../render/raptor/model';
import { velociraptorBody } from '../render/raptor/assets';
import { RaptorAnimator, defaultAnimInput } from '../render/raptor/anim';
import { RAPTOR_GOBI_STREAK, GOBI } from '../render/palette';
import { Protoceratops, type ProtoPose } from '../render/prey/protoceratops';
import { CONFIG } from '../game/config';

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

// ?subject=proto&pose=run|graze|alert|pinned shows the prey; ?subject=pin shows the finale pair.
const subject = q.get('subject') ?? 'raptor';
const { mesh, bones } = buildRaptor(RAPTOR_GOBI_STREAK, q.get('body') === 'blender' ? { body: velociraptorBody() } : {});
if (subject !== 'proto') scene.add(mesh);
if (subject === 'pin') mesh.position.set(0, CONFIG.hunt.pinHeight, CONFIG.hunt.pinOffset);
if (subject === 'proto' || subject === 'pin') {
  const proto = new Protoceratops();
  proto.pose = subject === 'pin' ? 'pinned' : ((q.get('pose') ?? 'run') as ProtoPose);
  for (let i = 0; i < Math.max(1, Math.round(Number(q.get('t') ?? 0.3) * 60)); i++) proto.update(1 / 60, proto.pose === 'run' ? Number(q.get('speed') ?? 12) : 0, 0, 0);
  scene.add(proto.root);
}
const anim = new RaptorAnimator(bones);
const inp = defaultAnimInput();
const pose = q.get('pose') ?? 'run';
inp.speed = Number(q.get('speed') ?? 12);
if (pose === 'idle') inp.idle = 1;
if (pose === 'slide') inp.slide = 1;
if (pose === 'air') { inp.air = 1; inp.vy = Number(q.get('vy') ?? 3); }
if (pose === 'land') inp.land = 1;
if (pose === 'lean') inp.lean = 1;
if (subject === 'pin') { inp.pin = 1; inp.speed = 0; }
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
  front3: [[1.9, 1.1, -3.3], [0, 0.6, -0.35]],
  pinview: [[CONFIG.endingCam.side, CONFIG.endingCam.height, -CONFIG.endingCam.ahead], [0, CONFIG.endingCam.lookHeight, CONFIG.endingCam.lookBack]],
};
const [cp, ct] = views[view] ?? views.three;
camera.position.set(cp[0], cp[1], cp[2]);
camera.lookAt(ct[0], ct[1], ct[2]);
renderer.render(scene, camera);
(window as unknown as { __ready: boolean }).__ready = true;
