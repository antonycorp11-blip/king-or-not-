import { CELL_H, CELL_W, FOOT, frameCount, getFrame, hasSheet, type Anim } from '../render/actors';
import { getTopDownFrame, loadTopDownAssets, TOPDOWN_CELL_W, TOPDOWN_CELL_H, TOPDOWN_FOOT, type TopDownDir } from '../render/topdown';
import { SH, SW, cityscape, library, throneRoom, type Room } from '../render/scenes';
import { createThroneHall, drawHallLights, HALL_H, HALL_W, loadHallAtlas, type HallObject, type ThroneHall } from '../render/throneHall';
import { addHallSideDoors, createCastleRoom, loadRoomArt, type RoomArt } from '../render/castleRooms';
import { ROOMS } from '../data/castle';
import type { RoomId } from '../types';

// Camadas: céu (CSS) → cidade (dia/noite) → sala (janelas vazadas) → personagens animados → chamas → luz.
export type RoomKind = 'trono' | 'biblioteca' | Exclude<RoomId, 'salao'>;

export interface SceneMarker { key: string; x: number; y: number; label: string; act: string; arg: string; kind: 'porta' | 'pessoa' | 'objeto' }

export interface ActorSpec {
  key: string; // identidade na cena (ex.: 'rei', 'speaker', 'guard1')
  id: string; // personagem
  x: number; // eixo do corpo em pixels do cenário
  foot: number; // linha dos pés
  facing: 1 | -1; // 1 = direita
  anim: Anim;
  scale?: number; // < 1 = mais ao fundo
  dim?: number; // escurecimento pela distância (0..1)
  roam?: [number, number]; // patrulha: anda sozinho entre esses dois pontos
  free?: boolean; // personagem controlado pelo jogador no salão top-down
  dir?: TopDownDir;
}

interface ActorState extends ActorSpec {
  frame: number;
  acc: number;
  tx?: number; // destino quando andando
  ty?: number;
  path?: Array<{ x: number; y: number }>;
  after?: Anim;
  onArrive?: () => void;
  leaving?: boolean;
  free?: boolean;
  dir?: TopDownDir;
  speed?: number;
  wait?: number; // patrulha: segundos parado antes de andar de novo
}

const FPS: Partial<Record<Anim, number>> = { walk: 9, idle: 1.4, talk: 1.3, seated: 0.8 };
const SPEED = 62; // pixels do cenário por segundo

export class SceneView {
  el: HTMLElement;
  private roomCanvas: HTMLCanvasElement;
  private actorsCanvas: HTMLCanvasElement;
  private flamesCanvas: HTMLCanvasElement;
  private room: Room | null = null;
  private kind: RoomKind | null = null;
  private night = 0;
  private actors = new Map<string, ActorState>();
  private last = performance.now();
  private lastDraw = 0;
  private bubbles = new Map<string, { el: HTMLElement; until: number }>();
  private bubbleLayer!: HTMLElement;
  private hall: ThroneHall | null = null;
  private staticHallDrawn = false;
  private movementEnabled = false;
  private atlas: HTMLImageElement | null = null;
  private rooms = new Map<string, ThroneHall>();
  private roomArt = new Map<string, RoomArt | null>();
  private markerLayer!: HTMLElement;
  onTap?: (key: string) => void; // toque em alguém da cena
  onKingMove?: () => void; // o rei levantou do trono e começou a andar

  constructor(host: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'scene';
    this.el.innerHTML = `
      <div class="sky">
        <div class="sky-layer sky-dawn"></div>
        <div class="sky-layer sky-day"></div>
        <div class="sky-layer sky-dusk"></div>
        <div class="sky-layer sky-night"></div>
        <div class="stars"></div>
        <div class="sun"></div>
        <div class="moon"></div>
        <div class="clouds"><i></i><i></i><i></i><i></i></div>
      </div>
      <canvas class="pix layer city-day"></canvas>
      <canvas class="pix layer city-night"></canvas>
      <div class="light-beams"></div>
      <canvas class="pix layer room"></canvas>
      <canvas class="pix layer actors"></canvas>
      <canvas class="pix layer flames"></canvas>
      <div class="tint"></div>
      <div class="vignette"></div>
      <div class="bubbles"></div>
      <div class="scene-markers"></div>`;
    host.appendChild(this.el);
    const [cd, cn] = this.el.querySelectorAll<HTMLCanvasElement>('.city-day, .city-night');
    copyInto(cd, cityscape(false));
    copyInto(cn, cityscape(true));
    this.roomCanvas = this.el.querySelector('.room')!;
    this.actorsCanvas = this.el.querySelector('.actors')!;
    this.flamesCanvas = this.el.querySelector('.flames')!;
    this.bubbleLayer = this.el.querySelector('.bubbles')!;
    this.markerLayer = this.el.querySelector('.scene-markers')!;
    for (const c of [this.actorsCanvas, this.flamesCanvas]) {
      c.width = SW;
      c.height = SH;
    }
    requestAnimationFrame(this.loop);
    void loadHallAtlas().then((atlas) => {
      this.atlas = atlas;
      this.hall = createThroneHall(atlas);
      addHallSideDoors(this.hall);
      this.refreshRoom();
      this.el.dataset.art = 'ready';
    }).catch(() => { this.el.dataset.art = 'error'; });
    void loadTopDownAssets(() => this.drawActors());
    this.el.addEventListener('pointerdown', (event) => {
      if (!this.isHall) return;
      const target = event.target as HTMLElement;
      if (!target.matches('canvas.room, canvas.actors, canvas.flames, .scene')) return;
      const rect = this.el.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * HALL_W;
      const y = ((event.clientY - rect.top) / rect.height) * HALL_H;
      // tocar numa pessoa conversa com ela; tocar no chão anda
      const hit = [...this.actors.values()].filter((a) => a.key.startsWith('npc-')).find((a) => Math.abs(a.x - x) < 34 && y > a.foot - 100 && y < a.foot + 12);
      if (hit && this.onTap) { this.onTap(hit.key); return; }
      if (!this.movementEnabled) return;
      this.moveTo('rei', x, y);
    });
  }

  setRoom(kind: RoomKind) {
    if (this.kind === kind) return;
    this.kind = kind;
    this.staticHallDrawn = false;
    const td = this.topDown;
    this.room = td ? { canvas: td.canvas, flames: [] } : kind === 'biblioteca' ? library() : kind === 'trono' ? throneRoom(!hasSheet('rei')) : { canvas: blankRoom(), flames: [] };
    copyInto(this.roomCanvas, this.room.canvas);
    const topDown = !!td;
    this.el.classList.toggle('top-down', topDown);
    this.el.closest<HTMLElement>('#stage')?.classList.toggle('hall-view', topDown);
    for (const c of [this.actorsCanvas, this.flamesCanvas]) {
      c.width = topDown ? HALL_W : SW;
      c.height = topDown ? HALL_H : SH;
    }
    this.el.dataset.room = kind;
    this.actors.clear();
    for (const b of this.bubbles.values()) b.el.remove();
    this.bubbles.clear();
    this.markerLayer.innerHTML = '';
  }

  get roomKind() { return this.kind; }

  // Cômodo top-down atual (salão ou outro cômodo do castelo), se a arte já carregou
  private get topDown(): ThroneHall | null {
    const k = this.kind;
    if (!k || k === 'biblioteca' || !this.atlas) return k === 'trono' ? this.hall : null;
    if (k === 'trono') return this.hall;
    let r = this.rooms.get(k);
    if (!r) {
      r = createCastleRoom(this.atlas, k, this.roomArt.get(k) ?? null);
      this.rooms.set(k, r);
      // Se a arte gerada do cômodo existir, reconstrói com ela assim que carregar
      if (!this.roomArt.has(k)) void loadRoomArt(k).then((art) => {
        this.roomArt.set(k, art);
        if (!art) return;
        this.rooms.delete(k);
        if (this.kind === k) this.refreshRoom();
      });
    }
    return r;
  }

  private get walkRect(): [number, number, number, number] {
    const k = this.kind;
    return !k || k === 'trono' || k === 'biblioteca' ? [112, 215, 1168, 612] : ROOMS[k].walk;
  }

  // Portas, pessoas e objetos clicáveis, em coordenadas do cenário
  setMarkers(list: SceneMarker[]) {
    this.markerLayer.innerHTML = list.map((m) => `<button class="scene-marker m-${m.kind}" data-act="${m.act}" data-arg="${m.arg}" style="left:${(m.x / HALL_W) * 100}%;top:${(m.y / HALL_H) * 100}%"><span>${m.label}</span></button>`).join('');
  }

  kingPos(): { x: number; y: number } | null {
    const a = this.actors.get('rei');
    if (!a || !a.free) return null;
    const p = this.hallPosition(a);
    return { x: Math.round(p.x), y: Math.round(p.foot) };
  }

  // redesenha a sala (ex.: quando a arte gerada termina de carregar)
  refreshRoom() {
    const k = this.kind;
    if (!k) return;
    this.kind = null;
    const saved = new Map(this.actors);
    this.setRoom(k);
    this.actors = saved;
  }

  setHour(hour: number) {
    const w = skyWeights(hour);
    const st = this.el.style;
    st.setProperty('--dawn', String(w.dawn));
    st.setProperty('--day', String(w.day));
    st.setProperty('--dusk', String(w.dusk));
    st.setProperty('--night', String(w.night));
    const t = Math.min(1, Math.max(0, (hour - 7) / 12));
    st.setProperty('--sun-x', `${8 + t * 84}%`);
    st.setProperty('--sun-y', `${55 - Math.sin(t * Math.PI) * 48}%`);
    const m = Math.min(1, Math.max(0, (hour - 17.5) / 4));
    st.setProperty('--moon-x', `${25 + m * 35}%`);
    st.setProperty('--moon-y', `${45 - m * 33}%`);
    this.night = w.night + w.dusk * 0.4;
  }

  setMode(mode: 'full' | 'dim') {
    this.el.classList.toggle('dim', mode === 'dim');
  }

  setMovementEnabled(enabled: boolean) {
    this.movementEnabled = enabled;
    this.el.classList.toggle('move-enabled', enabled);
  }

  // Sincroniza os personagens parados. Quem está andando não é interrompido.
  sync(specs: ActorSpec[]) {
    const keep = new Set(specs.map((s) => s.key));
    for (const [k, a] of this.actors) if (!keep.has(k) && !a.leaving && a.tx === undefined) this.actors.delete(k);
    for (const s of specs) {
      const cur = this.actors.get(s.key);
      if (cur && cur.id === s.id && !!cur.free === !!s.free) {
        if (cur.roam) Object.assign(cur, { foot: s.foot, scale: s.scale, dim: s.dim, roam: s.roam });
        else if (cur.tx === undefined && !cur.leaving && !cur.free) Object.assign(cur, { x: s.x, foot: s.foot, facing: s.facing, anim: s.anim, scale: s.scale, dim: s.dim, dir: s.dir });
        else if (cur.tx === undefined && !cur.leaving) Object.assign(cur, { anim: s.anim, scale: s.scale, dim: s.dim });
      } else this.actors.set(s.key, { ...s, frame: 0, acc: 0, wait: s.roam ? 1 + Math.random() * 4 : undefined });
    }
  }

  has(key: string) {
    return this.actors.has(key);
  }

  keys(prefix: string) {
    return [...this.actors.keys()].filter((k) => k.startsWith(prefix));
  }

  // balão de fala sobre a cabeça de alguém na cena
  say(key: string, text: string, ms = 4200) {
    if (!this.actors.has(key)) return;
    this.bubbles.get(key)?.el.remove();
    const el = document.createElement('div');
    el.className = 'bubble';
    el.textContent = text;
    this.bubbleLayer.appendChild(el);
    this.bubbles.set(key, { el, until: performance.now() + ms });
    this.placeBubbles();
  }

  private placeBubbles() {
    const now = performance.now();
    for (const [key, b] of this.bubbles) {
      const a = this.actors.get(key);
      if (!a || now > b.until || this.el.classList.contains('dim')) {
        b.el.classList.add('out');
        window.setTimeout(() => b.el.remove(), 300);
        this.bubbles.delete(key);
        continue;
      }
      const p = this.hallPosition(a);
      const k = p.scale;
      // mantém o balão dentro da tela (longe da barra do topo e das bordas)
      const width = this.isHall ? HALL_W : SW, height = this.isHall ? HALL_H : SH;
      b.el.style.left = `${(Math.min(width - 44, Math.max(44, p.x)) / width) * 100}%`;
      b.el.style.top = `${Math.max(16, ((p.foot - 118 * k) / height) * 100)}%`;
    }
  }

  walk(key: string, id: string, from: number, to: number, foot: number, after: Anim, onArrive?: () => void) {
    this.actors.set(key, { key, id, x: from, foot, facing: to >= from ? 1 : -1, anim: 'walk', frame: 0, acc: 0, tx: to, after, onArrive });
    this.bubbles.get(key)?.el.remove();
    this.bubbles.delete(key);
  }

  // Caminho em grade simples para o salão. Funciona para mouse, caneta e toque.
  moveTo(key: string, x: number, y: number, onArrive?: () => void) {
    if (!this.isHall) { onArrive?.(); return; }
    const actor = this.actors.get(key);
    if (!actor || actor.leaving) { onArrive?.(); return; }
    const start = this.hallPosition(actor);
    const [x0, y0, x1, y1] = this.walkRect;
    const goal = { x: clamp(x, x0, x1), y: clamp(y, y0, y1) };
    const path = hallPath(start.x, start.foot, goal.x, goal.y, this.topDown!.objects, this.walkRect);
    if (path.length < 2) { onArrive?.(); return; }
    if (key === 'rei') this.onKingMove?.();
    actor.free = true;
    actor.x = start.x;
    actor.foot = start.foot;
    actor.path = path.slice(1);
    const first = actor.path.shift() ?? goal;
    actor.tx = first.x;
    actor.ty = first.y;
    actor.anim = 'walk'; actor.after = 'idle'; actor.speed = 125;
    actor.dir = directionFor(actor.x, actor.foot, actor.tx, actor.ty);
    actor.onArrive = onArrive;
    this.staticHallDrawn = false;
  }

  setAnim(key: string, anim: Anim) {
    const a = this.actors.get(key);
    if (a && a.tx === undefined) a.anim = anim;
  }

  // O personagem vira e sai pela porta; some ao chegar.
  leave(key: string, to: number) {
    const a = this.actors.get(key);
    if (!a) return;
    this.actors.delete(key);
    const k = `leaving-${key}-${Math.round(performance.now())}`;
    this.actors.set(k, { ...a, key: k, anim: 'walk', facing: -1, tx: to, leaving: true, onArrive: undefined });
  }

  // pula a caminhada (clique do jogador)
  finishWalks() {
    for (const a of [...this.actors.values()]) if (a.tx !== undefined && !a.leaving) {
      a.x = a.tx;
      this.arrive(a);
    }
  }

  private arrive(a: ActorState) {
    a.tx = undefined;
    a.anim = a.after ?? 'idle';
    const cb = a.onArrive;
    a.onArrive = undefined;
    if (a.leaving) this.actors.delete(a.key);
    if (a.roam) {
      a.wait = 3 + Math.random() * 7;
      a.speed = undefined;
      if (Math.random() < 0.4) a.facing = a.facing > 0 ? -1 : 1; // olha para o outro lado
    }
    cb?.();
  }

  private loop = (now: number) => {
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    for (const a of [...this.actors.values()]) {
      // patrulha: depois de um tempo parado, marcha até outro ponto do seu trecho
      if (a.roam && a.tx === undefined && a.wait !== undefined) {
        a.wait -= dt;
        if (a.wait <= 0) {
          const [lo, hi] = a.roam;
          let to = lo + Math.random() * (hi - lo);
          if (Math.abs(to - a.x) < 25) to = a.x < (lo + hi) / 2 ? hi : lo;
          a.tx = to;
          a.facing = to >= a.x ? 1 : -1;
          a.anim = 'walk';
          a.after = 'idle';
          a.speed = 26;
        }
      }
      if (a.tx !== undefined) {
        const dx = a.tx - a.x;
        const dy = a.ty === undefined ? 0 : a.ty - a.foot;
        const d = Math.hypot(dx, dy);
        const step = (a.speed ?? SPEED) * dt;
        if (d <= step) {
          a.x = a.tx;
          if (a.ty !== undefined) a.foot = a.ty;
          if (a.path?.length) {
            const next = a.path.shift()!;
            a.tx = next.x; a.ty = next.y;
            a.dir = directionFor(a.x, a.foot, a.tx, a.ty);
          } else this.arrive(a);
        } else {
          const k = step / d;
          a.x += dx * k;
          if (a.ty !== undefined) a.foot += dy * k;
          a.dir = directionFor(a.x, a.foot, a.tx, a.ty ?? a.foot);
        }
      }
      a.acc += dt * (FPS[a.anim] ?? 1);
      if (a.acc >= 1) {
        a.acc -= 1;
        a.frame = (a.frame + 1) % Math.max(1, frameCount(a.anim));
      }
    }
    if (now - this.lastDraw < 50) return;
    this.lastDraw = now;
    this.drawActors();
    this.drawFlames(now);
    if (this.bubbles.size) this.placeBubbles();
  };

  private drawActors() {
    if (this.isHall && this.actors.size === 0 && this.staticHallDrawn) return;
    const ctx = this.actorsCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.imageSmoothingEnabled = this.isHall;
    const list = [...this.actors.values()].sort((a, b) => this.hallPosition(a).foot - this.hallPosition(b).foot);
    let objectIndex = 0;
    const td = this.topDown;
    const objects = this.isHall && td ? td.objects : [];
    for (const a of list) {
      const p = this.hallPosition(a);
      while (objectIndex < objects.length && objects[objectIndex].depth <= p.foot)
        td!.drawObject(ctx, objects[objectIndex++]);
      const source = this.isHall
        ? getTopDownFrame(a.id, this.hallDirection(a), a.frame, a.anim)
        : getFrame(a.id, a.anim, a.frame);
      if (!source) continue;
      const topDown = this.isHall;
      const sourceW = source.sw, sourceH = source.sh;
      const k = p.scale;
      // The packed sheets share a foot anchor and scale across the entire cast.
      const drawScale = topDown ? .64 * (a.id === 'guarda' || a.id === 'rhoswen' ? 1.08 : 1) : k;
      const w = Math.round((topDown ? TOPDOWN_CELL_W : CELL_W) * drawScale);
      const h = Math.round((topDown ? TOPDOWN_CELL_H : CELL_H) * drawScale);
      const axis = (a.facing > 0 ? 31 : CELL_W - 31) * k;
      const dx = Math.round(p.x - (topDown ? w / 2 : axis));
      const dy = Math.round(p.foot - (topDown ? TOPDOWN_FOOT * drawScale : FOOT * k));
      ctx.fillStyle = `rgba(10,6,16,${0.35 * k})`;
      ctx.beginPath();
      ctx.ellipse(Math.round(p.x), p.foot, 13 * k, 3 * k, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      if (a.dim) ctx.filter = `brightness(${1 - a.dim}) saturate(${1 - a.dim * 0.6})`;
      if (!topDown && a.facing < 0) {
        ctx.translate(dx + w, dy);
        ctx.scale(-1, 1);
        ctx.drawImage(source.src, source.sx, source.sy, sourceW, sourceH, 0, 0, w, h);
      } else ctx.drawImage(source.src, source.sx, source.sy, sourceW, sourceH, dx, dy, w, h);
      ctx.restore();
    }
    while (objectIndex < objects.length) td!.drawObject(ctx, objects[objectIndex++]);
    this.staticHallDrawn = this.isHall && this.actors.size === 0;
  }

  private hallDirection(a: ActorState): TopDownDir {
    if (a.free) return a.dir ?? 'south';
    if (a.key.startsWith('npc-') || this.kind !== 'trono') return a.dir ?? 'south';
    if (a.key === 'rei') return 'south';
    if (a.key.startsWith('comp-')) return 'west';
    if (a.key.startsWith('guard')) return a.facing > 0 ? 'east' : 'west';
    if (a.key.startsWith('wait-')) return 'north';
    // Legacy audience X increases while the visitor advances UP the carpet.
    return a.leaving || (a.tx !== undefined && a.tx < a.x) ? 'south' : 'north';
  }

  private get isHall() { return !!this.topDown; }

  // Adaptador exclusivamente visual: preserva o fluxo atual das audiências.
  private hallPosition(a: ActorSpec) {
    if (!this.isHall) return { x: a.x, foot: a.foot, scale: a.scale ?? 1 };
    const scale = .62 * (a.scale ?? 1);
    // fora do salão (e para quem anda livre ou tem lugar marcado), a posição é a própria
    if (this.kind !== 'trono' || a.key.startsWith('npc-')) return { x: a.x, foot: a.foot, scale };
    if (a.key === 'rei' && !a.free) return { x: 640, foot: 330, scale: .62 };
    if (a.key === 'rei' && a.free) return { x: a.x, foot: a.foot, scale: .62 };
    if (a.key.startsWith('comp-')) return { x: 760, foot: 347, scale };
    if (a.key === 'guard1') return { x: 342 + (a.x - 150) * .5, foot: 359, scale };
    if (a.key === 'guard2') return { x: 896 + (a.x - 168) * .5, foot: 359, scale };
    if (a.key === 'guard3') return { x: 857 + (a.x - 330) * .5, foot: 566, scale };
    if (a.key.startsWith('wait-')) return { x: 331 + a.x * .9, foot: 560, scale };
    return { x: 640, foot: 643 - Math.max(0, Math.min(1, (a.x + 40) / 322)) * 225, scale };
  }

  private drawFlames(now: number) {
    if (!this.room) return;
    const ctx = this.flamesCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (this.isHall) {
      drawHallLights(ctx, this.topDown!.lights, now, this.night);
      return;
    }
    const glow = 0.12 + this.night * 0.35;
    for (const f of this.room.flames) {
      const k = Math.sin(now / 90 + f.x * 1.7) + Math.sin(now / 53 + f.y);
      const r = (f.big ? 20 : 13) + k * 1.4;
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r * (1 + this.night));
      g.addColorStop(0, `rgba(255,190,90,${glow})`);
      g.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(f.x - 50, f.y - 50, 100, 100);
      const h = k > 0.5 ? 5 : 4;
      ctx.fillStyle = '#ff9a2a';
      ctx.fillRect(f.x - 1, f.y + 5 - h, 3, h);
      ctx.fillStyle = '#ffe890';
      ctx.fillRect(f.x, f.y + 6 - h, 1, h - 1);
    }
  }
}

function blankRoom() {
  const c = document.createElement('canvas');
  c.width = HALL_W; c.height = HALL_H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#141820'; g.fillRect(0, 0, HALL_W, HALL_H);
  return c;
}

function copyInto(dst: HTMLCanvasElement, src: HTMLCanvasElement) {
  dst.width = src.width;
  dst.height = src.height;
  const ctx = dst.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, dst.width, dst.height);
  ctx.drawImage(src, 0, 0);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function directionFor(x: number, y: number, tx: number, ty: number): TopDownDir {
  const dx = tx - x, dy = ty - y;
  if (Math.abs(dy) > Math.abs(dx)) return dy < 0 ? 'north' : 'south';
  return dx < 0 ? 'west' : 'east';
}

interface GridNode { x: number; y: number; f: number; g: number; }

function hallPath(x: number, y: number, tx: number, ty: number, objects: HallObject[], walk: [number, number, number, number] = [100, 214, 1180, 616]) {
  const cell = 32;
  const cols = Math.ceil(HALL_W / cell), rows = Math.ceil(HALL_H / cell);
  const center = (gx: number, gy: number) => ({ x: gx * cell + cell / 2, y: gy * cell + cell / 2 });
  const blocked = (gx: number, gy: number) => {
    const p = center(gx, gy);
    if (p.x < walk[0] - 12 || p.x > walk[2] + 12 || p.y < walk[1] - 2 || p.y > walk[3] + 4) return true;
    return objects.some((o) => o.solid && p.x > o.x - 18 && p.x < o.x + o.w + 18 && p.y > o.y - 12 && p.y < o.y + o.h + 10);
  };
  const toGrid = (px: number, py: number) => ({ x: clamp(Math.floor(px / cell), 0, cols - 1), y: clamp(Math.floor(py / cell), 0, rows - 1) });
  const start = toGrid(x, y), end = toGrid(tx, ty);
  // quem nasceu dentro de um objeto (porta, móvel) ainda pode sair andando
  let target = end;
  if (blocked(target.x, target.y)) {
    const nearby: Array<{ x: number; y: number; d: number }> = [];
    for (let gy = Math.max(0, end.y - 3); gy <= Math.min(rows - 1, end.y + 3); gy++)
      for (let gx = Math.max(0, end.x - 3); gx <= Math.min(cols - 1, end.x + 3); gx++)
        if (!blocked(gx, gy)) nearby.push({ x: gx, y: gy, d: Math.hypot(gx - end.x, gy - end.y) });
    nearby.sort((a, b) => a.d - b.d); if (!nearby.length) return []; target = nearby[0];
  }
  const key = (gx: number, gy: number) => `${gx},${gy}`;
  const open: GridNode[] = [{ ...start, g: 0, f: Math.hypot(target.x - start.x, target.y - start.y) }];
  const came = new Map<string, string>();
  const best = new Map<string, number>([[key(start.x, start.y), 0]]);
  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift()!;
    if (cur.x === target.x && cur.y === target.y) {
      const cells: Array<{ x: number; y: number }> = [];
      let k = key(cur.x, cur.y);
      while (k) {
        const [gx, gy] = k.split(',').map(Number); cells.push(center(gx, gy));
        const prev = came.get(k); if (!prev) break; k = prev;
      }
      cells.reverse();
      // Remove collinear points so walking looks deliberate rather than grid-like.
      return cells.filter((p, i) => i === 0 || i === cells.length - 1 || Math.abs(p.x - cells[i - 1].x) !== Math.abs(cells[i + 1].x - p.x) || Math.abs(p.y - cells[i - 1].y) !== Math.abs(cells[i + 1].y - p.y));
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || (blocked(nx, ny) && blocked(cur.x, cur.y) === false)) continue;
      const nk = key(nx, ny), ng = cur.g + 1;
      if (ng >= (best.get(nk) ?? Infinity)) continue;
      best.set(nk, ng); came.set(nk, key(cur.x, cur.y));
      open.push({ x: nx, y: ny, g: ng, f: ng + Math.hypot(target.x - nx, target.y - ny) });
    }
  }
  return [];
}

export function skyWeights(h: number) {
  const pts: [number, number, number, number, number][] = [
    [7, 0.3, 0, 0, 0.7],
    [8, 0.75, 0.25, 0, 0],
    [9, 0.3, 0.7, 0, 0],
    [10, 0, 1, 0, 0],
    [15, 0, 1, 0, 0],
    [16, 0, 0.6, 0.4, 0],
    [17, 0, 0.15, 0.85, 0],
    [18, 0, 0, 0.7, 0.3],
    [19, 0, 0, 0.25, 0.75],
    [20, 0, 0, 0, 1],
  ];
  const hh = Math.max(7, Math.min(20, h));
  let i = 0;
  while (i < pts.length - 2 && pts[i + 1][0] <= hh) i++;
  const [h0, ...a] = pts[i];
  const [h1, ...b] = pts[i + 1];
  const t = h1 === h0 ? 0 : Math.min(1, (hh - h0) / (h1 - h0));
  const v = a.map((x, k) => x + (b[k] - x) * t);
  return { dawn: v[0], day: v[1], dusk: v[2], night: v[3] };
}
