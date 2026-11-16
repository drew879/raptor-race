import { LevelBuilder, type LevelDef } from './level';

/**
 * Level 1: Jehol Forest (Caudipteryx, Liaoning, ~125 mya). The tutorial: a runaway egg rolls down a winding
 * forest trail and you chase it to the bottom of the hill. Authored in world meters (k = 1).
 * Placeholder course while the forest is built; the real course follows docs/GDD.md.
 */
const B = new LevelBuilder({ start: 13, end: 18 }, 1100, 1);

B.hint(10, 'lanes');
B.line(20, 40, 0);
B.hz(50, 'boulder', 0);
B.line(55, 75, 1);
B.hint(90, 'jump');
B.hz(110, 'ledge', 0, 1, -1).arcOver(110, 0);
B.hz(150, 'gully', 0).arcOver(150, 0);
B.hint(180, 'slide');
B.hz(200, 'arch', 0).hz(200, 'boulder', -1, 1).low(196, 204, 0);
B.hz(240, 'ribArch', 0).low(236, 244, 0);
B.hint(280, 'fork');
B.fork(310, 360);
B.egg(330, -1, 0.8);
B.egg(500, 1, 0.8);
B.egg(700, 0, 0.8);
B.line(400, 440, 0);

B.section(0, 'hilltop');
B.section(60, 'conifers');
B.section(300, 'ferns');
B.section(500, 'streamside');
B.section(700, 'ginkgo');
B.section(1000, 'clearing');

B.bend(30, 120, -1);
B.bend(160, 260, 1.1);
B.bend(380, 470, -1);

export const JEHOL_FOREST: LevelDef = B.build({
  id: 'jehol-forest',
  name: 'Jehol Forest',
  biome: 'forest',
  hero: 'caudipteryx',
  slope: { grade: 0.17, from: 8, to: 1035 },
  prey: { species: 'egg', startGap: 11, finale: 80, hunt: { minGap: 6.5, lostGap: 34, warnGap: 22, stumbleGap: 6, pinHeight: 0, pinOffset: 0.79, pounceArc: 0.35, pounceTime: 0.5 } },
  checkpoints: [400, 760],
  stormRises: 2000, // no storm in the forest
  music: 'chase-strings',
  parScore: 9000,
});
