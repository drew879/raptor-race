# Raptor Race: Game Design Document

Status: living document. Decisions marked **[Decided]** were approved by the owner or taken as the recommended default ("your call").

## 1. Pitch
A premium portrait-mode 3D endless-runner-style racer. You play a **feathered raptor racing home across the Cretaceous** before disaster hits. Every level is a different real raptor in its real habitat, so the roster doubles as a tour of where these animals actually lived. Tone: polished, warm, a little educational (fossil facts, Field Journal codex), never cartoony.

## 2. Platform and business model
- **[Decided]** Web tech (TypeScript + Three.js + Vite). Runs in mobile browsers now; wrapped with Capacitor for App Store / Play later.
- **[Decided by owner]** Free for now: no ads or IAP while building; revisit before any store release. Amber economy is designed so IAP could slot in later.
- **[Decided by owner]** Feathered raptors (scientifically grounded, distinct from film raptors).
- **[Decided by owner]** Art pipeline: headless Blender (bpy) for the hero raptors and key art (app icon, store images); environment props and hazards stay code-generated.
  - **Outcome:** the Blender raptor body lost two blind A/B reviews to the code-built one, so gameplay raptors stay code-built and Blender is used for key art.
- **[Decided by owner]** Check-ins: a playable link plus a one-page report at each milestone (M2, M3).
- Orientation: portrait only. Target devices: iPhone 12 class and mid-range Android and up.

## 2b. Direction change after first playtest (owner, M1 review)
Owner playtest on iPhone: fun 1-2/5, graphics 1-2/5 ("boxy, low-res, not close to AAA"), too slow, repetitive, no artistic identity, too close to Temple Run. Deaths felt fair; controls mostly good. Decisions:
- **[Decided by owner]** Core fantasy flips to **hunt and pounce**: you are the hunter. The level ends with a successful pounce on the prey (Level 1: a Protoceratops, a nod to the real "Fighting Dinosaurs" fossil from the same Gobi formation) instead of arriving at a nest.
- **[Decided by owner]** Art: research **freely available assets** (license must allow commercial use) to replace code-generated models where they raise quality.
- **[Decided by owner]** Before choosing an art direction, owner sees **examples of each** candidate direction (field journal ink and watercolor, paleo-art mural, amber-lit cinematic, bold graphic).
- **[Owner priority]** Speed and pacing first: faster start, stronger sense of speed, more variety.

**[Decided by owner, after the art direction review]**
- **Look: the hybrid** (field-journal ink, watercolor and paper on a bold graphic value plan). See docs/ART_BIBLE.md.
- **Assets stay free.** No paid models. A scaly raptor is acceptable if that's what keeping it free requires (feathered remains preferred; avoid film-raptor design cues either way).
- **Hunt design approved** as below. The prey changes by level (Level 1: Protoceratops).

Hunt design (approved):
- The prey runs ahead and stays visible. Clean running, combos and boosts close the gap; stumbles let it pull away. If it gets out of sight, the hunt fails (retry from checkpoint).
- Final stretch: when within range, "Swipe up to pounce" with a brief slow-motion moment, then a tasteful freeze-frame (Field Journal style) before results.
- **[Decided by owner]** Instead of 90° swipe turns: **forks** (a tall sandstone fin fills the middle lane for ~3-4 s; each side lane is its own route, one rough with more amber, one easy; you can't cross the fin, swipes into it are refused with a soft bump) and **automatic bends** (the track curves left and right on its own; purely visual, no input).
- **[Decided by owner, playtest 4]** No distance meter: you judge the gap by eye; a one-time "It's getting away!" warning when the prey pulls 32 m ahead. Inclusion rewards: Field Journal pages, a plumage for all 3, and chapter gates (levels in groups of three; catching the prey opens the next level; 8 of a chapter's 9 inclusions open the next chapter; found inclusions are kept forever, with a location hint after two runs that miss one; no amber trade).
- **Field Journal (built):** one page per inclusion. Level 1's pages: a feather (Grassy Lake, Alberta amber, about 80 million years old; McKellar et al. 2011 found feathers in 11 of ~4,000 pieces, some dinosaur-like, some bird-like), a tick (99-million-year-old Myanmar amber, a tick gripping a feather; the same 2017 study named Deinocroton draculi), an ant (Sphecomyrma freyi, New Jersey amber ~92 million years old, described 1967, long the oldest known ant). A footnote is honest that real blue amber is Dominican and far younger (age debated, ~15-40 million years). Hints name where an inclusion is after two runs that miss it.
- Opening shot (~3.5 s, tap to skip): a close three-quarter view of the prey grazing with a Field Journal quarry card; it looks up, bolts, and the camera cranes back behind the raptor as the run begins ("Hunt!").
- The pounce lands the raptor on the prey's back and holds it there in the raptor-prey-restraint pose (feet gripping, wings beating for balance, head down). No bites, no blood. The prey braces with its head thrown up. The freeze-frame holds that moment.
- Eggs no longer fit (no nest). Replacement rare collectible: **amber with an insect inclusion** (3 per level), which feeds the Field Journal and strengthens the amber motif.

## 3. Controls
| Input | Action |
|---|---|
| Swipe left / right | Change lane (3 lanes) |
| Swipe up | Jump |
| Swipe down | Slide. While airborne: fast-fall straight into a slide |
| Keyboard (dev) | Arrow keys / WASD, space = jump |

Feel rules: 120 ms input buffer, 100 ms coyote time, hitboxes ~80% of visual size, lane change ~0.18 s with ease-out. No 90-degree turns: swipes are dedicated to lanes, and the world bends gently toward the horizon (curved-world shader).

## 4. Run rules
- Levels are **finite courses** (~90 to 120 s) ending at the raptor's nest. Endless "Expedition" mode per raptor unlocks after its level is beaten (later milestone).
- **Stumble**: clipping an obstacle from the side. The chaser closes in and the combo resets.
- **Caught**: two stumbles within ~8 s, or any head-on hit.
- On caught: **Revive** once per run for amber (cost escalates later), or **restart from last checkpoint**.

## 5. Collectibles and economy
- **Amber** (soft currency): glowing drops of tree resin, placed in trails that teach the right line (arcs over jumps, low under slides, weaving lanes). Spent on revives, plumage color morphs, power-up upgrades.
- **Eggs**: 3 hidden per level on riskier lines (the storm scattered the clutch). Collecting all 3 earns a star.
- Amber pickup sound: soft glassy tick that climbs a pentatonic scale along a chain and resets after ~0.6 s gap; slight random detune.

## 6. Scoring and stars
- Score = distance (1 per m) + amber (10 each) x combo multiplier + near-miss bonus (+50) + eggs (500 each).
- Combo multiplier x1 to x5: +1 per 25 amber collected without stumbling. Stumble resets to x1.
- Stars per level: (1) finish, (2) all 3 eggs, (3) beat par score. Par is set from bot runs: Level 1 par 12,000 (perfect bot 14,300; human-like bot average ~13,100).
- Stars unlock subsequent levels.

## 7. Power-ups
- POC: **Amber Sense** (magnet, 8 s) and **Updraft** (glide over a section on spread wing feathers).
- Later: **Raptor Sprint** (invulnerable dash), **Golden Feather** (2x score), **Pack Call** (packmate collects amber in another lane).

## 8. Level 1: "Flaming Cliffs"
Velociraptor mongoliensis, Gobi Desert, Mongolia, ~75 mya. The first Velociraptor fossil was found at the Flaming Cliffs (Bayanzag) in 1923.

Story: get home to the nest before a sandstorm buries you (a nod to how many Gobi fossils were likely preserved under collapsing dunes). The **sandstorm is the chaser**: it creeps in from the screen edges when you stumble.

Length ~1.1 km, speed 10 to 14 m/s (~92 s), 2 checkpoints.

| Beat | Content | Teaches |
|---|---|---|
| 1. Dawn dunes | Amber trails weave lanes | Lane change |
| 2. Boulder field | Boulders block lanes, low rock ledges, amber arcs over them | Jump |
| 3. Sandstone arches | Arches and dead branches, Egg 1 under a side arch | Slide |
| CP1 | Protoceratops nesting ground: resting animals block lanes, one wanders across (telegraphed) | Moving obstacle |
| 5. Ravine | Updraft glide over a ravine full of amber, Egg 2 high in the glide path | Power-up |
| CP2 | Storm rises: jump then slide, lane then jump, swooping pterosaur (slide), bleached ribcage arch, Egg 3 needs jump then lane change | Combos |
| 7. Final dash | Run into the nest, raptor settles, camera orbits, results | Celebration |

**As built after playtest 4 (supersedes the table above where they differ):** jumps are **dry gullies** (cut across all three lanes, banded walls) and **flat sandstone slabs** (one lane each, pale top, banded front); no logs (the owner: they don't belong in the Gobi), no cacti (they only evolved in the Americas, ~35 mya). Landmark stretches: dawn dunes (0-290, design m), a **Flaming Cliffs canyon** for the slide lessons (290-430), a **hoodoo garden** with the first fork (430-600), an open **basin** for the updraft glide (600-700), a **bone field** (700-790), a **herd of Protoceratops** along the trail's edges as the storm rises (790-1020), and open **flats** for the final dash (1020-1100).

Difficulty target ("fairly easy"): a bot with ~300 ms reactions and occasional input errors clears it at least 85% of the time.

## 9. Roster
| # | Raptor | Setting | Twist |
|---|---|---|---|
| 1 | Velociraptor | Gobi dunes, Mongolia (~75 mya) | Nimble baseline; sandstorm chase |
| 2 | Deinonychus | Floodplain forests, Montana (~110 mya) | Pounce: higher, longer jump; Tenontosaurus herds as moving obstacles |
| 3 | Utahraptor | Utah (~135 mya) | Heavyweight: smashes small obstacles, slower lane changes; quicksand (nod to the real fossil block where several were likely trapped) |
| 4 | Microraptor | Forest canopy, China (~120 mya) | Four-winged glider: long glide sections |
| 5 | Acheroraptor | Hell Creek, Montana (~66 mya) | Finale: T. rex chase as the asteroid lights up the sky |

## 10. Proof-of-concept scope
Splash, title (raptor idling, amber logo), level map (Level 1 open, 4 locked silhouettes), pre-run card (fossil fact + objectives), run (HUD, pause, settings: music / SFX / haptics), results (score, amber, eggs, stars with animation), plumage screen (3 morphs purchasable with amber). Local save.

## 11. Milestones and gates
| Gate | Deliverable | Owner input |
|---|---|---|
| M0 Style tile | In-engine hero scene: raptor, environment, amber, palette, UI motif | Approve the look |
| M1 Greybox | Playable Level 1 with core rules | Does it feel good? |
| M2 Vertical slice | Level 1 with final art, audio, meta screens | Polish feedback |
| M3 Release candidate | Perf on device, packaging | Ship decision |

## 12. Open questions
- **[Decided by owner]** Owner has a MacBook Pro: the iOS build (Capacitor + Xcode) happens there at M3.
- **[Approved by owner]** Dedicated cloud environment for this repo with a setup script that preinstalls npm deps and headless Blender.
