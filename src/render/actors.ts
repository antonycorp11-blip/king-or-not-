import type { Look } from '../types';
import { CHARACTERS, ASSET_FILES } from '../data/characters';
import { ellipse, hexToRgb, makeCanvas, mix, outline, px, shade } from './pixel';

// Sprites de corpo em VISTA LATERAL (virados para a direita), célula 64x128, pés em y=123.
// Se existir a folha gerada (assets/personagens/NN_id_corpo.png, grade 6x2), ela é usada;
// senão, desenhamos um boneco provisório em código com as mesmas animações.

export const CELL_W = 64;
export const CELL_H = 128;
export const FOOT = 123;
const SHEET_CELL_W = CELL_W * 2;
const SHEET_CELL_H = CELL_H * 2;
const PORTRAIT_TILE = 256;

export type Anim = 'walk' | 'idle' | 'talk' | 'bow' | 'kneel' | 'seated' | 'seatedTalk' | 'seatedThink';

export interface Frame {
  src: CanvasImageSource;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export function frameCount(a: Anim) {
  return a === 'walk' ? 6 : a === 'idle' || a === 'talk' || a === 'seated' ? 2 : 1;
}

// ---------- folhas geradas ----------
const sheets = new Map<string, HTMLCanvasElement>();
const portraitSheets = new Map<string, HTMLCanvasElement>();

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });
}

// remove fundo magenta (#FF00FF) caso a imagem não venha transparente
function chromaKey(c: HTMLCanvasElement) {
  const ctx = c.getContext('2d')!;
  const d = ctx.getImageData(0, 0, c.width, c.height);
  const a = d.data;
  for (let i = 0; i < a.length; i += 4) if (a[i] > 200 && a[i + 1] < 80 && a[i + 2] > 200) a[i + 3] = 0;
  ctx.putImageData(d, 0, 0);
}

function downscale(img: HTMLImageElement, w: number, h: number) {
  const full = makeCanvas(img.naturalWidth, img.naturalHeight);
  full.ctx.drawImage(img, 0, 0);
  chromaKey(full.c);
  const { c, ctx } = makeCanvas(w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(full.c, 0, 0, w, h);
  return c;
}

export async function loadCharacterAssets(onUpdate: () => void) {
  let files: string[] = [];
  try {
    const r = await fetch('assets/manifest.json', { cache: 'no-store' });
    if (r.ok) files = (await r.json()).personagens ?? [];
  } catch {
    return;
  }
  const jobs: Promise<void>[] = [];
  for (const [id, base] of Object.entries(ASSET_FILES)) {
    if (files.includes(`${base}_corpo.png`))
      jobs.push(loadImage(`assets/personagens/${base}_corpo.png`).then((img) => void sheets.set(id, downscale(img, SHEET_CELL_W * 6, SHEET_CELL_H * 2))).catch(() => {}));
    if (files.includes(`${base}_retrato.png`))
      jobs.push(loadImage(`assets/personagens/${base}_retrato.png`).then((img) => void portraitSheets.set(id, downscale(img, PORTRAIT_TILE * 2, PORTRAIT_TILE * 2))).catch(() => {}));
  }
  await Promise.all(jobs);
  if (jobs.length) {
    frameCache.clear();
    tinted.clear();
    onUpdate();
  }
}

export function hasSheet(id: string) {
  return !!sheetFor(id);
}

// ---------- variantes: vassalos recoloridos e rainha coroada ----------
const tinted = new Map<string, HTMLCanvasElement>();
let crowned = new Set<string>();

export function setCrowned(ids: string[]) {
  const next = new Set(ids);
  if ([...next].join() !== [...crowned].join()) {
    crowned = next;
    frameCache.clear();
    crownCache.clear();
  }
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return [0, s, l];
}

// Pinta as roupas neutras (cinza-claro) com a cor da casa, preservando a luz e a sombra.
function recolor(src: HTMLCanvasElement, tint: string): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(src.width, src.height);
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const dark = shade(tint, -0.55), light = shade(tint, 0.35);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const [, sat, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
    if (sat > 0.2 || l < 0.5 || l > 0.93) continue;
    const [r, g, b] = hexToRgb(mix(dark, light, (l - 0.5) / 0.43));
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function sheetFor(id: string): HTMLCanvasElement | undefined {
  const ch = CHARACTERS[id];
  const base = sheets.has(id) ? id : ch?.base ?? id;
  const sh = sheets.get(base);
  if (!sh || !ch?.tint || base === id) return sh;
  let t = tinted.get(id);
  if (!t) tinted.set(id, (t = recolor(sh, ch.tint)));
  return t;
}

function portraitSheetFor(id: string): HTMLCanvasElement | undefined {
  const ch = CHARACTERS[id];
  const base = portraitSheets.has(id) ? id : ch?.base ?? id;
  const sh = portraitSheets.get(base);
  if (!sh || !ch?.tint || base === id) return sh;
  const key = `p:${id}`;
  let t = tinted.get(key);
  if (!t) tinted.set(key, (t = recolor(sh, ch.tint)));
  return t;
}

// Coroa desenhada por cima da cabeça (topo da figura na célula)
function drawCrown(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, scale: number) {
  const img = ctx.getImageData(x0, y0, w, h).data;
  let top = -1;
  for (let y = 0; y < h && top < 0; y++) for (let x = 0; x < w; x++) if (img[(y * w + x) * 4 + 3] > 0) { top = y; break; }
  if (top < 0) return;
  const xs: number[] = [];
  for (let y = top; y < Math.min(h, top + 6 * scale); y++) for (let x = 0; x < w; x++) if (img[(y * w + x) * 4 + 3] > 0) xs.push(x);
  const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const s = scale;
  const gx = Math.round(x0 + cx - 5 * s), gy = Math.round(y0 + top - 2 * s);
  const gold = '#f2c14e', dark = '#8a5a10';
  px(ctx, gx, gy + 2 * s, 11 * s, 3 * s, gold);
  px(ctx, gx, gy + 5 * s, 11 * s, 1 * s, dark);
  for (const k of [0, 5, 10]) px(ctx, gx + k * s, gy, 1 * s, 2 * s, gold);
  px(ctx, gx + 5 * s, gy + 3 * s, 1 * s, 1 * s, '#d23c3c');
  px(ctx, gx + 2 * s, gy + 3 * s, 1 * s, 1 * s, '#4a7ae0');
  px(ctx, gx + 8 * s, gy + 3 * s, 1 * s, 1 * s, '#4a7ae0');
}
const crownCache = new Map<string, HTMLCanvasElement>();

export type Expr = 'neutro' | 'feliz' | 'irritado' | 'preocupado';
const EXPR_POS: Record<Expr, [number, number]> = { neutro: [0, 0], feliz: [1, 0], irritado: [0, 1], preocupado: [1, 1] };

// Retrato gerado (128x128) numa expressão, ou null se não houver arte.
export function portraitFromSheet(id: string, expr: Expr): HTMLCanvasElement | null {
  const sh = portraitSheetFor(id);
  if (!sh) return null;
  const [cx, cy] = EXPR_POS[expr];
  const { c, ctx } = makeCanvas(128, 128);
  ctx.drawImage(sh, cx * PORTRAIT_TILE, cy * PORTRAIT_TILE, PORTRAIT_TILE, PORTRAIT_TILE, 0, 0, 128, 128);
  if (crowned.has(id)) drawCrown(ctx, 0, 0, 128, 128, 2);
  return c;
}

// Retrato grande (256x256) para os closes do modo cinema
export function portraitHi(id: string, expr: Expr): HTMLCanvasElement | null {
  const sh = portraitSheetFor(id);
  if (!sh) return null;
  const [cx, cy] = EXPR_POS[expr];
  const { c, ctx } = makeCanvas(PORTRAIT_TILE, PORTRAIT_TILE);
  ctx.drawImage(sh, cx * PORTRAIT_TILE, cy * PORTRAIT_TILE, PORTRAIT_TILE, PORTRAIT_TILE, 0, 0, PORTRAIT_TILE, PORTRAIT_TILE);
  if (crowned.has(id)) drawCrown(ctx, 0, 0, PORTRAIT_TILE, PORTRAIT_TILE, 4);
  return c;
}

export function isCrowned(id: string) {
  return crowned.has(id);
}

function sheetCell(id: string, anim: Anim, f: number): [number, number] {
  if (id === 'rei') {
    if (anim === 'walk') return [f % 6, 1];
    if (anim === 'seated') return [f % 2, 0];
    if (anim === 'seatedTalk') return [2, 0];
    if (anim === 'seatedThink') return [4, 0];
    return [3, 1]; // em pé (fora do trono): o passo com os pés juntos
  }
  switch (anim) {
    case 'walk': return [f % 6, 0];
    case 'idle': return [f % 2, 1];
    case 'talk': return [2 + (f % 2), 1];
    case 'bow': return [4, 1];
    case 'kneel': return [5, 1];
    default: return [0, 1];
  }
}

// ---------- boneco provisório em código ----------
const frameCache = new Map<string, HTMLCanvasElement>();

export function getFrame(id: string, anim: Anim, f: number): Frame {
  const sh = sheetFor(id);
  if (sh) {
    const [cx, cy] = sheetCell(sheets.has(id) ? id : CHARACTERS[id]?.base ?? id, anim, f);
    if (!crowned.has(id)) return { src: sh, sx: cx * SHEET_CELL_W, sy: cy * SHEET_CELL_H, sw: SHEET_CELL_W, sh: SHEET_CELL_H };
    const key = `${id}|${cx}|${cy}`;
    let c = crownCache.get(key);
    if (!c) {
      const m = makeCanvas(SHEET_CELL_W, SHEET_CELL_H);
      m.ctx.drawImage(sh, cx * SHEET_CELL_W, cy * SHEET_CELL_H, SHEET_CELL_W, SHEET_CELL_H, 0, 0, SHEET_CELL_W, SHEET_CELL_H);
      drawCrown(m.ctx, 0, 0, SHEET_CELL_W, SHEET_CELL_H, 2);
      crownCache.set(key, (c = m.c));
    }
    return { src: c, sx: 0, sy: 0, sw: SHEET_CELL_W, sh: SHEET_CELL_H };
  }
  const n = frameCount(anim);
  const key = `${id}|${anim}|${f % n}`;
  let c = frameCache.get(key);
  if (!c) {
    c = drawProfile(CHARACTERS[id]?.look ?? CHARACTERS.guarda.look, anim, f % n);
    frameCache.set(key, c);
  }
  return { src: c, sx: 0, sy: 0, sw: CELL_W, sh: CELL_H };
}

function limb(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, w: number, color: string) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
  for (let i = 0; i <= steps; i++) {
    const x = x1 + ((x2 - x1) * i) / steps;
    const y = y1 + ((y2 - y1) * i) / steps;
    px(ctx, x - w / 2, y - w / 2, w, w, color);
  }
}

const GOLD = '#e8b84a';

function drawProfile(L: Look, anim: Anim, f: number): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(CELL_W, CELL_H);
  const seated = anim === 'seated' || anim === 'seatedTalk' || anim === 'seatedThink';
  const walk = anim === 'walk';
  const t = (f / 6) * Math.PI * 2;
  const swing = walk ? Math.sin(t) * 7 : 0;
  const bob = walk ? -Math.round(Math.abs(Math.sin(t)) * 2) : 0;
  const breath = (anim === 'idle' || anim === 'seated') && f === 1 ? -1 : 0;
  const drop = anim === 'kneel' ? 16 : seated ? 22 : 0;
  const bow = anim === 'bow';

  const o = L.outfit;
  const od = shade(o, -0.32);
  const ol = shade(o, 0.18);
  const skin = L.skin;
  const skinD = shade(skin, -0.2);
  const boots = '#3a2418';
  const pants = L.armor ? '#7a7a88' : '#2e2636';
  const dress = L.female && !L.armor;

  const sY = 50 + drop + bob + breath; // ombro
  const hipY = 80 + drop + bob;
  const hx = 31; // quadril / eixo do corpo
  let headX = 34;
  let headY = 36 + drop + bob + breath;
  if (bow) { headX += 7; headY += 9; }

  // capa
  if (L.fur || L.armor || L.head === 'coroa') {
    const flow = walk ? 3 + Math.abs(Math.sin(t)) * 4 : 1;
    const capeC = shade(o, -0.45);
    for (let y = sY - 2; y < (seated ? hipY + 8 : FOOT - 4); y++) {
      const k = (y - sY) / (FOOT - sY);
      px(ctx, hx - 7 - k * (6 + flow), y, 9 + k * 4, 1, capeC);
    }
  }
  // cabelo longo atrás
  if (L.hairStyle === 'longo' || L.hairStyle === 'ondulado') px(ctx, headX - 9, headY - 4, 7, 26, shade(L.hair, -0.25));
  if (L.hairStyle === 'tranca') for (let y = headY + 2; y < headY + 30; y += 3) px(ctx, headX - 8, y, 4, 3, y % 2 ? L.hair : shade(L.hair, -0.25));

  // braço de trás
  const backHand: [number, number] = seated ? [hx + 10, hipY - 2] : [hx + 1 + swing * 0.7, sY + 25];
  limb(ctx, hx + 1, sY + 3, backHand[0], backHand[1], 4, od);
  px(ctx, backHand[0] - 1, backHand[1], 3, 3, skinD);

  // pernas
  const leg = (x2: number, y2: number, front: boolean, kx?: number, ky?: number) => {
    const col = front ? pants : shade(pants, -0.25);
    if (kx !== undefined && ky !== undefined) {
      limb(ctx, hx, hipY, kx, ky, 5, col);
      limb(ctx, kx, ky, x2, y2, 5, col);
    } else limb(ctx, hx, hipY, x2, y2, 5, col);
    px(ctx, x2 - 3, y2 - 5, 8, 5, front ? boots : shade(boots, -0.2));
  };
  if (seated) {
    leg(hx + 16, FOOT, false, hx + 15, hipY + 2);
    leg(hx + 19, FOOT, true, hx + 18, hipY + 1);
  } else if (anim === 'kneel') {
    leg(hx - 12, FOOT, false, hx - 1, FOOT - 3);
    leg(hx + 12, FOOT, true, hx + 12, hipY + 3);
  } else if (!dress) {
    leg(hx - swing, FOOT, false);
    leg(hx + swing, FOOT, true);
  } else {
    px(ctx, hx - 4 - swing * 0.5, FOOT - 4, 7, 4, boots);
    px(ctx, hx + 2 + swing * 0.5, FOOT - 4, 7, 4, shade(boots, 0.1));
  }

  // tronco / vestido
  const torsoTop = sY - 2;
  if (dress && !seated) {
    const sway = walk ? Math.sin(t) * 2 : 0;
    const hem = anim === 'kneel' ? FOOT - 1 : FOOT - 3;
    for (let y = hipY - 8; y < hem; y++) {
      const k = (y - (hipY - 8)) / (hem - (hipY - 8));
      const back = hx - 7 - k * 8 + sway * k;
      const front = hx + 8 + k * 9 + sway * k;
      px(ctx, back, y, front - back, 1, o);
      px(ctx, back, y, 3, 1, od);
      px(ctx, front - 2, y, 2, 1, ol);
    }
    px(ctx, hx - 15 + sway, hem - 2, 34, 2, L.trim);
    px(ctx, hx + 3, hipY - 6, 2, hem - hipY + 4, shade(L.trim, -0.1));
  }
  const tw = L.female ? 14 : 16;
  const tx = hx - tw / 2 + (bow ? 3 : 0);
  for (let y = torsoTop; y < hipY; y++) {
    const waist = L.female && y > sY + 14 ? 2 : 0;
    px(ctx, tx + waist, y, tw - waist * 2, 1, L.armor ? '#8a8a98' : o);
    px(ctx, tx + waist, y, 3, 1, L.armor ? '#6a6a78' : od);
    px(ctx, tx + tw - 3 - waist, y, 2, 1, L.armor ? '#b8b8c8' : ol);
  }
  if (L.armor) px(ctx, tx + 4, sY + 4, tw - 7, hipY - sY - 2, o);
  px(ctx, tx, hipY - 6, tw, 3, L.trim); // cinto
  px(ctx, tx + tw - 5, sY + 2, 2, hipY - sY - 8, L.trim); // botões / bordado frontal
  if (L.fur) {
    ellipse(ctx, hx + (bow ? 3 : 0), sY, 9, 3, '#f0ece4');
    px(ctx, hx - 3, sY, 1, 1, '#222');
    px(ctx, hx + 4, sY + 1, 1, 1, '#222');
  }

  // braço da frente (pose depende da animação)
  let hand: [number, number] = [hx + 1 - swing * 0.7, sY + 25];
  if (anim === 'talk') hand = f === 0 ? [hx + 15, sY + 10] : [hx + 17, sY + 5];
  if (anim === 'seatedTalk') hand = [hx + 16, sY + 6];
  if (anim === 'seatedThink') hand = [headX + 5, headY + 8];
  if (anim === 'seated') hand = [hx + 12, hipY - 3];
  if (bow) hand = [hx + 4, sY + 12];
  if (anim === 'kneel') hand = [hx + 13, hipY];
  const armC = L.armor ? '#9a9aa8' : o;
  limb(ctx, hx + 2, sY + 3, hand[0], hand[1], 4, armC);
  px(ctx, hand[0] - 1, hand[1], 3, 3, skin);

  // acessórios na mão da frente
  if (L.accessory === 'lanca') { px(ctx, hand[0], hand[1] - 70, 1, 100, '#6a4a2a'); px(ctx, hand[0] - 1, hand[1] - 76, 3, 7, '#d8d8e0'); }
  if (L.accessory === 'leque') { ellipse(ctx, hand[0] + 3, hand[1] - 2, 4, 3, '#1c3a2a'); px(ctx, hand[0], hand[1] - 5, 7, 1, GOLD); }
  if (L.accessory === 'pergaminho') { px(ctx, hand[0] - 1, hand[1] - 5, 3, 9, '#f0e0b0'); px(ctx, hand[0] - 1, hand[1] - 5, 3, 1, '#8a1c24'); }
  if (L.accessory === 'livro') px(ctx, hand[0] - 2, hand[1] - 3, 6, 8, '#8a1c24');

  // cabeça de perfil
  px(ctx, headX - 3, headY + 7, 6, 6, skinD); // pescoço
  ellipse(ctx, headX, headY, 8, 9, skin);
  px(ctx, headX + 6, headY + 1, 3, 3, skin); // nariz
  px(ctx, headX + 8, headY + 2, 1, 1, skinD);
  px(ctx, headX + 3, headY + 6, 5, 3, skin); // queixo
  px(ctx, headX - 2, headY + 1, 2, 3, skinD); // orelha
  px(ctx, headX + 3, headY - 1, 3, 2, '#ffffff');
  px(ctx, headX + 4, headY - 1, 2, 2, L.eyes);
  px(ctx, headX + 5, headY - 1, 1, 1, '#141018');
  px(ctx, headX + 3, headY - 3, 4, 1, shade(L.hair, -0.2));
  px(ctx, headX + 5, headY + 5, 3, 1, L.female ? '#c0485a' : shade(skin, -0.4));
  if (L.age === 'velho') px(ctx, headX + 2, headY + 3, 1, 2, skinD);

  // barba
  const bc = L.hair;
  if (L.beard === 'cheia') { px(ctx, headX - 1, headY + 3, 9, 8, bc); px(ctx, headX + 5, headY + 5, 3, 1, shade(bc, -0.4)); }
  if (L.beard === 'curta') px(ctx, headX, headY + 4, 8, 4, shade(bc, 0.05));
  if (L.beard === 'bigode') px(ctx, headX + 4, headY + 4, 5, 1, bc);

  // cabelo
  const h = L.hair;
  if (L.hairStyle !== 'careca') {
    ellipse(ctx, headX - 2, headY - 4, 8, 6, h);
    px(ctx, headX - 9, headY - 4, 6, 10, h);
    px(ctx, headX + 1, headY - 9, 7, 4, h);
    px(ctx, headX + 3, headY - 6, 4, 2, shade(h, 0.25));
    if (L.hairStyle === 'desgrenhado') for (let i = 0; i < 4; i++) px(ctx, headX - 8 + i * 4, headY - 12 + (i % 2), 3, 3, h);
    if (L.hairStyle === 'coque') ellipse(ctx, headX - 6, headY - 8, 4, 4, h);
  } else px(ctx, headX - 8, headY - 1, 4, 4, shade(h, 0.1));

  // cabeça: coroas, capuz, elmo
  switch (L.head) {
    case 'coroa':
      px(ctx, headX - 6, headY - 12, 11, 3, GOLD);
      for (const x of [-6, -2, 2]) px(ctx, headX + x, headY - 14, 1, 2, GOLD);
      px(ctx, headX - 1, headY - 11, 1, 1, '#d23c3c');
      break;
    case 'tiara': px(ctx, headX - 4, headY - 10, 9, 1, GOLD); px(ctx, headX + 3, headY - 11, 2, 2, GOLD); break;
    case 'diadema': px(ctx, headX - 5, headY - 7, 12, 1, GOLD); px(ctx, headX + 6, headY - 8, 2, 2, '#4caf6a'); break;
    case 'elmo':
      ellipse(ctx, headX, headY - 2, 9, 9, '#9a9aa8');
      px(ctx, headX - 9, headY - 2, 18, 8, '#9a9aa8');
      px(ctx, headX + 2, headY - 2, 8, 2, '#1a1020');
      px(ctx, headX - 3, headY - 11, 3, 3, '#b8b8c8');
      break;
    case 'capuz':
      ellipse(ctx, headX - 4, headY - 3, 6, 9, o);
      px(ctx, headX - 4, headY - 12, 9, 3, o);
      px(ctx, headX - 11, headY - 2, 8, 16, o);
      px(ctx, headX - 11, headY - 2, 2, 16, od);
      break;
  }

  outline(ctx, CELL_W, CELL_H);
  return c;
}
