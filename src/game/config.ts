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
    warnGap: 32, // "It's getting away!" when the prey pulls this far ahead
    pounceRange: 9, // the prompt appears inside this gap
    pounceWindow: 2.6, // seconds to swipe up before the prey recovers
    finaleCloseSpeed: 7, // m/s the gap shrinks once the prey tires
    pounceTime: 0.6, // seconds of the leap
    pounceArc: 0.9, // extra height at the top of the leap (m)
    pinHeight: 0.78, // the raptor's feet on the prey's back (m)
    pinOffset: -0.05, // where it lands along the prey: 0 = the prey's hips, + = further back (m)
  },
  world: { chunkLength: 40, chunksAhead: 6, chunksBehind: 1, trackHalfWidth: 2.6 },
  /** Automatic bends (visual only): world bend per unit of level curvature, how far ahead a bend shows,
   * how fast the far scenery swings round, and how much the camera banks. */
  curves: { bend: 0.004, lookAhead: 28, headingGain: 1.2, maxHeading: 0.7, roll: 0.07 }, // owner: 0.0006 was barely noticeable
  /** Opening shot (seconds, meters): the prey grazes, looks up, bolts; the camera swings back behind the raptor. */
  intro: { graze: 1.6, alert: 0.55, swing: 1.35, preyLead: 7, camAz: 0.6, camDist: 2.9, camHeight: 0.8, crane: 2.2 },
  /** The pinned finale, framed from ahead and to the side of the prey (prey-relative; +z is behind it). */
  endingCam: { side: 1.8, height: 1.2, ahead: 3.0, lookHeight: 0.95, lookBack: 0.25 },
  camera: { height: 2.65, back: 3.7, lookAhead: 7.0, lookHeight: 0.15, laneFollow: 0.75, fov: 64, speedFovKick: 1.1 },
} as const;

export const laneX = (lane: number) => lane * CONFIG.lanes.spacing;
