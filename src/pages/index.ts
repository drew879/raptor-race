import * as THREE from 'three';
import '../ui/theme.css';
import '../ui/game.css';
import { Stage, FOG } from '../render/stage';
import { LookPipeline } from '../render/post/looks';
import { ChunkStreamer, groundHeight } from '../render/world/terrain';
import { CollectibleField, type Collectible } from '../render/world/collectibles';
import { createHazard } from '../render/world/hazards';
import { PowerupView } from '../render/world/powerups';
import { Protoceratops } from '../render/prey/protoceratops';
import { EggView, buildNest } from '../render/prey/egg';
import { Herd } from '../render/prey/herd';
import { Pterosaur } from '../render/prey/pterosaur';
import { Footprints } from '../render/footprints';
import { DIRT, Particles, SAND, SPARK } from '../render/fx';
import { RaptorView } from '../render/raptor/view';
import { CAUD_FOREST, CAUD_SUNRISE, FOREST, GOBI, RAPTOR_DUSK, RAPTOR_GOBI_STREAK, col, mix, type RaptorPlumage } from '../render/palette';
import { BLUE_AMBER_NOTE, CHAPTERS, INCLUSION_PAGES, PLUMAGES, chapterFound, chapterUnlocked, levelUnlocked, lockReason, plumageUnlocked, recordMisses, showHint as hintShown, unseenPages, markPagesSeen } from '../game/journal';
import { inclusionArt, plumageSwatch } from '../ui/journal-art';
import { Session, type GameEvent } from '../game/session';
import { CONFIG } from '../game/config';
import { levelNumber, pickLevel } from '../game/levels';
import { LOOK, lookAt, setLook } from '../render/look';
import { LEVEL_COPY } from '../game/level-copy';
import { curvatureAt, timeAt } from '../game/level';
import { crashCopy } from '../game/copy';
import { applyLookMaterials, hillGrade, worldUniforms } from '../render/materials';
import { Input } from '../core/input';
import { AudioEngine } from '../audio/sfx';
import { loadSave, writeSave } from '../game/save';
import { Bot, PERFECT } from '../game/bot';
import { Rng } from '../core/rng';
import { clamp, damp, lerp, smoothstep } from '../core/math';
import { amberIconSVG, inclusionIconSVG as eggIconSVG, logoSVG } from '../ui/logo';
import type { RunnerAction } from '../game/runner';
import type { HintKind } from '../game/level';

type AppState = 'title' | 'journal' | 'prerun' | 'intro' | 'playing' | 'paused' | 'caught' | 'lost' | 'finishing' | 'results';
const params = new URLSearchParams(location.search);
const SHOT = params.has('shot');
let DEBUG = params.has('debug');
const save = loadSave();
// The graphics version (three-version test): the URL wins, else the saved choice, else today's look.
setLook(Number(params.get('look') ?? save.look ?? 3)); // the owner picked version 3 (playtest 8)
applyLookMaterials(lookAt(2));
/** The level is chosen when the page loads (the URL's ?level=, else the last one played); switching levels
 * reloads the page, so everything below is built for this one level. */
const LEVEL = pickLevel(params.get('level'), save.lastLevel);
const COPY = LEVEL_COPY[LEVEL.id];
const LEVEL_N = levelNumber(LEVEL.id);
const BIOME = LEVEL.biome;
const FORESTED = BIOME === 'forest';
const EGG_PREY = LEVEL.prey.species === 'egg';
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

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
<div class="pounce" id="pounce" hidden>${esc(COPY.pounce)}</div>
<div class="spot" id="spot" hidden></div>
<div class="callout" id="callout" hidden><div class="eyebrow">Rare find</div><h3>${esc(COPY.callout.title)}</h3><p>${esc(COPY.callout.text)}</p><div class="tap">Tap to continue</div></div>
<div class="quarry" id="quarry" hidden><div class="eyebrow">${esc(COPY.quarry.eyebrow)}</div><h2>${esc(COPY.quarry.name)}</h2><div class="latin">${esc(COPY.quarry.latin)}</div></div>
<div class="skip" id="skip" hidden>Tap to skip</div>
<div class="plate" id="plate" hidden><div class="plate-card"><div class="eyebrow">${esc(COPY.plate.eyebrow)}</div><h2>${esc(COPY.plate.title)}</h2><p>${esc(COPY.plate.text)}</p></div></div>
<div class="hint" id="hint" hidden><span class="glyph" id="hintGlyph"></span><span id="hintText"></span></div>
<div class="floats" id="floats"></div>

<section class="screen title" id="scrTitle">
  ${logoSVG()}
  <div class="actions">
    <div class="level-pick"><button class="lvl-arrow" id="btnLvlPrev" aria-label="Previous level" hidden>‹</button><div class="sub">Level ${LEVEL_N} · ${esc(LEVEL.name)}</div><button class="lvl-arrow" id="btnLvlNext" aria-label="Next level" hidden>›</button></div>
    <button class="btn-amber" id="btnRun">Run</button>
    <div class="row">
      <button class="btn-paper" id="btnJournal">Field Journal</button>
      <button class="btn-paper icon-btn" id="btnSound" aria-label="Sound">♪</button>
    </div>
    <div class="best" id="best" hidden></div>
    <div class="build" id="build"></div>
  </div>
</section>

<section class="screen sheet" id="scrPrerun" hidden>
  <div class="card">
    <div class="eyebrow">Field Journal · Level ${LEVEL_N}</div>
    <div class="species">${esc(COPY.species)}</div>
    <div class="latin">${esc(COPY.latin)}</div>
    <p class="fact">${esc(COPY.fact)}</p>
    <ul id="objectives"></ul>
    <div class="plumage" id="plumagePick"></div>
    <div class="buttons"><button class="btn-amber" id="btnGo">Run</button><button class="btn-paper" id="btnBack">Back</button></div>
  </div>
</section>

<section class="screen sheet journal" id="scrJournal" hidden>
  <div class="card journal-card">
    <div class="journal-head"><div class="eyebrow">Field Journal</div><button class="btn-paper small" id="btnJournalBack">Close</button></div>
    <div id="journalBody"></div>
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
      <button class="btn-paper" id="btnLook">Graphics: version ${LOOK.level}</button>
      <button class="btn-paper" id="btnQuit">Quit to title</button>
    </div>
  </div>
</section>

<section class="screen modal" id="scrCaught" hidden>
  <div class="card">
    <div class="eyebrow" id="caughtEyebrow">${esc(COPY.caughtEyebrow)}</div>
    <h2 id="caughtTitle">Buried in sand</h2>
    <p class="fact" id="caughtFact">Many Gobi fossils were preserved when dunes collapsed on them. Let's not become one.</p>
    <div class="buttons">
      <button class="btn-amber" id="btnRevive">${esc(COPY.reviveLabel)}</button>
      <button class="btn-paper" id="btnCheckpoint">Back to checkpoint</button>
      <button class="btn-paper" id="btnQuit2">Quit to title</button>
    </div>
  </div>
</section>

<section class="screen modal" id="scrLost" hidden>
  <div class="card">
    <div class="eyebrow">The hunt</div>
    <h2 id="lostTitle">It got away</h2>
    <p class="fact" id="lostFact">${esc(COPY.lost.distance)}</p>
    <div class="buttons">
      <button class="btn-amber" id="btnLostRetry">Back to checkpoint</button>
      <button class="btn-paper" id="btnQuit3">Quit to title</button>
    </div>
  </div>
</section>

<section class="screen modal results" id="scrResults" hidden>
  <div class="card">
    <div class="eyebrow">${esc(LEVEL.name)} · Complete</div>
    <h2>${esc(COPY.results.title)}</h2>
    <div class="big-score" id="rScore">0</div>
    <div class="stats"><div class="tag" style="font-size:18px">${amberIconSVG.replace('class="rr-amber-icon"', 'class="rr-amber-icon" style="width:15px;height:20px"')} <span id="rAmber">0</span></div><div class="eggrow" id="rEggs"></div><span class="newbest" id="rBest" hidden>New best</span></div>
    <ul id="rStars"></ul>
    <div class="perf" id="rPerf"></div>
    <button class="journal-new" id="btnNewPage" hidden></button>
    <div class="buttons"><button class="btn-amber" id="btnNextLevel" hidden>Next level</button><button class="btn-amber" id="btnAgain">Run again</button><button class="btn-paper" id="btnTitle">Title</button></div>
  </div>
</section>
<div class="debug" id="debug" hidden></div>
`;
document.body.appendChild(root);
if (parseFloat(getComputedStyle(document.documentElement).paddingTop) > 0) document.documentElement.classList.add('root-padded');
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

// ---------------- Save & audio ----------------
const audio = new AudioEngine();
audio.setMuted(!save.sound);
audio.setMusic(save.music);
audio.setMusicStyle(LEVEL.music);
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
const stage = new Stage(container, { preserveDrawingBuffer: SHOT, biome: BIOME });
const streamer = new ChunkStreamer(stage.world, true, { gullies: LEVEL.hazards.filter((h) => h.type === 'gully').map((h) => h.d), sections: LEVEL.sections, biome: BIOME });
if (LEVEL.slope) {
  worldUniforms.uSlope.value = LEVEL.slope.grade;
  worldUniforms.uSlopeFrom.value = LEVEL.slope.from;
  worldUniforms.uSlopeTo.value = LEVEL.slope.to;
}
worldUniforms.uRimColor.value.set(FORESTED ? FOREST.sunGlow : GOBI.sunGlow);
worldUniforms.uDapple.value = FORESTED && lookAt(3) ? 1 : 0; // dappled canopy light: the forest, version 3
const items = new CollectibleField(400, FOG);
const powerups = new PowerupView();
const dust = new Particles(440, THREE.NormalBlending, FOG, FORESTED ? DIRT : SAND); // footfalls, lane kicks, landings, dune streamers and storm sand
const sparks = new Particles(200, THREE.AdditiveBlending, FOG);
const PLUMAGE_COLORS: Record<string, RaptorPlumage> = { 'gobi-streak': RAPTOR_GOBI_STREAK, dusk: RAPTOR_DUSK, 'forest-fan': CAUD_FOREST, sunrise: CAUD_SUNRISE };
const DEFAULT_PLUMAGE = PLUMAGES[LEVEL.id]?.[0]?.id ?? 'gobi-streak';
const chosenPlumage = () => {
  const id = save.plumage?.[LEVEL.id] ?? DEFAULT_PLUMAGE;
  const idx = (PLUMAGES[LEVEL.id] ?? []).findIndex((p) => p.id === id);
  return idx > 0 && plumageUnlocked(save, LEVEL.id, idx) ? id : DEFAULT_PLUMAGE;
};
const heroView = (plumage: string) => new RaptorView(PLUMAGE_COLORS[plumage] ?? PLUMAGE_COLORS[DEFAULT_PLUMAGE], { species: LEVEL.hero });
let raptor = heroView(chosenPlumage());
/** Rebuild the raptor in another plumage (menus only). */
function applyPlumage(id: string) {
  save.plumage = { ...(save.plumage ?? {}), [LEVEL.id]: id };
  writeSave(save);
  stage.world.remove(raptor.root);
  raptor = heroView(id);
  stage.world.add(raptor.root);
}
const prey: Protoceratops | EggView = EGG_PREY ? new EggView() : new Protoceratops();
stage.world.add(items.group, powerups.group, dust.field.points, sparks.field.points, raptor.root, prey.root);
// The egg's nest at the top of the hill, just ahead of where the hero starts.
const NEST_D = 1.6;
if (EGG_PREY) { const nest = buildNest(); nest.position.set(0, -0.03, -NEST_D); stage.world.add(nest); }
// Tracks in the sand: the raptor's own, and the prey's ahead of it (you're following its trail).
const prints = new Footprints(40);
const preyPrints = new Footprints(48, 2.4, 'quadruped');
stage.world.add(prints.mesh, preyPrints.mesh);
const SAND_TRACK = col(FORESTED ? FOREST.track : GOBI.track);
const LEAF_GOLD = col(FOREST.ginkgoLight), LEAF_BROWN = col(FOREST.litter);
let printSide = 1, preyPrintAcc = 0, preyPrintSide = 1;
// A distant herd walks the dunes through the level's 'herd' stretch.
const herdAt = LEVEL.sections.findIndex((s) => s.kind === 'herd');
const herd = herdAt >= 0 ? new Herd(LEVEL.sections[herdAt].from, LEVEL.sections[herdAt + 1]?.from ?? LEVEL.length) : null;
if (herd) stage.world.add(herd.group);
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
// Fill exactly the area the browser shows (a phone browser's toolbars come and go; the page's own height can lag
// behind and leave a strip of background at the bottom).
const vv = window.visualViewport;
const fitViewport = () => { if (vv) root.style.height = `${Math.round(vv.height)}px`; resize(); };
vv?.addEventListener('resize', fitViewport);
fitViewport();
resize();

const fogColor = col(FORESTED ? FOREST.fog : GOBI.horizon);
look.setSky(BIOME);
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
  prints.clear();
  preyPrints.clear();
  for (const m of hazardMeshes.values()) stage.world.remove(m);
  hazardMeshes.clear();
  pickupViews.clear();
  items.items = [];
  streamer.prewarm(session.distance);
}

/** Inclusion distances, in the order the session numbers them. */
const INCLUSION_D = LEVEL.pickups.filter((p) => p.kind === 'egg').map((p) => p.d);
let furthestD = 0, missesRecorded = false;
/** End of a run: count each inclusion passed without finding it, for the journal's hints. */
function endRunForHints() {
  if (missesRecorded || session.state === 'ready') return;
  missesRecorded = true;
  recordMisses(save, LEVEL.id, INCLUSION_D, furthestD, session.eggs);
  writeSave(save);
}

function newSession() {
  endRunForHints();
  furthestD = 0;
  missesRecorded = false;
  session = new Session(LEVEL);
  if (bot) bot = new Bot(session, PERFECT);
  if (prey instanceof EggView) prey.reset(); // a whole egg again (it hatched at the end of the last run)
  resetWorld();
  renderEggs();
}

function show(id: string, on: boolean) { $(id).hidden = !on; }
function setApp(s: AppState) {
  app = s;
  show('scrTitle', s === 'title');
  show('scrPrerun', s === 'prerun');
  show('scrJournal', s === 'journal');
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
  const labels = [COPY.catchGoal, 'Find all 3 amber inclusions', `Score ${LEVEL.parScore.toLocaleString('en-US')}`];
  $('objectives').innerHTML = labels.map((l, i) => `<li>${star(st[i])} ${l}</li>`).join('');
  const best = save.best[LEVEL.id];
  $('best').hidden = !best;
  if (best) $('best').textContent = `Best ${best.toLocaleString('en-US')} · ${st.filter(Boolean).length}/3 stars`;
}
function renderEggs() {
  $('eggs').innerHTML = session.eggs.map((e) => eggIconSVG(e)).join('');
}

// ---------------- Field Journal ----------------
const stars3 = (st: boolean[]) => st.map((v) => star(v)).join('');
function renderJournal(fresh: number[] = []) {
  const parts: string[] = [];
  CHAPTERS.forEach((ch, ci) => {
    const open = chapterUnlocked(save, ci);
    parts.push(`<h2 class="ch-title">${ch.title}</h2>`);
    if (!open) { parts.push(`<p class="lock-note">🔒 ${lockReason(save, ci, 0)}</p>`); return; }
    parts.push(`<div class="ch-progress">Amber inclusions: ${chapterFound(save, ch)} of ${ch.levels.length * 3}</div>`);
    ch.levels.forEach((lv, li) => {
      const unlocked = lv.available && levelUnlocked(save, ci, li);
      const st = save.stars[lv.id] ?? [false, false, false];
      const n = levelNumber(lv.id);
      parts.push(`<div class="lvl ${unlocked ? 'open' : 'locked'}"><div class="lvl-n">${n}</div><div class="lvl-main"><b>${lv.name}</b><span>${lv.raptor}</span>${
        unlocked ? `<span class="lvl-stars">${stars3(st)}${save.best[lv.id] ? ` · best ${save.best[lv.id].toLocaleString('en-US')}` : ''}</span>` : `<span class="lock-note">🔒 ${lv.available ? lockReason(save, ci, li) : levelUnlocked(save, ci, li) ? 'Coming soon' : lockReason(save, ci, li)}</span>`
      }</div>${unlocked ? `<button class="lvl-play ${lv.id === LEVEL.id ? 'here' : ''}" data-level="${lv.id}">${lv.id === LEVEL.id ? 'Run' : 'Play'}</button>` : ''}</div>`);
      // The open level's spread: its inclusion pages and plumages.
      const pages = INCLUSION_PAGES[lv.id];
      if (!unlocked || !pages) return;
      const found = save.eggs[lv.id] ?? [];
      parts.push(`<div class="pages">${pages.map((pg, i) => `<div class="page ${found[i] ? 'found' : 'missing'} ${lv.id === LEVEL.id && fresh.includes(i) ? 'is-new' : ''}">${inclusionArt(pg.art, !!found[i])}<div class="page-text"><b>${found[i] ? pg.title : `Inclusion ${i + 1}: not found yet`}${lv.id === LEVEL.id && fresh.includes(i) ? ' <span class="new-tag">New</span>' : ''}</b><p>${
        found[i] ? pg.fact : hintShown(save, lv.id, i) ? `<span class="hint-tag">Hint</span> ${pg.hint}` : 'Find it in a run to fill this page. If you miss it twice, a hint appears here.'
      }</p></div></div>`).join('')}</div>`);
      parts.push(`<p class="note">${BLUE_AMBER_NOTE}</p>`);
      const pls = PLUMAGES[lv.id] ?? [];
      parts.push(`<div class="plumage-row">${pls.map((p, i) => {
        const ok = plumageUnlocked(save, lv.id, i);
        return `<div class="pl ${ok ? '' : 'locked'}">${plumageSwatch(PLUMAGE_COLORS[p.id], !ok)}<span>${p.name}${ok ? '' : '<br><small>Find all 3 inclusions</small>'}</span></div>`;
      }).join('')}</div>`);
    });
  });
  $('journalBody').innerHTML = parts.join('');
}

/** Plumage picker on the pre-run card (once there's more than one to choose). */
function renderPlumagePick() {
  const pls = PLUMAGES[LEVEL.id] ?? [];
  const cur = chosenPlumage();
  const el = $('plumagePick');
  if (!pls.some((_, i) => i > 0 && plumageUnlocked(save, LEVEL.id, i))) {
    el.innerHTML = `<div class="pl-hint">Find all 3 amber inclusions to unlock the ${pls[1]?.name ?? 'new'} plumage.</div>`;
    return;
  }
  el.innerHTML = `<div class="pl-label">Plumage</div><div class="plumage-row">${pls.map((p, i) => plumageUnlocked(save, LEVEL.id, i)
    ? `<button class="pl ${p.id === cur ? 'chosen' : ''}" data-pl="${p.id}">${plumageSwatch(PLUMAGE_COLORS[p.id], false)}<span>${p.name}</span></button>` : '').join('')}</div>`;
  el.querySelectorAll<HTMLButtonElement>('button[data-pl]').forEach((b) => b.addEventListener('click', () => { applyPlumage(b.dataset.pl!); renderPlumagePick(); }));
}

// ---------------- Input ----------------
const input = new Input(root, (a: RunnerAction) => { if (app === 'playing') session.input(a); });
input.enabled = false;

$('btnRun').addEventListener('click', () => { renderObjectives(); renderPlumagePick(); setApp('prerun'); });
// The journal opens from the title, or from the results after a run that filled a new page.
let journalFrom: AppState = 'title';
function openJournal(from: AppState) {
  journalFrom = from;
  const fresh = unseenPages(save, LEVEL.id);
  renderJournal(fresh);
  markPagesSeen(save, LEVEL.id);
  writeSave(save);
  syncJournalBadge();
  setApp('journal');
  const first = fresh.length ? document.querySelector<HTMLElement>('#journalBody .page.is-new') : null;
  $('scrJournal').scrollTop = first ? Math.max(0, first.offsetTop - 80) : 0;
}
function syncJournalBadge() {
  const n = unseenPages(save, LEVEL.id).length;
  $('btnJournal').innerHTML = n ? `Field Journal <span class="badge">${n} new</span>` : 'Field Journal';
}
$('btnJournal').addEventListener('click', () => openJournal('title'));
// Picking a level in the journal: this one goes to its pre-run card; another reloads the page on that level.
$('journalBody').addEventListener('click', (ev) => {
  const id = (ev.target as HTMLElement).closest<HTMLElement>('[data-level]')?.dataset.level;
  if (!id) return;
  if (id === LEVEL.id) { renderObjectives(); renderPlumagePick(); setApp('prerun'); }
  else goToLevel(id);
});
function goToLevel(id: string) {
  save.lastLevel = id;
  writeSave(save);
  location.href = `${location.pathname}?level=${encodeURIComponent(id)}`;
}
$('btnNextLevel').addEventListener('click', () => { const n = nextLevel(); if (n) goToLevel(n); });
/** The levels you can play, in roster order. */
const openLevels = () => CHAPTERS.flatMap((ch, ci) => ch.levels.map((lv, li) => (lv.available && levelUnlocked(save, ci, li) ? lv.id : ''))).filter(Boolean);
// The title's level arrows: step through the open levels.
function syncLevelArrows() {
  const open = openLevels(), i = open.indexOf(LEVEL.id);
  $('btnLvlPrev').hidden = i <= 0;
  $('btnLvlNext').hidden = i < 0 || i >= open.length - 1;
}
$('btnLvlPrev').addEventListener('click', () => { const open = openLevels(), i = open.indexOf(LEVEL.id); if (i > 0) goToLevel(open[i - 1]); });
$('btnLvlNext').addEventListener('click', () => { const open = openLevels(), i = open.indexOf(LEVEL.id); if (i >= 0 && i < open.length - 1) goToLevel(open[i + 1]); });
/** The next level in the roster, if it exists and is open. */
function nextLevel() {
  for (let ci = 0; ci < CHAPTERS.length; ci++) {
    const li = CHAPTERS[ci].levels.findIndex((l) => l.id === LEVEL.id);
    if (li < 0) continue;
    const [nci, nli] = li + 1 < CHAPTERS[ci].levels.length ? [ci, li + 1] : [ci + 1, 0];
    const lv = CHAPTERS[nci]?.levels[nli];
    return lv && lv.available && levelUnlocked(save, nci, nli) ? lv.id : null;
  }
  return null;
}
$('btnNewPage').addEventListener('click', () => openJournal('results'));
$('btnJournalBack').addEventListener('click', () => { if (journalFrom === 'title') { syncJournalBadge(); } setApp(journalFrom); });
$('btnBack').addEventListener('click', () => setApp('title'));
$('btnGo').addEventListener('click', startRun);
$('btnSound').addEventListener('click', toggleSound);
$('btnSound2').addEventListener('click', toggleSound);
$('btnMusic').addEventListener('click', () => { save.music = !save.music; audio.setMusic(save.music); writeSave(save); syncSoundLabels(); });
// Graphics test: cycle 1 -> 2 -> 3 and reload on the same level (everything is built for one version).
$('btnLook').addEventListener('click', () => {
  save.look = (LOOK.level % 3) + 1;
  writeSave(save);
  location.href = `${location.pathname}?level=${encodeURIComponent(LEVEL.id)}&look=${save.look}`;
});
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
  save.lastLevel = LEVEL.id;
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
  floatText(COPY.go, 'big', 30);
}
let introT = 0;
/** The opening shot's timing and framing. The egg: the hero walks up to its nest (walk), the egg twitches (graze),
 * rocks hard (alert), then tips out and rolls off downhill as the camera swings behind (swing). */
const INTRO = EGG_PREY
  ? { ...CONFIG.intro, walk: 1.4, graze: 2.0, alert: 1.1, swing: 1.5, preyLead: LEVEL.prey.startGap - NEST_D, camAz: 0.62, camDist: 4.3, camHeight: 1.35, crane: 1.4 }
  : { ...CONFIG.intro, walk: 0 };
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
  if (newerBuild) { reloadFresh(); } // a newer build came out while you played
  syncJournalBadge();
  newSession();
  camBlend = 0;
  renderObjectives();
  setApp('title');
}

// ---------------- Feedback ----------------
const HINTS: Record<HintKind, [string, string, string, string]> = {
  lanes: ['⇆', 'Swipe left or right to change lanes', '8px', '0'],
  jump: ['↑', 'Swipe up to jump gullies and slabs', '0', '-6px'],
  slide: ['↓', 'Swipe down to slide under arches and bones', '0', '6px'],
  magnet: ['◈', 'Amber Sense pulls nearby amber to you', '0', '0'],
  updraft: ['≋', 'Grab the updraft to glide over the boulders. Steer left and right while you fly', '0', '-6px'],
  fork: ['⇆', 'The trail splits around a rock fin. Pick a side: left is rougher, with more amber', '8px', '0'],
  nest: ['↑', 'Protoceratops nesting ground: jump the resting ones, and watch for one on the move', '0', '-6px'],
  pterosaur: ['↓', 'Pterosaur! When it swoops in low, swipe down to duck', '0', '6px'],
};
function showHint(h: HintKind) {
  const [g, t0, nx, ny] = HINTS[h];
  const t = COPY.hints?.[h] ?? t0;
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
      if (e.e === 'lane') {
        audio.play('lane', { dir: e.dir });
        // A kick of sand off the trailing foot.
        dust.emit(r.x - (e.dir ?? 0) * 0.25, 0.05, z + 0.1, 6, { spread: 0.6, up: 0.3, side: -(e.dir ?? 0) * 2.6, back: 2, size: 0.26, grow: 1.8, life: 0.45, alpha: 0.32, rand });
      }
      else if (e.e === 'jump') { audio.play('jump'); dust.emit(r.x, 0.04, z + 0.2, 6, { spread: 0.8, up: 0.2, back: 3, size: 0.25, grow: 1.6, alpha: 0.3, rand }); }
      else if (e.e === 'land') { audio.play('land'); shake = Math.max(shake, 0.05); dust.emit(r.x, 0.04, z + 0.1, 16, { spread: 1.7, up: 0.35, back: 2, size: 0.32, grow: 2, alpha: 0.38, rand }); }
      else if (e.e === 'slide') audio.play('slide');
      else if (e.e === 'fastfall') audio.play('lane', { dir: 0 });
      else if (e.e === 'glide') audio.play('powerup');
      break;
    case 'amber':
      audio.amber(timeAt(LEVEL, r.distance), timeScale);
      bump('amberTag');
      sparks.emit(e.x, e.y, -e.d, 7, { spread: 0.7, up: 0.9, back: -r.speed * 0.85, size: 0.13, grow: -0.6, life: 0.28, alpha: 0.85, color: SPARK, rand });
      break;
    case 'egg': {
      // Found inclusions are kept forever, saved the moment you pick one up (even if you crash right after).
      save.seenInclusion = true;
      const found = save.eggs[LEVEL.id] ?? session.eggs.map(() => false);
      found[e.index] = true;
      save.eggs[LEVEL.id] = found;
      writeSave(save);
      audio.play('egg');
      audio.music?.duckFor(0.6);
      haptic(20);
      renderEggs();
      floatText('Amber inclusion found!', 'banner', 30);
      sparks.emit(e.x, e.y, -e.d, 22, { spread: 1, up: 1.2, back: -r.speed * 0.85, size: 0.16, grow: -0.5, life: 0.5, alpha: 0.9, color: SPARK, rand });
      break;
    }
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
      floatText(COPY.stumble, 'banner', 30);
      break;
    case 'crash': {
      audio.play('stumble');
      haptic(60);
      shake = Math.max(shake, 0.6);
      flash();
      const copy = COPY.crash?.[e.cause] ?? crashCopy(e.cause);
      $('caughtEyebrow').textContent = copy[0];
      $('caughtTitle').textContent = copy[1];
      $('caughtFact').textContent = copy[2];
      setbackT = 0; // the crash screen follows from the game loop (see step), so it can't be skipped
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
      audio.music?.riser();
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
      $('lostFact').textContent = e.reason === 'missed' ? COPY.lost.missed : COPY.lost.distance;
      setbackT = 0;
      break;
    case 'finish':
      audio.finale();
      // The pin: a burst of sand around the pair.
      dust.emit(session.preyX, 0.1, -session.preyD, 34, { spread: 2.4, up: 0.8, back: 0, size: 0.55, grow: 2.6, life: 1.4, alpha: 0.45, drag: 1.4, gravity: 1.2, rand });
      timeScale = 1;
      // Freeze-frame as a Field Journal plate, then the results.
      const plateAt = EGG_PREY ? 2100 : 1100; // the egg hatches first
      setTimeout(() => { $('plate').hidden = false; container.classList.add('freeze'); frozen = true; }, plateAt);
      setTimeout(() => { $('plate').hidden = true; container.classList.remove('freeze'); frozen = false; showResults(); }, plateAt + 3500);
      break;
  }
}

function flash() {
  const el = $('flash');
  el.classList.remove('on');
  void el.offsetWidth;
  el.classList.add('on');
}
function showResults() {
  const st = session.stars;
  const prevStars = save.stars[LEVEL.id] ?? [false, false, false];
  save.stars[LEVEL.id] = prevStars.map((v, i) => v || st[i]);
  endRunForHints();
  // Point the player at any journal page this run filled in.
  const fresh = unseenPages(save, LEVEL.id).length;
  $('btnNewPage').hidden = fresh === 0;
  $('btnNewPage').innerHTML = `<span class="np-icon">📖</span> ${fresh === 1 ? 'New journal page' : `${fresh} new journal pages`} <span class="np-go">Read</span>`;
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
  const labels = [COPY.caught, `Amber inclusions: ${session.eggs.filter(Boolean).length} of 3`, `Score ${LEVEL.parScore.toLocaleString('en-US')}`];
  $('rStars').innerHTML = labels.map((l, i) => `<li>${star(st[i], st[i], 300 + i * 220)} ${l}</li>`).join('');
  const next = nextLevel();
  $('btnNextLevel').hidden = !next;
  if (next) $('btnNextLevel').textContent = `Next: Level ${levelNumber(next)}`;
  $('btnAgain').className = next ? 'btn-paper' : 'btn-amber';
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

// ---------------- Creature hazards (pooled: building a model mid-run would hitch) ----------------
const protoPool = Array.from({ length: 4 }, () => new Protoceratops());
const pteroPool = [new Pterosaur()];
for (const c of [...protoPool, ...pteroPool]) { c.root.visible = false; stage.world.add(c.root); }
const creatureViews = new Map<number, Protoceratops | Pterosaur>();
const screeched = new Set<number>();
/** The pterosaur's swoop as a function of how far the runner is from where it crosses the trail (dz, meters):
 * [dz, x, y, meters beyond the crossing]. High and far, a long dive, head height across the lanes at dz = 0,
 * then up and away over the camera. */
const SWOOP: [number, number, number, number][] = [[115, 22, 19, 58], [72, 15, 14, 34], [42, 8, 8, 15], [18, 3, 2.7, 4], [0, 0, 1.45, 0], [-10, -2, 3.2, -12], [-30, -6, 9.5, -32]];
function swoopAt(dz: number) {
  const k = SWOOP.findIndex(([d]) => d <= dz);
  if (k <= 0) return SWOOP[k < 0 ? SWOOP.length - 1 : 0].slice(1) as [number, number, number];
  const [d0, ...a] = SWOOP[k - 1], [d1, ...b] = SWOOP[k];
  const u = (dz - d0) / (d1 - d0), e = u * u * (3 - 2 * u);
  return a.map((v, i) => v + (b[i] - v) * e) as [number, number, number];
}
function syncCreatures(dt: number) {
  const r = session.runner;
  for (const h of session.hazards) {
    if (h.type !== 'nester' && h.type !== 'wanderer' && h.type !== 'pterosaur') continue;
    let v = creatureViews.get(h.id);
    if (!v) {
      v = h.type === 'pterosaur' ? pteroPool.find((p) => !p.root.visible) : protoPool.find((p) => !p.root.visible);
      if (!v) continue;
      v.root.visible = true;
      creatureViews.set(h.id, v);
    }
    const dz = h.d - r.distance;
    if (v instanceof Pterosaur) {
      const [x, y, ahead] = swoopAt(dz);
      const [x2, y2, ahead2] = swoopAt(dz - 1);
      v.root.position.set(x, y, -(h.d + ahead));
      v.root.rotation.set(Math.atan2(y2 - y, Math.max(0.3, ahead - ahead2)) * 0.8, Math.PI, (x2 - x) * 0.6, 'YXZ');
      v.root.visible = dz < 118 && dz > -32;
      v.update(dt, dz > 70 ? 0.6 : dz > 4 ? 0.12 : 1);
      if (dz < 46 && !screeched.has(h.id)) { screeched.add(h.id); audio.play('screech'); }
    } else {
      v.root.position.set(h.x, 0, -h.d);
      if (h.type === 'nester') {
        v.pose = 'rest';
        v.root.rotation.set(0, Math.PI + ((h.id * 0.618) % 1 - 0.5) * 0.6, 0);
        v.update(dt, 0, 0, 0);
      } else {
        const target = h.lane * CONFIG.lanes.spacing;
        const moving = Math.abs(h.x - target) > 0.03;
        v.pose = moving ? 'run' : 'alert';
        v.root.rotation.set(0, (h.x0 ?? 0) < target ? -Math.PI / 2 : Math.PI / 2, 0);
        v.update(dt, moving ? 2.6 : 0, 0, 0);
      }
    }
  }
  for (const [id, v] of creatureViews) {
    if (session.hazards.some((h) => h.id === id)) continue;
    v.root.visible = false;
    creatureViews.delete(id);
  }
}

// ---------------- Per-frame sync ----------------
const tmpV = new THREE.Vector3();
/** The egg's finale, framed from ahead and to the side of the egg: the hero curled around it as it hatches. */
const EGG_ENDING_CAM = { side: 2.75, height: 1.15, ahead: 0.85, lookHeight: 0.52, lookBack: 0.42 }; // framed for the hero at 1.2x
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
      const m = createHazard(h.type, h.id, h.len, BIOME);
      m.position.set(h.x, 0, -h.d);
      stage.world.add(m);
      hazardMeshes.set(h.id, m);
    }
  }
  for (const [id, m] of hazardMeshes) if (!live.has(id)) { stage.world.remove(m); hazardMeshes.delete(id); }
  syncCreatures(dt);
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
  items.hideNear = stage.camera.position; // fade anything passing right by the lens (menus, glides)
  items.group.visible = !session.pinned && app !== 'finishing'; // nothing floats into the finale shot
  items.update(clock);
  powerups.sync(session.pickups, clock);

  // Footfall dust.
  if (app === 'playing' && r.grounded) {
    footAcc += r.speed * dt;
    if (footAcc > 1.05) {
      footAcc = 0;
      if (!r.sliding) { printSide = -printSide; prints.add(r.x + printSide * 0.09, z + 0.15, 0.85, -r.lean * 0.15); }
      dust.emit(r.x + (fxRng.next() - 0.5) * 0.2, 0.03, z + 0.15, r.sliding ? 6 : 3, { spread: 0.7, up: 0.2, back: 2.5, size: 0.4, grow: 1.7, life: 0.5, alpha: 0.34, rand });
    }
    if (r.sliding) dust.emit(r.x, 0.04, z - 0.2, 1, { spread: 1.2, up: 0.35, back: 1, size: 0.24, grow: 1.6, life: 0.4, alpha: 0.32, color: SAND, rand });
  }
  if (!FORESTED && r.glideLeft > 0 && fxRng.chance(0.5)) sparks.emit(r.x + (fxRng.next() - 0.5) * 1.6, r.y + 0.6, z + 0.5, 1, { spread: 0.3, up: 0.3, back: 6, size: 0.08, grow: 0, life: 0.5, alpha: 0.5, color: col(RAPTOR_GOBI_STREAK.accent), rand });
  dust.update(dt);
  sparks.update(dt);
  // The prey leaves tracks while it runs (not while hopping a ledge).
  if (!EGG_PREY && (app === 'playing' || app === 'intro') && session.state !== 'pouncing') {
    preyPrintAcc += (app === 'intro' ? introPreySpeed() : r.speed) * dt;
    if (preyPrintAcc > 0.9) {
      preyPrintAcc = 0;
      preyPrintSide = -preyPrintSide;
      const pzv = app === 'intro' ? introPreyD() : session.preyD;
      if (!session.hazards.some((h) => h.type === 'gully' && Math.abs(h.d - pzv) < 1.8)) preyPrints.add(session.preyX + preyPrintSide * 0.16, -pzv + 0.3, 1.1);
    }
  }
  prints.update(dt, SAND_TRACK, stage.camera.position.z);
  preyPrints.update(dt, SAND_TRACK, stage.camera.position.z);
  // Wind: sand streaming off the dune crests ahead, and sheets of it blowing past as the storm builds.
  if (FORESTED && (app === 'playing' || app === 'intro' || app === 'title' || app === 'prerun') && fxRng.chance(0.3)) {
    // Leaves drifting down through the light ahead (ginkgo gold and dry brown).
    const x = fxRng.range(-6, 6), zz = z - fxRng.range(4, 30);
    dust.emit(x, fxRng.range(2.5, 6), zz, 1, { spread: 0.2, up: -0.3, side: fxRng.range(-0.6, 0.6), back: 0, size: 0.09, grow: 0, life: 3.2, alpha: 0.85, gravity: 0.25, drag: 0.4, color: fxRng.chance(0.5) ? LEAF_GOLD : LEAF_BROWN, rand });
  }
  if (!FORESTED && (app === 'playing' || app === 'intro')) {
    const storm = clamp(session.storm * 0.85 + clamp((r.distance - LEVEL.stormRises) / (LEVEL.length - LEVEL.stormRises), 0, 1) * 0.6, 0, 1);
    if (fxRng.chance(0.35 + storm * 0.5)) {
      const sx = fxRng.chance(0.5) ? 1 : -1, x = sx * fxRng.range(5, 17), zz = z - fxRng.range(12, 55);
      dust.emit(x, groundHeight(x, zz) + 0.25, zz, 1, { spread: 0.4, up: 0.15, side: -3.2 - storm * 3, back: 0, size: 0.55, grow: 2.6, life: 1.6, alpha: 0.16 + storm * 0.1, gravity: 0, drag: 0, rand });
    }
    if (storm > 0.2 && fxRng.chance(storm * 0.9)) {
      dust.emit(fxRng.range(-1, 7), fxRng.range(0.3, 2.6), z + fxRng.range(-7, 1.5), 1, { spread: 0.2, up: 0, side: -10 - storm * 6, back: 1, size: 0.3, grow: 3.5, life: 0.7, alpha: 0.22 * storm, gravity: 0, drag: 0, rand });
    }
  }
  herd?.update(dt, r.distance);
  streamer.update(r.distance);

  const pinned = session.pinned ? 1 : 0;
  const down = session.state === 'caught' || session.state === 'lost'; // stop the moment it happens, not when the screen shows
  const idle = !pinned && (down || app === 'title' || app === 'prerun' || app === 'intro' || app === 'results' || app === 'caught' || app === 'lost') ? 1 : 0;
  pinW = damp(pinW, pinned, 14, dt);
  idleW = damp(idleW, idle, 12, dt); // a quick ease, so a crash stops the legs without a pose snap
  if (EGG_PREY && (app === 'intro' || app === 'title' || app === 'prerun')) {
    // The opening shot: it walks up to its nest, then stands looking down at the egg.
    const w = app === 'intro' ? clamp(introT / INTRO.walk, 0, 1) : 1;
    raptor.sync(r, dt, w < 1 ? 0 : idleW, pinW, w < 1 ? 1.9 : undefined);
    raptor.root.position.z += (1 - Math.sin((w * Math.PI) / 2)) * 2.6;
  } else raptor.sync(r, dt, idleW, pinW);
  furthestD = Math.max(furthestD, r.distance);

  // Prey: runs ahead in its lane, hops ledges; hidden on the menus.
  const pz = app === 'intro' ? introPreyD() : session.preyD;
  let hop = 0;
  for (const h of session.hazards) {
    if (h.type !== 'ledge' && h.type !== 'gully') continue;
    if (h.type === 'ledge' && Math.abs(h.x - session.preyX) > 1) continue;
    const dz = Math.abs(h.d - pz);
    if (dz < 2.6) hop = Math.max(hop, Math.pow(1 - dz / 2.6, 0.7));
  }
  const pvx = (session.preyX - preyPrevX) / Math.max(dt, 1e-4);
  preyPrevX = session.preyX;
  const preyRunning = app === 'playing' || app === 'paused' || app === 'caught';
  prey.root.visible = EGG_PREY || (app !== 'title' && app !== 'prerun');
  const inNest = EGG_PREY && (app === 'title' || app === 'prerun');
  prey.root.position.set(inNest ? 0 : session.preyX, 0, inNest ? -NEST_D : -pz);
  let preySpeed = preyRunning ? r.speed : 0;
  if (session.pinned) prey.pose = 'pinned';
  else if (inNest) prey.pose = 'graze';
  else if (app === 'intro') {
    const ti = introT - INTRO.graze;
    prey.pose = ti < 0 ? 'graze' : ti < INTRO.alert ? 'alert' : 'run';
    preySpeed = introPreySpeed();
  } else {
    prey.pose = 'run';
    if (app === 'finishing') preySpeed = 4;
  }
  if (prey instanceof EggView) hatchingCues(prey, inNest, pz);
  prey.update(app === 'paused' ? 0 : dt, preySpeed, clamp(pvx / 8, -1, 1), hop);

  // Storm: stumble pressure plus the story beat building toward the end.
  const ambient = clamp((r.distance - LEVEL.stormRises) / (LEVEL.length - LEVEL.stormRises), 0, 1) * 0.32;
  const stormLevel = clamp(session.storm * 0.85 + ambient, 0, 1);
  $('storm').style.opacity = (app === 'title' || app === 'prerun' || FORESTED ? 0 : stormLevel).toFixed(3);
  look.storm = app === 'title' || app === 'prerun' || FORESTED ? 0 : clamp(stormLevel * 1.2, 0, 1);
  const fog = stage.scene.fog as THREE.Fog;
  fog.color.copy(fogColor).lerp(stormFog, ambient * 1.6);
  fog.far = lerp(FOG.far, 120, ambient * 2.2);
  fog.near = lerp(FOG.near, 22, ambient * 2.2);
}
/** The opening tells why the egg rolls (owner playtest 8: it looked like it just hopped out): it's hatching. Cracks
 * spread, each with a tap from inside and a few chips of shell; a beak pokes through as it rocks; "It's hatching!" */
let crackStage = 0, hatchBanner = false, peckTimer = 0;
function hatchingCues(egg: EggView, inNest: boolean, pz: number) {
  if (inNest) { egg.crack = 0; crackStage = 0; hatchBanner = false; return; }
  if (app !== 'intro') { egg.crack = Math.max(egg.crack, 1); return; } // it rolls off cracked
  egg.crack = clamp((introT - INTRO.walk) / (INTRO.graze + INTRO.alert - INTRO.walk - 0.3), 0, 1);
  const stage = [0.2, 0.55, 0.85].filter((s) => egg.crack >= s).length;
  const chips = (n: number) => dust.emit(0, 0.25, -pz, n, { spread: 0.5, up: 1.4, back: 0, size: 0.07, grow: -0.3, life: 0.6, alpha: 0.95, color: EGG_CHIP, gravity: 6, drag: 1, rand });
  if (stage > crackStage) { crackStage = stage; audio.play('peck'); chips(4 + stage * 2); }
  // Between cracks: more taps from inside while it twitches and rocks.
  peckTimer -= 1 / 60;
  if (introT > INTRO.walk && introT < INTRO.graze + INTRO.alert && peckTimer <= 0) { peckTimer = introT > INTRO.graze ? 0.35 : 0.7; audio.play('peck'); }
  if (!hatchBanner && introT >= INTRO.graze) { hatchBanner = true; floatText('It\'s hatching!', 'big', 30); }
}
const EGG_CHIP = col(0xd6efe6);
let footAcc = 0;
let setbackT = 0;
let warnedFar = false;
let pinW = 0;
let idleW = 1;
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
    const E = EGG_PREY ? EGG_ENDING_CAM : CONFIG.endingCam;
    menuCam.pos.set(session.preyX + E.side, E.height, pz - E.ahead);
    menuCam.look.set(session.preyX, E.lookHeight, pz + E.lookBack);
  } else {
    const a = 0.75 + Math.sin(titleOrbit) * 0.35;
    // Aim at the body's visual center (the head reaches ~1 m forward of the hips).
    menuCam.pos.set(r.x + Math.sin(a) * 3.5, 0.8 + r.y, z - 0.35 - Math.cos(a) * 3.5);
    menuCam.look.set(r.x - 0.1, 0.62 + r.y, z - 0.35);
  }
  stage.slope = hillGrade(r.distance + 5); // aim down the hill (0 on the flats)
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
  if (EGG_PREY) introLook.set(-0.15, 0.5, Math.max(pz, -NEST_D - 4) + 1.2); // the egg and its parent, then the egg as it goes
  else introLook.set(px, 0.55, pz - 0.25);
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
  worldUniforms.uTime.value = clock;
  if (app === 'intro') {
    introT += dt;
    if (introT >= introEnd) beginChase();
  }
  if (app === 'playing' || app === 'finishing' || app === 'results') {
    if (app === 'playing') { bot?.step(dt * timeScale); checkInclusionIntro(); }
    session.step(dt * timeScale);
    for (const e of session.drainEvents()) handle(e);
    // No distance meter (owner: judge it by eye); one warning each time the prey pulls far ahead.
    if (app === 'playing' && session.state === 'running') {
      if (!warnedFar && session.gap >= session.hunt.warnGap) {
        warnedFar = true;
        floatText('It\'s getting away!', 'banner', 30);
        haptic(25);
      } else if (warnedFar && session.gap < session.hunt.warnGap - 6) warnedFar = false;
    }
    // Setbacks: after a short beat, a crash shows the crash screen and a lost prey shows "It got away".
    if (app === 'playing' && (session.state === 'caught' || session.state === 'lost')) {
      setbackT += dt;
      if (session.state === 'caught' && setbackT >= 0.65) {
        $('btnRevive').hidden = session.reviveUsed;
        $('btnCheckpoint').textContent = session.checkpoint >= 0 ? 'Back to checkpoint' : 'Restart';
        setApp('caught');
      } else if (session.state === 'lost' && setbackT >= 0.5) setApp('lost');
    }
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
  // The song position is the running time to the raptor's distance: the music stays locked to the amber.
  m.update(timeAt(LEVEL, r.distance), app === 'playing' || app === 'finishing' ? timeScale : 0);
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
  for (const t of ['boulder', 'ledge', 'gully', 'arch', 'ribArch'] as const) g.add(createHazard(t, 0, 0, BIOME));
  for (let v = 1; v < 3; v++) g.add(createHazard('boulder', v, 0, BIOME)); // every blocker variant
  for (const h of LEVEL.hazards) if (h.type === 'spine') g.add(createHazard('spine', 0, h.len, BIOME)); // also builds each fin once, up front
  g.position.set(0, -50, 0);
  stage.world.add(g);
  if (herd) herd.group.visible = true; // compile the instanced herd too (it's hidden until its stretch)
  for (const c of [...protoPool, ...pteroPool]) c.root.visible = true;
  stage.renderer.compile(stage.scene, stage.camera);
  for (const c of [...protoPool, ...pteroPool]) c.root.visible = false;
  herd?.update(0, session.distance);
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
syncJournalBadge();
syncLevelArrows();
$('build').textContent = `Build ${__BUILD__}`;
// A copy kept open on the phone (a Home Screen app resumes where it was) checks for a newer build whenever it comes
// back, and reloads on the menus to pick it up (never mid-run).
let newerBuild = '';
/** Load the newer build: a fresh URL (so a cached copy of the page can't come back), at most once per build. */
function reloadFresh() {
  const q = new URLSearchParams(location.search);
  if (!newerBuild || q.get('v') === newerBuild) return;
  q.set('v', newerBuild);
  q.set('level', LEVEL.id);
  location.replace(`${location.pathname}?${q}`);
}
async function checkForUpdate() {
  try {
    const r = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return;
    const { build } = (await r.json()) as { build: string };
    newerBuild = build && build !== __BUILD__ && !__BUILD__.startsWith('dev') ? build : '';
    if (newerBuild && (app === 'title' || app === 'results' || app === 'journal')) reloadFresh();
  } catch { /* offline: carry on with this copy */ }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) void checkForUpdate(); });
if (!SHOT && location.protocol.startsWith('http') && location.hostname !== 'localhost') void checkForUpdate();
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
  /** Test hook: carry the run on from design-meter distance d (smoke tests reach a fork without playing to it). */
  warp: (d: number) => { session.resumeAt(d * (LEVEL.length / 1100)); resetWorld(); },
  text: (id: string) => $(id).textContent,
  /** Design-meter distance of the first hazard of a type. */
  firstOf: (type: string) => (LEVEL.hazards.find((h) => h.type === type)?.d ?? 0) / (LEVEL.length / 1100),
  /** Design-meter distance where the n-th fork's fin starts. */
  forkNose: (n: number) => (LEVEL.hazards.filter((h) => h.type === 'spine')[n]?.d ?? 0) / (LEVEL.length / 1100),
  /** Test hook: set a shared world uniform (e.g. uDapple) on this page's own materials. */
  uniform: (name: keyof typeof worldUniforms, v: number) => { (worldUniforms[name] as { value: number }).value = v; },
  stats: () => { const c = streamer.stats(); return { chunks: c.chunks, cached: c.cached, chunkTris: c.tris, calls: stage.renderer.info.render.calls, tris: stage.renderer.info.render.triangles }; },
};
if (!SHOT) requestAnimationFrame(frame);
else draw();
