import type { HazardType } from './types';

/**
 * Crash screen text per cause: [eyebrow, title, tip]. Typed over every HazardType, so adding an obstacle
 * without crash text is a compile error (a missing entry once froze the run at the fork's rock fin).
 */
export const CRASH_COPY: Record<HazardType | 'storm', [string, string, string]> = {
  boulder: ['Ouch', 'Ran into a boulder', 'Boulders can\'t be jumped. Swipe left or right to go around them.'],
  ledge: ['Ouch', 'Tripped on a ledge', 'Swipe up to jump low rock ledges.'],
  ledgeWide: ['Ouch', 'Tripped on a ledge', 'Swipe up to jump low rock ledges.'],
  arch: ['Ouch', 'Hit the arch', 'Swipe down to slide under arches.'],
  ribArch: ['Ouch', 'Hit the fallen bone', 'Swipe down to slide under giant bones.'],
  spine: ['Ouch', 'Ran into the rock fin', 'When the trail splits, pick the left or right side before the fin.'],
  storm: ['Lost', 'The storm closed in', 'Run clean to keep the prey in sight.'],
};

export const crashCopy = (cause: string): [string, string, string] =>
  (CRASH_COPY as Record<string, [string, string, string]>)[cause] ?? ['Ouch', 'Crashed', 'Watch the trail ahead.'];
