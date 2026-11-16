import { LevelBuilder, type LevelDef } from './level';

/**
 * Level 1: Jehol Forest (Caudipteryx, Liaoning, ~125 mya). The tutorial (owner: the tutorial moves here; the
 * Velociraptor hunt becomes Level 2 and gets a little harder). A runaway egg rolls down a winding forest trail
 * and you chase it to the bottom of the hill. Authored in world meters (k = 1) at 13-18 m/s; every decision is
 * at least ~1.5 s from the next, one new move per stretch: lanes, jumps, slides, a fork, a power-up.
 */
const B = new LevelBuilder({ start: 13, end: 18 }, 1100, 1);

// Lanes (0-170): trees and mossy rocks to go around.
B.hint(8, 'lanes');
B.line(18, 40, 0);
B.hz(56, 'boulder', 0).line(46, 70, 1);
B.hz(88, 'boulder', 1).line(80, 100, 0);
B.hz(118, 'boulder', 0, -1).line(108, 130, 1);
B.hz(148, 'boulder', -1, 1).line(140, 160, 0);

// Jumps (170-330): fallen logs across the trail and streams.
B.hint(172, 'jump');
B.hz(200, 'ledge', -1, 0, 1).arcOver(200, 0);
B.line(212, 226, 0);
B.hz(240, 'gully', 0).arcOver(240, 0);
B.line(252, 264, 1);
B.hz(276, 'ledge', -1, 0, 1).arcOver(276, 1);
B.hz(310, 'gully', 0).arcOver(310, 0);
B.line(318, 328, 0);

// Slides (330-480): a trunk propped across the trail, then old trunks with hollows at their base. Inclusion 1
// waits inside the hollow on the left (the other lanes are clear: it's yours if you go for it).
B.hint(334, 'slide');
B.hz(362, 'ribArch', 0).low(357, 367, 0);
B.line(374, 384, 0);
B.hz(398, 'arch', 0).hz(398, 'boulder', -1, 1).low(393, 403, 0);
B.line(410, 420, 0);
B.hz(434, 'arch', -1).egg(434, -1, 0.4);
B.line(426, 446, 0);
B.hz(462, 'ribArch', 0).low(457, 467, 0);
B.line(472, 482, 0);

// Checkpoint 1 at 488. The fork (490-600): a fallen giant down the middle. Left is rough and rich (inclusion 2),
// right is easy and sparse (the egg rolls right).
B.hint(498, 'fork');
B.line(510, 526, -1).line(510, 526, 1);
B.fork(530, 586);
B.line(532, 536, -1);
B.hz(542, 'ledge', -1).arcOver(542, -1);
B.hz(566, 'arch', -1).low(562, 570, -1); // a full ~1.5 s after the log: land, then slide
B.egg(580, -1, 0.8);
B.line(534, 582, 1, 1); // quarter notes: the easy side pays less
B.hz(556, 'ledge', 1);

// A stream, then Amber Sense (the power-up), then mixed patterns (600-745).
B.hz(605, 'gully', 0).arcOver(605, 0);
B.hint(614, 'magnet');
B.power(624, 'magnet', [0]);
B.line(632, 662, -1).line(632, 662, 1);
B.hz(648, 'boulder', 0);
B.hz(680, 'ledge', 0, -1).hz(680, 'boulder', 1).arcOver(680, 0);
B.hz(708, 'ribArch', 0).low(703, 713, 0);
B.line(716, 736, 0);

// Checkpoint 2 at 745. Everything together, down the last of the hill (745-1020). Inclusion 3 hangs over the log
// in the right lane: jump it to grab it.
B.hz(765, 'boulder', 0, 1).line(756, 776, -1);
B.hz(790, 'gully', 0).arcOver(790, -1);
B.hz(815, 'arch', -1).hz(815, 'boulder', 0).low(811, 819, -1).line(806, 824, 1);
B.hz(842, 'ledge', -1, 0, 1).arcOver(842, 1);
B.hz(870, 'boulder', -1).hz(870, 'ledge', 1).egg(870, 1, 1.9);
B.line(856, 864, 0).line(878, 892, 0);
B.hz(900, 'gully', 0).arcOver(900, 0);
B.hz(925, 'ribArch', 0).low(920, 930, 0);
B.hz(950, 'boulder', -1, 1).line(941, 961, 0);
B.hz(975, 'ledge', 0).hz(975, 'boulder', -1).arcOver(975, 0);
B.hz(1000, 'gully', 0).arcOver(1000, 0);

// The bottom of the hill (1010-1100): the trail levels out into a clearing, the egg slows in the soft moss, and
// you scoop it up.
B.line(1010, 1030, 0);
B.line(1036, 1058, 1).line(1036, 1058, -1);
B.line(1066, 1090, 0);

// The stretches the trail runs through.
B.section(0, 'hilltop');
B.section(50, 'conifers');
B.section(330, 'ferns');
B.section(590, 'streamside');
B.section(740, 'ginkgo');
B.section(900, 'conifers');
B.section(1005, 'clearing');

// A winding trail (owner: "a windy dirt trail"): bends alternate, none during a fork.
B.bend(20, 110, -0.9);
B.bend(128, 198, 1.0);
B.bend(214, 300, -1.1);
B.bend(340, 420, 0.9);
B.bend(436, 520, -1.0);
B.bend(592, 672, 1.1);
B.bend(688, 760, -1.0);
B.bend(775, 850, 1.2);
B.bend(860, 940, -1.0);
B.bend(950, 1020, 0.9);

export const JEHOL_FOREST: LevelDef = B.build({
  id: 'jehol-forest',
  name: 'Jehol Forest',
  biome: 'forest',
  hero: 'caudipteryx',
  // Downhill from the crest by the nest to the clearing at the bottom (visual; the simulation stays level).
  slope: { grade: 0.17, from: 8, to: 1035 },
  prey: { species: 'egg', startGap: 11, finale: 80, hunt: { minGap: 6.5, lostGap: 34, warnGap: 22, stumbleGap: 6, pinHeight: 0, pinOffset: 0.79, pounceArc: 0.35, pounceTime: 0.5 } },
  checkpoints: [488, 745],
  stormRises: 2000, // no storm in the forest
  music: 'chase-strings',
  parScore: 9500, // ~89% of a perfect run (10,620), the same ratio as Level 2
});
