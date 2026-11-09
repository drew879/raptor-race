import { LevelBuilder, type LevelDef } from './level';

/**
 * Level 1: Flaming Cliffs (Velociraptor, Gobi, ~75 mya). Fairly easy, never trivial.
 * Beats follow docs/GDD.md section 8. Decisions are spaced at least ~1 s apart at running speed.
 */
// Authored in design meters at the original 10-14 m/s; K scales to world meters for 15-21 m/s so every
// reaction window keeps the same duration (owner playtest: "too slow", deaths "felt fair").
const K = 1.5;
const B = new LevelBuilder({ start: 15, end: 21 }, 1100 * K, K);

// Beat 1: dawn dunes, teaches lane changes (0-150).
B.hint(10, 'lanes');
B.line(16, 32, 0);
B.hz(39, 'boulder', 0); // pacing: the first dodge comes sooner
B.line(42, 58, 1);
B.hz(64, 'boulder', 0, -1);
B.line(72, 88, -1);
B.hz(80, 'boulder', 1);
B.hz(96, 'boulder', 1);
B.hz(108, 'boulder', -1);
B.line(100, 116, 0);
B.hz(126, 'boulder', 0, 1);
B.line(124, 136, -1);
B.hz(142, 'boulder', -1);

// Beat 2: ledges, teaches jumping (148-290).
B.hint(146, 'jump');
B.hz(168, 'ledgeWide', 0).arcOver(168, -1).arcOver(168, 0);
B.line(176, 182, -1);
B.hz(188, 'ledge', -1).arcOver(188, -1); // jump, jump: a rhythm instead of a gap
B.hz(202, 'ledge', -1).hz(202, 'boulder', 0, 1).arcOver(202, -1);
B.line(210, 222, 1);
B.hz(217, 'boulder', 0);
B.hz(232, 'boulder', 0);
B.line(230, 244, 1);
B.hz(256, 'ledgeWide', 0).arcOver(256, 1);
B.hz(276, 'ledge', 0, 1).hz(276, 'boulder', -1).arcOver(276, 1).arcOver(276, 0);

// Beat 3: arches and bones, teaches sliding; Egg 1 under a side arch (286-425).
B.hint(286, 'slide');
B.hz(304, 'ribArch', 0).low(300, 309, 1).low(300, 309, 0);
B.line(314, 326, 1);
B.hz(322, 'boulder', 0);
B.hz(338, 'arch', 0).hz(338, 'boulder', -1, 1).low(334, 342, 0);
B.hz(356, 'ledge', 0).arcOver(356, 0);
B.hz(374, 'boulder', 0).hz(374, 'arch', -1).egg(374, -1, 0.4);
B.line(366, 382, 1);
B.hz(394, 'ribArch', 0).low(390, 398, 1).low(390, 398, -1);
B.hz(412, 'ledgeWide', 0).arcOver(412, 0);

// Checkpoint 1 at 425. Beat 4: mixed patterns with the Amber Sense magnet (430-600).
B.hz(428, 'boulder', -1, 1);
B.hint(436, 'magnet');
B.power(442, 'magnet', [0]);
B.line(452, 472, -1).line(452, 472, 1);
B.hz(464, 'boulder', 0); // already in a side lane when the fin appears
// Fork 1: a rock fin splits the trail. Left is rough and rich; right is easy and sparse (the prey goes right).
// It sits mid-level on solid ground, well away from the updraft landing (owner playtest: landing into a fin).
B.hint(456, 'fork'); // early enough to read before the fin
B.fork(484, 530);
B.line(486, 490, -1);
B.hz(495, 'ledge', -1).arcOver(495, -1);
B.hz(508, 'arch', -1).low(504, 512, -1);
B.hz(521, 'ledge', -1).arcOver(521, -1);
B.line(487, 501, 1, 4.6);
B.hz(511, 'ledge', 1);
B.line(516, 528, 1, 5);
B.line(536, 552, -1);
B.hz(547, 'boulder', 1, 0);
B.hz(564, 'ribArch', 0).low(560, 568, -1);
B.hz(580, 'ledgeWide', 0).arcOver(580, -1);
B.hz(596, 'boulder', -1);
B.line(592, 604, 0);

// Beat 5: Updraft glide over a boulder field no runner could cross; Egg 2 high in the glide path (606-770).
B.hint(606, 'updraft');
B.power(616, 'updraft', [-1, 0, 1]);
for (let d = 640; d <= 680; d += 10) B.hz(d, 'boulder', -1, 0, 1);
B.sky(628, 692, 0, 2.75, 3.2);
B.sky(644, 676, 1, 2.75, 4);
B.egg(666, -1, 2.75);
// After the glide: a clear landing (nothing for ~2.5 s), then a gentle run-in to the checkpoint.
B.line(712, 730, 0);
B.hz(742, 'ledgeWide', 0).arcOver(742, 0);
B.hz(760, 'boulder', 0);
B.line(754, 768, 1);

// Checkpoint 2 at 772. Beat 6: the storm rises; combos (772-1020).
B.hz(790, 'ledge', 0).hz(790, 'boulder', -1, 1).arcOver(790, 0);
B.hz(806, 'arch', 0).hz(806, 'boulder', -1, 1).low(802, 810, 0);
B.hz(822, 'ledge', 0).arcOver(822, 0);
B.hz(838, 'boulder', 0).hz(838, 'ledge', -1).hz(838, 'arch', 1).arcOver(838, -1).low(834, 842, 1);
B.hz(858, 'ribArch', 0).low(854, 862, 0);
B.hz(876, 'ledgeWide', 0).arcOver(876, 0);
// Egg 3: jump the ledge in the middle, then cut right behind the boulder.
B.hz(894, 'ledge', 0, 1).hz(894, 'boulder', -1).arcOver(894, 0);
B.hz(900, 'boulder', 1);
B.egg(910, 1, 0.8);
// Fork 2: right after the egg you're already on the rough side; it pays, the left is easy (the prey goes left).
B.fork(922, 968);
B.hz(932, 'arch', 1).low(928, 936, 1);
B.hz(945, 'ledge', 1).arcOver(945, 1);
B.hz(958, 'arch', 1).low(954, 962, 1);
B.line(926, 940, -1, 4.6);
B.hz(950, 'ledge', -1);
B.line(956, 966, -1, 5);
B.hz(980, 'ribArch', 0).low(976, 984, 0);
B.hz(994, 'boulder', -1, 1);
B.line(988, 1002, 0);
B.hz(1010, 'ledgeWide', 0).arcOver(1010, 0);

// Beat 7: final dash to the nest (1020-1100).
B.line(1018, 1040, 0);
B.line(1046, 1068, 1).line(1046, 1068, -1);
B.line(1074, 1094, 0);

// Automatic bends (visual): mostly gentle, never during a teaching beat's first obstacle.
B.bend(20, 95, 0.8);
B.bend(205, 280, -0.9);
B.bend(310, 372, 0.7);
B.bend(440, 525, -1);
B.bend(545, 605, 0.9);
B.bend(700, 765, -1);
B.bend(790, 870, 1);
B.bend(915, 975, -0.8);
B.bend(1012, 1100, 1.1);

export const LEVEL1: LevelDef = B.build({
  id: 'flaming-cliffs',
  name: 'Flaming Cliffs',
  prey: { species: 'protoceratops', startGap: 24, finale: 90 },
  checkpoints: [425 * K, 772 * K],
  stormRises: 772 * K,
  parScore: 14000,
});
