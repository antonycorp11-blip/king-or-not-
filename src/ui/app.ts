import type { GameState, Good, LogEntry, ScreenId } from '../types';
import { governabilidade, govLabel, influenceGain, load, newGame, save, clearSave, storeLocal } from '../engine/core';
import { athgGameStarted, athgReady, cloudLoad, inPortal } from '../engine/cloud';
import { computeEconomy } from '../engine/economy';
import { currentObjective, endDay, eventOf, pickNight, pushAudience, startDay, visibleAudiences } from '../engine/day';
import { unreadCount } from '../engine/letters';
import { loadCharacterAssets, setCrowned, type Expr } from '../render/actors';
import { companionsFor } from '../data/companions';
import { companionLine, guardLine, waitingLine } from '../data/banter';
import { portrait } from './common';
import { LAYOUT } from '../render/scenes';
import { iconImg } from '../render/pixel';
import { SceneView, type ActorSpec } from './sceneView';
import { WorldMap, type Lens } from './worldMap';
import { TIPS, HOW_TO_PLAY, type TipId } from './tips';
import * as Throne from './screens/throne';
import * as Library from './screens/library';
import * as King from './screens/king';
import * as Court from './screens/court';
import * as Provinces from './screens/provinces';
import * as War from './screens/war';
import { renderSummary, renderEnd, renderTitle } from './screens/meta';

export interface Dialog {
  uid: number;
  node: string;
  phase: 'entering' | 'talk';
  reply?: string;
  expr?: Expr;
  advice?: { who: string; text: string; choice: import('../types').Choice } | null;
  consulted?: boolean;
}

export interface UIState {
  screen: ScreenId | 'titulo';
  dialog: Dialog | null;
  useInfluence: boolean;
  province: string;
  warSel: string | null;
  warMode: 'reforcar' | 'atacar' | 'mover';
  warResult: string | null;
  summary: LogEntry[] | null;
  summaryDay: number;
  confirmEnd: boolean;
  help: boolean;
  lens: Lens;
  good: Good;
  cardOpen: boolean;
  armyOpen: boolean;
  warClash: string | null;
  courtTab?: 'pessoas' | 'correio';
}

export interface ScreenModule {
  render(app: App): string;
  handle?(app: App, act: string, arg: string, el: HTMLElement): boolean | void;
  after?(app: App): void;
}

const SCREENS: Record<ScreenId, ScreenModule> = {
  trono: Throne,
  biblioteca: Library,
  rei: King,
  corte: Court,
  provincias: Provinces,
  guerra: War,
};

export class App {
  s: GameState;
  ui: UIState;
  stage: HTMLElement;
  scene: SceneView;
  private root: HTMLElement;
  private worldMap: WorldMap | null = null;
  private seenArrivals = new Set<number>();
  private arrivalsDay = 0;

  constructor(host: HTMLElement) {
    this.stage = document.createElement('div');
    this.stage.id = 'stage';
    host.appendChild(this.stage);
    this.scene = new SceneView(this.stage);
    this.root = document.createElement('div');
    this.root.id = 'ui';
    this.stage.appendChild(this.root);
    this.s = load() ?? newGame();
    this.ui = { screen: 'titulo', dialog: null, useInfluence: false, province: 'castelmar', warSel: null, warMode: 'reforcar', warResult: null, summary: null, summaryDay: 0, confirmEnd: false, help: false, lens: 'casas', good: 'graos', cardOpen: true, armyOpen: false, warClash: null };
    this.stage.addEventListener('click', (e) => this.onClick(e));
    window.addEventListener('resize', () => this.fit());
    window.addEventListener('orientationchange', () => window.setTimeout(() => this.fit(), 250));
    window.visualViewport?.addEventListener('resize', () => this.fit());
    this.fit();
    this.render();
    // o salão tem vida: guardas, quem espera e o conselheiro comentam de tempos em tempos
    window.setInterval(() => this.lifeTick(), 1000);
    // Portal ATHG: avisa que carregou e busca o save da conta (vale o mais recente)
    document.documentElement.classList.toggle('embedded', inPortal());
    athgReady();
    void cloudLoad().then((cloud) => {
      if (!cloud) {
        const local = load();
        if (local) save(local); // primeiro acesso depois da atualização: sobe o progresso atual para a conta
        return;
      }
      const local = load();
      if (!local || (cloud.savedAt ?? 0) > (local.savedAt ?? 0)) {
        storeLocal(cloud);
        if (this.ui.screen === 'titulo') this.render();
      }
    });
    // pré-gera o mapa-diorama em segundo plano (leva ~1,5s)
    window.setTimeout(() => void this.map, 1200);
    // quando a arte gerada existir em assets/personagens, ela substitui os bonecos provisórios
    loadCharacterAssets(() => {
      this.scene.refreshRoom();
      this.render();
    });
  }

  // o mapa é criado uma vez e reaproveitado entre as telas (mantém canvases e animação)
  get map(): WorldMap {
    return (this.worldMap ??= new WorldMap());
  }

  // Escala o palco para a tela. Computador: 1920x1080. Celular deitado: palco menor (1280 de largura)
  // e proporcional à tela, com layout compacto, para o texto continuar legível.
  fit() {
    const host = this.stage.parentElement;
    const w = host?.clientWidth || window.innerWidth;
    const h = host?.clientHeight || window.innerHeight;
    const mobile = Math.min(w, h) <= 540;
    const root = document.documentElement;
    root.classList.toggle('m', mobile);
    root.classList.toggle('portrait', mobile && h > w);
    let W = 1920;
    let H = 1080;
    if (mobile) {
      const long = Math.max(w, h), short = Math.min(w, h);
      W = 1280;
      H = Math.round(Math.max(560, Math.min(720, (1280 * short) / long)));
    }
    this.stage.style.width = `${W}px`;
    this.stage.style.height = `${H}px`;
    const k = Math.min(w / W, h / H);
    this.stage.style.transform = `translate(-50%, -50%) scale(${k})`;
  }

  hasSave() {
    return !!load();
  }

  newGame(name: string) {
    clearSave();
    this.s = newGame(name || 'Edric');
    startDay(this.s);
    athgGameStarted();
    this.ui.screen = 'trono';
    this.ui.dialog = null;
    this.render();
    this.autoOpenUrgent();
  }

  continueGame() {
    const s = load();
    if (!s) return;
    this.s = s;
    if (!s.dayStart) startDay(s);
    this.ui.screen = 'trono';
    if (s.flags.nightPending) {
      const night = s.audiences.find((a) => eventOf(a)?.kind === 'noite' && a.expires === s.day);
      if (night && !night.done) {
        this.render();
        return Throne.openAudience(this, night.uid);
      }
      return this.doEndDay();
    }
    this.render();
  }

  go(screen: ScreenId) {
    if (this.ui.dialog && !this.ui.dialog.reply) {
      this.toast('Termine a audiência antes de sair do salão.');
      return;
    }
    if (this.ui.dialog) Throne.dismissSpeaker(this);
    this.ui.dialog = null;
    this.ui.screen = screen;
    this.render();
  }

  // avisos empilhados: um aviso não apaga o outro
  toast(msg: string) {
    let box = this.stage.querySelector<HTMLElement>('.toasts');
    if (!box) {
      box = document.createElement('div');
      box.className = 'toasts';
      this.stage.appendChild(box);
    }
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    box.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    window.setTimeout(() => {
      t.classList.remove('show');
      window.setTimeout(() => t.remove(), 400);
    }, 3200);
  }

  // ---------- fim do dia ----------
  requestEndDay() {
    const pending = visibleAudiences(this.s).filter((a) => a.expires <= this.s.day).length;
    if (pending && !this.ui.confirmEnd) {
      this.ui.confirmEnd = true;
      this.render();
      return;
    }
    this.doEndDay();
  }

  doEndDay() {
    this.ui.confirmEnd = false;
    const s = this.s;
    if (s.flags.nightDay !== s.day) {
      s.flags.nightDay = s.day;
      const night = pickNight(s);
      if (night) {
        pushAudience(s, night.id, 21);
        const a = s.audiences.find((x) => x.eventId === night.id && !x.done);
        if (a) {
          s.flags.nightPending = true;
          this.ui.screen = 'trono';
          this.toast('Antes de dormir, alguém o aborda no corredor...');
          return Throne.openAudience(this, a.uid);
        }
      }
    }
    s.flags.nightPending = false;
    this.ui.dialog = null;
    const day = this.s.day;
    const entries = endDay(this.s);
    this.ui.summary = entries;
    this.ui.summaryDay = day;
    this.render();
  }

  closeSummary() {
    this.ui.summary = null;
    this.ui.screen = 'trono';
    save(this.s);
    this.render();
    this.autoOpenUrgent();
  }

  autoOpenUrgent() {
    if (this.s.ended || this.ui.screen !== 'trono' || this.ui.dialog || this.needsCompanion()) return;
    const urgent = visibleAudiences(this.s).find((a) => eventOf(a).kind === 'urgente');
    if (urgent) Throne.openAudience(this, urgent.uid);
  }

  // ---------- tutorial ----------
  tipsOff() {
    return !!this.s.flags.tipsOff;
  }

  private pendingTip(): TipId | null {
    if (this.tipsOff() || this.ui.screen === 'titulo') return null;
    const s = this.s;
    const want: TipId[] = [];
    if (this.ui.summary) want.push('resumo');
    else if (this.ui.screen === 'trono') {
      if (this.ui.dialog?.phase === 'talk' && !this.ui.dialog.reply) want.push('dialogo');
      else if (!this.ui.dialog) want.push('inicio', ...(s.day >= 2 ? (['influencia'] as TipId[]) : []), ...(visibleAudiences(s).length < s.audiences.filter((a) => !a.done).length ? (['chegada'] as TipId[]) : []));
    } else {
      want.push(this.ui.screen as TipId);
      if (this.ui.screen === 'provincias' && computeEconomy(s).shortages.some((x) => x.province === this.ui.province)) want.push('escassez');
    }
    return want.find((t) => TIPS[t] && !s.flags[`tip_${t}`]) ?? null;
  }

  private tipHtml() {
    if (this.ui.help) {
      return `<div class="modal-back"><div class="parchment modal help">
        <h2>Como jogar</h2>${HOW_TO_PLAY}
        <div class="row"><button class="btn" data-act="tipsToggle">${this.tipsOff() ? 'Reativar dicas' : 'Desativar dicas'}</button><button class="btn primary" data-act="closeHelp">Fechar</button></div>
      </div></div>`;
    }
    const id = this.pendingTip();
    if (!id) return '';
    const t = TIPS[id];
    return `<div class="tip parchment tip-${t.pos ?? 'center'}">
      <div class="tip-head">${iconImg('pergaminho', 'ico-lg')}<h3>${t.title}</h3></div>
      <p>${t.text}</p>
      <div class="row"><button class="btn sm" data-act="tipsOff">Desativar dicas</button><button class="btn primary sm" data-act="tipOk" data-arg="${id}">Entendi</button></div>
    </div>`;
  }

  // ---------- render ----------
  render() {
    const s = this.s;
    const ui = this.ui;
    if (ui.screen === 'titulo') {
      this.scene.setRoom('trono');
      this.scene.setHour(17.5);
      this.scene.sync(this.throneActors());
      this.scene.setMode('dim');
      this.root.innerHTML = renderTitle(this);
      return;
    }
    this.stage.classList.remove('talking');
    if (ui.summary) {
      this.scene.setHour(20.5);
      this.scene.setMode('full');
      this.root.innerHTML = renderSummary(this) + this.tipHtml();
      return;
    }
    if (s.ended) {
      this.scene.setHour(20);
      this.scene.setMode('dim');
      this.root.innerHTML = renderEnd(this);
      return;
    }
    this.checkArrivals();
    setCrowned(s.spouse ? [s.spouse] : []);
    this.stage.classList.toggle('talking', ui.screen === 'trono' && !!ui.dialog);
    const screen = ui.screen as ScreenId;
    this.scene.setHour(s.flags.nightPending ? 20.6 : s.hour);
    const mod = SCREENS[screen];
    if (screen !== 'biblioteca') this.scene.setRoom('trono');
    if (screen !== 'trono' && screen !== 'biblioteca') this.scene.sync(this.throneActors());
    this.root.innerHTML = this.topbar() + `<div class="screen screen-${screen}">${mod.render(this)}</div>` + this.confirmModal() + (this.needsCompanion() ? this.companionModal() : this.tipHtml());
    mod.after?.(this);
  }

  // Personagens fixos do salão: rei no trono, guardas, rainha e rainha-mãe.
  // Personagens fixos do salão: rei no trono, quem está ao seu lado e a guarda ao fundo.
  throneActors(exclude: string[] = []): ActorSpec[] {
    const s = this.s;
    const list: ActorSpec[] = [
      { key: 'rei', id: 'rei', x: LAYOUT.throneX, foot: LAYOUT.daisY, facing: -1, anim: 'seated' },
      // guardas ao fundo, junto à parede, patrulhando (menores e mais escuros = mais longe)
      { key: 'guard1', id: 'guarda', x: 150, foot: 146, facing: 1, anim: 'idle', scale: 0.72, dim: 0.3, roam: [118, 250] },
      { key: 'guard2', id: 'guarda', x: 168, foot: 148, facing: 1, anim: 'idle', scale: 0.75, dim: 0.26, roam: [140, 290] },
      { key: 'guard3', id: 'guarda', x: 330, foot: 148, facing: -1, anim: 'idle', scale: 0.75, dim: 0.26, roam: [292, 352] },
    ];
    // quem está ao lado do trono fica de pé atrás e à direita dele, como na corte de verdade
    const comp = s.flags.companion as string | undefined;
    if (comp && !exclude.includes(comp)) list.push({ key: `comp-${comp}`, id: comp, x: 462, foot: 154, facing: -1, anim: 'idle', scale: 0.96 });
    return list;
  }

  private lifeClock = 6;

  private lifeTick() {
    const s = this.s;
    const d = this.ui.dialog;
    if (this.ui.screen !== 'trono' || this.ui.summary || s.ended || this.needsCompanion() || (d && !d.reply)) return;
    if (--this.lifeClock > 0) return;
    this.lifeClock = 8 + Math.floor(Math.random() * 7);
    const r = Math.random();
    const comp = s.flags.companion as string | undefined;
    const waiting = this.scene.keys('wait-');
    if (r < 0.2 && comp && !d && this.scene.has(`comp-${comp}`)) this.scene.say(`comp-${comp}`, companionLine(s, comp));
    else if (r < 0.38 && waiting.length) this.scene.say(waiting[Math.floor(Math.random() * waiting.length)], waitingLine());
    else {
      const guards = this.scene.keys('guard');
      if (guards.length) this.scene.say(guards[Math.floor(Math.random() * guards.length)], guardLine(s));
    }
  }

  needsCompanion() {
    const s = this.s;
    return this.ui.screen === 'trono' && !this.ui.summary && !s.ended && !s.flags.nightPending && s.flags.compDay !== s.day;
  }

  private companionModal() {
    if (!this.needsCompanion()) return '';
    const s = this.s;
    const opts = companionsFor(s);
    return `<div class="modal-back"><div class="parchment modal companion-pick">
      <h2>Quem fica ao seu lado hoje?</h2>
      <p class="sub">Quem senta ao lado do trono pode ser consultado nas audiências e traz novas saídas, mas cada um puxa a coroa para o próprio lado.</p>
      <div class="comp-cards">${opts.map((c) => `<button class="comp-card" data-act="pickCompanion" data-arg="${c.id}">
        ${portrait(c.id, 'comp-portrait')}
        <b>${c.id === 'isabelle' ? 'Isabelle' : c.id === 'aldric' ? 'Aldric' : s.spouse === c.id ? 'A Rainha' : c.id}</b><small class="role">${c.role} · relação ${s.rel[c.id] ?? 0}</small>
        <p>${c.intent}</p><em>${c.bonus}</em>
      </button>`).join('')}</div>
    </div></div>`;
  }

  private checkArrivals() {
    const s = this.s;
    const vis = visibleAudiences(s);
    if (this.arrivalsDay !== s.day) {
      this.arrivalsDay = s.day;
      this.seenArrivals = new Set(vis.map((a) => a.uid));
      return;
    }
    const fresh = vis.filter((a) => !this.seenArrivals.has(a.uid));
    for (const a of fresh) this.seenArrivals.add(a.uid);
    if (fresh.length) this.toast(fresh.length > 1 ? `${fresh.length} pessoas chegaram ao castelo e pedem audiência.` : 'Alguém chegou ao castelo e pede audiência.');
  }

  private topbar() {
    const s = this.s;
    const gov = governabilidade(s);
    const eco = computeEconomy(s);
    const night = !!s.flags.nightPending;
    const hoursLeft = night ? 0 : 20 - s.hour;
    const hh = night ? '21' : String(Math.floor(s.hour)).padStart(2, '0');
    const obj = currentObjective(s);
    const chip = (icon: string, val: string, label: string, tip: string, cls = '') => `<div class="chip ${cls}" title="${tip}">${iconImg(icon)}<div><b>${val}</b><small>${label}</small></div></div>`;
    const items: [ScreenId, string, string][] = [
      ['trono', 'coroa', 'Trono'],
      ['provincias', 'castelo', 'Províncias'],
      ['biblioteca', 'livro', 'Biblioteca'],
      ['rei', 'estrela', 'O Rei'],
      ['corte', 'povo', 'Corte'],
      ['guerra', 'espadas', 'Guerra'],
    ];
    const badge = (id: ScreenId) => {
      if (id === 'rei' && s.skillPoints > 0) return `<em>${s.skillPoints}</em>`;
      if (id === 'guerra' && s.war && !s.war.result) return '<em>!</em>';
      if (id === 'trono') {
        const n = visibleAudiences(s).length;
        return n ? `<em>${n}</em>` : '';
      }
      if (id === 'corte') {
        const n = unreadCount(s);
        return n ? `<em class="mail-badge">${n}</em>` : '';
      }
      return '';
    };
    return `<div class="topbar">
      <div class="date-ribbon">
        <div class="day">Dia ${s.day}</div>
        <div class="clock">${iconImg('ampulheta')}<span>${hh}:00</span></div>
        <div class="hours">${Array.from({ length: 12 }, (_, i) => `<i class="${i < 12 - hoursLeft ? 'spent' : ''}"></i>`).join('')}</div>
      </div>
      <div class="objective" title="Objetivo atual">${iconImg('selo')}<div><small>Objetivo</small><b>${obj.title}</b><span>${obj.text}</span></div></div>
      <div class="chips">
        ${chip('moedas', String(s.res.ouro), 'Tesouro', `Saldo diário estimado: ${eco.net >= 0 ? '+' : ''}${eco.net}`, s.res.ouro < 0 ? 'bad' : '')}
        ${chip('flor', String(s.res.influencia), 'Influência', `+${influenceGain(s)} por dia (vem da Governabilidade)`)}
        ${chip('coroa', String(s.res.prestigio), 'Prestígio', 'Respeito dos nobres e do conselho. Se chegar a 0, você é deposto.')}
        ${chip('povo', String(s.res.povo), 'Povo', 'Apoio das pessoas comuns. Se chegar a 0, revolta popular.', s.res.povo < 25 ? 'bad' : '')}
        ${chip('escudo', `${gov}`, govLabel(gov), 'Governabilidade = Povo + Prestígio + Lealdade das Casas. Gera Influência todo dia.', gov < 35 ? 'bad' : '')}
        ${chip('espadas', String(s.res.exercito), `Moral ${s.res.moral}`, `Soldo: ${eco.upkeep} de ouro por dia`, s.res.moral < 35 ? 'bad' : '')}
      </div>
      <nav class="nav">${items
        .map(([id, icon, label]) => `<button class="medal ${this.ui.screen === id ? 'on' : ''} ${id === 'corte' && unreadCount(s) ? 'blink' : ''}" data-act="go" data-arg="${id}" title="${label}" ${night ? 'disabled' : ''}>${iconImg(icon, 'ico-lg')}${badge(id)}<span>${label}</span></button>`)
        .join('')}<button class="medal help-btn" data-act="help" title="Como jogar" ${night ? 'disabled' : ''}>${iconImg('balao', 'ico-lg')}<span>Ajuda</span></button></nav>
    </div>`;
  }

  private confirmModal() {
    if (!this.ui.confirmEnd) return '';
    const pending = visibleAudiences(this.s).filter((a) => a.expires <= this.s.day);
    return `<div class="modal-back"><div class="parchment modal">
      <h2>Encerrar o dia?</h2>
      <p>Ainda há <b>${pending.length}</b> pessoa(s) esperando por uma audiência que não voltará amanhã. Quem chegaria mais tarde também ficará sem resposta. Demandas ignoradas têm consequências.</p>
      <div class="row"><button class="btn" data-act="cancelEnd">Voltar</button><button class="btn primary" data-act="endDay">Encerrar mesmo assim</button></div>
    </div></div>`;
  }

  private onClick(e: MouseEvent) {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el || el.hasAttribute('disabled')) return;
    const act = el.dataset.act!;
    const arg = el.dataset.arg ?? '';
    switch (act) {
      case 'go': return this.go(arg as ScreenId);
      case 'endDay': return this.ui.confirmEnd ? this.doEndDay() : this.requestEndDay();
      case 'cancelEnd': this.ui.confirmEnd = false; return this.render();
      case 'closeSummary': return this.closeSummary();
      case 'newGame': {
        const inp = this.stage.querySelector<HTMLInputElement>('#king-name');
        return this.newGame(inp?.value.trim() ?? '');
      }
      case 'continue': return this.continueGame();
      case 'toTitle': this.ui.screen = 'titulo'; return this.render();
      case 'tipOk': this.s.flags[`tip_${arg}`] = true; save(this.s); return this.render();
      case 'tipsOff': this.s.flags.tipsOff = true; save(this.s); return this.render();
      case 'tipsToggle': this.s.flags.tipsOff = !this.s.flags.tipsOff; save(this.s); return this.render();
      case 'help': this.ui.help = true; return this.render();
      case 'pickCompanion':
        this.s.flags.companion = arg;
        this.s.flags.compDay = this.s.day;
        save(this.s);
        this.render();
        return this.autoOpenUrgent();
      case 'closeHelp': this.ui.help = false; return this.render();
    }
    if (this.ui.screen !== 'titulo') {
      const mod = SCREENS[this.ui.screen as ScreenId];
      mod.handle?.(this, act, arg, el);
    }
  }
}
