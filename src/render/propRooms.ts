import type { RoomId } from '../types';
import { HALL_H, HALL_W, type HallLight, type HallObject, type ThroneHall } from './throneHall';
import { ROOM_LAYOUTS, type RoomLayout } from '../data/roomLayouts';
import { ROOMS } from '../data/castle';

// Cômodos montados com a arte gerada (assets/cenarios/props): texturas de piso e
// parede, contorno escuro das paredes vistas de cima, tapetes, peças de parede e
// móveis com profundidade e colisão.

interface PropManifest {
  sheets: Record<string, string>;
  props: Record<string, [string, number, number, number, number]>; // folha, x, y, w, h
  textures: Record<string, string>;
}

const BASE = 'assets/cenarios/props/';
let manifest: Promise<PropManifest | null> | null = null;
const images = new Map<string, Promise<HTMLImageElement>>();

function loadImage(file: string) {
  let p = images.get(file);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => { images.delete(file); reject(new Error(file)); };
      img.src = BASE + file;
    });
    images.set(file, p);
  }
  return p;
}

export function loadManifest() {
  return (manifest ??= fetch(BASE + 'props.json').then((r) => (r.ok ? r.json() : null)).catch(() => null));
}

export interface PropKit { m: PropManifest; img: Map<string, HTMLImageElement> }

// Carrega só as folhas que este cômodo usa
export async function loadRoomKit(id: RoomId): Promise<PropKit | null> {
  const layout = ROOM_LAYOUTS[id];
  const m = await loadManifest();
  if (!layout || !m) return null;
  const need = new Set<string>();
  for (const p of layout.places) if (m.props[p.p]) need.add(m.props[p.p][0]);
  for (const k of ['portas', 'tapetes']) need.add(k);
  const files = [...[...need].map((sid) => m.sheets[sid]), m.textures[layout.floor], ...(layout.wall ? [m.textures[layout.wall]] : []), ...(layout.patches ?? []).map((p) => m.textures[p.tex])].filter(Boolean);
  const img = new Map<string, HTMLImageElement>();
  try {
    await Promise.all(files.map(async (f) => img.set(f, await loadImage(f))));
  } catch { return null; }
  return { m, img };
}

// Cor do contorno das paredes vistas de cima (como na referência: azul-ardósia escuro)
const WALL_TOP = '#262c3b', WALL_EDGE = '#4b5670', WALL_DARK = '#161a24';

export function createPropRoom(kit: PropKit, id: RoomId): ThroneHall {
  const layout: RoomLayout = ROOM_LAYOUTS[id]!;
  const R = ROOMS[id];
  const canvas = document.createElement('canvas');
  canvas.width = HALL_W; canvas.height = HALL_H;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const objects: HallObject[] = [];
  const lights: HallLight[] = [];
  const { m } = kit;

  const tex = (name: string) => kit.img.get(m.textures[name]);
  const src = (name: string) => {
    const e = m.props[name];
    if (!e) return null;
    const im = kit.img.get(m.sheets[e[0]]);
    return im ? { im, sx: e[1], sy: e[2], sw: e[3], sh: e[4] } : null;
  };
  const draw = (c: CanvasRenderingContext2D, name: string, x: number, y: number, w: number, h: number, flip = false) => {
    const s = src(name);
    if (!s) return;
    if (flip) { c.save(); c.translate(x + w, y); c.scale(-1, 1); c.drawImage(s.im, s.sx, s.sy, s.sw, s.sh, 0, 0, w, h); c.restore(); }
    else c.drawImage(s.im, s.sx, s.sy, s.sw, s.sh, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  const size = (name: string, w: number) => { const s = src(name); return s ? [w, (w * s.sh) / s.sw] : [w, w]; };

  // chão
  const floor = tex(layout.floor);
  const FX0 = 60, FY0 = layout.exterior ? 0 : 150, FX1 = 1220, FY1 = 668;
  if (floor) {
    const t = layout.tile;
    ctx.save(); ctx.beginPath(); ctx.rect(FX0, FY0, FX1 - FX0, FY1 - FY0); ctx.clip();
    for (let y = FY0; y < FY1; y += t) for (let x = FX0; x < FX1; x += t) ctx.drawImage(floor, x, y, t, t);
    ctx.restore();
  }
  for (const pt of layout.patches ?? []) {
    const t = tex(pt.tex);
    if (!t) continue;
    ctx.save(); ctx.beginPath(); ctx.rect(pt.x, pt.y, pt.w, pt.h); ctx.clip();
    for (let y = pt.y; y < pt.y + pt.h; y += 128) for (let x = pt.x; x < pt.x + pt.w; x += 128) ctx.drawImage(t, x, y, 128, 128);
    ctx.restore();
  }
  // parede do fundo (interiores)
  const wall = layout.wall ? tex(layout.wall) : null;
  if (wall && !layout.exterior) {
    const wh = 150, ww = (wall.width / wall.height) * wh;
    for (let x = 60; x < 1220; x += ww) ctx.drawImage(wall, x, 30, ww, wh);
    const shade = ctx.createLinearGradient(0, 178, 0, 214);
    shade.addColorStop(0, '#0d101860'); shade.addColorStop(1, '#0d101800');
    ctx.fillStyle = shade; ctx.fillRect(60, 180, 1160, 34);
  }
  // tapetes e peças coladas no chão
  for (const p of layout.places.filter((q) => q.floor)) { const [w, h] = size(p.p, p.w); draw(ctx, p.p, p.x - w / 2, p.y - h / 2, w, h, p.flip); }
  // peças de parede (atrás de todos)
  for (const p of layout.places.filter((q) => q.wall)) {
    const [w, h] = size(p.p, p.w); draw(ctx, p.p, p.x - w / 2, p.y, w, h, p.flip);
    if (p.light) lights.push({ x: p.x, y: p.y + h * 0.3, radius: p.light });
  }
  if (layout.tint) { ctx.fillStyle = layout.tint; ctx.fillRect(0, 0, HALL_W, HALL_H); }
  // contorno das paredes vistas de cima (no exterior, as muralhas laterais)
  if (!layout.exterior) band(ctx, 0, 0, HALL_W, 30);
  band(ctx, 0, 0, 62, HALL_H); band(ctx, 1218, 0, 62, HALL_H);
  // portas das saídas
  for (const e of R.exits) {
    if (!ROOMS[e.to].ready) continue;
    if (e.x < 200) { const [w, h] = size('porta_lateral_esq', 64); draw(ctx, 'porta_lateral_esq', 34, e.y - h + 30, w, h); }
    else if (e.x > 1080) { const [w, h] = size('porta_lateral_dir', 64); draw(ctx, 'porta_lateral_dir', 1182, e.y - h + 30, w, h); }
    else if (e.y < 300 && !layout.exterior) { const [w, h] = size('porta_dupla', 132); draw(ctx, 'porta_dupla', e.x - w / 2, 178 - h + 6, w, h); }
  }

  // parede da frente: com vão onde houver saída ao sul
  const south = R.exits.filter((e) => e.y > 560 && ROOMS[e.to].ready).map((e) => e.x);
  const spans: [number, number][] = [];
  let x0 = 0;
  for (const sx of south.sort((a, b) => a - b)) { spans.push([x0, sx - 70]); x0 = sx + 70; }
  spans.push([x0, HALL_W]);
  for (const [a, b] of spans) if (b > a) objects.push({ id: `front-${a}`, asset: 'floor', x: a, y: 664, w: b - a, h: 56, depth: 700, solid: true, paint: (c, o) => band(c, o.x, o.y, o.w, o.h, true) });

  // móveis: profundidade pelo pé
  for (const p of layout.places.filter((q) => !q.floor && !q.wall)) {
    const [w, h] = size(p.p, p.w);
    const foot = p.y;
    const base = Math.min(h, h * (p.base ?? 0.45));
    objects.push({ id: `${p.p}-${objects.length}`, asset: 'floor', x: p.x - w / 2, y: foot - h, w, h, depth: foot, solid: p.solid !== false,
      hit: [p.x - w / 2 + 6, foot - base, w - 12, base],
      paint: (c, o) => { shadow(c, o); draw(c, p.p, o.x, o.y, o.w, o.h, p.flip); } });
    if (p.light) lights.push({ x: p.x, y: foot - h * 0.75, radius: p.light });
  }
  objects.sort((a, b) => a.depth - b.depth);
  return { canvas, objects, lights, drawObject(c, o) { o.paint?.(c, o); } };
}

function band(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, front = false) {
  c.fillStyle = WALL_TOP; c.fillRect(x, y, w, h);
  c.fillStyle = WALL_EDGE;
  if (front) c.fillRect(x, y, w, 4); else { c.fillRect(x, y + h - 3, w, 3); c.fillRect(x + w - 3, y, 3, h); c.fillRect(x, y, 3, h); }
  c.fillStyle = WALL_DARK; c.fillRect(x, front ? y + h - 6 : y, w, 3);
}

function shadow(c: CanvasRenderingContext2D, o: HallObject) {
  c.fillStyle = '#0a0c1430';
  c.beginPath(); c.ellipse(o.x + o.w / 2, o.y + o.h - 4, o.w * 0.46, Math.min(10, o.w * 0.1), 0, 0, Math.PI * 2); c.fill();
}
