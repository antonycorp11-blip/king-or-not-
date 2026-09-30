import type { App } from './app';

// TUTORIAL GUIADO
// Na primeira vez que o jogador chega a um lugar do jogo, a tela escurece, o botão
// certo ganha uma moldura pulsando e um balão explica o que fazer ali. Cada passo
// aponta um elemento da tela; passos cujo elemento não existe são pulados.

interface Step {
  sel: string; // elemento a destacar
  title: string;
  text: string;
  optional?: boolean; // some da tela às vezes (ex.: não há falta nenhuma)
  advanceOn?: (app: App) => boolean; // passa sozinho quando o jogador faz a ação
  wait?: boolean; // só avança pela ação (sem botão Próximo)
}
interface Tour { id: string; when: (app: App) => boolean; steps: Step[]; tips?: string[] }

const onTrono = (app: App) => app.ui.screen === 'trono' && !app.ui.dialog && !app.ui.castleModal && !app.ui.summary && !app.ui.panel && !app.cinema.active && !app.ui.sleeping;

export const TOURS: Tour[] = [
  { id: 'castelo', tips: ['castelo', 'inicio'], when: onTrono, steps: [
    { sel: '.hud-king', title: 'Este é você', text: 'O retrato mostra o humor do rei e a vela mostra quantas horas ainda restam no dia. Toque nele para ver o Estado do Reino.' },
    { sel: '.hud-res', title: 'Os recursos da coroa', text: 'Ouro, Influência e Governabilidade. Se o ouro ficar negativo, os soldados param de receber e a guarda se revolta.' },
    { sel: '.dock-btn[data-act="agenda"]', title: 'A agenda do dia', text: 'Compromissos com hora e lugar: audiências, almoço, jantar, encontros marcados. Faltar tem consequência.' },
    { sel: '.dock-btn[data-act="castleMap"]', title: 'Ir a qualquer lugar', text: 'Abre o mapa dos cômodos e mostra onde cada pessoa está agora. O rei vai andando até lá.' },
    { sel: '.dock-btn[data-act="ring"]', title: 'O que fazer aqui', text: 'Mostra as ações do cômodo onde o rei está. Você também pode tocar direto nos móveis: estante, escrivaninha, trono, cama.' },
    { sel: '#stage > .scene', title: 'Andar e conversar', text: 'Toque no chão para andar. Toque numa pessoa para conversar com ela. Quem está por perto comenta quando o rei chega.' },
    { sel: '.dock-btn[data-act="endDay"]', title: 'Terminar o dia', text: 'Quando quiser, vá dormir: o rei atravessa o castelo até a cama. À noite, coisas acontecem pelo caminho.' },
  ] },
  { id: 'pontos', tips: ['rei'], when: (app) => app.s.skillPoints > 0 && !!app.s.flags.tour_castelo && (onTrono(app) || app.ui.screen === 'rei'), steps: [
    { sel: '.medal[data-arg="rei"], .nav-toggle', title: 'Um ponto de habilidade!', text: 'Suas decisões e leituras deram experiência. Toque em O Rei para gastar o ponto.', wait: true, advanceOn: (app) => app.ui.screen === 'rei' },
    { sel: '.kh-points', title: 'Seus pontos', text: 'Cada 100 de experiência vira um ponto. Decisões difíceis e livros concluídos rendem mais.' },
    { sel: '.st-node.avail', title: 'A árvore do rei', text: 'Os nós que brilham podem ser aprendidos. Cada galho é um jeito de governar e sobe até habilidades mais fortes. Toque em um nó para ver o que ele faz.' },
    { sel: '.st-learn', title: 'Aprender', text: 'Toque em Aprender para gastar o ponto. O próximo nó do galho fica liberado.', optional: true },
  ] },
  { id: 'comercio', tips: ['provincias', 'escassez'], when: (app) => app.ui.screen === 'provincias' && !app.ui.panel, steps: [
    { sel: '.lens-bar', title: 'Os filtros do mapa', text: 'Mudam o que o mapa mostra: as casas, a produção de cada província e onde está faltando alguma coisa.' },
    { sel: '.wm-flag', title: 'Abrir uma província', text: 'Toque na bandeira de uma província para abrir a ficha dela.', wait: true, advanceOn: () => !!document.querySelector('.prov-card') },
    { sel: '.prov-card .needs', title: 'Necessidades', text: 'O que a província precisa. Quando falta, a lealdade dela cai todo dia (na capital, cai o Povo).' },
    { sel: '.prov-card .fix .btn', title: 'Resolver uma falta', text: 'Toque em "Trazer de…" para criar uma rota de quem tem sobrando. A rota ainda rende tarifas para a coroa.', optional: true },
    { sel: '.prov-card .seg', title: 'Impostos', text: 'Imposto alto dá mais ouro e irrita a casa dona da província. Mudar é um decreto e custa 1 hora.' },
    { sel: '.prov-card .new-route', title: 'Criar rotas', text: 'Escolha a mercadoria e o destino e decrete. Exportar para Véridian dá ouro; mandar ao celeiro guarda grão para o inverno.', optional: true },
    { sel: '.prov-card .act-btn', title: 'Obras', text: 'Construir aumenta a produção da província depois de alguns dias de obra.', optional: true },
    { sel: '[data-act="ledger"]', title: 'Livro de Contas', text: 'De onde vem e para onde vai cada moeda do reino, dia a dia.' },
  ] },
  { id: 'biblioteca', tips: ['biblioteca'], when: (app) => app.ui.screen === 'biblioteca' && !app.ui.panel, steps: [
    { sel: '.book-read', title: 'Ler um livro', text: 'Abra um livro e escolha quanto tempo ler. Cada livro terminado libera respostas novas nos diálogos, e quanto melhor você lê, mais forte fica a citação.' },
  ] },
  { id: 'casas', tips: ['corte'], when: (app) => app.ui.screen === 'corte' && !app.ui.panel && app.ui.courtTab !== 'correio', steps: [
    { sel: '.house-card', title: 'As grandes casas', text: 'Cada casa tem lealdade, humor, tropas próprias e uma rival. Quando exige algo, o prazo aparece aqui e o lorde vem pedir no salão.' },
    { sel: '.summon', title: 'Convocar', text: 'Chame um lorde ao castelo para conversar, pedir apoio ou lembrar a quem ele deve lealdade.', optional: true },
  ] },
  { id: 'guerra', tips: ['guerra'], when: (app) => app.ui.screen === 'guerra' && !app.ui.panel, steps: [
    { sel: '.map-stage', title: 'O mapa da guerra', text: 'Seus exércitos e os do inimigo, província por província. Toque num exército para dar ordens.' },
    { sel: '.act-btn', title: 'Ordens e conselho', text: 'Convoque o Conselho de Guerra para planejar a noite: marchar, atacar, defender ou recuar. Ou delegue ao Marechal.', optional: true },
  ] },
];

export class Guide {
  private el: HTMLElement;
  constructor(private app: App, stage: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'guide';
    stage.appendChild(this.el);
  }

  private get state() { return this.app.ui.tour; }

  // Depois de cada render: começa um roteiro, avança passos e posiciona o destaque
  place() {
    const app = this.app;
    const s = app.s;
    if (s.flags.tutorialOff || app.ui.screen === 'titulo') return this.hide();
    let t = this.state;
    if (!t) {
      const next = TOURS.find((x) => !s.flags[`tour_${x.id}`] && x.when(app));
      if (!next) return this.hide();
      t = app.ui.tour = { id: next.id, i: 0 };
    }
    const tour = TOURS.find((x) => x.id === t!.id)!;
    let step = tour.steps[t.i];
    // passos resolvidos pela ação do jogador ou sem elemento na tela
    for (let guard = 0; step && guard < 10; guard++) {
      if (step.advanceOn?.(app)) { t.i++; step = tour.steps[t.i]; continue; }
      if (!this.target(step.sel) && step.optional) { t.i++; step = tour.steps[t.i]; continue; }
      break;
    }
    if (!step) return this.finish(tour);
    // o roteiro pausa enquanto há diálogo ou pergaminho aberto
    if (app.ui.dialog || app.ui.castleModal || app.ui.summary || app.cinema.active) return this.hide();
    const target = this.target(step.sel);
    if (!target) return this.hide();
    this.draw(target, step, t.i, tour.steps.length);
  }

  private target(sel: string) {
    // o primeiro elemento visível entre os que casam com o seletor
    // (na ordem do seletor: "a, b" tenta a primeiro, depois b)
    for (const part of sel.split(',')) for (const el of this.app.stage.querySelectorAll<HTMLElement>(part.trim())) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return el;
    }
    return null;
  }

  private draw(el: HTMLElement, step: Step, i: number, n: number) {
    const stage = this.app.stage;
    const sr = stage.getBoundingClientRect();
    const k = sr.width / stage.offsetWidth || 1;
    const r = el.getBoundingClientRect();
    const pad = 6;
    let x = (r.left - sr.left) / k - pad, y = (r.top - sr.top) / k - pad, w = r.width / k + pad * 2, h = r.height / k + pad * 2;
    // alvos enormes (a cena inteira): destaque menor no meio
    if (w > stage.offsetWidth * 0.8) { x = stage.offsetWidth * 0.3; w = stage.offsetWidth * 0.4; y = stage.offsetHeight * 0.3; h = stage.offsetHeight * 0.35; }
    const below = y + h + 230 < stage.offsetHeight;
    const bw = Math.min(460, stage.offsetWidth - 32);
    const bx = Math.max(16, Math.min(stage.offsetWidth - bw - 16, x + w / 2 - bw / 2));
    const by = below ? y + h + 18 : Math.max(16, y - 18);
    const ax = Math.max(24, Math.min(bw - 24, x + w / 2 - bx));
    this.el.className = 'guide on';
    const SW = stage.offsetWidth, SH = stage.offsetHeight;
    // quatro faixas escuras em volta do destaque
    const shade = [[0, 0, SW, y], [0, y + h, SW, SH - y - h], [0, y, x, h], [x + w, y, SW - x - w, h]]
      .map(([l, t, ww, hh]) => `<i class="guide-shade" style="left:${l}px;top:${t}px;width:${Math.max(0, ww)}px;height:${Math.max(0, hh)}px"></i>`).join('');
    this.el.innerHTML = `${shade}<div class="guide-hole" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></div>
      <div class="guide-bubble ${below ? 'below' : 'above'}" style="left:${bx}px;${below ? `top:${by}px` : `bottom:${stage.offsetHeight - by}px`};width:${bw}px;--ax:${ax}px">
        <small>${i + 1} de ${n}</small><b>${step.title}</b><p>${step.text}</p>
        <div class="row"><button class="btn sm" data-act="guideSkip">Pular tutorial</button>${step.wait ? '<em>Toque no destaque</em>' : `<button class="btn primary sm" data-act="guideNext">${i + 1 < n ? 'Próximo' : 'Entendi'}</button>`}</div>
      </div>`;
  }

  private hide() { this.el.className = 'guide'; this.el.innerHTML = ''; }

  private finish(tour: Tour) {
    const s = this.app.s;
    s.flags[`tour_${tour.id}`] = true;
    for (const t of tour.tips ?? []) s.flags[`tip_${t}`] = true; // a dica antiga do mesmo lugar não aparece de novo
    this.app.ui.tour = null;
    this.hide();
  }

  handle(act: string): boolean {
    const t = this.state;
    if (act === 'guideNext' && t) {
      t.i++;
      const tour = TOURS.find((x) => x.id === t.id)!;
      if (t.i >= tour.steps.length) this.finish(tour);
      this.app.render();
      return true;
    }
    if (act === 'guideSkip') {
      if (t) this.finish(TOURS.find((x) => x.id === t.id)!);
      this.app.render();
      return true;
    }
    if (act === 'guideReset') {
      for (const x of TOURS) delete this.app.s.flags[`tour_${x.id}`];
      this.app.s.flags.tutorialOff = false;
      this.app.ui.tour = null;
      this.app.ui.panel = null;
      this.app.render();
      return true;
    }
    return false;
  }
}
