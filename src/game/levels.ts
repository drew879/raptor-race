import type { LevelDef } from './level';
import { FLAMING_CLIFFS } from './flaming-cliffs';
import { JEHOL_FOREST } from './jehol-forest';
import { CHAPTERS } from './journal';

/** Every level that exists, by id. */
export const LEVELS: Record<string, LevelDef> = { [JEHOL_FOREST.id]: JEHOL_FOREST, [FLAMING_CLIFFS.id]: FLAMING_CLIFFS };

/** The level a fresh game opens on: the first one in the roster that exists. */
export const FIRST_LEVEL = CHAPTERS.flatMap((c) => c.levels).find((l) => l.available && LEVELS[l.id])?.id ?? FLAMING_CLIFFS.id;

/** "Level n" as the roster numbers it (chapters run on: chapter 2 starts at 4). */
export function levelNumber(id: string) {
  const all = CHAPTERS.flatMap((c) => c.levels);
  const i = all.findIndex((l) => l.id === id);
  return i >= 0 ? i + 1 : 1;
}

/** The level to open: one asked for in the URL, else the last one played, else the first. */
export function pickLevel(asked: string | null, last: string | undefined): LevelDef {
  return LEVELS[asked ?? ''] ?? LEVELS[last ?? ''] ?? LEVELS[FIRST_LEVEL];
}
