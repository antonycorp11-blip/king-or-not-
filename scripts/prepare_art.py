"""Prepara a arte gerada para o jogo.

Lê as folhas originais em assets/raw/ (NN_id_corpo.png, NN_id_retrato.png) e grava em
assets/personagens/ as versões prontas:
  - corpo:   384x256 (grade 6x2 de 64x128), cada quadro separado, com pés e cabeça alinhados
  - retrato: 256x256 (grade 2x2 de 128x128)

Uso:  python3 scripts/prepare_art.py            (processa tudo)
      python3 scripts/prepare_art.py 01_rei    (só um personagem)
"""
import sys
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / 'assets' / 'raw'
OUT = ROOT / 'assets' / 'personagens'
CW, CH = 64, 128  # célula no jogo
AXIS = 31  # eixo do corpo dentro da célula (virado para a direita)
BOTTOM = 124  # linha dos pés (FOOT = 123)
ALPHA_MIN = 110

# escala por personagem (jovens e damas são menores que os guardas e lordes)
SCALE = {
    '12_elenora': 0.82, '13_rhoswen': 0.86, '14_isolde': 0.84, '15_sigrid': 0.83,
    '02_isabelle': 0.9, '10_aveline': 0.88, '18_marta': 0.88, '21_camponesa': 0.84, '24_dama': 0.85, '25_irma': 0.88,
    '03_lucas': 0.8, '22_mensageiro': 0.9, '01_rei': 0.92,
}


def binarize(im: Image.Image) -> Image.Image:
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, 255) if a >= ALPHA_MIN else (0, 0, 0, 0)
    return im


def components(im: Image.Image):
    """Componentes conectados (8 vizinhos) dos pixels opacos."""
    w, h = im.size
    a = im.getchannel('A').load()
    seen = [[False] * w for _ in range(h)]
    comps = []
    for y0 in range(h):
        for x0 in range(w):
            if seen[y0][x0] or a[x0, y0] == 0:
                continue
            q = deque([(x0, y0)])
            seen[y0][x0] = True
            pts = []
            while q:
                x, y = q.popleft()
                pts.append((x, y))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and a[nx, ny]:
                            seen[ny][nx] = True
                            q.append((nx, ny))
            comps.append(pts)
    return comps


def frames_fixed(row: Image.Image, cw: int = CW):
    """Recorte pela grade fixa (quando as figuras se encostam, como o rei no trono)."""
    out = []
    for c in range(6):
        cell = row.crop((c * cw, 0, (c + 1) * cw, row.height))
        bb = cell.getbbox()
        out.append(cell.crop(bb) if bb else None)
    return out


def frames_of_row(row: Image.Image, cw: float = CW):
    """Separa as 6 figuras de uma linha, mesmo quando capas invadem a célula vizinha."""
    comps = components(row)
    groups = [[] for _ in range(6)]
    for pts in comps:
        if len(pts) < 15:  # descarta farelos de pixels
            continue
        cx = sum(p[0] for p in pts) / len(pts)
        groups[min(5, max(0, int(cx // cw)))].extend(pts)
    frames = []
    src = row.load()
    for pts in groups:
        if not pts:
            frames.append(None)
            continue
        x0 = min(p[0] for p in pts); x1 = max(p[0] for p in pts)
        y0 = min(p[1] for p in pts); y1 = max(p[1] for p in pts)
        fr = Image.new('RGBA', (x1 - x0 + 1, y1 - y0 + 1), (0, 0, 0, 0))
        fp = fr.load()
        for x, y in pts:
            fp[x - x0, y - y0] = src[x, y]
        frames.append(fr)
    return frames


def center_x(fr: Image.Image, top: float, bottom: float) -> float:
    a = fr.getchannel('A').load()
    xs = [x for y in range(int(fr.height * top), max(int(fr.height * bottom), int(fr.height * top) + 1)) for x in range(fr.width) if a[x, y]]
    return sum(xs) / len(xs) if xs else fr.width / 2


def process_body(src: Path, dst: Path, seated_first_row: bool, f: float = 1.0):
    cw, ch = round(CW * f), round(CH * f)
    im = Image.open(src).convert('RGBA').resize((cw * 6, ch * 2), Image.BOX)
    im = binarize(im)
    out = Image.new('RGBA', (CW * 6, CH * 2), (0, 0, 0, 0))
    for r in range(2):
        row = im.crop((0, r * ch, cw * 6, (r + 1) * ch))
        if seated_first_row and r == 0:
            # o rei no trono mantém o tamanho do trono
            row = binarize(Image.open(src).convert('RGBA').resize((CW * 6, CH * 2), Image.BOX)).crop((0, 0, CW * 6, CH))
            frames = frames_fixed(row)
        else:
            frames = frames_of_row(row, cw)
        idle_bottom = None
        for c, fr in enumerate(frames):
            if fr is None:
                continue
            y = r * CH + BOTTOM - fr.height
            if seated_first_row and r == 0:
                x = 1  # trono incluso: alinha pelo encosto para ele não tremer
            elif r == 1 and c in (4, 5) and idle_bottom is not None:
                x = round(idle_bottom - center_x(fr, 0.75, 1.0))  # reverência/ajoelhado: alinha pelos pés
            else:
                x = round(AXIS - center_x(fr, 0.0, 0.2))  # alinha pela cabeça
                if r == 1 and c == 0:
                    idle_bottom = x + center_x(fr, 0.75, 1.0)
            cell = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
            cell.alpha_composite(fr, (max(-fr.width, x), max(-fr.height, y - r * CH)))
            out.alpha_composite(cell, (c * CW, r * CH))
    out.save(dst)


def process_portrait(src: Path, dst: Path):
    im = Image.open(src).convert('RGBA').resize((256, 256), Image.BOX)
    binarize(im).save(dst)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    only = sys.argv[1] if len(sys.argv) > 1 else None
    n = 0
    for f in sorted(RAW.glob('*.png')):
        if only and not f.name.startswith(only):
            continue
        dst = OUT / f.name
        if f.stem.endswith('_corpo'):
            process_body(f, dst, seated_first_row=f.name.startswith('01_rei'), f=SCALE.get(f.stem.replace('_corpo', ''), 1.0))
        elif f.stem.endswith('_retrato'):
            process_portrait(f, dst)
        else:
            continue
        n += 1
        print('ok', f.name)
    print(f'{n} arquivo(s) preparados em assets/personagens/')


if __name__ == '__main__':
    main()
