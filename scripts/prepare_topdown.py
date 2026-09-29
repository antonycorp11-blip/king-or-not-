"""Pack generated 3x4 sheets for the game. Originals remain in assets/raw/topdown.

Run after exporting build/topdown-catalog.json (see topdown:prepare).
No artwork is synthesized: cells are trimmed, aligned and downsampled with alpha.
"""
import json
from pathlib import Path
from statistics import median
from PIL import Image, ImageOps
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets/raw/topdown'
OUT = ROOT / 'assets/personagens/topdown'
CW, CH, FOOT = 128, 160, 148


def prepare(id):
    image = Image.open(SRC / f'{id}.png').convert('RGBA')
    # Generation respects the row/column order but not exact mathematical
    # gutters. Locate transparent seams before slicing to avoid clipped crowns.
    mask = np.array(image.getchannel('A')) > 60
    def seams(projection, count):
        length = len(projection)
        result = [0]
        for index in range(1, count):
            middle = round(index * length / count)
            radius = round(length / count / 3)
            lo, hi = middle-radius, middle+radius
            values = projection[lo:hi]
            quiet = np.flatnonzero(values <= values.min()+2)
            runs = np.split(quiet, np.where(np.diff(quiet)>1)[0]+1)
            run = max(runs, key=len)
            result.append(lo + int(run[len(run)//2]))
        return result + [length]
    ys = seams(mask.sum(axis=1), 4)
    xs = seams(mask.sum(axis=0), 3)
    frames = []
    for row in range(4):
        for col in range(3):
            # One generated king frame faces east in the west row. Use the
            # matching east step, mirrored, to keep his west cycle consistent.
            source_row = 2 if id in ('rei', 'mensageiro') and row == 1 and col == 2 else row
            if id == 'morgana' and row == 2: source_row = 1
            mirror = source_row != row
            if id == 'bruna' and row in (1, 2): source_row = 3-row
            box = (xs[col], ys[source_row], xs[col+1], ys[source_row+1])
            cell = image.crop(box)
            # Alpha threshold is only for finding the subject bounds; original
            # alpha is preserved in the packed artwork.
            bounds = cell.getchannel('A').point(lambda a: 255 if a > 60 else 0).getbbox()
            if not bounds:
                raise ValueError(f'{id}: empty frame {row},{col}')
            x0, y0, x1, y1 = bounds
            if x0 == 0 or x1 == cell.width or y0 == 0 or y1 == cell.height:
                raise ValueError(f'{id}: frame touches cell edge {row},{col}; inspect source')
            frame = cell.crop((max(0, x0-2), max(0, y0-2), min(cell.width, x1+2), min(cell.height, y1+2)))
            if mirror:
                frame = ImageOps.mirror(frame)
            frames.append(frame)
    atlas = Image.new('RGBA', (CW * 3, CH * 4))
    for i, frame in enumerate(frames):
        direction = frames[(i//3)*3:(i//3+1)*3]
        scale = min(132 / median(f.height for f in direction),
                    120 / max(f.width for f in direction), 142 / max(f.height for f in direction))
        frame = frame.resize((round(frame.width * scale), round(frame.height * scale)), Image.Resampling.LANCZOS)
        atlas.paste(frame, ((i % 3) * CW + (CW - frame.width)//2, (i//3) * CH + FOOT-frame.height))
    OUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUT / f'{id}.webp', lossless=True, method=4)
    return {'id': id, 'file': f'{id}.webp', 'frames': 12, 'width': CW*3, 'height': CH*4, 'foot': FOOT}


if __name__ == '__main__':
    catalog = json.loads((ROOT / 'build/topdown-catalog.json').read_text())
    packed = [prepare(c['id']) for c in catalog]
    (OUT / 'manifest.json').write_text(json.dumps({'cellWidth': CW, 'cellHeight': CH,
        'directions': ['south', 'west', 'east', 'north'], 'characters': packed}, indent=2) + '\n')
    print(f'{len(packed)} sheets / {len(packed)*12} frames packed and checked.')
