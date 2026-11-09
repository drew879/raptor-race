import * as THREE from 'three';
import { Stage, FOG } from '../render/stage';
import { ChunkStreamer } from '../render/world/terrain';
import { CollectibleField } from '../render/world/collectibles';
import { createHazard, type HazardType } from '../render/world/hazards';
import { RaptorView } from '../render/raptor/view';
import { Runner } from '../game/runner';
import { RAPTOR_GOBI_STREAK } from '../render/palette';
import { LookPipeline, applyLookLighting, type LookName } from '../render/post/looks';

// Style-frame renderer: ?look=journal|mural|amber|graphic|current&view=run|hero|wide
const q = new URLSearchParams(location.search);
const look = (q.get('look') ?? 'current') as LookName;
const view = q.get('view') ?? 'run';
const container = document.getElementById('stage')!;
const stage = new Stage(container, { preserveDrawingBuffer: true });
const streamer = new ChunkStreamer(stage.world, false);
const items = new CollectibleField(120, FOG);
stage.world.add(items.group);
const raptor = new RaptorView(RAPTOR_GOBI_STREAK);
stage.world.add(raptor.root);
const r = new Runner();
r.distance = 64;
r.speed = 15;
const D = r.distance;
const place = (d: number, type: HazardType, lane: number) => {
  const m = createHazard(type);
  m.position.set(type === 'ledgeWide' || type === 'ribArch' ? 0 : lane * 1.5, 0, -(D + d));
  stage.world.add(m);
};
place(17, 'boulder', 0); place(17, 'boulder', -1);
place(31, 'arch', 1); place(48, 'ledgeWide', 0); place(64, 'ribArch', 0);
for (let d = 5; d <= 15; d += 2.6) items.add('amber', 1.5, 0.75, -(D + d));
for (let d = 26; d <= 36; d += 1.8) items.add('amber', 1.5, 0.36, -(D + d));
items.add('egg', -1.5, 0.9, -(D + 26));
items.update(1.3);
for (const f of [items.halos]) f.setScale(stage.renderer.domElement.height, stage.camera.fov);
streamer.prewarm(D);
const fog = stage.scene.fog as THREE.Fog;
applyLookLighting(look, { sun: stage.sun, hemi: stage.hemi, fog, sunDir: stage.sunDir });
stage.syncSun();
for (let i = 0; i < 16; i++) raptor.sync(r, 1 / 60, 0);
const z = -D;
const cam = stage.camera;
if (view === 'run') stage.chase(r.x, r.y, z, 1 / 60, true);
else if (view === 'hero') {
  cam.position.set(1.75, 0.55, z - 2.5);
  cam.lookAt(-0.15, 0.68, z - 0.15);
  stage.follow(0, z);
} else {
  cam.position.set(-5.5, 3.4, z + 5.5);
  cam.lookAt(2.5, 0.6, z - 38);
  stage.follow(0, z - 20);
}
const pipe = new LookPipeline(stage.renderer, stage.scene, cam, look);
pipe.render();
(window as unknown as { __ready: boolean }).__ready = true;
