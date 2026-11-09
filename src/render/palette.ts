import { Color } from 'three';

/** Mirrors docs/ART_BIBLE.md. Hex values are sRGB design values. */
export const GOBI = {
  skyZenith: 0x6e9bc4,
  skyMid: 0xa9c7dc,
  horizon: 0xf4cfa0,
  sunGlow: 0xffe3b3,
  sandLight: 0xeec48a,
  sandMid: 0xd9a066,
  sandShadow: 0xb07344,
  track: 0xebcb98,
  trackSeam: 0xd2a877,
  cliffRed: 0xc9573c,
  cliffLight: 0xe8875a,
  cliffPale: 0xf2b582,
  cliffShadow: 0x7e3528,
  hazardRock: 0x74503e,
  hazardRockLight: 0x9a6e55,
  scrubSage: 0x8c9a5e,
  scrubOlive: 0x5e6b3e,
  bone: 0xeee4d0,
  amberCore: 0xffb21e,
  amberLight: 0xffe08a,
  amberDeep: 0xc8620a,
  keyLight: 0xffd9a8,
  hemiSky: 0xd6cce0,
  hemiGround: 0xb5977c,
} as const;

/** Default Velociraptor plumage, "Gobi Streak". */
export const RAPTOR_GOBI_STREAK = {
  base: 0x5c4c42,
  dark: 0x3a302b,
  light: 0xe9dfc9,
  under: 0xd8c8a8,
  accent: 0x2c8a8f,
  eyePatch: 0x3f7fbf,
  eyeRim: 0xc8432b,
  eye: 0xf2b33d,
  claw: 0x2a2420,
  skin: 0x8a6a55,
} as const;

export type RaptorPlumage = { [K in keyof typeof RAPTOR_GOBI_STREAK]: number };

/** sRGB hex to linear working-space Color. */
export const col = (hex: number) => new Color(hex);

/** Mix two hex colors in linear space. */
export const mix = (a: number, b: number, t: number) => new Color(a).lerp(new Color(b), t);

/** Scale brightness of a color (returns a new Color). */
export const shade = (c: Color, k: number) => c.clone().multiplyScalar(k);
