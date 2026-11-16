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
  keyLight: 0xffc98a,
  hemiSky: 0xd6cce0,
  hemiGround: 0xb5977c,
} as const;

/** Level 1, Jehol Forest (Liaoning, ~125 mya), early morning: misty blue-green air, warm low sun, a dirt trail
 * through moss and leaf litter, conifers, ginkgos and ferns (no grass: it hadn't spread yet), clear streams. */
export const FOREST = {
  skyZenith: 0x7fa9c8,
  skyMid: 0xb9d5d6,
  horizon: 0xdbe3c9,
  sunGlow: 0xffe6ae,
  keyLight: 0xffd9a0,
  hemiSky: 0xd2e2de,
  hemiGround: 0x7d6c4c,
  fog: 0xcdd8c0,
  track: 0xa87c56,
  trackSeam: 0x8f6646,
  trackDark: 0x7a5538,
  moss: 0x587638,
  mossLight: 0x768f44,
  mossDark: 0x3f5a2c,
  litter: 0x8e6038,
  litterDark: 0x5f3f27,
  bark: 0x6a4632,
  barkDark: 0x3d281d,
  barkLight: 0x8c6649,
  conifer: 0x2f5a3c,
  coniferLight: 0x4f8048,
  coniferDark: 0x1d3a2a,
  ginkgo: 0xa8b84a,
  ginkgoLight: 0xd4d164,
  fern: 0x5e9a3e,
  fernLight: 0x8fc057,
  horsetail: 0x7aa04a,
  rock: 0x7c7e70,
  rockMoss: 0x6a7d45,
  water: 0x8ad6e6,
  waterDeep: 0x4a9db5,
  foam: 0xeaf7f4,
  ridgeNear: 0x6f8f86,
  ridgeFar: 0xa3b8b0,
  volcano: 0x8d8b8e,
  plume: 0xe2ddd2,
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

/** Unlockable Velociraptor plumage, "Dusk": charcoal with rust bars and a rust flash (all 3 inclusions). */
export const RAPTOR_DUSK = {
  base: 0x3f3632,
  dark: 0x221c1a,
  light: 0xc8743c,
  under: 0xcbb898,
  accent: 0xe08a2e,
  eyePatch: 0x2a2730,
  eyeRim: 0xe2b44a,
  eye: 0xf4d27a,
  claw: 0x1c1816,
  skin: 0x6e5545,
} as const;

export type RaptorPlumage = { [K in keyof typeof RAPTOR_GOBI_STREAK]: number };

/** Default Caudipteryx plumage, "Forest Fan": dark brown with pale cheeks, black-and-white banded fans and an
 * orange beak (reads against the brown trail and the green forest from behind). */
export const CAUD_FOREST: RaptorPlumage = {
  base: 0x4b3a31,
  dark: 0x1f1714,
  light: 0xf3ede2,
  under: 0xd9c8a9,
  accent: 0xe07a2c, // beak and crest tips
  eyePatch: 0x2a201c, // dark mask around the eye
  eyeRim: 0xf3d36a, // yellow eye ring
  eye: 0x3a2a20,
  claw: 0x2a2420,
  skin: 0x8c6c58,
};
/** Unlockable Caudipteryx plumage, "Sunrise": rust with teal-tipped fans (all 3 inclusions). */
export const CAUD_SUNRISE: RaptorPlumage = {
  base: 0x9a4b26,
  dark: 0x2a1610,
  light: 0xf6e3c2,
  under: 0xe6cfa6,
  accent: 0x2f8f94,
  eyePatch: 0x3a1c12,
  eyeRim: 0xf0c45a,
  eye: 0x2a1a12,
  claw: 0x221a16,
  skin: 0x7d5a44,
};

/** sRGB hex to linear working-space Color. */
export const col = (hex: number) => new Color(hex);

/** Mix two hex colors in linear space. */
export const mix = (a: number, b: number, t: number) => new Color(a).lerp(new Color(b), t);

/** Scale brightness of a color (returns a new Color). */
export const shade = (c: Color, k: number) => c.clone().multiplyScalar(k);
