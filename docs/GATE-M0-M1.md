# Gate review: M0 style tile + M1 playable Level 1

## What to review (on your phone)
1. **Raptor Race** (playable): Title, Field Journal card, full Level 1 run, pause, caught/revive/checkpoint, results with stars.
2. **Raptor Race Style Tile**: the look in three camera modes plus the style sheet (palette, type, components).

## Verified automatically
- 20 unit tests: swipe classification, movement (jump height and air time match config), buffering, fast-fall, collisions, mesh winding, level data rules.
- Bot playthroughs of Level 1 (headless): perfect bot finishes cleanly with all 3 eggs (14,300 pts). Human-like bot (300 ms reactions, timing jitter, 3% input mistakes, 120 seeds): 66% finish without being caught, 93% within the one free revive (target 85%).
- Full in-browser playthrough by the bot with no page errors. Budget: ~26 draw calls, ~37k triangles.
- SFX loudness: every sound renders offline between -10 and -28 dBFS peak; short sounds under 400 ms.

## Art critic loop (independent reviewer, fresh context each round)
| Round | Style | Readability | Raptor | Lighting | Composition | Polish | UI |
|---|---|---|---|---|---|---|---|
| 1 | 6 | 6 | 5 | 5 | 6 | 5 | 7 |
| 2 | 6 | 6 | 5 | 6 | 6 | 5 | 7 |
| 3 | 7 | 7 | 6 | 7 | 6 | 6 | 7 |

Pass bar is 8 on every item; not met after 3 rounds, so the remaining items are escalated here.

## Known issues carried into M2
- Raptor head: deeper lower jaw, pale lip line, shorter snout; thigh tapering into the body; thicker tail base in 3/4 view.
- Far dune band is flat and the same value as the track; needs 2-3 ridges and a sun-glow gradient at the horizon.
- The raptor's shadow can read as a second raptor at some angles.
- Hero and title shots should show the red cliffs behind the raptor.
- Cards want deckled edges.
- Not yet built: Protoceratops herd and swooping pterosaur (moving obstacles), music, plumage shop, level map, haptics on iOS (needs the native wrapper), on-device performance pass.

## Feedback that helps most
- Does the swipe feel responsive? Any missed or wrong swipes?
- Is it too easy, too hard, or right for a first level?
- Frame rate on your phone (Pause > Frame rate: shown).
- Gut reaction to the raptor and the overall look.
