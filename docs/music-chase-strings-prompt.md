# Recreate "Chase Strings" (the Raptor Race chase music)

I have a 34-second music preview I really like, called raptor-race-music-chase-strings.m4a. You can't listen to it, so below is exactly how it was made: every note, sound and layer, with the numbers. Please recreate it as closely as you can. Before you start, tell me how you plan to make it (code, a DAW like Ableton Live, or something else).

Note numbers are MIDI, with 60 = middle C = C4. Times are in seconds.

## The gist
A driving cinematic chase for strings: relentless short spiccato sixteenth notes on a root, fifth and octave pattern with accents in a 3+3+2 lilt, dark cello half notes, a simple drum kit, a tense violin melody over the top, and high tremolo strings at the most intense moments. C# minor with a major V chord (harmonic minor), 120 BPM, an eight-bar loop.

Every sound in the original was synthesized from simple sawtooth, sine and noise voices (no samples), so it sounds a bit synthetic. Match the notes, rhythm, layering and balance first. If you can make the instruments sound more like real strings without changing the music, make that a second version so I can compare the two.

## What the 34-second preview contains
- 120 BPM in 4/4. A sixteenth note is 0.125 s, a bar is 2 s, and the loop is 8 bars (16 s).
- **0 to 16 s, low intensity (0.25):** spiccato, cellos, a kick on beats 1 and 3, and a very quiet wind bed.
- **16 to 34 s, high intensity (0.9):** every layer below. That's one full loop plus the start of the next.
- **Amber pickups:** a run of chimes on every eighth note from 4.0 to 6.5 s and again from 20.0 to 23.0 s (these are game pickup sounds that play notes of the current chord).
- It simply stops at 34 s. It was a preview cut, so there's no ending in it.

## Chords (one per bar)
| Bar | Chord | Bass root | Chord tones |
|---|---|---|---|
| 1 | C# minor | C#2 (37) | C#, E, G# |
| 2 | A major | A1 (33) | A, C#, E |
| 3 | F# minor | F#2 (42) | F#, A, C# |
| 4 | G# major | G#2 (44) | G#, B#, D# |
| 5 | C# minor | C#2 (37) | C#, E, G# |
| 6 | A major | A1 (33) | A, C#, E |
| 7 | D major (the Neapolitan, a dark turn) | D2 (38) | D, F#, A |
| 8 | G# major | G#2 (44) | G#, B#, D# |

## The parts
Each part says when it plays. "Intensity" runs from 0 to 1 (see "In the game" below); in the preview it's 0.25 for the first half and 0.9 for the second.

1. **Spiccato ostinato (always).** Sixteen short notes per bar, an octave above the bass root (bar 1 starts on C#3, 49). Per sixteenth, using R for that root, 5 for the fifth above it and 8 for the octave above it: `R R 5 R | 8 R 5 R | R R 5 R | 8 5 R 5`. So bar 1 is C#3 C#3 G#3 C#3, C#4 C#3 G#3 C#3, C#3 C#3 G#3 C#3, C#4 G#3 C#3 G#3. The pattern moves with each bar's root (bar 2 on A2, bar 3 on F#3, bar 4 on G#3, bar 7 on D3). Accents on sixteenths 1, 4, 7, 9, 12 and 15 of each bar (the 3+3+2 grouping, twice). Each note sounds about 0.11 s. The notes alternate slightly left and right.
2. **Spiccato an octave higher (intensity over 0.7).** The same pattern an octave up, quieter, a little to the right.
3. **Cellos (intensity over 0.22).** The bass root (for example C#2) on beats 1 and 3, each held 0.9 s. Dark and warm.
4. **Kick (always).** Beats 1 and 3. At intensity over 0.5, also on the "and" of beat 3 (the 11th sixteenth).
5. **Snare (intensity over 0.3).** Beats 2 and 4.
6. **Hi-hats (intensity over 0.4).** Eighth notes, the offbeat eighths a little louder. At intensity over 0.65, every sixteenth.
7. **Tom fill (intensity over 0.5).** The last four sixteenths of bar 8, stepping down in pitch, leading back into bar 1.
8. **Violin melody (intensity over 0.38).** Legato with vibrato, a little right of center. Notes per bar, with lengths in sixteenths (4 = a quarter note):

   | Bar | Notes |
   |---|---|
   | 1 | C#5 (73) 4, E5 (76) 4, G#5 (80) 6, A5 (81) 2 |
   | 2 | G#5 (80) 4, E5 (76) 4, C#5 (73) 8 |
   | 3 | F#5 (78) 4, A5 (81) 4, C#6 (85) 6, B#5 (84) 2 |
   | 4 | G#5 (80) 8, B#5 (84) 4, G#5 (80) 4 |
   | 5 | C#5 (73) 4, E5 (76) 4, G#5 (80) 6, A5 (81) 2 |
   | 6 | A5 (81) 4, G#5 (80) 4, E5 (76) 4, C#5 (73) 4 |
   | 7 | D5 (74) 4, F#5 (78) 4, A5 (81) 6, G#5 (80) 2 |
   | 8 | G#5 (80) 4, D#5 (75) 4, B#4 (72) 8 |

9. **High tremolo strings (intensity over 0.75).** One sustained note per bar, the fifth of the chord, high and shimmering, a little left: G#5 (80), E6 (88), C#6 (85), D#6 (87), G#5 (80), E6 (88), A5 (81), D#6 (87). Each held about 1.9 s with fast tremolo.
10. **Wind bed (always).** Very quiet low-passed noise under everything, drifting slowly.
11. **Amber chimes (game pickups).** Small bell tones snapped to the next sixteenth note. Each pickup plays a tone of the current chord, starting at E5 (76) or the first chord tone above it, and climbs one chord tone per pickup in a run (capped at E7, 100). A gap of more than 0.6 s starts the climb over.

## How each sound was made
All of it was built with Web Audio. If you're using real or sampled instruments, treat this as a description of the character to aim for.

- **Bowed voice** (spiccato, cellos, violin, tremolo): two sawtooth oscillators detuned a few cents either way, through a low-pass filter (Q 0.7). Linear attack, a hold, then an exponential release. Some parts add a filter envelope (the cutoff starts higher and glides down to its setting within the first 0.07 to 0.25 s). Vibrato is 5.5 Hz at about ±9 cents, starting 0.12 s into the note. Tremolo is 14 Hz, with the volume swinging between about 20% and 100%.

  | Part | Attack | Hold | Release | Filter cutoff | Detune | Level | Pan |
  |---|---|---|---|---|---|---|---|
  | Spiccato | 0.01 | 0.07 | 0.04 | 1500 + 1200 x intensity Hz, starting at 1.8x | ±7 cents | 0.07 accented, 0.045 otherwise | -0.15 / +0.15 alternating |
  | Spiccato octave | 0.01 | 0.06 | 0.04 | 2600 Hz | ±7 | 0.03 | +0.3 |
  | Cellos | 0.04 | 0.9 | 0.12 | 520 Hz | ±6 | 0.075 | center |
  | Violin | 0.04 | 97% of the note | 0.12 | 3200 Hz, vibrato | ±6 | 0.05 | +0.12 |
  | Tremolo | 0.2 | 1.9 | 0.2 | 4000 Hz, tremolo | ±7 | 0.025 | -0.3 |

- **Kick:** a sine wave dropping from 92 Hz to 42 Hz over about 0.28 s (level 0.2), plus a 0.03 s click of noise band-passed at 300 Hz.
- **Snare:** 0.15 s of noise band-passed at 1.9 kHz (level 0.09), plus a triangle wave dropping from 200 to 150 Hz over 0.08 s at half that level.
- **Hi-hats:** 0.025 s of noise high-passed at 8 kHz, a little right; level 0.035 on the offbeat eighths and 0.02 otherwise.
- **Tom fill:** sine hits starting at 180, 155, 130 and 105 Hz, each dropping to 90 Hz over 0.18 s (level 0.11), with a small click.
- **Wind bed:** looped noise low-passed at around 260 to 500 Hz (the cutoff drifts slowly), at a level of about 0.02.
- **Amber chime:** a sine at the note with a 2 ms attack and a 0.11 s decay (level about 0.11), plus a quieter partial at 2.76 times the frequency that dies in 0.05 s.

The levels are peak amplitudes in the same units, so they give you the mix balance. Everything ran through one music bus. In the game, the music sits about 8 dB under the sound effects; the preview was simply turned up for listening.

## In the game (context)
- **Intensity:** 0.2 at the start, rising as you get further through the level and as you close in on what you're chasing: 0.2 + 0.45 x progress + 0.3 x closeness, capped at 0.95 during the run, smoothed over about a second. The final pounce moment is 1.0.
- **Clocked to the run:** the song position is the running time to the player's distance, so the amber, which the level places on the same 120 BPM grid, always lands on the beat. Restarting from a checkpoint picks the music up in the right place.
- **Pause** muffles it (a low-pass at 600 Hz, quieter) and holds it in place.

## Added later (in the game now, not in the m4a)
Only after you've matched the preview:
1. **A sustained string bed (always):** each bar, the root and the fifth an octave above the bass (for bar 1, C#3 and G#3), held 1.95 s with a slow 0.35 s attack and release, cutoff 900 + 500 x intensity Hz, detune ±10 cents, levels 0.035 and 0.028, panned slightly left and right. It gives the quiet opening some body.
2. **The ending.** The first version just stopped, which felt abrupt, and a little jingle after it felt cheesy. Now:
   - **Riser (about 1.2 s before the pounce):** noise high-passed with the filter sweeping from 2.5 to 7 kHz and swelling, plus a sawtooth gliding up an octave from C#4 (61) to C#5 (73), low-passed at 2.4 kHz.
   - **The leap:** a low hit (a sine dropping from 110 to 40 Hz over 0.8 s), then a G# major chord swelling in over 1.4 s and holding: G#2 (44), G#3 (56), B#3 (60), D#4 (63), G#4 (68), with tremolo on the top three. Under it, a timpani roll on G# (about 104 Hz): 22 strokes 0.072 s apart, getting louder.
   - **The landing (about 1.7 s later):** the held chord fades in 0.2 s and the music lands home on C# major, a bright major ending to the minor chase. A big drum (92 down to 36 Hz over 1.6 s), timpani on C# (about 70 Hz over 2.2 s), a cymbal wash (noise high-passed at 6.5 kHz over 1.8 s), and the chord C#2 (37), C#3 (49), G#3 (56), C#4 (61), E#4 (65), G#4 (68), C#5 (73), E#5 (77). The higher notes are brighter (cutoffs from 500 Hz on the lowest note up to 3600 Hz on the highest), with a quick attack, a 1.6 s hold, a 3.2 s release, and vibrato on the upper notes. It rings out and fades to silence by 4.5 s.

## What I'd like from you
1. Tell me your plan and tools before you start.
2. Make the same 34-second preview (the structure above) as an audio file I can play on my phone, so I can compare it with the original by ear.
3. Tell me anything you couldn't match, or anything you changed and why.
