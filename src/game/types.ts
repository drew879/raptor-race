/** `spine` is a long sandstone fin down the middle lane that splits the track into two routes (a fork). */
/** `ledge` is a flat sandstone slab across one lane; `gully` is a dry wash cut across all three lanes (jump both). */
export type HazardType = 'boulder' | 'ledge' | 'gully' | 'arch' | 'ribArch' | 'spine';
export type PickupKind = 'amber' | 'egg' | 'magnet' | 'updraft';
export type Lane = -1 | 0 | 1;
