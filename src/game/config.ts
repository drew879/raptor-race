/** All gameplay tunables. Units: meters, seconds. */
export const CONFIG = {
  lanes: { count: 3, spacing: 1.5, changeTime: 0.18 },
  speed: { start: 10, end: 14 },
  jump: { height: 1.25, airTime: 0.62 },
  slide: { duration: 0.7 },
  fastFallSpeed: 14,
  input: { buffer: 0.12, coyote: 0.1, swipeMinPx: 22, swipeMaxTime: 0.4 },
  world: { chunkLength: 40, chunksAhead: 6, chunksBehind: 1, trackHalfWidth: 2.6 },
  camera: { height: 3.05, back: 4.3, lookAhead: 6.0, lookHeight: 0.1, laneFollow: 0.75, fov: 62 },
} as const;

export const laneX = (lane: number) => lane * CONFIG.lanes.spacing;
