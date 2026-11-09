/** All gameplay tunables. Units: meters, seconds. */
export const CONFIG = {
  lanes: { count: 3, spacing: 1.5, changeTime: 0.14 },
  speed: { start: 15, end: 21 },
  jump: { height: 1.25, airTime: 0.62 },
  slide: { duration: 0.7 },
  fastFallSpeed: 14,
  input: { buffer: 0.12, coyote: 0.1, swipeMinPx: 22, swipeMaxTime: 0.4 },
  world: { chunkLength: 40, chunksAhead: 6, chunksBehind: 1, trackHalfWidth: 2.6 },
  camera: { height: 2.65, back: 3.7, lookAhead: 7.0, lookHeight: 0.15, laneFollow: 0.75, fov: 64, speedFovKick: 1.1 },
} as const;

export const laneX = (lane: number) => lane * CONFIG.lanes.spacing;
