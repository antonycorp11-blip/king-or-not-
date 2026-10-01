import type { App } from './app';
import type { RoomId } from '../types';
import type { TopDownDir } from '../render/topdown';
import type { SceneMarker } from './sceneView';
import { ROOMS, roomAt, worldPoint } from '../data/castle';
import { char } from '../data/characters';
import { finishOp, overheard, type NightOp } from '../engine/nightOps';
import { save } from '../engine/core';
import { sound } from '../audio/sound';
import { esc } from './common';

// AS NOITES DO BOBO, JOGÁVEIS
// A interface some; sobra o castelo escuro, o rei, Pimenta e quem está sendo
// vigiado. Três jeitos de jogar:
//  · seguir: acompanhar o alvo de longe; quando ele para e olha para trás,
//    ficar parado perto de um móvel. No destino, chegar perto o bastante para ouvir.
//  · procurar: revirar os móveis do cômodo (3 chances) antes que a ronda volte.
//  · armadilha: esconder-se perto da isca e não se mexer quando alguém vier buscá-la.

type Phase = 'ir' | 'seguir' | 'aviso' | 'olhando' | 'conversa' | 'procurar' | 'esconder' | 'esperar' | 'chegando' | 'pegando' | 'fim';
const NAME = (id: string) => char(id).name.replace(/^(Mestre|Lorde|Chanceler|Sir|Lady|Rainha-mãe) /, '');
const PIMENTA_TIPS = ['"Devagar, Majestade. Ninguém corre à noite sem motivo."', '"Os móveis são nossos amigos. Os guardas, não."', '"Se eu espirrar, finja que fui eu. Fui eu."', '"Mais perto. Ou mais longe. Eu também não sei."'];

export class NightOpRun {
  private phase: Phase;
  private t = 0;
  private timer = 0;
  private sus = 0; // desconfiança do alvo (0..100)
  private lost = 0; // segundos longe demais
  private nextLook = 7;
  private phaseT = 0;
  private lines: [string, string][] = [];
  private lineI = 0;
  private heard = 0;
  private tries = 3;
  private clock = 80; // procurar: segundos até a ronda
  private spots: { x: number; y: number; prize: boolean; open?: boolean }[] = [];
  private bait: [number, number] | null = null;
  private still = 0;
  private result: { title: string; text: string; ok: boolean } | null = null;
  private tipT = 6;

  constructor(private app: App, private op: NightOp) {
    this.phase = op.kind === 'seguir' ? 'seguir' : 'ir';
  }

  get active() { return !this.result || this.phase !== 'fim'; }

  start() {
    const sc = this.app.scene;
    const k = sc.kingPos();
    if (!k) return;
    // as pessoas de verdade somem da rotina: quem anda agora é a cena
    sc.setHidden(`npc-${this.op.target}`, true);
    if (this.op.contact) sc.setHidden(`npc-${this.op.contact}`, true);
    sc.setHidden('npc-pimenta', true);
    sc.spawn('st-pimenta', 'pimenta', k.x - 70, k.y + 10, 'east');
    if (this.op.kind === 'seguir') {
      // o alvo acaba de passar pela porta, à frente do rei
      const [sx, sy] = this.freeNear(k.x + 300, k.y);
      sc.spawn('st-alvo', this.op.target, sx, sy, 'east');
      const [dx, dy] = worldPoint(this.op.room, undefined, 0);
      const [cx, cy] = worldPoint(this.op.room, undefined, 1);
      sc.spawn('st-contato', this.op.contact ?? 'sombra', cx, cy, 'west');
      sc.moveTo('st-alvo', dx, dy, () => this.arrived(), 72);
      sc.say('st-pimenta', `Lá vai ${NAME(this.op.target)}. Atrás, devagar.`, 3500);
    } else {
      sc.say('st-pimenta', this.op.kind === 'procurar' ? `Para ${ROOMS[this.op.room].name}. Sem barulho.` : 'Para a galeria. Eu levo a isca.', 3500);
    }
    this.timer = window.setInterval(() => this.tick(0.1), 100);
    sound.setMood('tensao');
  }

  private freeNear(x: number, y: number): [number, number] {
    const w = this.app.scene.castleWorld;
    for (const [dx, dy] of [[0, 0], [-80, 0], [80, 0], [0, 60], [0, -60], [-160, 0], [160, 0], [-240, 0]]) if (w?.walkable(x + dx, y + dy)) return [x + dx, y + dy];
    const k = this.app.scene.kingPos()!;
    return [k.x + 40, k.y];
  }

  // perto de um móvel e parado = escondido
  private hidden(): boolean {
    const sc = this.app.scene, k = sc.kingPos(), w = sc.castleWorld;
    if (!k || !w || sc.walking('rei')) return false;
    return w.objects.some((o) => o.solid && k.x > o.x - 60 && k.x < o.x + o.w + 60 && k.y > o.depth - 90 && k.y < o.depth + 70);
  }
  private dist(key: string) {
    const p = this.app.scene.pos(key), k = this.app.scene.kingPos();
    return p && k ? Math.hypot(p[0] - k.x, p[1] - k.y) : 9999;
  }
  private lookAtKing(key: string) {
    const p = this.app.scene.pos(key), k = this.app.scene.kingPos();
    if (!p || !k) return;
    const dx = k.x - p[0], dy = k.y - p[1];
    const dir: TopDownDir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'west' : 'east') : dy < 0 ? 'north' : 'south';
    this.app.scene.face(key, dir);
  }
  private watch(key: string, dt: number, range = 430) {
    const d = this.dist(key);
    if (d < 85) this.sus += 90 * dt; // esbarrou
    else if (d < range && !this.hidden()) this.sus += (d < 240 ? 70 : 42) * dt;
  }

  private tick(dt: number) {
    if (this.phase === 'fim') return;
    const sc = this.app.scene;
    this.t += dt; this.phaseT += dt;
    // Pimenta vem atrás do rei
    const k = sc.kingPos();
    const p = sc.pos('st-pimenta');
    if (k && p && Math.hypot(p[0] - k.x, p[1] - k.y) > 150 && !sc.walking('st-pimenta')) sc.moveTo('st-pimenta', k.x - 70, k.y + 10, undefined, 170);
    if ((this.tipT -= dt) <= 0) { this.tipT = 14 + Math.random() * 8; sc.say('st-pimenta', PIMENTA_TIPS[Math.floor(Math.random() * PIMENTA_TIPS.length)].replace(/"/g, ''), 3200); }
    const kroom = k ? roomAt(k.x, k.y) : null;

    switch (this.op.kind) {
      case 'seguir': this.tickFollow(dt); break;
      case 'procurar': this.tickSearch(dt, kroom); break;
      case 'armadilha': this.tickTrap(dt, kroom); break;
    }
    if (this.sus >= 100) return this.spotted();
    if (this.phase !== 'aviso' && this.phase !== 'olhando' && this.phase !== 'pegando') this.sus = Math.max(0, this.sus - 6 * dt);
    this.paint();
  }

  // ---------- seguir ----------
  private tickFollow(dt: number) {
    const sc = this.app.scene;
    const d = this.dist('st-alvo');
    if (this.phase === 'seguir') {
      this.lost = d > 950 ? this.lost + dt : Math.max(0, this.lost - dt * 2);
      if (this.lost > 7) return this.end('perdeu');
      if (d < 85) this.sus += 90 * dt;
      if ((this.nextLook -= dt) <= 0 && sc.walking('st-alvo')) {
        sc.halt('st-alvo');
        sc.say('st-alvo', '...', 1300);
        sound.play('whisper');
        this.go('aviso');
      }
    } else if (this.phase === 'aviso' && this.phaseT > 1.2) {
      this.lookAtKing('st-alvo');
      this.go('olhando');
    } else if (this.phase === 'olhando') {
      this.watch('st-alvo', dt);
      if (this.phaseT > 2.3) {
        this.nextLook = 6 + Math.random() * 4;
        const [dx, dy] = worldPoint(this.op.room, undefined, 0);
        sc.moveTo('st-alvo', dx, dy, () => this.arrived(), 72);
        this.go('seguir');
      }
    } else if (this.phase === 'conversa') {
      if (this.phaseT > 3.3) {
        this.phaseT = 0;
        if (this.lineI >= this.lines.length) return this.end(this.heard >= 3 ? 'ok' : 'longe');
        const [who, text] = this.lines[this.lineI++];
        const key = who === this.op.target ? 'st-alvo' : 'st-contato';
        const close = this.dist(key) < 560;
        if (close) this.heard++;
        sc.say(key, close ? text : '(longe demais para ouvir)', 3100);
        // de vez em quando alguém olha em volta
        if (this.lineI === 3) { this.lookAtKing('st-contato'); this.watch('st-contato', 0.6, 380); }
      }
    }
  }
  private arrived() {
    if (this.phase === 'fim' || this.op.kind === 'seguir' && this.phase === 'conversa') return;
    if (this.op.kind === 'seguir') {
      this.lines = overheard(this.op);
      this.lineI = 0;
      this.app.scene.face('st-alvo', 'east');
      this.app.scene.face('st-contato', 'west');
      this.go('conversa');
      this.phaseT = 2; // a primeira fala vem logo
    }
  }

  // ---------- procurar ----------
  private tickSearch(dt: number, kroom: RoomId | null) {
    if (this.phase === 'ir') {
      if (kroom !== this.op.room) return;
      // revirar: até cinco móveis do cômodo, um esconde a prova
      const w = this.app.scene.castleWorld!;
      const [rx, ry, rw, rh] = ROOMS[this.op.room].rect;
      const objs = w.objects.filter((o) => o.solid && o.w > 40 && o.x > rx && o.x + o.w < rx + rw && o.depth > ry && o.depth < ry + rh).sort(() => Math.random() - 0.5).slice(0, 5);
      const prize = Math.floor(Math.random() * Math.max(1, objs.length));
      this.spots = objs.map((o, i) => ({ x: o.x + o.w / 2, y: o.depth + 26, prize: i === prize && !!this.op.evId }));
      this.app.scene.say('st-pimenta', 'Aqui. Escolha bem: o guarda volta logo.', 3200);
      this.go('procurar');
      this.app.scene.setMarkers(this.markers());
      return;
    }
    if (this.phase === 'procurar') {
      this.clock -= dt;
      if (this.clock <= 0) { this.sus = 100; }
    }
  }
  search(i: number) {
    const sp = this.spots[i];
    if (!sp || sp.open || this.phase !== 'procurar') return;
    const sc = this.app.scene;
    sc.moveTo('rei', sp.x, sp.y, () => {
      window.setTimeout(() => {
        if (this.phase !== 'procurar') return;
        sp.open = true;
        sound.play('page');
        if (sp.prize) return this.end('ok');
        this.tries--;
        sc.say('rei', 'Nada.', 1500);
        sc.say('st-pimenta', this.tries ? `Nada. Mais ${this.tries}.` : 'Nada. Ouço passos!', 2400);
        sc.setMarkers(this.markers());
        if (!this.tries) this.end('longe');
      }, 600);
    }, 260);
  }

  // ---------- armadilha ----------
  private tickTrap(dt: number, kroom: RoomId | null) {
    const sc = this.app.scene;
    if (this.phase === 'ir') {
      if (kroom !== 'galeria') return;
      const k = sc.kingPos()!;
      const [gx, gy, gw] = ROOMS.galeria.rect;
      // a isca fica longe do rei, no meio da galeria
      const bx = k.x < gx + gw / 2 ? k.x + 650 : k.x - 650;
      this.bait = [Math.max(gx + 120, Math.min(gx + gw - 120, bx)), gy + 200];
      sc.moveTo('st-pimenta', this.bait[0], this.bait[1], () => { sc.say('st-pimenta', 'A isca está posta. Agora: um móvel, e silêncio.', 3400); }, 200);
      this.go('esconder');
      sc.setMarkers(this.markers());
      return;
    }
    if (this.phase === 'esconder') {
      const d = this.bait ? Math.hypot(sc.kingPos()!.x - this.bait[0], sc.kingPos()!.y - this.bait[1]) : 0;
      this.still = this.hidden() && d > 220 && d < 760 ? this.still + dt : 0;
      if (this.still > 2) {
        // Pimenta some também; alguém vem
        sc.moveTo('st-pimenta', this.bait![0] + 300, this.bait![1] + 40, () => sc.remove('st-pimenta'), 220);
        this.go('esperar');
      }
    } else if (this.phase === 'esperar' && this.phaseT > 5) {
      const [gx, gy, gw] = ROOMS.galeria.rect;
      const fromLeft = this.bait![0] > gx + gw / 2;
      sc.spawn('st-alvo', this.op.target, fromLeft ? gx + 60 : gx + gw - 60, gy + 220, fromLeft ? 'east' : 'west');
      sc.moveTo('st-alvo', this.bait![0], this.bait![1] + 10, () => { this.go('pegando'); this.lookAtKing('st-alvo'); sc.say('st-alvo', '...?', 2000); }, 85);
      sound.play('door');
      this.go('chegando');
    } else if (this.phase === 'chegando') {
      if (this.dist('st-alvo') < 85 || (sc.walking('rei') && this.dist('st-alvo') < 300)) this.sus += 60 * dt;
    } else if (this.phase === 'pegando') {
      this.watch('st-alvo', dt, 470);
      if (this.phaseT > 2.6) return this.end(this.dist('st-alvo') < 900 ? 'ok' : 'longe');
    }
  }

  private go(p: Phase) { this.phase = p; this.phaseT = 0; }

  private spotted() {
    const sc = this.app.scene;
    const key = sc.pos('st-alvo') ? 'st-alvo' : 'st-contato';
    sc.say(key, 'Quem está aí?!', 2600);
    sound.play('sting');
    this.end('falhou');
  }

  private end(r: 'ok' | 'falhou' | 'perdeu' | 'longe' | 'desistiu') {
    if (this.phase === 'fim') return;
    this.phase = 'fim';
    window.clearInterval(this.timer);
    const s = this.app.s;
    const out = finishOp(s, this.op, r === 'ok' ? 'ok' : r === 'falhou' ? 'falhou' : 'desistiu');
    const t = NAME(this.op.target);
    const text = r === 'perdeu' ? `Você perdeu ${t} de vista num corredor escuro. Pimenta suspira: "Da próxima vez, Majestade, menos dignidade e mais pressa."`
      : r === 'longe' ? (this.op.kind === 'procurar' ? 'Os passos da ronda chegam antes da prova. Vocês saem pela porta dos fundos de mãos vazias.' : 'Você estava longe demais para ouvir o que importava. Pedaços de frases, nomes soltos, nada que sirva de prova.')
      : out.text;
    this.result = { title: r === 'perdeu' ? 'Perdido no escuro' : r === 'longe' ? 'Quase' : out.title, text, ok: r === 'ok' };
    s.log.push({ icon: 'olho', title: `Noite: ${this.result.title}`, text, tone: r === 'ok' ? 'bom' : 'rumor' });
    save(s);
    sound.play(r === 'ok' ? 'good' : r === 'falhou' ? 'bad' : 'page');
    this.app.scene.setMarkers([]);
    window.setTimeout(() => {
      // quem estava em cena vai embora
      for (const key of ['st-alvo', 'st-contato']) if (this.app.scene.pos(key)) this.app.scene.leave(key);
    }, 1800);
    this.paint();
  }

  quit() { if (this.phase !== 'fim') this.end('desistiu'); }

  // fecha o cartão do resultado e devolve o castelo
  close() {
    const sc = this.app.scene;
    for (const key of ['st-alvo', 'st-contato', 'st-pimenta']) sc.remove(key);
    sc.setHidden(`npc-${this.op.target}`, false);
    if (this.op.contact) sc.setHidden(`npc-${this.op.contact}`, false);
    sc.setHidden('npc-pimenta', false);
  }

  markers(): SceneMarker[] {
    if (this.op.kind === 'procurar' && this.phase === 'procurar') return this.spots.map((sp, i) => ({ key: `op-${i}`, x: sp.x, y: sp.y - 110, label: sp.open ? '✗' : '?', act: sp.open ? 'noop' : 'opSearch', arg: String(i), kind: 'objeto' as const }));
    if (this.op.kind === 'armadilha' && this.bait && (this.phase === 'esconder' || this.phase === 'esperar')) return [{ key: 'op-isca', x: this.bait[0], y: this.bait[1] - 40, label: '✉ isca', act: 'noop', arg: '', kind: 'objeto' }];
    return [];
  }

  // ---------- interface ----------
  private instruction(): string {
    const t = NAME(this.op.target);
    const R = ROOMS[this.op.room].name;
    switch (this.phase) {
      case 'seguir': return this.dist('st-alvo') > 800 ? `Você está ficando para trás! Siga ${t}.` : `Siga ${t} de longe. Toque no chão para andar.`;
      case 'aviso': return `${t} parou… vai olhar para trás! Pare perto de um móvel!`;
      case 'olhando': return this.hidden() ? 'Escondido. Não se mexa.' : 'Exposto! Pare perto de um móvel!';
      case 'conversa': return `${t} encontrou alguém. Chegue perto o bastante para ouvir (e escondido).`;
      case 'ir': return this.op.kind === 'procurar' ? `Vá até ${R}.` : 'Vá até a Galeria Real.';
      case 'procurar': return `Toque nos ? para revirar. ${this.tries} chance${this.tries > 1 ? 's' : ''}.`;
      case 'esconder': return 'Esconda-se perto de um móvel, longe da isca (mas à vista), e fique parado.';
      case 'esperar': return 'Silêncio. Alguém está vindo…';
      case 'chegando': return 'Não se mexa.';
      case 'pegando': return `É ${t}! Não se mexa…`;
      default: return '';
    }
  }

  overlay(): string {
    const title = { seguir: `Seguir ${NAME(this.op.target)}`, procurar: `Revirar as coisas de ${NAME(this.op.target)}`, armadilha: 'A armadilha da galeria' }[this.op.kind];
    if (this.result && this.phase === 'fim') return `<div class="op-result ${this.result.ok ? 'ok' : ''}"><h2>${esc(this.result.title)}</h2><p>${esc(this.result.text)}</p><button class="btn primary" data-act="opClose">Voltar</button></div>`;
    return `<div class="op-panel"><div class="op-top"><b>${esc(title)}</b><button class="btn sm" data-act="opQuit">Desistir</button></div>
      <p class="op-ins"></p>
      <div class="op-bar"><span>Desconfiança</span><i><u class="op-sus"></u></i></div>
      ${this.op.kind === 'procurar' ? '<div class="op-clock"></div>' : ''}</div>
      <div class="op-alert"></div>`;
  }

  // atualização leve (sem redesenhar a tela inteira)
  private paint() {
    const root = this.app.stage;
    if (this.phase === 'fim') { this.app.render(); return; }
    const ins = root.querySelector<HTMLElement>('.op-ins');
    if (ins) ins.textContent = this.instruction();
    const bar = root.querySelector<HTMLElement>('.op-sus');
    if (bar) { bar.style.width = `${Math.min(100, Math.round(this.sus))}%`; bar.classList.toggle('hot', this.sus > 60); }
    const clock = root.querySelector<HTMLElement>('.op-clock');
    if (clock) clock.textContent = this.phase === 'procurar' ? `A ronda volta em ${Math.max(0, Math.ceil(this.clock))}s` : '';
    const alert = root.querySelector<HTMLElement>('.op-alert');
    if (alert) {
      const on = this.phase === 'aviso' || this.phase === 'olhando' || this.phase === 'pegando';
      alert.textContent = on ? (this.hidden() ? 'ESCONDIDO' : 'PARE PERTO DE UM MÓVEL!') : '';
      alert.className = `op-alert ${on ? 'on' : ''} ${on && this.hidden() ? 'safe' : ''}`;
    }
  }
}
