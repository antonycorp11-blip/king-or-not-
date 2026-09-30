import { getTopDownFrame, loadTopDownAssets } from './topdown';
import { GROUPS, GROUP_INFO, type Group, type Reaction } from '../data/speeches';
import type { CrowdMood } from '../engine/crowd';

// A PRAÇA DA COROA, EM CANVAS
// Até 500+ pessoas sem 500 personagens: cada figurante é só uma posição, um
// grupo, um "molde" de sprite e uma fase de animação. Os moldes (costas de
// cada personagem, já reduzidos, em três tons) são pré-renderizados uma vez;
// cada quadro é só drawImage de imagens pequenas. Nada de DOM por pessoa.

export const SQ_W = 960;
export const SQ_H = 600;
const CROWD_TOP = 272;
const BALCONY = { x: 480, y: 168 };

export const GROUP_SPRITES: Record<Group, string[]> = {
  povo: ['campones', 'camponesa', 'criada', 'jardineiro', 'cozinheiro', 'cozinheira', 'pajem', 'tobias', 'tomas', 'bruna', 'viuva', 'mensageiro', 'marta', 'lucas'],
  mercadores: ['kasim', 'salvio', 'escriba', 'gaspard', 'florian'],
  soldados: ['guarda', 'sentinela', 'cavaleiro'],
  religiosos: ['frei_aske', 'irma'],
  nobres: ['dama', 'dama_brisamar', 'dama_carvalhal', 'cedric', 'theodric', 'aveline', 'clara', 'bianca'],
};

// ---------- a multidão como dados (puro, testável) ----------
export interface Crowd {
  n: number;
  x: Float32Array; y: Float32Array; sc: Float32Array; ph: Float32Array;
  g: Uint8Array; spr: Uint8Array; sign: Int8Array; // sign: −1 nada, senão índice da faixa
  order: Uint32Array; // desenhados de trás para a frente
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// onde cada grupo fica: nobres na frente, mercadores à esquerda, religiosos à
// direita, soldados nos flancos, o povo enchendo o resto
const REGION: Record<Group, [number, number, number, number][]> = {
  nobres: [[330, CROWD_TOP + 8, 300, 56]],
  soldados: [[24, CROWD_TOP + 10, 96, 310], [840, CROWD_TOP + 10, 96, 310]],
  mercadores: [[130, CROWD_TOP + 60, 210, 170]],
  religiosos: [[650, CROWD_TOP + 60, 170, 120]],
  povo: [[130, CROWD_TOP + 70, 700, 250], [130, CROWD_TOP + 10, 190, 60], [640, CROWD_TOP + 10, 190, 60]],
};
export const SHARE: Record<Group, number> = { povo: 0.6, mercadores: 0.12, soldados: 0.1, religiosos: 0.08, nobres: 0.1 };

export function layoutCrowd(total: number, seed = 7, signs = 0): Crowd {
  const n = Math.max(0, Math.min(640, Math.round(total)));
  const R = rng(seed);
  const c: Crowd = { n, x: new Float32Array(n), y: new Float32Array(n), sc: new Float32Array(n), ph: new Float32Array(n), g: new Uint8Array(n), spr: new Uint8Array(n), sign: new Int8Array(n).fill(-1), order: new Uint32Array(n) };
  let i = 0;
  GROUPS.forEach((grp, gi) => {
    const count = gi === GROUPS.length - 1 ? n - i : Math.round(n * SHARE[grp]);
    const rects = REGION[grp];
    for (let k = 0; k < count && i < n; k++, i++) {
      const r = rects[k % rects.length];
      let x = r[0] + R() * r[2];
      let y = r[1] + R() * r[3];
      if (grp === 'soldados') { x = r[0] + ((k >> 1) % 3) * (r[2] / 3) + 14 + R() * 4; y = r[1] + Math.floor(k / 6) * 22 + R() * 3; } // fileiras
      c.x[i] = x; c.y[i] = Math.min(SQ_H - 6, y);
      c.sc[i] = 0.55 + ((c.y[i] - CROWD_TOP) / (SQ_H - CROWD_TOP)) * 0.55; // perspectiva
      c.ph[i] = R() * Math.PI * 2;
      c.g[i] = gi;
      c.spr[i] = Math.floor(R() * GROUP_SPRITES[grp].length);
      if (signs && grp === 'povo' && R() < 0.07) c.sign[i] = Math.floor(R() * signs);
    }
  });
  // os de trás primeiro
  const idx = Array.from({ length: n }, (_, k) => k).sort((a, b) => c.y[a] - c.y[b]);
  c.order.set(idx);
  return c;
}

// ---------- os moldes pré-renderizados ----------
const CW = 48, CH = 60;
type Tint = 0 | 1 | 2; // 0 normal · 1 raiva (avermelhado) · 2 festa (dourado)
const cache = new Map<string, HTMLCanvasElement>();
let assetsAsked = false;

function mold(id: string, tint: Tint, fallback: string): HTMLCanvasElement {
  const key = `${id}|${tint}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = CW; cv.height = CH;
  const g = cv.getContext('2d')!;
  const f = getTopDownFrame(id, 'north', 0);
  if (f) {
    g.imageSmoothingEnabled = true;
    g.drawImage(f.src, f.sx, f.sy, f.sw, f.sh, 0, 0, CW, CH);
  } else {
    // placeholder: corpo e cabeça na cor do grupo
    g.fillStyle = fallback;
    g.beginPath(); g.ellipse(CW / 2, CH * 0.72, CW * 0.26, CH * 0.26, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#c89a78';
    g.beginPath(); g.arc(CW / 2, CH * 0.36, CW * 0.16, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3a2a1a';
    g.beginPath(); g.arc(CW / 2, CH * 0.33, CW * 0.16, Math.PI, 0); g.fill();
  }
  if (tint) {
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = tint === 1 ? 'rgba(190,30,20,0.32)' : 'rgba(255,210,90,0.22)';
    g.fillRect(0, 0, CW, CH);
    g.globalCompositeOperation = 'source-over';
  }
  if (f) cache.set(key, cv); // o placeholder não fica no cache: o sprite real pode chegar
  return cv;
}
function front(id: string): HTMLCanvasElement | null {
  const key = `${id}|S`;
  const hit = cache.get(key);
  if (hit) return hit;
  const f = getTopDownFrame(id, 'south', 0);
  if (!f) return null;
  const cv = document.createElement('canvas');
  cv.width = 64; cv.height = 80;
  cv.getContext('2d')!.drawImage(f.src, f.sx, f.sy, f.sw, f.sh, 0, 0, 64, 80);
  cache.set(key, cv);
  return cv;
}

// ---------- efeitos ----------
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; kind: 'texto' | 'objeto' | 'petala' | 'brilho' | 'mancha'; text?: string; color: string }
const SHOUTS: Partial<Record<Reaction, string[]>> = {
  aplausos: ['Isso!', 'Bravo!', 'Viva!'],
  gritos: ['VIVA O REI!', 'VIVA!', 'CASTELMAR!', 'É ISSO!'],
  vaias: ['UUUH!', 'Mentira!', 'Fora!', 'Buuu!'],
  murmurios: ['…', 'hmm', 'será?', '…'],
  escudos: ['TUM!', 'TUM!', 'HA!'],
  objetos: ['Toma!', 'FORA!'],
  lenços: ['Amém', '♥'],
};
export const REACTION_NAME: Record<Reaction, string> = { aplausos: 'aplaude', vaias: 'vaia', murmurios: 'murmura', silencio: 'fica em silêncio', gritos: 'grita de alegria', escudos: 'bate nos escudos', objetos: 'atira coisas', lenços: 'acena com lenços' };

export interface SquareOpts {
  size: number; seed: number; mood: CrowdMood; signs: string[]; hour: number;
  queen?: string | null; // a rainha aparece na varanda
  king?: boolean;
}

export class SquareView {
  private cv: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private crowd: Crowd = layoutCrowd(0);
  private key = '';
  private bg: HTMLCanvasElement | null = null;
  private bgKey = '';
  private raf = 0;
  private t0 = performance.now();
  private parts: Particle[] = [];
  private react: Partial<Record<Group, { r: Reaction; at: number }>> = {};
  private speakingUntil = 0;
  private opts: SquareOpts = { size: 120, seed: 1, mood: 'curiosa', signs: [], hour: 12 };
  private scale = 1;
  private dpr = 1;
  onAssets?: () => void;

  attach(cv: HTMLCanvasElement, opts: SquareOpts) {
    this.cv = cv;
    this.ctx = cv.getContext('2d');
    this.opts = opts;
    const key = `${opts.size}|${opts.seed}|${opts.signs.length}`;
    if (key !== this.key) { this.crowd = layoutCrowd(opts.size, opts.seed, opts.signs.length); this.key = key; }
    this.resize();
    if (!assetsAsked) {
      assetsAsked = true;
      const ids = [...new Set([...Object.values(GROUP_SPRITES).flat(), 'rei', 'guarda', 'elenora', 'rhoswen', 'isolde', 'sigrid'])];
      loadTopDownAssets(() => { /* o próximo quadro já usa */ }, ids).then(() => this.onAssets?.());
    }
    if (!this.raf) this.raf = requestAnimationFrame(this.frame);
  }

  private resize() {
    const cv = this.cv!;
    const r = cv.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(200, r.width), h = Math.max(120, r.height);
    cv.width = Math.round(w * this.dpr); cv.height = Math.round(h * this.dpr);
    this.scale = Math.min(w / SQ_W, h / SQ_H);
  }

  // o rei falou: a varanda anima e os grupos reagem, cada um do seu jeito
  speak() { this.speakingUntil = performance.now() + 1800; }
  reactGroup(g: Group, r: Reaction) {
    const now = performance.now();
    this.react[g] = { r, at: now };
    const c = this.crowd;
    const shouts = SHOUTS[r];
    const gi = GROUPS.indexOf(g);
    let made = 0;
    for (let k = 0; k < c.n && made < 60; k++) {
      if (c.g[k] !== gi) continue;
      const roll = Math.random();
      if (shouts && roll < 0.05 && made < 8) { this.push({ x: c.x[k], y: c.y[k] - 30 * c.sc[k], vx: 0, vy: -14, life: 0, max: 1.6, kind: 'texto', text: shouts[Math.floor(Math.random() * shouts.length)], color: r === 'vaias' || r === 'objetos' ? '#ffb0a0' : '#fff6d8' }); made++; }
      if (r === 'objetos' && roll < 0.03) { const dx = BALCONY.x - c.x[k] + (Math.random() - 0.5) * 120; this.push({ x: c.x[k], y: c.y[k] - 30, vx: dx / 1.1, vy: -260, life: 0, max: 1.1, kind: 'objeto', color: Math.random() < 0.5 ? '#c0392b' : '#5a8a2a' }); made++; }
      if ((r === 'aplausos' || r === 'gritos') && roll < 0.04) { this.push({ x: c.x[k], y: c.y[k] - 26 * c.sc[k], vx: (Math.random() - 0.5) * 30, vy: -40, life: 0, max: 0.8, kind: 'brilho', color: '#ffe27a' }); made++; }
    }
  }
  private push(p: Particle) { if (this.parts.length < 220) this.parts.push(p); }

  stop() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }

  private frame = (now: number) => {
    this.raf = 0;
    const cv = this.cv;
    if (!cv || !cv.isConnected || !this.ctx) return; // a tela fechou
    const r = cv.getBoundingClientRect();
    if (Math.abs(r.width * this.dpr - cv.width) > 2 || Math.abs(r.height * this.dpr - cv.height) > 2) this.resize();
    this.draw(now);
    this.raf = requestAnimationFrame(this.frame);
  };

  private draw(now: number) {
    const g = this.ctx!;
    const cv = this.cv!;
    const t = (now - this.t0) / 1000;
    const dt = 1 / 60;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#0d0a08';
    g.fillRect(0, 0, cv.width, cv.height);
    const s = this.scale * this.dpr;
    const ox = (cv.width - SQ_W * s) / 2, oy = (cv.height - SQ_H * s) / 2;
    g.setTransform(s, 0, 0, s, ox, oy);
    g.drawImage(this.background(), 0, 0, SQ_W, SQ_H);
    this.drawBalcony(g, t, now);
    this.drawCrowd(g, t, now);
    this.drawParticles(g, dt);
    this.drawLight(g, t);
  }

  // ---------- fachada (placeholder desenhado: troque por arte depois) ----------
  private background(): HTMLCanvasElement {
    const hourBucket = this.opts.hour >= 19 || this.opts.hour < 6 ? 'n' : this.opts.hour >= 17 ? 'd' : 'm';
    const key = `${hourBucket}`;
    if (this.bg && this.bgKey === key) return this.bg;
    const cv = this.bg ?? document.createElement('canvas');
    cv.width = SQ_W; cv.height = SQ_H;
    const g = cv.getContext('2d')!;
    const R = rng(11);
    // céu
    const sky = g.createLinearGradient(0, 0, 0, 120);
    const skies = { m: ['#7fb2e0', '#cfe3f0'], d: ['#6a4a7a', '#f0a060'], n: ['#0a1030', '#2a3050'] }[hourBucket];
    sky.addColorStop(0, skies[0]); sky.addColorStop(1, skies[1]);
    g.fillStyle = sky; g.fillRect(0, 0, SQ_W, 130);
    // muralha
    const stone = (x: number, y: number, w: number, h: number, base: number) => {
      g.fillStyle = `rgb(${base},${base - 6},${base - 16})`; g.fillRect(x, y, w, h);
      for (let yy = y; yy < y + h; yy += 12) for (let xx = x + ((yy / 12) % 2) * 10; xx < x + w; xx += 22) {
        const v = base - 14 + R() * 22;
        g.fillStyle = `rgb(${v | 0},${(v - 6) | 0},${(v - 16) | 0})`;
        g.fillRect(xx + 1, yy + 1, Math.min(20, x + w - xx - 1), 10);
      }
    };
    stone(180, 70, 600, 205, 128);
    // torres
    for (const tx of [50, 770]) {
      stone(tx, 22, 140, 253, 138);
      for (let k = 0; k < 5; k++) { g.fillStyle = '#7a7064'; g.fillRect(tx + k * 30, 8, 18, 16); }
      g.fillStyle = '#1a1410'; g.beginPath(); g.moveTo(tx + 58, 120); g.arc(tx + 70, 120, 12, Math.PI, 0); g.lineTo(tx + 82, 150); g.lineTo(tx + 58, 150); g.fill();
    }
    for (let k = 0; k < 10; k++) { g.fillStyle = '#7a7064'; g.fillRect(190 + k * 60, 58, 32, 14); }
    // janelas
    for (const wx of [230, 300, 640, 710]) {
      g.fillStyle = hourBucket === 'n' ? '#e8b060' : '#1e1812';
      g.beginPath(); g.moveTo(wx, 130); g.arc(wx + 12, 130, 12, Math.PI, 0); g.lineTo(wx + 24, 168); g.lineTo(wx, 168); g.fill();
    }
    // estandartes das casas e o da coroa
    const banner = (x: number, y: number, w: number, h: number, c: string, trim: string) => {
      g.fillStyle = c; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w, y + h); g.lineTo(x + w / 2, y + h - 12); g.lineTo(x, y + h); g.fill();
      g.fillStyle = trim; g.fillRect(x, y, w, 4);
    };
    banner(262, 80, 26, 70, '#2350b0', '#d8b04a'); banner(332, 80, 26, 70, '#9a1f24', '#d8b04a');
    banner(602, 80, 26, 70, '#1f6a44', '#d8b04a'); banner(672, 80, 26, 70, '#6a6c78', '#d8b04a');
    banner(452, 74, 56, 70, '#2a3f8f', '#e8c860');
    g.fillStyle = '#e8c860'; g.beginPath(); g.moveTo(466, 108); g.lineTo(472, 96); g.lineTo(480, 106); g.lineTo(488, 96); g.lineTo(494, 108); g.fill();
    // portão sob a varanda
    g.fillStyle = '#16100a'; g.beginPath(); g.moveTo(430, 275); g.lineTo(430, 222); g.arc(480, 222, 50, Math.PI, 0); g.lineTo(530, 275); g.fill();
    g.strokeStyle = '#3a3028'; g.lineWidth = 3;
    for (let k = 0; k < 7; k++) { g.beginPath(); g.moveTo(438 + k * 14, 200); g.lineTo(438 + k * 14, 275); g.stroke(); }
    // chão da praça: pedras
    const ground = g.createLinearGradient(0, 270, 0, SQ_H);
    ground.addColorStop(0, '#6e6254'); ground.addColorStop(1, '#8a7a64');
    g.fillStyle = ground; g.fillRect(0, 272, SQ_W, SQ_H - 272);
    for (let k = 0; k < 900; k++) {
      const y = 276 + R() * (SQ_H - 276);
      const w = 6 + ((y - 272) / 330) * 12;
      g.fillStyle = `rgba(${R() < 0.5 ? '40,30,20' : '200,190,170'},${0.08 + R() * 0.08})`;
      g.beginPath(); g.ellipse(R() * SQ_W, y, w, w * 0.45, 0, 0, Math.PI * 2); g.fill();
    }
    // sombra do castelo no chão
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 272, SQ_W, 16);
    this.bg = cv; this.bgKey = key;
    return cv;
  }

  private drawBalcony(g: CanvasRenderingContext2D, t: number, now: number) {
    // guardas cerimoniais nos portões
    for (const gx of [405, 555]) this.figure(g, 'guarda', gx, 276, 0.62, 0);
    // a varanda (piso)
    g.fillStyle = '#5a5046'; g.fillRect(392, 176, 176, 12);
    g.fillStyle = '#433a32'; g.fillRect(398, 188, 164, 8);
    // o rei (e a rainha)
    const talking = now < this.speakingUntil;
    const bob = talking ? Math.abs(Math.sin(t * 9)) * 2 : Math.sin(t * 1.5) * 0.6;
    if (this.opts.king !== false) this.figure(g, 'rei', this.opts.queen ? 466 : BALCONY.x, 180 - bob, 0.78, 1);
    if (this.opts.queen) this.figure(g, this.opts.queen, 506, 180, 0.72, 1);
    for (const gx of [410, 550]) this.figure(g, 'guarda', gx, 180, 0.6, 1);
    // balaústre na frente dos pés
    g.fillStyle = '#8a7e70'; g.fillRect(392, 160, 176, 6);
    g.fillStyle = '#6e6458';
    for (let k = 0; k < 12; k++) g.fillRect(396 + k * 14.5, 166, 7, 12);
    g.fillStyle = '#2a3f8f'; g.fillRect(452, 166, 56, 22);
    g.fillStyle = '#e8c860'; g.fillRect(452, 166, 56, 3);
  }

  private figure(g: CanvasRenderingContext2D, id: string, x: number, footY: number, sc: number, facing: 0 | 1) {
    const img = facing ? front(id) : mold(id, 0, '#556');
    const w = 64 * sc, h = 80 * sc;
    if (img) g.drawImage(img, x - w / 2, footY - h, w, h);
    else { g.fillStyle = '#2a3f8f'; g.fillRect(x - 8 * sc, footY - 40 * sc, 16 * sc, 40 * sc); g.fillStyle = '#e8c860'; g.fillRect(x - 6 * sc, footY - 48 * sc, 12 * sc, 6 * sc); }
  }

  private drawCrowd(g: CanvasRenderingContext2D, t: number, now: number) {
    const c = this.crowd;
    const mood = this.opts.mood;
    const angry = mood === 'hostil' || mood === 'furiosa' || mood === 'insatisfeita';
    const party = mood === 'celebrando' || mood === 'emocionada';
    const react = GROUPS.map((gr) => { const r = this.react[gr]; return r && now - r.at < 2800 ? r : null; });
    const signs = this.opts.signs;
    for (let o = 0; o < c.n; o++) {
      const i = c.order[o];
      const gi = c.g[i];
      const grp = GROUPS[gi];
      const rr = react[gi];
      const sc = c.sc[i];
      const ph = c.ph[i];
      let dx = 0, dy = Math.sin(t * 1.3 + ph) * 0.8;
      let tint: Tint = 0;
      if (angry && grp === 'povo' && ph < 2.2) tint = 1;
      if (party && ph < 1.4) tint = 2;
      if (rr) {
        const k = 1 - (now - rr.at) / 2800;
        switch (rr.r) {
          case 'aplausos': dy -= Math.abs(Math.sin(t * 12 + ph)) * 3 * k; tint = tint || 2; break;
          case 'gritos': dy -= Math.max(0, Math.sin(t * 8 + ph)) * 9 * k; tint = 2; break;
          case 'vaias': case 'objetos': dx += Math.sin(t * 22 + ph) * 1.6 * k; tint = 1; break;
          case 'murmurios': dx += Math.sin(t * 3 + ph) * 1.2 * k; break;
          case 'silencio': dy = 0; break;
          case 'escudos': dy -= Math.max(0, Math.sin(t * 7)) * 4 * k; break;
          case 'lenços': dy -= Math.abs(Math.sin(t * 4 + ph)) * 2 * k; break;
        }
      } else if (angry) dx += Math.sin(t * 4 + ph) * 0.6;
      const id = GROUP_SPRITES[grp][c.spr[i] % GROUP_SPRITES[grp].length];
      const img = mold(id, tint, GROUP_INFO[grp].color);
      const w = CW * sc, h = CH * sc;
      const x = c.x[i] + dx, y = c.y[i] + dy;
      g.drawImage(img, x - w / 2, y - h, w, h);
      // faixas erguidas e bandeirinhas
      if (c.sign[i] >= 0 && signs.length) this.placard(g, x, y - h - 4, sc, signs[c.sign[i] % signs.length], t + ph);
      else if (party && ph > 5.9) this.flag(g, x, y - h, sc, t + ph, gi);
      if (rr?.r === 'lenços' && ph > 4.5) { g.fillStyle = '#f4f0e8'; g.fillRect(x + 4 * sc + Math.sin(t * 9 + ph) * 3, y - h - 6 * sc, 7 * sc, 5 * sc); }
      if (rr?.r === 'escudos' && grp === 'soldados') { g.fillStyle = '#8a6a3a'; g.fillRect(x - 8 * sc, y - h * 0.55, 6 * sc, 12 * sc); }
    }
  }

  private placard(g: CanvasRenderingContext2D, x: number, y: number, sc: number, text: string, t: number) {
    const sway = Math.sin(t * 2) * 3;
    g.fillStyle = '#5a4028'; g.fillRect(x - 1, y - 2, 2, 16 * sc);
    g.font = `bold ${Math.round(9 * sc + 3)}px serif`;
    const w = g.measureText(text).width + 8;
    g.fillStyle = '#e8dcc0'; g.fillRect(x - w / 2 + sway, y - 14 * sc - 4, w, 12 * sc + 4);
    g.fillStyle = '#8a1a14'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, x + sway, y - 8 * sc);
  }
  private flag(g: CanvasRenderingContext2D, x: number, y: number, sc: number, t: number, gi: number) {
    g.fillStyle = '#5a4028'; g.fillRect(x, y - 16 * sc, 1.5, 18 * sc);
    g.fillStyle = ['#2a3f8f', '#d8b04a', '#9a1f24', '#f4f0e8', '#6a5ac8'][gi];
    const w = Math.sin(t * 5) * 3;
    g.beginPath(); g.moveTo(x + 1.5, y - 16 * sc); g.lineTo(x + 12 * sc + w, y - 13 * sc); g.lineTo(x + 1.5, y - 9 * sc); g.fill();
  }

  private drawParticles(g: CanvasRenderingContext2D, dt: number) {
    // pétalas quando a praça está em festa
    if ((this.opts.mood === 'celebrando' || this.opts.mood === 'emocionada') && Math.random() < 0.4)
      this.push({ x: Math.random() * SQ_W, y: CROWD_TOP - 20, vx: (Math.random() - 0.5) * 20, vy: 30 + Math.random() * 20, life: 0, max: 5, kind: 'petala', color: Math.random() < 0.5 ? '#f0a0b8' : '#fff0f4' });
    const keep: Particle[] = [];
    for (const p of this.parts) {
      p.life += dt;
      if (p.life > p.max) {
        if (p.kind === 'objeto') this.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0, max: 1.2, kind: 'mancha', color: p.color });
        continue;
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'objeto') p.vy += 420 * dt;
      const a = 1 - p.life / p.max;
      g.globalAlpha = Math.max(0, Math.min(1, a * 1.6));
      if (p.kind === 'texto') {
        g.font = 'bold 13px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = 3; g.strokeStyle = 'rgba(20,12,6,.8)'; g.strokeText(p.text!, p.x, p.y);
        g.fillStyle = p.color; g.fillText(p.text!, p.x, p.y);
      } else if (p.kind === 'objeto') { g.fillStyle = p.color; g.beginPath(); g.arc(p.x, p.y, 4, 0, Math.PI * 2); g.fill(); }
      else if (p.kind === 'mancha') { g.fillStyle = p.color; g.beginPath(); g.ellipse(p.x, p.y, 7, 3, 0, 0, Math.PI * 2); g.fill(); }
      else if (p.kind === 'petala') { g.fillStyle = p.color; g.fillRect(p.x + Math.sin(p.life * 4) * 6, p.y, 3, 2); }
      else { g.fillStyle = p.color; g.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); }
      keep.push(p);
    }
    g.globalAlpha = 1;
    this.parts = keep;
  }

  private drawLight(g: CanvasRenderingContext2D, t: number) {
    const h = this.opts.hour;
    if (h >= 18 || h < 6) {
      g.fillStyle = h >= 19 || h < 6 ? 'rgba(10,16,48,0.42)' : 'rgba(80,40,60,0.2)';
      g.fillRect(0, 0, SQ_W, SQ_H);
      // tochas dos portões
      for (const tx of [420, 540]) {
        const f = 60 + Math.sin(t * 13 + tx) * 6;
        const rg = g.createRadialGradient(tx, 214, 2, tx, 214, f * 2);
        rg.addColorStop(0, 'rgba(255,190,90,0.55)'); rg.addColorStop(1, 'rgba(255,190,90,0)');
        g.fillStyle = rg; g.fillRect(tx - f * 2, 214 - f * 2, f * 4, f * 4);
        g.fillStyle = '#ffcc66'; g.fillRect(tx - 2, 208, 4, 6);
      }
    }
  }
}

export const squareView = new SquareView();
