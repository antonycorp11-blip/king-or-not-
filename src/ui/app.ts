import type { CouncilSeatId, GameState, Good, LogEntry, RoomId, ScreenId } from '../types';
import { applyEffect as applyEffectSafe, load, newGame, save, clearSave, storeLocal } from '../engine/core';
import { athgGameStarted, athgReady, cloudLoad, inPortal } from '../engine/cloud';
import { computeEconomy } from '../engine/economy';
import { endDay, eventOf, isQueued, notices, pickNight, pushAudience, spendHours, startDay, visibleAudiences } from '../engine/day';
import { arrival, startInline, travel } from '../engine/castle';
import { pickMatter } from '../engine/agenda';
import { moodRemark } from '../engine/mood';
import { ACTIVITIES } from '../data/activities';
import { ROOMS } from '../data/castle';
import { EVENT_MAP } from '../data/events';
import { char } from '../data/characters';
import { renderCastleModal, handleCastleModal, type CastleModal } from './castleModals';
import { floatDeltas, renderEstado, renderFeed, renderHud, type FeedItem } from './hud';
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
  tension: number;
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
  queueCollapsed: boolean;
  dialogCollapsed: boolean;
  castleModal: CastleModal;
  seatPick: CouncilSeatId | null;
  panel: 'estado' | 'feed' | null; // pergaminhos do HUD
  navOpen: boolean;
  ring: boolean; // anel de ações em volta do rei
  readWith: string | null; // quem lê junto com o rei
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
  feed: FeedItem[] = [];
  feedSeen = 0;
  private prevRes: Record<string, number> | null = null;
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
    this.ui = { screen: 'titulo', dialog: null, useInfluence: false, province: 'castelmar', warSel: null, warMode: 'reforcar', warResult: null, summary: null, summaryDay: 0, confirmEnd: false, help: false, lens: 'casas', good: 'graos', cardOpen: true, armyOpen: false, warClash: null, queueCollapsed: false, dialogCollapsed: false, castleModal: null, seatPick: null, panel: null, navOpen: true, ring: false, readWith: null };
    this.stage.addEventListener('click', (e) => this.onClick(e));
    // tocar numa pessoa pelo castelo abre uma conversa
    this.scene.onTap = (key) => {
      if (key.startsWith('npc-')) return this.talkTo(key.slice(4));
      if (key === 'rei' && !this.ui.dialog && this.ui.screen === 'trono') { this.ui.ring = !this.ui.ring; this.render(); }
    };
    this.scene.onKingMove = () => { if (this.s.castle.seated) { this.s.castle.seated = false; } };
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
    if (mobile !== this.wasMobile) { this.wasMobile = mobile; this.ui && (this.ui.navOpen = !mobile); }
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
    // algo acontecia pelo castelo quando o jogo foi fechado: retoma de onde parou
    const open = s.audiences.find((a) => !a.done && a.expires === s.day && !isQueued(eventOf(a)));
    if (open && !s.flags.nightPending) {
      s.flags.agendaDay = s.day;
      this.render();
      return Throne.openAudience(this, open.uid);
    }
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
    this.ui.panel = null;
    this.ui.ring = false;
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
    this.feed.push({ day: this.s.day, hour: this.s.hour, text: msg });
    if (this.feed.length > 80) { this.feed.shift(); this.feedSeen = Math.max(0, this.feedSeen - 1); }
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
    if (this.s.ended || this.ui.screen !== 'trono' || this.ui.dialog || this.ui.castleModal || this.needsCompanion() || this.s.castle.room !== 'salao') return;
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
      else if (!this.ui.dialog && s.castle.room !== 'salao') want.push('castelo', ...(s.castle.room === 'conselho' ? (['conselho'] as TipId[]) : []));
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
      this.scene.setMovementEnabled(false);
      this.scene.setRoom('trono');
      this.scene.setHour(17.5);
      this.scene.sync(this.throneActors());
      this.scene.setMode('dim');
      this.root.innerHTML = renderTitle(this);
      return;
    }
    this.stage.classList.remove('talking');
    if (ui.summary) {
      this.scene.setMovementEnabled(false);
      this.scene.setHour(20.5);
      this.scene.setMode('full');
      this.root.innerHTML = renderSummary(this) + this.tipHtml();
      return;
    }
    if (s.ended) {
      this.scene.setMovementEnabled(false);
      this.scene.setHour(20);
      this.scene.setMode('dim');
      this.root.innerHTML = renderEnd(this);
      return;
    }
    this.checkArrivals();
    this.drainNotices();
    // Ao acordar, a agenda do dia aparece sobre a cama
    if (ui.screen === 'trono' && s.flags.agendaDay !== s.day && !s.flags.nightPending && !ui.dialog) {
      s.flags.agendaDay = s.day;
      ui.castleModal = 'agenda';
    }
    const pos = this.scene.kingPos();
    const sceneRoom = this.scene.roomKind === 'trono' ? 'salao' : this.scene.roomKind;
    if (pos && ui.screen === 'trono' && !s.castle.seated && sceneRoom === s.castle.room) { s.castle.x = pos.x; s.castle.y = pos.y; }
    setCrowned(s.spouse ? [s.spouse] : []);
    this.stage.classList.toggle('talking', ui.screen === 'trono' && !!ui.dialog);
    const screen = ui.screen as ScreenId;
    this.scene.setHour(s.flags.nightPending ? 20.6 : s.hour);
    const mod = SCREENS[screen];
    if (screen !== 'biblioteca' && screen !== 'trono') this.scene.setRoom(s.castle.room === 'salao' ? 'trono' : (s.castle.room as Exclude<RoomId, 'salao'>));
    this.scene.setMovementEnabled(screen === 'trono' && !ui.dialog && !ui.summary && !s.ended && !this.needsCompanion() && !ui.castleModal);
    if (screen !== 'trono' && screen !== 'biblioteca') { this.scene.setMarkers([]); if (s.castle.room === 'salao') this.scene.sync(this.throneActors()); }
    const modal = ui.panel === 'estado' ? renderEstado(this) : ui.panel === 'feed' ? renderFeed(this) : screen === 'trono' ? renderCastleModal(this) : '';
    this.root.innerHTML = this.topbar() + `<div class="screen screen-${screen} room-${s.castle.room}">${mod.render(this)}</div>` + this.confirmModal() + (modal || (this.needsCompanion() ? this.companionModal() : this.tipHtml()));
    mod.after?.(this);
    this.prevRes = floatDeltas(this, this.prevRes);
  }

  // Personagens fixos do salão: rei no trono, guardas, rainha e rainha-mãe.
  // Personagens fixos do salão: rei no trono, quem está ao seu lado e a guarda ao fundo.
  throneActors(exclude: string[] = []): ActorSpec[] {
    const s = this.s;
    const seated = s.castle.room !== 'salao' || s.castle.seated || this.ui.screen === 'titulo';
    const list: ActorSpec[] = [
      seated ? { key: 'rei', id: 'rei', x: LAYOUT.throneX, foot: LAYOUT.daisY, facing: -1, anim: 'seated' }
        : { key: 'rei', id: 'rei', x: s.castle.x, foot: s.castle.y, facing: 1, anim: 'idle', free: true, dir: 'north' },
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
  private wasMobile: boolean | null = null;

  private lifeTick() {
    const s = this.s;
    const d = this.ui.dialog;
    if (this.ui.screen !== 'trono' || this.ui.summary || s.ended || this.needsCompanion() || (d && !d.reply)) return;
    if (--this.lifeClock > 0) return;
    this.lifeClock = 8 + Math.floor(Math.random() * 7);
    const r = Math.random();
    const npcs = this.scene.keys('npc-');
    if (npcs.length && r < 0.45) {
      const k = npcs[Math.floor(Math.random() * npcs.length)];
      const line = Math.random() < 0.4 ? moodRemark(s) : null;
      if (line) this.scene.say(k, line);
      return;
    }
    if (s.castle.room !== 'salao') return;
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
    return this.ui.screen === 'trono' && !this.ui.summary && !s.ended && !s.flags.nightPending && s.flags.compDay !== s.day && s.castle.room === 'salao' && !this.ui.castleModal;
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
    return renderHud(this);
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

  // ---------- o castelo ----------
  private drainNotices() {
    while (notices.length) {
      const n = notices.shift()!;
      this.toast(`${n.title}: ${n.text}`);
    }
  }

  // Andar até a porta e atravessar
  walkOut(to: RoomId) {
    if (this.ui.dialog) return;
    const exit = ROOMS[this.s.castle.room].exits.find((e) => e.to === to);
    if (!exit) return this.travelTo(to);
    this.s.castle.seated = false;
    this.scene.moveTo('rei', exit.x, exit.y, () => this.travelTo(to));
  }

  travelTo(to: RoomId) {
    this.ui.ring = false;
    if (this.ui.dialog && !this.ui.dialog.reply) return this.toast('Termine a conversa antes de sair.');
    if (this.ui.dialog) { Throne.dismissSpeaker(this); this.ui.dialog = null; }
    if (to === this.s.castle.room) { this.ui.castleModal = null; this.ui.screen = 'trono'; return this.render(); }
    const r = travel(this.s, to);
    if (!r.ok) return this.toast(r.reason ?? 'Não é possível ir agora.');
    this.ui.castleModal = null;
    this.ui.screen = 'trono';
    this.render();
    this.onArrive();
  }

  // Chegou: compromisso marcado, encontro ou gente esperando
  private onArrive() {
    const s = this.s;
    const a = arrival(s);
    save(s);
    if (a.appointment) this.toast(a.late ? `Você chega atrasado: ${a.appointment.title}.` : `Você chega para: ${a.appointment.title}.`);
    if (a.event) {
      if (a.event.kind === 'encontro') this.toast(`${ROOMS[s.castle.room].name}: ${a.event.topic}.`);
      return this.openInline(a.event.id);
    }
    this.autoOpenUrgent();
  }

  afterModal() {
    if (this.ui.screen === 'trono' && !this.ui.dialog) this.autoOpenUrgent();
  }

  openInline(eventId: string) {
    const uid = startInline(this.s, eventId);
    save(this.s); // uma reunião interrompida por recarregar a página volta aberta
    if (uid !== null) Throne.openAudience(this, uid);
  }

  talkTo(id: string) {
    const s = this.s;
    if (this.ui.dialog || this.ui.castleModal || this.ui.screen !== 'trono') return;
    const evId = `talk_${id}`;
    if (!EVENT_MAP[evId]) return this.toast(`${char(id).name} acena de longe, ocupado demais para conversar.`);
    if (s.seen[evId] === s.day) return this.toast(`Vocês já conversaram hoje.`);
    this.openInline(evId);
  }

  doActivity(id: string) {
    const s = this.s;
    const a = ACTIVITIES.find((x) => x.id === id);
    if (!a || this.ui.dialog) return;
    switch (a.special) {
      case 'dormir': return this.requestEndDay();
      case 'sentar': s.castle.seated = true; save(s); this.render(); return this.autoOpenUrgent();
      case 'cadeiras': this.ui.castleModal = 'cadeiras'; return this.render();
      case 'caderno': this.ui.castleModal = 'caderno'; return this.render();
      case 'lerJuntos': this.ui.readWith = s.spouse ?? null; s.activitiesToday.push(a.id); return this.go('biblioteca');
      case 'conselhoExtra': {
        const m = pickMatter(s, Math.random);
        if (!m) return this.toast('Não há nada na mesa do conselho hoje.');
        s.res.influencia -= 5;
        s.activitiesToday.push(a.id);
        return this.openInline(m.id);
      }
    }
    if (a.screen) return this.go(a.screen);
    if (a.hours && s.hour + a.hours > 20.01) return this.toast('Não há tempo para isso hoje.');
    s.activitiesToday.push(a.id);
    if (a.hours) spendHours(s, a.hours, a.rest ? 'descanso' : 'trabalho');
    if (a.effects) applyEffectSafe(s, a.effects);
    const ev = typeof a.event === 'function' ? a.event(s) : a.event;
    save(s);
    if (ev) return this.openInline(ev);
    if (a.toast) this.toast(a.toast);
    this.render();
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
      case 'estado': this.ui.panel = this.ui.panel === 'estado' ? null : 'estado'; return this.render();
      case 'closeEstado': case 'closeFeed': this.ui.panel = null; return this.render();
      case 'feed': this.ui.panel = 'feed'; this.feedSeen = this.feed.length; return this.render();
      case 'navToggle': this.ui.navOpen = !this.ui.navOpen; return this.render();
      case 'ring': this.ui.ring = !this.ui.ring; return this.render();
      case 'travel': return this.travelTo(arg as RoomId);
      case 'exit': return this.walkOut(arg as RoomId);
      case 'talk': return this.talkTo(arg);
      case 'activity': return this.doActivity(arg);
      case 'toggleQueue': this.ui.queueCollapsed = !this.ui.queueCollapsed; return this.render();
      case 'toggleDialog': this.ui.dialogCollapsed = !this.ui.dialogCollapsed; return this.render();
    }
    if (act === 'agenda' || act === 'castleMap' || act === 'activity') this.ui.ring = false;
    if (handleCastleModal(this, act, arg)) return;
    if (this.ui.screen !== 'titulo') {
      const mod = SCREENS[this.ui.screen as ScreenId];
      mod.handle?.(this, act, arg, el);
    }
  }
}
