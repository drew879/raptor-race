import * as THREE from 'three';
import '../ui/theme.css';
import '../ui/game.css';
import { Stage, FOG } from '../render/stage';
import { LookPipeline } from '../render/post/looks';
import { ChunkStreamer } from '../render/world/terrain';
import { CollectibleField, type Collectible } from '../render/world/collectibles';
import { createHazard } from '../render/world/hazards';
import { PowerupView, buildNest } from '../render/world/powerups';
import { Particles, SAND, SPARK } from '../render/fx';
import { RaptorView } from '../render/raptor/view';
import { GOBI, RAPTOR_GOBI_STREAK, col, mix } from '../render/palette';
import { Session, type GameEvent } from '../game/session';
import { CONFIG } from '../game/config';
import { LEVEL1 } from '../game/level1';
import { Input } from '../core/input';
import { AudioEngine } from '../audio/sfx';
import { loadSave, writeSave } from '../game/save';
import { Bot, PERFECT } from '../game/bot';
import { Rng } from '../core/rng';
import { clamp, damp, lerp } from '../core/math';
import { amberIconSVG, eggIconSVG, logoSVG } from '../ui/logo';
import type { RunnerAction } from '../game/runner';
import type { HintKind } from '../game/level';

type AppState = 'title' | 'prerun' | 'playing' | 'paused' | 'caught' | 'finishing' | 'results';
const params = new URLSearchParams(location.search);
const SHOT = params.has('shot');
let DEBUG = params.has('debug');
const LEVEL = LEVEL1;

const star = (filled: boolean, pop = false, delay = 0) =>
  `<svg class="star ${pop ? 'star-pop' : ''}" style="animation-delay:${delay}ms" viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z" fill="${filled ? '#FFB21E' : 'none'}" stroke="#3A2A1E" stroke-width="2.2" stroke-linejoin="round"/></svg>`;

// ---------------- DOM ----------------
const root = document.createElement('div');
root.id = 'game';
root.innerHTML = `
<div id="stage"></div>
<div class="vignette"></div>
<div class="speed" id="speed"></div>
<div class="storm" id="storm"><div class="streaks"></div></div>
<div class="flash" id="flash"></div>
<div class="hud" id="hud" hidden>
  <div class="hud-row">
    <div class="tag score"><div><small>Score</small><span id="score">0</span></div></div>
    <div class="progress" aria-hidden="true"><div class="line"></div><div class="done" id="pdone"></div>
      ${LEVEL.checkpoints.map((c) => `<div class="cp" style="left:calc(${((c / LEVEL.length) * 100).toFixed(1)}% - 10px)"></div>`).join('')}
      <div class="nest"></div><div class="me" id="pme"></div></div>
    <div class="right">
      <div class="hud-row" style="gap:7px">
        <div class="tag amber" id="amberTag">${amberIconSVG}<span id="amber">0</span></div>
        <button class="tag pause" id="btnPause" aria-label="Pause"><i></i><i></i></button>
      </div>
      <div class="tag combo" id="comboTag">×<span id="combo">1</span></div>
      <div class="eggs" id="eggs"></div>
      <div class="tag power" id="power" hidden></div>
    </div>
  </div>
</div>
<div class="hint" id="hint" hidden><span class="glyph" id="hintGlyph"></span><span id="hintText"></span></div>
<div class="floats" id="floats"></div>

<section class="screen title" id="scrTitle">
  ${logoSVG()}
  <div class="actions">
    <div class="sub">Level 1 · Flaming Cliffs</div>
    <button class="btn-amber" id="btnRun">Run</button>
    <div class="row">
      <button class="btn-paper" id="btnJournal">Field Journal</button>
      <button class="btn-paper icon-btn" id="btnSound" aria-label="Sound">♪</button>
    </div>
    <div class="best" id="best" hidden></div>
  </div>
</section>

<section class="screen sheet" id="scrPrerun" hidden>
  <div class="card">
    <div class="eyebrow">Field Journal · Level 1</div>
    <div class="species">Velociraptor</div>
    <div class="latin">Velociraptor mongoliensis · Gobi Desert · ~75 million years ago</div>
    <p class="fact">The first Velociraptor fossil was found here, at the Flaming Cliffs, in 1923. Quill knobs on its forearm bones show it carried wing feathers.</p>
    <ul id="objectives"></ul>
    <div class="buttons"><button class="btn-amber" id="btnGo">Run</button><button class="btn-paper" id="btnBack">Back</button></div>
  </div>
</section>

<section class="screen modal" id="scrPause" hidden>
  <div class="card">
    <div class="eyebrow">Paused</div>
    <h2>Catch your breath</h2>
    <div class="buttons">
      <button class="btn-amber" id="btnResume">Resume</button>
      <button class="btn-paper" id="btnRestart">Restart level</button>
      <button class="btn-paper" id="btnSound2">Sound: on</button>
      <button class="btn-paper" id="btnFps">Frame rate: hidden</button>
      <button class="btn-paper" id="btnQuit">Quit to title</button>
    </div>
  </div>
</section>

<section class="screen modal" id="scrCaught" hidden>
  <div class="card">
    <div class="eyebrow" id="caughtEyebrow">The sandstorm caught you</div>
    <h2 id="caughtTitle">Buried in sand</h2>
    <p class="fact" id="caughtFact">Many Gobi fossils were preserved when dunes collapsed on them. Let's not become one.</p>
    <div class="buttons">
      <button class="btn-amber" id="btnRevive">Shake it off</button>
      <button class="btn-paper" id="btnCheckpoint">Back to checkpoint</button>
      <button class="btn-paper" id="btnQuit2">Quit to title</button>
    </div>
  </div>
</section>

<section class="screen modal results" id="scrResults" hidden>
  <div class="card">
    <div class="eyebrow">Flaming Cliffs · Complete</div>
    <h2>Home safe!</h2>
    <div class="big-score" id="rScore">0</div>
    <div class="stats"><div class="tag" style="font-size:18px">${amberIconSVG.replace('class="rr-amber-icon"', 'class="rr-amber-icon" style="width:15px;height:20px"')} <span id="rAmber">0</span></div><div class="eggrow" id="rEggs"></div><span class="newbest" id="rBest" hidden>New best</span></div>
    <ul id="rStars"></ul>
    <div class="perf" id="rPerf"></div>
    <div class="buttons"><button class="btn-amber" id="btnAgain">Run again</button><button class="btn-paper" id="btnTitle">Title</button></div>
  </div>
</section>
<div class="debug" id="debug" hidden></div>
`;
document.body.appendChild(root);
if (parseFloat(getComputedStyle(document.documentElement).paddingTop) > 0) document.documentElement.classList.add('root-padded');
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

// ---------------- Save & audio ----------------
const save = loadSave();
const audio = new AudioEngine();
audio.setMuted(!save.sound);
const syncSoundLabels = () => {
  $('btnSound').textContent = save.sound ? '♪' : '×';
  $('btnSound').setAttribute('aria-label', save.sound ? 'Sound on' : 'Sound off');
  $('btnSound2').textContent = `Sound: ${save.sound ? 'on' : 'off'}`;
};
const toggleSound = () => { save.sound = !save.sound; audio.setMuted(!save.sound); writeSave(save); syncSoundLabels(); };
syncSoundLabels();
root.addEventListener('pointerdown', () => audio.unlock(), { capture: true });
const haptic = (ms: number) => { try { navigator.vibrate?.(ms); } catch { /* unsupported */ } };

// ---------------- Scene ----------------
const container = $('stage');
const stage = new Stage(container, { preserveDrawingBuffer: SHOT });
const streamer = new ChunkStreamer(stage.world);
const items = new CollectibleField(400, FOG);
const powerups = new PowerupView();
const dust = new Particles(260, THREE.NormalBlending, FOG);
const sparks = new Particles(200, THREE.AdditiveBlending, FOG);
const raptor = new RaptorView(RAPTOR_GOBI_STREAK);
const nest = buildNest();
nest.position.set(0, 0, -(LEVEL.length + 9.6));
stage.world.add(items.group, powerups.group, dust.field.points, sparks.field.points, raptor.root, nest);
const fxRng = new Rng(7);
const rand = () => fxRng.next();
// The owner-chosen hybrid look: field-journal ink and wash on a bold graphic value plan (one post pass).
const look = new LookPipeline(stage.renderer, stage.scene, stage.camera, 'game');
const draw = () => look.render();
const resize = () => {
  stage.resize(container.clientWidth, container.clientHeight);
  look.setSize(container.clientWidth, container.clientHeight, stage.renderer.getPixelRatio());
  for (const f of [items.halos, dust.field, sparks.field]) f.setScale(stage.renderer.domElement.height, stage.camera.fov);
};
addEventListener('resize', resize);
resize();

const fogColor = col(GOBI.horizon);
const stormFog = mix(GOBI.horizon, GOBI.sandMid, 0.55);

// ---------------- Session ----------------
let session = new Session(LEVEL);
let app: AppState = 'title';
let bot: Bot | null = params.has('autoplay') ? new Bot(session, PERFECT) : null;
const hazardMeshes = new Map<number, THREE.Mesh>();
const pickupViews = new Map<number, Collectible>();
let camBlend = 0; // 0 = menu camera, 1 = chase camera
let shake = 0;
let titleOrbit = 0;
let hintTimer = 0;

function resetWorld() {
  for (const m of hazardMeshes.values()) stage.world.remove(m);
  hazardMeshes.clear();
  pickupViews.clear();
  items.items = [];
  streamer.prewarm(session.distance);
}

function newSession() {
  session = new Session(LEVEL);
  if (bot) bot = new Bot(session, PERFECT);
  resetWorld();
  renderEggs();
}

function show(id: string, on: boolean) { $(id).hidden = !on; }
function setApp(s: AppState) {
  app = s;
  show('scrTitle', s === 'title');
  show('scrPrerun', s === 'prerun');
  show('scrPause', s === 'paused');
  show('scrCaught', s === 'caught');
  show('scrResults', s === 'results');
  show('hud', s === 'playing' || s === 'paused' || s === 'caught' || s === 'finishing');
  input.enabled = s === 'playing';
  if (s !== 'playing') $('hint').hidden = true;
}

function renderObjectives() {
  const st = save.stars[LEVEL.id] ?? [false, false, false];
  const labels = ['Reach the nest before the sandstorm', 'Find all 3 eggs', `Score ${LEVEL.parScore.toLocaleString('en-US')}`];
  $('objectives').innerHTML = labels.map((l, i) => `<li>${star(st[i])} ${l}</li>`).join('');
  const best = save.best[LEVEL.id];
  $('best').hidden = !best;
  if (best) $('best').textContent = `Best ${best.toLocaleString('en-US')} · ${st.filter(Boolean).length}/3 stars`;
}
function renderEggs() {
  $('eggs').innerHTML = session.eggs.map((e) => eggIconSVG(e)).join('');
}

// ---------------- Input ----------------
const input = new Input(root, (a: RunnerAction) => { if (app === 'playing') session.input(a); });
input.enabled = false;

$('btnRun').addEventListener('click', () => { renderObjectives(); setApp('prerun'); });
$('btnJournal').addEventListener('click', () => { renderObjectives(); setApp('prerun'); });
$('btnBack').addEventListener('click', () => setApp('title'));
$('btnGo').addEventListener('click', startRun);
$('btnSound').addEventListener('click', toggleSound);
$('btnSound2').addEventListener('click', toggleSound);
$('btnFps').addEventListener('click', () => {
  DEBUG = !DEBUG;
  $('debug').hidden = !DEBUG;
  $('btnFps').textContent = `Frame rate: ${DEBUG ? 'shown' : 'hidden'}`;
});
if (DEBUG) $('debug').hidden = false;
$('btnPause').addEventListener('click', () => { if (app === 'playing') setApp('paused'); });
$('btnResume').addEventListener('click', () => setApp('playing'));
$('btnRestart').addEventListener('click', () => { newSession(); startRun(); });
$('btnQuit').addEventListener('click', toTitle);
$('btnQuit2').addEventListener('click', toTitle);
$('btnRevive').addEventListener('click', () => { if (session.revive()) { setApp('playing'); floatText('Back on your feet', 'banner', 40); } });
$('btnCheckpoint').addEventListener('click', () => { session.restartFromCheckpoint(); resetWorld(); setApp('playing'); });
$('btnAgain').addEventListener('click', () => { newSession(); startRun(); });
$('btnTitle').addEventListener('click', toTitle);
document.addEventListener('visibilitychange', () => { if (document.hidden && app === 'playing') setApp('paused'); });

function startRun() {
  if (session.state !== 'ready') newSession();
  while (!pregenerate(1000)) { /* finish any terrain not built yet */ }
  hitches.length = 0;
  session.start();
  save.runs++;
  writeSave(save);
  setApp('playing');
}
function toTitle() {
  newSession();
  camBlend = 0;
  renderObjectives();
  setApp('title');
}

// ---------------- Feedback ----------------
const HINTS: Record<HintKind, [string, string, string, string]> = {
  lanes: ['⇆', 'Swipe left or right to change lanes', '8px', '0'],
  jump: ['↑', 'Swipe up to jump the ledges', '0', '-6px'],
  slide: ['↓', 'Swipe down to slide under arches and bones', '0', '6px'],
  magnet: ['◈', 'Amber Sense pulls nearby amber to you', '0', '0'],
  updraft: ['≋', 'Grab the updraft to glide over the boulders. Steer left and right while you fly', '0', '-6px'],
};
function showHint(h: HintKind) {
  const [g, t, nx, ny] = HINTS[h];
  $('hintGlyph').textContent = g;
  $('hintGlyph').style.setProperty('--nx', nx);
  $('hintGlyph').style.setProperty('--ny', ny);
  $('hintText').textContent = t;
  const el = $('hint');
  el.hidden = false;
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
  hintTimer = 3.2;
}
function floatText(text: string, kind: 'big' | 'small' | 'banner', topPct: number) {
  const el = document.createElement('div');
  el.className = `float ${kind}`;
  el.textContent = text;
  el.style.top = `${topPct}%`;
  $('floats').appendChild(el);
  setTimeout(() => el.remove(), kind === 'banner' ? 1900 : 1100);
}
function bump(id: string) {
  const el = $(id);
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

function handle(e: GameEvent) {
  const r = session.runner;
  const z = -r.distance;
  switch (e.t) {
    case 'move':
      if (e.e === 'lane') audio.play('lane', { dir: e.dir });
      else if (e.e === 'jump') { audio.play('jump'); dust.emit(r.x, 0.04, z + 0.2, 6, { spread: 0.8, up: 0.2, back: 3, size: 0.25, grow: 1.6, alpha: 0.3, rand }); }
      else if (e.e === 'land') { audio.play('land'); shake = Math.max(shake, 0.05); dust.emit(r.x, 0.04, z + 0.1, 10, { spread: 1.4, up: 0.3, back: 2, size: 0.3, grow: 1.8, alpha: 0.35, rand }); }
      else if (e.e === 'slide') audio.play('slide');
      else if (e.e === 'fastfall') audio.play('lane', { dir: 0 });
      else if (e.e === 'glide') audio.play('powerup');
      break;
    case 'amber':
      audio.play('amber');
      bump('amberTag');
      sparks.emit(e.x, e.y, -e.d, 7, { spread: 0.7, up: 0.9, back: -r.speed * 0.85, size: 0.13, grow: -0.6, life: 0.28, alpha: 0.85, color: SPARK, rand });
      break;
    case 'egg':
      audio.play('egg');
      haptic(20);
      renderEggs();
      floatText('Egg found!', 'banner', 30);
      sparks.emit(e.x, e.y, -e.d, 22, { spread: 1, up: 1.2, back: -r.speed * 0.85, size: 0.16, grow: -0.5, life: 0.5, alpha: 0.9, color: SPARK, rand });
      break;
    case 'power':
      audio.play('powerup');
      floatText(e.kind === 'updraft' ? 'Updraft!' : 'Amber Sense', 'banner', 30);
      break;
    case 'combo':
      floatText(`×${e.combo}`, 'big', 34);
      audio.play('checkpoint');
      bump('comboTag');
      break;
    case 'clear':
      floatText(`+${e.bonus}`, 'small', 44);
      break;
    case 'stumble':
      audio.play('stumble');
      haptic(30);
      shake = Math.max(shake, 0.45);
      flash();
      floatText('Stumbled! The storm is closing in', 'banner', 30);
      break;
    case 'crash': {
      audio.play('stumble');
      haptic(60);
      shake = Math.max(shake, 0.6);
      flash();
      const copy = CRASH_COPY[e.cause];
      $('caughtEyebrow').textContent = copy[0];
      $('caughtTitle').textContent = copy[1];
      $('caughtFact').textContent = copy[2];
      setTimeout(() => {
        if (session.state !== 'caught') return;
        $('btnRevive').hidden = session.reviveUsed;
        $('btnCheckpoint').textContent = session.checkpoint >= 0 ? 'Back to checkpoint' : 'Restart';
        setApp('caught');
      }, 650);
      break;
    }
    case 'checkpoint':
      audio.play('checkpoint');
      floatText('Checkpoint', 'banner', 30);
      break;
    case 'hint':
      showHint(e.hint);
      break;
    case 'finish':
      audio.play('finish');
      setApp('finishing');
      setTimeout(showResults, 1700);
      break;
  }
}

function flash() {
  const el = $('flash');
  el.classList.remove('on');
  void el.offsetWidth;
  el.classList.add('on');
}
const CRASH_COPY: Record<string, [string, string, string]> = {
  boulder: ['Ouch', 'Ran into a boulder', 'Boulders can\'t be jumped. Swipe left or right to go around them.'],
  ledge: ['Ouch', 'Tripped on a ledge', 'Swipe up to jump low rock ledges.'],
  ledgeWide: ['Ouch', 'Tripped on a ledge', 'Swipe up to jump low rock ledges.'],
  arch: ['Ouch', 'Hit the arch', 'Swipe down to slide under arches.'],
  ribArch: ['Ouch', 'Hit the fallen bone', 'Swipe down to slide under giant bones.'],
  storm: ['Two stumbles in a row', 'The sandstorm caught you', 'After a stumble, run clean for a few seconds and the storm falls back.'],
};

function showResults() {
  const st = session.stars;
  const prevStars = save.stars[LEVEL.id] ?? [false, false, false];
  save.stars[LEVEL.id] = prevStars.map((v, i) => v || st[i]);
  const prevEggs = save.eggs[LEVEL.id] ?? [false, false, false];
  save.eggs[LEVEL.id] = prevEggs.map((v, i) => v || session.eggs[i]);
  const score = Math.round(session.score);
  const isBest = score > (save.best[LEVEL.id] ?? 0);
  if (isBest) save.best[LEVEL.id] = score;
  save.amberBank += session.amber;
  writeSave(save);
  $('rAmber').textContent = String(session.amber);
  $('rEggs').innerHTML = session.eggs.map((e) => eggIconSVG(e)).join('');
  $('rBest').hidden = !isBest;
  const labels = ['Reached the nest', `Eggs found: ${session.eggs.filter(Boolean).length} of 3`, `Score ${LEVEL.parScore.toLocaleString('en-US')}`];
  $('rStars').innerHTML = labels.map((l, i) => `<li>${star(st[i], st[i], 300 + i * 220)} ${l}</li>`).join('');
  $('rPerf').textContent = hitches.length ? `Smoothness: ${hitches.length} hitch${hitches.length > 1 ? 'es' : ''}, worst ${Math.max(...hitches)} ms` : 'Smoothness: no hitches';
  setApp('results');
  const t0 = performance.now();
  const tick = (now: number) => {
    const k = Math.min(1, (now - t0) / 1100);
    $('rScore').textContent = Math.round(score * (1 - Math.pow(1 - k, 3))).toLocaleString('en-US');
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ---------------- Per-frame sync ----------------
const tmpV = new THREE.Vector3();
const menuCam = { pos: new THREE.Vector3(), look: new THREE.Vector3() };

function syncWorld(dt: number) {
  const r = session.runner;
  const z = -r.distance;
  // Hazards.
  const live = liveSet;
  live.clear();
  for (const h of session.hazards) {
    live.add(h.id);
    if (!hazardMeshes.has(h.id)) {
      const m = createHazard(h.type);
      m.position.set(h.x, 0, -h.d);
      stage.world.add(m);
      hazardMeshes.set(h.id, m);
    }
  }
  for (const [id, m] of hazardMeshes) if (!live.has(id)) { stage.world.remove(m); hazardMeshes.delete(id); }
  // Amber and eggs.
  const seen = seenSet;
  seen.clear();
  for (const p of session.pickups) {
    if (p.taken || (p.kind !== 'amber' && p.kind !== 'egg')) continue;
    seen.add(p.id);
    let v = pickupViews.get(p.id);
    if (!v) { v = { kind: p.kind, x: p.x, y: p.y, z: -p.d, active: true, phase: (p.d * 0.37) % 6.28 }; pickupViews.set(p.id, v); }
    v.x = p.x; v.y = p.y;
  }
  for (const id of pickupViews.keys()) if (!seen.has(id)) pickupViews.delete(id);
  itemsArr.length = 0;
  for (const v of pickupViews.values()) itemsArr.push(v);
  items.items = itemsArr;
  items.hideNear = camBlend < 0.9 ? stage.camera.position : null;
  items.update(clock);
  powerups.sync(session.pickups, clock);

  // Footfall dust.
  if (app === 'playing' && r.grounded) {
    footAcc += r.speed * dt;
    if (footAcc > 1.05) {
      footAcc = 0;
      dust.emit(r.x + (fxRng.next() - 0.5) * 0.2, 0.03, z + 0.15, r.sliding ? 5 : 2, { spread: 0.6, up: 0.15, back: 2.5, size: 0.22, grow: 1.6, life: 0.45, alpha: 0.28, rand });
    }
    if (r.sliding) dust.emit(r.x, 0.04, z - 0.2, 1, { spread: 1.2, up: 0.35, back: 1, size: 0.24, grow: 1.6, life: 0.4, alpha: 0.32, color: SAND, rand });
  }
  if (r.glideLeft > 0 && fxRng.chance(0.5)) sparks.emit(r.x + (fxRng.next() - 0.5) * 1.6, r.y + 0.6, z + 0.5, 1, { spread: 0.3, up: 0.3, back: 6, size: 0.08, grow: 0, life: 0.5, alpha: 0.5, color: col(RAPTOR_GOBI_STREAK.accent), rand });
  dust.update(dt);
  sparks.update(dt);
  streamer.update(r.distance);

  const idle = app === 'title' || app === 'prerun' ? 1 : app === 'finishing' || app === 'results' ? clamp(1 - r.speed / 6, 0, 1) : 0;
  raptor.sync(r, dt, idle);

  // Storm: stumble pressure plus the story beat building toward the end.
  const ambient = clamp((r.distance - LEVEL.stormRises) / (LEVEL.length - LEVEL.stormRises), 0, 1) * 0.32;
  const stormLevel = clamp(session.storm * 0.85 + ambient, 0, 1);
  $('storm').style.opacity = (app === 'title' || app === 'prerun' ? 0 : stormLevel).toFixed(3);
  const fog = stage.scene.fog as THREE.Fog;
  fog.color.copy(fogColor).lerp(stormFog, ambient * 1.6);
  fog.far = lerp(FOG.far, 120, ambient * 2.2);
  fog.near = lerp(FOG.near, 22, ambient * 2.2);
}
let footAcc = 0;
let clock = 0;
const liveSet = new Set<number>();
const seenSet = new Set<number>();
const itemsArr: Collectible[] = [];

function updateCamera(dt: number) {
  const r = session.runner;
  const z = -r.distance;
  const target = app === 'playing' || app === 'paused' || app === 'caught' ? 1 : 0;
  camBlend = damp(camBlend, target, target ? 3.2 : 2, dt);
  // Menu / finish camera: slow orbit around the raptor.
  titleOrbit += dt * 0.12;
  const ending = app === 'finishing' || app === 'results';
  const a = (ending ? 0.35 : 0.75) + Math.sin(titleOrbit) * (ending ? 0.2 : 0.35);
  const dist = ending ? 3.6 : 3.5;
  // Aim at the body's visual center (the head reaches ~1 m forward of the hips).
  menuCam.pos.set(r.x + Math.sin(a) * dist, 0.8 + r.y, z - 0.35 - Math.cos(a) * dist);
  menuCam.look.set(r.x - 0.1, 0.62 + r.y, z - 0.35);
  stage.chase(r.x, r.y, z, dt);
  if (camBlend < 0.999) {
    const k = camBlend * camBlend * (3 - 2 * camBlend);
    const chasePos = stage.camera.position.clone();
    const chaseLook = tmpV.set(stage.camera.position.x * 0.85, 0.1 + r.y * 0.5, z - 6);
    stage.camera.position.lerpVectors(menuCam.pos, chasePos, k);
    stage.camera.lookAt(new THREE.Vector3().lerpVectors(menuCam.look, chaseLook, k));
  }
  if (shake > 0.001) {
    stage.camera.position.x += (fxRng.next() - 0.5) * shake * 0.25;
    stage.camera.position.y += (fxRng.next() - 0.5) * shake * 0.2;
    shake = damp(shake, 0, 9, dt);
  }
  const fov = stage.baseFov + Math.max(0, r.speed - LEVEL.speed.start) * CONFIG.camera.speedFovKick * camBlend + r.glideWeight * 6;
  $('speed').style.opacity = (camBlend * clamp((r.speed - 13) / 8, 0, 1) * (app === 'playing' ? 0.55 : 0)).toFixed(3);
  if (Math.abs(stage.camera.fov - fov) > 0.01) { stage.camera.fov = fov; stage.camera.updateProjectionMatrix(); }
  stage.follow(r.x, z);
}

function hud() {
  $('score').textContent = Math.round(session.score).toLocaleString('en-US');
  $('amber').textContent = String(session.amber);
  $('combo').textContent = String(session.combo);
  const pct = session.progress * 100;
  $('pdone').style.width = `calc(${pct.toFixed(2)}% - ${(pct / 10).toFixed(2)}px)`;
  $('pme').style.left = `calc(${pct.toFixed(2)}% - ${(pct / 10).toFixed(2)}px)`;
  const pw = $('power');
  const r = session.runner;
  if (session.magnetLeft > 0 || r.glideLeft > 0) {
    pw.hidden = false;
    pw.textContent = r.glideLeft > 0 ? `Updraft ${r.glideLeft.toFixed(0)}s` : `Amber Sense ${session.magnetLeft.toFixed(0)}s`;
  } else pw.hidden = true;
}

// ---------------- Loop ----------------
const STEP = 1 / 60;
function step(dt: number) {
  clock += dt;
  if (app === 'playing' || app === 'finishing' || app === 'results') {
    if (app === 'playing') bot?.step(dt);
    session.step(dt);
    for (const e of session.drainEvents()) handle(e);
  } else if (app === 'caught') {
    session.step(dt);
    session.drainEvents();
  }
  if (hintTimer > 0) { hintTimer -= dt; if (hintTimer <= 0) $('hint').hidden = true; }
  syncWorld(app === 'paused' ? 0 : dt);
  updateCamera(dt);
}

let acc = 0, last = performance.now();
let fpsAcc = 0, fpsFrames = 0, fpsShown = 0, worst = 0;
function frame(now: number) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += dt;
  let n = 0;
  while (acc >= STEP && n < 6) { step(STEP); acc -= STEP; n++; }
  if (n === 6) acc = 0;
  if (app === 'title' || app === 'prerun' || app === 'results') pregenerate(6);
  if (app === 'playing' && dt > 0.05) hitches.push(Math.round(dt * 1000));
  adaptQuality(dt);
  hud();
  draw();
  if (DEBUG) {
    fpsAcc += dt; fpsFrames++; worst = Math.max(worst, dt);
    if (fpsAcc > 0.5) { fpsShown = fpsFrames / fpsAcc; fpsAcc = 0; fpsFrames = 0; }
    const info = stage.renderer.info.render;
    $('debug').textContent = `${fpsShown.toFixed(0)} fps · worst ${(worst * 1000).toFixed(0)} ms\n${info.calls} calls · ${(info.triangles / 1000).toFixed(0)}k tris`;
    if (fpsAcc === 0) worst = 0;
  }
}

// Terrain for the whole level is built while the player is on the menus (never mid-run).
const LAST_CHUNK = Math.ceil((LEVEL.length + 40) / CONFIG.world.chunkLength) + CONFIG.world.chunksAhead;
function pregenerate(budgetMs: number) {
  const t0 = performance.now();
  while (performance.now() - t0 < budgetMs) if (streamer.pregenerateStep(LAST_CHUNK)) return true;
  return false;
}
// Compile every material once up front so the first boulder, arch, egg or power-up doesn't hitch.
function warmShaders() {
  const g = new THREE.Group();
  for (const t of ['boulder', 'ledge', 'ledgeWide', 'arch', 'ribArch'] as const) g.add(createHazard(t));
  g.position.set(0, -50, 0);
  stage.world.add(g);
  stage.renderer.compile(stage.scene, stage.camera);
  draw();
  stage.world.remove(g);
}

// Adaptive resolution: if frames run slow for ~2 s, step the render resolution down (2 -> 1.5 -> 1.25).
let slowFrames = 0, quality = 0;
const DPR_STEPS = [Math.min(window.devicePixelRatio, 2), 1.5, 1.25];
function adaptQuality(dt: number) {
  if (SHOT || app !== 'playing') return;
  slowFrames = dt > 0.022 ? slowFrames + 1 : Math.max(0, slowFrames - 2);
  if (slowFrames > 120 && quality < DPR_STEPS.length - 1 && DPR_STEPS[quality + 1] < DPR_STEPS[quality]) {
    quality++;
    slowFrames = 0;
    stage.renderer.setPixelRatio(DPR_STEPS[quality]);
    resize();
  }
}

// Hitch log: frames over 50 ms during a run, summarized on the results screen.
const hitches: number[] = [];

// Boot.
renderEggs();
renderObjectives();
setApp('title');
streamer.prewarm(0);
stage.chase(0, 0, 0, 1 / 60, true);
warmShaders();

declare global { interface Window { __rr?: unknown } }
window.__rr = {
  ready: true,
  start() { renderObjectives(); startRun(); },
  autoplay() { bot = new Bot(session, PERFECT); },
  advance(seconds: number, render = false) { const n = Math.round(seconds / STEP); for (let i = 0; i < n; i++) step(STEP); hud(); if (render) draw(); },
  draw() { draw(); },
  state: () => ({ app, length: LEVEL.length, distance: session.distance, score: Math.round(session.score), amber: session.amber, eggs: session.eggs, sstate: session.state }),
  input: (a: RunnerAction) => session.input(a),
  click: (id: string) => $(id).click(),
  stats: () => ({ ...streamer.stats(), calls: stage.renderer.info.render.calls, tris: stage.renderer.info.render.triangles }),
};
if (!SHOT) requestAnimationFrame(frame);
else draw();
