import type { ProvinceId } from '../../types';
import type { App } from '../app';
import { HOUSES, HOUSE_IDS, PROVINCES } from '../../data/realm';
import { clamp, save } from '../../engine/core';
import { canSpend, spendHours } from '../../engine/day';
import { computeEconomy } from '../../engine/economy';
import { enemyLabel, warTurnHours, ADJ, PEACE_COST, canNegotiatePeace, levyUnits, negotiatePeace, terr, totals } from '../../engine/war';
import { iconImg } from '../../render/pixel';
import { esc, shield } from '../common';
import { MARCH_HOURS, MARCH_TARGETS, armyAt, marchArmy, marchPreview, northThreat, tension, tensionLabel } from '../../engine/army';
import { ORDERS, TACTICS, TERRAIN, TROOPS, TROOP_IDS, commander, initArmies, royalArmy, setOrder, setTactic } from '../../engine/campaign';
import { holder } from '../../engine/council';
import { char } from '../../data/characters';
import { portrait } from '../common';
import type { OrderType, Tactic } from '../../types';

const MERC_COST = 150;

const RECRUIT_COST = 100;
const TRAIN_COST = 80;

export function render(app: App): string {
  const s = app.s;
  app.scene.setMode('dim');
  const w = s.war;
  const eco = computeEconomy(s);
  const ui = app.ui;

  const army = ui.armyOpen
    ? `<div class="army-card dark">
    <button class="x-close" data-act="armyToggle" title="Fechar">×</button>
    <h2>${iconImg('espadas', 'ico-lg')} Exército Real</h2>
    <div class="army-stats">
      <div><b>${s.res.exercito}</b><small>soldados</small></div>
      <div><b>${s.res.moral}</b><small>moral</small></div>
      <div><b>${eco.upkeep}</b><small>soldo/dia</small></div>
    </div>
    <p class="sub">Se o tesouro ficar negativo, o soldo atrasa e a moral despenca. Moral 0 = golpe.</p>
    <button class="act-btn a-dourado" data-act="recruit">${iconImg('moedas', 'ico-lg')}<span><b>Recrutar 100 homens</b><small>−${RECRUIT_COST} ouro · 1h</small></span></button>
    <button class="act-btn a-azul" data-act="train">${iconImg('escudo', 'ico-lg')}<span><b>Treinar as tropas</b><small>−${TRAIN_COST} ouro · +10 moral · 1h</small></span></button>
    <h3>Tropas das casas</h3>
    ${HOUSE_IDS.map((h) => `<div class="levy">${shield(h, 'shield sm')}<span class="name">${HOUSES[h].name}</span><b>${levyUnits(s, h) * 100}</b></div>`).join('')}
    ${s.spouse === 'isolde' ? `<div class="levy">${shield('veridian', 'shield sm')}<span class="name">Aliança de Véridian</span><b>800</b></div>` : ''}
    <small class="sub">Casas com lealdade abaixo de −20 recusam-se a enviar tropas.</small>
  </div>`
    : `<button class="army-tab" data-act="armyToggle">${iconImg('espadas', 'ico-lg')}<span><b>${s.res.exercito}</b> soldados · moral ${s.res.moral}</span></button>`;

  let side: string;
  if (!w) {
    const at = armyAt(s);
    const target = (ui.warSel || null) as ProvinceId | null;
    const threat = northThreat(s);
    side = `<h2>Exército Real</h2>
      <div class="pd-row"><span>Soldados <b>${s.res.exercito}</b></span><span>Moral <b>${s.res.moral}</b></span><span>Soldo <b>${eco.upkeep}</b>/dia</span></div>
      <p class="camp">${iconImg('coroa')} Acampado em <b>${PROVINCES[at].name}</b></p>
      <div class="row2">
        <button class="act-btn a-dourado" data-act="recruit">${iconImg('moedas', 'ico-lg')}<span><b>Recrutar 100</b><small>−${RECRUIT_COST} ouro · 1h</small></span></button>
        <button class="act-btn a-azul" data-act="train">${iconImg('escudo', 'ico-lg')}<span><b>Treinar</b><small>−${TRAIN_COST} ouro · +10 moral · 1h</small></span></button>
      </div>
      <h3>Mover o exército</h3>
      <p class="sub">Toque numa província no mapa. Onde há <b>tensão alta</b> as tropas acalmam ou intimidam, mas os lordes reagem e a capital fica mais exposta.${threat ? ' <b>Norhelm ameaça a fronteira</b>: Vale Rubro e Montanhas de Ferro estão em alerta.' : ''}</p>
      <div class="march-list">${MARCH_TARGETS.map((p) => {
        const tv = tension(s, p);
        return `<button class="march ${p === at ? 'here' : ''} ${p === target ? 'on' : ''}" data-act="marchTo" data-arg="${p}" ${p === at ? 'disabled' : ''}><span>${PROVINCES[p].name}</span><em class="tension-${tensionLabel(tv)}">tensão ${tensionLabel(tv)}</em>${p === at ? '<small>aqui</small>' : ''}</button>`;
      }).join('')}</div>
      ${target && target !== at ? `<div class="march-plan"><p>${esc(marchPreview(s, target))}</p><button class="act-btn a-vermelho" data-act="march">${iconImg('espadas', 'ico-lg')}<span><b>Marchar para ${PROVINCES[target].name}</b><small>${MARCH_HOURS}h · os lordes vão reagir</small></span></button></div>` : ''}`;
  } else {
    initArmies(s);
    const enemyName = enemyLabel(w.enemy);
    const tot = totals(w);
    const planned = w.plannedDay === s.day;
    const marshal = holder(s, 'marechal');
    const selId = Number((app.ui.warSel ?? '').replace('army:', '')) || null;
    const armyCard = (a: NonNullable<typeof w.armies>[number]) => {
      const c = commander(a.commander);
      const sel = selId === a.id;
      const canOrder = a.owner === 'rei' && (planned || w.delegated) && !w.delegated;
      return `<div class="army ${a.owner} ${sel ? 'sel' : ''}">
        <header>${portrait(a.commander, 'army-portrait')}<div><b>${esc(a.name)}</b><small>${esc(char(a.commander).name)} · Estratégia ${c.estrategia}${c.esp !== 'nenhuma' ? ` · ${c.esp}` : ''}</small><small>Em ${PROVINCES[a.at].name} (${TERRAIN[a.at].name})</small></div>
        ${a.owner === 'rei' ? `<button class="btn sm" data-act="armySel" data-arg="${a.id}">${sel ? 'Selecionado' : 'Comandar'}</button>` : ''}</header>
        <div class="troops">${TROOP_IDS.filter((t) => a.troops[t]).map((t) => `<span title="${TROOPS[t].name}">${iconImg(TROOPS[t].icon)}<b>${a.troops[t] * 100}</b></span>`).join('')}</div>
        <div class="meters"><span>Moral <i class="bar"><em style="width:${a.morale}%"></em></i></span><span>Comida <b>${a.supply}</b> dia(s)</span></div>
        ${a.owner === 'rei' ? `<p class="order">Ordem: <b>${ORDERS[a.order].name}</b>${a.to && (a.order === 'atacar' || a.order === 'marchar') ? ` → ${PROVINCES[a.to].name}` : ''} · Tática: <b>${TACTICS[a.tactic].name}</b></p>` : `<p class="order">Parece preparar: <b>${ORDERS[a.order].name}</b>${a.to ? ` → ${PROVINCES[a.to].name}` : ''}</p>`}
        ${sel && canOrder ? `<div class="seg orders">${(Object.keys(ORDERS) as OrderType[]).map((o) => `<button class="${a.order === o ? 'on' : ''}" data-act="order" data-arg="${a.id}:${o}" title="${esc(ORDERS[o].help)}">${ORDERS[o].name}</button>`).join('')}</div>
          ${a.order === 'atacar' || a.order === 'marchar' ? `<p class="sub">Toque no mapa a província de destino.</p>` : ''}
          <div class="seg tactics">${(Object.keys(TACTICS) as Tactic[]).map((t) => `<button class="${a.tactic === t ? 'on' : ''}" data-act="tactic" data-arg="${a.id}:${t}" title="${esc(TACTICS[t].help)}">${TACTICS[t].name}</button>`).join('')}</div>
          <p class="sub">${esc(TACTICS[a.tactic].help)}</p>` : ''}
      </div>`;
    };
    let body = '';
    if (w.result) {
      const msg = { vitoria: 'Vitória! O reino celebra seu jovem rei.', derrota: 'Derrota. A capital caiu.', paz: 'Um tratado de paz encerrou a guerra.' }[w.result];
      body = `<h3>${msg}</h3><p class="sub">A guerra terminou no turno ${w.turn}.</p>`;
    } else {
      body = `${w.delegated ? `<p class="deleg">${portrait(marshal ?? 'aurelian', 'whisper-portrait')} <span><b>${esc(char(marshal ?? 'aurelian').name)}</b> conduz a guerra. Ele decide as ordens toda noite e fica com a glória.</span></p><button class="btn" data-act="delegateWar">Retomar o comando</button>`
        : planned ? `<p class="sub">O Conselho de Guerra está reunido. Escolha um exército, dê a ordem e a tática. As batalhas acontecem durante a noite.</p>`
        : `<button class="act-btn a-vermelho" data-act="council">${iconImg('espadas', 'ico-lg')}<span><b>Reunir o Conselho de Guerra</b><small>Dar ordens hoje · ${warTurnHours(s)}h</small></span></button>
           <p class="sub warn">Sem novas ordens, os exércitos repetem as de ontem e a moral cai um pouco.</p>
           ${marshal ? `<button class="btn" data-act="delegateWar">Delegar a guerra a ${esc(char(marshal).name)}</button>` : ''}`}
        <div class="armies">${w.armies!.filter((a) => a.owner === 'rei').map(armyCard).join('')}</div>
        <h3>O inimigo</h3>
        <div class="armies foe">${w.armies!.filter((a) => a.owner === 'inimigo').map(armyCard).join('') || '<p class="sub">Só guarnições atrás de muralhas.</p>'}</div>
        <div class="row2">
          <button class="act-btn a-dourado" data-act="recruit">${iconImg('moedas', 'ico-lg')}<span><b>Recrutar infantaria</b><small>−${RECRUIT_COST} ouro · +100 · 1h</small></span></button>
          <button class="act-btn a-dourado" data-act="mercs">${iconImg('moedas', 'ico-lg')}<span><b>Contratar mercenários</b><small>−${MERC_COST} ouro · +300 · fogem sem soldo</small></span></button>
        </div>
        ${canNegotiatePeace(s) ? `<button class="btn" data-act="peace" ${s.res.influencia < PEACE_COST ? 'disabled' : ''}>Negociar paz (−${PEACE_COST} Influência)</button>` : ''}`;
    }
    side = `<h2>Guerra contra ${enemyName}</h2>
      <div class="pd-row"><span>Noite <b>${w.turn}</b></span><span>Suas forças <b>${tot.rei * 100}</b></span><span>Inimigo <b>${tot.inimigo * 100}</b></span><span>Clima <b>${w.weather ?? 'limpo'}</b></span></div>
      ${body}
      <h3>Relatório do front</h3>
      <div class="war-log">${w.log.slice(0, 8).map((l) => `<p>${esc(l)}</p>`).join('') || '<p>Nenhuma notícia ainda.</p>'}</div>`;
  }

  return `<div class="map-stage with-card war-stage">
    <div class="map-caption"><b>Mapa militar</b><small>${w ? 'Estandartes mostram forças e vizinhos atacáveis.' : 'Selecione uma província para mover o exército real.'}</small></div>
    <div class="map-slot" id="map-slot"></div>
    ${army}
  </div>
  <div class="prov-card parchment war-card">${side}</div>`;
}

export function after(app: App) {
  const s = app.s;
  const map = app.map;
  map.mount(app.stage.querySelector<HTMLElement>('#map-slot'));
  const w = s.war;
  const [from, to] = (app.ui.warSel ?? '').split('>') as [ProvinceId | '', ProvinceId | undefined];
  const selected = (from || null) as ProvinceId | null;
  const selArmy = w?.armies?.find((a) => `army:${a.id}` === app.ui.warSel);
  const targets = selArmy ? ADJ[selArmy.at] : [];
  map.onPick = (id) => {
    if (!w || w.result) return;
    const a = w.armies?.find((x) => `army:${x.id}` === app.ui.warSel);
    if (!a || !(w.plannedDay === s.day) || w.delegated) return app.toast(w.delegated ? 'O Marechal está no comando.' : 'Reúna o Conselho de Guerra para dar ordens.');
    setOrder(s, a.id, a.order === 'marchar' ? 'marchar' : 'atacar', id);
    app.toast(`${a.name}: ${a.order === 'marchar' ? 'marchar' : 'atacar'} rumo a ${PROVINCES[id].name}.`);
    save(s);
    app.render();
  };
  if (!w) map.onPick = (id) => pickMarch(app, id);
  map.update(s, w ? { lens: 'guerra', selected: selArmy?.at ?? selected, target: selArmy?.to ?? to ?? null, targets, clash: app.ui.warClash as ProvinceId | null } : { lens: 'exercito', selected: null, target: (app.ui.warSel || null) as ProvinceId | null });
}

function pickMarch(app: App, id: ProvinceId) {
  if (!MARCH_TARGETS.includes(id)) return app.toast(`${PROVINCES[id].name} pertence a Norhelm.`);
  app.ui.warSel = id === armyAt(app.s) ? null : id;
  app.render();
}

export function handle(app: App, act: string, arg: string) {
  const s = app.s;
  const w = s.war;
  switch (act) {
    case 'recruit':
      if (s.res.ouro < RECRUIT_COST) return app.toast('Ouro insuficiente.');
      if (!canSpend(s, 1)) return app.toast('Não há horas suficientes hoje.');
      spendHours(s, 1);
      s.res.ouro -= RECRUIT_COST;
      s.res.exercito += 100;
      if (w && !w.result) {
        const a = royalArmy(s);
        if (a) a.troops.infantaria += 1;
        else { const c = terr(w, 'castelmar'); if (c?.owner === 'rei') c.units += 1; }
      }
      break;
    case 'train':
      if (s.res.ouro < TRAIN_COST) return app.toast('Ouro insuficiente.');
      if (!canSpend(s, 1)) return app.toast('Não há horas suficientes hoje.');
      spendHours(s, 1);
      s.res.ouro -= TRAIN_COST;
      s.res.moral = clamp(s.res.moral + 10, 0, 100);
      break;
    case 'council':
      if (!w || w.result || w.plannedDay === s.day) return;
      if (!canSpend(s, warTurnHours(s))) return app.toast('Não há horas suficientes hoje.');
      spendHours(s, warTurnHours(s));
      w.plannedDay = s.day;
      app.ui.warSel = `army:${royalArmy(s)?.id ?? ''}`;
      break;
    case 'armySel':
      app.ui.warSel = `army:${arg}`;
      break;
    case 'order': {
      const [id, o] = arg.split(':');
      setOrder(s, Number(id), o as OrderType);
      break;
    }
    case 'tactic': {
      const [id, t] = arg.split(':');
      setTactic(s, Number(id), t as Tactic);
      break;
    }
    case 'delegateWar':
      if (!w) return;
      w.delegated = !w.delegated;
      app.toast(w.delegated ? 'O Marechal assume a guerra. Ele fica com as vitórias, e com o poder que elas trazem.' : 'Você retoma o comando da guerra.');
      break;
    case 'mercs': {
      if (s.res.ouro < MERC_COST) return app.toast('Ouro insuficiente.');
      const a = royalArmy(s);
      if (!a) return app.toast('Não há exército real em campo para receber os mercenários.');
      s.res.ouro -= MERC_COST;
      a.troops.mercenarios += 3;
      app.toast('Trezentos mercenários chegam ao acampamento. Lutam bem enquanto houver ouro.');
      break;
    }
    case 'peace':
      negotiatePeace(s);
      break;
    case 'marchTo':
      if (w) return;
      return pickMarch(app, arg as ProvinceId);
    case 'march': {
      const to = app.ui.warSel as ProvinceId | null;
      if (w || !to) return;
      if (!canSpend(s, MARCH_HOURS)) return app.toast('Não há horas suficientes hoje para marchar.');
      spendHours(s, MARCH_HOURS);
      marchArmy(s, to);
      app.ui.warSel = null;
      app.toast(`O exército marcha para ${PROVINCES[to].name}. Os lordes vão reagir.`);
      break;
    }
    case 'armyToggle':
      app.ui.armyOpen = !app.ui.armyOpen;
      return app.render();
    default:
      return;
  }
  save(s);
  app.render();
}
