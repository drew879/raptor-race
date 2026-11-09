/** Local save. Every access is guarded: storage can be missing or blocked (private mode, previews). */
export interface SaveData {
  v: 1;
  best: Record<string, number>;
  stars: Record<string, boolean[]>;
  eggs: Record<string, boolean[]>;
  amberBank: number;
  sound: boolean;
  /** Music on/off (separate from sound effects). */
  music: boolean;
  runs: number;
  seenInclusion?: boolean;
  /** Per level, how many runs passed each inclusion without finding it (hints show after two). */
  misses?: Record<string, number[]>;
  /** Per level, the chosen plumage id. */
  plumage?: Record<string, string>;
}
const KEY = 'raptor-race-save-v1';
const fresh = (): SaveData => ({ v: 1, best: {}, stars: {}, eggs: {}, amberBank: 0, sound: true, music: true, runs: 0 });

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const d = JSON.parse(raw) as SaveData;
    return d && d.v === 1 ? { ...fresh(), ...d } : fresh();
  } catch {
    return fresh();
  }
}
export function writeSave(d: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* storage unavailable: progress lasts for this session only */
  }
}
