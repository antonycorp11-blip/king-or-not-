"""Verify every registered game character has its own complete packed sheet."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
folder = ROOT / 'assets/personagens/topdown'
catalog = json.loads((ROOT / 'build/topdown-catalog.json').read_text())
manifest = json.loads((folder / 'manifest.json').read_text())
ids = {c['id'] for c in catalog}
assert ids == {c['id'] for c in manifest['characters']}, 'Incomplete manifest'
assert ids == {p.stem for p in folder.glob('*.webp')}, 'Missing or unexpected sheet'
total = 0
for id in sorted(ids):
    path = folder / f'{id}.webp'
    image = Image.open(path)
    assert image.mode == 'RGBA' and image.size == (384, 640), f'{id}: invalid image'
    total += path.stat().st_size
    for row in range(4):
        for col in range(3):
            cell = image.crop((col*128, row*160, (col+1)*128, (row+1)*160))
            alpha = cell.getchannel('A')
            assert alpha.getextrema()[0] == 0, f'{id}: missing transparency'
            bounds = alpha.point(lambda a: 255 if a > 60 else 0).getbbox()
            assert bounds, f'{id}: empty cell {row},{col}'
            assert 0 < bounds[0] < bounds[2] < 128, f'{id}: horizontal clipping'
            assert 0 < bounds[1] < bounds[3] < 160, f'{id}: vertical clipping'
            assert abs(bounds[3]-148) <= 4, f'{id}: unaligned foot anchor'
assert len({(folder / f'{id}.webp').read_bytes() for id in ids}) == len(ids), 'Duplicated sheets'
print(f'OK: {len(ids)} unique characters, {len(ids)*12} frames, alpha and anchors checked. {total/1024/1024:.2f} MiB total.')
