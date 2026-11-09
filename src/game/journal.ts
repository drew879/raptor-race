import type { SaveData } from './save';

/**
 * Field Journal content and progression rules (owner decisions, playtest 4):
 * - each amber inclusion unlocks a journal page with a real fact about Cretaceous amber;
 * - after two runs that pass an inclusion without finding it, its page shows where it is;
 * - finding all three in a level unlocks a second plumage for that level's raptor;
 * - levels come in chapters of three: catching the prey opens the next level, and opening the next chapter
 *   takes 8 of the current chapter's 9 inclusions. Found inclusions are kept forever. No amber trade.
 *
 * Facts were checked against the original studies' coverage before writing (see docs/GDD.md, journal notes).
 */
export interface InclusionPage {
  /** What's trapped inside. */
  title: string;
  art: 'feather' | 'tick' | 'ant';
  fact: string;
  /** Where to find it, shown after two runs that miss it. */
  hint: string;
}

export const INCLUSION_PAGES: Record<string, InclusionPage[]> = {
  'flaming-cliffs': [
    {
      title: 'A feather',
      art: 'feather',
      fact: 'In 2011, researchers searched about 4,000 pieces of amber from Grassy Lake, Alberta, around 80 million years old, and found feathers in 11. Some were simple, wispy filaments like those of non-bird dinosaurs; others looked like modern bird feathers.',
      hint: 'In the canyon, under an arch in the left lane. Slide through it.',
    },
    {
      title: 'A tick',
      art: 'tick',
      fact: 'In 99-million-year-old amber from Myanmar, a tick is caught still gripping a feather. The same 2017 study named a new tick, Deinocroton draculi: "Dracula\'s terrible tick".',
      hint: 'High in the updraft glide over the boulder field. Steer to the far left and stay up.',
    },
    {
      title: 'An ant',
      art: 'ant',
      fact: 'Sphecomyrma freyi, a "wasp ant" from New Jersey amber about 92 million years old, was described in 1967 and was long the oldest known ant. Older ants have since turned up in amber from Myanmar and France.',
      hint: 'Where the herd walks: jump the slab in the middle lane, then cut right behind the boulder.',
    },
  ],
};

/** A footnote for the journal: why our amber is blue. */
export const BLUE_AMBER_NOTE =
  'About our blue amber: real blue amber comes from the Dominican Republic and is far younger than this scene (its age is debated, somewhere around 15 to 40 million years). It glows blue in sunlight. We made ours blue so it\'s easy to spot.';

export interface LevelEntry { id: string; name: string; raptor: string; available: boolean }
export interface ChapterDef { id: string; title: string; levels: LevelEntry[] }

/** The roster, grouped into chapters of three (docs/GDD.md section 9). Only Level 1 exists so far. */
export const CHAPTERS: ChapterDef[] = [
  {
    id: 'ch1',
    title: 'Chapter 1',
    levels: [
      { id: 'flaming-cliffs', name: 'Flaming Cliffs', raptor: 'Velociraptor', available: true },
      { id: 'floodplain', name: 'Floodplain Forest', raptor: 'Deinonychus', available: false },
      { id: 'cedar-mountain', name: 'Cedar Mountain', raptor: 'Utahraptor', available: false },
    ],
  },
  {
    id: 'ch2',
    title: 'Chapter 2',
    levels: [
      { id: 'jehol-canopy', name: 'Forest Canopy', raptor: 'Microraptor', available: false },
      { id: 'hell-creek', name: 'Hell Creek', raptor: 'Acheroraptor', available: false },
      { id: 'ch2-3', name: 'To be announced', raptor: '?', available: false },
    ],
  },
];

/** Inclusions needed from a chapter's nine to open the next chapter. */
export const CHAPTER_GATE = 8;
export const INCLUSIONS_PER_LEVEL = 3;

export const foundIn = (save: SaveData, levelId: string) => (save.eggs[levelId] ?? []).filter(Boolean).length;
export const chapterFound = (save: SaveData, ch: ChapterDef) => ch.levels.reduce((n, l) => n + foundIn(save, l.id), 0);
const caught = (save: SaveData, levelId: string) => !!save.stars[levelId]?.[0];

export function chapterUnlocked(save: SaveData, chIdx: number): boolean {
  if (chIdx <= 0) return true;
  return chapterUnlocked(save, chIdx - 1) && chapterFound(save, CHAPTERS[chIdx - 1]) >= CHAPTER_GATE;
}

/** Whether a level is open to play (it must also exist: `available`). */
export function levelUnlocked(save: SaveData, chIdx: number, lvIdx: number): boolean {
  if (!chapterUnlocked(save, chIdx)) return false;
  if (lvIdx === 0) return true;
  return caught(save, CHAPTERS[chIdx].levels[lvIdx - 1].id);
}

/** What still stands between the player and a locked level, in plain words. */
export function lockReason(save: SaveData, chIdx: number, lvIdx: number): string {
  if (!chapterUnlocked(save, chIdx)) {
    const prev = CHAPTERS[chIdx - 1];
    return `Find ${CHAPTER_GATE} of ${prev.title}'s ${prev.levels.length * INCLUSIONS_PER_LEVEL} amber inclusions (${chapterFound(save, prev)} so far)`;
  }
  if (lvIdx > 0 && !caught(save, CHAPTERS[chIdx].levels[lvIdx - 1].id)) return `Catch the prey in ${CHAPTERS[chIdx].levels[lvIdx - 1].name}`;
  return 'Coming soon';
}

/** Plumages per level: the default, and one unlocked by finding all three inclusions. */
export const PLUMAGES: Record<string, { id: string; name: string }[]> = {
  'flaming-cliffs': [{ id: 'gobi-streak', name: 'Gobi Streak' }, { id: 'dusk', name: 'Dusk' }],
};
export const plumageUnlocked = (save: SaveData, levelId: string, idx: number) => idx === 0 || foundIn(save, levelId) >= INCLUSIONS_PER_LEVEL;

/**
 * At the end of a run: every inclusion the runner passed without finding (and never found before) counts a
 * miss. Returns the updated miss counts.
 */
export function recordMisses(save: SaveData, levelId: string, inclusionDistances: number[], furthest: number, foundThisRun: boolean[]) {
  const misses = (save.misses ??= {});
  const m = (misses[levelId] ??= inclusionDistances.map(() => 0));
  inclusionDistances.forEach((d, i) => {
    const everFound = !!save.eggs[levelId]?.[i] || foundThisRun[i];
    if (!everFound && furthest > d + 5) m[i] = (m[i] ?? 0) + 1;
  });
  return m;
}
export const showHint = (save: SaveData, levelId: string, i: number) => (save.misses?.[levelId]?.[i] ?? 0) >= 2 && !save.eggs[levelId]?.[i];
