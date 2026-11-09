import * as THREE from 'three';
import '../ui/theme.css';
import '../ui/styletile.css';
import { Stage, FOG } from '../render/stage';
import { ChunkStreamer } from '../render/world/terrain';
import { CollectibleField } from '../render/world/collectibles';
import { createHazard, type HazardType } from '../render/world/hazards';
import { Particles, SAND, SPARK } from '../render/fx';
import { RaptorView } from '../render/raptor/view';
import { Runner, type RunnerAction } from '../game/runner';
import { GOBI, RAPTOR_GOBI_STREAK } from '../render/palette';
import { Rng } from '../core/rng';
import { damp } from '../core/math';
import { amberIconSVG, eggIconSVG, logoSVG } from '../ui/logo';

type Mode = 'run' | 'hero' | 'title';
const params = new URLSearchParams(location.search);
const SHOT = params.has('shot');

// ---------------- DOM ----------------
const app = document.createElement('div');
app.innerHTML = `
<section class="stage-wrap">
  <div id="stage"></div>
  <div class="vignette"></div>
  <div class="hud">
    <div class="hud-row">
      <div class="tag score"><div><small>Score</small><span id="score">0</span></div></div>
      <div class="right">
        <div class="hud-row" style="gap:8px">
          <div class="tag amber" id="amberTag">${amberIconSVG}<span id="amber">0</span></div>
          <button class="tag pause" aria-label="Pause"><i></i><i></i></button>
        </div>
        <div class="tag combo">×<span id="combo">1</span></div>
        <div class="eggs" id="eggs">${eggIconSVG(false)}${eggIconSVG(false)}${eggIconSVG(false)}</div>
      </div>
    </div>
  </div>
  <div class="title">
    ${logoSVG()}
    <div class="actions">
      <div class="sub">Level 1 · Flaming Cliffs</div>
      <button class="btn-amber" id="play">Run</button>
      <button class="btn-paper">Field Journal</button>
    </div>
  </div>
  <nav class="modes" aria-label="Camera">
    <button data-mode="run" aria-pressed="true">Run</button>
    <button data-mode="hero" aria-pressed="false">Hero</button>
    <button data-mode="title" aria-pressed="false">Title</button>
  </nav>
  <div class="scroll-hint">Style sheet ↓</div>
</section>
<main class="journal paper">
  <header>
    <div class="eyebrow">M0 · Style tile</div>
    ${logoSVG({ glow: false })}
    <p>Level 1 look: the Gobi at golden hour, a feathered Velociraptor, and amber as the signature glow. Everything here is generated in code and rendered live.</p>
  </header>
  <section>
    <h2>What to judge</h2>
    <ul class="notes">
      <li><b>Run view:</b> can you instantly read the raptor, the obstacles and the amber on your phone?</li>
      <li><b>Hero view:</b> does the raptor have appeal, and does the world feel warm and premium?</li>
      <li><b>Title view:</b> do the logo, buttons and type feel like one studio made them?</li>
    </ul>
  </section>
  <section>
    <h2>Flaming Cliffs palette</h2>
    <div class="swatches" id="sw-world"></div>
  </section>
  <section>
    <h2>Velociraptor · "Gobi Streak" plumage</h2>
    <p>A dark streaked back over a pale belly for contrast on sand, a cream streak from cheek to tail, and cool teal accents on the wing and tail tips. The eye is amber.</p>
    <div class="swatches" id="sw-raptor"></div>
  </section>
  <section class="type-sample">
    <h2>Type</h2>
    <div class="big">Race home before the storm.</div>
    <div class="mid">Fraunces · display &amp; logo</div>
    <div class="ui">Nunito Sans for interface text and body copy. Friendly, legible at small sizes, with tabular numerals for the HUD.</div>
    <div class="num">12,480 · ×3</div>
  </section>
  <section>
    <h2>Components</h2>
    <div class="row"><button class="btn-amber">Run</button><button class="btn-paper">Retry</button></div>
    <div class="row"><div class="tag" style="font-size:22px">${amberIconSVG.replace('class="rr-amber-icon"', 'class="rr-amber-icon" style="width:18px;height:24px"')} 248</div><div class="tag combo" style="font-size:18px;background:var(--amber)">×4</div></div>
    <div class="card prerun">
      <div class="eyebrow">Field Journal · Level 1</div>
      <div class="species">Velociraptor</div>
      <div class="latin">Velociraptor mongoliensis · Gobi Desert · ~75 million years ago</div>
      <p class="fact">The first Velociraptor fossil was found at the Flaming Cliffs in 1923. Quill knobs on its forearm bones show it carried wing feathers.</p>
      <ul>
        <li>${starSVG()} Reach the nest before the sandstorm</li>
        <li>${starSVG()} Find all 3 eggs</li>
        <li>${starSVG()} Score 12,000</li>
      </ul>
      <button class="btn-amber" style="width:100%">Run</button>
    </div>
  </section>
</main>`;
document.body.appendChild(app);
// Hosts that already pad the root for safe areas (e.g. the artifact viewer) should not get a second inset.
if (parseFloat(getComputedStyle(document.documentElement).paddingTop) > 0) document.documentElement.classList.add('root-padded');

function starSVG() {
  return `<svg class="star" viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z" fill="none" stroke="#3A2A1E" stroke-width="2.2" stroke-linejoin="round"/></svg>`;
}
function swatches(el: HTMLElement, entries: Array<[string, number]>) {
  el.innerHTML = entries
    .map(([name, hex]) => `<div class="sw"><div style="background:#${hex.toString(16).padStart(6, '0')}"></div><span>${name}<br><code>#${hex.toString(16).padStart(6, '0').toUpperCase()}</code></span></div>`)
    .join('');
}
swatches(document.getElementById('sw-world')!, [
  ['Sky', GOBI.skyZenith], ['Horizon', GOBI.horizon], ['Sand', GOBI.sandLight], ['Dune shade', GOBI.sandShadow], ['Track', GOBI.track],
  ['Cliff red', GOBI.cliffRed], ['Cliff strata', GOBI.cliffPale], ['Hazard rock', GOBI.hazardRock], ['Scrub', GOBI.scrubSage], ['Bone', GOBI.bone],
  ['Amber', GOBI.amberCore], ['Amber light', GOBI.amberLight],
]);
swatches(document.getElementById('sw-raptor')!, [
  ['Body', RAPTOR_GOBI_STREAK.base], ['Bands', RAPTOR_GOBI_STREAK.dark], ['Streak', RAPTOR_GOBI_STREAK.light], ['Belly', RAPTOR_GOBI_STREAK.under],
  ['Teal accent', RAPTOR_GOBI_STREAK.accent], ['Cheek', RAPTOR_GOBI_STREAK.eyePatch], ['Eye', RAPTOR_GOBI_STREAK.eye],
]);

// ---------------- Scene ----------------
const container = document.getElementById('stage')!;
const stage = new Stage(container, { preserveDrawingBuffer: SHOT });
const streamer = new ChunkStreamer(stage.world);
const items = new CollectibleField(400, FOG);
stage.world.add(items.group);
const dust = new Particles(260, THREE.NormalBlending, FOG);
const sparks = new Particles(160, THREE.AdditiveBlending, FOG);
stage.world.add(dust.field.points, sparks.field.points);
const raptor = new RaptorView(RAPTOR_GOBI_STREAK, { blenderBody: params.has('blender') });
stage.world.add(raptor.root);
const runner = new Runner();
runner.speed = 11;
const fxRng = new Rng(99);
const rand = () => fxRng.next();

const resize = () => {
  stage.resize(container.clientWidth, container.clientHeight);
  for (const f of [items.halos, dust.field, sparks.field]) f.setScale(stage.renderer.domElement.height, stage.camera.fov);
};
addEventListener('resize', resize);
resize();

// ---------------- Demo course ----------------
const LOOP = 180;
const START = 26;
type Ev = { d: number; hz?: HazardType; lane?: number; amber?: Array<[number, number, number]>; egg?: [number, number, number] };
const trail = (from: number, to: number, lane: number, step = 2.2, y = 0.75) => {
  const out: Array<[number, number, number]> = [];
  for (let d = from; d <= to; d += step) out.push([d, lane, y]);
  return out;
};
// Amber arc that follows the jump parabola (takeoff at d0).
const arc = (d0: number, lane: number) => {
  const out: Array<[number, number, number]> = [];
  const T = 0.62, H = 1.25, v = runner.speed;
  for (let i = 1; i <= 5; i++) {
    const t = (i / 6) * T;
    const y = (4 * H / T) * t - 0.5 * (8 * H / (T * T)) * t * t;
    out.push([d0 + v * t, lane, 0.75 + y]);
  }
  return out;
};
const COURSE: Ev[] = [
  { d: 0, amber: trail(8, 20, 0) },
  { d: 0, amber: trail(25, 36, 1) },
  { d: 42, hz: 'boulder', lane: 0 },
  { d: 42, hz: 'boulder', lane: -1 },
  { d: 0, amber: trail(52, 57, 0) },
  { d: 64, hz: 'ledgeWide', lane: 0 },
  { d: 0, amber: arc(60.5, 0) },
  { d: 82, hz: 'arch', lane: 0 },
  { d: 0, amber: trail(78.5, 85, 0, 1.6, 0.35) },
  { d: 98, hz: 'boulder', lane: 0 },
  { d: 98, hz: 'boulder', lane: 1 },
  { d: 0, amber: trail(92, 102, -1) },
  { d: 0, egg: [108, -1, 0.85] },
  { d: 120, hz: 'ribArch', lane: 0 },
  { d: 0, amber: trail(116.5, 123, -1, 1.6, 0.35) },
  { d: 134, hz: 'ledge', lane: -1 },
  { d: 0, amber: arc(130.5, -1) },
  { d: 0, amber: trail(144, 154, 0) },
  { d: 162, hz: 'boulder', lane: -1 },
  { d: 162, hz: 'boulder', lane: 1 },
  { d: 0, amber: trail(160, 176, 0) },
];
const ACTIONS: Array<[number, RunnerAction]> = [
  [22, 'right'], [48, 'left'], [60.5, 'jump'], [79, 'slide'], [88, 'left'], [117, 'slide'], [130.5, 'jump'], [140, 'right'],
];
const hazards: THREE.Mesh[] = [];
let spawnedLoops = -1;
function spawnLoop(k: number) {
  const base = START + k * LOOP;
  for (const ev of COURSE) {
    if (ev.hz) {
      const m = createHazard(ev.hz);
      m.position.set((ev.lane ?? 0) * 1.5, 0, -(base + ev.d));
      stage.world.add(m);
      hazards.push(m);
    }
    for (const [d, lane, y] of ev.amber ?? []) items.add('amber', lane * 1.5, y, -(base + d));
    if (ev.egg) items.add('egg', ev.egg[1] * 1.5, ev.egg[2], -(base + ev.egg[0]));
  }
}
let nextAction = 0;
let actionLoop = 0;

// ---------------- State & HUD ----------------
let mode: Mode = (params.get('mode') as Mode) ?? 'run';
let score = 0, amber = 0, eggs = 0, combo = 1, chain = 0;
const $ = (id: string) => document.getElementById(id)!;
const titleEl = document.querySelector('.title') as HTMLElement;
const hudEl = document.querySelector('.hud') as HTMLElement;
function setMode(m: Mode) {
  mode = m;
  document.querySelectorAll<HTMLButtonElement>('.modes button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
  titleEl.classList.toggle('on', m === 'title');
  hudEl.style.opacity = m === 'run' ? '1' : '0';
}
document.querySelectorAll<HTMLButtonElement>('.modes button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode as Mode)));
$('play').addEventListener('click', () => setMode('run'));
setMode(mode);

runner.listener = (e) => {
  const x = runner.x, z = -runner.distance;
  if (e === 'land') dust.emit(x, 0.04, z + 0.1, 10, { spread: 1.4, up: 0.3, back: 2, size: 0.3, grow: 1.8, alpha: 0.35, rand });
  if (e === 'jump') dust.emit(x, 0.04, z + 0.2, 6, { spread: 0.8, up: 0.2, back: 3, size: 0.25, grow: 1.6, alpha: 0.3, rand });
};

let simTime = 0;
let footAcc = 0;
let heroOrbit = 0;
const tmp = new THREE.Vector3();

function step(dt: number) {
  simTime += dt;
  const idle = mode === 'title';
  if (!idle) {
    // Autopilot.
    const loopD = runner.distance - START - actionLoop * LOOP;
    if (nextAction < ACTIONS.length && loopD >= ACTIONS[nextAction][0]) runner.request(ACTIONS[nextAction++][1]);
    if (loopD >= LOOP) { actionLoop++; nextAction = 0; }
    runner.update(dt);
    score += dt * runner.speed;
  }
  const curLoop = Math.floor((runner.distance + 140) / LOOP);
  while (spawnedLoops < curLoop) spawnLoop(++spawnedLoops);
  streamer.update(runner.distance);

  // Collect.
  const rz = -runner.distance;
  for (const it of items.items) {
    if (!it.active || Math.abs(it.z - rz) > 0.9) continue;
    const ry = runner.y + (runner.sliding ? 0.35 : 0.75);
    if (Math.abs(it.x - runner.x) < 0.7 && Math.abs(it.y - ry) < 0.75) {
      it.active = false;
      if (mode === 'run') sparks.emit(it.x, it.y, it.z, it.kind === 'egg' ? 18 : 7, { spread: 0.7, up: 0.9, back: -runner.speed * 0.85, size: 0.13, grow: -0.6, life: 0.28, alpha: 0.85, color: SPARK, rand });
      if (it.kind === 'amber') {
        amber++; chain++; score += 10 * combo;
        if (chain % 25 === 0) combo = Math.min(5, combo + 1);
        bump('amberTag');
      } else {
        eggs = Math.min(3, eggs + 1); score += 500;
        $('eggs').innerHTML = [0, 1, 2].map((i) => eggIconSVG(i < eggs)).join('');
      }
    }
  }
  items.prune(rz + 12);
  for (let i = hazards.length - 1; i >= 0; i--) {
    if (hazards[i].position.z > rz + 12) { stage.world.remove(hazards[i]); hazards.splice(i, 1); }
  }

  // Footfall dust while running on the ground.
  if (!idle && runner.grounded) {
    footAcc += runner.speed * dt;
    if (footAcc > 1.05) {
      footAcc = 0;
      dust.emit(runner.x + (fxRng.next() - 0.5) * 0.2, 0.03, rz + 0.15, runner.sliding ? 5 : 2, { spread: 0.6, up: 0.15, back: 2.5, size: 0.22, grow: 1.6, life: 0.45, alpha: 0.28, rand });
    }
  }
  if (runner.sliding) dust.emit(runner.x, 0.04, rz - 0.2, 1, { spread: 1.2, up: 0.35, back: 1, size: 0.24, grow: 1.6, life: 0.4, alpha: 0.32, color: SAND, rand });

  raptor.sync(runner, dt, idle ? 1 : 0);
  items.hideNear = mode === 'run' ? null : stage.camera.position;
  items.update(simTime);
  dust.update(dt);
  sparks.update(dt);

  // Cameras.
  if (mode === 'run') stage.chase(runner.x, runner.y, rz, dt);
  else if (mode === 'hero') {
    const cam = stage.camera;
    tmp.set(runner.x + 2.3, 0.65, rz - 2.6);
    cam.position.x = damp(cam.position.x, tmp.x, 6, dt);
    cam.position.y = damp(cam.position.y, tmp.y + runner.y * 0.5, 6, dt);
    cam.position.z = rz - 2.6;
    cam.lookAt(runner.x - 0.2, 0.68 + runner.y * 0.7, rz - 0.1);
    stage.follow(runner.x, rz);
  } else {
    heroOrbit += dt * 0.12;
    const a = 0.75 + Math.sin(heroOrbit) * 0.35;
    stage.camera.position.set(runner.x + Math.sin(a) * 3.1, 0.7, rz - Math.cos(a) * 3.1);
    stage.camera.lookAt(runner.x, 0.5, rz);
    stage.follow(runner.x, rz);
  }
}

let shownScore = 0;
function hud() {
  shownScore = Math.round(score);
  $('score').textContent = shownScore.toLocaleString('en-US');
  $('amber').textContent = String(amber);
  $('combo').textContent = String(combo);
}
function bump(id: string) {
  const el = $(id);
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

// Initial world.
spawnLoop(++spawnedLoops);
streamer.prewarm(0);
stage.chase(0, 0, 0, 1 / 60, true);

// Fixed-step loop, paused when the stage is offscreen to save battery.
let visible = true;
new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(container);
const STEP = 1 / 60;
let acc = 0, last = performance.now();
function frame(now: number) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!visible) return;
  acc += dt;
  while (acc >= STEP) { step(STEP); acc -= STEP; }
  hud();
  stage.render();
}

// Test hooks for deterministic screenshots.
declare global { interface Window { __rr?: unknown } }
window.__rr = {
  advance(seconds: number) { const n = Math.round(seconds / STEP); for (let i = 0; i < n; i++) step(STEP); hud(); stage.render(); },
  setMode(m: Mode) { setMode(m); },
  stats() { return { ...streamer.stats(), calls: stage.renderer.info.render.calls, tris: stage.renderer.info.render.triangles }; },
  ready: true,
};
if (!SHOT) requestAnimationFrame(frame);
else { stage.render(); }
