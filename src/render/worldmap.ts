import type { ProvinceId } from '../types';
import { ADJ } from '../engine/war';
import { fbm, hash2, makeCanvas, mix, px, shade, valueNoise } from './pixel';

// Mapa-diorama do reino (600x300 pixels de arte, exibido ~3x).
// Norhelm gelado ao norte, separado por uma cordilheira; o reino ao sul; Véridian numa ilha a sudeste.
export const WW = 600;
export const WH = 300;

export type Cell = ProvinceId | 'mar' | 'veridian';

export const SEEDS: Record<ProvinceId, [number, number]> = {
  hjalmgard: [300, 36],
  fiorde: [112, 50],
  passo: [470, 58],
  vale: [262, 120],
  montanhas: [452, 142],
  bosques: [116, 172],
  castelmar: [292, 198],
  costa: [452, 238],
};
export const ISLAND: [number, number] = [548, 272];
export const PORTS: Partial<Record<ProvinceId | 'veridian', [number, number]>> = { costa: [500, 250], veridian: [522, 268], fiorde: [70, 40] };

const IDS = Object.keys(SEEDS) as ProvinceId[];
const NORTH: ProvinceId[] = ['hjalmgard', 'fiorde', 'passo'];
const ridgeY = (x: number) => 90 + Math.sin(x / 38) * 9 + Math.sin(x / 13) * 3;

export interface World {
  grid: Cell[];
  depth: Uint8Array; // distância até a costa (água)
  terrain: HTMLCanvasElement;
  outline: Record<string, number[]>; // pixels de contorno por região
  borders: number[]; // fronteiras entre regiões de terra
  glints: number[]; // pixels de mar para brilho animado
  roads: Map<string, [number, number][]>;
}

let cache: World | null = null;

const idx = (x: number, y: number) => y * WW + x;

function isLand(x: number, y: number): boolean {
  const n = fbm(x / 30, y / 30, 21) - 0.5;
  const n2 = fbm(x / 9, y / 9, 22) - 0.5;
  const dx = (x - 292) / 252, dy = (y - 150) / 134;
  const d = dx * dx + dy * dy + n * 0.95 + n2 * 0.18;
  const bay = (cx: number, cy: number, r: number) => Math.hypot(x - cx, (y - cy) * 1.2) < r + n * 36;
  // baías e golfos que recortam o continente
  if (bay(612, 190, 70) || bay(364, 326, 58) || bay(-14, 118, 42) || bay(190, 318, 40) || bay(612, 14, 58) || bay(-10, 262, 46) || bay(540, 300, 30)) return false;
  // fiordes no noroeste
  if (x < 200 && y < 96 && valueNoise(x / 7, y / 24, 4) > 0.7) return false;
  // península da Costa Serena avança para o sudeste
  if (Math.hypot((x - 470) / 70, (y - 246) / 26) < 1 + n * 0.8) return true;
  return d < 1;
}

// ilhotas decorativas no mar (só desenho)
const ISLETS: [number, number, number][] = [[28, 190, 6], [70, 286, 5], [160, 290, 7], [590, 140, 5], [596, 240, 4], [18, 40, 5], [250, 294, 4]];

function isIsland(x: number, y: number) {
  const n = fbm(x / 14, y / 14, 33) - 0.5;
  return ((x - ISLAND[0]) / 46) ** 2 + ((y - ISLAND[1]) / 22) ** 2 < 1 + n * 0.9;
}

const RIVERS: [number, number][][] = [
  [[282, 98], [270, 130], [283, 168], [300, 206], [328, 246], [352, 292]],
  [[436, 150], [476, 170], [516, 180], [562, 186]],
  [[300, 44], [246, 36], [196, 24], [160, 6]],
  [[150, 150], [110, 132], [60, 124], [20, 120]],
];

function traceRiver(pts: [number, number][], seed: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const wig = (valueNoise((i * 50 + k) / 9, seed, 7) - 0.5) * 10;
      const nx = -(y1 - y0) / steps, ny = (x1 - x0) / steps;
      out.push([Math.round(x0 + (x1 - x0) * t + nx * wig), Math.round(y0 + (y1 - y0) * t + ny * wig)]);
    }
  }
  return out;
}

// ---------- sprites do diorama ----------
function tree(ctx: CanvasRenderingContext2D, x: number, y: number, dark = false) {
  const c = dark ? '#1e4a26' : '#2f6a2e';
  px(ctx, x, y + 3, 1, 3, '#4a2e18');
  px(ctx, x - 2, y, 5, 3, c);
  px(ctx, x - 1, y - 1, 3, 1, c);
  px(ctx, x - 1, y - 1, 2, 1, dark ? '#2e6a36' : '#4a8a3a');
  px(ctx, x - 2, y + 2, 5, 1, shade(c, -0.3));
}

function pine(ctx: CanvasRenderingContext2D, x: number, y: number, snow: boolean) {
  const c = '#1f4a44';
  px(ctx, x, y + 5, 1, 2, '#3a2a1a');
  px(ctx, x, y - 1, 1, 1, c);
  px(ctx, x - 1, y, 3, 2, c);
  px(ctx, x - 2, y + 2, 5, 3, c);
  px(ctx, x + 1, y + 2, 1, 3, shade(c, -0.3));
  if (snow) { px(ctx, x - 1, y, 1, 1, '#f4f8fc'); px(ctx, x - 2, y + 2, 2, 1, '#e8f0f8'); }
}

function palm(ctx: CanvasRenderingContext2D, x: number, y: number) {
  px(ctx, x, y, 1, 5, '#8a6a3a');
  px(ctx, x - 3, y - 1, 3, 1, '#3aa04a');
  px(ctx, x + 1, y - 1, 3, 1, '#3aa04a');
  px(ctx, x - 1, y - 2, 3, 1, '#4ab85a');
}

function mountain(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, snow: boolean, rock = '#8a8272') {
  const w = Math.round(h * 1.3);
  for (let i = 0; i < h; i++) {
    const half = Math.round((i / h) * w);
    const yy = y - h + i;
    px(ctx, x - half, yy, half, 1, shade(rock, 0.12));
    px(ctx, x, yy, half + 1, 1, shade(rock, -0.25));
    if (snow && i < h * 0.38) { px(ctx, x - half, yy, half, 1, '#f4f8fc'); px(ctx, x, yy, half + 1, 1, '#c8d4e4'); }
  }
  px(ctx, x - w, y, w * 2 + 1, 1, shade(rock, -0.45));
}

function field(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number) {
  const cols = [['#d8b848', '#c8a038'], ['#9ab848', '#86a43a'], ['#c89a48', '#b08a38']][Math.floor(hash2(x, y, seed) * 3)];
  for (let i = 0; i < 5; i++) px(ctx, x, y + i, 9, 1, cols[i % 2]);
  px(ctx, x, y + 5, 9, 1, '#6a5a2a');
}

function vineyard(ctx: CanvasRenderingContext2D, x: number, y: number) {
  px(ctx, x, y, 10, 6, '#6a9a3a');
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) px(ctx, x + c * 2, y + r * 2, 1, 1, (r + c) % 2 ? '#6a2a7a' : '#8a3a9a');
}

function house(ctx: CanvasRenderingContext2D, x: number, y: number, snow = false) {
  px(ctx, x, y + 2, 4, 3, '#e8dcc0');
  px(ctx, x + 3, y + 2, 1, 3, '#b8a888');
  px(ctx, x - 1, y, 6, 2, snow ? '#e8eef4' : '#a8442e');
  px(ctx, x + 1, y + 3, 1, 2, '#4a2a1a');
}

function castle(ctx: CanvasRenderingContext2D, x: number, y: number, big: boolean, dark = false) {
  const w = dark ? '#8a8e9c' : '#ece6d8', wd = dark ? '#5a5e6c' : '#b8ae9c', roof = dark ? '#2a3a5a' : '#2e4aa0';
  const s = big ? 1.5 : 1;
  const W = Math.round(14 * s), H = Math.round(8 * s);
  px(ctx, x - W / 2 - 1, y + 1, W + 2, 2, 'rgba(20,10,0,.35)');
  px(ctx, x - W / 2, y - H, W, H, w);
  px(ctx, x + W / 2 - 3, y - H, 3, H, wd);
  for (let i = 0; i < W; i += 2) px(ctx, x - W / 2 + i, y - H - 1, 1, 1, w);
  const towers = big ? [-W / 2, -2, W / 2 - 4] : [-W / 2, W / 2 - 4];
  for (const tx of towers) {
    const th = Math.round((big ? 9 : 6) + (tx === -2 ? 5 : 0));
    px(ctx, x + tx, y - H - th, 4, th, w);
    px(ctx, x + tx + 3, y - H - th, 1, th, wd);
    px(ctx, x + tx - 1, y - H - th - 2, 6, 2, roof);
    px(ctx, x + tx, y - H - th - 4, 4, 2, roof);
    px(ctx, x + tx + 1, y - H - th - 5, 2, 1, roof);
    px(ctx, x + tx + 1, y - H - th + 3, 1, 2, '#2a2030');
  }
  px(ctx, x - 1, y - 4, 3, 4, '#3a2418');
}

function port(ctx: CanvasRenderingContext2D, x: number, y: number) {
  px(ctx, x - 6, y, 12, 2, '#7a5a32');
  for (let i = -6; i < 6; i += 3) px(ctx, x + i, y + 2, 1, 2, '#4a3220');
  px(ctx, x + 2, y - 5, 1, 5, '#5a3a22');
  px(ctx, x + 3, y - 5, 3, 3, '#f0e8d8');
}

function mine(ctx: CanvasRenderingContext2D, x: number, y: number) {
  px(ctx, x - 3, y - 3, 7, 4, '#5a5448');
  px(ctx, x - 1, y - 2, 3, 3, '#1a1410');
  px(ctx, x - 3, y - 3, 7, 1, '#7a5a32');
  px(ctx, x + 3, y, 3, 1, '#9a9aa8');
}

function compass(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const r = 20;
  ctx.fillStyle = 'rgba(240,230,200,.18)';
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.fill();
  for (let a = 0; a < 8; a++) {
    const ang = (a * Math.PI) / 4 - Math.PI / 2;
    const len = a % 2 ? r * 0.55 : r;
    for (let i = 0; i < len; i++) {
      const w = Math.max(0, Math.round((1 - i / len) * (a % 2 ? 2 : 3)));
      for (let k = -w; k <= w; k++) {
        const x = cx + Math.cos(ang) * i - Math.sin(ang) * k;
        const y = cy + Math.sin(ang) * i + Math.cos(ang) * k;
        px(ctx, x, y, 1, 1, k < 0 ? '#e8d8a8' : a === 0 ? '#c83a3a' : '#a8884a');
      }
    }
  }
  px(ctx, cx - 1, cy - 1, 3, 3, '#f4e8c0');
  px(ctx, cx - 1, cy - r - 8, 3, 5, '#e8d8a8');
}

// ---------- geração ----------
export function world(): World {
  if (cache) return cache;
  const grid: Cell[] = new Array(WW * WH);
  for (let y = 0; y < WH; y++)
    for (let x = 0; x < WW; x++) {
      let cell: Cell = 'mar';
      if (isIsland(x, y)) cell = 'veridian';
      else if (isLand(x, y)) {
        const north = y < ridgeY(x);
        // distorção de domínio: fronteiras sinuosas como rios e serras
        const wx = x + (fbm(x / 34, y / 34, 41) - 0.5) * 90 + (valueNoise(x / 8, y / 8, 43) - 0.5) * 8;
        const wy = y + (fbm(x / 34, y / 34, 42) - 0.5) * 70 + (valueNoise(x / 8, y / 8, 44) - 0.5) * 8;
        let best = Infinity;
        for (const id of IDS) {
          const [sx, sy] = SEEDS[id];
          const wrongSide = NORTH.includes(id) !== north ? 70 : 0;
          const d = Math.hypot(wx - sx, (wy - sy) * 1.15) + wrongSide;
          if (d < best) { best = d; cell = id; }
        }
      }
      grid[idx(x, y)] = cell;
    }
  // garante terra em volta de cada castelo
  for (const id of IDS) {
    const [sx, sy] = SEEDS[id];
    for (let y = -7; y <= 7; y++) for (let x = -9; x <= 9; x++) if (x * x / 81 + y * y / 49 <= 1) grid[idx(sx + x, sy + y)] = id;
  }
  const rivers = RIVERS.map((r, i) => traceRiver(r, i + 1));
  const riverSet = new Set<number>();
  for (const r of rivers) for (const [x, y] of r) if (x >= 0 && y >= 0 && x < WW && y < WH && grid[idx(x, y)] !== 'mar') { riverSet.add(idx(x, y)); riverSet.add(idx(Math.min(WW - 1, x + 1), y)); }

  // profundidade do mar (BFS a partir da costa)
  const depth = new Uint8Array(WW * WH);
  const q: number[] = [];
  for (let i = 0; i < grid.length; i++) if (grid[i] !== 'mar') { depth[i] = 0; } else depth[i] = 255;
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
    const i = idx(x, y);
    if (grid[i] !== 'mar') continue;
    if ((x > 0 && grid[i - 1] !== 'mar') || (x < WW - 1 && grid[i + 1] !== 'mar') || (y > 0 && grid[i - WW] !== 'mar') || (y < WH - 1 && grid[i + WW] !== 'mar')) { depth[i] = 1; q.push(i); }
  }
  for (let h = 0; h < q.length; h++) {
    const i = q[h];
    if (depth[i] >= 14) continue;
    const x = i % WW, y = (i / WW) | 0;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= WW || ny >= WH) continue;
      const j = idx(nx, ny);
      if (depth[j] === 255) { depth[j] = depth[i] + 1; q.push(j); }
    }
  }

  const { c, ctx } = makeCanvas(WW, WH);
  const BIOME: Record<Cell, [string, string]> = {
    hjalmgard: ['#d8e2ea', '#c4d0dc'], fiorde: ['#dce6ee', '#c8d4e0'], passo: ['#b8bcc4', '#a4a8b2'],
    vale: ['#9aa84a', '#8a9a3e'], montanhas: ['#9a927e', '#8a826e'], bosques: ['#4e8a3a', '#447e32'],
    castelmar: ['#8ab84a', '#7eac42'], costa: ['#9cc458', '#8eb84c'], veridian: ['#6ac86a', '#5aba5c'], mar: ['#2a6aa8', '#2a6aa8'],
  };
  for (let y = 0; y < WH; y++)
    for (let x = 0; x < WW; x++) {
      const i = idx(x, y);
      const cell = grid[i];
      let col: string;
      if (cell === 'mar') {
        const d = depth[i];
        col = d <= 1 ? '#8ad0e4' : d <= 3 ? '#5eaed8' : d <= 6 ? '#3e8ec8' : d <= 10 ? '#2e72b0' : '#245e9a';
        if (d > 2 && valueNoise(x / 5, y / 3, 12) > 0.78) col = shade(col, 0.1);
      } else {
        const n = fbm(x / 7, y / 7, 5);
        const [a, b] = BIOME[cell];
        col = n > 0.52 ? a : b;
        if ((x + y) % 2 === 0 && Math.abs(n - 0.52) < 0.03) col = mix(a, b, 0.5);
        const coast = depth[idx(Math.min(WW - 1, x + 1), y)] === 1 || depth[idx(Math.max(0, x - 1), y)] === 1 || depth[idx(x, Math.min(WH - 1, y + 1))] === 1 || depth[idx(x, Math.max(0, y - 1))] === 1;
        if (coast) col = NORTH.includes(cell as ProvinceId) ? '#f4f8fc' : cell === 'montanhas' ? '#7a7466' : '#e8d8a0';
        if (riverSet.has(i)) col = (x + y) % 3 ? '#4a9ad0' : '#6ab4e0';
      }
      px(ctx, x, y, 1, 1, col);
    }
  // falésia/sombra nas costas sul (dá volume de diorama)
  for (let y = 1; y < WH; y++) for (let x = 0; x < WW; x++) if (grid[idx(x, y)] === 'mar' && grid[idx(x, y - 1)] !== 'mar') { px(ctx, x, y, 1, 1, '#4a3a2a'); if (y + 1 < WH && grid[idx(x, y + 1)] === 'mar') px(ctx, x, y + 1, 1, 1, 'rgba(20,30,50,.5)'); }

  // estradas entre castelos vizinhos
  const roads = new Map<string, [number, number][]>();
  for (const a of IDS)
    for (const b of ADJ[a]) {
      if (a > b) continue;
      const [x0, y0] = SEEDS[a], [x1, y1] = SEEDS[b];
      const mx = (x0 + x1) / 2 + (hash2(x0, y1) - 0.5) * 30, my = (y0 + y1) / 2 + (hash2(y0, x1) - 0.5) * 20;
      const pts: [number, number][] = [];
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        const x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * mx + t * t * x1;
        const y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * my + t * t * y1;
        pts.push([Math.round(x), Math.round(y)]);
      }
      roads.set(`${a}|${b}`, pts);
      pts.forEach(([x, y], k) => { if (k % 4 < 2 && grid[idx(x, y)] !== 'mar') px(ctx, x, y, 1, 1, NORTH.includes(a) && NORTH.includes(b) ? '#8a7a6a' : '#a07a44'); });
    }

  // decoração por bioma (ordenada por y para sobrepor direito)
  const decor: [number, () => void][] = [];
  const near = (x: number, y: number, r: number) => IDS.some((id) => Math.abs(SEEDS[id][0] - x) < r && Math.abs(SEEDS[id][1] - y) < r * 0.7);
  for (let gy = 4; gy < WH - 4; gy += 5)
    for (let gx = 4; gx < WW - 4; gx += 6) {
      const x = gx + Math.floor(hash2(gx, gy, 1) * 5), y = gy + Math.floor(hash2(gx, gy, 2) * 4);
      const i = idx(x, y);
      const cell = grid[i];
      if (cell === 'mar' || riverSet.has(i) || depth[idx(x, y + 2)] === 1 || near(x, y, 14)) continue;
      const r = hash2(x, y, 3);
      const ridge = Math.abs(y - ridgeY(x)) < 12;
      if (ridge || cell === 'passo' || (cell === 'montanhas' && r > 0.25)) {
        decor.push([y, () => mountain(ctx, x, y, 6 + Math.floor(r * 7), ridge || cell === 'passo' || r > 0.7, cell === 'montanhas' ? '#8a7e6a' : '#8a8a94')]);
        if (cell === 'montanhas' && r < 0.32) decor.push([y + 1, () => mine(ctx, x + 6, y + 2)]);
      } else if (cell === 'hjalmgard' || cell === 'fiorde') {
        if (r > 0.45) decor.push([y, () => pine(ctx, x, y, true)]);
      } else if (cell === 'bosques') {
        if (r > 0.12) decor.push([y, () => tree(ctx, x, y, r > 0.6)]);
        if (r > 0.5) decor.push([y + 2, () => tree(ctx, x + 3, y + 2, true)]);
      } else if (cell === 'veridian') {
        if (r > 0.4) decor.push([y, () => palm(ctx, x, y)]);
      } else if (cell === 'costa') {
        if (r > 0.55) decor.push([y, () => vineyard(ctx, x - 4, y)]);
        else if (r > 0.4) decor.push([y, () => tree(ctx, x, y)]);
      } else if (cell === 'castelmar' || cell === 'vale') {
        if (r > 0.6) decor.push([y, () => field(ctx, x - 4, y, 1)]);
        else if (r > 0.45) decor.push([y, () => tree(ctx, x, y)]);
        else if (cell === 'vale' && r > 0.38) decor.push([y, () => field(ctx, x - 4, y, 2)]);
      }
    }
  // vilas em volta dos castelos
  for (const id of [...IDS, 'veridian' as const]) {
    const [sx, sy] = id === 'veridian' ? ISLAND : SEEDS[id];
    for (let k = 0; k < (id === 'castelmar' ? 12 : 6); k++) {
      const a = hash2(k, sx) * Math.PI * 2, rr = 10 + hash2(sy, k) * 12;
      const hx = Math.round(sx + Math.cos(a) * rr), hy = Math.round(sy + Math.sin(a) * rr * 0.6) + 4;
      if (grid[idx(hx, hy)] !== 'mar') decor.push([hy, () => house(ctx, hx, hy, NORTH.includes(id as ProvinceId))]);
    }
  }
  decor.sort((a, b) => a[0] - b[0]).forEach(([, f]) => f());
  for (const [id, p] of Object.entries(PORTS)) if (p && id !== 'veridian') port(ctx, p[0], p[1]);
  for (const id of IDS) castle(ctx, SEEDS[id][0], SEEDS[id][1] + 4, id === 'castelmar' || id === 'hjalmgard', NORTH.includes(id));
  castle(ctx, ISLAND[0], ISLAND[1] + 4, false);
  for (const [ix, iy, r] of ISLETS) if (grid[idx(ix, iy)] === 'mar') {
    for (let y = -r; y <= r; y++) for (let x = -r * 1.6; x <= r * 1.6; x++) if ((x * x) / (r * r * 2.6) + (y * y) / (r * r) < 1) px(ctx, ix + x, iy + y, 1, 1, y > r * 0.4 ? '#c8b880' : '#e8d8a0');
    px(ctx, ix - r, iy + r, r * 3, 1, '#4a3a2a');
    tree(ctx, ix, iy - 2, false);
  }
  compass(ctx, 566, 58);

  // contornos por região e fronteiras
  const outline: Record<string, number[]> = {};
  const borders: number[] = [];
  for (let y = 0; y < WH; y++)
    for (let x = 0; x < WW; x++) {
      const i = idx(x, y);
      const cell = grid[i];
      if (cell === 'mar') continue;
      const nb = [x < WW - 1 ? grid[i + 1] : 'mar', x > 0 ? grid[i - 1] : 'mar', y < WH - 1 ? grid[i + WW] : 'mar', y > 0 ? grid[i - WW] : 'mar'];
      if (nb.some((n) => n !== cell)) (outline[cell] ??= []).push(i);
      if (nb.some((n) => n !== cell && n !== 'mar')) borders.push(i);
    }
  const glints: number[] = [];
  for (let k = 0; k < 2600; k++) {
    const i = Math.floor(hash2(k, 77) * WW * WH);
    if (grid[i] === 'mar' && depth[i] > 2) glints.push(i);
  }
  cache = { grid, depth, terrain: c, outline, borders, glints, roads };
  return cache;
}

export function cellAt(x: number, y: number): Cell {
  if (x < 0 || y < 0 || x >= WW || y >= WH) return 'mar';
  return world().grid[idx(Math.floor(x), Math.floor(y))];
}

export function road(a: ProvinceId, b: ProvinceId): [number, number][] | null {
  const w = world();
  const r = w.roads.get(`${a}|${b}`);
  if (r) return r;
  const back = w.roads.get(`${b}|${a}`);
  return back ? [...back].reverse() : null;
}

// Caminho de uma rota comercial: estradas entre castelos vizinhos, e mar até Véridian.
export function routePath(from: ProvinceId, to: ProvinceId | 'veridian'): [number, number][] {
  const target: ProvinceId = to === 'veridian' ? 'costa' : to;
  const prev = new Map<ProvinceId, ProvinceId | null>([[from, null]]);
  const queue: ProvinceId[] = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === target) break;
    for (const n of ADJ[cur]) if (!prev.has(n) && !NORTH.includes(n)) { prev.set(n, cur); queue.push(n); }
  }
  const chain: ProvinceId[] = [];
  for (let c: ProvinceId | null | undefined = target; c; c = prev.get(c)) chain.unshift(c);
  const pts: [number, number][] = [];
  for (let i = 0; i < chain.length - 1; i++) pts.push(...(road(chain[i], chain[i + 1]) ?? []));
  if (!pts.length) pts.push(SEEDS[from]);
  if (to === 'veridian') {
    const [px0, py0] = PORTS.costa!, [px1, py1] = PORTS.veridian!;
    const last = pts[pts.length - 1];
    const n = 40;
    for (let k = 0; k <= n; k++) pts.push([last[0] + ((px0 - last[0]) * k) / n, last[1] + ((py0 - last[1]) * k) / n]);
    for (let k = 0; k <= n; k++) pts.push([px0 + ((px1 - px0) * k) / n, py0 + ((py1 - py0) * k) / n + Math.sin((k / n) * Math.PI) * 6]);
  }
  return pts;
}
