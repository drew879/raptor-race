# Raptor Race: Technical Design

## Stack
TypeScript, Three.js, Vite, Vitest (unit tests), Playwright (headless phone-emulation screenshots, bots, perf). Capacitor wrapping later (M3).

## Architecture
```
src/
  core/      loop (fixed timestep), seeded rng, pools, input (swipe + keys), math utils
  game/      config (all tunables), runner state machine, level data + streaming, collision, scoring, chaser
  render/    renderer, camera rig, shared materials (curved world + rim), sky, terrain, props, raptor, fx
  audio/     sfx synth, music
  ui/        DOM overlays (HUD, menus), CSS
  pages/     entry points (game, style tile)
```
- **Deterministic simulation**: game logic runs at a fixed 60 Hz step from a seeded RNG, independent of rendering. Replays (seed + input log) reproduce a run exactly. Bots and screenshot tests rely on this.
- **Rendering** interpolates between sim states. A `?shot=` / `window.__rr` test hook can freeze time and step frames for capture.
- **All gameplay tunables** live in `src/game/config.ts`.
- **Art is generated in code**: meshes are built procedurally (lofted low-poly tubes, faceted props), colored with vertex colors, and the raptor is a single skinned mesh animated procedurally (speed-adaptive run cycle, jump, slide, glide, stumble).
- **One shared material family** (Lambert-based, flat-shaded, vertex colors) patched with the curved-world bend, rim light and fog so the whole world matches.
- **Levels** (`src/game/levels.ts`): each `LevelDef` names its biome (`gobi` | `forest`), hero (`velociraptor` | `caudipteryx`), prey (`protoceratops` | `egg`) with its own hunt tuning, music, and an optional visual hill (`slope`); on-screen text per level is in `src/game/level-copy.ts`. The game page builds one level when it loads (`?level=<id>`, else the last one played, else the roster's first) and reloads the page to switch, so nothing level-specific is rebuilt mid-session.
- **Biomes:** a palette (`palette.ts`), a chunk builder (`world/terrain.ts` for the Gobi, `world/forest.ts`), obstacle dress (`world/hazards.ts`, `world/forest-hazards.ts`; same collision boxes), and the stage's light, fog, sky dome, backdrop and the post pass's sky bands and haze (`LookPipeline.setSky`).
- **Hills** (`HILL_GLSL` in `materials.ts`): the simulation stays level; every world shader (materials, halos, particles) raises or drops a vertex by a smooth hill profile along the course relative to the camera, so a downhill reads on screen while trees stay upright. The chase camera aims down by the local grade.
- **Heroes share one skeleton:** Caudipteryx has the raptor's bones with its own rest positions, so `RaptorAnimator` (given the rest positions) drives both; its finale is a `brood` pose instead of the `pin`.

## Budgets (per frame, target device)
| Metric | Budget |
|---|---|
| Frame rate | 60 fps on iPhone 12 / mid Android |
| Draw calls | < 150 |
| Triangles | < 150k (terrain in view, worst case: Gobi ~100k, forest ~54k) |
| Device pixel ratio | capped at 2 |
| JS heap | < 150 MB |
| Download (gzipped) | < 10 MB |
| Cold load to title | < 3 s on 4G |

The cloud dev box renders WebGL in software (SwiftShader), so frame rate there is meaningless. Automated checks measure GPU-independent costs (draw calls, triangles, CPU frame time). Debug builds show an fps / frame-time overlay (`?debug=1`) for on-device numbers.

## Verification harness
- `npm test`: unit tests (input gestures, lane logic, collision, scoring).
- `npm run shots`: Playwright phone-emulated screenshots of named scenes to `artifacts/shots/`.
- Later: `npm run bot` (perfect bot + human-like bot), golden-image regression checks, perf capture.
