import { describe, expect, it } from 'vitest';
import { CHAPTERS, CHAPTER_GATE, INCLUSION_PAGES, chapterUnlocked, levelUnlocked, lockReason, markPagesSeen, plumageUnlocked, recordMisses, showHint, unseenPages } from '../src/game/journal';
import type { SaveData } from '../src/game/save';
import { FLAMING_CLIFFS } from '../src/game/flaming-cliffs';

const fresh = (): SaveData => ({ v: 1, best: {}, stars: {}, eggs: {}, amberBank: 0, sound: true, music: true, runs: 0 });

describe('chapter gates', () => {
  it('Level 1 (Jehol Forest) is always open; the next level opens when you catch the prey', () => {
    const s = fresh();
    expect(CHAPTERS[0].levels[0].id).toBe('jehol-forest');
    expect(levelUnlocked(s, 0, 0)).toBe(true);
    expect(levelUnlocked(s, 0, 1)).toBe(false);
    expect(lockReason(s, 0, 1)).toBe('Catch the prey in Jehol Forest');
    s.stars['jehol-forest'] = [true, false, false];
    expect(levelUnlocked(s, 0, 1)).toBe(true);
  });
  it('a level you have already played stays open when a new level is added ahead of it', () => {
    const s = fresh();
    s.best['flaming-cliffs'] = 9000; // played it back when it was Level 1
    expect(levelUnlocked(s, 0, 1)).toBe(true);
  });
  it('the next chapter needs 8 of the chapter\'s 9 inclusions, and found inclusions count from any level', () => {
    const s = fresh();
    const ids = CHAPTERS[0].levels.map((l) => l.id);
    s.eggs[ids[0]] = [true, true, true];
    s.eggs[ids[1]] = [true, true, true];
    s.eggs[ids[2]] = [true, false, false];
    expect(chapterUnlocked(s, 1)).toBe(false);
    expect(lockReason(s, 1, 0)).toContain('7 so far');
    s.eggs[ids[2]] = [true, true, false];
    expect(CHAPTER_GATE).toBe(8);
    expect(chapterUnlocked(s, 1)).toBe(true);
    expect(levelUnlocked(s, 1, 0)).toBe(true);
  });
});

describe('inclusion rewards', () => {
  it('Level 1 has a page for each of its three inclusions', () => {
    expect(INCLUSION_PAGES[FLAMING_CLIFFS.id]).toHaveLength(FLAMING_CLIFFS.pickups.filter((p) => p.kind === 'egg').length);
  });
  it('the second plumage unlocks with all three inclusions', () => {
    const s = fresh();
    s.eggs[FLAMING_CLIFFS.id] = [true, true, false];
    expect(plumageUnlocked(s, FLAMING_CLIFFS.id, 1)).toBe(false);
    s.eggs[FLAMING_CLIFFS.id] = [true, true, true];
    expect(plumageUnlocked(s, FLAMING_CLIFFS.id, 1)).toBe(true);
  });
  it('a hint shows after two runs that pass an inclusion without finding it', () => {
    const s = fresh();
    const ds = [100, 500, 900];
    recordMisses(s, FLAMING_CLIFFS.id, ds, 600, [true, false, false]); // ran to 600: found #1, missed #2, never reached #3
    expect(s.misses![FLAMING_CLIFFS.id]).toEqual([0, 1, 0]);
    expect(showHint(s, FLAMING_CLIFFS.id, 1)).toBe(false);
    recordMisses(s, FLAMING_CLIFFS.id, ds, 1000, [false, false, false]);
    expect(showHint(s, FLAMING_CLIFFS.id, 1)).toBe(true);
    expect(showHint(s, FLAMING_CLIFFS.id, 2)).toBe(false);
    s.eggs[FLAMING_CLIFFS.id] = [false, true, false]; // found it later: the hint goes away
    expect(showHint(s, FLAMING_CLIFFS.id, 1)).toBe(false);
  });
});

describe('new journal pages', () => {
  it('pages found but not yet read are new until the journal is opened', () => {
    const s = fresh();
    s.eggs[FLAMING_CLIFFS.id] = [true, false, true];
    expect(unseenPages(s, FLAMING_CLIFFS.id)).toEqual([0, 2]);
    markPagesSeen(s, FLAMING_CLIFFS.id);
    expect(unseenPages(s, FLAMING_CLIFFS.id)).toEqual([]);
    s.eggs[FLAMING_CLIFFS.id] = [true, true, true];
    expect(unseenPages(s, FLAMING_CLIFFS.id)).toEqual([1]);
  });
});
