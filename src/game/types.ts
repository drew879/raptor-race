/** `spine` is a long sandstone fin down the middle lane that splits the track into two routes (a fork). */
/** `ledge` is a flat sandstone slab across one lane; `gully` is a dry wash cut across all three lanes (jump both). */
export type HazardType = 'boulder' | 'ledge' | 'gully' | 'arch' | 'ribArch' | 'spine' | 'nester' | 'wanderer' | 'pterosaur';
// nester: a Protoceratops resting on its nest in one lane (a low jump, or go around).
// wanderer: a Protoceratops walking across the lanes as you approach, settling in its final lane (go around it).
// pterosaur: swoops low across all three lanes at head height (slide).
export type PickupKind = 'amber' | 'egg' | 'magnet' | 'updraft';
export type Lane = -1 | 0 | 1;
