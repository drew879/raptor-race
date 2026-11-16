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
| Screech | Pterosaur cry: buzzy saw falling 1300 to 520 Hz through a narrow band, plus breath noise; plays once as it dives in | 340 ms |

## Music
**Music v3 (owner pick, playtest 6): Chase Strings is the default.** Arrangements are data (`MusicStyle` in `src/audio/music-styles.ts`); a level names its own with `music` in its definition and falls back to the default. Both levels play Chase Strings for now. The clock, amber sync and intensity rules below apply to every style.

- **Chase Strings:** harmonic minor in C#, eight bars C#m, A, F#m, G# | C#m, A, D, G# (the major V gives the pull back home). A warm sustained string bed (root and fifth) from bar 1, spiccato sixteenths on a root-fifth-octave ostinato with accents, cellos on half notes > 0.22, kick from the start with a snare backbeat > 0.3 and hats > 0.4, a tense violin line > 0.38, an upper octave of the ostinato > 0.7, tremolo violins and a tom fill into the loop when the prey is close. Style level 1.15 (measured about 1 dB quieter than the others).
- **The ending (owner, playtest 7: the old one stopped too suddenly and the C major jingle was cheesy):** the pounce plays a hit and holds the fifth (G# major) swelling under a timpani roll through the leap; the landing resolves home to a bright C# major chord with a big drum, timpani and a cymbal wash, which rings out over the journal plate (about 4 s, gone just before the results card at 4.6 s). The finish fanfare plays only with the music off, and is now in C# major. Every style has a `sting` (the leap) and a `finale` (the landing); `scripts/audio-check.mjs` renders each ending (Chase Strings peaks at -15.6 dBFS on the landing) and `scripts/music-preview.mjs --ending` renders it to listen to.
- **Pounce riser:** when the pounce window opens, a 1.2 s swell (high-passed air rising 2.5 to 7 kHz and a string gliding up an octave from the home note), peak about -24 dBFS, under the music's peak.
- Also kept: **Journal** (the v2 kalimba theme below) and **War Drums** (C# Phrygian, taiko, drone, horn, brass) for later levels.

Music v2 (owner playtest 4: v1 was "single notes, no discernible melody or rhythm"; amber chimes already felt musical, so sync them). `src/audio/music.ts`:

- **Tempo and clock:** 120 BPM in every level. The song position is the running time to the raptor's distance (`level.timeAt`), so the music is locked to the course: restarts and checkpoints pick it up in the right place, pause holds it, and the finale's slow motion slows it.
- **Amber on the beat:** levels place amber in time, not meters: lines on eighth notes (4 pieces a second at any speed), slide lines and jump arcs on sixteenths. Each chime snaps onto the next sixteenth and plays a tone of the current chord, climbing with the chain, so collecting a line plays a run over the harmony. With music off, amber plays the plain chime.
- **The theme:** eight bars in C# minor, chords i-VI-III-VII | i-VI-VII-i (C#m, A, E, B), a 3+3+2 lilt shared by melody, bass and drums. Kalimba carries the melody from bar 1 with frame drum, hand-drum backbeat, shaker eighths and a warm bass.
- **Layers by intensity** (0.2 at the start, rising with progress and as the gap closes, 1.0 in the finale): marimba doubles the melody an octave down and the shaker goes to sixteenths > 0.4; hand-drum ghost notes > 0.45; extra frame-drum hits > 0.55; bass octave pops > 0.7; a quiet marimba arpeggio > 0.75.
- Storm swells the wind bed; inclusions duck it 3 dB; pause muffles it; crash, lost and menus fade it; the pounce plays a sting (big drum, the home chord on marimba).
- **Level:** music bus 0.26; measured peaks: Chase Strings -20.4 dBFS at the opening intensity and -19.7 at full, Journal -16.7 and -16.1, War Drums -20.2 and -18.7 (SFX peaks -10 to -27). `scripts/audio-check.mjs` checks every style and fails over -15 dBFS. `scripts/music-preview.mjs --style <id>` renders a listenable preview.
- Separate Music on/off in the pause menu, saved.

## Critic rubric (Audio)
Measured: peak and RMS per SFX, duration, repetition variance. Judged: does any sound get annoying after 100 repeats? Does each action have clear, distinct feedback?
