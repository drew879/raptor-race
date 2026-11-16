# Progress Log

Newest first. Every session updates this before pushing.

## Current milestone: new Level 1, Jehol Forest (owner playtests 6-7)
- [x] Music: Chase Strings is the default (owner's pick) with a string bed from bar 1 and a swell on the pounce window; a proper ending (held fifth through the leap, landing on C# major ringing over the plate) replaces the abrupt stop and the off-key jingle; pterosaur screech fixed
- [x] Levels carry biome, hero, prey, hunt tuning, music, hill and copy; the page builds one level at load (`?level=`, else the last played); pick a level in the Field Journal, the results card offers the next
- [x] Caudipteryx (Oviraptor's cousin, owner pick for a forest): same skeleton and animations as the raptor, its own body, banded tail and hand fans, a brood pose; 1.2x scale; plumages Forest Fan and Sunrise
- [x] The egg: rolls, wobbles and bounces as the chick kicks (drawn 1.4x while rolling), twitches and rocks in its nest for the opening, hatches when caught (the chick wears the cap)
- [x] Jehol Forest: dirt trail with ragged mossy verges, conifers, ginkgos, tree ferns, ferns, horsetails, brimming streams, a misty valley backdrop with a volcano; forest dress for every obstacle (trees, logs, hollow trunks, propped trunks, a fallen giant); a hill profile (crest at the nest, level at the bottom)
- [x] Opening: it walks up to the nest, the egg twitches, rocks and rolls off downhill; ending: the scoop, the hatch, "Hatching Day" plate
- [x] The tutorial course, three new inclusion pages, tests (spacing, beat grid, bots: within one revive 95%); Level 2 a little harder (16-22.5 m/s, within one revive 83%)
- [x] Owner playtest of the new Level 1: opening length right, egg easy to follow, slides and jumps read, difficulty right for Aidan, ending lands, Level 2 the right amount harder; downhill only "a little"; obstacles and heroes look basic
- [x] Graphics test (owner approved the three-version plan after an outside review): a pause-menu switch, Graphics 1/2/3 (saved; `?look=`), default 1
  - Version 2: gentler post pass (soft blended value bands, less wobble, light interior ink, ink fading 30-100 m), crease-angle smooth shading on both heroes and the egg, broad rounded feathers, Caudipteryx's fan on its own pivot (~45 degrees running, opening on jumps, turns, the brood), a dark nape from behind, a matte egg with a contact shadow, the camera a little closer
  - Version 3: version 2 plus a hillside trail (bank on one side, a drop on the other, swapping sides; openings onto the valley; streams cascade down the drop), planted clusters (a tree with roots, ferns, rocks and shade under it, with gaps), dappled canopy light (sun spots on the ground, obstacles and characters), worn running strips for the lanes with flat seam stones, richer obstacles (bark ridges, moss, roots, splintered ends); same triangle budget as version 1
- [x] Owner picked version 3 (all three smooth on the phone); it's the default now. Lane strips help; obstacles better; heroes subtly better
- [x] Home Screen copies went stale (the icon opened an old build). Now: the build number on the title, and an update check whenever the app opens or comes back (it reloads on the menus to a fresh URL, once per build). Title ‹ › arrows switch between open levels
- [x] Playtest 8 fixes: "Run again" brought back a hatched egg (now whole again); the chick rebuilt (rounder, smooth, pale down, crest, egg tooth, glossy eyes); the opening shows hatching (cracks spread in three stages with taps from inside and chips of shell, a beak pokes through as it rocks, "It's hatching!"); trees standing in the trail have crowns (they looked like bare poles); the game fills the visible screen in a phone browser (a strip showed at the bottom in Chrome)
- [x] Downhill still only read "a little" (owner); owner left the pick to me (steeper pitches, valley views, camera tilt). Built behind `?hill=2` for a before-and-after check:
  - Steeper pitches: a 0.10 grade with five 0.35 pitches, each in an open stretch, tipping over just past one obstacle and levelling out just before the next (you look down onto it). A test checks no obstacle hides behind a crest (the least warning is 3.15 s, a stream at 310 m, against 3.27 s on the steady grade)
  - The camera follows the hero down but tilts only 30% of the way to the trail ahead, so the trail falls away below
  - The drop side falls further (to ~50 m below), with a canopy of treetops all the way down (tops kept below the trail) and more, longer openings; the far ridges and valley floor rise toward you as you descend
- [x] Home Screen app: a strip still showed at the bottom (browser fine). iOS reports a short viewport there; the game now sizes to the screen in the Home Screen app, and the page behind it is the ground's color
- [ ] Owner: the before-and-after clip; flip `?hill=2` to the default on a yes
- [ ] Next (owner): a brief for rebuilding Level 1 from scratch as a comparison

## Previous milestone: rework after owner playtest (fun 1-2/5, graphics 1-2/5)
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
- [x] World pass: dry gullies cut into the terrain across all lanes (walls, floor, a dark wash at the ends; falling in is a crash) and flat lane-wide sandstone slabs replace the scanned ledges; landmark stretches in Level 1 (Flaming Cliffs canyon, hoodoo garden, open basin, bone field, a Protoceratops herd at the trail's edges, flats); terrain ~100k tris in view (canyon ~160k), still one draw call per chunk; herd is two instanced draw calls. scripts/scenery-tour.mjs warps through each stretch
- [x] Music v2: an eight-bar kalimba and marimba theme over hand drums and bass at 120 BPM, clocked from the run itself; every amber piece placed on the beat grid (lines on eighths, slides and jump arcs on sixteenths) and each chime snaps to the beat as a chord tone; par moved to 13,000 (amber is a little sparser late in the level)
- [x] Field Journal: the title's Field Journal button opens a scrolling journal with chapters, level cards (stars, best, lock reasons), a page per amber inclusion (ink drawing and a fact-checked note on Cretaceous amber: feathers in Alberta amber, a tick gripping a feather in Myanmar amber, Sphecomyrma the wasp ant), location hints after two runs that miss one, a note on why our amber is blue, and plumages
- [x] Dusk plumage (charcoal, rust bars, orange flash) unlocks with all 3 inclusions; picked on the pre-run card (preview, owner to approve)
- [x] Chapter gates (src/game/journal.ts, tested): chapters of 3 levels; catching the prey opens the next level; 8 of a chapter's 9 inclusions open the next chapter; Levels 2+ show as "Coming soon" until they exist
- [x] Inclusions are now saved the moment you pick one up (before, only on finishing the level)
- [x] Playtest 5: slide obstacles read as jumpable, so the arch is now a tall sandstone overhang with a low dark tunnel and the rib bones a fallen giant's ribcage hanging over the trail; collision tops raised above any jump (tests: a jump at its peak hits both; no tall obstacle inside a glide)
- [x] GitHub Pages: workflow deploys every push to https://drew879.github.io/raptor-race/ after typecheck and tests; Add to Home Screen support (manifest, iPhone web-app tags, icon drawn in code); verified the build runs from the /raptor-race/ sub-path. The Claude artifact link is retired (owner)
## Level 1 wrap-up (owner approved A-D, playtest 5; I stage it)
- [x] D. Journal discoverability: results screen offers "N new journal pages", the title's Field Journal button shows a "new" badge, the journal opens at the new pages with a New tag
- [x] B. Music engine takes the arrangement as data (src/audio/music-styles.ts); two darker candidates built and loudness-matched (War Drums: C# Phrygian, taiko, drone, horn, brass; Chase Strings: harmonic minor, spiccato strings, kit, violins); previews sent
- [x] B. Owner picked Chase Strings (playtest 6): now the default, with a warm string bed from the first bar and a rising swell when the pounce window opens; levels can name their own arrangement (`music` in the level definition)
- [x] Playtest 7: the ending stopped too suddenly and the victory jingle was in the wrong key. Now the pounce holds a swelling chord over a drum roll and the landing resolves to a big C# major chord that rings out over the journal plate
- [x] Fix: the pterosaur's screech threw an audio error on its breath layer (a shadowed variable), costing one frame and half the sound; sound playback can no longer interrupt a frame
- [x] C. Nesting ground after fork 1: nests with eggs along the trail, Protoceratops resting in lanes (jump or go around), and one that gets up and walks across to another lane as you approach (the level's moving obstacle, settled ~1 s before you arrive). A pterosaur dives in from high ahead with a screech and swoops across all lanes at head height in the storm (slide). Pooled models, so nothing is built mid-run; tests cover the crossing and each new obstacle
- [x] A. Graphics polish, driven by an independent art review (baseline: no rubric item at the pass bar of 8; raptor appeal, lighting and polish at 4):
  - Light and sky: sky bands by view elevation (cream haze, rose-apricot, lavender, dusty blue; ochre in the storm), aerial haze in soft layers, warm lights and cool violet shadows, sun lowered to ~22 degrees and warmed, warm rim on characters; ink fades with distance and a two-scale contour test removes speckle
  - Raptor: continuous tail vanes with a teal tip band, folded wings with a ragged trailing edge, crest ridge on head and neck, broader skull, fuller thighs, springier run with tail counter-sway and a wing flick
  - Ground: ripple hatching and crust on flat sand (world space, fades by 28 m), palette sand beside the track, footprints behind the raptor and the prey's trail ahead
  - Effects: darker, bigger dust; sand kicked up on lane changes; bigger landings; sand streaming off dune crests; sheets of sand in the storm; a burst of sand on the pin
  - Blind before/after review (sets unlabeled): after wins on every item but UI (style 5 to 7, readability 6 to 7, raptor 5 to 6, lighting 4 to 7, composition 5 to 6, polish 3 to 5). Its follow-ups done: canyon wall winding, softer smaller prints with a quadruped print for the prey and a fade near the lens, palette sky bands (no grey), cream back streaks and fewer wing shards, eye patch only at the eye, smooth frill edge, pin pose clear of the frill
  - Also: procedural canyon strata walls (scans broke into shards; canyon terrain 160k to 84k triangles), Protoceratops with a solid scalloped frill and tapered bent legs
- Amber stays score only (owner). After the wrap-up: a new Level 1 with an Oviraptor chasing a runaway egg downhill; this level becomes Level 2 (owner, for Aidan)

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
