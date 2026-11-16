/**
 * Which graphics version to draw (the owner's three-version test):
 * 1 = today's look; 2 = the shading pass (gentler filter, smooth-shaded heroes and egg, fan on a pivot,
 * lighter outlines); 3 = version 2 plus the forest composition (hillside trail, planted clusters, dappled light,
 * worn lanes, richer obstacles). Set once when the page loads, before anything is built.
 */
export type LookLevel = 1 | 2 | 3;
export const LOOK = { level: 1 as LookLevel };
/** True when the chosen version includes a stage's changes. */
export const lookAt = (n: LookLevel) => LOOK.level >= n;
export function setLook(n: number) {
  LOOK.level = (n >= 3 ? 3 : n >= 2 ? 2 : 1) as LookLevel;
}

/** The downhill pass (owner picked steeper pitches, valley views and a camera that tilts less, and OK'd it in
 * playtest 9): 2 = on (the default). 1 = the steady grade from before (`?hill=1`, for comparison). */
export const DOWNHILL = { v: 2 };
export const downhill2 = () => DOWNHILL.v >= 2;
