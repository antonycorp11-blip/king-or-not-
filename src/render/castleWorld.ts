import type { RoomId } from '../types';
import { DOORS, ROOMS, ROOM_IDS, WORLD_H, WORLD_W, walkRects } from '../data/castle';
import { ROOM_LAYOUTS, type Place } from '../data/roomLayouts';
import { loadHallAtlas, regions, type HallAsset } from './throneHall';

// O castelo inteiro num mapa só. O que não se mexe (pisos, paredes, tapetes,
// sombras) é desenhado sob demanda em blocos de 512px e reaproveitado; a cada
// quadro só os móveis, as pessoas e as luzes são desenhados de novo. Nada de
// imagem gigante: só os blocos que a câmera vê (e alguns recentes) ficam na memória.

interface PropManifest {
  sheets: Record<string, string>;
  props: Record<string, [string, number, number, number, number]>;
  textures: Record<string, string>;
}

export interface WorldObject {
  x: number; y: number; w: number; h: number; depth: number;
  solid: boolean; hit: [number, number, number, number];
  draw: (c: CanvasRenderingContext2D) => void;
  shadow: (c: CanvasRenderingContext2D) => void; // fica no chão: vai para o cache do fundo
}
export interface Hotspot { id: string; room: RoomId; rect: [number, number, number, number]; stand: [number, number]; acts: string[] }
export interface WorldLight { x: number; y: number; r: number }
export interface Camera { x: number; y: number; zoom: number; vw: number; vh: number }

const BASE = 'assets/cenarios/props/';
const WALL_TOP = '#232a3a', WALL_EDGE = '#56627e', WALL_DARK = '#10141d', OUTER = '#3d4350';

function img(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error(src));
    i.src = src;
  });
}

export class CastleWorld {
  objects: WorldObject[] = [];
  hotspots: Hotspot[] = [];
  lights: WorldLight[] = [];
  private beams: { x: number; y: number; w: number; len: number }[] = []; // luz do dia pelas janelas
  private floorPlaces: { room: RoomId; draw: (c: CanvasRenderingContext2D) => void; rect: [number, number, number, number] }[] = [];
  private wallPlaces: { draw: (c: CanvasRenderingContext2D) => void; rect: [number, number, number, number] }[] = [];
  private patterns = new Map<string, CanvasPattern>();
  private m!: PropManifest;
  private sheets = new Map<string, HTMLImageElement>();
  private tex = new Map<string, HTMLImageElement>();
  private atlas!: HTMLImageElement;
  private ctxProbe = document.createElement('canvas').getContext('2d')!;
  grid!: Uint8Array; // 1 = dá para andar
  readonly cell = 24;
  cols = Math.ceil(WORLD_W / 24);
  rows = Math.ceil(WORLD_H / 24);

  static async load(): Promise<CastleWorld> {
    const w = new CastleWorld();
    const [m, atlas] = await Promise.all([fetch(BASE + 'props.json').then((r) => r.json() as Promise<PropManifest>), loadHallAtlas()]);
    w.m = m; w.atlas = atlas;
    await Promise.all([
      ...Object.entries(m.sheets).map(async ([id, f]) => w.sheets.set(id, await img(BASE + f))),
      ...Object.entries(m.textures).map(async ([id, f]) => w.tex.set(id, await img(BASE + f))),
    ]);
    w.build();
    return w;
  }

  // ---------- peças ----------
  private src(name: string): { im: CanvasImageSource; sx: number; sy: number; sw: number; sh: number } | null {
    if (name.startsWith('atlas:')) {
      const r = regions[name.slice(6) as HallAsset];
      return r ? { im: this.atlas, sx: r[0], sy: r[1], sw: r[2], sh: r[3] } : null;
    }
    const e = this.m.props[name];
    if (!e) return null;
    const im = this.sheets.get(e[0]);
    return im ? { im, sx: e[1], sy: e[2], sw: e[3], sh: e[4] } : null;
  }
  // usados pelo modo cinema (cenas laterais)
  hasProp(name: string) { return !!this.src(name); }
  propSize(name: string, w: number) { return this.size(name, w); }
  drawProp(c: CanvasRenderingContext2D, name: string, x: number, y: number, w: number, h: number, flip = false) { this.blit(c, name, x, y, w, h, flip); }
  patternOf(name: string, tile: number) { return this.pattern(name, tile); }
  private size(name: string, w: number): [number, number] { const s = this.src(name); return s ? [w, (w * s.sh) / s.sw] : [w, w]; }
  private blit(c: CanvasRenderingContext2D, name: string, x: number, y: number, w: number, h: number, flip = false) {
    const s = this.src(name);
    if (!s) return;
    if (flip) { c.save(); c.translate(x + w, y); c.scale(-1, 1); c.drawImage(s.im, s.sx, s.sy, s.sw, s.sh, 0, 0, w, h); c.restore(); }
    else c.drawImage(s.im, s.sx, s.sy, s.sw, s.sh, x, y, w, h);
  }
  private pattern(name: string, tile: number): CanvasPattern | null {
    const key = `${name}@${tile}`;
    let p = this.patterns.get(key);
    if (p) return p;
    const t = this.tex.get(name);
    if (!t) return null;
    const cv = document.createElement('canvas');
    cv.width = tile; cv.height = tile;
    const g = cv.getContext('2d')!;
    g.imageSmoothingQuality = 'high';
    g.drawImage(t, 0, 0, tile, tile);
    p = this.ctxProbe.createPattern(cv, 'repeat')!;
    this.patterns.set(key, p);
    return p;
  }

  private build() {
    for (const id of ROOM_IDS) {
      const L = ROOM_LAYOUTS[id];
      if (!L) continue;
      const [rx, ry] = ROOMS[id].rect;
      for (const p of L.places) this.place(id, rx, ry, p);
    }
    this.buildGrid();
  }

  private place(room: RoomId, rx: number, ry: number, p: Place) {
    const [w, h] = this.size(p.p, p.w);
    if (p.tile) {
      const [tw, th] = p.tile;
      const x0 = rx + p.x - tw / 2, y0 = ry + p.y - th / 2;
      this.floorPlaces.push({ room, rect: [x0, y0, tw, th], draw: (c) => { for (let x = x0; x < x0 + tw; x += w - 2) this.blit(c, p.p, x, y0, Math.min(w, x0 + tw - x + 1), th); } });
      return;
    }
    if (p.floor) {
      // o tapete do salão é um corredor inteiro: estica da escada até a porta
      const tall = p.p === 'atlas:carpet';
      const x = rx + p.x - w / 2, y = tall ? ry + 260 : ry + p.y - h / 2, hh = tall ? ROOMS[room].rect[3] - 260 : h;
      this.floorPlaces.push({ room, rect: [x, y, w, hh], draw: (c) => { if (tall) { for (let yy = y; yy < y + hh; yy += w) this.blit(c, p.p, x, yy, w, Math.min(w, y + hh - yy)); } else this.blit(c, p.p, x, y, w, h, p.flip); } });
      if (p.hot) this.hotspots.push({ id: `${room}-${p.p}`, room, rect: [x, y, w, h], stand: [rx + p.x, ry + p.y + h / 2 + 20], acts: p.hot });
      return;
    }
    if (p.wall) {
      const x = rx + p.x - w / 2, y = ry + p.y;
      this.wallPlaces.push({ rect: [x, y, w, h], draw: (c) => this.blit(c, p.p, x, y, w, h, p.flip) });
      if (/janela|vitral|window/.test(p.p)) this.beams.push({ x: rx + p.x, y: ry + ROOMS[room].face, w: w * 1.1, len: Math.min(420, ROOMS[room].rect[3] * 0.55) });
      if (p.light) this.lights.push({ x: rx + p.x, y: y + h * 0.35, r: p.light });
      return;
    }
    const x = rx + p.x - w / 2, foot = ry + p.y, y = foot - h;
    const base = Math.min(h, h * (p.base ?? 0.45));
    this.objects.push({ x, y, w, h, depth: foot, solid: p.solid !== false, hit: [x + 6, foot - base, w - 12, base],
      shadow: (c) => {
        // sombra projetada: o sol (ou a vela) vem do alto à esquerda
        const sw = w * 0.5, sh = Math.max(6, Math.min(16, h * 0.1));
        c.fillStyle = 'rgba(10,8,20,.16)'; c.beginPath(); c.ellipse(x + w / 2 + w * 0.1, foot - 2, sw * 1.12, sh * 1.3, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(10,8,20,.24)'; c.beginPath(); c.ellipse(x + w / 2 + w * 0.05, foot - 3, sw * 0.9, sh, 0, 0, Math.PI * 2); c.fill();
      },
      draw: (c) => this.blit(c, p.p, x, y, w, h, p.flip) });
    if (p.light) this.lights.push({ x: rx + p.x, y: foot - h * 0.78, r: p.light });
    if (p.hot) this.hotspots.push({ id: `${room}-${p.p}-${this.hotspots.length}`, room, rect: [x, y, w, h], stand: [rx + p.x, foot + 30], acts: p.hot });
  }

  // Grade de caminhada: chão dos cômodos e portas, menos a base dos móveis
  private buildGrid() {
    const { cell, cols, rows } = this;
    const g = new Uint8Array(cols * rows);
    for (const [x, y, w, h] of walkRects()) {
      for (let cy = Math.max(0, Math.floor(y / cell)); cy < Math.min(rows, Math.ceil((y + h) / cell)); cy++)
        for (let cx = Math.max(0, Math.floor(x / cell)); cx < Math.min(cols, Math.ceil((x + w) / cell)); cx++) {
          const px = cx * cell + cell / 2, py = cy * cell + cell / 2;
          if (px >= x && px <= x + w && py >= y && py <= y + h) g[cy * cols + cx] = 1;
        }
    }
    for (const o of this.objects) {
      if (!o.solid) continue;
      const [x, y, w, h] = o.hit;
      for (let cy = Math.floor((y - 8) / cell); cy <= Math.floor((y + h + 4) / cell); cy++)
        for (let cx = Math.floor((x - 10) / cell); cx <= Math.floor((x + w + 10) / cell); cx++)
          if (cx >= 0 && cy >= 0 && cx < cols && cy < rows) g[cy * cols + cx] = 0;
    }
    this.grid = g;
  }

  walkable(x: number, y: number) {
    const cx = Math.floor(x / this.cell), cy = Math.floor(y / this.cell);
    return cx >= 0 && cy >= 0 && cx < this.cols && cy < this.rows && this.grid[cy * this.cols + cx] === 1;
  }

  // ---------- cache do fundo ----------
  // Chão, paredes, tapetes e sombras dos móveis não mudam:
  // são desenhados uma vez em blocos, na resolução do zoom atual, e depois
  // cada quadro só cola os blocos visíveis, alinhados em pixels inteiros.
  private chunks = new Map<string, { cv: HTMLCanvasElement; used: number }>();
  private static CHUNK_PX = 512;
  private static MAX_CHUNKS = 30;
  drawBackgroundCached(c: CanvasRenderingContext2D, cam: Camera, night = 0) {
    const bakeGlow = night === 0; // de dia o brilho das velas é fixo e sutil: vai para o bloco
    // blocos na escala exata do zoom: cada quadro é só uma cópia 1:1 em
    // pixels inteiros (sem reamostrar), o jeito mais barato de desenhar
    const s = Math.round(cam.zoom * 1000) / 1000;
    const P = CastleWorld.CHUNK_PX;
    const W = P / s; // tamanho do bloco no mundo
    const x0 = Math.floor(cam.x / W), x1 = Math.floor((cam.x + cam.vw) / W);
    const y0 = Math.floor(cam.y / W), y1 = Math.floor((cam.y + cam.vh) / W);
    const now = performance.now();
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    const ox = Math.round(-cam.x * cam.zoom), oy = Math.round(-cam.y * cam.zoom);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const key = `${s}:${cx}:${cy}:${bakeGlow ? 'd' : 'n'}`;
      let ch = this.chunks.get(key);
      if (!ch) { ch = { cv: this.renderChunk(cx * P, cy * P, s, bakeGlow), used: now }; this.chunks.set(key, ch); this.trimChunks(); }
      ch.used = now;
      c.drawImage(ch.cv, ox + cx * P, oy + cy * P);
    }
    c.restore();
  }
  // um bloco: P×P pixels de tela a partir do pixel (px, py) do mundo já escalado
  private renderChunk(px: number, py: number, s: number, bakeGlow: boolean): HTMLCanvasElement {
    const P = CastleWorld.CHUNK_PX;
    const cv = document.createElement('canvas');
    cv.width = cv.height = P;
    const g = cv.getContext('2d', { alpha: false })!; // opaco: a cópia por quadro é mais barata
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.setTransform(s, 0, 0, s, -px, -py);
    const wx = px / s, wy = py / s, ws = P / s;
    const cam: Camera = { x: wx, y: wy, zoom: s, vw: ws, vh: ws };
    this.drawBackground(g, cam);
    for (const o of this.objects) if (o.x < wx + ws && o.x + o.w > wx && o.y < wy + ws + 20 && o.depth + 20 > wy) o.shadow(g);
    if (bakeGlow) this.drawGlows(g, cam, 0, 0);
    return cv;
  }
  private trimChunks() {
    if (this.chunks.size <= CastleWorld.MAX_CHUNKS) return;
    const old = [...this.chunks.entries()].sort((a, b) => a[1].used - b[1].used);
    for (const [k] of old.slice(0, this.chunks.size - CastleWorld.MAX_CHUNKS)) this.chunks.delete(k);
  }

  // ---------- desenho ----------
  drawBackground(c: CanvasRenderingContext2D, cam: Camera) {
    const vx0 = cam.x, vy0 = cam.y, vx1 = cam.x + cam.vw, vy1 = cam.y + cam.vh;
    const vis = (r: [number, number, number, number]) => r[0] < vx1 && r[0] + r[2] > vx0 && r[1] < vy1 && r[1] + r[3] > vy0;
    // fora do mundo: campo
    const grass = this.pattern('tex_grama', 150);
    c.fillStyle = grass ?? '#3a5a2a'; c.fillRect(vx0 - 10, vy0 - 10, cam.vw + 20, cam.vh + 20);
    // a massa do castelo (paredes vistas de cima) e os muros baixos de fora
    c.fillStyle = OUTER; c.fillRect(0, 2160, 3200, 840); c.fillRect(3200, 0, 1000, WORLD_H);
    c.fillStyle = WALL_TOP; c.fillRect(0, 0, 3200, 2160);
    for (const id of ROOM_IDS) {
      const R = ROOMS[id];
      if (!vis(R.rect)) continue;
      const L = ROOM_LAYOUTS[id];
      const [x, y, w, h] = R.rect;
      // borda clara da parede (volume, como na referência)
      c.fillStyle = WALL_EDGE; c.fillRect(x - 4, y - 4, w + 8, h + 8);
      c.fillStyle = WALL_DARK; c.fillRect(x - 1, y - 1, w + 2, h + 2);
      const pat = L ? this.pattern(L.floor, L.tile) : null;
      c.fillStyle = pat ?? '#6b5a44'; c.fillRect(x, y, w, h);
      for (const pt of L?.patches ?? []) { c.fillStyle = this.pattern(pt.tex, 128) ?? '#b8a47c'; c.fillRect(x + pt.x, y + pt.y, pt.w, pt.h); }
      if (R.face && L?.wall) this.face(c, id);
    }
    // vãos das portas
    for (const d of DOORS) {
      if (!vis(d.rect)) continue;
      const [x, y, w, h] = d.rect;
      const L = ROOM_LAYOUTS[d.b] ?? ROOM_LAYOUTS[d.a];
      c.fillStyle = (L && this.pattern(L.floor, L.tile)) ?? '#6b5a44';
      c.fillRect(x, y - 2, w, h + 4);
      c.fillStyle = '#00000030';
      if (h > w) { c.fillRect(x, y - 2, w, 6); c.fillRect(x, y + h - 4, w, 6); } else { c.fillRect(x - 2, y, 6, h); c.fillRect(x + w - 4, y, 6, h); }
    }
    // muralha sul, com o portão
    if (vy1 > 2090 && vy0 < 2230) {
      const [mw, mh] = this.size('muralha', 240);
      for (let x = 40; x < 3160; x += 236) if (x + mw < 1560 || x > 1760) this.blit(c, 'muralha', x, 2204 - mh, Math.min(mw, 3160 - x), mh);
      const [pw, ph] = this.size('portaria', 230);
      this.blit(c, 'portaria', 1660 - pw / 2, 2212 - ph, pw, ph);
    }
    for (const f of this.floorPlaces) if (vis(f.rect)) f.draw(c);
    for (const p of this.wallPlaces) if (vis(p.rect)) p.draw(c);
  }

  // parede do fundo, com um vão em arco onde houver porta para o norte
  private face(c: CanvasRenderingContext2D, id: RoomId) {
    const R = ROOMS[id];
    const [x, y, w] = R.rect;
    const t = this.tex.get('tex_parede');
    if (!t) return;
    const fh = R.face, fw = (t.width / t.height) * fh;
    c.save(); c.beginPath(); c.rect(x, y, w, fh); c.clip();
    for (let xx = x; xx < x + w; xx += fw) c.drawImage(t, xx, y, fw, fh);
    c.restore();
    // vãos das portas que saem pelo alto deste cômodo
    for (const d of DOORS) {
      const [dx, dy, dw, dh] = d.rect;
      if (dh > dw || Math.abs(dy + dh - y) > 2) continue;
      const L = ROOM_LAYOUTS[id]!;
      c.fillStyle = this.pattern(L.floor, L.tile)!;
      c.fillRect(dx, y, dw, fh);
      const g = c.createLinearGradient(0, y, 0, y + fh);
      g.addColorStop(0, '#0b0d14d0'); g.addColorStop(1, '#0b0d1400');
      c.fillStyle = g; c.fillRect(dx, y, dw, fh);
      c.fillStyle = '#8f8577'; c.fillRect(dx - 8, y, 8, fh); c.fillRect(dx + dw, y, 8, fh);
    }
    const sh = c.createLinearGradient(0, y + fh, 0, y + fh + 30);
    sh.addColorStop(0, '#0d101855'); sh.addColorStop(1, '#0d101800');
    c.fillStyle = sh; c.fillRect(x, y + fh, w, 30);
  }

  drawTints(c: CanvasRenderingContext2D, cam: Camera) {
    for (const id of ROOM_IDS) {
      const t = ROOM_LAYOUTS[id]?.tint;
      if (!t) continue;
      const [x, y, w, h] = ROOMS[id].rect;
      if (x > cam.x + cam.vw || x + w < cam.x || y > cam.y + cam.vh || y + h < cam.y) continue;
      c.fillStyle = t; c.fillRect(x, y, w, h);
    }
  }

  // Luz: de dia, fachos pelas janelas; à noite, o castelo escurece e velas e tochas acendem de verdade.
  // Fachos e brilhos são sprites prontos (o gradiente é desenhado uma vez só);
  // cada quadro só cola cada um na sua área, com a intensidade no globalAlpha.
  drawLights(c: CanvasRenderingContext2D, cam: Camera, time: number, night: number) {
    const day = Math.max(0, 1 - night * 1.4);
    c.save();
    if (day > 0) {
      c.globalCompositeOperation = 'screen';
      c.globalAlpha = day;
      for (const b of this.beams) {
        if (b.x + b.w * 2 < cam.x || b.x - b.w * 2 > cam.x + cam.vw || b.y > cam.y + cam.vh || b.y + b.len < cam.y) continue;
        const sp = this.beamSprite(b);
        c.drawImage(sp.cv, sp.x, sp.y, sp.w, sp.h);
      }
      c.globalAlpha = 1;
    }
    if (night > 0) {
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = `rgba(10,14,38,${night * 0.58})`;
      c.fillRect(cam.x - 10, cam.y - 10, cam.vw + 20, cam.vh + 20);
    }
    if (night > 0) this.drawGlows(c, cam, time, night); // de dia já estão nos blocos do chão
    c.restore();
  }

  private drawGlows(c: CanvasRenderingContext2D, cam: Camera, time: number, night: number) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.07 + night * 0.3;
    const glow = this.glow();
    for (const [i, L] of this.lights.entries()) {
      if (L.x < cam.x - L.r * 2 || L.x > cam.x + cam.vw + L.r * 2 || L.y < cam.y - L.r * 2 || L.y > cam.y + cam.vh + L.r * 2) continue;
      const f = night > 0 ? 1 + Math.sin(time / 211 + i * 2.7) * 0.04 : 1;
      const r = L.r * f * (1 + night * 0.7);
      c.drawImage(glow, L.x - r, L.y - r, r * 2, r * 2);
    }
    c.restore();
  }

  // o facho de uma janela, desenhado uma vez numa imagem pequena
  private beamSprites = new Map<object, { cv: HTMLCanvasElement; x: number; y: number; w: number; h: number }>();
  private beamSprite(b: { x: number; y: number; w: number; len: number }) {
    let sp = this.beamSprites.get(b);
    if (sp) return sp;
    const x0 = b.x - b.w * 0.9, x1 = b.x + b.w * 0.9 + b.len * 0.18;
    const w = x1 - x0, h = b.len;
    const k = 0.5; // gradiente suave: meia resolução basta
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(w * k); cv.height = Math.ceil(h * k);
    const g = cv.getContext('2d')!;
    g.setTransform(k, 0, 0, k, -x0 * k, -b.y * k);
    const gr = g.createLinearGradient(0, b.y, 0, b.y + b.len);
    gr.addColorStop(0, 'rgba(255,236,190,0.22)'); gr.addColorStop(1, 'rgba(255,236,190,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(b.x - b.w / 2, b.y); g.lineTo(b.x + b.w / 2, b.y);
    g.lineTo(b.x + b.w * 0.9 + b.len * 0.18, b.y + b.len); g.lineTo(b.x - b.w * 0.9 + b.len * 0.18, b.y + b.len);
    g.closePath(); g.fill();
    sp = { cv, x: x0, y: b.y, w, h };
    this.beamSprites.set(b, sp);
    return sp;
  }

  // o brilho de uma vela, desenhado uma vez (o gradiente é o mesmo de sempre;
  // a intensidade vem do globalAlpha)
  private glowCv: HTMLCanvasElement | null = null;
  private glow() {
    if (this.glowCv) return this.glowCv;
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const g = cv.getContext('2d')!;
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,190,110,1)');
    gr.addColorStop(0.45, 'rgba(240,150,60,0.35)'); gr.addColorStop(1, 'rgba(240,130,40,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    return (this.glowCv = cv);
  }

  hotspotAt(x: number, y: number): Hotspot | null {
    // o menor objeto sob o dedo ganha (uma estante dentro de uma sala, não a sala)
    const hits = this.hotspots.filter((h) => x >= h.rect[0] && x <= h.rect[0] + h.rect[2] && y >= h.rect[1] && y <= h.rect[1] + h.rect[3]);
    return hits.sort((a, b) => a.rect[2] * a.rect[3] - b.rect[2] * b.rect[3])[0] ?? null;
  }
}
