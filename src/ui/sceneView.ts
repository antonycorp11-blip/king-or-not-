import type { Anim } from '../render/actors';
import { getTopDownFrame, loadTopDownAssets, TOPDOWN_CELL_H, TOPDOWN_CELL_W, TOPDOWN_FOOT, type TopDownDir } from '../render/topdown';
import { CastleWorld, type Camera, type Hotspot } from '../render/castleWorld';
import { ROOMS, WORLD_H, WORLD_W, roomAt } from '../data/castle';
import type { RoomId } from '../types';

// A cena é o castelo inteiro, visto de cima, com uma câmera que acompanha o rei.
// Todas as posições estão em pixels do mundo (ver data/castle.ts).
export type RoomKind = string; // compatibilidade: a cena agora é sempre o castelo

export interface ActorSpec {
  key: string; // identidade na cena (ex.: 'rei', 'npc-aldric', 'guard1')
  id: string; // personagem
  x: number;
  foot: number;
  facing?: 1 | -1;
  anim: Anim;
  dir?: TopDownDir;
  roam?: [number, number]; // patrulha horizontal entre esses dois x
  scale?: number;
  dim?: number;
  free?: boolean;
  speed?: number;
}

export interface SceneMarker { key: string; x: number; y: number; label: string; act: string; arg: string; kind: 'porta' | 'pessoa' | 'objeto' | 'acao' | 'local' }

interface ActorState extends ActorSpec {
  frame: number;
  acc: number;
  path: [number, number][];
  target?: [number, number]; // para onde a pessoa quer ir (rotina)
  onArrive?: () => void;
  leaving?: boolean;
  wait?: number;
  dir: TopDownDir;
}

const FPS: Partial<Record<Anim, number>> = { walk: 9, idle: 1.4, talk: 1.3, seated: 0.8 };
const DRAW_SCALE = 0.64;

export class SceneView {
  el: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private world: CastleWorld | null = null;
  private actors = new Map<string, ActorState>();
  private last = performance.now();
  private lastDraw = 0;
  private bubbles = new Map<string, { el: HTMLElement; until: number }>();
  private bubbleLayer: HTMLElement;
  private markerLayer: HTMLElement;
  private markers: SceneMarker[] = [];
  private markerEls: HTMLElement[] = [];
  private movementEnabled = false;
  private night = 0;
  private cam: Camera = { x: 1080, y: 40, zoom: 1, vw: 1280, vh: 720 };
  private zoomMul = 1;
  private kingRoom: RoomId | null = null;
  private focusPoint: [number, number] | null = null;
  onTap?: (key: string) => void; // toque em alguém da cena
  onHotspot?: (h: Hotspot) => void; // toque num móvel que é um lugar
  onKingMove?: () => void; // o rei começou a andar
  onKingRoom?: (room: RoomId) => void; // o rei entrou em outro cômodo
  onWorldTap?: () => void; // toque no chão (fecha menus)
  currentRoom?: () => RoomId | null; // cômodo do rei segundo o jogo

  constructor(host: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'scene top-down world';
    this.el.innerHTML = `<canvas class="pix layer actors"></canvas><div class="tint"></div><div class="vignette"></div><div class="bubbles"></div><div class="scene-markers"></div>`;
    host.appendChild(this.el);
    this.canvas = this.el.querySelector('canvas')!;
    this.ctx = this.canvas.getContext('2d', { alpha: false })!; // opaco: o fundo sempre cobre tudo
    this.bubbleLayer = this.el.querySelector('.bubbles')!;
    this.markerLayer = this.el.querySelector('.scene-markers')!;
    this.el.closest<HTMLElement>('#stage')?.classList.add('hall-view');
    void CastleWorld.load().then((w) => { this.world = w; this.el.dataset.art = 'ready'; }).catch((e) => { console.error(e); this.el.dataset.art = 'error'; });
    void loadTopDownAssets(() => {});
    this.el.addEventListener('pointerdown', (e) => this.onPointer(e));
    requestAnimationFrame(this.loop);
  }

  // ---------- compatibilidade com a API antiga ----------
  setRoom(_kind: RoomKind) { /* o castelo é um só */ }
  refreshRoom() {}
  prefetch(_k: string) {}
  get roomKind() { return 'castelo'; }

  // Dia claro das 8h às 17h; entardecer dourado até as 19h; noite depois disso
  setHour(hour: number) {
    const night = hour >= 19 ? Math.min(1, 0.35 + (hour - 19) / 1.6) : hour >= 18 ? (hour - 18) * 0.35 : hour < 7.9 ? 0.25 : 0;
    const dusk = hour >= 16.5 && hour < 20 ? Math.max(0, 1 - Math.abs(hour - 18.2) / 1.7) : 0;
    const dawn = hour < 8.5 ? Math.min(1, (8.5 - hour) * 1.2) : 0;
    this.night = night;
    this.el.style.setProperty('--night', String(night));
    this.el.style.setProperty('--dusk', String(dusk));
    this.el.style.setProperty('--dawn', String(dawn));
  }
  setMode(mode: 'full' | 'dim') { this.ver++; this.el.classList.toggle('dim', mode === 'dim'); }
  setMovementEnabled(enabled: boolean) { this.movementEnabled = enabled; this.el.classList.toggle('move-enabled', enabled); }
  private panel = 0; // fração da largura coberta pelo painel de diálogo (direita)
  setPanel(frac: number) { if (Math.abs(frac - this.panel) > 0.01) { this.panel = frac; this.ver++; } }
  setZoom(mul: number) { this.zoomMul = Math.max(0.55, Math.min(1.5, mul)); }
  get zoom() { return this.zoomMul; }
  focus(x: number | null, y = 0) { this.focusPoint = x === null || Number.isNaN(x) ? null : [x, y]; }
  isReady() { return !!this.world; }
  get castleWorld() { return this.world; }

  has(key: string) { return this.actors.has(key); }
  keys(prefix: string) { return [...this.actors.keys()].filter((k) => k.startsWith(prefix)); }
  pos(key: string): [number, number] | null { const a = this.actors.get(key); return a ? [a.x, a.foot] : null; }
  kingPos() { const a = this.actors.get('rei'); return a ? { x: Math.round(a.x), y: Math.round(a.foot) } : null; }
  walking(key: string) { return !!this.actors.get(key)?.path.length; }

  // Mantém os personagens da cena. Quem já existe caminha até o novo lugar.
  sync(specs: ActorSpec[]) {
    this.ver++;
    const keep = new Set(specs.map((s) => s.key));
    // 'st-' são atores de cena roteirizada (as noites do bobo): o jogo não os controla
    for (const [k, a] of this.actors) if (!keep.has(k) && !a.leaving && !a.path.length && !k.startsWith('st-')) this.actors.delete(k);
    for (const s of specs) {
      const cur = this.actors.get(s.key);
      if (!cur || cur.id !== s.id) {
        this.actors.set(s.key, { ...s, frame: 0, acc: 0, path: [], dir: s.dir ?? 'south', wait: s.roam ? 1 + Math.random() * 4 : undefined, target: [s.x, s.foot] });
        continue;
      }
      cur.anim = cur.path.length ? 'walk' : s.anim;
      cur.roam = s.roam;
      if (s.key === 'rei') {
        // o rei só é reposicionado quando senta ou levanta do trono
        if (s.anim === 'seated' || (!cur.path.length && Math.hypot(cur.x - s.x, cur.foot - s.foot) > 200)) { cur.x = s.x; cur.foot = s.foot; cur.path = []; }
        if (!cur.path.length && s.dir) cur.dir = s.dir;
        continue;
      }
      const [tx, ty] = cur.target ?? [cur.x, cur.foot];
      if (Math.hypot(tx - s.x, ty - s.foot) > 24) {
        cur.target = [s.x, s.foot];
        // quem está longe apressa o passo (atravessar o castelo não pode levar um minuto)
        const far = Math.hypot(cur.x - s.x, cur.foot - s.foot);
        this.moveTo(s.key, s.x, s.foot, undefined, Math.max(s.speed ?? 80, Math.min(240, far / 7)));
      } else if (!cur.path.length && s.dir) cur.dir = s.dir;
    }
  }

  // balão de fala sobre a cabeça de alguém
  say(key: string, text: string, ms = 4200) {
    this.ver++;
    if (!this.actors.has(key)) return;
    this.bubbles.get(key)?.el.remove();
    const el = document.createElement('div');
    el.className = 'bubble';
    el.textContent = text;
    this.bubbleLayer.appendChild(el);
    this.bubbles.set(key, { el, until: performance.now() + ms });
  }

  setMarkers(list: SceneMarker[]) {
    this.ver++;
    this.markers = list;
    this.markerLayer.innerHTML = list.map((m) => `<button class="scene-marker m-${m.kind}" data-act="${m.act}" data-arg="${m.arg}"><span>${m.label}</span></button>`).join('');
    this.markerEls = [...this.markerLayer.querySelectorAll<HTMLElement>('.scene-marker')];
    this.placeOverlays();
  }

  // Alguém que aparece num ponto e caminha até outro
  walkIn(key: string, id: string, from: [number, number], to: [number, number], onArrive?: () => void) {
    this.actors.set(key, { key, id, x: from[0], foot: from[1], anim: 'walk', frame: 0, acc: 0, path: [], dir: 'north', target: to });
    this.moveTo(key, to[0], to[1], onArrive, 110);
  }
  // compatibilidade (API antiga)
  walk(key: string, id: string, _from: number, _to: number, _foot: number, _after: Anim, onArrive?: () => void) { onArrive?.(); void key; void id; }

  leave(key: string, to?: [number, number]) {
    const a = this.actors.get(key);
    if (!a) return;
    this.actors.delete(key);
    const k = `leaving-${key}-${Math.round(performance.now())}`;
    const dest = to ?? [ROOMS.galeria.rect[0] + 1560, ROOMS.galeria.rect[1] + 220];
    this.actors.set(k, { ...a, key: k, leaving: true, path: [] });
    this.moveTo(k, dest[0], dest[1], () => this.actors.delete(k), 110);
  }

  finishWalks() {
    for (const a of [...this.actors.values()]) if (a.path.length && !a.leaving) {
      const [x, y] = a.path[a.path.length - 1];
      a.x = x; a.foot = y; a.path = [];
      this.arrive(a);
    }
  }

  halt(key: string) { const a = this.actors.get(key); if (a) { a.path = []; a.onArrive = undefined; a.anim = 'idle'; } }
  // o rei deitado: some da cena (a cama já é o desenho) e o balão fica sobre ela
  private hidden = new Set<string>();
  setHidden(key: string, on: boolean) { this.ver++; if (on) this.hidden.add(key); else this.hidden.delete(key); }
  place(key: string, x: number, y: number) { const a = this.actors.get(key); if (a) { a.x = x; a.foot = y; a.path = []; } }
  hotspotStand(act: string): [number, number] | null { return this.world?.hotspots.find((h) => h.acts.includes(act))?.stand ?? null; }
  face(key: string, dir: TopDownDir) { const a = this.actors.get(key); if (a && !a.path.length) a.dir = dir; }
  remove(key: string) { this.actors.delete(key); this.ver++; }
  spawn(key: string, id: string, x: number, y: number, dir: TopDownDir = 'south') {
    this.actors.set(key, { key, id, x, foot: y, anim: 'idle', frame: 0, acc: 0, path: [], dir });
    this.ver++;
  }
  setAnim(key: string, anim: Anim) { const a = this.actors.get(key); if (a && !a.path.length) a.anim = anim; }

  // Caminho pela grade do castelo (contorna móveis, passa pelas portas)
  moveTo(key: string, x: number, y: number, onArrive?: () => void, speed = 150) {
    const a = this.actors.get(key);
    if (!a || !this.world) { onArrive?.(); return; }
    const path = findPath(this.world, a.x, a.foot, x, y);
    if (!path.length) { onArrive?.(); return; }
    a.path = path;
    a.onArrive = onArrive;
    a.speed = speed;
    a.anim = 'walk';
    if (key === 'rei') this.onKingMove?.();
  }

  private arrive(a: ActorState) {
    a.anim = 'idle';
    const cb = a.onArrive;
    a.onArrive = undefined;
    if (a.roam) a.wait = 3 + Math.random() * 6;
    cb?.();
  }

  // ---------- entrada ----------
  private toWorld(e: PointerEvent): [number, number] {
    const r = this.el.getBoundingClientRect();
    const cx = ((e.clientX - r.left) / r.width) * this.canvas.width;
    const cy = ((e.clientY - r.top) / r.height) * this.canvas.height;
    const k = this.cam.zoom;
    return [this.cam.x + cx / k, this.cam.y + cy / k];
  }

  private onPointer(e: PointerEvent) {
    const target = e.target as HTMLElement;
    if (!target.matches('canvas, .scene')) return;
    if (!this.world) return;
    const [x, y] = this.toWorld(e);
    this.onWorldTap?.();
    // pessoas primeiro
    const hit = [...this.actors.values()].filter((a) => a.key.startsWith('npc-') || a.key === 'rei' || a.key.startsWith('comp-'))
      .sort((a, b) => b.foot - a.foot)
      .find((a) => Math.abs(a.x - x) < 30 && y > a.foot - 96 && y < a.foot + 10);
    if (hit && this.onTap) { this.onTap(hit.key); return; }
    const h = this.world.hotspotAt(x, y);
    if (h && this.onHotspot) { this.onHotspot(h); return; }
    if (!this.movementEnabled) return;
    this.moveTo('rei', x, y);
  }

  // ---------- quadro ----------
  private loop = (now: number) => {
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    for (const a of [...this.actors.values()]) this.step(a, dt);
    const king = this.actors.get('rei');
    if (king && this.world) {
      const r = roomAt(king.x, king.foot);
      // compara com o cômodo que o jogo acha que o rei está (não com o último quadro visto)
      const cur = this.currentRoom?.() ?? this.kingRoom;
      if (r && r !== cur) { const first = this.kingRoom === null && !this.currentRoom; this.kingRoom = r; if (!first) this.onKingRoom?.(r); }
      else if (r) this.kingRoom = r;
    }
    // Só redesenha quando algo mudou: alguém andando, a câmera deslizando, um
    // balão, um marcador novo. Parado de dia, o quadro anterior continua valendo;
    // à noite as velas tremulam a 12 quadros por segundo. Atrás de uma tela
    // (cena borrada), no máximo 4 quadros por segundo.
    const dim = this.el.classList.contains('dim');
    if (now - this.lastDraw < (dim ? 250 : 30)) return;
    const sig = this.signature();
    const flicker = this.night > 0 && !dim && now - this.lastDraw >= 80;
    if (sig === this.lastSig && !flicker && !this.bubbles.size && now - this.lastDraw < 2000) return;
    this.lastSig = sig;
    this.lastDraw = now;
    const t0 = performance.now();
    this.draw(now);
    this.adapt(performance.now() - t0);
  };

  // Aparelho fraco: se o desenho médio passa de 16 ms, a cena cai para 85% e
  // depois 70% da resolução (o navegador estica). Em aparelho bom nada muda.
  private res = 1;
  private cost = 0;
  private draws = 0;
  private adapt(ms: number) {
    this.draws++;
    this.cost = this.draws === 1 ? ms : this.cost * 0.9 + ms * 0.1;
    if (this.draws < 30 || this.res <= 0.7) return;
    if (this.cost > 16) { this.res = this.res > 0.85 ? 0.85 : 0.7; this.draws = 0; this.ver++; }
  }
  get resolution() { return this.res; }

  private lastSig = '';
  private ver = 0; // muda a cada chamada que altera a cena por fora
  private signature() {
    const c = this.cam;
    let s = `${this.ver}|${this.panel}|${this.world ? 1 : 0}|${this.canvas.width}x${this.canvas.height}|${this.el.offsetWidth}x${this.el.offsetHeight}|${c.x.toFixed(1)},${c.y.toFixed(1)}|${this.zoomMul}|${this.night}`;
    // só conta quem aparece na tela (um guarda andando no outro lado do castelo não pede quadro novo)
    for (const a of this.actors.values()) {
      if (a.x < c.x - 80 || a.x > c.x + c.vw + 80 || a.foot < c.y - 20 || a.foot > c.y + c.vh + 140) continue;
      s += `|${a.key}:${a.x | 0},${a.foot | 0},${a.dir},${a.anim},${a.anim === 'walk' ? a.frame : 0}`;
    }
    const king = this.actors.get('rei');
    if (king || this.focusPoint) s += `|f${this.focusPoint?.join(',') ?? ''}`;
    return s;
  }
  /** avisa o laço que algo mudou por fora (marcadores, balões, modo) */
  touch() { this.ver++; }

  resetKingRoom(r: RoomId) { this.kingRoom = r; }

  private step(a: ActorState, dt: number) {
    if (a.roam && !a.path.length && a.wait !== undefined) {
      a.wait -= dt;
      if (a.wait <= 0) {
        const [lo, hi] = a.roam;
        let to = lo + Math.random() * (hi - lo);
        if (Math.abs(to - a.x) < 40) to = a.x < (lo + hi) / 2 ? hi : lo;
        a.wait = 999;
        this.moveTo(a.key, to, a.foot, () => { a.wait = 3 + Math.random() * 6; }, 45);
      }
    }
    if (a.path.length) {
      const [tx, ty] = a.path[0];
      const dx = tx - a.x, dy = ty - a.foot, d = Math.hypot(dx, dy);
      const stepLen = (a.speed ?? 150) * dt;
      if (Math.abs(dy) > Math.abs(dx)) a.dir = dy < 0 ? 'north' : 'south'; else if (d > 0.5) a.dir = dx < 0 ? 'west' : 'east';
      if (d <= stepLen) {
        a.x = tx; a.foot = ty; a.path.shift();
        if (!a.path.length) this.arrive(a);
      } else { a.x += (dx / d) * stepLen; a.foot += (dy / d) * stepLen; }
      a.anim = a.path.length ? 'walk' : a.anim;
    }
    a.acc += dt * (FPS[a.anim] ?? 1);
    if (a.acc >= 1) { a.acc -= 1; a.frame = (a.frame + 1) % 6; }
  }

  private fitCanvas() {
    const w = Math.round((this.el.offsetWidth || 1280) * this.res), h = Math.round((this.el.offsetHeight || 720) * this.res);
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
  }

  private updateCamera() {
    const c = this.cam;
    c.zoom = (this.canvas.height / 1000) * this.zoomMul;
    c.vw = this.canvas.width / c.zoom; c.vh = this.canvas.height / c.zoom;
    const king = this.actors.get('rei');
    const [fx, fy] = this.focusPoint ?? (king ? [king.x, king.foot - 60] : [1600, 400]);
    // com o painel de diálogo aberto à direita, o foco fica no meio da parte visível
    const tx = Math.max(-80, Math.min(WORLD_W + 80 - c.vw, fx - (c.vw * (1 - this.panel)) / 2));
    const ty = Math.max(-80, Math.min(WORLD_H + 80 - c.vh, fy - c.vh / 2));
    const k = Math.abs(tx - c.x) > 1500 || Math.abs(ty - c.y) > 1500 ? 1 : 0.14;
    if (!Number.isFinite(c.x) || !Number.isFinite(c.y)) { c.x = tx; c.y = ty; }
    c.x += (tx - c.x) * k; c.y += (ty - c.y) * k;
  }

  private draw(now: number) {
    this.fitCanvas();
    this.updateCamera();
    const c = this.ctx, cam = this.cam, w = this.world;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#10131b'; c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (!w) return;
    c.setTransform(cam.zoom, 0, 0, cam.zoom, -cam.x * cam.zoom, -cam.y * cam.zoom);
    c.imageSmoothingEnabled = true;
    w.drawBackgroundCached(c, cam, this.night);
    // objetos e pessoas, por profundidade
    const inView = (x: number, y: number, ww: number, hh: number) => x < cam.x + cam.vw && x + ww > cam.x && y < cam.y + cam.vh && y + hh > cam.y;
    const items: { depth: number; draw: () => void }[] = [];
    for (const o of w.objects) if (inView(o.x, o.y, o.w, o.h)) items.push({ depth: o.depth, draw: () => o.draw(c) });
    for (const a of this.actors.values()) if (inView(a.x - 50, a.foot - 110, 100, 120)) items.push({ depth: a.foot, draw: () => this.drawActor(a) });
    items.sort((p, q) => p.depth - q.depth);
    for (const it of items) it.draw();
    w.drawTints(c, cam);
    w.drawLights(c, cam, now, this.night);
    c.setTransform(1, 0, 0, 1, 0, 0);
    this.placeOverlays();
  }

  private drawActor(a: ActorState) {
    if (this.hidden.has(a.key)) return;
    const src = getTopDownFrame(a.id, a.dir, a.frame, a.anim);
    if (!src) return;
    const c = this.ctx;
    const k = DRAW_SCALE * (a.id === 'guarda' || a.id === 'rhoswen' || a.id === 'sentinela' ? 1.08 : 1);
    const w = TOPDOWN_CELL_W * k, h = TOPDOWN_CELL_H * k;
    c.fillStyle = 'rgba(10,6,16,.32)';
    c.beginPath(); c.ellipse(a.x, a.foot, 14, 4, 0, 0, Math.PI * 2); c.fill();
    c.drawImage(src.src, src.sx, src.sy, src.sw, src.sh, a.x - w / 2, a.foot - TOPDOWN_FOOT * k, w, h);
  }

  // marcadores e balões acompanham a câmera
  private placeOverlays() {
    const cam = this.cam, W = this.canvas.width || 1, H = this.canvas.height || 1;
    const toPct = (x: number, y: number) => [((x - cam.x) * cam.zoom / W) * 100, ((y - cam.y) * cam.zoom / H) * 100];
    // nomes acompanham quem anda e não se amontoam
    const placed: [number, number][] = [];
    this.markers.forEach((m, i) => {
      const el = this.markerEls[i];
      if (!el) return;
      let mx = m.x, my = m.y;
      const a = m.kind === 'pessoa' ? this.actors.get(m.key) : undefined;
      if (a) { mx = a.x; my = a.foot - 104; }
      if (m.kind === 'pessoa') {
        while (placed.some(([x, y]) => Math.abs(x - mx) < 64 && Math.abs(y - my) < 20)) my -= 22;
        placed.push([mx, my]);
      }
      if (m.kind === 'acao') return; // menus de ação: empilhados em pixels logo abaixo
      const [px, py] = toPct(mx, my);
      el.style.left = `${px}%`; el.style.top = `${py}%`;
      el.style.display = px < -5 || px > 105 || py < -5 || py > 105 ? 'none' : '';
    });
    // Menus de ação: a coluna é montada em pixels de tela (o zoom do celular
    // não pode apertar os botões uns sobre os outros) e nunca sai da tela.
    const LW = this.markerLayer.offsetWidth || 1, LH = this.markerLayer.offsetHeight || 1;
    const groups = new Map<string, number[]>();
    this.markers.forEach((m, i) => { if (m.kind === 'acao') { const g = m.key.split('-')[0]; groups.set(g, [...(groups.get(g) ?? []), i]); } });
    for (const idx of groups.values()) {
      const els = idx.map((i) => this.markerEls[i]).filter(Boolean);
      if (!els.length) continue;
      const hs = els.map((e) => e.offsetHeight || 30);
      const gap = 6;
      const total = hs.reduce((a, b) => a + b + gap, -gap);
      const ws = Math.max(...els.map((e) => e.offsetWidth || 120));
      const first = this.markers[idx[0]];
      const [px, py] = toPct(first.x, first.y);
      let top = (py / 100) * LH - hs[0] / 2;
      let cx = (px / 100) * LW;
      const bottomSafe = LH - 64; // a barra de baixo (Agenda, Castelo, Ações…)
      top = Math.max(56, Math.min(top, bottomSafe - total));
      cx = Math.max(ws / 2 + 8, Math.min(LW - ws / 2 - 8, cx));
      let y = top;
      els.forEach((el, k) => {
        el.style.left = `${cx}px`; el.style.top = `${y + hs[k] / 2}px`; el.style.display = '';
        y += hs[k] + gap;
      });
    }
    const now = performance.now();
    for (const [key, b] of this.bubbles) {
      const a = this.actors.get(key);
      if (!a || now > b.until || this.el.classList.contains('dim')) { b.el.remove(); this.bubbles.delete(key); continue; }
      const [px, py] = toPct(a.x, a.foot - 110);
      b.el.style.left = `${Math.max(6, Math.min(94, px))}%`; b.el.style.top = `${Math.max(8, py)}%`;
    }
  }
}

// ---------- caminho (A* com heap, 8 direções, sem cortar quinas) ----------
function findPath(w: CastleWorld, x: number, y: number, tx: number, ty: number): [number, number][] {
  const { cell, cols, rows, grid } = w;
  const ok = (cx: number, cy: number) => cx >= 0 && cy >= 0 && cx < cols && cy < rows && grid[cy * cols + cx] === 1;
  let sx = Math.floor(x / cell), sy = Math.floor(y / cell);
  let ex = Math.floor(tx / cell), ey = Math.floor(ty / cell);
  const near = (cx: number, cy: number): [number, number] | null => {
    if (ok(cx, cy)) return [cx, cy];
    for (let r = 1; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) === r || Math.abs(dy) === r) if (ok(cx + dx, cy + dy)) return [cx + dx, cy + dy];
    return null;
  };
  const s = near(sx, sy), e = near(ex, ey);
  if (!s || !e) return [];
  [sx, sy] = s; [ex, ey] = e;
  const N = cols * rows;
  const g = new Float32Array(N).fill(Infinity);
  const came = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const heap: [number, number][] = [];
  const push = (f: number, i: number) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0]; const last = heap.pop()!; if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  const h = (cx: number, cy: number) => { const dx = Math.abs(cx - ex), dy = Math.abs(cy - ey); return Math.max(dx, dy) + 0.41 * Math.min(dx, dy); };
  const start = sy * cols + sx, end = ey * cols + ex;
  g[start] = 0; push(h(sx, sy), start);
  let found = false, guard = 0;
  while (heap.length && guard++ < 60000) {
    const [, i] = pop();
    if (closed[i]) continue;
    closed[i] = 1;
    if (i === end) { found = true; break; }
    const cx = i % cols, cy = (i / cols) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy;
      if (!ok(nx, ny) || (dx && dy && (!ok(cx + dx, cy) || !ok(cx, cy + dy)))) continue;
      const ni = ny * cols + nx, ng = g[i] + (dx && dy ? 1.41 : 1);
      if (ng >= g[ni]) continue;
      g[ni] = ng; came[ni] = i; push(ng + h(nx, ny), ni);
    }
  }
  if (!found) return [];
  const cells: [number, number][] = [];
  for (let i = end; i !== -1 && i !== start; i = came[i]) cells.push([(i % cols) * cell + cell / 2, ((i / cols) | 0) * cell + cell / 2]);
  cells.reverse();
  // o destino exato, se der para ficar lá
  if (w.walkable(tx, ty)) cells.push([tx, ty]);
  // simplifica: pula pontos enquanto a linha reta continua andável
  const out: [number, number][] = [];
  let from: [number, number] = [x, y];
  let k = 0;
  while (k < cells.length) {
    let far = k;
    for (let j = cells.length - 1; j > k; j--) if (clear(w, from, cells[j])) { far = j; break; }
    out.push(cells[far]); from = cells[far]; k = far + 1;
  }
  return out;
}

function clear(w: CastleWorld, a: [number, number], b: [number, number]) {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.ceil(d / (w.cell / 2));
  for (let i = 1; i < n; i++) if (!w.walkable(a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n)) return false;
  return true;
}
