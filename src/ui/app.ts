import type { CouncilSeatId, GameState, Good, LogEntry, RoomId, ScreenId } from '../types';
import { applyEffect as applyEffectSafe, load, newGame, save, clearSave, storeLocal } from '../engine/core';
import { athgExit, athgGameStarted, athgOwnExit, athgReady, cloudLoad, inPortal } from '../engine/cloud';
import { computeEconomy } from '../engine/economy';
import { endDay, eventOf, isQueued, notices, pickNight, pushAudience, spendHours, startDay, visibleAudiences } from '../engine/day';
import { arrival, startInline } from '../engine/castle';
import { dueHere, pickMatter } from '../engine/agenda';
import { moodRemark } from '../engine/mood';
import { ACTIVITIES } from '../data/activities';
import { ROOMS, WALK_HOURS, roomAt, worldPoint } from '../data/castle';
import { EVENT_MAP } from '../data/events';
import { char } from '../data/characters';
import { renderCastleModal, handleCastleModal, type CastleModal } from './castleModals';
import { floatDeltas, renderEstado, renderFeed, renderAjustes, renderHud, type FeedItem } from './hud';
import { loadCharacterAssets, setCrowned, type Expr } from '../render/actors';
import { companionsFor } from '../data/companions';
import { companionLine, guardLine, waitingLine } from '../data/banter';
import { portrait } from './common';
import { iconImg } from '../render/pixel';
import { Cinema } from '../render/cinema';
import { Guide, TOURS } from './guide';
import { SceneView } from './sceneView';
import { WorldMap, type Lens } from './worldMap';
import { TIPS, HOW_TO_PLAY, type TipId } from './tips';
import { barkFor } from '../data/barks';
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
  said?: string; // o que o rei acabou de dizer
  root?: string; // a primeira resposta desta rodada (o ramo da conversa)
  taken?: string[]; // ramos já explorados
  rounds?: number; // quantas vezes voltou à conversa
  final?: boolean; // a última escolha fechou o assunto
  prefix?: string; // reação de quem ouve, antes da próxima pergunta
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
  panel: 'estado' | 'feed' | 'ajustes' | null; // pergaminhos do HUD
  navOpen: boolean;
  ring: boolean; // menu de ações do rei
  hotMenu: [number, number, string[]] | null; // menu de um móvel-lugar (posição no mundo e atividades)
  sleeping?: boolean; // o rei está deitado (a noite passa)
  cineExit?: boolean; // a cena de cinema está saindo
  tour?: { id: string; i: number } | null; // tutorial guiado em andamento
  fwdOpen?: boolean; fwdLog?: boolean; // agenda: encaminhados ao conselho
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
  cinema: Cinema;
  guide: Guide;
  private guideTimer = 0;
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
    this.cinema = new Cinema(this.stage, () => this.scene.castleWorld);
    this.root = document.createElement('div');
    this.root.id = 'ui';
    this.stage.appendChild(this.root);
    this.guide = new Guide(this, this.stage);
    this.s = load() ?? newGame();
    this.ui = { screen: 'titulo', dialog: null, useInfluence: false, province: 'castelmar', warSel: null, warMode: 'reforcar', warResult: null, summary: null, summaryDay: 0, confirmEnd: false, help: false, lens: 'casas', good: 'graos', cardOpen: true, armyOpen: false, warClash: null, queueCollapsed: false, dialogCollapsed: false, castleModal: null, seatPick: null, panel: null, navOpen: true, ring: false, hotMenu: null, readWith: null };
    this.stage.addEventListener('click', (e) => this.onClick(e));
    // tocar numa pessoa pelo castelo abre uma conversa
    this.scene.onTap = (key) => {
      if (this.ui.screen !== 'trono' || this.ui.dialog) return;
      if (key.startsWith('npc-')) return this.approach(key, () => this.talkTo(key.slice(4)));
      if (key === 'rei') { this.ui.ring = !this.ui.ring; this.ui.hotMenu = null; this.render(); }
    };
    // tocar num móvel-lugar: o rei vai até ele e age
    this.scene.onHotspot = (h) => {
      if (this.ui.screen !== 'trono' || this.ui.dialog || this.ui.castleModal) return;
      this.ui.ring = false;
      const acts = h.acts.filter((id) => { const a = ACTIVITIES.find((x) => x.id === id); return a && (!a.cond || a.cond(this.s)) && !(a.perDay && this.s.activitiesToday.includes(a.id)) && !(a.once && this.s.flags[a.once]); });
      if (!acts.length) return this.toast('Agora não há nada a fazer aqui.');
      this.s.castle.seated = false;
      this.scene.moveTo('rei', h.stand[0], h.stand[1], () => {
        if (acts.length === 1) return this.doActivity(acts[0]);
        this.ui.hotMenu = [h.stand[0], h.rect[1] - 10, acts];
        this.render();
      });
    };
    this.scene.onKingMove = () => {
      if (this.s.castle.seated) this.s.castle.seated = false;
      if (this.ui.ring || this.ui.hotMenu) { this.ui.ring = false; this.ui.hotMenu = null; this.render(); }
    };
    this.scene.onWorldTap = () => { if (this.ui.ring || this.ui.hotMenu) { this.ui.ring = false; this.ui.hotMenu = null; this.render(); } };
    this.scene.onKingRoom = (room) => this.enterRoom(room);
    this.scene.currentRoom = () => (this.ui.screen === 'titulo' || !this.s ? null : this.s.castle.room);
    window.addEventListener('resize', () => this.fit());
    // Esc sempre volta ao castelo (fecha telas, pergaminhos e menus)
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || this.ui.screen === 'titulo') return;
      if (this.ui.panel || this.ui.castleModal || this.ui.ring || this.ui.hotMenu) { this.ui.panel = null; this.ui.castleModal = null; this.ui.ring = false; this.ui.hotMenu = null; this.ui.seatPick = null; return this.render(); }
      if (this.ui.screen !== 'trono') this.go('trono');
    });
    window.addEventListener('orientationchange', () => window.setTimeout(() => this.fit(), 250));
    window.visualViewport?.addEventListener('resize', () => this.fit());
    this.fit();
    this.render();
    // o salão tem vida: guardas, quem espera e o conselheiro comentam de tempos em tempos
    window.setInterval(() => this.lifeTick(), 1000);
    // Portal ATHG: avisa que carregou e busca o save da conta (vale o mais recente)
    document.documentElement.classList.toggle('embedded', inPortal());
    athgReady();
    athgOwnExit(); // o jogo tem o próprio botão de sair (Ajustes): o portal esconde o X dele
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
    // no máximo três avisos na tela; o resto fica no sino
    while (box.children.length >= 3) box.firstElementChild?.remove();
    box.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    window.setTimeout(() => {
      t.classList.remove('show');
      window.setTimeout(() => t.remove(), 400);
    }, 3200);
  }

  // ---------- fim do dia ----------
  // Dormir é ir até a cama: o caminho pelo castelo à noite tem seus próprios encontros
  requestEndDay() {
    const s = this.s;
    if (this.ui.sleeping) return;
    const bed = this.scene.hotspotStand('dormir');
    const k = this.scene.kingPos();
    if (bed && k && (s.castle.room !== 'quarto' || Math.hypot(k.x - bed[0], k.y - bed[1]) > 150)) {
      if (this.ui.dialog && !this.ui.dialog.reply) return this.toast('Termine a conversa antes de ir dormir.');
      if (this.ui.dialog) { Throne.dismissSpeaker(this); this.ui.dialog = null; }
      this.ui.ring = false; this.ui.hotMenu = null; this.ui.castleModal = null; this.ui.panel = null;
      this.ui.screen = 'trono'; s.castle.seated = false;
      this.render();
      this.toast('O rei segue para o quarto.');
      this.scene.moveTo('rei', bed[0], bed[1], () => { if (!this.ui.dialog && !this.ui.castleModal) this.requestEndDay(); }, 240);
      return;
    }
    const pending = visibleAudiences(this.s).filter((a) => a.expires <= this.s.day).length;
    if (pending && !this.ui.confirmEnd) {
      this.ui.confirmEnd = true;
      this.render();
      return;
    }
    this.doEndDay();
  }

  // O rei se deita. A noite passa na tela; às vezes batem à porta e ele acorda.
  doEndDay() {
    this.ui.confirmEnd = false;
    const s = this.s;
    if (this.ui.dialog) Throne.dismissSpeaker(this);
    this.ui.dialog = null;
    s.flags.nightPending = false;
    this.ui.sleeping = true;
    const bed = this.scene.hotspotStand('dormir');
    if (bed) this.scene.place('rei', bed[0], bed[1] - 70);
    this.scene.setHidden('rei', true);
    this.render();
    this.scene.say('rei', 'Zzz…', 1500);
    window.setTimeout(() => this.ui.sleeping && this.scene.say('rei', 'Zzz… zzz…', 1600), 1500);
    window.setTimeout(() => this.afterSleep(), 3200);
  }

  private afterSleep() {
    const s = this.s;
    const wake = () => {
      this.ui.sleeping = false;
      this.scene.setHidden('rei', false);
      const bed = this.scene.hotspotStand('dormir');
      if (bed) { this.scene.place('rei', bed[0], bed[1]); s.castle.x = bed[0]; s.castle.y = bed[1]; }
    };
    if (s.flags.nightDay !== s.day) {
      s.flags.nightDay = s.day;
      const night = pickNight(s, true);
      if (night) {
        pushAudience(s, night.id, 21);
        const a = s.audiences.find((x) => x.eventId === night.id && !x.done);
        if (a) {
          wake();
          s.flags.nightPending = true;
          this.ui.screen = 'trono';
          this.toast('Batidas na porta! O rei acorda.');
          return Throne.openAudience(this, a.uid);
        }
      }
    }
    s.flags.nightPending = false;
    const day = s.day;
    const entries = endDay(s);
    wake();
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
    if (this.s.ended || this.ui.screen !== 'trono' || this.ui.dialog || this.ui.castleModal || this.needsCompanion() || this.s.castle.room !== 'salao' || !this.s.castle.seated) return;
    const urgent = visibleAudiences(this.s).find((a) => eventOf(a).kind === 'urgente');
    if (urgent) Throne.openAudience(this, urgent.uid);
  }

  // ---------- tutorial ----------
  tipsOff() {
    return !!this.s.flags.tipsOff;
  }

  private pendingTip(): TipId | null {
    if (this.tipsOff() || this.ui.screen === 'titulo' || this.ui.tour) return null;
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
    // dicas cobertas por um tutorial guiado não aparecem (o tutorial ensina melhor)
    const guided = new Set(s.flags.tutorialOff ? [] : TOURS.flatMap((t) => t.tips ?? []));
    return want.find((t) => TIPS[t] && !s.flags[`tip_${t}`] && !guided.has(t)) ?? null;
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
    // o tutorial se posiciona depois que a tela nova foi montada
    window.clearTimeout(this.guideTimer);
    this.guideTimer = window.setTimeout(() => this.guide.place(), 40);
    if (ui.screen === 'titulo') {
      this.scene.setMovementEnabled(false);
      this.scene.setHour(17.5);
      this.scene.sync(Throne.worldActors(this));
      this.scene.focus(ROOMS.salao.rect[0] + 520, ROOMS.salao.rect[1] + 420);
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
    this.checkHere();
    // Ao acordar, a agenda do dia aparece sobre a cama
    if (ui.screen === 'trono' && s.flags.agendaDay !== s.day && !s.flags.nightPending && !ui.dialog) {
      s.flags.agendaDay = s.day;
      ui.castleModal = 'agenda';
    }
    const pos = this.scene.kingPos();
    if (pos && !s.castle.seated && this.scene.isReady()) { s.castle.x = pos.x; s.castle.y = pos.y; }
    this.scene.focus(null);
    setCrowned(s.spouse ? [s.spouse] : []);
    this.stage.classList.toggle('talking', ui.screen === 'trono' && !!ui.dialog);
    this.stage.classList.toggle('cinema-on', this.cinema.active);
    const screen = ui.screen as ScreenId;
    this.scene.setHour(s.flags.nightPending ? 20.6 : s.hour);
    const mod = SCREENS[screen];
    this.scene.setMovementEnabled(screen === 'trono' && !ui.dialog && !ui.summary && !s.ended && !this.needsCompanion() && !ui.castleModal);
    if (screen !== 'trono') { this.scene.setMarkers([]); this.scene.sync(Throne.worldActors(this)); }
    const modal = ui.panel === 'estado' ? renderEstado(this) : ui.panel === 'feed' ? renderFeed(this) : ui.panel === 'ajustes' ? renderAjustes(this) : screen === 'trono' ? renderCastleModal(this) : '';
    const close = screen !== 'trono' ? `<button class="screen-close" data-act="go" data-arg="trono" title="Voltar ao castelo (Esc)">${iconImg('castelo')} Voltar ao castelo</button>` : '';
    if (ui.sleeping) { this.scene.setHour(23); this.scene.setMovementEnabled(false); }
    this.root.innerHTML = (ui.sleeping ? `<div class="sleep-veil"><p>O rei dorme…</p></div>` : '') + this.topbar() + `<div class="screen screen-${screen} room-${s.castle.room}">${mod.render(this)}</div>` + close + this.confirmModal() + (modal || (this.needsCompanion() ? this.companionModal() : this.tipHtml()));
    mod.after?.(this);
    this.prevRes = floatDeltas(this, this.prevRes);
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
    const npcs = this.npcsIn(s.castle.room);
    if (npcs.length && r < 0.45) {
      const k = npcs[Math.floor(Math.random() * npcs.length)];
      const line = Math.random() < 0.3 ? moodRemark(s) : barkFor(s, k.slice(4), s.castle.room);
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
    return this.ui.screen === 'trono' && !this.ui.summary && !s.ended && !s.flags.nightPending && s.flags.compDay !== s.day && s.castle.room === 'salao' && s.castle.seated && !this.ui.castleModal;
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

  // Ir a um cômodo: o rei atravessa o castelo andando (depressa)
  travelTo(to: RoomId) {
    this.ui.ring = false; this.ui.hotMenu = null;
    if (this.ui.dialog && !this.ui.dialog.reply) return this.toast('Termine a conversa antes de sair.');
    if (this.ui.dialog) { Throne.dismissSpeaker(this); this.ui.dialog = null; }
    this.ui.castleModal = null;
    this.ui.screen = 'trono';
    this.s.castle.seated = false;
    this.render();
    // se há algo marcado lá, vai direto ao lugar combinado
    const ap = this.s.agenda.find((a) => a.room === to && a.state === 'pendente' && a.spot && this.s.hour >= a.hour - 1 && this.s.hour < a.hour + a.duration);
    const [x, y] = worldPoint(to, to === 'salao' ? 'fala' : ap?.spot);
    this.scene.moveTo('rei', x, y, () => { if (to === 'salao') this.doActivity('sentar'); }, 300);
  }

  // Andar até alguém antes de falar com ela
  private approach(key: string, then: () => void) {
    const p = this.scene.pos(key), k = this.scene.kingPos();
    if (!p || !k || Math.hypot(p[0] - k.x, p[1] - k.y) < 110) return then();
    this.s.castle.seated = false;
    this.scene.moveTo('rei', p[0] - 60, p[1] + 10, then);
  }

  // O rei atravessou uma porta: o tempo passa e o cômodo pode ter algo esperando
  private enterRoom(room: RoomId) {
    const s = this.s;
    if (room === s.castle.room || this.ui.screen === 'titulo') return;
    s.castle.room = room;
    s.castle.visitedToday = [...new Set([...s.castle.visitedToday, room])];
    if (s.hour < 20) spendHours(s, WALK_HOURS, 'andar');
    const pos = this.scene.kingPos();
    if (pos) { s.castle.x = pos.x; s.castle.y = pos.y; }
    this.render();
    this.onArrive();
    if (!this.ui.dialog) this.greet(room);
  }

  // Quem está no cômodo repara no rei e comenta
  private greet(room: RoomId) {
    const here = this.npcsIn(room).sort(() => Math.random() - 0.5).slice(0, 2);
    here.forEach((k, i) => window.setTimeout(() => {
      if (this.ui.dialog || this.s.castle.room !== room) return;
      const line = barkFor(this.s, k.slice(4), room);
      if (line) this.scene.say(k, line, 4200);
    }, 500 + i * 1900));
  }

  private npcsIn(room: RoomId) {
    return this.scene.keys('npc-').filter((k) => { const p = this.scene.pos(k); return !!p && roomAt(p[0], p[1]) === room && !this.scene.walking(k); });
  }

  // Chegou: compromisso marcado, encontro ou gente esperando
  private onArrive() {
    const s = this.s;
    // à noite, no caminho para a cama, alguém pode abordar o rei
    if (s.hour >= 18.5 && s.flags.corridorDay !== s.day && s.castle.room !== 'quarto' && !dueHere(s, s.castle.room) && Math.random() < 0.5) {
      const night = pickNight(s, false);
      if (night) {
        s.flags.corridorDay = s.day;
        this.scene.halt('rei');
        this.toast('No corredor escuro, alguém o aborda...');
        return this.openInline(night.id);
      }
    }
    const a = arrival(s);
    if (a.appointment?.meal) spendHours(s, 0.75, 'descanso'); // sentar, comer, ouvir a mesa
    save(s);
    if (a.appointment) this.toast(a.late ? `Você chega atrasado: ${a.appointment.title}.` : a.appointment.meal && !a.event ? `${a.appointment.title}: você come com a corte.` : `Você chega para: ${a.appointment.title}.`);
    if (a.event) {
      if (a.event.kind === 'encontro') this.toast(`${ROOMS[s.castle.room].name}: ${a.event.topic}.`);
      // o rei para de andar e vai até quem o espera
      this.scene.halt('rei');
      const id = a.event.id, key = `npc-${a.event.speaker}`;
      if (this.scene.has(key)) return this.approach(key, () => this.openInline(id));
      return this.openInline(id);
    }
    this.autoOpenUrgent();
  }

  // O tempo passou com o rei parado aqui: chegou a hora de algo marcado neste lugar?
  private hereTimer = 0;
  private checkHere() {
    const s = this.s;
    if (this.ui.screen !== 'trono' || this.ui.dialog || this.ui.castleModal || this.ui.summary || s.ended || s.flags.nightPending) return;
    if (!dueHere(s, s.castle.room)) return;
    window.clearTimeout(this.hereTimer);
    this.hereTimer = window.setTimeout(() => { if (!this.ui.dialog && dueHere(this.s, this.s.castle.room)) this.onArrive(); }, 400);
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
    this.ui.ring = false; this.ui.hotMenu = null;
    switch (a.special) {
      case 'dormir': return this.requestEndDay();
      case 'sentar': {
        s.castle.seated = true; save(s); this.render();
        if (!visibleAudiences(s).length) this.toast(s.hour < 8 ? 'A corte abre às 8h.' : 'Ninguém espera no momento.');
        return this.autoOpenUrgent();
      }
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
    if (a.id === 'correio') this.ui.courtTab = 'correio';
    else if (a.screen === 'corte') this.ui.courtTab = 'pessoas';
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
    if (this.guide.handle(act)) return;
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
      case 'toTitle': this.ui.screen = 'titulo'; this.ui.panel = null; return this.render();
      case 'tipOk': this.s.flags[`tip_${arg}`] = true; save(this.s); return this.render();
      case 'tipsOff': this.s.flags.tipsOff = true; save(this.s); return this.render();
      case 'tipsToggle': this.s.flags.tipsOff = !this.s.flags.tipsOff; save(this.s); return this.render();
      case 'help': this.ui.help = true; this.ui.panel = null; return this.render();
      case 'pickCompanion':
        this.s.flags.companion = arg;
        this.s.flags.compDay = this.s.day;
        save(this.s);
        this.render();
        return this.autoOpenUrgent();
      case 'closeHelp': this.ui.help = false; return this.render();
      case 'estado': this.ui.panel = this.ui.panel === 'estado' ? null : 'estado'; return this.render();
      case 'closeEstado': case 'closeFeed': this.ui.panel = null; return this.render();
      case 'ajustes': this.ui.panel = this.ui.panel === 'ajustes' ? null : 'ajustes'; return this.render();
      case 'exitGame': save(this.s); athgExit(); return;
      case 'feed': this.ui.panel = 'feed'; this.feedSeen = this.feed.length; return this.render();
      case 'navToggle': this.ui.navOpen = !this.ui.navOpen; return this.render();
      case 'ring': this.ui.ring = !this.ui.ring; this.ui.hotMenu = null; return this.render();
      case 'travel': return this.travelTo(arg as RoomId);
      case 'hotClose': this.ui.hotMenu = null; return this.render();
      case 'zoom': this.scene.setZoom(this.scene.zoom * (arg === 'in' ? 1.2 : 1 / 1.2)); return;
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
