// Salão modular: o atlas fornece a arte; posições e camadas constroem o ambiente.
// Os recortes usam o tamanho nativo de 1254 px, preservando o alpha gerado.
export const HALL_W = 1280;
export const HALL_H = 720;
export const HALL_ATLAS = 'assets/cenarios/trono/atlas.png';

export const regions = {
  floor: [28, 22, 257, 260], wall: [342, 22, 255, 261],
  carpet: [662, 25, 244, 254], steps: [946, 86, 299, 188],
  throne: [52, 313, 213, 304], column: [404, 312, 136, 305],
  redBanner: [673, 315, 227, 304], blueBanner: [986, 315, 226, 304],
  window: [69, 630, 176, 296], candles: [378, 622, 183, 305],
  armor: [717, 626, 130, 300], statue: [1025, 627, 139, 300],
  plant: [65, 963, 195, 250], brazier: [374, 943, 190, 274],
  door: [651, 936, 267, 282], medallion: [963, 953, 267, 253],
} as const;
export type HallAsset = keyof typeof regions;
export interface HallObject {
  id: string; asset: HallAsset; x: number; y: number; w: number; h: number;
  depth: number; solid: boolean;
  paint?: (c: CanvasRenderingContext2D, o: HallObject) => void; // móveis desenhados em código
}
export interface HallLight { x: number; y: number; radius: number }
export interface ThroneHall {
  canvas: HTMLCanvasElement;
  objects: HallObject[];
  lights: HallLight[];
  drawObject(ctx: CanvasRenderingContext2D, object: HallObject): void;
}

let loading: Promise<HTMLImageElement> | undefined;
export function loadHallAtlas(): Promise<HTMLImageElement> {
  return loading ??= new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => { loading = undefined; reject(new Error('Não foi possível carregar a arte do salão.')); };
    img.src = HALL_ATLAS;
  });
}

export function createThroneHall(atlas: HTMLImageElement): ThroneHall {
  const canvas = document.createElement('canvas');
  canvas.width = HALL_W; canvas.height = HALL_H;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const objects: HallObject[] = [];
  const lights: HallLight[] = [];

  function sprite(c: CanvasRenderingContext2D, asset: HallAsset, x: number, y: number, w: number, h: number) {
    const [sx, sy, sw, sh] = regions[asset];
    c.drawImage(atlas, sx, sy, sw, sh, Math.round(x), Math.round(y), w, h);
  }
  function tile(asset: HallAsset, x: number, y: number, w: number, h: number, tw: number, th = tw) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    for (let yy = y; yy < y + h; yy += th)
      for (let xx = x; xx < x + w; xx += tw) sprite(ctx, asset, xx, yy, tw, th);
    ctx.restore();
  }
  function rect(x: number, y: number, w: number, h: number, color: string) {
    ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
  }
  function trim(x: number, y: number, w: number) {
    rect(x, y, w, 5, '#b0a491'); rect(x, y + 5, w, 3, '#716f69');
    rect(x, y + 8, w, 4, '#36383b');
  }
  function object(asset: HallAsset, x: number, foot: number, w: number, h: number, solid = true) {
    objects.push({ id: `${asset}-${objects.length}`, asset, x: x - w / 2, y: foot - h, w, h, depth: foot, solid });
  }
  function candle(x: number, foot: number, h = 88) {
    object('candles', x, foot, h * .60, h);
    lights.push({ x, y: foot - h * .76, radius: h * .95 });
  }

  // A planta ocupa um retângulo real, com uma entrada central e duas naves laterais.
  rect(0, 0, HALL_W, HALL_H, '#171c25');
  tile('floor', 78, 140, 1124, 580, 132, 104);
  // Moldura de pedra embutida no chão.
  for (const x of [98, 1170]) {
    rect(x, 179, 12, 463, '#4b4a46'); rect(x + 3, 179, 3, 463, '#a99b81');
  }
  rect(108, 635, 1064, 10, '#514c44');
  rect(108, 637, 1064, 2, '#b2a18a');

  // Parede norte, rodapés, janelas e estandartes estão atrás dos objetos móveis.
  tile('wall', 62, 26, 1156, 162, 170, 142);
  trim(62, 25, 1156); trim(62, 180, 1156);
  rect(64, 38, 1152, 5, '#34353b');
  for (const x of [210, 1070]) {
    sprite(ctx, 'window', x - 34, 48, 68, 122);
    const beam = ctx.createLinearGradient(x, 167, x + 130, 420);
    beam.addColorStop(0, '#eddaac35'); beam.addColorStop(1, '#eddaac00');
    ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(x - 22, 173);
    ctx.lineTo(x + 22, 173); ctx.lineTo(x + 184, 440); ctx.lineTo(x + 42, 440); ctx.fill();
  }
  for (const x of [478, 802]) sprite(ctx, 'redBanner', x - 36, 43, 72, 111);
  for (const x of [320, 960]) sprite(ctx, 'blueBanner', x - 26, 56, 52, 86);
  // Contrafortes da parede norte.
  for (const x of [87, 381, 899, 1193]) object('column', x, 211, 66, 183);

  // Estrado elevado, degraus e tapete são camadas independentes.
  rect(433, 188, 414, 111, '#20202790');
  tile('floor', 449, 174, 382, 96, 128, 85);
  trim(449, 264, 382);
  sprite(ctx, 'steps', 443, 269, 394, 64);
  tile('carpet', 550, 181, 180, 550, 180, 160);
  // Faixas no tapete acompanham os espelhos dos degraus.
  for (const y of [275, 292, 311]) {
    rect(550, y, 180, 7, '#37141d7a'); rect(550, y, 180, 1, '#edc17b7a');
  }
  sprite(ctx, 'medallion', 550, 383, 180, 166);
  object('throne', 640, 243, 106, 152);
  for (const x of [508, 772]) candle(x, 249, 105);
  for (const x of [414, 866]) object('armor', x, 269, 46, 105);
  for (const x of [341, 939]) object('plant', x, 302, 55, 67);

  // Colunatas, nichos e mobiliário: cada peça mantém sua própria profundidade.
  for (const x of [274, 1006]) {
    for (const foot of [393, 570]) object('column', x, foot, 63, 145);
    object('blueBanner', x, 351, 39, 61, false);
    objects[objects.length - 1].depth = 394;
    object('blueBanner', x, 528, 39, 61, false);
    objects[objects.length - 1].depth = 571;
  }
  for (const x of [154, 1126]) {
    object('statue', x, 354, 48, 109);
    object('plant', x, 449, 53, 63);
    candle(x, 534, 81);
  }
  for (const x of [430, 850]) {
    candle(x, 410, 92);
    object('plant', x, 582, 62, 75);
  }
  for (const x of [368, 912]) object('armor', x, 526, 46, 101);

  // Paredes laterais em corte, com a espessura de pedra visível.
  for (const x of [62, 1182]) {
    tile('wall', x, 190, 36, 439, 80, 120);
    rect(x, 190, 6, 439, '#b1a693'); rect(x + 30, 190, 6, 439, '#252e3b');
  }
  // Paredes baixas no primeiro plano, recortadas ao redor da entrada.
  for (const [x, w] of [[62, 414], [804, 414]]) {
    objects.push({ id: `front-wall-${x}`, asset: 'wall', x, y: 621, w, h: 99, depth: 630, solid: true });
  }
  for (const x of [475, 805]) {
    object('column', x, 671, 75, 140);
    object('statue', x, 595, 42, 97);
    objects[objects.length - 1].depth = 672;
  }
  for (const x of [349, 931]) object('blueBanner', x, 705, 52, 73, false);
  for (const x of [82, 1198]) object('column', x, 714, 79, 156);
  candle(533, 667, 91); candle(747, 667, 91);

  // Sombra nas junções do piso, sem incorporar os objetos ao fundo.
  const shade = ctx.createLinearGradient(0, 185, 0, 231);
  shade.addColorStop(0, '#11162265'); shade.addColorStop(1, '#11162200');
  ctx.fillStyle = shade; ctx.fillRect(98, 192, 1084, 42);
  objects.sort((a, b) => a.depth - b.depth);
  return { canvas, objects, lights, drawObject(c, o) {
    if (o.paint) { o.paint(c, o); return; }
    if (o.id.startsWith('front-wall-')) {
      c.save(); c.beginPath(); c.rect(o.x, o.y, o.w, o.h); c.clip();
      for (let x = o.x; x < o.x + o.w; x += 165) sprite(c, 'wall', x, o.y + 12, 165, 138);
      for (const [dy, h, color] of [[0, 6, '#343d49'], [6, 5, '#b0a491'], [11, 3, '#716f69'], [14, 4, '#36383b'], [90, 9, '#111923']] as const) {
        c.fillStyle = color; c.fillRect(o.x, o.y + dy, o.w, h);
      }
      c.restore(); return;
    }
    if (o.solid) {
      c.fillStyle = '#10132135'; c.beginPath();
      c.ellipse(o.x + o.w * .55, o.y + o.h - 3, o.w * .44, Math.min(9, o.w * .12), 0, 0, Math.PI * 2); c.fill();
    }
    sprite(c, o.asset, o.x, o.y, o.w, o.h);
  } };
}

export function drawHallLights(ctx: CanvasRenderingContext2D, lights: HallLight[], time: number, night: number) {
  for (const [i, light] of lights.entries()) {
    const flicker = 1 + Math.sin(time / 211 + i * 2.7) * .035 + Math.sin(time / 97 + i) * .018;
    const radius = light.radius * flicker;
    const glow = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, radius);
    glow.addColorStop(0, `rgba(255,195,100,${.20 + night * .12})`);
    glow.addColorStop(.35, 'rgba(247,163,63,.09)'); glow.addColorStop(1, 'rgba(244,137,35,0)');
    ctx.fillStyle = glow; ctx.fillRect(light.x - radius, light.y - radius, radius * 2, radius * 2);
  }
}
