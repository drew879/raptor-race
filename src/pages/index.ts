import * as THREE from 'three';
import '../ui/theme.css';
import '../ui/game.css';
import { Stage, FOG } from '../render/stage';
import { LookPipeline } from '../render/post/looks';
import { ChunkStreamer } from '../render/world/terrain';
import { CollectibleField, type Collectible } from '../render/world/collectibles';
import { createHazard } from '../render/world/hazards';
import { PowerupView } from '../render/world/powerups';
import { Protoceratops } from '../render/prey/protoceratops';
import { Particles, SAND, SPARK } from '../render/fx';
import { RaptorView } from '../render/raptor/view';
import { GOBI, RAPTOR_GOBI_STREAK, col, mix } from '../render/palette';
import { Session, type GameEvent } from '../game/session';
import { CONFIG } from '../game/config';
import { LEVEL1 } from '../game/level1';
import { curvatureAt } from '../game/level';
import { worldUniforms } from '../render/materials';
import { Input } from '../core/input';
import { AudioEngine } from '../audio/sfx';
import { loadSave, writeSave } from '../game/save';
import { Bot, PERFECT } from '../game/bot';
import { Rng } from '../core/rng';
import { clamp, damp, lerp, smoothstep } from '../core/math';
import { amberIconSVG, inclusionIconSVG as eggIconSVG, logoSVG, protoSVG, raptorHeadSVG } from '../ui/logo';
import type { RunnerAction } from '../game/runner';
import type { HintKind } from '../game/level';

type AppState = 'title' | 'prerun' | 'intro' | 'playing' | 'paused' | 'caught' | 'lost' | 'finishing' | 'results';
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
    <div class="hunt" id="hunt" aria-label="Distance to the Protoceratops">
      <div class="hunt-track"></div>
      <div class="hunt-me">${raptorHeadSVG}</div>
      <div class="hunt-them" id="huntThem">${protoSVG}</div>
      <div class="hunt-label" id="huntLabel">24 m</div>
    </div>
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
<div class="pounce" id="pounce" hidden>Swipe up to pounce!</div>
<div class="spot" id="spot" hidden></div>
<div class="callout" id="callout" hidden><div class="eyebrow">Rare find</div><h3>Blue amber, with an insect inside</h3><p>Trapped 75 million years ago. Find all 3 in this level for a star.</p><div class="tap">Tap to continue</div></div>
<div class="quarry" id="quarry" hidden><div class="eyebrow">Field Journal · Today's quarry</div><h2>Protoceratops</h2><div class="latin">Protoceratops andrewsi · a parrot-beaked plant eater the size of a sheep</div></div>
<div class="skip" id="skip" hidden>Tap to skip</div>
<div class="plate" id="plate" hidden><div class="plate-card"><div class="eyebrow">Field Journal · Plate I</div><h2>Fighting Dinosaurs</h2><p>Velociraptor and Protoceratops, locked together in the red sand of the Gobi. In 1971 a fossil of exactly this moment was found in these same rocks: ~75 million years ago, preserved by a collapsing dune.</p></div></div>
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
    <p class="fact">The first Velociraptor fossil was found here, at the Flaming Cliffs, in 1923. Quill knobs on its forearm bones show it carried wing feathers. Today it's hunting: a Protoceratops is somewhere ahead in the dunes.</p>
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
      <button class="btn-paper" id="btnMusic">Music: on</button>
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

<section class="screen modal" id="scrLost" hidden>
  <div class="card">
    <div class="eyebrow">The hunt</div>
    <h2 id="lostTitle">It got away</h2>
    <p class="fact" id="lostFact">The Protoceratops slipped into the storm. Run clean to close the gap; every stumble lets it pull ahead.</p>
    <div class="buttons">
      <button class="btn-amber" id="btnLostRetry">Back to checkpoint</button>
      <button class="btn-paper" id="btnQuit3">Quit to title</button>
    </div>
  </div>
</section>

<section class="screen modal results" id="scrResults" hidden>
  <div class="card">
    <div class="eyebrow">Flaming Cliffs · Complete</div>
    <h2>Hunt complete!</h2>
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
audio.setMusic(save.music);
const syncSoundLabels = () => {
  $('btnSound').textContent = save.sound ? '♪' : '×';
  $('btnSound').setAttribute('aria-label', save.sound ? 'Sound on' : 'Sound off');
  $('btnSound2').textContent = `Sound: ${save.sound ? 'on' : 'off'}`;
  $('btnMusic').textContent = `Music: ${save.music ? 'on' : 'off'}`;
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
const prey = new Protoceratops();
stage.world.add(items.group, powerups.group, dust.field.points, sparks.field.points, raptor.root, prey.root);
let timeScale = 1;
let preyPrevX = 0;
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
  show('scrLost', s === 'lost');
  show('scrResults', s === 'results');
  show('quarry', s === 'intro');
  show('skip', s === 'intro');
  show('hud', s === 'playing' || s === 'paused' || s === 'caught' || s === 'lost');
  input.enabled = s === 'playing';
  if (s !== 'playing') $('hint').hidden = true;
  // Music follows the run: playing builds it, pause muffles it, any menu or setback fades it out.
  const m = audio.music;
  if (m) {
    if (s === 'playing') { m.setPaused(false); if (!m.isPlaying) m.start(); }
    else if (s === 'paused') m.setPaused(true);
    else if (s !== 'finishing') m.stop(s === 'intro' ? 0.3 : 0.7);
  }
}

function renderObjectives() {
  const st = save.stars[LEVEL.id] ?? [false, false, false];
  const labels = ['Catch the Protoceratops', 'Find all 3 amber inclusions', `Score ${LEVEL.parScore.toLocaleString('en-US')}`];
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
$('btnMusic').addEventListener('click', () => { save.music = !save.music; audio.setMusic(save.music); writeSave(save); syncSoundLabels(); });
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
$('btnLostRetry').addEventListener('click', () => { session.retryHunt(); resetWorld(); setApp('playing'); });
$('btnQuit3').addEventListener('click', toTitle);
document.addEventListener('visibilitychange', () => { if (document.hidden && app === 'playing') setApp('paused'); });

function startRun() {
  if (session.state !== 'ready') newSession();
  inclusionIntro = 'pending';
  while (!pregenerate(1000)) { /* finish any terrain not built yet */ }
  hitches.length = 0;
  save.runs++;
  writeSave(save);
  // The opening shot: the prey up close, it bolts, then the raptor is released.
  if (params.has('nointro')) beginChase();
  else { introT = 0; setApp('intro'); }
}
function beginChase() {
  session.start();
  setApp('playing');
  camBlend = 1;
  floatText('Hunt!', 'big', 30);
}
let introT = 0;
const INTRO = CONFIG.intro;
const introEnd = INTRO.graze + INTRO.alert + INTRO.swing;
/** The prey's distance along the course during the intro: grazing short of its start gap, then bolting up to it. */
function introPreyD() {
  const tb = Math.max(0, introT - INTRO.graze - INTRO.alert);
  const a = (2 * INTRO.preyLead) / (INTRO.swing * INTRO.swing);
  return LEVEL.prey.startGap - INTRO.preyLead + Math.min(INTRO.preyLead, 0.5 * a * tb * tb);
}
function introPreySpeed() {
  const tb = Math.max(0, introT - INTRO.graze - INTRO.alert);
  return tb > 0 ? ((2 * INTRO.preyLead) / (INTRO.swing * INTRO.swing)) * tb : 0;
}
root.addEventListener('pointerdown', () => { if (app === 'intro' && introT > 0.3) introT = introEnd; });
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
  fork: ['⇆', 'The trail splits around a rock fin. Pick a side: left is rougher, with more amber', '8px', '0'],
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
let bannerSlots = 0;
function floatText(text: string, kind: 'big' | 'small' | 'banner', topPct: number) {
  const el = document.createElement('div');
  el.className = `float ${kind}`;
  el.textContent = text;
  // Banners stack instead of overlapping when several fire together.
  if (kind === 'banner') {
    topPct += bannerSlots * 7;
    bannerSlots++;
    setTimeout(() => { bannerSlots = Math.max(0, bannerSlots - 1); }, 1800);
  }
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
      if (!save.seenInclusion) { save.seenInclusion = true; writeSave(save); }
      audio.play('egg');
      audio.music?.duckFor(0.6);
      haptic(20);
      renderEggs();
      floatText('Amber inclusion found!', 'banner', 30);
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
    case 'blocked':
      // Swiped into a fork's rock fin: a soft bump, no penalty.
      audio.play('land');
      haptic(12);
      shake = Math.max(shake, 0.14);
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
    case 'pounceReady':
      $('pounce').hidden = false;
      timeScale = 0.6; // a beat of slow motion to land the moment
      haptic(20);
      audio.play('powerup');
      break;
    case 'pounce':
      $('pounce').hidden = true;
      timeScale = 0.35;
      shake = Math.max(shake, 0.3);
      audio.play('jump');
      audio.music?.sting();
      setApp('finishing');
      break;
    case 'preyLost':
      $('pounce').hidden = true;
      timeScale = 1;
      $('lostTitle').textContent = 'It got away';
      $('lostFact').textContent = e.reason === 'missed'
        ? 'You were close! When "Swipe up to pounce" appears, swipe up right away.'
        : 'The Protoceratops slipped out of sight. Run clean to close the gap; every stumble lets it pull ahead.';
      setTimeout(() => setApp('lost'), 500);
      break;
    case 'finish':
      audio.play('finish');
      timeScale = 1;
      // Freeze-frame as a Field Journal plate, then the results.
      setTimeout(() => { $('plate').hidden = false; container.classList.add('freeze'); frozen = true; }, 1100);
      setTimeout(() => { $('plate').hidden = true; container.classList.remove('freeze'); frozen = false; showResults(); }, 4600);
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
  storm: ['Lost', 'The storm closed in', 'Run clean to keep the prey in sight.'],
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
  const labels = ['Caught the Protoceratops', `Amber inclusions: ${session.eggs.filter(Boolean).length} of 3`, `Score ${LEVEL.parScore.toLocaleString('en-US')}`];
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
      const m = createHazard(h.type, h.id, h.len);
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
  items.group.visible = !session.pinned && app !== 'finishing'; // nothing floats into the finale shot
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

  const pinned = session.pinned ? 1 : 0;
  const idle = !pinned && (app === 'title' || app === 'prerun' || app === 'intro' || app === 'results' || app === 'caught' || app === 'lost') ? 1 : 0;
  pinW = damp(pinW, pinned, 14, dt);
  raptor.sync(r, dt, idle, pinW);

  // Prey: runs ahead in its lane, hops ledges; hidden on the menus.
  const pz = app === 'intro' ? introPreyD() : session.preyD;
  let hop = 0;
  for (const h of session.hazards) {
    if (h.type !== 'ledge' && h.type !== 'ledgeWide') continue;
    if (h.type === 'ledge' && Math.abs(h.x - session.preyX) > 1) continue;
    const dz = Math.abs(h.d - pz);
    if (dz < 2.6) hop = Math.max(hop, Math.pow(1 - dz / 2.6, 0.7));
  }
  const pvx = (session.preyX - preyPrevX) / Math.max(dt, 1e-4);
  preyPrevX = session.preyX;
  const preyRunning = app === 'playing' || app === 'paused' || app === 'caught';
  prey.root.visible = app !== 'title' && app !== 'prerun';
  prey.root.position.set(session.preyX, 0, -pz);
  let preySpeed = preyRunning ? r.speed : 0;
  if (session.pinned) prey.pose = 'pinned';
  else if (app === 'intro') {
    const ti = introT - INTRO.graze;
    prey.pose = ti < 0 ? 'graze' : ti < INTRO.alert ? 'alert' : 'run';
    preySpeed = introPreySpeed();
  } else {
    prey.pose = 'run';
    if (app === 'finishing') preySpeed = 4;
  }
  prey.update(app === 'paused' ? 0 : dt, preySpeed, clamp(pvx / 8, -1, 1), hop);

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
let pinW = 0;
let frozen = false; // the Field Journal freeze-frame holds every animation still
let clock = 0;
const liveSet = new Set<number>();
const seenSet = new Set<number>();
const itemsArr: Collectible[] = [];

function updateCamera(dt: number) {
  const r = session.runner;
  const z = -r.distance;
  if (app === 'intro') { introCamera(dt); return; }
  const target = app === 'playing' || app === 'paused' || app === 'caught' ? 1 : 0;
  camBlend = app === 'finishing' ? 0 : damp(camBlend, target, target ? 3.2 : 2, dt);
  // Menu / finish camera: slow orbit around the raptor.
  titleOrbit += dt * 0.12;
  const ending = app === 'finishing' || app === 'results';
  if (ending) {
    // The pounce: a low three-quarter shot from ahead and to the side, framing both animals' faces.
    const pz = -session.preyD;
    const E = CONFIG.endingCam;
    menuCam.pos.set(session.preyX + E.side, E.height, pz - E.ahead);
    menuCam.look.set(session.preyX, E.lookHeight, pz + E.lookBack);
  } else {
    const a = 0.75 + Math.sin(titleOrbit) * 0.35;
    // Aim at the body's visual center (the head reaches ~1 m forward of the hips).
    menuCam.pos.set(r.x + Math.sin(a) * 3.5, 0.8 + r.y, z - 0.35 - Math.cos(a) * 3.5);
    menuCam.look.set(r.x - 0.1, 0.62 + r.y, z - 0.35);
  }
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
  stage.follow(r.x, ending ? -session.preyD + 8 : z);
  updateBend(dt, camBlend);
}

/** Automatic bends: the world curves left or right ahead (the simulation stays straight). The far scenery
 * swings round as you go, and the camera banks a little into the turn. Only in the chase view. */
let bend = 0, heading = 0;
function updateBend(dt: number, chase: number) {
  const C = CONFIG.curves;
  const r = session.runner;
  const running = app === 'playing' || app === 'paused' || app === 'caught' || app === 'lost' || app === 'intro';
  const target = running ? curvatureAt(LEVEL.curves, r.distance + C.lookAhead) * chase : 0;
  bend = damp(bend, target, 1.6, dt);
  worldUniforms.uBend.value = bend * C.bend;
  if (app === 'playing') heading += bend * C.bend * 2 * r.speed * C.headingGain * dt;
  heading = clamp(damp(heading, 0, 0.04, dt), -C.maxHeading, C.maxHeading);
  stage.backdrop.rotation.y = heading;
  if (Math.abs(bend) > 1e-3) stage.camera.rotateZ(-bend * C.roll);
}

/** Opening shot: close on the grazing prey, it looks up and bolts, the camera swings back behind the raptor. */
const introPos = new THREE.Vector3(), introLook = new THREE.Vector3(), chaseLookV = new THREE.Vector3();
function introCamera(dt: number) {
  const r = session.runner;
  const z = -r.distance;
  const I = INTRO;
  const pz = -introPreyD();
  const px = session.preyX;
  // A low three-quarter close-up of the prey's head; it drifts slowly in while the prey grazes.
  const push = Math.min(1, introT / (I.graze + I.alert));
  const dist = lerp(I.camDist, I.camDist * 0.85, push);
  const headZ = -(LEVEL.prey.startGap - I.preyLead) - 0.4;
  introPos.set(px + Math.sin(I.camAz) * dist, I.camHeight, headZ - Math.cos(I.camAz) * dist);
  introLook.set(px, 0.55, pz - 0.25);
  stage.chase(r.x, r.y, z, dt, true);
  const k = smoothstep(0, 1, (introT - I.graze - I.alert) / I.swing);
  chaseLookV.set(stage.camera.position.x * 0.85, CONFIG.camera.lookHeight + r.y * 0.5, z - CONFIG.camera.lookAhead);
  stage.camera.position.lerpVectors(introPos, stage.camera.position, k);
  stage.camera.position.y += Math.sin(Math.PI * k) * I.crane; // crane up as the prey bolts past
  stage.camera.lookAt(introLook.lerp(chaseLookV, k));
  if (Math.abs(stage.camera.fov - stage.baseFov) > 0.01) { stage.camera.fov = stage.baseFov; stage.camera.updateProjectionMatrix(); }
  stage.follow(px, lerp(pz + 6, z, k));
  camBlend = 1;
}

function hud() {
  $('score').textContent = Math.round(session.score).toLocaleString('en-US');
  $('amber').textContent = String(session.amber);
  $('combo').textContent = String(session.combo);
  const pct = session.progress * 100;
  void pct;
  const gap = Math.max(0, Math.round(session.gap));
  // Hunt meter: the Protoceratops icon sits further along the track the bigger the gap.
  const f = clamp(gap / CONFIG.hunt.lostGap, 0, 1);
  $('huntThem').style.left = `calc(30px + (100% - 66px) * ${f.toFixed(3)})`;
  $('huntLabel').textContent = gap >= 32 ? `${gap} m · losing it!` : `${gap} m`;
  $('hunt').className = `hunt ${gap <= 14 ? 'close' : gap >= 32 ? 'far' : ''}`;
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
  if (app === 'intro') {
    introT += dt;
    if (introT >= introEnd) beginChase();
  }
  if (app === 'playing' || app === 'finishing' || app === 'results') {
    if (app === 'playing') { bot?.step(dt * timeScale); checkInclusionIntro(); }
    session.step(dt * timeScale);
    for (const e of session.drainEvents()) handle(e);
  } else if (app === 'caught') {
    session.step(dt);
    session.drainEvents();
  }
  if (hintTimer > 0) { hintTimer -= dt; if (hintTimer <= 0) $('hint').hidden = true; }
  syncWorld(app === 'paused' || frozen ? 0 : dt);
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
  updateMusic(dt);
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

// Music intensity: builds with progress and as the gap closes; full in the finale. The storm swells the wind.
let musicI = 0;
function updateMusic(dt: number) {
  const m = audio.music;
  if (!m) return;
  const r = session.runner;
  const close = clamp((24 - session.gap) / 15, 0, 1);
  const target = session.inFinale ? 1 : clamp(0.2 + 0.45 * session.progress + 0.3 * close + (r.glideLeft > 0 ? 0.1 : 0), 0, 0.95);
  musicI = damp(musicI, target, 0.8, dt);
  m.intensity = musicI;
  m.storm = clamp(session.storm * 0.85 + clamp((r.distance - LEVEL.stormRises) / (LEVEL.length - LEVEL.stormRises), 0, 1) * 0.4, 0, 1);
  m.update();
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
  for (const h of LEVEL.hazards) if (h.type === 'spine') g.add(createHazard('spine', 0, h.len)); // also builds each fin once, up front
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

// First encounter with an amber inclusion: pause, circle it on screen, explain, continue on tap.
let inclusionIntro: 'pending' | 'showing' | 'done' = 'pending';
const projV = new THREE.Vector3();
function checkInclusionIntro() {
  if (inclusionIntro !== 'pending' || save.seenInclusion || app !== 'playing') return;
  if (bot && !params.has('introshot')) { inclusionIntro = 'done'; return; } // autoplay never waits for a tap
  const first = session.pickups.find((p) => p.kind === 'egg' && !p.taken && p.d - session.distance > 14 && p.d - session.distance < 30);
  if (!first) return;
  inclusionIntro = 'showing';
  timeScale = 0;
  projV.set(first.x, first.y, -first.d).project(stage.camera);
  const spot = $('spot');
  spot.style.left = `${((projV.x + 1) / 2) * 100}%`;
  spot.style.top = `${((1 - projV.y) / 2) * 100}%`;
  spot.hidden = false;
  $('callout').hidden = false;
  input.enabled = false;
}
root.addEventListener('pointerdown', () => {
  if (inclusionIntro !== 'showing') return;
  inclusionIntro = 'done';
  timeScale = 1;
  $('spot').hidden = true;
  $('callout').hidden = true;
  setTimeout(() => { if (app === 'playing') input.enabled = true; }, 120);
});

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
  state: () => ({ app, length: LEVEL.length, distance: session.distance, score: Math.round(session.score), amber: session.amber, eggs: session.eggs, sstate: session.state, pounceReady: session.pounceReady, pinned: session.pinned, music: audio.music ? { playing: audio.music.isPlaying, intensity: +audio.music.intensity.toFixed(2), ctx: audio.ctx?.state } : null }),
  input: (a: RunnerAction) => session.input(a),
  click: (id: string) => $(id).click(),
  stats: () => ({ ...streamer.stats(), calls: stage.renderer.info.render.calls, tris: stage.renderer.info.render.triangles }),
};
if (!SHOT) requestAnimationFrame(frame);
else draw();
