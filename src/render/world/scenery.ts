import type * as THREE from 'three';
import { decodeRrsDataUrl } from './rrs';
import boulderA from '../../assets/models/scenery/boulder_a.rrs?inline';
import boulderB from '../../assets/models/scenery/boulder_b.rrs?inline';
import boulderC from '../../assets/models/scenery/boulder_c.rrs?inline';
import cliffA from '../../assets/models/scenery/cliff_a.rrs?inline';
import cliffB from '../../assets/models/scenery/cliff_b.rrs?inline';
import cliffC from '../../assets/models/scenery/cliff_c.rrs?inline';
import stones from '../../assets/models/scenery/stones.rrs?inline';
import rockB from '../../assets/models/scenery/rock_b.rrs?inline';
import deadTree from '../../assets/models/scenery/dead_tree.rrs?inline';
import branch from '../../assets/models/scenery/branch.rrs?inline';
import bush from '../../assets/models/scenery/bush.rrs?inline';

/**
 * Scanned scenery (CC0, Poly Haven; see CREDITS.md), simplified and remapped to the palette by
 * scripts/blender/scenery.py. Decoded lazily and cached.
 */
const SOURCES = { boulderA, boulderB, boulderC, cliffA, cliffB, cliffC, stones, rockB, deadTree, branch, bush } as const;
export type SceneryName = keyof typeof SOURCES;
const cache = new Map<SceneryName, THREE.BufferGeometry>();
export function scenery(name: SceneryName): THREE.BufferGeometry {
  let g = cache.get(name);
  if (!g) { g = decodeRrsDataUrl(SOURCES[name]); cache.set(name, g); }
  return g;
}
