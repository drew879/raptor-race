# Progress Log

Newest first. Every session updates this before pushing.

## Current milestone: M0 + M1 gate (awaiting owner review; see docs/GATE-M0-M1.md)

### Blender raptor (owner decision)
- [x] Headless Blender 5.2.3 verified (on-demand install: scripts/setup-blender.sh)
- [x] scripts/blender/raptor.py: skin-modifier body, subdivision, decimation to 3,600 tris, spine-relative plumage, baked AO, auto-weighted rig matching BONE_DEFS, .rrm export (68 KB)
- [x] Game uses the Blender body with code-built eyes and feathers; procedural animation unchanged
- [ ] Blind A/B review vs the code-built raptor

### M1 Playable Level 1
- [x] Swipe + keyboard input (fires on threshold, not release), runner with buffering, coyote time, fast-fall, glide, bounce
- [x] Level DSL and Level 1 course (lanes, jumps, slides, magnet, updraft glide, storm combos, 3 eggs, 2 checkpoints, nest)
- [x] Pure session sim: collisions (front/side/graze), sandstorm chaser, combo, checkpoints, revive, stars, par
- [x] Gameplay bot + tests: perfect run clean with 3 eggs; human-like 93% within one revive
- [x] Game page: title, field journal card, HUD with progress trail, hints, storm overlay, pause, caught, results, save
- [x] Synthesized SFX wired to events; FPS overlay toggle in pause menu
- [x] Single-file packaging for publishing (per-page builds, inlined fonts)

### M0 Style tile
- [x] Design docs (GDD, Art Bible, Audio Bible, Tech)
- [x] Project scaffold (Vite + TS + Three.js), fonts bundled (OFL)
- [x] Procedural raptor: skinned low-poly mesh, IK run cycle, jump, slide, idle, lean, stumble, land
- [x] Gobi environment: gradient sky, tiered backdrop buttes, dune terrain chunks, mesas, scrub, rocks, dead trees, ribcages
- [x] Amber (instanced, glow halos), eggs, hazards (boulder, ledge, wide ledge, arch, rib arch), dust and sparkle particles
- [x] UI motif: amber logo, gem and paper buttons, HUD tags, field-journal card
- [x] Screenshot harness (`npm run shots`, `scripts/lab-shots.mjs` for asset turntables)
- [x] Art critic round 1 (fail, 5-7/10): relit (sun behind-right, physically correct intensities, neutral tone mapping), rebuilt raptor head/pattern/thighs/feathers, eroded arch, ink-outlined collectibles, new logo
- [x] Art critic round 2 (fail, 5-7/10): fixed inside-out amber and egg faces (with a winding unit test), lengthwise streak pattern, S-neck, round eye and brow, fanned primaries, smooth hazard shading (no quilt), lower arch, weathered bone, layered backdrop with sunk bases
- [x] Art critic round 3 (7,7,6,7,6,6,7): not yet a pass; quick wins applied (logo extrusion, egg halo, bone tone, cooler raptor with cool rim, tighter shadows); remaining items escalated in docs/GATE-M0-M1.md
- [x] Published style tile and playable build for owner review
