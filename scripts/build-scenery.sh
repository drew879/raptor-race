#!/usr/bin/env bash
# Rebuilds every scanned scenery asset (CC0, Poly Haven). Needs Blender (scripts/setup-blender.sh) and network
# access to api.polyhaven.com and dl.polyhaven.org. Outputs are committed; raw downloads are cached in ~/.cache.
set -euo pipefail
B=/opt/blender-venv/bin/python
O=src/assets/models/scenery
run() { $B scripts/blender/scenery.py "$@" 2>&1 | grep -E "wrote|Error|Traceback" || true; }
run --id namaqualand_boulder_02 --tris 700  --palette hazard  --fit 1.4,1.55,1.15 --out $O/boulder_a.rrs
run --id namaqualand_boulder_03 --tris 700  --palette hazard  --fit 1.35,1.5,1.2  --out $O/boulder_b.rrs
run --id namaqualand_boulder_05 --tris 700  --palette hazard  --fit 1.4,1.45,1.1  --out $O/boulder_c.rrs
run --id namaqualand_cliff_01   --tris 1800 --palette cliff   --height 22 --out $O/cliff_a.rrs
run --id namaqualand_cliff_02   --tris 2200 --palette cliff   --height 28 --out $O/cliff_b.rrs
run --id mountainside           --tris 2000 --palette cliff   --height 30 --out $O/cliff_c.rrs
run --id namaqualand_stones_01  --tris 160  --palette scatter --height 0.35 --out $O/stones.rrs
run --id namaqualand_rocks_01   --tris 300  --palette scatter --height 0.8  --out $O/rock_b.rrs
run --id dead_quiver_trunk      --tris 500  --palette wood    --height 3.2  --out $O/dead_tree.rrs
run --id dead_quiver_branch_01  --tris 220  --palette wood    --height 1.1  --out $O/branch.rrs
run --id wild_rooibos_bush      --tris 160  --palette plant   --height 0.9  --out $O/bush.rrs
