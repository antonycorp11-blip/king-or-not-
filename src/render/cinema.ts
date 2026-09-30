import type { RoomId } from '../types';
import type { CastleWorld } from './castleWorld';
import { getFrame, portraitHi, type Anim, type Expr } from './actors';
import { char } from '../data/characters';

// MODO CINEMA
// Cortejos, urgências e grandes acontecimentos saem do mapa visto de cima e viram uma
// cena dirigida, em vista lateral: o cenário do lugar, quem chega andando, o close do
// rosto com a expressão, as reações a cada resposta e a saída de cena.
// Palco lógico 1920x1080; o diálogo ocupa a faixa de baixo.

const W = 1920, H = 1080;
const FLOOR_Y = 640; // onde a parede encontra o chão
const FEET = 800; // linha dos pés dos personagens
const SCALE = 2.25; // célula 128x256 → ~576 px de altura
const CELL_W = 128, CELL_H = 256, CELL_FOOT = 246;
const KING_X = 620, NPC_X = 1180;

interface Piece { p: string; x: number; foot?: number; top?: number; w: number; flip?: boolean; light?: number }
interface SetDef { floor: string; wall?: string; exterior?: boolean; dark?: number; back: Piece[]; wallDeco?: Piece[] }

const WINDOW = (x: number): Piece => ({ p: 'atlas:window', x, top: 70, w: 190, light: 260 });
const SETS: Partial<Record<RoomId, SetDef>> & { padrao: SetDef } = {
  padrao: { floor: 'tex_pedra', wall: 'tex_parede', back: [{ p: 'atlas:column', x: 380, foot: 660, w: 150 }, { p: 'atlas:column', x: 1540, foot: 660, w: 150 }], wallDeco: [WINDOW(960), { p: 'atlas:redBanner', x: 650, top: 60, w: 170 }, { p: 'atlas:redBanner', x: 1270, top: 60, w: 170 }] },
  salao: { floor: 'tex_pedra', wall: 'tex_parede', back: [
    { p: 'atlas:column', x: 150, foot: 660, w: 150 }, { p: 'atlas:column', x: 1780, foot: 660, w: 150 },
    { p: 'atlas:armor', x: 1450, foot: 660, w: 120 }, { p: 'atlas:statue', x: 1020, foot: 660, w: 120 },
    { p: 'atlas:brazier', x: 1650, foot: 700, w: 140, light: 320 },
  ], wallDeco: [WINDOW(1200), { p: 'atlas:redBanner', x: 900, top: 50, w: 170 }, { p: 'atlas:blueBanner', x: 1560, top: 50, w: 170 }] },
  conselho: { floor: 'tex_carvalho', wall: 'tex_parede', back: [
    { p: 'lareira_leao', x: 960, foot: 660, w: 420, light: 380 }, { p: 'estante_baixa', x: 330, foot: 660, w: 260 }, { p: 'armario_documentos', x: 1620, foot: 660, w: 220 },
    { p: 'candelabro_alto', x: 640, foot: 680, w: 90, light: 240 }, { p: 'candelabro_alto', x: 1300, foot: 680, w: 90, light: 240 },
  ], wallDeco: [{ p: 'janela_azul', x: 330, top: 70, w: 170, light: 220 }, { p: 'quadro_rei', x: 1620, top: 90, w: 160 }] },
  jardim: { floor: 'tex_grama', exterior: true, back: [
    { p: 'arvore', x: 200, foot: 640, w: 440 }, { p: 'arco_rosas', x: 820, foot: 640, w: 300 }, { p: 'fonte', x: 1500, foot: 670, w: 460 },
    { p: 'sebe_h', x: 1140, foot: 630, w: 320 }, { p: 'lanterna_pedra', x: 1020, foot: 660, w: 70, light: 220 }, { p: 'poste_luz', x: 1880, foot: 660, w: 70, light: 240 },
    { p: 'canteiro_redondo', x: 480, foot: 680, w: 220 },
  ] },
  patio: { floor: 'tex_calcada', exterior: true, back: [
    { p: 'suporte_armas', x: 300, foot: 650, w: 260 }, { p: 'boneco_treino', x: 760, foot: 650, w: 130 }, { p: 'boneco_treino', x: 920, foot: 650, w: 130 },
    { p: 'alvo', x: 1450, foot: 650, w: 170 }, { p: 'tenda', x: 1720, foot: 660, w: 380 }, { p: 'braseiro_tripe', x: 1130, foot: 670, w: 100, light: 260 },
  ] },
  estabulos: { floor: 'tex_calcada', exterior: true, back: [
    { p: 'baia_cavalo', x: 330, foot: 650, w: 420 }, { p: 'baia_vazia', x: 780, foot: 650, w: 420 }, { p: 'cavalo_branco', x: 1450, foot: 680, w: 150 },
    { p: 'fardos_feno', x: 1750, foot: 690, w: 240 }, { p: 'suporte_selas', x: 1180, foot: 660, w: 220 },
  ] },
  cozinha: { floor: 'tex_cozinha', wall: 'tex_parede', back: [
    { p: 'lareira_cozinha', x: 380, foot: 660, w: 460, light: 420 }, { p: 'prateleira_potes', x: 900, foot: 660, w: 220 }, { p: 'forno', x: 1300, foot: 660, w: 280, light: 260 },
    { p: 'barris', x: 1720, foot: 690, w: 240 }, { p: 'mesa_preparo', x: 1080, foot: 720, w: 380 },
  ], wallDeco: [{ p: 'panelas_parede', x: 900, top: 90, w: 360 }] },
  biblioteca: { floor: 'tex_carvalho', wall: 'tex_parede', back: [
    { p: 'estante_grande', x: 330, foot: 660, w: 470 }, { p: 'estante_grande', x: 1560, foot: 660, w: 470 }, { p: 'atril', x: 1000, foot: 680, w: 110 },
    { p: 'candelabro_alto', x: 820, foot: 680, w: 90, light: 260 }, { p: 'globo', x: 1200, foot: 690, w: 130 },
  ], wallDeco: [{ p: 'janela_azul', x: 960, top: 70, w: 180, light: 240 }] },
  capela: { floor: 'tex_marmore', wall: 'tex_parede', dark: 0.12, back: [
    { p: 'altar', x: 980, foot: 660, w: 440, light: 320 }, { p: 'estatua_senhora', x: 450, foot: 660, w: 150 }, { p: 'velas_votivas', x: 1500, foot: 670, w: 230, light: 280 },
    { p: 'confessionario', x: 1800, foot: 660, w: 250 }, { p: 'candelabro_alto', x: 240, foot: 680, w: 90, light: 240 },
  ], wallDeco: [{ p: 'vitral', x: 620, top: 50, w: 170, light: 260 }, { p: 'vitral', x: 1320, top: 50, w: 170, light: 260 }] },
  banquete: { floor: 'tex_parquet', wall: 'tex_parede', back: [
    { p: 'lareira_leao', x: 1560, foot: 660, w: 400, light: 360 }, { p: 'armadura', x: 280, foot: 660, w: 120 },
    { p: 'mesa_banquete', x: 820, foot: 700, w: 620, light: 160 }, { p: 'candelabro_alto', x: 1250, foot: 680, w: 90, light: 240 },
  ], wallDeco: [{ p: 'janela_azul', x: 560, top: 70, w: 170, light: 220 }, { p: 'bandeira_vermelha', x: 1100, top: 50, w: 130 }] },
  aposentos: { floor: 'tex_parquet', wall: 'tex_parede', back: [
    { p: 'penteadeira', x: 330, foot: 660, w: 260 }, { p: 'biombo', x: 1480, foot: 660, w: 280 }, { p: 'harpa', x: 1780, foot: 670, w: 150 },
    { p: 'vaso_rosas', x: 620, foot: 680, w: 90 }, { p: 'candelabro', x: 1200, foot: 690, w: 90, light: 220 },
  ], wallDeco: [{ p: 'janela_rosa', x: 960, top: 70, w: 180, light: 240 }] },
  quarto: { floor: 'tex_carvalho', wall: 'tex_parede', back: [
    { p: 'lareira_leao', x: 330, foot: 660, w: 380, light: 360 }, { p: 'cama_rei', x: 1500, foot: 700, w: 520 }, { p: 'guarda_roupa', x: 900, foot: 660, w: 240 },
    { p: 'candelabro_alto', x: 1130, foot: 690, w: 90, light: 240 },
  ], wallDeco: [{ p: 'janela_azul', x: 650, top: 70, w: 170, light: 220 }] },
  masmorra: { floor: 'tex_pedra', wall: 'tex_parede', dark: 0.35, back: [
    { p: 'cela', x: 420, foot: 660, w: 460 }, { p: 'cela', x: 1500, foot: 660, w: 460 }, { p: 'mesa_chaves', x: 960, foot: 700, w: 220, light: 240 },
  ], wallDeco: [{ p: 'tocha', x: 960, top: 180, w: 70, light: 320 }, { p: 'correntes', x: 720, top: 120, w: 110 }] },
  tesouro: { floor: 'tex_pedra', wall: 'tex_parede', dark: 0.15, back: [
    { p: 'prateleira_ouro', x: 380, foot: 660, w: 360 }, { p: 'bau_grande', x: 1500, foot: 690, w: 260 }, { p: 'coroa_pedestal', x: 960, foot: 680, w: 150, light: 260 },
    { p: 'ouro_grande', x: 1780, foot: 710, w: 300 },
  ], wallDeco: [{ p: 'tocha', x: 700, top: 180, w: 60, light: 280 }, { p: 'tocha', x: 1220, top: 180, w: 60, light: 280 }] },
  arquivos: { floor: 'tex_carvalho', wall: 'tex_parede', dark: 0.1, back: [
    { p: 'estante_pergaminhos', x: 300, foot: 660, w: 260 }, { p: 'estante_pergaminhos', x: 580, foot: 660, w: 260 }, { p: 'gaveteiro_mapas', x: 1450, foot: 680, w: 340 },
    { p: 'mesa_escriba', x: 1060, foot: 690, w: 300, light: 220 },
  ] },
};
SETS.galeria = SETS.padrao; SETS.entrada = SETS.padrao;

interface Actor { id: string; x: number; to: number; flip: boolean; anim: Anim; frame: number; acc: number; speed: number; scale: number; dim: number; hold?: number; onArrive?: () => void; tag?: string; rest?: Anim }
export interface Cast { id: string; x: number; flip?: boolean; scale?: number; dim?: number; anim?: Anim }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; kind: 'heart' | 'dust' | 'spark' }

export interface CinemaPlay {
  room: RoomId; hour: number; npc: string; title: string; sub: string;
  kingEnters?: boolean; kingSeated?: boolean; extras?: string[]; expr?: Expr; mood?: 'romance' | 'urgente' | 'grande' | 'noite';
}

export class Cinema {
  el: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private world: () => CastleWorld | null;
  private actors: Actor[] = [];
  private parts: Particle[] = [];
  private play_: CinemaPlay | null = null;
  private t0 = 0;
  private last = 0;
  private fade = 1; // 1 = preto, 0 = visível
  private fadeTo = 0;
  private closeUp: { id: string; expr: Expr; from: number; until: number } | null = null;
  private expr: Expr = 'neutro';
  private warm = 0;
  private endCb: (() => void) | null = null;
  private raf = 0;
  active = false;

  constructor(host: HTMLElement, world: () => CastleWorld | null) {
    this.el = document.createElement('div');
    this.el.className = 'cinema';
    this.el.innerHTML = '<canvas width="1920" height="1080"></canvas>';
    host.appendChild(this.el);
    this.canvas = this.el.querySelector('canvas')!;
    this.ctx = this.canvas.getContext('2d')!;
    this.world = world;
  }

  // Começa a cena. onReady: quando quem chega termina de entrar (o diálogo pode começar)
  play(p: CinemaPlay, onReady: () => void) {
    this.play_ = p;
    this.active = true;
    this.el.classList.add('on');
    this.fade = 1; this.fadeTo = 0;
    this.parts = []; this.warm = 0; this.expr = p.expr ?? 'neutro';
    this.t0 = this.last = performance.now();
    const npcFlip = true; // o outro olha para a esquerda, para o rei
    this.actors = [];
    // figurantes ao fundo (menores e mais escuros)
    (p.extras ?? []).forEach((id, i) => this.actors.push({ id, x: 300 + i * 420 + (i % 2) * 120, to: 300 + i * 420 + (i % 2) * 120, flip: i % 2 === 0, anim: 'idle', frame: i, acc: 0, speed: 0, scale: 0.72, dim: 0.35 }));
    const king: Actor = { id: 'rei', x: p.kingEnters ? -200 : KING_X, to: KING_X, flip: false, anim: p.kingSeated ? 'seated' : p.kingEnters ? 'walk' : 'idle', frame: 0, acc: 0, speed: 300, scale: 1, dim: 0 };
    const npc: Actor = { id: p.npc, x: p.kingEnters ? NPC_X : W + 220, to: NPC_X, flip: npcFlip, anim: p.kingEnters ? 'idle' : 'walk', frame: 0, acc: 0, speed: 280, scale: 1, dim: 0 };
    this.actors.push(king, npc);
    const mover = p.kingEnters ? king : npc;
    mover.onArrive = () => {
      if (!p.kingEnters && p.mood !== 'urgente' && p.npc !== 'rei') { npc.anim = 'bow'; npc.hold = 0.9; }
      this.closeUp = { id: p.npc, expr: this.expr, from: performance.now(), until: performance.now() + 2600 };
      window.setTimeout(() => this.active && onReady(), 900);
    };
    for (let i = 0; i < 26; i++) this.parts.push(this.dust());
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.loop);
  }

  // ---------- roteiro (prólogo e cenas dirigidas) ----------
  // Monta o palco com um elenco livre; o resto é conduzido passo a passo.
  stageScene(p: { room: RoomId; hour: number; title: string; sub: string; focus: string }, cast: Cast[]) {
    this.play_ = { room: p.room, hour: p.hour, npc: p.focus, title: p.title, sub: p.sub, kingEnters: true };
    this.active = true;
    this.el.classList.add('on');
    this.fade = 1; this.fadeTo = 0;
    this.parts = []; this.warm = 0; this.expr = 'neutro'; this.closeUp = null; this.endCb = null;
    this.t0 = this.last = performance.now();
    this.actors = cast.map((c, i) => ({ id: c.id, x: c.x, to: c.x, flip: !!c.flip, anim: c.anim ?? 'idle', rest: c.anim ?? 'idle', frame: i, acc: 0, speed: 260, scale: c.scale ?? 1, dim: c.dim ?? 0 }));
    for (let i = 0; i < 26; i++) this.parts.push(this.dust());
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.loop);
  }
  private who(id: string) { return this.actors.find((a) => a.id === id); }
  moveActor(id: string, to: number, speed = 260, onArrive?: () => void) {
    const a = this.who(id);
    if (!a) return onArrive?.();
    a.to = to; a.speed = speed; a.anim = 'walk'; a.flip = to < a.x; a.onArrive = onArrive;
  }
  poseActor(id: string, anim: Anim, hold?: number) {
    const a = this.who(id);
    if (!a) return;
    a.anim = anim; a.hold = hold;
    if (hold === undefined) a.rest = anim;
  }
  faceActor(id: string, left: boolean) { const a = this.who(id); if (a) a.flip = left; }
  showCloseUp(id: string, expr: Expr, ms = 2600) { this.closeUp = { id, expr, from: performance.now(), until: performance.now() + ms }; }
  tagActors(tags: Record<string, string | undefined>) { for (const a of this.actors) a.tag = tags[a.id]; }
  burst(id: string, kind: 'spark' | 'heart' = 'spark', n = 12) {
    const a = this.who(id);
    if (!a) return;
    for (let i = 0; i < n; i++) this.parts.push(kind === 'heart' ? this.heart(a.x) : this.spark(a.x, FEET - 470));
  }
  fadeOut(cb: () => void) { this.endCb = cb; this.fadeTo = 1; }

  // pula a entrada (botão Pular)
  skip() {
    for (const a of this.actors) if (a.x !== a.to) { a.x = a.to; a.anim = a.id === 'rei' && this.play_?.kingSeated ? 'seated' : 'idle'; const cb = a.onArrive; a.onArrive = undefined; cb?.(); }
  }

  // alguém fala: anima a fala por um tempo
  speak(who: 'rei' | 'npc', secs = 2.2) {
    const a = who === 'rei' ? this.actors.find((x) => x.id === 'rei') : this.npc();
    if (!a || a.anim === 'walk') return;
    if (a.id === 'rei') { if (this.play_?.kingSeated) { a.anim = 'seatedTalk'; a.hold = secs; } else { a.hold = secs; a.anim = 'idle'; } return; }
    a.anim = 'talk'; a.hold = secs;
  }

  setExpr(e: Expr) { this.expr = e; }

  // reação ao que o rei disse
  react(kind: 'feliz' | 'irritado' | 'beijo' | 'ajoelha' | 'reverencia' | 'neutro') {
    const n = this.npc(), k = this.actors.find((x) => x.id === 'rei');
    if (!n || !k) return;
    if (kind === 'irritado') { n.flip = false; n.hold = 1.3; window.setTimeout(() => { n.flip = true; }, 1300); this.expr = 'irritado'; }
    if (kind === 'feliz') { this.expr = 'feliz'; for (let i = 0; i < 6; i++) this.parts.push(this.spark(n.x, FEET - 420)); }
    if (kind === 'reverencia') { n.anim = 'bow'; n.hold = 1.2; }
    if (kind === 'ajoelha') { n.anim = 'kneel'; n.hold = 2.4; }
    if (kind === 'beijo') {
      this.expr = 'feliz';
      if (this.play_?.kingSeated) { k.anim = 'walk'; this.play_.kingSeated = false; k.to = KING_X + 180; }
      n.to = (k.to ?? KING_X) + 190; n.anim = 'walk'; n.speed = 160;
      n.onArrive = () => { this.warm = 1; for (let i = 0; i < 18; i++) this.parts.push(this.heart((k.to + n.to) / 2)); };
    }
    this.closeUp = { id: n.id, expr: this.expr, from: performance.now(), until: performance.now() + 1800 };
  }

  // fim de cena: quem veio sai andando e a tela escurece
  end(cb: () => void) {
    if (!this.active) return cb();
    const n = this.npc();
    if (n && !this.play_?.kingEnters) { n.flip = false; n.to = W + 260; n.anim = 'walk'; n.speed = 320; }
    else { const k = this.actors.find((x) => x.id === 'rei'); if (k) { k.flip = true; k.to = -260; k.anim = 'walk'; k.speed = 340; } }
    this.endCb = cb;
    window.setTimeout(() => { this.fadeTo = 1; }, 700);
  }

  private stop() {
    this.active = false;
    this.el.classList.remove('on');
    cancelAnimationFrame(this.raf);
    const cb = this.endCb; this.endCb = null;
    cb?.();
  }

  private npc() { return this.play_ ? this.actors.find((a) => a.id === this.play_!.npc && a.scale === 1) : undefined; }

  private dust(): Particle { return { x: Math.random() * W, y: 120 + Math.random() * 600, vx: 6 + Math.random() * 10, vy: -2 + Math.random() * 4, life: 999, kind: 'dust' }; }
  private spark(x: number, y: number): Particle { return { x: x + (Math.random() - 0.5) * 160, y: y + Math.random() * 80, vx: (Math.random() - 0.5) * 40, vy: -40 - Math.random() * 40, life: 1.4, kind: 'spark' }; }
  private heart(x: number): Particle { return { x: x + (Math.random() - 0.5) * 220, y: FEET - 380 - Math.random() * 100, vx: (Math.random() - 0.5) * 30, vy: -50 - Math.random() * 50, life: 2.6 + Math.random(), kind: 'heart' }; }

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    // atores
    for (const a of this.actors) {
      if (a.x !== a.to) {
        a.anim = 'walk';
        const d = a.to - a.x, st = a.speed * dt;
        if (Math.abs(d) <= st) { a.x = a.to; a.anim = a.rest ?? (a.id === 'rei' && this.play_?.kingSeated ? 'seated' : 'idle'); const cb = a.onArrive; a.onArrive = undefined; cb?.(); }
        else { a.x += Math.sign(d) * st; if (a.id === 'rei' || a.scale === 1) a.flip = d < 0; }
      }
      if (a.hold !== undefined) { a.hold -= dt; if (a.hold <= 0) { a.hold = undefined; if (a.x === a.to) a.anim = a.rest ?? (a.id === 'rei' && this.play_?.kingSeated ? 'seated' : 'idle'); } }
      a.acc += dt * (a.anim === 'walk' ? 9 : a.anim === 'talk' || a.anim === 'seatedTalk' ? 4 : 1.2);
      if (a.acc >= 1) { a.acc -= 1; a.frame++; }
    }
    // partículas
    for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.kind !== 'dust') p.life -= dt; else if (p.x > W + 10) { p.x = -10; } }
    this.parts = this.parts.filter((p) => p.life > 0);
    this.warm = Math.max(0, this.warm - dt * 0.15);
    // fade
    this.fade += (this.fadeTo - this.fade) * Math.min(1, dt * 3.2);
    if (this.fadeTo === 1 && this.fade > 0.97 && this.endCb) return this.stop();
    // 30 quadros por segundo bastam para a cena (a lógica acima segue o tempo real)
    if (now - this.drawnAt < 31) return;
    this.drawnAt = now;
    this.draw(now);
  };
  private drawnAt = 0;

  private night() {
    const h = this.play_?.hour ?? 12;
    return h >= 20 || h < 6 ? 1 : h >= 18.5 ? (h - 18.5) / 1.5 : h < 7.5 ? 0.6 : 0;
  }

  private draw(now: number) {
    const c = this.ctx, p = this.play_!;
    const set = SETS[p.room] ?? SETS.padrao;
    const w = this.world();
    const t = (now - this.t0) / 1000;
    const drift = Math.sin(t / 7) * 18; // câmera respirando
    const night = this.night();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = true;
    c.fillStyle = '#0c0a12'; c.fillRect(0, 0, W, H);
    c.save();
    c.translate(drift, 0);
    // fundo: parede ou céu
    if (set.exterior) {
      const g = c.createLinearGradient(0, 0, 0, FLOOR_Y);
      const h = p.hour;
      const [top, bot] = night > 0.6 ? ['#0b1030', '#26305e'] : h >= 16.5 ? ['#3a4a8a', '#f0a060'] : ['#5a8ad0', '#bfe0f6'];
      g.addColorStop(0, top); g.addColorStop(1, bot);
      c.fillStyle = g; c.fillRect(-40, 0, W + 80, FLOOR_Y);
      if (night > 0.6) { c.fillStyle = '#fff'; for (let i = 0; i < 70; i++) { const x = (i * 263) % W, y = (i * 97) % 360; c.globalAlpha = 0.3 + ((i * 13) % 7) / 10; c.fillRect(x, y, 3, 3); } c.globalAlpha = 1; }
      // muralha distante
      if (w?.hasProp('muralha')) { const [mw, mh] = w.propSize('muralha', 360); c.globalAlpha = 0.85; for (let x = -40; x < W + 40; x += mw - 6) w.drawProp(c, 'muralha', x, FLOOR_Y - mh + 30, mw, mh); c.globalAlpha = 1; }
    } else {
      const pat = w?.patternOf(set.wall ?? 'tex_parede', 300);
      c.fillStyle = pat ?? '#4a4450'; c.fillRect(-40, 0, W + 80, FLOOR_Y);
      const g = c.createLinearGradient(0, 0, 0, FLOOR_Y);
      g.addColorStop(0, 'rgba(8,6,14,.55)'); g.addColorStop(0.6, 'rgba(8,6,14,0)'); g.addColorStop(1, 'rgba(8,6,14,.25)');
      c.fillStyle = g; c.fillRect(-40, 0, W + 80, FLOOR_Y);
      c.fillStyle = '#2a2024'; c.fillRect(-40, FLOOR_Y - 26, W + 80, 26); // rodapé
      for (const d of set.wallDeco ?? []) this.piece(c, w, d);
    }
    // chão em perspectiva
    const fp = w?.patternOf(set.floor, 220);
    c.save(); c.translate(0, FLOOR_Y); c.scale(1, 0.5);
    c.fillStyle = fp ?? '#6b5a44'; c.fillRect(-40, 0, W + 80, (H - FLOOR_Y) * 2);
    c.restore();
    const fg = c.createLinearGradient(0, FLOOR_Y, 0, H);
    fg.addColorStop(0, 'rgba(0,0,0,.35)'); fg.addColorStop(0.25, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,0,0,.4)');
    c.fillStyle = fg; c.fillRect(-40, FLOOR_Y, W + 80, H - FLOOR_Y);
    // no salão: degraus e trono atrás do rei
    // no salão: o estrado do trono (o próprio sprite do rei sentado já traz o trono)
    if (p.room === 'salao' && w && p.kingSeated) this.piece(c, w, { p: 'atlas:steps', x: KING_X, foot: FEET + 40, w: 560 });
    for (const b of set.back) this.piece(c, w, b);
    c.restore();
    // fachos de luz do dia pelas janelas
    if (!set.exterior && night < 0.5) {
      c.save(); c.globalCompositeOperation = 'screen';
      for (const d of set.wallDeco ?? []) if (d.light && /janela|window|vitral/.test(d.p)) {
        const g = c.createLinearGradient(0, 200, 0, H);
        g.addColorStop(0, `rgba(255,236,190,${0.2 * (1 - night)})`); g.addColorStop(1, 'rgba(255,236,190,0)');
        c.fillStyle = g; c.beginPath(); c.moveTo(d.x + drift - d.w * 0.4, 230); c.lineTo(d.x + drift + d.w * 0.4, 230); c.lineTo(d.x + drift + d.w * 1.4 + 200, H); c.lineTo(d.x + drift - d.w * 0.2 + 200, H); c.fill();
      }
      c.restore();
    }
    // personagens (figurantes primeiro)
    for (const a of [...this.actors].sort((x, y) => x.scale - y.scale)) this.actor(c, a, drift);
    // noite e escuridão do lugar
    const dark = Math.min(0.75, night * 0.55 + (set.dark ?? 0));
    if (dark > 0) { c.fillStyle = `rgba(10,12,34,${dark})`; c.fillRect(0, 0, W, H); }
    // luzes das velas, tochas e lareiras
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const b of [...set.back, ...(set.wallDeco ?? [])]) if (b.light && (night > 0.2 || !/janela|window|vitral/.test(b.p))) {
      const y = b.top !== undefined ? b.top + 120 : (b.foot ?? FLOOR_Y) - 120;
      const r = b.light * (1 + night * 0.6) * (1 + Math.sin(t * 7 + b.x) * 0.03);
      const a = 0.08 + night * 0.26 + (set.dark ?? 0) * 0.3;
      const g = c.createRadialGradient(b.x + drift, y, 0, b.x + drift, y, r);
      g.addColorStop(0, `rgba(255,190,110,${a})`); g.addColorStop(1, 'rgba(255,140,40,0)');
      c.fillStyle = g; c.fillRect(b.x + drift - r, y - r, r * 2, r * 2);
    }
    c.restore();
    // calor do momento (beijo)
    if (this.warm > 0) { const g = c.createRadialGradient(W / 2, FEET - 300, 0, W / 2, FEET - 300, 900); g.addColorStop(0, `rgba(255,150,160,${0.28 * this.warm})`); g.addColorStop(1, 'rgba(255,150,160,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H); }
    // partículas
    for (const q of this.parts) this.particle(c, q);
    // close do rosto
    this.drawCloseUp(c, now);
    // barras de cinema e vinheta
    const v = c.createRadialGradient(W / 2, H * 0.45, H * 0.35, W / 2, H * 0.45, H * 0.95);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
    c.fillStyle = v; c.fillRect(0, 0, W, H);
    const bar = Math.min(1, t * 1.6) * 64;
    c.fillStyle = '#000'; c.fillRect(0, 0, W, bar);
    // cartão do lugar
    if (t < 4.2) {
      const a = Math.min(1, t * 2) * Math.min(1, (4.2 - t) * 1.5);
      c.globalAlpha = a;
      c.fillStyle = '#f2d27a'; c.font = '700 44px "Alegreya SC", serif'; c.textAlign = 'left';
      c.fillText(p.title, 90, 150);
      c.fillStyle = '#e8dcc0'; c.font = 'italic 28px "Alegreya", serif';
      c.fillText(p.sub, 92, 192);
      c.globalAlpha = 1;
    }
    // escurecer (entrada e saída)
    if (this.fade > 0.01) { c.fillStyle = `rgba(0,0,0,${this.fade})`; c.fillRect(0, 0, W, H); }
  }

  private piece(c: CanvasRenderingContext2D, w: CastleWorld | null, b: Piece) {
    if (!w || !w.hasProp(b.p)) return;
    const [pw, ph] = w.propSize(b.p, b.w);
    const y = b.top !== undefined ? b.top : (b.foot ?? FLOOR_Y) - ph;
    // sombra no chão
    if (b.foot !== undefined) { c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(b.x + pw * 0.08, b.foot - 4, pw * 0.5, 14, 0, 0, Math.PI * 2); c.fill(); }
    w.drawProp(c, b.p, b.x - pw / 2, y, pw, ph, b.flip);
  }

  private actor(c: CanvasRenderingContext2D, a: Actor, drift: number) {
    const f = getFrame(a.id, a.anim, a.frame);
    const k = SCALE * a.scale * (f.sw === CELL_W ? 1 : CELL_W / f.sw);
    const dw = f.sw * k, dh = f.sh * k;
    const foot = FEET - (a.scale < 1 ? 70 : 0);
    const footInCell = f.sw === CELL_W ? CELL_FOOT : (CELL_FOOT / CELL_H) * f.sh;
    const x = a.x + drift * (a.scale < 1 ? 0.6 : 1);
    const bob = a.anim === 'idle' ? Math.sin(performance.now() / 600 + a.x) * 2 : 0;
    c.save();
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(x, foot + 2, dw * 0.28, 16 * a.scale, 0, 0, Math.PI * 2); c.fill();
    if (a.dim) c.filter = `brightness(${1 - a.dim})`;
    const y = foot - footInCell * k + bob;
    if (a.flip) { c.translate(x + dw / 2, y); c.scale(-1, 1); c.drawImage(f.src, f.sx, f.sy, f.sw, f.sh, 0, 0, dw, dh); }
    else c.drawImage(f.src, f.sx, f.sy, f.sw, f.sh, x - dw / 2, y, dw, dh);
    c.restore();
    if (a.tag) {
      // etiqueta sobre a cabeça (os suspeitos no prólogo)
      const ty = y + 40 * a.scale;
      c.save();
      c.font = '700 30px "Alegreya SC", serif'; c.textAlign = 'center';
      const tw = c.measureText(a.tag).width + 28;
      c.fillStyle = 'rgba(90,10,10,.88)'; c.fillRect(x - tw / 2, ty - 34, tw, 44);
      c.strokeStyle = '#e8a060'; c.lineWidth = 2; c.strokeRect(x - tw / 2, ty - 34, tw, 44);
      c.fillStyle = '#ffe2c0'; c.fillText(a.tag, x, ty);
      c.restore();
    }
  }

  private particle(c: CanvasRenderingContext2D, q: Particle) {
    if (q.kind === 'dust') { c.fillStyle = 'rgba(255,240,200,.18)'; c.fillRect(q.x, q.y, 3, 3); return; }
    const a = Math.min(1, q.life);
    if (q.kind === 'spark') { c.fillStyle = `rgba(255,226,140,${a})`; c.fillRect(q.x, q.y, 6, 6); return; }
    c.save(); c.globalAlpha = a; c.fillStyle = '#ff6a8a'; c.translate(q.x, q.y); c.scale(1.6, 1.6);
    c.beginPath(); c.moveTo(0, 6); c.bezierCurveTo(-10, -2, -6, -10, 0, -4); c.bezierCurveTo(6, -10, 10, -2, 0, 6); c.fill(); c.restore();
  }

  // close no rosto: retrato grande com moldura, entra pela direita
  private drawCloseUp(c: CanvasRenderingContext2D, now: number) {
    const cu = this.closeUp;
    if (!cu || now > cu.until) return;
    const img = portraitHi(cu.id, cu.expr);
    if (!img) return;
    const k = Math.min(1, (now - cu.from) / 350) * Math.min(1, (cu.until - now) / 350);
    const size = 360, x = W - 90 - size + (1 - k) * 140, y = 110;
    c.save(); c.globalAlpha = k;
    c.fillStyle = 'rgba(12,8,18,.75)'; c.fillRect(x - 14, y - 14, size + 28, size + 76);
    c.strokeStyle = '#d8b04a'; c.lineWidth = 5; c.strokeRect(x - 14, y - 14, size + 28, size + 76);
    c.drawImage(img, x, y, size, size);
    c.fillStyle = '#f2d27a'; c.font = '700 30px "Alegreya SC", serif'; c.textAlign = 'center';
    c.fillText(char(cu.id).name, x + size / 2, y + size + 42);
    c.restore();
  }
}
