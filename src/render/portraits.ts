import type { Look } from '../types';
import { CHARACTERS } from '../data/characters';
import { ellipse, makeCanvas, outline, px, shade } from './pixel';

// Retratos e sprites gerados a partir da descrição do personagem (Look).
// São placeholders: trocar por arte final é só substituir portraitUrl/spriteCanvas.

const GOLD = '#e8b84a';
const cache = new Map<string, string>();

function hairBack(ctx: CanvasRenderingContext2D, L: Look, cx: number, top: number) {
  const h = L.hair;
  const d = shade(h, -0.3);
  if (L.hairStyle === 'longo' || L.hairStyle === 'ondulado') {
    ellipse(ctx, cx, top + 14, 13, 14, d);
    px(ctx, cx - 13, top + 14, 26, 18, d);
    if (L.hairStyle === 'ondulado') for (let y = top + 16; y < top + 34; y += 3) { px(ctx, cx - 14, y, 2, 2, h); px(ctx, cx + 12, y + 1, 2, 2, h); }
  }
  if (L.hairStyle === 'tranca') {
    ellipse(ctx, cx, top + 12, 11, 12, d);
    for (let y = top + 18; y < top + 36; y += 3) { px(ctx, cx + 8, y, 4, 3, h); px(ctx, cx + 9, y + 2, 2, 1, d); }
  }
  if (L.hairStyle === 'coque') ellipse(ctx, cx, top + 1, 6, 5, h);
}

function hairFront(ctx: CanvasRenderingContext2D, L: Look, cx: number, top: number) {
  const h = L.hair;
  const l = shade(h, 0.25);
  const d = shade(h, -0.3);
  switch (L.hairStyle) {
    case 'careca':
      px(ctx, cx - 9, top + 12, 1, 4, d);
      px(ctx, cx + 9, top + 12, 1, 4, d);
      return;
    case 'curto':
      ellipse(ctx, cx, top + 7, 10, 6, h);
      px(ctx, cx - 10, top + 7, 3, 7, h);
      px(ctx, cx + 7, top + 7, 3, 7, h);
      px(ctx, cx - 6, top + 11, 9, 2, h);
      px(ctx, cx - 4, top + 4, 6, 1, l);
      return;
    case 'desgrenhado':
      ellipse(ctx, cx, top + 7, 11, 7, h);
      for (let i = -10; i <= 8; i += 3) px(ctx, cx + i, top + 10 + ((i + 20) % 2), 3, 2, h);
      px(ctx, cx - 11, top + 8, 3, 9, h);
      px(ctx, cx + 8, top + 8, 3, 9, h);
      px(ctx, cx - 5, top + 3, 7, 1, l);
      px(ctx, cx - 12, top + 3, 3, 3, h);
      px(ctx, cx + 9, top + 2, 3, 3, h);
      return;
    default: {
      // longo, ondulado, tranca, coque: repartido ao meio emoldurando o rosto
      ellipse(ctx, cx, top + 7, 10, 6, h);
      px(ctx, cx - 10, top + 7, 3, 14, h);
      px(ctx, cx + 7, top + 7, 3, 14, h);
      px(ctx, cx - 8, top + 10, 6, 3, h);
      px(ctx, cx + 2, top + 10, 6, 3, h);
      px(ctx, cx - 1, top + 5, 1, 6, d);
      px(ctx, cx - 6, top + 4, 4, 1, l);
      px(ctx, cx + 3, top + 4, 4, 1, l);
    }
  }
}

function headwear(ctx: CanvasRenderingContext2D, L: Look, cx: number, top: number) {
  switch (L.head) {
    case 'coroa':
      px(ctx, cx - 8, top + 1, 17, 4, GOLD);
      for (const x of [-8, -4, 0, 4, 8]) px(ctx, cx + x, top - 2, 1, 3, GOLD);
      px(ctx, cx - 8, top + 4, 17, 1, shade(GOLD, -0.35));
      px(ctx, cx, top + 2, 1, 1, '#d23c3c');
      px(ctx, cx - 5, top + 2, 1, 1, '#4a7ae0');
      px(ctx, cx + 5, top + 2, 1, 1, '#4a7ae0');
      break;
    case 'tiara':
      px(ctx, cx - 7, top + 3, 15, 1, GOLD);
      px(ctx, cx - 1, top + 1, 3, 2, GOLD);
      px(ctx, cx, top + 1, 1, 1, '#6ac8e8');
      break;
    case 'diadema':
      px(ctx, cx - 9, top + 6, 19, 1, GOLD);
      px(ctx, cx - 1, top + 6, 3, 3, GOLD);
      px(ctx, cx, top + 7, 1, 1, L.eyes);
      break;
    case 'elmo':
      ellipse(ctx, cx, top + 7, 11, 8, '#9a9aa8');
      px(ctx, cx - 11, top + 7, 22, 6, '#9a9aa8');
      px(ctx, cx - 1, top + 7, 2, 10, '#7a7a88');
      break;
    case 'capuz': {
      const c = L.outfit;
      ellipse(ctx, cx, top + 7, 12, 8, c);
      px(ctx, cx - 12, top + 7, 4, 22, c);
      px(ctx, cx + 8, top + 7, 4, 22, c);
      px(ctx, cx - 12, top + 7, 1, 22, shade(c, 0.2));
      break;
    }
  }
}

function drawBust(ctx: CanvasRenderingContext2D, L: Look, W: number, H: number) {
  const cx = Math.floor(W / 2);
  const top = 8;
  const skin = L.skin;
  const skinD = shade(skin, -0.18);
  const outfit = L.outfit;
  const trim = L.trim;

  hairBack(ctx, L, cx, top);

  // corpo / ombros
  const bodyTop = top + 27;
  for (let y = bodyTop; y < H; y++) {
    const t = (y - bodyTop) / (H - bodyTop);
    const half = Math.round(8 + t * 14 + (y > bodyTop + 3 ? 4 : 0));
    px(ctx, cx - half, y, half * 2, 1, outfit);
    px(ctx, cx + half - 4, y, 4, 1, shade(outfit, -0.3));
    px(ctx, cx - half, y, 2, 1, shade(outfit, 0.2));
  }
  if (L.armor) {
    for (const s of [-1, 1]) {
      ellipse(ctx, cx + s * 14, bodyTop + 5, 6, 4, '#9a9aa8');
      px(ctx, cx + s * 14 - 3, bodyTop + 3, 3, 1, '#d8d8e0');
    }
    px(ctx, cx - 6, bodyTop + 6, 12, H - bodyTop, '#7a7a88');
    px(ctx, cx - 6, bodyTop + 6, 2, H - bodyTop, '#b8b8c8');
  }
  if (L.fur) {
    for (let x = cx - 20; x <= cx + 20; x++) {
      const y = bodyTop + 2 + Math.round(Math.abs(x - cx) / 5);
      px(ctx, x, y, 1, 4, '#f0ece4');
      if ((x * 7) % 5 === 0) px(ctx, x, y + 1, 1, 1, '#2a2a2a');
    }
  }
  // decote / gola com acabamento
  if (L.female) {
    for (let i = 0; i < 6; i++) { px(ctx, cx - 7 + i, bodyTop + 1 + i, 2, 1, trim); px(ctx, cx + 6 - i, bodyTop + 1 + i, 2, 1, trim); }
    px(ctx, cx - 5, bodyTop, 11, 6, skin);
    for (let i = 0; i < 5; i++) px(ctx, cx - 5 + i, bodyTop + 1 + i, 11 - i * 2, 1, skin);
    px(ctx, cx - 1, bodyTop + 4, 3, 2, trim); // pingente
  } else {
    px(ctx, cx - 4, bodyTop, 8, 3, trim);
    px(ctx, cx - 1, bodyTop + 3, 2, H - bodyTop, shade(trim, -0.2));
  }

  // pescoço e cabeça
  px(ctx, cx - 3, top + 22, 7, 7, skinD);
  ellipse(ctx, cx, top + 14, 9, 11, skin);
  px(ctx, cx + 5, top + 10, 3, 12, skinD);
  px(ctx, cx - 9, top + 14, 1, 3, skinD);
  px(ctx, cx + 9, top + 14, 1, 3, skinD);

  // olhos
  const ey = top + 14;
  for (const ex of [cx - 5, cx + 2]) {
    px(ctx, ex, ey, 4, 2, '#ffffff');
    px(ctx, ex + 1, ey, 2, 2, L.eyes);
    px(ctx, ex + 2, ey, 1, 1, '#141018');
    px(ctx, ex + 1, ey, 1, 1, shade(L.eyes, 0.5));
    px(ctx, ex, ey - 1, 4, 1, L.female ? '#241418' : shade(skin, -0.35));
    px(ctx, ex, ey - 3, 4, 1, shade(L.hair, -0.2));
  }
  if (L.female) { px(ctx, cx - 6, ey - 1, 1, 1, '#241418'); px(ctx, cx + 6, ey - 1, 1, 1, '#241418'); }
  // nariz, boca, bochechas
  px(ctx, cx, top + 17, 1, 3, skinD);
  px(ctx, cx - 1, top + 19, 1, 1, skinD);
  px(ctx, cx - 2, top + 21, 4, 1, L.female ? '#c0485a' : shade(skin, -0.4));
  if (L.female) { px(ctx, cx - 7, top + 18, 2, 1, '#e8908a'); px(ctx, cx + 5, top + 18, 2, 1, '#e8908a'); }
  if (L.age === 'velho') { px(ctx, cx - 6, top + 17, 1, 2, skinD); px(ctx, cx + 5, top + 17, 1, 2, skinD); px(ctx, cx - 3, top + 10, 5, 1, skinD); }

  // barba
  const bc = shade(L.hair, -0.05);
  if (L.beard === 'cheia') {
    for (let y = top + 18; y < top + 28; y++) {
      const half = Math.max(2, 9 - Math.max(0, y - (top + 22)) * 1.3);
      px(ctx, cx - half, y, half * 2 + 1, 1, bc);
    }
    px(ctx, cx - 2, top + 21, 4, 1, shade(bc, -0.4));
    px(ctx, cx - 3, top + 20, 7, 1, bc);
  } else if (L.beard === 'curta') {
    for (let y = top + 19; y < top + 25; y++) px(ctx, cx - 8 + (y - top - 19), y, 17 - (y - top - 19) * 2, 1, (y + cx) % 2 ? bc : shade(bc, 0.1));
    px(ctx, cx - 2, top + 21, 4, 1, '#3a2020');
    px(ctx, cx - 3, top + 20, 7, 1, bc);
  } else if (L.beard === 'bigode') {
    px(ctx, cx - 4, top + 20, 9, 1, bc);
    px(ctx, cx - 5, top + 21, 2, 1, bc);
    px(ctx, cx + 4, top + 21, 2, 1, bc);
  }

  hairFront(ctx, L, cx, top);
  headwear(ctx, L, cx, top);
  if (L.female && L.head !== 'capuz') {
    px(ctx, cx - 10, top + 18, 1, 2, GOLD);
    px(ctx, cx + 10, top + 18, 1, 2, GOLD);
  }
}

export function portraitUrl(id: string): string {
  const hit = cache.get(id);
  if (hit) return hit;
  const L = CHARACTERS[id]?.look;
  const W = 48, H = 52;
  const { c, ctx } = makeCanvas(W, H);
  if (L) drawBust(ctx, L, W, H);
  outline(ctx, W, H);
  const url = c.toDataURL();
  cache.set(id, url);
  return url;
}
