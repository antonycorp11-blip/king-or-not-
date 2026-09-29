import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { CHARACTERS } from '../src/data/characters';
import { getTopDownFrame, loadTopDownAssets, TOPDOWN_DIRS } from '../src/render/topdown';
import { SceneView } from '../src/ui/sceneView';

// Exercise the actual loader/frame selection/scene renderer without a browser.
// PNG/WebP decoding, alpha and crop validation live in check_topdown.py.
let active = 0, peak = 0, failCorvinOnce = true;
class TestImage {
  naturalWidth = 384; naturalHeight = 640;
  onload!: () => void; onerror!: () => void;
  url = '';
  set src(url: string) {
    this.url = url; active++; peak = Math.max(peak, active);
    queueMicrotask(() => {
      active--;
      if (url.endsWith('/corvin.webp') && failCorvinOnce) { failCorvinOnce = false; this.onerror(); }
      else if (existsSync(url)) this.onload(); else this.onerror();
    });
  }
}
(globalThis as any).Image = TestImage;
const errors: unknown[] = [];
const originalError = console.error;
console.error = error => errors.push(error);
const failed = await loadTopDownAssets(() => {});
console.error = originalError;
assert.deepEqual(failed, ['corvin']);
assert.equal(errors.length, 1);
assert.ok(peak <= 4, 'Loading concurrency exceeds mobile limit');
assert.equal(getTopDownFrame('corvin', 'south', 0), null, 'Missing character must not borrow another identity');
assert.deepEqual(await loadTopDownAssets(() => {}, failed), []);
assert.equal(getTopDownFrame('unknown', 'south', 0), null);
for (const id of Object.keys(CHARACTERS)) {
  for (const dir of TOPDOWN_DIRS) {
    for (let frame = 0; frame < 6; frame++) {
      const walk = getTopDownFrame(id, dir, frame, 'walk')!;
      assert.ok(walk, `${id}/${dir}/${frame}`);
      assert.equal((walk.src as unknown as TestImage).url, `assets/personagens/topdown/${id}.webp`);
      assert.ok(walk.sx >= 0 && walk.sx + walk.sw <= 384);
      assert.ok(walk.sy >= 0 && walk.sy + walk.sh <= 640);
      assert.equal(getTopDownFrame(id, dir, frame, 'idle')!.sx, 0);
      assert.equal(getTopDownFrame(id, dir, frame, 'talk')!.sx, 0);
    }
  }
}

const scene = Object.create(SceneView.prototype) as any;
scene.kind = 'trono'; scene.hall = { objects: [], drawObject() {} };
const base = { key: 'speaker', id: 'corvin', x: 100, foot: 180, anim: 'walk', frame: 1, facing: -1 };
assert.equal(scene.hallDirection({ ...base, tx: 282 }), 'north', 'Audience approaches throne facing north');
assert.equal(scene.hallDirection({ ...base, leaving: true, tx: -40 }), 'south', 'Departing guest faces door');
assert.equal(scene.hallDirection({ ...base, key: 'wait-1' }), 'north');
assert.equal(scene.hallDirection({ ...base, key: 'guard1', facing: -1 }), 'west');
assert.equal(scene.hallDirection({ ...base, key: 'guard1', facing: 1 }), 'east');
assert.equal(scene.hallDirection({ ...base, key: 'rei', free: true, dir: 'east' }), 'east');
const drawn: TestImage[] = [];
const context = { canvas: { width: 1280, height: 720 }, clearRect() {}, beginPath() {}, ellipse() {}, fill() {}, save() {}, restore() {},
  scale(x: number) { assert.notEqual(x, -1, 'Directional artwork must not be mirrored by legacy facing'); },
  drawImage(image: TestImage) { drawn.push(image); } };
scene.actorsCanvas = { getContext: () => context };
for (const id of Object.keys(CHARACTERS)) {
  scene.actors = new Map([['speaker', { ...base, id }]]);
  scene.drawActors();
  assert.equal(drawn.at(-1)!.url, `assets/personagens/topdown/${id}.webp`);
}
console.log(`OK: loader failure recovery, all ${Object.keys(CHARACTERS).length} identities, four directions, idle/walk and scene rendering.`);
