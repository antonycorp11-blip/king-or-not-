"""Recorta as folhas de objetos geradas (fundo transparente, objetos espaçados) e
empacota tudo para o jogo. Nenhum arquivo precisa ser renomeado: cada folha é
reconhecida pelo nome original em SHEETS, e cada objeto recebe nome pela ordem de
leitura (linha por linha, da esquerda para a direita).

  python3 scripts/prepare_props.py --debug   # gera build/props-debug/<folha>.png numeradas
  python3 scripts/prepare_props.py           # gera assets/cenarios/props/*.webp + props.json
"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / 'assets/raw/cenarios'
OUT = ROOT / 'assets/cenarios/props'
DEBUG = ROOT / 'build/props-debug'

# folha original -> (id da folha, nomes dos objetos em ordem de leitura)
SHEETS = json.loads((ROOT / 'scripts/props_names.json').read_text()) if (ROOT / 'scripts/props_names.json').exists() else {}
TEXTURES = json.loads((ROOT / 'scripts/props_textures.json').read_text()) if (ROOT / 'scripts/props_textures.json').exists() else {}


def components(img: Image.Image, split: bool = False):
    a = np.array(img.getchannel('A'))
    mask = a > (150 if split else 40)
    # separação fina; depois pedaços pequenos (chamas, fumaça, moedas soltas) são
    # colados ao objeto grande mais próximo
    grown = mask if split else ndimage.binary_dilation(mask, iterations=3)
    labels, n = ndimage.label(grown)
    raw = []
    for i, sl in enumerate(ndimage.find_objects(labels), start=1):
        if sl is None:
            continue
        ys, xs = sl
        region = mask[ys, xs] & (labels[ys, xs] == i)
        area = int(region.sum())
        if area < 30:
            continue
        rows = np.flatnonzero(region.any(axis=1)); cols = np.flatnonzero(region.any(axis=0))
        raw.append([xs.start + cols[0], ys.start + rows[0], xs.start + cols[-1] + 1, ys.start + rows[-1] + 1, area])
    big = [b for b in raw if b[4] >= 2500]
    small = [b for b in raw if b[4] < 2500]
    def gap(p, q):
        dx = max(0, max(p[0], q[0]) - min(p[2], q[2]))
        dy = max(0, max(p[1], q[1]) - min(p[3], q[3]))
        return max(dx, dy)
    for sm in small:
        near = min(big, key=lambda b: gap(sm, b), default=None)
        if near is not None and gap(sm, near) <= 45:
            near[0] = min(near[0], sm[0]); near[1] = min(near[1], sm[1]); near[2] = max(near[2], sm[2]); near[3] = max(near[3], sm[3])
        elif sm[4] >= 600:
            big.append(sm)
    boxes = [tuple(b[:4]) for b in big]
    if split:
        # corta caixas que têm uma faixa horizontal vazia no meio (objetos empilhados)
        out = []
        for b in boxes:
            sub = (np.array(img.getchannel("A"))[b[1]:b[3], b[0]:b[2]] > 120).sum(axis=1) > 4
            empty = np.flatnonzero(~sub)
            cuts = [b[1]]
            if len(empty):
                runs = np.split(empty, np.where(np.diff(empty) > 1)[0] + 1)
                for r in runs:
                    if len(r) >= 3 and r[0] > 20 and r[-1] < len(sub) - 20:
                        cuts.append(b[1] + int(r[len(r) // 2]))
            cuts.append(b[3])
            for y0, y1 in zip(cuts, cuts[1:]):
                seg = mask[y0:y1, b[0]:b[2]]
                cols = np.flatnonzero(seg.any(axis=0)); rows = np.flatnonzero(seg.any(axis=1))
                if len(cols) and seg.sum() > 2500:
                    out.append((b[0] + cols[0], y0 + rows[0], b[0] + cols[-1] + 1, y0 + rows[-1] + 1))
        boxes = out
    # ordem de leitura: agrupa por linhas pelo centro vertical
    boxes.sort(key=lambda b: (b[1] + b[3]) / 2)
    rows, cur = [], []
    for b in boxes:
        cy = (b[1] + b[3]) / 2
        if cur and cy - (cur[-1][1] + cur[-1][3]) / 2 > max(60, (cur[-1][3] - cur[-1][1]) * 0.55):
            rows.append(cur); cur = []
        cur.append(b)
    if cur:
        rows.append(cur)
    ordered = []
    for r in rows:
        ordered += sorted(r, key=lambda b: b[0])
    return ordered


def debug():
    DEBUG.mkdir(parents=True, exist_ok=True)
    for f in sorted(RAW.glob('*.PNG')):
        img = Image.open(f).convert('RGBA')
        if img.getchannel('A').getextrema()[0] > 200:
            continue  # textura opaca
        boxes = components(img, SHEETS.get(f.name, {}).get('split', False))
        view = Image.new('RGBA', img.size, (70, 70, 90, 255))
        view.alpha_composite(img)
        d = ImageDraw.Draw(view)
        for i, b in enumerate(boxes):
            d.rectangle(b, outline=(255, 230, 0, 255), width=3)
            d.rectangle((b[0], b[1], b[0] + 44, b[1] + 30), fill=(0, 0, 0, 255))
            d.text((b[0] + 6, b[1] + 6), str(i), fill=(255, 255, 0, 255))
        view.convert('RGB').resize((img.width // 2, img.height // 2)).save(DEBUG / f'{f.stem[:8]}.jpg', quality=80)
        print(f.name, len(boxes))


def pack():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {'sheets': {}, 'props': {}, 'textures': {}}
    for fname, spec in SHEETS.items():
        img = Image.open(RAW / fname).convert('RGBA')
        boxes = components(img, spec.get('split', False))
        names = spec['names']
        if len(boxes) != len(names):
            raise SystemExit(f'{fname}: {len(boxes)} objetos encontrados, {len(names)} nomes')
        # empacota em prateleiras, com margem, reduzindo à escala do jogo
        k = spec.get('scale', 0.5)
        crops = [(n, img.crop(b)) for n, b in zip(names, boxes) if n != '-']
        crops = [(n, c.resize((max(1, round(c.width * k)), max(1, round(c.height * k))), Image.Resampling.LANCZOS)) for n, c in crops]
        W = 1024
        x = y = rowh = 0
        placed = []
        for n, c in sorted(crops, key=lambda t: -t[1].height):
            if x + c.width + 4 > W:
                x, y, rowh = 0, y + rowh + 4, 0
            placed.append((n, c, x, y))
            x += c.width + 4
            rowh = max(rowh, c.height)
        H = y + rowh
        atlas = Image.new('RGBA', (W, H))
        sid = spec['id']
        for n, c, px, py in placed:
            atlas.paste(c, (px, py))
            manifest['props'][n] = [sid, px, py, c.width, c.height]
        atlas.save(OUT / f'{sid}.webp', lossless=True, method=4)
        manifest['sheets'][sid] = f'{sid}.webp'
        print(f'{sid}: {len(placed)} objetos')
    for fname, spec in TEXTURES.items():
        img = Image.open(RAW / fname).convert('RGB')
        size = spec.get('size', [256, 256])
        img.resize(tuple(size), Image.Resampling.LANCZOS).save(OUT / f"{spec['id']}.webp", quality=92, method=4)
        manifest['textures'][spec['id']] = f"{spec['id']}.webp"
    (OUT / 'props.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + '\n')
    print(f"{len(manifest['props'])} objetos e {len(manifest['textures'])} texturas empacotados.")


if __name__ == '__main__':
    debug() if '--debug' in sys.argv else pack()
