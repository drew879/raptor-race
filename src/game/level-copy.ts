import type { HintKind } from './level';
import type { HazardType } from './types';

/**
 * Every line of on-screen text that depends on the level: cards, banners, the plate, crash and hint lines.
 * Facts here are checked before writing (sources in docs/GDD.md, journal notes).
 */
export interface LevelCopy {
  /** The hero's name, for the cards. */
  species: string;
  latin: string;
  /** The pre-run card's paragraph. */
  fact: string;
  /** The opening shot's card. */
  quarry: { eyebrow: string; name: string; latin: string };
  /** The first objective, before and after (results). */
  catchGoal: string;
  caught: string;
  /** The banner as the chase starts. */
  go: string;
  pounce: string;
  plate: { eyebrow: string; title: string; text: string };
  results: { title: string };
  lost: { distance: string; missed: string };
  stumble: string;
  /** The first-inclusion callout. */
  callout: { title: string; text: string };
  hints?: Partial<Record<HintKind, string>>;
  crash?: Partial<Record<HazardType | 'storm', [string, string, string]>>;
  /** The crash screen's default eyebrow line (what caught you). */
  caughtEyebrow: string;
  reviveLabel: string;
}

export const LEVEL_COPY: Record<string, LevelCopy> = {
  'flaming-cliffs': {
    species: 'Velociraptor',
    latin: 'Velociraptor mongoliensis · Gobi Desert · ~75 million years ago',
    fact: 'The first Velociraptor fossil was found here, at the Flaming Cliffs, in 1923. Quill knobs on its forearm bones show it carried wing feathers. Today it\'s hunting: a Protoceratops is somewhere ahead in the dunes.',
    quarry: { eyebrow: 'Field Journal · Today\'s quarry', name: 'Protoceratops', latin: 'Protoceratops andrewsi · a parrot-beaked plant eater the size of a sheep' },
    catchGoal: 'Catch the Protoceratops',
    caught: 'Caught the Protoceratops',
    go: 'Hunt!',
    pounce: 'Swipe up to pounce!',
    plate: {
      eyebrow: 'Field Journal · Plate II',
      title: 'Fighting Dinosaurs',
      text: 'Velociraptor and Protoceratops, locked together in the red sand of the Gobi. In 1971 a fossil of exactly this moment was found in these same rocks: ~75 million years ago, preserved by a collapsing dune.',
    },
    results: { title: 'Hunt complete!' },
    lost: {
      distance: 'The Protoceratops slipped out of sight. Run clean to close the gap; every stumble lets it pull ahead.',
      missed: 'You were close! When "Swipe up to pounce" appears, swipe up right away.',
    },
    stumble: 'Stumbled! The storm is closing in',
    callout: { title: 'Blue amber, with an insect inside', text: 'Trapped 75 million years ago. Find all 3 in this level for a star.' },
    caughtEyebrow: 'The sandstorm caught you',
    reviveLabel: 'Shake it off',
  },
  'jehol-forest': {
    species: 'Caudipteryx',
    latin: 'Caudipteryx zoui · Liaoning, China · ~125 million years ago',
    fact: 'A peacock-sized cousin of Oviraptor, with a fan of feathers on its tail and another on each arm. Its arms were too short to fly; the feathers were probably for show. This morning its egg is about to hatch, and it just rolled out of the nest. Downhill!',
    quarry: { eyebrow: 'Field Journal · Hatching day', name: 'Caudipteryx', latin: 'Caudipteryx zoui · a feathered cousin of Oviraptor, about the size of a peacock' },
    catchGoal: 'Catch the egg',
    caught: 'Caught the egg',
    go: 'After it!',
    pounce: 'Swipe up to scoop it up!',
    plate: {
      eyebrow: 'Field Journal · Plate I',
      title: 'Hatching Day',
      text: 'Oviraptor\'s family sat on their nests like birds: a cousin, Citipati, was found fossilized in exactly that pose in Mongolia. And their eggs may have been blue-green: a 2017 study found the pigments of blue-green eggs in the eggshells of another cousin, Heyuannia.',
    },
    results: { title: 'Egg saved!' },
    lost: {
      distance: 'The egg rolled out of sight. Run clean to catch up; every stumble lets it roll further ahead.',
      missed: 'So close! When "Swipe up to scoop it up" appears, swipe up right away.',
    },
    stumble: 'Stumbled! Keep your eye on the egg',
    callout: { title: 'Blue amber, with something inside', text: 'Tree resin turns to amber over millions of years. Find all 3 in this level for a star.' },
    hints: {
      lanes: 'Swipe left or right to change lanes',
      jump: 'Swipe up to jump logs and streams',
      slide: 'Swipe down to slide through hollow tree trunks',
      fork: 'The trail splits around a fallen giant tree. Pick a side: left is rougher, with more amber',
      magnet: 'Amber Sense pulls nearby amber to you',
    },
    crash: {
      boulder: ['Ouch', 'Ran into a tree', 'Tree trunks can\'t be jumped. Swipe left or right to go around them.'],
      ledge: ['Ouch', 'Tripped on a log', 'Swipe up to jump fallen logs.'],
      gully: ['Splash', 'Fell in the stream', 'Swipe up to jump the streams that cross the trail.'],
      arch: ['Ouch', 'Bumped the old trunk', 'Swipe down to slide through the hollow at its base.'],
      ribArch: ['Ouch', 'Hit the fallen trunk', 'Swipe down to slide under trunks that lie across the trail.'],
      spine: ['Ouch', 'Ran into the fallen giant', 'When the trail splits, pick the left or right side before the trunk.'],
      storm: ['Lost', 'The egg got away', 'Run clean to keep it in sight.'],
    },
    caughtEyebrow: 'Tumbled on the trail',
    reviveLabel: 'Get back up',
  },
};
