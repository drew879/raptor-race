# Raptor Race

Portrait-mode 3D runner for mobile, built with TypeScript + Three.js + Vite. Owner reviews builds from the Claude iOS app; optimize for autonomous progress with clear gates.

## Read first
- `docs/GDD.md` game design (source of truth for rules and content)
- `docs/ART_BIBLE.md` look, palette, rubric
- `docs/AUDIO_BIBLE.md` sound rules
- `docs/TECH.md` architecture and budgets
- `docs/PROGRESS.md` what's done and what's next (update it before every push)

## Working with the owner
- Present plans first and wait for the owner's feedback before building anything new. Ask clarifying questions before builds unless told otherwise.
- Check in at each milestone with a published build and specific playtest questions.
- When a reply holds several questions, the last message must stand on its own: restate everything that still needs an answer (including open items from earlier messages) and end with a plaintext, copy-paste template of numbered items ready to fill in.
- Double-check facts, math and measurements before presenting them.
- Writing style for owner-facing text: direct and conversational, plain words, contractions, no em dashes, no "it's not X, it's Y" constructions.

## Commands
- `npm run dev` dev server
- `npm run build` production build to `dist/` (relative base, publishable as a static page)
- `npm test` unit tests
- `npm run shots` phone-emulated screenshots to `artifacts/shots/`
- `npm run typecheck`
- `node scripts/play-shots.mjs <dir>` bot plays Level 1 in the real page and captures phone screenshots
- `node scripts/audio-check.mjs` renders every SFX and the music offline and checks levels
- `node scripts/music-preview.mjs <out.wav>` renders a listenable music preview (low, then full intensity, with amber chains)
- `node scripts/smoke.mjs` drives the real page into crashes (including a fork's fin) and checks every crash reaches the crash screen
- `node scripts/hunt-shots.mjs <dir>` captures the opening shot, pounce and freeze-frame plate
- `node scripts/scenery-tour.mjs <dir> [marks]` warps the real page through each landmark stretch and captures it without banners
- `node scripts/package-artifact.mjs <page> <name> "<Title>"` single-file build for publishing
- `scripts/setup-blender.sh` installs headless Blender on demand (slow download; built models are committed)
- `/opt/blender-venv/bin/python scripts/blender/raptor.py` rebuilds the raptor body into `src/assets/models/`

## Conventions
- All gameplay tunables in `src/game/config.ts`. No magic numbers in systems.
- Simulation is deterministic (fixed 60 Hz step, seeded RNG). Never use `Math.random()` in game logic; use `core/rng`.
- All art is generated in code. Colors come from the palette modules that mirror the Art Bible.
- Units: meters and seconds. +Y up, the runner moves toward -Z.
- Keep draw calls low: merge static geometry, use InstancedMesh for repeated props.
- Commit small, push often (the cloud container is ephemeral).
- Never put model names or IDs in commits, code or docs.
