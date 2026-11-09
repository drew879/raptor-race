# Raptor Race

Portrait-mode 3D runner for mobile, built with TypeScript + Three.js + Vite. Owner reviews builds from the Claude iOS app; optimize for autonomous progress with clear gates.

## Read first
- `docs/GDD.md` game design (source of truth for rules and content)
- `docs/ART_BIBLE.md` look, palette, rubric
- `docs/AUDIO_BIBLE.md` sound rules
- `docs/TECH.md` architecture and budgets
- `docs/PROGRESS.md` what's done and what's next (update it before every push)

## Commands
- `npm run dev` dev server
- `npm run build` production build to `dist/` (relative base, publishable as a static page)
- `npm test` unit tests
- `npm run shots` phone-emulated screenshots to `artifacts/shots/`
- `npm run typecheck`

## Conventions
- All gameplay tunables in `src/game/config.ts`. No magic numbers in systems.
- Simulation is deterministic (fixed 60 Hz step, seeded RNG). Never use `Math.random()` in game logic; use `core/rng`.
- All art is generated in code. Colors come from the palette modules that mirror the Art Bible.
- Units: meters and seconds. +Y up, the runner moves toward -Z.
- Keep draw calls low: merge static geometry, use InstancedMesh for repeated props.
- Commit small, push often (the cloud container is ephemeral).
- Never put model names or IDs in commits, code or docs.
