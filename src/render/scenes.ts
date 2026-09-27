import { HOUSES } from '../data/realm';
import type { RealmId } from '../types';
import { drawIcon, ellipse, hash2, makeCanvas, px, shade } from './pixel';

// Cenários em VISTA LATERAL, 480x270 (escalados 4x em 1920x1080).
// As janelas ficam transparentes: por trás delas o céu é CSS e muda com a hora.
export const SW = 480;
export const SH = 270;
export const WALL_BOTTOM = 140;

// Posições usadas pela cena (em pixels do cenário)
export const LAYOUT = {
  speakerX: 282, // eixo do corpo de quem fala com o rei
  floorY: 182, // linha dos pés no salão
  daisY: 158, // topo do estrado
  throneX: 424, // eixo do rei sentado
  doorX: -40, // de onde as pessoas entram
};

export interface Flame {
  x: number;
  y: number;
  big?: boolean;
}

export interface Room {
  canvas: HTMLCanvasElement;
  flames: Flame[];
}

const STONE = '#5a4c42';

function stoneWall(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, base = STONE) {
  px(ctx, x0, y0, w, h, base);
  for (let y = y0; y < y0 + h; y += 7) {
    const off = ((y - y0) / 7) % 2 ? 7 : 0;
    px(ctx, x0, y, w, 1, shade(base, -0.25));
    for (let x = x0 - off; x < x0 + w; x += 14) {
      px(ctx, Math.max(x0, x), y, 1, 7, shade(base, -0.2));
      const n = hash2(x, y, 3);
      if (n > 0.65) px(ctx, Math.max(x0, x + 2), y + 2, 8, 3, shade(base, n > 0.85 ? 0.08 : -0.07));
      if (n < 0.08) px(ctx, Math.max(x0, x + 4), y + 3, 2, 1, shade(base, -0.35));
    }
  }
}

function gothicWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const r = w / 2;
  ctx.fillStyle = shade(STONE, 0.2);
  ctx.beginPath();
  ctx.moveTo(x - 4, y + h + 3);
  ctx.lineTo(x - 4, y + r);
  ctx.arc(x + r, y + r, r + 4, Math.PI, 0);
  ctx.lineTo(x + w + 4, y + h + 3);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, 0);
  ctx.lineTo(x + w, y + h);
  ctx.fill();
  ctx.restore();
  const bar = '#2a2230';
  px(ctx, x + r - 1, y + 3, 2, h - 3, bar);
  for (let yy = y + r; yy < y + h; yy += 18) px(ctx, x, yy, w, 1, bar);
  // rosácea no arco
  ctx.strokeStyle = bar;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x + r, y + r * 0.9, r * 0.45, 0, Math.PI * 2);
  ctx.stroke();
  px(ctx, x - 6, y + h, w + 12, 4, shade(STONE, 0.28));
  px(ctx, x - 6, y + h + 4, w + 12, 1, shade(STONE, -0.35));
}

function pillar(ctx: CanvasRenderingContext2D, x: number, w: number, top: number, bottom: number) {
  px(ctx, x, top, w, bottom - top, shade(STONE, 0.12));
  px(ctx, x, top, 2, bottom - top, shade(STONE, 0.32));
  px(ctx, x + w - 3, top, 3, bottom - top, shade(STONE, -0.22));
  for (let i = 5; i < w - 3; i += 4) px(ctx, x + i, top, 1, bottom - top, shade(STONE, 0.03));
  px(ctx, x - 3, bottom - 8, w + 6, 8, shade(STONE, 0.22));
  px(ctx, x - 3, bottom - 8, w + 6, 1, shade(STONE, 0.4));
  px(ctx, x - 3, top, w + 6, 5, shade(STONE, 0.22));
}

export function banner(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, realm: RealmId) {
  const H = HOUSES[realm];
  px(ctx, x - 3, y - 2, w + 6, 2, '#8a6a2a');
  px(ctx, x, y, w, h, H.color);
  px(ctx, x, y, 2, h, shade(H.color, 0.2));
  px(ctx, x + w - 2, y, 2, h, shade(H.color, -0.3));
  for (let i = 0; i < w; i++) {
    const tip = Math.round(8 - Math.abs(i - w / 2) * (8 / (w / 2)));
    px(ctx, x + i, y + h, 1, Math.max(1, tip), H.color);
  }
  px(ctx, x, y + 3, w, 1, '#d8b04a');
  px(ctx, x, y + h - 4, w, 1, '#d8b04a');
  for (let i = 0; i < w; i += 2) px(ctx, x + i, y + h + 2, 1, 3, '#d8b04a');
  const ic = w >= 24 ? 3 : w >= 16 ? 2 : 1;
  drawIcon(ctx, H.sigil, x + Math.floor(w / 2 - 5.5 * ic), y + Math.floor(h / 2 - 5 * ic), '#e8c04a', ic);
}

function candelabra(ctx: CanvasRenderingContext2D, x: number, floorY: number, height: number, flames: Flame[]) {
  const g = '#c8a040', gd = '#7a5a1a';
  px(ctx, x - 5, floorY - 3, 11, 3, gd);
  px(ctx, x, floorY - height, 2, height, g);
  px(ctx, x - 7, floorY - height + 5, 16, 1, g);
  for (const dx of [-7, 0, 8]) {
    px(ctx, x + dx - 1, floorY - height + 1, 4, 2, gd);
    px(ctx, x + dx, floorY - height - 5, 2, 5, '#f4ead0');
    flames.push({ x: x + dx + 1, y: floorY - height - 7 });
  }
}

function sconce(ctx: CanvasRenderingContext2D, x: number, y: number, flames: Flame[]) {
  px(ctx, x - 3, y, 7, 2, '#a8802a');
  px(ctx, x - 1, y + 2, 3, 3, '#7a5a1a');
  px(ctx, x, y - 5, 2, 5, '#f4ead0');
  flames.push({ x: x + 1, y: y - 7 });
}

function floor(ctx: CanvasRenderingContext2D, y0: number, a: string, b: string) {
  for (let y = y0; y < SH; y++) {
    const row = Math.floor((y - y0) / 8);
    const tw = 20 + row * 5;
    const off = row % 2 ? tw / 2 : 0;
    for (let x = -tw; x < SW + tw; x += tw) {
      const col = Math.floor((x + off) / tw);
      px(ctx, x + off, y, tw, 1, (row + col) % 2 ? a : b);
    }
    if ((y - y0) % 8 === 0) px(ctx, 0, y, SW, 1, shade(a, -0.3));
  }
  px(ctx, 0, y0, SW, 2, shade(a, -0.45));
}

function flowers(ctx: CanvasRenderingContext2D, x: number, y: number) {
  px(ctx, x - 4, y, 9, 10, '#b8983a');
  px(ctx, x - 5, y, 11, 1, '#e8c85a');
  ellipse(ctx, x, y - 6, 10, 6, '#3a6a32');
  for (let i = 0; i < 12; i++) {
    const fx = x - 9 + Math.floor(hash2(i, 1) * 18);
    const fy = y - 12 + Math.floor(hash2(i, 2) * 10);
    px(ctx, fx, fy, 2, 2, i % 3 ? '#f4ece0' : '#e86a6a');
  }
}

function doorway(ctx: CanvasRenderingContext2D, x: number, w: number, top: number, bottom: number, flames: Flame[]) {
  const r = w / 2;
  ctx.fillStyle = shade(STONE, 0.22);
  ctx.beginPath();
  ctx.moveTo(x - 5, bottom);
  ctx.lineTo(x - 5, top + r);
  ctx.arc(x + r, top + r, r + 5, Math.PI, 0);
  ctx.lineTo(x + w + 5, bottom);
  ctx.fill();
  // interior escuro com luz de tocha
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, '#1a1018');
  g.addColorStop(1, '#3a2418');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, bottom);
  ctx.lineTo(x, top + r);
  ctx.arc(x + r, top + r, r, Math.PI, 0);
  ctx.lineTo(x + w, bottom);
  ctx.fill();
  px(ctx, x + 6, bottom - 26, w - 12, 26, '#4a3020');
  // folhas da porta abertas
  for (const [dx, dir] of [[0, 1], [w, -1]] as const) {
    for (let i = 0; i < 12; i++) px(ctx, x + dx + dir * i - (dir < 0 ? 1 : 0), top + r - 4 + i * 0.6, 1, bottom - top - r + 4 - i * 0.6, i % 4 === 0 ? '#3a2410' : '#6a4220');
    px(ctx, x + dx + dir * 8, top + r + 30, dir, 3, '#c8a040');
  }
  sconce(ctx, x - 12, top + 30, flames);
  sconce(ctx, x + w + 12, top + 30, flames);
}

export function throneRoom(drawThrone = true): Room {
  const { c, ctx } = makeCanvas(SW, SH);
  const flames: Flame[] = [];
  const WB = WALL_BOTTOM;
  stoneWall(ctx, 0, 0, SW, WB);
  // rodapé de madeira
  px(ctx, 0, WB - 14, SW, 14, '#4a3226');
  px(ctx, 0, WB - 14, SW, 2, '#6a4a32');
  for (let x = 4; x < SW; x += 24) px(ctx, x, WB - 11, 18, 8, '#3e2a20');

  doorway(ctx, 20, 46, 46, WB, flames);
  const wins = [106, 170, 234, 298];
  for (const x of wins) gothicWindow(ctx, x, 14, 40, 96);
  for (const x of [86, 150, 214, 278, 342]) pillar(ctx, x, 16, 0, WB);
  const bann: RealmId[] = ['valmont', 'seren', 'coroa', 'drakon', 'montclair'];
  [86, 150, 214, 278, 342].forEach((x, i) => banner(ctx, x + 2, 10, 12, 52, bann[i]));
  // tapeçaria real atrás do trono
  banner(ctx, 382, 6, 72, 96, 'coroa');
  sconce(ctx, 82, 80, flames);
  sconce(ctx, 374, 76, flames);

  floor(ctx, WB, '#6a5a52', '#86766c');
  // tapete horizontal da porta até o estrado
  px(ctx, 0, 170, 362, 16, '#8a1c24');
  px(ctx, 0, 170, 362, 2, '#d8b04a');
  px(ctx, 0, 184, 362, 2, '#d8b04a');
  for (let x = 4; x < 362; x += 10) px(ctx, x, 176, 4, 2, '#b8404a');

  // estrado em degraus (visto de lado, sobe para a direita)
  const steps: [number, number][] = [[352, 176], [366, 169], [380, 163], [392, 158]];
  for (const [x, y] of steps) {
    px(ctx, x, y, SW - x, 196 - y, '#2a3f8f');
    px(ctx, x, y, SW - x, 2, '#d8b04a');
    px(ctx, x, y + 2, 2, 196 - y - 2, '#16225a');
  }
  px(ctx, 352, 196, SW - 352, 4, '#16225a');

  // trono de perfil, voltado para a esquerda (a arte gerada do rei já traz o trono)
  if (drawThrone) drawCodeThrone(ctx);

  candelabra(ctx, 344, 176, 50, flames);
  candelabra(ctx, 474, 158, 44, flames);
  flowers(ctx, 386, 150);
  flowers(ctx, 136, 150);
  return { canvas: c, flames };
}

function drawCodeThrone(ctx: CanvasRenderingContext2D) {
  const gold = '#c8a040', goldL = '#f0cc60', goldD = '#7a5a1a';
  px(ctx, 448, 78, 12, 80, gold); // encosto
  px(ctx, 450, 82, 6, 44, '#2a3f8f');
  for (let y = 86; y < 124; y += 7) px(ctx, 452, y, 2, 2, '#16225a');
  px(ctx, 446, 70, 16, 8, goldL); // crista
  px(ctx, 451, 62, 6, 8, goldL);
  px(ctx, 453, 64, 2, 2, '#d23c3c');
  px(ctx, 420, 134, 34, 7, gold); // assento
  px(ctx, 420, 130, 30, 4, '#2a3f8f'); // almofada
  px(ctx, 420, 122, 4, 12, gold); // braço
  px(ctx, 420, 120, 28, 3, goldL);
  px(ctx, 422, 141, 4, 17, goldD);
  px(ctx, 446, 141, 4, 17, goldD);
  px(ctx, 418, 156, 8, 2, gold);
}

export function library(): Room {
  const { c, ctx } = makeCanvas(SW, SH);
  const flames: Flame[] = [];
  const WB = WALL_BOTTOM;
  stoneWall(ctx, 0, 0, SW, WB, '#4a3e36');
  gothicWindow(ctx, 214, 14, 52, 92);
  const shelf = (x0: number, w: number) => {
    px(ctx, x0, 4, w, WB - 4, '#3a2418');
    px(ctx, x0, 4, 3, WB - 4, '#5a3a22');
    px(ctx, x0 + w - 3, 4, 3, WB - 4, '#2a1810');
    for (let y = 10; y < WB - 12; y += 22) {
      px(ctx, x0 + 3, y + 19, w - 6, 3, '#5a3a22');
      let x = x0 + 4;
      while (x < x0 + w - 7) {
        const bw = 2 + Math.floor(hash2(x, y) * 4);
        const bh = 12 + Math.floor(hash2(x, y, 2) * 7);
        const cols = ['#8a1c24', '#23346e', '#1f6a44', '#6a4a1a', '#5a2a7a', '#a8781a', '#4a4d57', '#2a5a6a'];
        const col = cols[Math.floor(hash2(x, y, 5) * cols.length)];
        const lean = hash2(x, y, 9) > 0.93;
        px(ctx, x, y + 19 - bh + (lean ? 2 : 0), bw, bh - (lean ? 2 : 0), col);
        px(ctx, x, y + 21 - bh, bw, 1, '#d8b04a');
        x += bw + (lean ? 3 : 0);
      }
    }
  };
  shelf(4, 196);
  shelf(282, 194);
  floor(ctx, WB, '#4a3a30', '#5a4a3e');
  px(ctx, 0, 170, SW, 16, '#3a2a4a');
  px(ctx, 0, 170, SW, 2, '#b8903a');
  // mesa de leitura vista de lado
  px(ctx, 190, 140, 110, 8, '#6a4222');
  px(ctx, 190, 140, 110, 2, '#8a5a32');
  px(ctx, 196, 148, 6, 36, '#4a2a14');
  px(ctx, 288, 148, 6, 36, '#4a2a14');
  px(ctx, 226, 132, 28, 8, '#f0e2c0');
  px(ctx, 239, 132, 2, 8, '#b8a070');
  px(ctx, 200, 128, 16, 12, '#8a1c24');
  px(ctx, 202, 124, 14, 4, '#23346e');
  ellipse(ctx, 276, 126, 9, 9, '#2a6a8a');
  px(ctx, 271, 121, 6, 5, '#6a8a3a');
  px(ctx, 275, 135, 2, 5, '#c8a040');
  px(ctx, 262, 136, 2, 4, '#f4ead0');
  flames.push({ x: 263, y: 133, big: true });
  candelabra(ctx, 150, 180, 46, flames);
  candelabra(ctx, 340, 180, 46, flames);
  return { canvas: c, flames };
}

// Silhueta da cidade vista pelas janelas (dia e noite)
export function cityscape(night: boolean): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(SW, SH);
  const hill = night ? '#1a2240' : '#8aa8c8';
  const hill2 = night ? '#141a32' : '#6a9a6a';
  for (let x = 0; x < SW; x++) {
    const h1 = 80 + Math.sin(x / 31) * 6 + Math.sin(x / 9) * 2;
    px(ctx, x, h1, 1, SH, hill);
    const h2 = 98 + Math.sin(x / 21 + 2) * 3;
    px(ctx, x, h2, 1, SH, hill2);
  }
  const wall = night ? '#232a4a' : '#c8c0b4';
  const wallD = night ? '#1a2038' : '#a89e92';
  const roof = night ? '#2a3a6a' : '#3a5aa0';
  const towers = [[168, 66, 6], [182, 58, 7], [198, 50, 6], [214, 40, 9], [232, 52, 6], [246, 60, 7], [262, 66, 6], [278, 70, 6]];
  px(ctx, 164, 76, 124, 40, wall);
  for (let x = 164; x < 288; x += 4) px(ctx, x, 74, 2, 2, wall);
  for (const [x, top, w] of towers) {
    px(ctx, x, top, w, 70, wall);
    px(ctx, x + w - 1, top, 1, 70, wallD);
    for (let i = 0; i <= w / 2; i++) px(ctx, x - 1 + i, top - 1 - i * 2, w + 2 - i * 2, 2, roof);
    for (let y = top + 4; y < 104; y += 6) {
      const lit = night && hash2(x, y) > 0.3;
      px(ctx, x + Math.floor(w / 2) - 1, y, 1, 2, lit ? '#f8c860' : night ? '#10142a' : '#6a6a7a');
    }
  }
  for (let x = 0; x < SW; x += 6) {
    const h = 4 + Math.floor(hash2(x, 9) * 7);
    const y = 110 - h;
    px(ctx, x, y, 6, 30, night ? '#1c2240' : '#d8c8b0');
    px(ctx, x, y - 2, 6, 3, night ? '#3a2030' : '#a85a42');
    if (night && hash2(x, 3) > 0.45) px(ctx, x + 2, y + 2, 1, 2, '#f8c860');
  }
  return c;
}
