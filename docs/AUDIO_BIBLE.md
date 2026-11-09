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
Music v2 (owner playtest 4: v1 was "single notes, no discernible melody or rhythm"; amber chimes already felt musical, so sync them). `src/audio/music.ts`:

- **Tempo and clock:** 120 BPM in every level. The song position is the running time to the raptor's distance (`level.timeAt`), so the music is locked to the course: restarts and checkpoints pick it up in the right place, pause holds it, and the finale's slow motion slows it.
- **Amber on the beat:** levels place amber in time, not meters: lines on eighth notes (4 pieces a second at any speed), slide lines and jump arcs on sixteenths. Each chime snaps onto the next sixteenth and plays a tone of the current chord, climbing with the chain, so collecting a line plays a run over the harmony. With music off, amber plays the plain chime.
- **The theme:** eight bars in C# minor, chords i-VI-III-VII | i-VI-VII-i (C#m, A, E, B), a 3+3+2 lilt shared by melody, bass and drums. Kalimba carries the melody from bar 1 with frame drum, hand-drum backbeat, shaker eighths and a warm bass.
- **Layers by intensity** (0.2 at the start, rising with progress and as the gap closes, 1.0 in the finale): marimba doubles the melody an octave down and the shaker goes to sixteenths > 0.4; hand-drum ghost notes > 0.45; extra frame-drum hits > 0.55; bass octave pops > 0.7; a quiet marimba arpeggio > 0.75.
- Storm swells the wind bed; inclusions duck it 3 dB; pause muffles it; crash, lost and menus fade it; the pounce plays a sting (big drum, the home chord on marimba).
- **Level:** music bus 0.26, measured peak about -16 dBFS (SFX peaks -10 to -22). `scripts/audio-check.mjs` fails over -15 dBFS. `scripts/music-preview.mjs` renders a listenable preview.
- Separate Music on/off in the pause menu, saved.

## Critic rubric (Audio)
Measured: peak and RMS per SFX, duration, repetition variance. Judged: does any sound get annoying after 100 repeats? Does each action have clear, distinct feedback?
