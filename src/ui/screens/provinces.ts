import type { Good, HouseId, ProvinceId, TaxLevel } from '../../types';
import type { App } from '../app';
import type { Lens } from '../worldMap';
import { GOODS, HOUSES, KINGDOM_PROVINCES, PROVINCES } from '../../data/realm';
import { clamp, save } from '../../engine/core';
import { canSpend, spendHours } from '../../engine/day';
import { computeEconomy, nextRouteId, production, taxKey } from '../../engine/economy';
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
    <span class="net ${eco.net >= 0 ? 'pos' : 'neg'}">Saldo diário <b>${eco.net >= 0 ? '+' : ''}${eco.net}</b></span>
    ${eco.shortages.length ? `<span class="warn">${iconImg('selo')} ${new Set(eco.shortages.map((x) => x.province)).size} província(s) com escassez</span>` : ''}
  </div>`;

  return `<div class="map-stage ${ui.cardOpen ? 'with-card' : ''}">
    <div class="map-slot" id="map-slot"></div>
    ${lensBar}
    ${ecoCard}
  </div>
  ${ui.cardOpen ? detailCard(app) : `<button class="card-tab" data-act="openCard">${iconImg('castelo')} ${PROVINCES[ui.province as ProvinceId].name}</button>`}`;
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
  const dests = [...KINGDOM_PROVINCES.filter((x) => x !== sel).map((x) => `<option value="${x}">${PROVINCES[x].name}</option>`), `<option value="veridian">Véridian (exportação)</option>`].join('');

  return `<div class="prov-card parchment">
    <button class="x-close" data-act="closeCard" title="Fechar">×</button>
    <div class="pd-head">${shield(P.house, 'shield lg')}<div><h2>${P.name}</h2><small>${H.name}${H.lord ? '' : ' · Província Real'} · ${loyal}</small></div></div>
    <p class="desc">${esc(P.desc)}</p>
    <div class="pd-row"><span>População <b>${P.population.toLocaleString('pt-BR')}</b></span><span>Tropas <b>${levy}</b></span><span>Impostos <b>+${eco.taxes[sel]}</b>/dia</span></div>
    <h3>Produção</h3>
    ${(Object.entries(prod) as [Good, number][]).map(([g, n]) => `<div class="prod">${iconImg(GOODS[g].icon)}<span>${GOODS[g].name}</span><div class="bar gold"><i style="width:${(n / 6) * 100}%"></i></div><b>+${n}</b></div>`).join('')}
    <h3>Necessidades</h3>
    <div class="needs">${(Object.entries(P.needs) as [Good, number][]).map(([g, n]) => {
      const miss = shortages.find((x) => x.good === g);
      return `<span class="need ${miss ? 'miss' : 'ok'}">${iconImg(GOODS[g].icon)} ${GOODS[g].name} ${n}${miss ? ` · faltam ${miss.missing}` : ' ✓'}</span>`;
    }).join('') || '<small>Autossuficiente.</small>'}</div>
    <h3>Impostos ${key === 'coroa' ? '(afeta o Povo)' : '(afeta a lealdade)'} · ${DECREE_HOURS}h</h3>
    <div class="seg">${(['baixo', 'normal', 'alto'] as TaxLevel[]).map((t) => `<button class="${s.taxes[key] === t ? 'on' : ''}" data-act="tax" data-arg="${t}">${t}</button>`).join('')}</div>
    <h3>Rotas comerciais</h3>
    ${outRoutes.map((r) => `<div class="route">${iconImg(GOODS[r.route.good].icon)} ${GOODS[r.route.good].name} → ${r.route.to === 'veridian' ? 'Véridian' : PROVINCES[r.route.to].name} <small>${r.amount} un · +${r.tariff} ouro</small><button class="x" data-act="delRoute" data-arg="${r.route.id}" title="Cancelar rota (1h)">×</button></div>`).join('')}
    ${inRoutes.map((r) => `<div class="route in">${iconImg(GOODS[r.route.good].icon)} ${GOODS[r.route.good].name} ← ${PROVINCES[r.route.from].name} <small>${r.amount} un</small></div>`).join('')}
    ${!outRoutes.length && !inRoutes.length ? '<small>Nenhuma rota passa por aqui.</small>' : ''}
    ${goodsSel ? `<div class="new-route"><select id="rg">${goodsSel}</select><span>→</span><select id="rd">${dests}</select><button class="btn sm" data-act="addRoute">Decretar (${DECREE_HOURS}h)</button></div>` : ''}
    <button class="act-btn a-verde" data-act="invest" ${(s.investments[sel] ?? 0) >= 3 ? 'disabled' : ''}>${iconImg('martelo', 'ico-lg')}<span><b>Investir</b><small>−${INVEST_COST} ouro · +25% produção (${s.investments[sel] ?? 0}/3)</small></span></button>
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
    case 'delRoute':
      if (!decree(app)) return;
      s.routes = s.routes.filter((r) => r.id !== Number(arg));
      break;
    case 'addRoute': {
      const g = app.stage.querySelector<HTMLSelectElement>('#rg')!.value as Good;
      const to = app.stage.querySelector<HTMLSelectElement>('#rd')!.value as ProvinceId | 'veridian';
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
    case 'invest': {
      if (s.res.ouro < INVEST_COST) return app.toast('Ouro insuficiente.');
      if (!decree(app)) return;
      s.res.ouro -= INVEST_COST;
      s.investments[sel] = (s.investments[sel] ?? 0) + 1;
      const k = taxKey(sel);
      if (k !== 'coroa') s.loyalty[k] = clamp(s.loyalty[k] + 4, -100, 100);
      else s.res.povo = clamp(s.res.povo + 3, 0, 100);
      app.toast(`Investimento em ${PROVINCES[sel].name}.`);
      break;
    }
    default:
      return;
  }
  save(s);
  app.render();
}
