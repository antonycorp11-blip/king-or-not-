import type { RoomId } from '../types';
import { HALL_H, HALL_W, regions, type HallAsset, type HallLight, type HallObject, type ThroneHall } from './throneHall';

// Cômodos do castelo montados com o atlas do salão (pedra, portas, velas, estátuas)
// e móveis desenhados em código. São placeholders elegantes: cada peça tem posição,
// profundidade e colisão próprias, e pode ser trocada por arte gerada sem mexer no jogo.
// Arte que fará falta: ver assets/cenarios/PENDENTE.md

type Painter = (c: CanvasRenderingContext2D, o: HallObject) => void;

// ---------- arte gerada por cômodo ----------
// assets/cenarios/<cômodo>/atlas.png: grade 4x4, uma peça por célula, fundo transparente.
// A ordem das células está em ROOM_PIECES. Se o arquivo existir, cada peça substitui
// o móvel desenhado em código com o mesmo nome; se não existir, o jogo segue com o placeholder.
export const ROOM_PIECES: Partial<Record<RoomId, string[]>> = {
  quarto: ['piso', 'parede', 'tapete', 'cama', 'escrivaninha', 'cadeira', 'estante', 'armario', 'lareira', 'bau', 'janela', 'candelabro', 'criado', 'manto', 'penteadeira', 'planta'],
  aposentos: ['piso', 'parede', 'tapete', 'cama-rainha', 'penteadeira', 'biombo', 'poltrona', 'mesa', 'harpa', 'estante', 'janela', 'cama-lucas', 'bau', 'candelabro', 'flores', 'comoda'],
  conselho: ['piso', 'parede', 'tapete', 'mesa-conselho', 'cadeira', 'trono-conselho', 'mapa', 'globo', 'estante', 'lareira', 'estandarte', 'candelabro', 'armadura', 'arquivo', 'janela', 'planta'],
  patio: ['piso', 'muralha', 'grama', 'boneco', 'armas', 'barril', 'feno', 'poco', 'carroca', 'estabulo', 'quartel', 'portao', 'braseiro', 'alvo', 'tenda', 'mastro'],
  capela: ['piso', 'parede', 'tapete', 'altar', 'estatua', 'banco', 'vitral', 'candelabro', 'confessionario', 'pia', 'velas', 'pulpito', 'lapide', 'estandarte', 'planta', 'cripta'],
};

export interface RoomArt { img: HTMLImageElement; cells: Record<string, [number, number, number, number]> }
const artCache = new Map<RoomId, Promise<RoomArt | null>>();

export function loadRoomArt(id: RoomId): Promise<RoomArt | null> {
  const names = ROOM_PIECES[id];
  if (!names) return Promise.resolve(null);
  let job = artCache.get(id);
  if (!job) {
    job = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ img, cells: trimCells(img, names) });
      img.onerror = () => resolve(null); // ainda sem arte: placeholder
      img.src = `assets/cenarios/${id}/atlas.png`;
    });
    artCache.set(id, job);
  }
  return job;
}

// Recorta cada célula até a área com pixels visíveis (os geradores deixam margens)
function trimCells(img: HTMLImageElement, names: string[]) {
  const cw = img.naturalWidth / 4, ch = img.naturalHeight / 4;
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0);
  const cells: RoomArt['cells'] = {};
  names.forEach((name, i) => {
    const x0 = Math.round((i % 4) * cw), y0 = Math.round(Math.floor(i / 4) * ch);
    const w = Math.round(cw), h = Math.round(ch);
    const data = g.getImageData(x0, y0, w, h).data;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
      if (data[(y * w + x) * 4 + 3] > 24) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
    // pisos e paredes ocupam a célula inteira; objetos são recortados
    cells[name] = maxX < 0 || i < 2 ? [x0, y0, w, h] : [x0 + minX, y0 + minY, maxX - minX + 2, maxY - minY + 2];
  });
  return cells;
}

export function createCastleRoom(atlas: HTMLImageElement, id: RoomId, art: RoomArt | null = null): ThroneHall {
  const canvas = document.createElement('canvas');
  canvas.width = HALL_W; canvas.height = HALL_H;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const objects: HallObject[] = [];
  const lights: HallLight[] = [];

  const sprite = (c: CanvasRenderingContext2D, asset: HallAsset, x: number, y: number, w: number, h: number) => {
    const [sx, sy, sw, sh] = regions[asset];
    c.drawImage(atlas, sx, sy, sw, sh, Math.round(x), Math.round(y), w, h);
  };
  const tile = (asset: HallAsset, x: number, y: number, w: number, h: number, tw: number, th = tw) => {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    for (let yy = y; yy < y + h; yy += th) for (let xx = x; xx < x + w; xx += tw) sprite(ctx, asset, xx, yy, tw, th);
    ctx.restore();
  };
  const rect = (x: number, y: number, w: number, h: number, color: string, c = ctx) => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const trim = (x: number, y: number, w: number) => { rect(x, y, w, 5, '#b0a491'); rect(x, y + 5, w, 3, '#716f69'); rect(x, y + 8, w, 4, '#36383b'); };
  const object = (asset: HallAsset, x: number, foot: number, w: number, h: number, solid = true) =>
    objects.push({ id: `${asset}-${objects.length}`, asset, x: x - w / 2, y: foot - h, w, h, depth: foot, solid });
  const painted = (name: string, x: number, foot: number, w: number, h: number, paint: Painter, solid = true) =>
    objects.push({ id: `${name}-${objects.length}`, asset: 'floor', x: x - w / 2, y: foot - h, w, h, depth: foot, solid, paint });
  // Peça de arte do cômodo se existir; senão, o móvel desenhado em código
  const drawCell = (c: CanvasRenderingContext2D, name: string, x: number, y: number, w: number, h: number) => {
    const r = art!.cells[name];
    c.drawImage(art!.img, r[0], r[1], r[2], r[3], Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  const piece = (name: string, x: number, foot: number, w: number, h: number, fallback: Painter, solid = true) => {
    if (art?.cells[name]) {
      // mantém a proporção da arte gerada, apoiada no chão
      const [, , cw, chh] = art.cells[name];
      const k = Math.min(w / cw, (h * 1.25) / chh);
      const dw = cw * k, dh = chh * k;
      painted(name, x, foot, dw, dh, (c, o) => drawCell(c, name, o.x, o.y, o.w, o.h), solid);
    } else painted(name, x, foot, w, h, fallback, solid);
  };
  const artTile = (name: string, x: number, y: number, w: number, h: number, tw: number, th = tw) => {
    if (!art?.cells[name]) return false;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    for (let yy = y; yy < y + h; yy += th) for (let xx = x; xx < x + w; xx += tw) drawCell(ctx, name, xx, yy, tw, th);
    ctx.restore();
    return true;
  };
  const candle = (x: number, foot: number, h = 84) => { object('candles', x, foot, h * .6, h); lights.push({ x, y: foot - h * .76, radius: h * .95 }); };
  const brazier = (x: number, foot: number, s = 58) => { object('brazier', x, foot, s, s * .85); lights.push({ x, y: foot - s * .6, radius: s * 1.6 }); };

  // ---------- estrutura comum de interiores ----------
  function interior(opts: { floor?: HallAsset; floorTint?: string; wallTint?: string; windows?: number[]; banners?: number[]; northDoor?: number; south?: boolean; west?: boolean; east?: boolean }) {
    rect(0, 0, HALL_W, HALL_H, '#141820');
    if (!artTile('piso', 78, 150, 1124, 570, 128, 128)) {
      tile(opts.floor ?? 'floor', 78, 150, 1124, 570, 132, 104);
      if (opts.floorTint) rect(78, 150, 1124, 570, opts.floorTint);
    }
    if (!artTile('parede', 62, 26, 1156, 162, 162, 162)) {
      tile('wall', 62, 26, 1156, 162, 170, 142);
      if (opts.wallTint) rect(62, 26, 1156, 162, opts.wallTint);
    }
    trim(62, 25, 1156); trim(62, 180, 1156);
    for (const x of opts.windows ?? []) {
      sprite(ctx, 'window', x - 32, 48, 64, 118);
      const beam = ctx.createLinearGradient(x, 167, x + 110, 400);
      beam.addColorStop(0, '#eddaac30'); beam.addColorStop(1, '#eddaac00');
      ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(x - 20, 172); ctx.lineTo(x + 20, 172); ctx.lineTo(x + 160, 420); ctx.lineTo(x + 40, 420); ctx.fill();
    }
    for (const x of opts.banners ?? []) sprite(ctx, 'blueBanner', x - 24, 52, 48, 80);
    if (opts.northDoor) sprite(ctx, 'door', opts.northDoor - 62, 70, 124, 124);
    // paredes laterais com portas em arco quando há saída
    for (const [x, open] of [[62, !!opts.west], [1182, !!opts.east]] as const) {
      tile('wall', x, 190, 36, 439, 80, 120);
      rect(x, 190, 6, 439, '#b1a693'); rect(x + 30, 190, 6, 439, '#252e3b');
      if (open) sideDoor(x);
    }
    // parede baixa da frente, com vão se houver saída ao sul
    const gapL = 560, gapR = 720;
    const spans: [number, number][] = opts.south ? [[62, gapL - 62], [gapR, 1218 - gapR]] : [[62, 1156]];
    for (const [x, w] of spans) objects.push({ id: `front-wall-${x}`, asset: 'wall', x, y: 630, w, h: 90, depth: 640, solid: true, paint: frontWall });
    const shade = ctx.createLinearGradient(0, 185, 0, 231);
    shade.addColorStop(0, '#11162265'); shade.addColorStop(1, '#11162200');
    ctx.fillStyle = shade; ctx.fillRect(98, 192, 1084, 42);
  }
  function sideDoor(x: number) {
    const cx = x + 18, top = 380, h = 140;
    rect(x - 2, top - 8, 40, h + 16, '#8f8577');
    rect(x + 2, top, 32, h, '#0d1016');
    const g = ctx.createLinearGradient(x, 0, x + 36, 0);
    g.addColorStop(0, '#00000000'); g.addColorStop(.5, '#e0b86a22'); g.addColorStop(1, '#00000000');
    ctx.fillStyle = g; ctx.fillRect(x + 2, top, 32, h);
    rect(cx - 1, top - 14, 2, 8, '#d2b77c');
  }
  const frontWall: Painter = (c, o) => {
    c.save(); c.beginPath(); c.rect(o.x, o.y, o.w, o.h); c.clip();
    for (let x = o.x; x < o.x + o.w; x += 165) sprite(c, 'wall', x, o.y + 12, 165, 138);
    for (const [dy, h, color] of [[0, 6, '#343d49'], [6, 5, '#b0a491'], [11, 3, '#716f69'], [14, 4, '#36383b'], [82, 9, '#111923']] as const) { c.fillStyle = color; c.fillRect(o.x, o.y + dy, o.w, h); }
    c.restore();
  };

  // ---------- móveis desenhados ----------
  const wood = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, base = '#7b4c2a') => {
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, shade(base, 18)); g.addColorStop(1, shade(base, -12));
    c.fillStyle = g; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    c.fillStyle = '#00000022';
    for (let yy = y + 9; yy < y + h - 3; yy += 11) c.fillRect(Math.round(x + 3), Math.round(yy), Math.round(w - 6), 1);
  };
  const outline = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => { c.strokeStyle = '#1b120c'; c.lineWidth = 2; c.strokeRect(Math.round(x) + 1, Math.round(y) + 1, Math.round(w) - 2, Math.round(h) - 2); };
  const bed = (blanket: string, trimC = '#d8b25a'): Painter => (c, o) => {
    const { x, y, w, h } = o;
    rect(x + 6, y + h - 8, w - 12, 8, '#0b0d1450', c);
    wood(c, x, y, w, h * .2, '#5a321b'); outline(c, x, y, w, h * .2);
    rect(x + w * .1, y + h * .05, w * .8, 3, trimC, c);
    for (const px of [x, x + w - 12]) { wood(c, px, y - 26, 12, h * .95, '#6b3a1f'); rect(px + 2, y - 30, 8, 6, trimC, c); }
    rect(x + 10, y + h * .18, w - 20, h * .72, '#efe6d2', c);
    for (const px of [x + 18, x + w / 2 + 4]) { rect(px, y + h * .21, w / 2 - 22, h * .16, '#fbf6ea', c); rect(px, y + h * .21 + h * .16 - 3, w / 2 - 22, 3, '#d8cdb5', c); }
    const g = c.createLinearGradient(0, y + h * .42, 0, y + h * .9);
    g.addColorStop(0, shade(blanket, 16)); g.addColorStop(1, shade(blanket, -18));
    c.fillStyle = g; c.fillRect(Math.round(x + 10), Math.round(y + h * .42), Math.round(w - 20), Math.round(h * .48));
    rect(x + 10, y + h * .42, w - 20, 5, shade(blanket, 30), c);
    rect(x + 14, y + h * .85, w - 28, 3, trimC, c);
    wood(c, x, y + h * .88, w, h * .12, '#4a2915');
  };
  const table: (cloth?: string) => Painter = (cloth) => (c, o) => {
    const { x, y, w, h } = o;
    rect(x + 8, y + h - 4, w - 16, 6, '#0b0d1440', c);
    for (const px of [x + 10, x + w - 22]) wood(c, px, y + h * .6, 12, h * .4, '#4a2915');
    wood(c, x, y, w, h * .66, '#8a5a32'); outline(c, x, y, w, h * .66);
    wood(c, x, y + h * .6, w, h * .12, '#5a3419');
    if (cloth) { rect(x + w * .12, y + 4, w * .76, h * .5, cloth, c); rect(x + w * .12, y + 4, w * .76, 3, shade(cloth, 25), c); }
  };
  const chair = (color = '#7a1d24'): Painter => (c, o) => {
    const { x, y, w, h } = o;
    wood(c, x, y, w, h * .55, '#5a321b'); outline(c, x, y, w, h * .55);
    rect(x + 4, y + 5, w - 8, h * .4, color, c);
    wood(c, x - 2, y + h * .5, w + 4, h * .3, '#6b3a1f');
    rect(x + 2, y + h * .5, w - 4, h * .18, shade(color, -10), c);
    for (const px of [x, x + w - 6]) rect(px, y + h * .78, 6, h * .22, '#3a2011', c);
  };
  const chest = (c: CanvasRenderingContext2D, o: HallObject) => {
    const { x, y, w, h } = o;
    wood(c, x, y, w, h, '#6b3a1f'); outline(c, x, y, w, h);
    rect(x, y + h * .35, w, 5, '#2a1a10', c);
    for (const px of [x + w * .2, x + w * .75]) rect(px, y, 5, h, '#a08850', c);
    rect(x + w / 2 - 5, y + h * .38, 10, 10, '#d8b25a', c);
  };
  const wardrobe: Painter = (c, o) => {
    const { x, y, w, h } = o;
    wood(c, x, y, w, h, '#5a321b'); outline(c, x, y, w, h);
    rect(x + w / 2 - 1, y + 8, 2, h - 16, '#2a1a10', c);
    for (const px of [x + w / 2 - 10, x + w / 2 + 6]) rect(px, y + h / 2, 4, 10, '#d8b25a', c);
    rect(x - 4, y - 6, w + 8, 8, '#7b4c2a', c);
  };
  const desk: Painter = (c, o) => {
    table()(c, o);
    const { x, y, w } = o;
    for (const [dx, dy, pw] of [[.12, 8, .28], [.46, 12, .22], [.2, 22, .18]] as const) { rect(x + w * dx, y + dy, w * pw, 14, '#efe3c2', c); rect(x + w * dx + 4, y + dy + 4, w * pw - 8, 1, '#8b7a5a', c); }
    rect(x + w * .78, y + 8, 10, 12, '#1c1c2a', c); rect(x + w * .81, y + 2, 2, 10, '#e8e8e8', c);
  };
  const bookshelf: Painter = (c, o) => {
    const { x, y, w, h } = o;
    wood(c, x, y, w, h, '#4a2915'); outline(c, x, y, w, h);
    const colors = ['#7a1d24', '#23346e', '#1f6a44', '#8a6a2a', '#5a3a6a', '#a0522d'];
    for (let r = 0; r < 4; r++) {
      const sy = y + 8 + r * (h - 12) / 4;
      rect(x + 4, sy + (h - 12) / 4 - 4, w - 8, 3, '#2a1a10', c);
      for (let bx = x + 6, i = r; bx < x + w - 10; bx += 7 + (i % 3), i++) rect(bx, sy + 4 + (i % 2) * 3, 5 + (i % 2), (h - 12) / 4 - 10 - (i % 2) * 3, colors[i % colors.length], c);
    }
  };
  const bench: Painter = (c, o) => {
    const { x, y, w, h } = o;
    wood(c, x, y, w, h * .5, '#6b3a1f'); outline(c, x, y, w, h * .5);
    wood(c, x, y + h * .45, w, h * .35, '#8a5a32');
    for (const px of [x + 6, x + w - 14]) rect(px, y + h * .78, 8, h * .22, '#3a2011', c);
  };
  const altar: Painter = (c, o) => {
    const { x, y, w, h } = o;
    rect(x, y, w, h, '#a89f8f', c); rect(x, y, w, 8, '#d6cfbf', c); outline(c, x, y, w, h);
    rect(x + w * .15, y + 8, w * .7, h * .75, '#f1ead8', c);
    rect(x + w * .15, y + 8, w * .7, 4, '#d8b25a', c);
    rect(x + w / 2 - 3, y + 20, 6, 26, '#d8b25a', c); rect(x + w / 2 - 12, y + 28, 24, 5, '#d8b25a', c);
  };
  const dummy: Painter = (c, o) => {
    const { x, y, w, h } = o;
    const cx = x + w / 2;
    rect(cx - 4, y + h * .2, 8, h * .8, '#6b4a2a', c);
    rect(cx - w / 2 + 4, y + h * .32, w - 8, 7, '#6b4a2a', c);
    c.fillStyle = '#c9a44a'; c.beginPath(); c.ellipse(cx, y + h * .45, w * .32, h * .22, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#8a6a2a'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#d9b865'; c.beginPath(); c.arc(cx, y + h * .16, w * .16, 0, Math.PI * 2); c.fill(); c.stroke();
    for (const [r, col] of [[10, '#c8322a'], [6, '#f2e8d0'], [3, '#c8322a']] as const) { c.fillStyle = col; c.beginPath(); c.arc(cx, y + h * .45, r, 0, Math.PI * 2); c.fill(); }
  };
  const rack: Painter = (c, o) => {
    const { x, y, w, h } = o;
    wood(c, x, y + h * .12, w, 8, '#5a321b'); wood(c, x, y + h * .7, w, 8, '#5a321b');
    for (const px of [x, x + w - 8]) wood(c, px, y, 8, h, '#4a2915');
    for (let i = 0, px = x + 14; px < x + w - 14; px += 14, i++) {
      rect(px, y + 4, 3, h - 10, i % 2 ? '#b8bcc4' : '#8f6a3a', c);
      rect(px - 3, y + (i % 2 ? h * .22 : 2), 9, 4, i % 2 ? '#d8b25a' : '#c8ccd4', c);
    }
  };
  const barrel: Painter = (c, o) => {
    const { x, y, w, h } = o;
    wood(c, x, y + 6, w, h - 6, '#7b4c2a'); outline(c, x, y + 6, w, h - 6);
    for (const dy of [.3, .75]) rect(x, y + h * dy, w, 4, '#3b3b44', c);
    c.fillStyle = '#9a6a3c'; c.beginPath(); c.ellipse(x + w / 2, y + 8, w / 2, 7, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#3b3b44'; c.lineWidth = 3; c.stroke();
  };
  const hay: Painter = (c, o) => {
    const { x, y, w, h } = o;
    rect(x, y, w, h, '#c9a44a', c); rect(x, y, w, 6, '#e0c16a', c); outline(c, x, y, w, h);
    c.fillStyle = '#a8842e'; for (let i = 0; i < w; i += 7) c.fillRect(x + i, y + 8 + (i % 3) * 4, 4, 2);
    rect(x, y + h * .5, w, 3, '#6b4a2a', c);
  };
  const building = (roof: string, wall: string, label?: string): Painter => (c, o) => {
    const { x, y, w, h } = o;
    rect(x, y + h * .35, w, h * .65, wall, c); outline(c, x, y + h * .35, w, h * .65);
    for (let yy = y + h * .4; yy < y + h; yy += 18) rect(x + 2, yy, w - 4, 1, '#00000022', c);
    c.fillStyle = roof; c.beginPath(); c.moveTo(x - 10, y + h * .38); c.lineTo(x + w / 2, y); c.lineTo(x + w + 10, y + h * .38); c.closePath(); c.fill();
    c.strokeStyle = '#1b120c'; c.lineWidth = 2; c.stroke();
    rect(x + w / 2 - 22, y + h - 60, 44, 60, '#2a1a10', c); rect(x + w / 2 - 18, y + h - 56, 36, 56, '#4a2915', c);
    if (label) { c.fillStyle = '#e8d8a8'; c.font = 'bold 14px Georgia'; c.textAlign = 'center'; c.fillText(label, x + w / 2, y + h * .52); }
  };
  const mapTable: Painter = (c, o) => {
    table()(c, o);
    const { x, y, w, h } = o;
    rect(x + 12, y + 8, w - 24, h * .48, '#e6d3a3', c);
    c.strokeStyle = '#8b6f45'; c.lineWidth = 1.5; c.beginPath();
    c.moveTo(x + 22, y + 20); c.bezierCurveTo(x + w * .3, y + 6, x + w * .5, y + 40, x + w - 30, y + 18); c.stroke();
    for (const [dx, dy, col] of [[.3, .22, '#2a3f8f'], [.55, .3, '#9a1f24'], [.7, .18, '#1f6a44'], [.42, .4, '#6a6c78']] as const) { c.fillStyle = col; c.fillRect(x + w * dx, y + h * dy, 7, 7); }
  };
  const councilTable: Painter = (c, o) => {
    const { x, y, w, h } = o;
    rect(x + 10, y + h - 4, w - 20, 8, '#0b0d1450', c);
    for (const px of [x + 20, x + w - 34, x + w / 2 - 7]) wood(c, px, y + h * .7, 14, h * .3, '#3a2011');
    wood(c, x, y, w, h * .75, '#6b3a1f'); outline(c, x, y, w, h * .75);
    rect(x + 8, y + 8, w - 16, h * .75 - 16, '#7a1d24', c);
    rect(x + 8, y + 8, w - 16, 3, '#d8b25a', c); rect(x + 8, y + h * .75 - 11, w - 16, 3, '#d8b25a', c);
    // A Mesa das Chaves: cinco fechaduras de bronze em círculo
    const cx = x + w / 2, cy = y + h * .36;
    c.strokeStyle = '#d8b25a'; c.lineWidth = 2; c.beginPath(); c.ellipse(cx, cy, 46, 22, 0, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
      const kx = cx + Math.cos(a) * 46, ky = cy + Math.sin(a) * 22;
      c.fillStyle = '#b8862e'; c.beginPath(); c.arc(kx, ky, 6, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#2a1a10'; c.fillRect(kx - 1, ky - 3, 2, 5);
    }
    c.fillStyle = '#e8c86a'; c.font = 'bold 18px Georgia'; c.textAlign = 'center'; c.fillText('♛', cx, cy + 6);
    wood(c, x, y + h * .66, w, h * .12, '#4a2915');
  };
  const fireplace: Painter = (c, o) => {
    const { x, y, w, h } = o;
    rect(x, y, w, h, '#8f8577', c); outline(c, x, y, w, h);
    rect(x - 6, y - 6, w + 12, 10, '#b0a491', c);
    rect(x + w * .18, y + h * .3, w * .64, h * .7, '#1a1410', c);
    sprite(c, 'brazier', x + w * .25, y + h * .5, w * .5, h * .45);
  };
  const vanity: Painter = (c, o) => {
    table('#e9d8e0')(c, o);
    const { x, y, w } = o;
    c.fillStyle = '#c9d6e8'; c.beginPath(); c.ellipse(x + w / 2, y - 16, w * .22, 22, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#d8b25a'; c.lineWidth = 3; c.stroke();
    for (const dx of [.2, .3, .72]) { c.fillStyle = dx > .5 ? '#a83a5a' : '#5a7a9a'; c.fillRect(x + w * dx, y + 8, 6, 10); }
  };

  // ---------- os cômodos ----------
  switch (id) {
    case 'quarto': {
      interior({ windows: [640], banners: [400, 880], south: true, east: true });
      sprite(ctx, 'medallion', 520, 400, 240, 190);
      piece('cama', 420, 400, 230, 190, bed('#7a1d24'));
      piece('bau', 420, 440, 110, 40, chest);
      piece('escrivaninha', 930, 330, 170, 72, desk);
      piece('cadeira', 930, 372, 44, 52, chair());
      piece('estante', 1080, 310, 90, 120, bookshelf);
      piece('armario', 170, 330, 90, 140, wardrobe);
      piece('lareira', 250, 560, 130, 110, fireplace);
      lights.push({ x: 250, y: 520, radius: 150 });
      candle(640, 230, 78); candle(760, 470, 70);
      object('plant', 1110, 560, 55, 66);
      break;
    }
    case 'aposentos': {
      interior({ windows: [420, 860], banners: [640], west: true, wallTint: '#3a1d2a18', floorTint: '#5a2a3a10' });
      tile('carpet', 150, 420, 980, 110, 180, 110);
      piece('cama-rainha', 880, 380, 200, 170, bed('#23346e', '#e8e8f0'));
      piece('penteadeira', 1060, 320, 110, 60, vanity);
      piece('mesa', 640, 410, 200, 70, table('#f2e8d8'));
      piece('poltrona', 580, 450, 40, 48, chair('#23346e'));
      piece('poltrona', 700, 450, 40, 48, chair('#23346e'));
      piece('cama-lucas', 330, 590, 150, 120, bed('#1f6a44'));
      piece('estante', 300, 320, 90, 120, bookshelf);
      piece('bau', 470, 600, 90, 36, chest);
      for (const x of [230, 1050]) candle(x, 520, 76);
      object('plant', 150, 330, 52, 62); object('plant', 1140, 600, 52, 62);
      object('statue', 640, 280, 40, 86);
      break;
    }
    case 'conselho': {
      interior({ windows: [640], banners: [300, 980], west: true, wallTint: '#20202a20' });
      piece('mesa-conselho', 640, 500, 560, 170, councilTable);
      // cadeiras: três ao norte da mesa, duas ao sul e a do rei na cabeceira
      for (const x of [420, 610, 800]) piece('cadeira', x, 340, 46, 58, chair('#23346e'), false);
      for (const x of [610, 800]) piece('cadeira', x, 560, 46, 58, chair('#23346e'), false);
      piece('trono-conselho', 1000, 460, 60, 80, chair('#7a1d24'), false);
      piece('mapa', 250, 470, 170, 80, mapTable);
      piece('estante', 1100, 330, 90, 120, bookshelf);
      piece('estante', 170, 320, 90, 120, bookshelf);
      brazier(1120, 600, 58); brazier(170, 600, 58);
      candle(470, 250, 80); candle(810, 250, 80);
      object('armor', 1150, 470, 44, 96);
      break;
    }
    case 'capela': {
      interior({ windows: [360, 920], west: true, floorTint: '#20304010', wallTint: '#1a203020' });
      tile('carpet', 590, 250, 100, 400, 100, 120);
      piece('altar', 640, 300, 150, 70, altar);
      object('statue', 640, 230, 56, 120);
      for (const y of [410, 480, 550, 620]) for (const x of [470, 810]) piece('banco', x, y, 190, 40, bench);
      for (const x of [520, 760]) candle(x, 300, 90);
      candle(230, 420, 76); candle(1050, 420, 76);
      object('statue', 980, 380, 44, 96);
      piece('confessionario', 250, 360, 90, 130, wardrobe);
      object('plant', 1120, 600, 52, 62);
      break;
    }
    case 'patio': {
      // Chão de terra batida e pedras, muralhas ao redor, fachada do castelo ao norte.
      rect(0, 0, HALL_W, HALL_H, '#3a3a34');
      const ground = ctx.createLinearGradient(0, 180, 0, 720);
      ground.addColorStop(0, '#8b7c63'); ground.addColorStop(1, '#6f6350');
      ctx.fillStyle = ground; ctx.fillRect(40, 170, 1200, 550);
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 900; i++) {
        const x = 40 + rnd() * 1200, y = 175 + rnd() * 540, r = 3 + rnd() * 9;
        ctx.fillStyle = rnd() < .5 ? '#7d705a' : '#948670';
        ctx.beginPath(); ctx.ellipse(x, y, r, r * .6, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#b8a47c'; ctx.beginPath(); ctx.ellipse(420, 450, 220, 120, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#8b7c63'; ctx.lineWidth = 3; ctx.stroke();
      for (let i = 0; i < 60; i++) { ctx.fillStyle = '#5f8a3a'; ctx.fillRect(60 + rnd() * 120, 560 + rnd() * 140, 3, 6); ctx.fillRect(1080 + rnd() * 140, 190 + rnd() * 80, 3, 6); }
      // fachada norte (a entrada do salão)
      tile('wall', 40, 20, 1200, 170, 170, 142);
      trim(40, 180, 1200);
      sprite(ctx, 'door', 578, 62, 124, 126);
      for (const x of [300, 980]) sprite(ctx, 'window', x - 26, 40, 52, 96);
      for (const x of [470, 810]) sprite(ctx, 'redBanner', x - 30, 40, 60, 92);
      // muralhas laterais e o portão da cidade ao sul
      for (const x of [20, 1230]) { tile('wall', x, 170, 30, 550, 80, 120); rect(x, 170, 30, 5, '#b0a491'); }
      rect(1230, 390, 30, 110, '#0d1016');
      objects.push({ id: 'front-wall-l', asset: 'wall', x: 20, y: 640, w: 520, h: 80, depth: 650, solid: true, paint: frontWall });
      objects.push({ id: 'front-wall-r', asset: 'wall', x: 740, y: 640, w: 520, h: 80, depth: 650, solid: true, paint: frontWall });
      painted('portao', 640, 700, 200, 70, (c, o) => { rect(o.x, o.y, o.w, o.h, '#2a1a10', c); for (let x = o.x + 8; x < o.x + o.w; x += 16) rect(x, o.y, 5, o.h, '#4a4d57', c); rect(o.x, o.y + 18, o.w, 5, '#4a4d57', c); }, false);
      piece('quartel', 1000, 330, 250, 170, building('#7a1d24', '#8f8577', 'QUARTEL'));
      piece('estabulo', 1000, 640, 230, 150, building('#6b4a2a', '#9a8a70', 'ESTÁBULOS'));
      for (const [x, y] of [[330, 420], [430, 400], [520, 450]]) piece('boneco', x, y, 50, 96, dummy);
      piece('armas', 210, 360, 140, 110, rack);
      for (const [x, y] of [[160, 620], [200, 640], [860, 620]]) piece('barril', x, y, 44, 56, barrel);
      piece('feno', 850, 560, 90, 46, hay); piece('feno', 1120, 560, 70, 40, hay);
      brazier(800, 300, 54); brazier(160, 470, 48);
      object('armor', 560, 250, 42, 92); object('armor', 720, 250, 42, 92);
      break;
    }
    default:
      interior({ windows: [640], west: true });
  }
  objects.sort((a, b) => a.depth - b.depth);
  return { canvas, objects, lights, drawObject(c, o) { if (o.paint) { o.paint(c, o); return; } sprite(c, o.asset, o.x, o.y, o.w, o.h); } };
}

// Portas laterais pintadas sobre o salão original (as saídas para o quarto e o conselho)
export function addHallSideDoors(hall: ThroneHall) {
  const c = hall.canvas.getContext('2d')!;
  for (const x of [62, 1182]) {
    const top = 400, h = 140;
    c.fillStyle = '#8f8577'; c.fillRect(x - 2, top - 8, 40, h + 16);
    c.fillStyle = '#0d1016'; c.fillRect(x + 2, top, 32, h);
    const g = c.createLinearGradient(x, 0, x + 36, 0);
    g.addColorStop(0, '#00000000'); g.addColorStop(.5, '#e0b86a22'); g.addColorStop(1, '#00000000');
    c.fillStyle = g; c.fillRect(x + 2, top, 32, h);
  }
}

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1, 7), 16);
  const f = (v: number) => Math.max(0, Math.min(255, v + amt));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
