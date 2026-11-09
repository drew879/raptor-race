# Raptor Race: Audio Bible

## Principles
- Subtle, warm, organic. Sounds confirm actions; they never nag.
- Everything is synthesized in code (WebAudio), so it ships tiny and stays tunable.
- iOS: audio starts on the first tap and respects the silent switch.

## Mix targets
- SFX bus peak about -12 dBFS; music bus about 8 dB under SFX peaks.
- No SFX longer than 400 ms except finish/egg flourishes.
- Every repeated SFX gets +/- 3% random pitch and +/- 1.5 dB random gain.
- Separate music and SFX volume settings, saved locally.

## Sound list
| Event | Character | Length |
|---|---|---|
| Amber pickup | Soft glassy tick (sine + quiet bell partial), climbs a major pentatonic scale along a chain, resets after 0.6 s gap | 90 ms |
| Lane change | Feather swish: band-passed noise sweep, panned toward the move direction | 140 ms |
| Jump | Light push-off thump + airy whoosh up | 180 ms |
| Land | Soft sand thud, low-passed noise | 110 ms |
| Slide | Sand scrape, filtered noise with slight tremolo | 300 ms |
| Stumble | Muffled thud + scattered gravel | 250 ms |
| Egg | Warm 3-note chime arpeggio | 500 ms |
| Power-up | Rising shimmer | 400 ms |
| Checkpoint | Soft wooden "tok" pair | 250 ms |
| Finish | Short warm fanfare (marimba-like plucks + low drum) | 1.5 s |

## Music
Adaptive loop at ~100 BPM: hand drums, shaker, low wind bed, plucked (Karplus-Strong) motifs in a pentatonic mode. Layers add as speed rises; storm adds a low wind swell. Music ducks 3 dB briefly on egg pickup.

## Critic rubric (Audio)
Measured: peak and RMS per SFX, duration, repetition variance. Judged: does any sound get annoying after 100 repeats? Does each action have clear, distinct feedback?
