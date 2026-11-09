# Raptor Race: Game Design Document

Status: living document. Decisions marked **[Decided]** were approved by the owner or taken as the recommended default ("your call").

## 1. Pitch
A premium portrait-mode 3D endless-runner-style racer. You play a **feathered raptor racing home across the Cretaceous** before disaster hits. Every level is a different real raptor in its real habitat, so the roster doubles as a tour of where these animals actually lived. Tone: polished, warm, a little educational (fossil facts, Field Journal codex), never cartoony.

## 2. Platform and business model
- **[Decided]** Web tech (TypeScript + Three.js + Vite). Runs in mobile browsers now; wrapped with Capacitor for App Store / Play later.
- **[Decided]** Free, no ads or IAP in the proof of concept. Amber economy is designed so IAP could slot in later.
- Orientation: portrait only. Target devices: iPhone 12 class and mid-range Android and up.

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
- Owner's laptop OS (decides where the iOS build happens at M3).
