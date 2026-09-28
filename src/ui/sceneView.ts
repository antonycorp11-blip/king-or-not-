import { CELL_H, CELL_W, FOOT, frameCount, getFrame, hasSheet, type Anim } from '../render/actors';
import { SH, SW, cityscape, library, throneRoom, type Room } from '../render/scenes';
import { createThroneHall, drawHallLights, HALL_H, HALL_W, loadHallAtlas, type ThroneHall } from '../render/throneHall';

// Camadas: céu (CSS) → cidade (dia/noite) → sala (janelas vazadas) → personagens animados → chamas → luz.
export type RoomKind = 'trono' | 'biblioteca';

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
}

interface ActorState extends ActorSpec {
  frame: number;
  acc: number;
  tx?: number; // destino quando andando
  after?: Anim;
  onArrive?: () => void;
  leaving?: boolean;
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
      <div class="bubbles"></div>`;
    host.appendChild(this.el);
    const [cd, cn] = this.el.querySelectorAll<HTMLCanvasElement>('.city-day, .city-night');
    copyInto(cd, cityscape(false));
    copyInto(cn, cityscape(true));
    this.roomCanvas = this.el.querySelector('.room')!;
    this.actorsCanvas = this.el.querySelector('.actors')!;
    this.flamesCanvas = this.el.querySelector('.flames')!;
    this.bubbleLayer = this.el.querySelector('.bubbles')!;
    for (const c of [this.actorsCanvas, this.flamesCanvas]) {
      c.width = SW;
      c.height = SH;
    }
    requestAnimationFrame(this.loop);
    void loadHallAtlas().then((atlas) => {
      this.hall = createThroneHall(atlas);
      this.refreshRoom();
      this.el.dataset.art = 'ready';
    }).catch(() => { this.el.dataset.art = 'error'; });
  }

  setRoom(kind: RoomKind) {
    if (this.kind === kind) return;
    this.kind = kind;
    this.staticHallDrawn = false;
    this.room = kind === 'trono' ? this.hall ? { canvas: this.hall.canvas, flames: [] } : throneRoom(!hasSheet('rei')) : library();
    copyInto(this.roomCanvas, this.room.canvas);
    const topDown = kind === 'trono' && !!this.hall;
    this.el.classList.toggle('top-down', topDown);
    for (const c of [this.actorsCanvas, this.flamesCanvas]) {
      c.width = topDown ? HALL_W : SW;
      c.height = topDown ? HALL_H : SH;
    }
    this.el.dataset.room = kind;
    this.actors.clear();
    for (const b of this.bubbles.values()) b.el.remove();
    this.bubbles.clear();
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

  // Sincroniza os personagens parados. Quem está andando não é interrompido.
  sync(specs: ActorSpec[]) {
    const keep = new Set(specs.map((s) => s.key));
    for (const [k, a] of this.actors) if (!keep.has(k) && !a.leaving && a.tx === undefined) this.actors.delete(k);
    for (const s of specs) {
      const cur = this.actors.get(s.key);
      if (cur && cur.id === s.id) {
        if (cur.roam) Object.assign(cur, { foot: s.foot, scale: s.scale, dim: s.dim, roam: s.roam });
        else if (cur.tx === undefined && !cur.leaving) Object.assign(cur, { x: s.x, foot: s.foot, facing: s.facing, anim: s.anim, scale: s.scale, dim: s.dim });
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
        const d = a.tx - a.x;
        const step = (a.speed ?? SPEED) * dt;
        if (Math.abs(d) <= step) {
          a.x = a.tx;
          this.arrive(a);
        } else a.x += Math.sign(d) * step;
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
    const objects = this.isHall ? this.hall!.objects : [];
    for (const a of list) {
      const p = this.hallPosition(a);
      while (objectIndex < objects.length && objects[objectIndex].depth <= p.foot)
        this.hall!.drawObject(ctx, objects[objectIndex++]);
      // As folhas laterais são reaproveitadas em escala menor durante a etapa de cenário.
      const fr = getFrame(a.id, this.isHall && a.key === 'rei' ? 'idle' : a.anim, a.frame);
      // Aceita tanto as folhas atuais quanto as variantes de maior resolução.
      const sourceW = 'sw' in fr ? Number(fr.sw) : CELL_W;
      const sourceH = 'sh' in fr ? Number(fr.sh) : CELL_H;
      const k = p.scale;
      const w = Math.round(CELL_W * k), h = Math.round(CELL_H * k);
      const axis = (a.facing > 0 ? 31 : CELL_W - 31) * k;
      const dx = Math.round(p.x - axis);
      const dy = Math.round(p.foot - FOOT * k);
      ctx.fillStyle = `rgba(10,6,16,${0.35 * k})`;
      ctx.beginPath();
      ctx.ellipse(Math.round(p.x), p.foot, 13 * k, 3 * k, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      if (a.dim) ctx.filter = `brightness(${1 - a.dim}) saturate(${1 - a.dim * 0.6})`;
      if (a.facing < 0) {
        ctx.translate(dx + w, dy);
        ctx.scale(-1, 1);
        ctx.drawImage(fr.src, fr.sx, fr.sy, sourceW, sourceH, 0, 0, w, h);
      } else ctx.drawImage(fr.src, fr.sx, fr.sy, sourceW, sourceH, dx, dy, w, h);
      ctx.restore();
    }
    while (objectIndex < objects.length) this.hall!.drawObject(ctx, objects[objectIndex++]);
    this.staticHallDrawn = this.isHall && this.actors.size === 0;
  }

  private get isHall() { return this.kind === 'trono' && !!this.hall; }

  // Adaptador exclusivamente visual: preserva o fluxo atual das audiências.
  private hallPosition(a: ActorSpec) {
    if (!this.isHall) return { x: a.x, foot: a.foot, scale: a.scale ?? 1 };
    const scale = .62 * (a.scale ?? 1);
    if (a.key === 'rei') return { x: 640, foot: 330, scale: .62 };
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
      drawHallLights(ctx, this.hall!.lights, now, this.night);
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

function copyInto(dst: HTMLCanvasElement, src: HTMLCanvasElement) {
  dst.width = src.width;
  dst.height = src.height;
  const ctx = dst.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, dst.width, dst.height);
  ctx.drawImage(src, 0, 0);
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
