# Raptor Race: Art Bible

The single source of truth for look and feel. Builders follow it; critics grade against it.

## 1. Style in one sentence
Stylized low-poly 3D: flat-shaded facets with smooth vertex-color gradients, warm golden-hour light, deep atmospheric haze, painterly gradient skies, and amber as the signature glow.

## 2. Pillars
1. **Readable at speed.** Every gameplay object is identifiable in under 200 ms on a phone in sunlight.
2. **Warm, premium, natural.** Feels like a nature documentary filtered through a picture book. Never neon, never cartoon-goofy.
3. **Amber is the signature.** The brightest warm glow on screen is always amber (or an egg). UI, logo and rewards share that glow.
4. **Scientifically grounded.** Feathered raptors, real habitats, plausible fauna. Stylized proportions are fine; anatomy is respected.

## 3. Value and color rules (gameplay readability)
- **Collectibles** (amber, eggs, power-ups): highest brightness and saturation, emissive, gentle bob and spin, sparkle.
- **Hazards**: darker value than the track (at least 25% lower luminance), high-contrast silhouettes, jagged or blocky shapes.
- **Track**: light, low-contrast, calm. Lane seams are subtle.
- **Background**: desaturates and lightens toward the fog color with distance. Nothing in the background may compete with hazards.
- **Player raptor**: strongest value contrast against the track (dark body with bold light streaks) plus a cool accent that pops against warm biomes.
- Grayscale test: in a desaturated screenshot, hazards, collectibles and the raptor must still separate clearly.

## 4. Shape language
- Raptors: sleek, angular, forward-leaning wedges. Long horizontal stiff tail. Feather shards on arms, tail fan, neck ruff, crest.
- Hazards: jagged rocks, blocky ledges, spiky dead branches.
- Rewards: round, faceted, rotating, soft.
- Landscape: broad sweeping curves (dunes), layered horizontal strata (cliffs).

## 5. Level 1 palette: "Flaming Cliffs at golden hour"
| Role | Hex |
|---|---|
| Sky zenith | `#6E9BC4` |
| Sky mid | `#A9C7DC` |
| Horizon / fog | `#F4CFA0` |
| Sun glow | `#FFE3B3` |
| Sand light | `#EEC48A` |
| Sand mid | `#D9A066` |
| Sand shadow | `#B07344` |
| Track (packed sandstone) | `#EBCB98` |
| Track seam | `#D2A877` |
| Cliff red | `#C9573C` |
| Cliff light strata | `#E8875A` |
| Cliff pale strata | `#F2B582` |
| Cliff shadow | `#7E3528` |
| Hazard rock | `#6E4C3B` |
| Hazard rock highlight | `#8F6650` |
| Scrub sage | `#8C9A5E` |
| Scrub olive | `#5E6B3E` |
| Bone | `#EEE4D0` |
| Amber core | `#FFB21E` |
| Amber light | `#FFE08A` |
| Amber deep | `#C8620A` |

## 6. Hero raptor: Velociraptor, "Gobi Streak" (default plumage)
Dark streaked back over a pale belly for contrast on sand, a small blue cheek patch, cool teal accents on wing and tail tips. Bold bands only on the distal tail. Keep the cheek patch small (no side stripes) to stay clear of any film raptor's look.
| Part | Hex |
|---|---|
| Body base | `#5A4434` |
| Dark streaks | `#2E2420` |
| Light streaks | `#E9DFC9` |
| Underside | `#D8C8A8` |
| Iridescent accent (wing and tail tips) | `#2C8A8F` |
| Eye patch | `#3F7FBF` with `#C8432B` rim |
| Eye | `#F2B33D` (amber, ties to motif) |
| Claws, beak edge | `#2A2420` |
| Skin (snout, feet) | `#8A6A55` |

Anatomy notes: long low skull with a slightly upturned snout; S-curved neck; arms folded like wings with long primary feathers; enlarged sickle claw on the second toe held raised (dromaeosaur trackways are two-toed for this reason); stiff tail roughly half the body length ending in a feather fan. Game proportions: head ~15% larger, eye ~30% larger than life.

## 7. Lighting
- Key: warm directional `#FFD9A8`, intensity 2.9, ~31 degrees elevation, **behind and to the right of the chase camera** (~120 degrees from the run direction) so camera-facing surfaces are lit and shadows rake forward-left across the lanes. Hero and menu cameras may use a front-right sun.
- Fill: hemisphere sky `#D6CCE0` (warm lavender keeps shadows warm, never olive) / ground bounce `#C58A55`, intensity 2.6.
- Three.js lights are physically based: a white light needs intensity ~3.14 to reproduce albedo. Verify by sampling pixels: lit track should render near `#E6B27D`, shadowed track near `#A98365`, and nothing in the raptor or hazards darker than RGB 35 except eyes and claws.
- Rim: fresnel rim term on characters and hazards for silhouette pop.
- Fog: exponential-squared toward horizon color.
- Tone mapping: Khronos Neutral (keeps palette hues; only compresses highlights), soft vignette (CSS overlay, zero GPU cost). Sky is tone mapped the same way so the horizon blends with fog.

## 8. Camera
Third-person behind and above, portrait. Follows the raptor's lane partially (about 60%) for a sense of motion. Slight lag, FOV kick on speed-ups, small shake on stumble and landing.

## 9. Collectibles
Amber and eggs carry a dark ink outline shell (inverted hull, `#5A2C0C`), echoing the ink-outlined UI icons and separating them from pale sand in grayscale. Eggs are 1.65x scale with a soft self-glow and a larger halo.

## 9b. Effects
Sand puffs on footfalls, landing and slides; amber sparkle and soft halo; heat shimmer is not used (expensive). The sandstorm chaser is a screen-edge sand vignette with drifting streaks.

## 10. UI motif: Expedition Field Journal
- Panels: warm paper `#F3E6CC` with ink-brown text `#3A2A1E`, subtle paper grain, torn or deckled edges on key cards.
- Buttons: amber gem buttons (faceted amber gradient, dark ink outline, soft glow).
- Icons: ink line illustrations, 2 px strokes, rounded caps.
- Typography: display **Fraunces** (heavy weights) for titles and the logo; **Nunito Sans** for UI and body. Numbers in HUD: Nunito Sans Black with tabular figures.
- Logo: a stamped "RAPTOR" (cream paper fill, ink outline, amber extrusion) over an amber specimen plate reading "RACE", hooked by an ink sickle claw. Avoid gold-gradient stacked lettering (too close to other runners' wordmarks). Use textLength so it never clips on narrow phones.

## 11. Do / Don't
- Do: keep silhouettes bold; reuse the palette; keep geometry faceted and clean; animate everything a little (idle bob, feather flutter).
- Don't: imitate any film's raptor look (scaly, featherless, movie-style logos), copy another runner's UI or art, use pure black or pure white, use neon or saturated greens, add texture noise that shimmers at distance.

## 12. Critic rubric (Art Director)
Score 1 to 10 each, from phone-resolution screenshots, color and grayscale:
1. Style consistency with this bible
2. Readability (raptor, hazards, collectibles) at a glance
3. Raptor appeal and anatomical credibility
4. Lighting and atmosphere
5. Composition and camera framing in portrait
6. Polish (no z-fighting, gaps, clipping, aliasing artifacts, stretched UVs or colors)
7. UI motif and typography quality
Pass bar: every item at least 8.
