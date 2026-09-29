import type { Good, HouseId, ProvinceId, TaxLevel } from '../../types';
import type { App } from '../app';
import type { Lens } from '../worldMap';
import { GOODS, HOUSES, KINGDOM_PROVINCES, PROVINCES } from '../../data/realm';
import { clamp, save } from '../../engine/core';
import { canSpend, spendHours } from '../../engine/day';
import { WORK_DAYS, WORK_NAMES, computeEconomy, nextRouteId, price, production, needs, taxKey } from '../../engine/economy';
import { holder } from '../../engine/council';
import { char } from '../../data/characters';
import { levyUnits } from '../../engine/war';
import { iconImg } from '../../render/pixel';
import { esc, shield } from '../common';

const DECREE_HOURS = 1;
const INVEST_COST = 300;

const LENSES: [Lens, string, string, string][] = [
  ['casas', 'flor', 'Casas', 'Quem governa cada província'],
  ['lealdade', 'coracao', 'Lealdade', 'Verde leal, vermelho hostil'],
  ['producao', 'trigo', 'Produção', 'Onde cada mercadoria nasce'],
  ['escassez', 'selo', 'Escassez', 'O que falta em cada lugar'],
  ['rotas', 'moedas', 'Rotas', 'Caravanas e navios mercantes'],
  ['impostos', 'pergaminho', 'Impostos', 'Baixo, normal ou alto'],
];

const LEGEND: Record<string, string> = {
  casas: '<span class="sw" style="--c:#2350b0"></span>Valmont <span class="sw" style="--c:#9a1f24"></span>Drakon <span class="sw" style="--c:#1f6a44"></span>Seren <span class="sw" style="--c:#6a6c78"></span>Montclair <span class="sw" style="--c:#2a3f8f"></span>Coroa',
  lealdade: '<span class="grad loy"></span><small>hostil · neutro · leal</small>',
  producao: '<span class="grad prod"></span><small>nada · muito</small>',
  escassez: '<span class="sw" style="--c:#3aa84a"></span>abastecida <span class="sw" style="--c:#d83a2a"></span>falta algo',
  rotas: '<small>Carroças e navios mostram as mercadorias em movimento. A cor da carga indica o produto.</small>',
  impostos: '<span class="sw" style="--c:#3aa84a"></span>baixo <span class="sw" style="--c:#e8c848"></span>normal <span class="sw" style="--c:#d83a2a"></span>alto',
};

export function render(app: App): string {
  const s = app.s;
  app.scene.setMode('dim');
  const eco = computeEconomy(s);
  const ui = app.ui;
  const lensBar = `<div class="lens-bar">
    <h3>${iconImg('olho')} Filtros</h3>
    ${LENSES.map(([id, icon, name, tip]) => `<button class="lens ${ui.lens === id ? 'on' : ''}" data-act="lens" data-arg="${id}" title="${tip}">${iconImg(icon)}<span>${name}</span></button>`).join('')}
    ${ui.lens === 'producao' ? `<div class="goods">${(Object.keys(GOODS) as Good[]).map((g) => `<button class="${ui.good === g ? 'on' : ''}" data-act="good" data-arg="${g}" title="${GOODS[g].name}">${iconImg(GOODS[g].icon)}</button>`).join('')}</div>` : ''}
    <div class="legend">${LEGEND[ui.lens] ?? ''}</div>
  </div>`;

  const ecoCard = `<div class="eco-card">
    <span>${iconImg('moedas')} Impostos <b>+${eco.taxTotal}</b></span>
    <span>Rotas <b>+${eco.tradeTotal}</b></span>
    <span>Soldo <b class="neg">−${eco.upkeep}</b></span>
    <span>Caravanas <b class="neg">−${eco.caravans}</b></span>
    ${eco.cuts ? `<span title="${esc(eco.cutWho.join(', '))}">Parte de outros <b class="neg">−${eco.cuts}</b></span>` : ''}
    <span>${iconImg('trigo')} Celeiro <b>${s.granary ?? 0}</b></span>
    <button class="btn sm" data-act="ledger">${iconImg('livro')} Livro de Contas</button>
    <span class="net ${eco.net >= 0 ? 'pos' : 'neg'}">Saldo diário <b>${eco.net >= 0 ? '+' : ''}${eco.net}</b></span>
    ${eco.shortages.length ? `<span class="warn">${iconImg('selo')} ${new Set(eco.shortages.map((x) => x.province)).size} província(s) com escassez</span>` : ''}
  </div>`;

  return `<div class="map-stage ${ui.cardOpen ? 'with-card' : ''}">
    <div class="map-caption"><b>Mapa comercial</b><small>Selecione uma província para ver produção, impostos e rotas.</small></div>
    <div class="map-slot" id="map-slot"></div>
    ${lensBar}
    ${ecoCard}
  </div>
  ${ui.cardOpen ? detailCard(app) : `<button class="card-tab" data-act="openCard">${iconImg('castelo')} ${PROVINCES[ui.province as ProvinceId].name}</button>`}
  ${ledgerOpen ? ledger(app) : ''}`;
}

let ledgerOpen = false;

// Livro de Contas: preços, celeiro, rotas paradas, obras e quem leva uma parte
function ledger(app: App) {
  const s = app.s;
  const eco = computeEconomy(s);
  const who = holder(s, 'tesoureiro');
  const trend = (g: Good) => {
    const h = s.marketHist?.[g] ?? [];
    if (h.length < 2) return '';
    const d = h[h.length - 1] - h[0];
    return d > 0.08 ? '<em class="up">▲</em>' : d < -0.08 ? '<em class="down">▼</em>' : '<em>•</em>';
  };
  const blocked = eco.routes.filter((r) => r.blocked);
  return `<div class="modal-back"><div class="parchment modal castle-modal ledger-modal">
    <button class="modal-x" data-act="ledger" aria-label="Fechar">×</button>
    <h2>Livro de Contas</h2>
    <p class="sub">${who ? `Escrito com a letra de ${esc(char(who).name)}.` : 'Ninguém cuida do tesouro: a cadeira do Tesoureiro está vazia.'}</p>
    <h3>Preços de hoje</h3>
    <div class="prices">${(Object.keys(GOODS) as Good[]).map((g) => `<span>${iconImg(GOODS[g].icon)} ${GOODS[g].name} <b>${price(s, g).toFixed(1)}</b> ${trend(g)}</span>`).join('')}</div>
    <p class="hint">O inverno encarece grão e lenha; a guerra encarece ferro; a falta de qualquer coisa a encarece. Exportar e vender caro rende mais tarifa.</p>
    <h3>Celeiro real</h3>
    <p>${s.granary ?? 0} sacas guardadas. ${eco.granaryDraw ? `Hoje saem ${eco.granaryDraw} para matar a fome.` : ''} ${eco.stored ? `Hoje entram ${eco.stored}.` : 'Crie uma rota de grão para o "Celeiro real" para guardar para o inverno.'}</p>
    <h3>Saldo do dia</h3>
    <ul class="estado-list">
      <li><span><b>Impostos</b></span><em>+${eco.taxTotal}</em></li>
      <li><span><b>Tarifas das rotas</b></span><em>+${eco.tradeTotal}</em></li>
      ${eco.cuts ? `<li class="bad"><span><b>Parte de outros</b><small>${esc(eco.cutWho.join(', '))}</small></span><em>−${eco.cuts}</em></li>` : ''}
      <li class="bad"><span><b>Caravanas e escoltas</b></span><em>−${eco.caravans}</em></li>
      <li class="bad"><span><b>Soldo do exército</b></span><em>−${eco.upkeep}</em></li>
      <li><span><b>Saldo</b></span><em>${eco.net >= 0 ? '+' : ''}${eco.net}</em></li>
    </ul>
    ${blocked.length ? `<h3>Rotas paradas</h3><ul>${blocked.map((r) => `<li>${GOODS[r.route.good].name} de ${PROVINCES[r.route.from].name}: ${esc(r.blocked!)}</li>`).join('')}</ul>` : ''}
    ${(s.works ?? []).length ? `<h3>Obras</h3><ul>${s.works!.map((w) => `<li>${esc(w.name)} em ${PROVINCES[w.province].name}: pronta no Dia ${w.ready}</li>`).join('')}</ul>` : ''}
    <h3>Delegar</h3>
    <button class="btn ${s.flags.tesoureiroRotas ? 'primary' : ''}" data-act="delegateRoutes" ${who ? '' : 'disabled'}>${s.flags.tesoureiroRotas ? 'O Tesoureiro cuida das rotas (tocar para retomar)' : 'Deixar o Tesoureiro abrir rotas contra a escassez'}</button>
    <p class="hint">Delegar resolve a falta sem gastar suas horas, mas o Tesoureiro decide sozinho e ganha poder.</p>
  </div></div>`;
}

function detailCard(app: App) {
  const s = app.s;
  const sel = app.ui.province as ProvinceId;
  const P = PROVINCES[sel];
  const eco = computeEconomy(s);
  const key = taxKey(sel);
  const H = HOUSES[P.house];
  const prod = production(s, sel);
  const outRoutes = eco.routes.filter((r) => r.route.from === sel);
  const inRoutes = eco.routes.filter((r) => r.route.to === sel);
  const shortages = eco.shortages.filter((x) => x.province === sel);
  const levy = key === 'coroa' ? Math.floor(s.res.exercito / 100) * 100 : levyUnits(s, key as HouseId) * 100;
  const loyal = key === 'coroa' ? `Povo ${s.res.povo}` : `Lealdade ${s.loyalty[key]}`;
  const goodsSel = (Object.keys(P.produces) as Good[]).map((g) => `<option value="${g}">${GOODS[g].name}</option>`).join('');
  const dests = [...KINGDOM_PROVINCES.filter((x) => x !== sel).map((x) => `<option value="${x}">${PROVINCES[x].name}</option>`), `<option value="veridian">Véridian (exportação)</option>`, ...(P.produces.graos ? ['<option value="celeiro">Celeiro real (guardar grão)</option>'] : [])].join('');

  return `<div class="prov-card parchment">
    <button class="x-close" data-act="closeCard" title="Fechar">×</button>
    <div class="pd-head">${shield(P.house, 'shield lg')}<div><h2>${P.name}</h2><small>${H.name}${H.lord ? '' : ' · Província Real'} · ${loyal}</small></div></div>
    <p class="desc">${esc(P.desc)}</p>
    <div class="pd-row"><span>População <b>${P.population.toLocaleString('pt-BR')}</b></span><span>Tropas <b>${levy}</b></span><span>Impostos <b>+${eco.taxes[sel]}</b>/dia</span></div>
    <h3>Produção</h3>
    ${(Object.entries(prod) as [Good, number][]).map(([g, n]) => `<div class="prod">${iconImg(GOODS[g].icon)}<span>${GOODS[g].name}</span><div class="bar gold"><i style="width:${(n / 6) * 100}%"></i></div><b>+${n}</b></div>`).join('')}
    <h3>Necessidades</h3>
    <div class="needs">${(Object.entries(needs(s, sel)) as [Good, number][]).map(([g, n]) => {
      const miss = shortages.find((x) => x.good === g);
      return `<span class="need ${miss ? 'miss' : 'ok'}">${iconImg(GOODS[g].icon)} ${GOODS[g].name} ${n}${miss ? ` · faltam ${miss.missing}` : ' ✓'}</span>`;
    }).join('') || '<small>Autossuficiente.</small>'}</div>
    ${shortages.map((sh) => {
      // quem tem sobra dessa mercadoria para mandar para cá?
      const sources = KINGDOM_PROVINCES.filter((p) => p !== sel && (eco.surplus[p]?.[sh.good] ?? 0) > 0 && !s.routes.some((r) => r.from === p && r.to === sel && r.good === sh.good));
      return sources.length
        ? `<div class="fix">${iconImg(GOODS[sh.good].icon)}<span>Falta <b>${GOODS[sh.good].name.toLowerCase()}</b>. Traga de outra província:</span>${sources.map((p) => `<button class="btn sm" data-act="fixShortage" data-arg="${p}|${sh.good}">Trazer de ${PROVINCES[p].name} <small>${eco.surplus[p]![sh.good]} sobrando · 1h</small></button>`).join('')}</div>`
        : `<div class="fix none">${iconImg(GOODS[sh.good].icon)}<span>Ninguém no reino tem <b>${GOODS[sh.good].name.toLowerCase()}</b> sobrando. Invista numa província que produz ${GOODS[sh.good].name.toLowerCase()} (filtro <b>Produção</b>) ou cancele rotas que levam essa mercadoria para fora.</span></div>`;
    }).join('')}
    <h3>Impostos ${key === 'coroa' ? '(afeta o Povo)' : '(afeta a lealdade)'} · ${DECREE_HOURS}h</h3>
    <div class="seg">${(['baixo', 'normal', 'alto'] as TaxLevel[]).map((t) => `<button class="${s.taxes[key] === t ? 'on' : ''}" data-act="tax" data-arg="${t}">${t}</button>`).join('')}</div>
    <h3>Rotas comerciais</h3>
    ${outRoutes.map((r) => `<div class="route ${r.blocked ? 'blocked' : ''}">${iconImg(GOODS[r.route.good].icon)} ${GOODS[r.route.good].name} → ${r.route.to === 'veridian' ? 'Véridian' : r.route.to === 'celeiro' ? 'Celeiro real' : PROVINCES[r.route.to].name} <small>${r.blocked ? `parada: ${esc(r.blocked)}` : `${r.amount} un${r.tariff ? ` · +${r.tariff} ouro` : ''}`}</small><button class="x esc ${r.route.escort ? 'on' : ''}" data-act="escort" data-arg="${r.route.id}" title="${r.route.escort ? 'Tirar a escolta' : 'Pôr escolta (−3 ouro/dia, sem bandidos)'}">${iconImg('escudo')}</button><button class="x" data-act="delRoute" data-arg="${r.route.id}" title="Cancelar rota (1h)">×</button></div>`).join('')}
    ${inRoutes.map((r) => `<div class="route in">${iconImg(GOODS[r.route.good].icon)} ${GOODS[r.route.good].name} ← ${PROVINCES[r.route.from].name} <small>${r.amount} un</small></div>`).join('')}
    ${!outRoutes.length && !inRoutes.length ? '<small>Nenhuma rota passa por aqui.</small>' : ''}
    ${goodsSel ? `<div class="new-route"><select id="rg">${goodsSel}</select><span>→</span><select id="rd">${dests}</select><button class="btn sm" data-act="addRoute">Decretar (${DECREE_HOURS}h)</button></div>` : ''}
    ${(s.works ?? []).filter((w) => w.province === sel).map((w) => `<p class="work">${iconImg('martelo')} ${esc(w.name)} em obras · pronta no Dia ${w.ready}</p>`).join('')}
    <button class="act-btn a-verde" data-act="invest" ${(s.investments[sel] ?? 0) + (s.works ?? []).filter((w) => w.province === sel).length >= 3 ? 'disabled' : ''}>${iconImg('martelo', 'ico-lg')}<span><b>Construir: ${WORK_NAMES[(Object.keys(P.produces)[0] as Good) ?? 'graos']}</b><small>−${INVEST_COST} ouro · ${WORK_DAYS} dias de obra · +25% produção (${s.investments[sel] ?? 0}/3)</small></span></button>
  </div>`;
}

export function after(app: App) {
  const map = app.map;
  map.mount(app.stage.querySelector<HTMLElement>('#map-slot'));
  map.onPick = (id) => {
    if (!KINGDOM_PROVINCES.includes(id)) return app.toast(`${PROVINCES[id].name} pertence a Norhelm.`);
    app.ui.province = id;
    app.ui.cardOpen = true;
    app.render();
  };
  map.update(app.s, { lens: app.ui.lens, good: app.ui.good, selected: app.ui.province as ProvinceId });
}

function decree(app: App): boolean {
  if (!canSpend(app.s, DECREE_HOURS)) {
    app.toast('Não há horas suficientes hoje.');
    return false;
  }
  spendHours(app.s, DECREE_HOURS);
  return true;
}

export function handle(app: App, act: string, arg: string) {
  const s = app.s;
  const sel = app.ui.province as ProvinceId;
  switch (act) {
    case 'prov':
      if (!KINGDOM_PROVINCES.includes(arg as ProvinceId)) return app.toast(`${PROVINCES[arg as ProvinceId].name} pertence a Norhelm.`);
      app.ui.province = arg;
      app.ui.cardOpen = true;
      return app.render();
    case 'lens':
      app.ui.lens = arg as Lens;
      return app.render();
    case 'good':
      app.ui.good = arg as Good;
      return app.render();
    case 'closeCard':
      app.ui.cardOpen = false;
      return app.render();
    case 'openCard':
      app.ui.cardOpen = true;
      return app.render();
    case 'tax': {
      const key = taxKey(sel);
      if (s.taxes[key] === arg || !decree(app)) return;
      s.taxes[key] = arg as TaxLevel;
      app.toast(`Impostos de ${PROVINCES[sel].name}: ${arg}.`);
      break;
    }
    case 'ledger':
      ledgerOpen = !ledgerOpen;
      return app.render();
    case 'delegateRoutes':
      s.flags.tesoureiroRotas = !s.flags.tesoureiroRotas;
      app.toast(s.flags.tesoureiroRotas ? 'O Tesoureiro vai abrir rotas por conta própria.' : 'As rotas voltam a ser decisão sua.');
      break;
    case 'escort': {
      const r = s.routes.find((x) => x.id === Number(arg));
      if (!r) return;
      r.escort = !r.escort;
      app.toast(r.escort ? 'Escolta designada. Custa 3 ouro por dia.' : 'Escolta dispensada.');
      break;
    }
    case 'delRoute':
      if (!decree(app)) return;
      s.routes = s.routes.filter((r) => r.id !== Number(arg));
      break;
    case 'addRoute': {
      const g = app.stage.querySelector<HTMLSelectElement>('#rg')!.value as Good;
      const to = app.stage.querySelector<HTMLSelectElement>('#rd')!.value as ProvinceId | 'veridian' | 'celeiro';
      if (to === 'celeiro' && g !== 'graos') return app.toast('O celeiro só guarda grão.');
      if (s.routes.some((r) => r.from === sel && r.to === to && r.good === g)) return app.toast('Essa rota já existe.');
      if (!decree(app)) return;
      s.routes.push({ id: nextRouteId(s), from: sel, to, good: g });
      if (to === 'veridian') {
        const k = taxKey(sel);
        if (k !== 'coroa') s.loyalty[k] = clamp(s.loyalty[k] + 3, -100, 100);
      }
      app.ui.lens = 'rotas';
      app.toast('Nova rota decretada. Veja as caravanas no mapa.');
      break;
    }
    case 'fixShortage': {
      const [from, good] = arg.split('|') as [ProvinceId, Good];
      if (!decree(app)) return;
      s.routes.push({ id: nextRouteId(s), from, to: sel, good });
      app.ui.lens = 'escassez';
      app.toast(`Rota criada: ${GOODS[good].name} de ${PROVINCES[from].name} para ${PROVINCES[sel].name}.`);
      break;
    }
    case 'invest': {
      if (s.res.ouro < INVEST_COST) return app.toast('Ouro insuficiente.');
      if (!decree(app)) return;
      s.res.ouro -= INVEST_COST;
      const good = (Object.keys(PROVINCES[sel].produces)[0] as Good) ?? 'graos';
      (s.works ??= []).push({ province: sel, name: WORK_NAMES[good], ready: s.day + WORK_DAYS });
      const k = taxKey(sel);
      if (k !== 'coroa') s.loyalty[k] = clamp(s.loyalty[k] + 4, -100, 100);
      else s.res.povo = clamp(s.res.povo + 3, 0, 100);
      app.toast(`Obra iniciada em ${PROVINCES[sel].name}. Fica pronta em ${WORK_DAYS} dias.`);
      break;
    }
    default:
      return;
  }
  save(s);
  app.render();
}
