# Progress Log

Newest first. Every session updates this before pushing.

## Current milestone: rework after owner playtest (fun 1-2/5, graphics 1-2/5)
- [x] Speed: Level 1 runs 15-21 m/s (was 10-14), course scaled 1.5x so every reaction window keeps its duration; snappier lane change (0.14 s); lower, closer camera with speed FOV kick; edge streaks; near-track scenery
- [x] Fixes: swipe down no longer cancels the updraft; crash screen names the real cause; stumbles flash, shake and thicken the storm; hitches logged on the results screen
- [x] Stutters: terrain for the whole level is pregenerated on the menus (chunks cost 10-27 ms each on desktop), shaders precompiled, per-frame allocations removed
- [x] Bot look-ahead is time-based; perfect run 16,300 with 3 eggs; human-like 96% within one revive; par raised to 14,000
- [x] Free asset research -> docs/research/free-assets.md (scenery, skies and textures are free and good; no free premium feathered rigged raptor; best bases are CC-BY; paid ~$79-110 or commission)
- [x] Art direction research -> docs/research/art-direction-references.md (journal 22, graphic 22, mural 16, amber 15; recommends journal surface on graphic structure)
- [x] In-engine treatments for all four looks plus the hybrid (src/render/post/looks.ts, looks.html, scripts/look-shots.mjs); published comparison page for the owner
- [x] Owner picked the hybrid look; assets stay free (scaly acceptable); hunt approved with prey per level
- [x] Hybrid look in the game: one production post pass with baked noise, MSAA, adaptive resolution
- [x] Scanned scenery (Poly Haven CC0) via Blender: boulders x3, ledges, cliffs, rocks, dead quiver trees, bushes (CREDITS.md)
- [x] Hunt: prey runs ahead and steers around boulders, gap closes with clean play and widens 8 m per stumble, lost at 46 m, finale pounce window with slow motion, side-on pounce camera, Field Journal freeze-frame plate, "It got away" screen
- [x] Amber inclusions (amber with a trapped insect) replace eggs
- [x] Tests: perfect bot pounces with 3 inclusions; human-like 96% within one revive, never loses the prey
- [x] Playtest 3 readability: hunt meter with raptor and Protoceratops icons; blue amber inclusions with a trapped insect and a first-encounter pause callout; raptor stops running on menus and after a crash
- [x] Protoceratops rebuilt: deep boxy head with hooked beak, cheek flares, big eyes and a broad frill (a cone, so it reads from the front, side and behind); deep body with high hips; crested tail; short bent legs. Poses: run, graze, alert, pinned
- [x] Opening shot: close on the grazing Protoceratops (quarry card), it looks up and bolts, the camera cranes back behind the raptor, "Hunt!" (tap to skip; `?nointro` skips it)
- [x] Finale: the pounce lands the raptor on the prey's back and holds it there (raptor-prey-restraint pose: crouched, feet gripping, wings beating, head down; no gore), framed from ahead in three-quarter view, then a true freeze-frame plate
- [x] scripts/hunt-shots.mjs captures the intro, pounce and plate; lab.html shows `subject=proto|pin`
- [x] Playtest 4 fixes: crashing into a fork's fin froze the run (no crash text for the fin, so the crash screen never showed); crash text is now typed over every obstacle and the crash and "got away" screens follow from the game loop; smoke test drives the real page into the fin
- [x] Fork 1 moved off the updraft landing into Beat 4 (tests: no fork within 3 s of a glide landing, no checkpoint inside a fork); the raptor stops the moment it crashes; distance meter removed with an "It's getting away!" warning at 32 m; bends about 3-6x stronger at mid range with a soft far limit
- [ ] World pass (approved): dry gullies and flat sandstone slabs as the jumps; landmarks and set pieces
- [ ] Music v2 (approved): real melody and groove, mallet timbres, 120 BPM, amber spaced on eighth notes, chimes snap to the beat
- [ ] Field Journal (approved): inclusion pages with hints after two misses, dusk plumage for all 3, chapter gates (3 levels each; 8 of 9 inclusions open the next chapter; found inclusions kept forever; no amber trade)
- [ ] Later: Level 2 (new raptor and prey); forks that split into two full three-lane paths
- [x] Forks: a sandstone fin down the middle lane splits the trail into two routes (one rough and rich, one easy); swipes into the fin are refused with a soft bump; the prey takes the easy side; Level 1 has two (design 704-750 and 922-968)
- [x] Automatic bends: a lateral view-space bend (sim stays straight), far scenery swings round, the camera banks; nine bends in Level 1
- [x] Pacing pass: every decision-free stretch over ~2.5 s filled (was up to 6.3 s; now only the opener, which carries the "Hunt!" banner and lanes hint, runs 3.9 s). Fills favour dodges over jumps to keep it fairly easy: human-like bot 90% within one revive, never loses the prey
- [x] Adaptive synthesized music: hand drums, shaker, wind, plucked motifs in C# minor pentatonic (in key with the amber chimes); builds with the hunt, sting on the pounce, separate Music toggle; levels checked offline
- [ ] Variety: landmarks and set pieces (canyon walls, hoodoos, bone fields, herds), terrain sections

## Previous milestone: M0 + M1 gate (see docs/GATE-M0-M1.md)

### Blender raptor (owner decision)
- [x] Headless Blender 5.2.3 verified (on-demand install: scripts/setup-blender.sh)
- [x] scripts/blender/raptor.py: skin-modifier body, subdivision, decimation to 3,600 tris, spine-relative plumage, baked AO, auto-weighted rig matching BONE_DEFS, .rrm export (68 KB)
- [x] Game uses the Blender body with code-built eyes and feathers; procedural animation unchanged
- [x] Blind A/B review round 1: code-built raptor won (~70%): Blender body lost toes and sickle claw to decimation, rounded saddlebag hips, nose ball, poor chase-camera read; Blender plumage streaks were better. Game default reverted to the code body.
- [x] Round 2 (Blender relabeled A): code-built raptor won again (~65%); Blender mesh also showed decimation holes. Decision: code-built raptor for gameplay; Blender for app icon and store key art (M3). Applied the winner's top fixes: tapered cream back streaks for the chase camera, pale belly to the flank midline, leaf-shaped tail fan, heavier thighs, larger sickle claw.

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
