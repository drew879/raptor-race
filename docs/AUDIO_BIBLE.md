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
Adaptive loop at 104 BPM with a light shuffle (src/audio/music.ts): low frame drum (doum), hand drum (tak) and ghost notes, shaker, a low wind bed, and plucked Karplus-Strong motifs in **C# minor pentatonic** (the same notes as the amber chimes, so pickups always sit in key). Four-bar phrases; the motif changes each phrase and lifts a step in its second half.

- Intensity 0..1 comes from the hunt: 0.2 at the start, rising with progress, +0.3 as the gap closes, +0.1 while gliding, 1.0 in the finale.
- Layers: doum always; bass pluck > 0.15; shaker > 0.22; tak > 0.3; motif > 0.38; extra doum hits > 0.55; ghost taks > 0.65; bass octave > 0.7; motif doubled an octave up > 0.8.
- Storm swells and brightens the wind bed. Egg pickups duck it 3 dB. Pause muffles it (low-pass, -9 dB). Crash, lost and menus fade it out; the pounce plays a sting (big drum and a held chord) before the finish fanfare.
- Silent during the opening shot; it starts on "Hunt!".
- Level: music bus 0.3, measured peak about -16.5 dBFS at full intensity (SFX peak -10 to -22). `scripts/audio-check.mjs` renders it offline and fails if it goes over -15 dBFS.
- Separate Music on/off in the pause menu, saved.

## Critic rubric (Audio)
Measured: peak and RMS per SFX, duration, repetition variance. Judged: does any sound get annoying after 100 repeats? Does each action have clear, distinct feedback?
