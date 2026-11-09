/** All gameplay tunables. Units: meters, seconds. */
export const CONFIG = {
  lanes: { count: 3, spacing: 1.5, changeTime: 0.14 },
  speed: { start: 15, end: 21 },
  jump: { height: 1.25, airTime: 0.62 },
  slide: { duration: 0.7 },
  fastFallSpeed: 14,
  input: { buffer: 0.12, coyote: 0.1, swipeMinPx: 22, swipeMaxTime: 0.4 },
  hunt: {
    closePerSecond: 0.08, // clean running slowly closes the gap (~28 m over a clean Level 1)
    closePerAmber: 0.03,
    closePerClear: 0.3,
    stumbleGap: 8,
    minGap: 9,
    lostGap: 46,
    pounceRange: 9, // the prompt appears inside this gap
    pounceWindow: 2.6, // seconds to swipe up before the prey recovers
    finaleCloseSpeed: 7, // m/s the gap shrinks once the prey tires
  },
  world: { chunkLength: 40, chunksAhead: 6, chunksBehind: 1, trackHalfWidth: 2.6 },
  camera: { height: 2.65, back: 3.7, lookAhead: 7.0, lookHeight: 0.15, laneFollow: 0.75, fov: 64, speedFovKick: 1.1 },
} as const;

export const laneX = (lane: number) => lane * CONFIG.lanes.spacing;
