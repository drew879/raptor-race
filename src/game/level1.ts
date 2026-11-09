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
B.line(16, 34, 0);
B.line(40, 58, 1);
B.hz(64, 'boulder', 0, -1);
B.line(72, 88, -1);
B.hz(96, 'boulder', 1);
B.hz(108, 'boulder', -1);
B.line(100, 116, 0);
B.hz(126, 'boulder', 0, 1);
B.line(124, 140, -1);

// Beat 2: ledges, teaches jumping (148-290).
B.hint(146, 'jump');
B.hz(168, 'ledgeWide', 0).arcOver(168, -1).arcOver(168, 0);
B.line(178, 192, -1);
B.hz(202, 'ledge', -1).hz(202, 'boulder', 0, 1).arcOver(202, -1);
B.line(212, 222, 0);
B.hz(232, 'boulder', 0);
B.line(230, 244, 1);
B.hz(256, 'ledgeWide', 0).arcOver(256, 1);
B.hz(276, 'ledge', 0, 1).hz(276, 'boulder', -1).arcOver(276, 1).arcOver(276, 0);

// Beat 3: arches and bones, teaches sliding; Egg 1 under a side arch (286-425).
B.hint(286, 'slide');
B.hz(304, 'ribArch', 0).low(300, 309, 1).low(300, 309, 0);
B.line(316, 328, 0);
B.hz(338, 'arch', 0).hz(338, 'boulder', -1, 1).low(334, 342, 0);
B.line(350, 362, 0);
B.hz(374, 'boulder', 0).hz(374, 'arch', -1).egg(374, -1, 0.4);
B.line(366, 382, 1);
B.hz(394, 'ribArch', 0).low(390, 398, 1).low(390, 398, -1);
B.hz(412, 'ledgeWide', 0).arcOver(412, 0);

// Checkpoint 1 at 425. Beat 4: mixed patterns with the Amber Sense magnet (430-600).
B.hint(436, 'magnet');
B.power(442, 'magnet', [0]);
B.line(452, 472, -1).line(452, 472, 1);
B.hz(464, 'boulder', 0);
B.hz(484, 'ledge', -1, 0).hz(484, 'boulder', 1).arcOver(484, 0);
B.hz(502, 'arch', 0, 1).hz(502, 'boulder', -1).low(498, 506, 0);
B.line(512, 526, 1);
B.hz(536, 'boulder', 1, 0);
B.line(538, 554, -1);
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
B.line(712, 730, 0);
B.hz(742, 'ledgeWide', 0).arcOver(742, 0);
B.hz(760, 'boulder', 0);
B.line(754, 768, 1);

// Checkpoint 2 at 772. Beat 6: the storm rises; combos (772-1020).
B.hz(790, 'ledge', 0).hz(790, 'boulder', -1, 1).arcOver(790, 0);
B.hz(806, 'arch', 0).hz(806, 'boulder', -1, 1).low(802, 810, 0);
B.line(816, 828, 0);
B.hz(838, 'boulder', 0).hz(838, 'ledge', -1).hz(838, 'arch', 1).arcOver(838, -1).low(834, 842, 1);
B.hz(858, 'ribArch', 0).low(854, 862, 0);
B.hz(876, 'ledgeWide', 0).arcOver(876, 0);
// Egg 3: jump the ledge in the middle, then cut right behind the boulder.
B.hz(894, 'ledge', 0, 1).hz(894, 'boulder', -1).arcOver(894, 0);
B.hz(900, 'boulder', 1);
B.egg(910, 1, 0.8);
B.line(914, 926, 0);
B.hz(938, 'arch', -1, 0).hz(938, 'boulder', 1).low(934, 942, 0);
B.hz(956, 'ledge', -1, 1).hz(956, 'boulder', 0).arcOver(956, -1).arcOver(956, 1);
B.hz(972, 'ribArch', 0).low(968, 976, 1).low(968, 976, -1);
B.hz(990, 'boulder', -1, 1);
B.line(984, 1000, 0);
B.hz(1008, 'ledgeWide', 0).arcOver(1008, 0);

// Beat 7: final dash to the nest (1020-1100).
B.line(1018, 1040, 0);
B.line(1046, 1068, 1).line(1046, 1068, -1);
B.line(1074, 1094, 0);

export const LEVEL1: LevelDef = B.build({
  id: 'flaming-cliffs',
  name: 'Flaming Cliffs',
  prey: { species: 'protoceratops', startGap: 24, finale: 90 },
  checkpoints: [425 * K, 772 * K],
  stormRises: 772 * K,
  parScore: 14000,
});
