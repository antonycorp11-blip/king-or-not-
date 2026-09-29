import type { GameState, Good, ProvinceId } from '../types';
import { GOODS, HOUSES, PROVINCES } from '../data/realm';
import { computeEconomy, production, taxKey } from '../engine/economy';
import { armyAt, tension, tensionLabel } from '../engine/army';
import { levyUnits } from '../engine/war';
import type { HouseId } from '../types';
import { ISLAND, SEEDS, WH, WW, cellAt, routePath, world, type Cell } from '../render/worldmap';
import { hexToRgb, iconUrl, mix } from '../render/pixel';

// Mesa de guerra: diorama em perspectiva, com filtros de cor, estandartes em pé e movimento.
export type Lens = 'casas' | 'lealdade' | 'producao' | 'escassez' | 'rotas' | 'impostos' | 'guerra' | 'exercito';

export interface MapView {
  lens: Lens;
  good?: Good;
  selected?: ProvinceId | null;
  target?: ProvinceId | null; // guerra: alvo do ataque
  targets?: ProvinceId[]; // guerra: vizinhos atacáveis
  clash?: ProvinceId | null; // guerra: efeito de batalha
}

interface Caravan {
  path: [number, number][];
  color: string;
  sea: boolean;
  offset: number;
}

const pct = (x: number, y: number) => `left:${(x / WW) * 100}%;top:${(y / WH) * 100}%`;
const ALL: ProvinceId[] = Object.keys(SEEDS) as ProvinceId[];

export class WorldMap {
  el: HTMLElement;
  private plane: HTMLElement;
  private overlay: HTMLCanvasElement;
  private selectC: HTMLCanvasElement;
  private hoverC: HTMLCanvasElement;
  private anim: HTMLCanvasElement;
  private html: HTMLElement;
  private caravans: Caravan[] = [];
  private hover: Cell | null = null;
  private lastKey = '';
  private lastFrame = 0;
  onPick: ((id: ProvinceId) => void) | null = null;

  constructor() {
    const w = world();
    this.el = document.createElement('div');
    this.el.className = 'wm';
    this.el.innerHTML = `
      <div class="wm-table">
        <div class="wm-plane">
          <canvas class="pix wm-terrain"></canvas>
          <canvas class="pix wm-overlay"></canvas>
          <canvas class="pix wm-anim"></canvas>
          <canvas class="pix wm-hover"></canvas>
          <canvas class="pix wm-select"></canvas>
          <div class="wm-clouds"><i></i><i></i><i></i></div>
          <div class="wm-html"></div>
        </div>
      </div>`;
    this.plane = this.el.querySelector('.wm-plane')!;
    const terrain = this.el.querySelector<HTMLCanvasElement>('.wm-terrain')!;
    terrain.width = WW;
    terrain.height = WH;
    terrain.getContext('2d')!.drawImage(w.terrain, 0, 0);
    this.overlay = this.el.querySelector('.wm-overlay')!;
    this.selectC = this.el.querySelector('.wm-select')!;
    this.hoverC = this.el.querySelector('.wm-hover')!;
    this.anim = this.el.querySelector('.wm-anim')!;
    for (const c of [this.overlay, this.selectC, this.hoverC, this.anim]) {
      c.width = WW;
      c.height = WH;
    }
    this.html = this.el.querySelector('.wm-html')!;

    const terrainEl = this.plane;
    terrainEl.addEventListener('mousemove', (e) => {
      const cell = this.cellFromEvent(e);
      if (cell !== this.hover) {
        this.hover = cell;
        this.drawHover();
      }
    });
    terrainEl.addEventListener('mouseleave', () => {
      this.hover = null;
      this.drawHover();
    });
    terrainEl.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('[data-act]')) return;
      const cell = this.cellFromEvent(e);
      if (cell && cell !== 'mar' && cell !== 'veridian') this.onPick?.(cell);
    });
    // leve paralaxe com o mouse: a mesa "respira"
    this.el.addEventListener('mousemove', (e) => {
      const r = this.el.getBoundingClientRect();
      this.el.style.setProperty('--px', (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
      this.el.style.setProperty('--py', (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
    });
    requestAnimationFrame(this.loop);
  }

  mount(slot: HTMLElement | null) {
    if (slot && this.el.parentElement !== slot) slot.appendChild(this.el);
  }

  private cellFromEvent(e: MouseEvent): Cell | null {
    const c = this.plane.querySelector<HTMLCanvasElement>('.wm-terrain')!;
    // offsetX/Y já vêm no espaço local do plano (inclui a perspectiva)
    const x = (e.offsetX / c.clientWidth) * WW;
    const y = (e.offsetY / c.clientHeight) * WH;
    if (e.target !== c && !(e.target as HTMLElement).matches('canvas')) return null;
    return cellAt(x, y);
  }

  update(s: GameState, v: MapView) {
    const key = JSON.stringify([v, s.loyalty, s.taxes, s.routes, s.res.povo, s.investments, s.war?.territories, s.spouse, s.flags.armyAt, s.day]);
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.drawOverlay(s, v);
      this.drawSelect(v.selected ?? null, v.target ?? null);
    }
    this.el.dataset.lens = v.lens;
    // caravanas das rotas comerciais
    this.caravans = [];
    if (v.lens !== 'guerra' && v.lens !== 'exercito') {
      const eco = computeEconomy(s);
      eco.routes.forEach((r, k) => {
        if (r.amount <= 0) return;
        const to = r.route.to === 'celeiro' ? 'castelmar' : r.route.to;
        if (to === r.route.from) return; // grão guardado no próprio celeiro da capital
        const path = routePath(r.route.from, to);
        this.caravans.push({ path, color: GOODS_COLOR[r.route.good], sea: r.route.to === 'veridian', offset: k * 0.37 });
      });
    }
    this.html.innerHTML = this.htmlLayer(s, v);
  }

  // ---------- camadas ----------
  private tintFor(s: GameState, v: MapView): Partial<Record<Cell, [string, number]>> {
    const t: Partial<Record<Cell, [string, number]>> = {};
    const eco = computeEconomy(s);
    const scale = (val: number) => (val >= 0 ? mix('#e8c848', '#3aa84a', Math.min(1, val / 60)) : mix('#e8c848', '#c83a2a', Math.min(1, -val / 60)));
    for (const id of ALL) {
      const north = PROVINCES[id].kingdom === 'norhelm';
      const house = HOUSES[PROVINCES[id].house];
      const key = taxKey(id);
      switch (v.lens) {
        case 'casas': t[id] = [house.color, north ? 0.25 : 0.34]; break;
        case 'lealdade': t[id] = north ? ['#4a5a78', 0.35] : [scale(key === 'coroa' ? (s.res.povo - 50) * 2 : s.loyalty[key]), 0.5]; break;
        case 'producao': {
          const n = north ? 0 : (production(s, id)[v.good ?? 'graos'] ?? 0);
          t[id] = n ? ['#f2c14e', 0.18 + Math.min(0.5, n * 0.1)] : ['#2a2a3a', 0.45];
          break;
        }
        case 'escassez': {
          if (north) { t[id] = ['#2a2a3a', 0.45]; break; }
          const miss = eco.shortages.filter((x) => x.province === id).reduce((a, x) => a + x.missing, 0);
          t[id] = miss ? ['#d83a2a', 0.3 + Math.min(0.3, miss * 0.08)] : ['#3aa84a', 0.35];
          break;
        }
        case 'impostos': t[id] = north ? ['#2a2a3a', 0.45] : [{ baixo: '#3aa84a', normal: '#e8c848', alto: '#d83a2a' }[s.taxes[key]], 0.42]; break;
        case 'rotas': t[id] = north ? ['#2a2a3a', 0.4] : ['#f0e0b0', 0.12]; break;
        case 'exercito': {
          if (north) { t[id] = ['#4a5a78', 0.35]; break; }
          const tv = tension(s, id);
          t[id] = [mix('#3aa84a', '#d83a2a', tv / 100), 0.28 + tv / 400];
          break;
        }
        case 'guerra': {
          const terr = s.war?.territories.find((x) => x.id === id);
          t[id] = terr ? (terr.owner === 'rei' ? ['#3a6ae0', 0.42] : [s.war!.enemy === 'norhelm' ? '#9aa4c0' : '#d83a2a', 0.5]) : ['#2a2a3a', 0.3];
          break;
        }
      }
    }
    t.veridian = v.lens === 'casas' || v.lens === 'rotas' ? [HOUSES.veridian.color, 0.22] : ['#2a2a3a', 0.35];
    return t;
  }

  private drawOverlay(s: GameState, v: MapView) {
    const w = world();
    const ctx = this.overlay.getContext('2d')!;
    const img = ctx.createImageData(WW, WH);
    const d = img.data;
    const tint = this.tintFor(s, v);
    const rgb = new Map<string, [number, number, number]>();
    for (let i = 0; i < w.grid.length; i++) {
      const cell = w.grid[i];
      const t = tint[cell];
      if (!t || cell === 'mar') continue;
      let c = rgb.get(t[0]);
      if (!c) rgb.set(t[0], (c = hexToRgb(t[0])));
      d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = Math.round(t[1] * 255);
    }
    for (const i of w.borders) { d[i * 4] = 40; d[i * 4 + 1] = 24; d[i * 4 + 2] = 12; d[i * 4 + 3] = 170; }
    ctx.putImageData(img, 0, 0);
  }

  private drawOutline(c: HTMLCanvasElement, cells: (Cell | null)[], color: string, glow = true) {
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, WW, WH);
    const w = world();
    ctx.fillStyle = color;
    for (const cell of cells) {
      if (!cell || cell === 'mar') continue;
      for (const i of w.outline[cell] ?? []) {
        const x = i % WW, y = (i / WW) | 0;
        ctx.fillRect(x, y, 1, 1);
        if (glow) { ctx.fillRect(x + 1, y, 1, 1); ctx.fillRect(x, y + 1, 1, 1); }
      }
    }
  }

  private drawSelect(sel: ProvinceId | null, target: ProvinceId | null) {
    this.drawOutline(this.selectC, [sel], '#fff0a0');
    if (target) {
      const ctx = this.selectC.getContext('2d')!;
      ctx.fillStyle = '#ff6a4a';
      for (const i of world().outline[target] ?? []) ctx.fillRect(i % WW, (i / WW) | 0, 2, 2);
    }
  }

  private drawHover() {
    this.drawOutline(this.hoverC, [this.hover], 'rgba(255,255,255,.75)', false);
    this.plane.style.cursor = this.hover && this.hover !== 'mar' && this.hover !== 'veridian' ? 'pointer' : 'default';
  }

  private htmlLayer(s: GameState, v: MapView): string {
    const eco = computeEconomy(s);
    const out: string[] = [];
    const war = v.lens === 'guerra' && s.war;
    for (const id of ALL) {
      const [x, y] = SEEDS[id];
      const P = PROVINCES[id];
      const H = HOUSES[P.house];
      const north = P.kingdom === 'norhelm';
      if (v.lens === 'exercito') {
        out.push(`<button class="wm-label ${north ? 'foe' : ''} ${v.target === id ? 'on' : ''}" style="${pct(x, y + 11)}" data-act="marchTo" data-arg="${id}">${P.name}</button>`);
        if (north) continue;
        const camp = armyAt(s) === id;
        const key = taxKey(id);
        const levy = key === 'coroa' ? 0 : levyUnits(s, key as HouseId) * 100;
        if (camp) out.push(`<button class="wm-army rei sel" style="${pct(x - 14, y - 4)}" data-act="marchTo" data-arg="${id}" title="Exército Real"><span class="stand"><img class="pix" src="${iconUrl('coroa')}" alt=""><b>${Math.round(s.res.exercito / 100)}</b></span></button>`);
        if (levy) out.push(`<span class="wm-levy" style="${pct(x + 14, y - 2)};--hc:${H.color}" title="Tropas da ${H.name}"><img class="pix" src="${iconUrl(H.sigil)}" alt=""><b>${levy / 100}</b></span>`);
        const tv = tension(s, id);
        out.push(`<span class="wm-badge tension-${tensionLabel(tv)}" style="${pct(x, y + 20)}">Tensão ${tensionLabel(tv)}</span>`);
        continue;
      }
      if (war) {
        const t = s.war!.territories.find((z) => z.id === id);
        if (!t) continue;
        const cls = [t.owner, v.selected === id ? 'sel' : '', v.target === id ? 'tgt' : '', v.targets?.includes(id) ? 'adj' : ''].join(' ');
        out.push(`<button class="wm-army ${cls}" style="${pct(x, y - 4)}" data-act="terr" data-arg="${id}"><span class="stand"><img class="pix" src="${iconUrl(t.owner === 'rei' ? 'coroa' : H.sigil)}" alt=""><b>${t.units}</b></span></button>`);
        out.push(`<span class="wm-label ${north ? 'foe' : ''}" style="${pct(x, y + 11)}">${P.name}</span>`);
        continue;
      }
      // estandarte da casa em pé sobre o castelo
      out.push(`<button class="wm-flag ${v.selected === id ? 'sel' : ''}" style="${pct(x + 7, y - 6)};--hc:${H.color};--hd:${H.dark}" data-act="prov" data-arg="${id}" title="${P.name}">
        <span class="stand"><i class="pole"></i><span class="cloth"><img class="pix" src="${iconUrl(H.sigil)}" alt=""></span></span></button>`);
      out.push(`<button class="wm-label ${north ? 'foe' : ''} ${v.selected === id ? 'on' : ''}" style="${pct(x, y + 11)}" data-act="prov" data-arg="${id}">${P.name}</button>`);
      if (north) continue;
      const key = taxKey(id);
      let badge = '';
      if (v.lens === 'lealdade') {
        const val = key === 'coroa' ? s.res.povo : s.loyalty[key];
        badge = `<b>${key === 'coroa' ? 'Povo ' : ''}${val}</b>`;
      } else if (v.lens === 'producao') {
        const n = production(s, id)[v.good ?? 'graos'] ?? 0;
        badge = n ? `<img class="pix" src="${iconUrl(GOODS[v.good ?? 'graos'].icon)}" alt=""><b>+${n}</b>` : '';
      } else if (v.lens === 'escassez') {
        const miss = eco.shortages.filter((z) => z.province === id);
        badge = miss.length ? miss.map((z) => `<img class="pix" src="${iconUrl(GOODS[z.good].icon)}" alt=""><b class="neg">−${z.missing}</b>`).join('') : '<b class="pos">✓</b>';
      } else if (v.lens === 'impostos') {
        badge = `<b>${s.taxes[key]}</b><small>+${eco.taxes[id]}</small>`;
      }
      if (badge) out.push(`<span class="wm-badge" style="${pct(x, y + 20)}">${badge}</span>`);
    }
    if (!war && v.lens !== 'exercito') {
      out.push(`<span class="wm-label foe" style="${pct(ISLAND[0], ISLAND[1] + 12)}">Véridian</span>`);
      out.push(`<span class="wm-realm" style="${pct(300, 72)}">Reino de Norhelm</span>`);
      out.push(`<span class="wm-realm home" style="${pct(230, 250)}">Reino de Castelmar</span>`);
    }
    // rota de marcha do exército real
    if (v.lens === 'exercito' && v.target && v.target !== armyAt(s)) {
      const [x0, y0] = SEEDS[armyAt(s)], [x1, y1] = SEEDS[v.target];
      const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 22;
      out.push(`<svg class="wm-arrows march" viewBox="0 0 ${WW} ${WH}" preserveAspectRatio="none"><path d="M${x0},${y0 - 8} Q${mx},${my} ${x1},${y1 - 8}" class="arrow-bg"/><path d="M${x0},${y0 - 8} Q${mx},${my} ${x1},${y1 - 8}" class="arrow"/></svg>`);
    }
    // setas de guerra (SVG no plano do mapa)
    if (war && v.selected && v.target) {
      const [x0, y0] = SEEDS[v.selected], [x1, y1] = SEEDS[v.target];
      const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 26;
      out.push(`<svg class="wm-arrows" viewBox="0 0 ${WW} ${WH}" preserveAspectRatio="none"><defs><marker id="ah" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#ffb03a" stroke="#2a0804" stroke-width=".8"/></marker></defs>
        <path d="M${x0},${y0 - 8} Q${mx},${my} ${x1},${y1 - 8}" class="arrow-bg"/><path d="M${x0},${y0 - 8} Q${mx},${my} ${x1},${y1 - 8}" class="arrow" marker-end="url(#ah)"/></svg>`);
    }
    if (war && v.clash) {
      const [x, y] = SEEDS[v.clash];
      out.push(`<span class="wm-clash" style="${pct(x, y)}"><i></i><i></i><i></i><i></i></span>`);
    }
    return out.join('');
  }

  // ---------- movimento ----------
  private loop = (now: number) => {
    requestAnimationFrame(this.loop);
    if (!this.el.isConnected) return;
    if (now - this.lastFrame < 70) return;
    this.lastFrame = now;
    const w = world();
    const ctx = this.anim.getContext('2d')!;
    ctx.clearRect(0, 0, WW, WH);
    const t = now / 1000;
    // brilho das ondas
    for (let k = 0; k < w.glints.length; k++) {
      const i = w.glints[k];
      const ph = Math.sin(t * 1.7 + k * 12.9898);
      if (ph > 0.93) {
        ctx.fillStyle = ph > 0.98 ? '#f4fbff' : 'rgba(220,240,255,.7)';
        ctx.fillRect(i % WW, (i / WW) | 0, 2, 1);
      }
    }
    // navios navegando
    const ships: [number, number, number, number][] = [
      [560, 150, 26, 0.07], [40, 250, 30, 0.05], [200, 290, 40, 0.04], [585, 110, 14, 0.09],
    ];
    ships.forEach(([cx, cy, r, sp], k) => {
      const a = t * sp + k * 2;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.35 + Math.sin(t * 2 + k) * 0.6;
      if (cellAt(x, y) !== 'mar') return;
      drawShip(ctx, Math.round(x), Math.round(y), Math.sin(a) < 0);
    });
    // caravanas e barcos mercantes nas rotas
    for (const c of this.caravans) {
      const n = c.path.length;
      if (n < 2) continue;
      for (let j = 0; j < 2; j++) {
        const f = ((t * 0.09 + c.offset + j * 0.5) % 1) * (n - 1);
        const [x, y] = c.path[Math.floor(f)];
        if (cellAt(x, y) === 'mar') drawShip(ctx, Math.round(x), Math.round(y) - 1, false, c.color);
        else {
          ctx.fillStyle = '#3a2418';
          ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 5, 3);
          ctx.fillStyle = c.color;
          ctx.fillRect(Math.round(x) - 1, Math.round(y) - 3, 3, 2);
          ctx.fillStyle = '#f0e0c0';
          ctx.fillRect(Math.round(x) + 2, Math.round(y) - 3, 1, 1);
        }
      }
    }
    // fumaça das chaminés das capitais
    for (const id of ['castelmar', 'hjalmgard', 'costa'] as ProvinceId[]) {
      const [x, y] = SEEDS[id];
      for (let k = 0; k < 4; k++) {
        const p = (t * 0.35 + k / 4) % 1;
        ctx.fillStyle = `rgba(230,230,235,${0.55 * (1 - p)})`;
        ctx.fillRect(Math.round(x - 12 + Math.sin(p * 6 + k) * 2), Math.round(y - 6 - p * 14), 2, 2);
      }
    }
    // gaivotas
    for (let k = 0; k < 3; k++) {
      const x = (t * 12 + k * 180) % (WW + 40) - 20, y = 170 + k * 30 + Math.sin(t + k) * 6;
      ctx.fillStyle = '#f4f4f4';
      const f = Math.sin(t * 8 + k) > 0 ? 1 : 0;
      ctx.fillRect(x - 2, y - f, 2, 1);
      ctx.fillRect(x + 1, y - f, 2, 1);
      ctx.fillRect(x, y, 1, 1);
    }
  };
}

const GOODS_COLOR: Record<Good, string> = { graos: '#e8c848', madeira: '#8a5a2a', ferro: '#a8a8b8', peixe: '#6ab4e0', vinho: '#8a3a9a', prata: '#e8e8f4' };

function drawShip(ctx: CanvasRenderingContext2D, x: number, y: number, flip: boolean, sail = '#f4ecdc') {
  ctx.fillStyle = '#5a3a1e';
  ctx.fillRect(x - 4, y, 9, 2);
  ctx.fillRect(x - 3, y + 2, 7, 1);
  ctx.fillStyle = '#3a2410';
  ctx.fillRect(x, y - 6, 1, 6);
  ctx.fillStyle = sail;
  ctx.fillRect(flip ? x - 3 : x + 1, y - 6, 3, 4);
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.fillRect(flip ? x + 5 : x - 6, y + 2, 2, 1);
}

