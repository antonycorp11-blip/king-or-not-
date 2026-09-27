import type { App } from '../app';
import { CHARACTERS } from '../../data/characters';
import { HOUSES, HOUSE_IDS, PROVINCES } from '../../data/realm';
import { governabilidade, govLabel, influenceGain, relLabel } from '../../engine/core';
import { levyUnits } from '../../engine/war';
import { iconImg } from '../../render/pixel';
import { bar, esc, portrait, shield } from '../common';

const GROUPS: [string, string[]][] = [
  ['Família e Conselho', ['isabelle', 'lucas', 'aldric', 'corvin', 'aurelian', 'theodric']],
  ['Pretendentes', ['elenora', 'rhoswen', 'isolde', 'sigrid']],
  ['Lordes', ['gaspard', 'brandt', 'aveline', 'otho']],
  ['Povo e Estrangeiros', ['marta', 'tobias', 'haakon']],
];

export function render(app: App): string {
  const s = app.s;
  app.scene.setMode('dim');
  const gov = governabilidade(s);
  const houses = HOUSE_IDS.map((h) => {
    const H = HOUSES[h];
    const prov = Object.values(PROVINCES).find((p) => p.house === h)!;
    const v = s.loyalty[h];
    return `<div class="house-card" style="--hc:${H.color}">
      ${shield(h, 'shield lg')}
      <div class="hc-body">
        <b>${H.name}</b><small>${esc(prov.name)} · "${esc(H.motto)}"</small>
        ${bar(v)}
        <small>Lealdade <b>${v}</b> · ${relLabel(v)} · Tropas cedidas: ${levyUnits(s, h) * 100} · Impostos: ${s.taxes[h]}</small>
        <small>Vassalos: ${H.vassals.join(', ')}</small>
      </div>
      ${portrait(H.lord!, 'aud-portrait')}
    </div>`;
  }).join('');

  const people = GROUPS.map(([title, ids]) => `<h3>${title}</h3><div class="people">${ids.map((id) => {
    const c = CHARACTERS[id];
    const v = s.rel[id] ?? 0;
    const met = !['elenora', 'rhoswen', 'isolde', 'sigrid'].includes(id) || s.flags[`met_${id}`];
    return `<div class="person ${met ? '' : 'unknown'} ${s.spouse === id ? 'spouse' : ''}">
      ${portrait(id, 'aud-portrait')}
      <div><b>${met ? esc(c.name) : '???'}</b><small>${esc(c.title)}</small>${bar(v)}<small>${relLabel(v)} (${v})${s.spouse === id ? ' · Rainha' : ''}</small></div>
    </div>`;
  }).join('')}</div>`).join('');

  return `<div class="panel dark court-panel">
    <div class="gov-box">
      <div>${iconImg('escudo', 'ico-xl')}</div>
      <div>
        <h2>Governabilidade: ${gov} · ${govLabel(gov)}</h2>
        <p class="sub">Nasce do <b>apoio do povo comum</b> (${s.res.povo}), do <b>prestígio</b> da coroa (${s.res.prestigio}) e da <b>lealdade média das casas</b>. Gera <b>+${influenceGain(s)} de Influência</b> por dia. Abaixo de 25, o povo vai às ruas.</p>
        ${bar(gov, 0, 100, 'wide')}
      </div>
    </div>
    <h3>Grandes Casas</h3>
    <div class="houses">${houses}</div>
    ${people}
  </div>`;
}
