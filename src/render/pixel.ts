// Utilidades de pixel art: cores, ícones em matriz e contorno automático.

export function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number) {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

// amt > 0 clareia, amt < 0 escurece (−1..1)
export function shade(h: string, amt: number) {
  const [r, g, b] = hexToRgb(h);
  if (amt >= 0) return rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
  return rgbToHex(r * (1 + amt), g * (1 + amt), b * (1 + amt));
}

export function mix(a: string, b: string, t: number) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

export function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

export function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function ellipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string) {
  ctx.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}

// Contorno escuro de 1px ao redor de tudo que é opaco (dá o acabamento de sprite).
export function outline(ctx: CanvasRenderingContext2D, w: number, h: number, color = '#1a1020') {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const [r, g, b] = hexToRgb(color);
  const alpha = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[(y * w + x) * 4 + 3]);
  const marks: number[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (alpha(x, y) === 0 && (alpha(x + 1, y) > 0 || alpha(x - 1, y) > 0 || alpha(x, y + 1) > 0 || alpha(x, y - 1) > 0)) marks.push((y * w + x) * 4);
  for (const i of marks) {
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

export function hash2(x: number, y: number, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function valueNoise(x: number, y: number, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const s = (t: number) => t * t * (3 - 2 * t);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed), c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * s(xf) + (c - a) * s(yf) + (a - b - c + d) * s(xf) * s(yf);
}

export function fbm(x: number, y: number, seed = 0) {
  return valueNoise(x, y, seed) * 0.6 + valueNoise(x * 2, y * 2, seed + 1) * 0.3 + valueNoise(x * 4, y * 4, seed + 2) * 0.1;
}

// ---------- Ícones em matriz (cada caractere é uma cor da paleta) ----------
const P: Record<string, string> = {
  Y: '#f2c14e', y: '#fbe39a', d: '#a8781a', D: '#6a4a10',
  W: '#ffffff', w: '#d8d8e0', g: '#9a9aa8', G: '#5a5a68',
  R: '#d23c3c', r: '#8a1c1c', B: '#4a7ae0', b: '#23346e',
  E: '#4caf6a', e: '#1f6a44', P: '#9a5ad0', p: '#5a2a7a',
  S: '#f3c9a8', s: '#c8906a', N: '#8a5a3a', n: '#5a3a1a', K: '#1a1020', C: '#6ac8e8',
};

const ICONS: Record<string, string[]> = {
  coroa: ['...........', 'Y....Y....Y', 'YY..YyY..YY', 'YYY.YYY.YYY', 'YyYYYYYYYyY', 'YRYYYBYYYRY', 'YYYYYYYYYYY', 'ddddddddddd'],
  moedas: ['....YYYY...', '...YyyyYY..', '...YYYYYY..', '...dYYYYd..', 'YYYYddddd..', 'YyyyYY.....', 'YYYYYY.....', 'dYYYYd.YYYY', '.dddd.YyyYY', '......YYYYY', '......ddddd'],
  flor: ['.....Y.....', '....YyY....', '.Y..YYY..Y.', 'YyY.YYY.YyY', '.YYYYYYYYY.', '..YYYYYYY..', '...ddddd...', '....YYY....', '...Y.Y.Y...', '..Y..Y..Y..'],
  povo: ['..nn...nn..', '.nSSn.nSSn.', '.nSSn.nSSn.', '..SS...SS..', '.NNNN.NNNN.', 'NNNNNNNNNNN', 'NNNNNNNNNNN', 'NNN.NNN.NNN'],
  espadas: ['w.........w', 'ww.......ww', '.ww.....ww.', '..ww...ww..', '...ww.ww...', '....www....', '...ww.ww...', '..Yd...dY..', '.Yd.....dY.', 'd.........d'],
  escudo: ['bbbbbbbbbbb', 'bBBBBYBBBBb', 'bBBBYYYBBBb', 'bBBBBYBBBBb', 'bBBBBYBBBBb', '.bBBBBBBBb.', '..bBBBBBb..', '...bBBBb...', '....bbb....'],
  livro: ['.rrrrrrrrr.', 'rRRRRRRRRRw', 'rRRYYYYRRRw', 'rRRRRRRRRRw', 'rRRRRRRRRRw', 'rRRRRRRRRRw', 'rRRRRRRRRRw', 'rrrrrrrrrrw', '.wwwwwwwwww'],
  pergaminho: ['.dyyyyyyyd.', 'dyyyyyyyyyd', '.yNNNNNNNy.', '.yyyyyyyyy.', '.yNNNNNyyy.', '.yyyyyyyyy.', '.yNNNNNNyy.', 'dyyyyyyyyyd', '.dyyyyyyyd.'],
  aperto: ['...........', 'SS.......SS', 'SSS.SSS.SSS', '.SSSSSSSSS.', '..sSSSSSSs.', '...sSSSSs..', '....ssss...'],
  balao: ['.wwwwwwwww.', 'wWWWWWWWWWw', 'wWKWWKWWKWw', 'wWWWWWWWWWw', '.wwwwwwwww.', '..ww.......', '.w.........'],
  mascara: ['...........', 'PPPPP.PPPPP', 'PpKKPPPKKpP', 'PPKKPPPKKPP', '.PPPPPPPPP.', '..PP...PP..'],
  olho: ['...wwwww...', '.wwWWWWWww.', 'wWWBBBBBWWw', 'wWBBKKKBBWw', 'wWWBBBBBWWw', '.wwWWWWWww.', '...wwwww...'],
  coracao: ['.RR...RR.', 'RWRR.RRRR', 'RRRRRRRRR', 'RRRRRRRRR', '.RRRRRRR.', '..RRRRR..', '...RRR...', '....R....'],
  ampulheta: ['ddddddddd', '.WyyyyyW.', '..WyyyW..', '...WyW...', '....Y....', '...W.W...', '..WyyyW..', '.WyyyyyW.', 'ddddddddd'],
  selo: ['..rrrrr..', '.rRRRRRr.', 'rRRYRYRRr', 'rRRRYRRRr', 'rRRYRYRRr', '.rRRRRRr.', '..rrrrr..', '.r.....r.'],
  trigo: ['....Y....', '...YdY...', '..Y.Y.Y..', '...YdY...', '..Y.Y.Y..', '...YdY...', '....d....', '....d....', '....d....'],
  madeira: ['...........', '.NNNNNNNNy.', 'NnnnnnnnnyD', '.NNNNNNNNy.', 'NNNNNNNNNy.', 'NnnnnnnnnyD', '.NNNNNNNNy.'],
  ferro: ['...........', '....wwwww..', '...wWWWWg..', '..wWWWWgg..', '.gggggggG..', '.GGGGGGGG..'],
  peixe: ['...........', '...BBBB..B.', '.BBCCCCBBB.', 'BKBCCCCCBB.', '.BBCCCCBBB.', '...BBBB..B.'],
  uva: ['....e.e....', '.....e.....', '...PPPP....', '..PpPPpP...', '...PPPPP...', '....PpP....', '.....P.....'],
  prata: ['...........', '...WWWWW...', '..WwwwwwW..', '.WwwwwwwgW.', '.gggggggggg', '.GGGGGGGGG.'],
  martelo: ['.gggg......', 'gGGGGg.....', 'gGGGGg.....', '.ggNN......', '....NN.....', '.....NN....', '......NN...', '.......NN..'],
  arvore: ['...eEEe....', '..eEEEEe...', '.eEEEEEEe..', 'eEEeEEEEEe.', '.eEEEEEEe..', '..eEEEEe...', '....NN.....', '....NN.....', '...nNNn....'],
  montanha: ['.....W.....', '....WWg....', '...wWggg...', '..gggGggg..', '.gGgggGGgg.', 'gGGgggggGGg'],
  leao: ['..YYYY.....', '.YYYYYY....', 'YYKYYYYY...', 'YYYYYYYYY..', '.YYdYYYYYY.', '..YYYYYYYY.', '..YY.YY.YY.', '..Y..Y..Y..'],
  lobo: ['.w......w..', '.ww....ww..', '.wwwwwwww..', 'wwKwwwwKww.', 'wwwwwwwwww.', '.wwwGGwww..', '..wwwwww...', '...wwww....'],
  serpente: ['...YYYY....', '..YK..YY...', '......YY...', '....YYY....', '..YYY......', '.YY........', '.YY....YY..', '..YYYYYY...'],
  cadeado: ['...ggg...', '..g...g..', '..g...g..', '.YYYYYYY.', '.YYYKYYY.', '.YYYKYYY.', '.YYYYYYY.', '.ddddddd.'],
  estrela: ['....Y....', '....Y....', '..YYYYY..', 'YYYYYYYYY', '..YYYYY..', '.YY...YY.', 'Y.......Y'],
  castelo: ['w.w...w.w', 'www...www', 'www.w.www', 'wwwwwwwww', 'wwwwKwwww', 'wwwKKKwww', 'gggKKKggg'],
  seta: ['....Y....', '....YY...', '.YYYYYY..', '.YYYYYYY.', '.YYYYYY..', '....YY...', '....Y....'],
  engrenagem: ['....g....', '.g.gwg.g.', '..gwwwg..', 'ggwwKwwgg', '..gwwwg..', '.g.gwg.g.', '....g....'],
  sol: ['....Y....', '.Y..Y..Y.', '..YYYYY..', 'YYYyyyYYY', '..YYYYY..', '.Y..Y..Y.', '....Y....'],
};

const iconCache = new Map<string, string>();

export function iconUrl(name: string, tint?: string): string {
  const key = `${name}|${tint ?? ''}`;
  const hit = iconCache.get(key);
  if (hit) return hit;
  const rows = ICONS[name] ?? ICONS.estrela;
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const pad = 1;
  const { c, ctx } = makeCanvas(w + pad * 2, h + pad * 2);
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      let col = P[ch] ?? '#ff00ff';
      if (tint && (ch === 'Y' || ch === 'y' || ch === 'd')) col = ch === 'Y' ? tint : ch === 'y' ? shade(tint, 0.4) : shade(tint, -0.35);
      px(ctx, x + pad, y + pad, 1, 1, col);
    }),
  );
  outline(ctx, c.width, c.height, '#1a1020');
  const url = c.toDataURL();
  iconCache.set(key, url);
  return url;
}

export function iconImg(name: string, cls = 'ico', tint?: string) {
  return `<img class="pix ${cls}" src="${iconUrl(name, tint)}" alt="">`;
}

// Desenha um ícone diretamente num canvas (para estandartes nos cenários).
export function drawIcon(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, color: string, scale = 1) {
  const rows = ICONS[name] ?? ICONS.estrela;
  rows.forEach((row, yy) =>
    [...row].forEach((ch, xx) => {
      if (ch === '.') return;
      const c = ch === 'K' ? shade(color, -0.6) : 'wWgG'.includes(ch) && name !== 'lobo' && name !== 'castelo' && name !== 'montanha' ? shade(color, 0.3) : ch === ch.toLowerCase() ? shade(color, -0.25) : color;
      px(ctx, x + xx * scale, y + yy * scale, scale, scale, c);
    }),
  );
}
