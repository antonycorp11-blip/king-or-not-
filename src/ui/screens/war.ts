import type { ProvinceId } from '../../types';
import type { App } from '../app';
import { HOUSES, HOUSE_IDS, PROVINCES } from '../../data/realm';
import { clamp, hasSkill, knows, save } from '../../engine/core';
import { canSpend, spendHours } from '../../engine/day';
import { computeEconomy } from '../../engine/economy';
import { enemyLabel, warTurnHours, ADJ, PEACE_COST, attackOnce, blitz, canNegotiatePeace, canTakeTurn, endPlayerTurn, fortify, levyUnits, negotiatePeace, playerReinforcement, reinforce, terr, totals, type BattleRound } from '../../engine/war';
import { iconImg } from '../../render/pixel';
import { esc, shield } from '../common';
import { MARCH_HOURS, MARCH_TARGETS, armyAt, marchArmy, marchPreview, northThreat, tension, tensionLabel } from '../../engine/army';

const RECRUIT_COST = 100;
const TRAIN_COST = 80;

function turnOpen(app: App) {
  return app.s.flags.warTurnDay === app.s.day && !!app.s.war && !app.s.war.result;
}

function diceHtml(r: BattleRound) {
  const die = (n: number, cls: string) => `<span class="die ${cls}">${n}</span>`;
  return `<div class="dice"><div>${r.att.map((n) => die(n, 'att')).join('')}</div><span>vs</span><div>${r.def.map((n) => die(n, 'def')).join('')}</div></div>
    <small>Atacante perdeu ${r.attLoss} · Defensor perdeu ${r.defLoss}</small>`;
}

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
    const enemyName = enemyLabel(w.enemy);
    const open = turnOpen(app);
    const sel = ((app.ui.warSel ?? '').split('>')[0] || null) as ProvinceId | null;
    const tot = totals(w);
    let body = '';
    if (w.result) {
      const msg = { vitoria: 'Vitória! O reino celebra seu jovem rei.', derrota: 'Derrota. A capital caiu.', paz: 'Um tratado de paz encerrou a guerra.' }[w.result];
      body = `<h3>${msg}</h3><p class="sub">A guerra terminou no turno ${w.turn}.</p>`;
    } else if (!open) {
      body = canTakeTurn(s)
        ? `<p>Reúna os generais para planejar o turno de hoje. Você receberá <b>${playerReinforcement(s)}</b> tropas de reforço.</p>
           <button class="act-btn a-vermelho" data-act="council">${iconImg('espadas', 'ico-lg')}<span><b>Conselho de Guerra</b><small>Comandar este turno · ${warTurnHours(s)}h</small></span></button>
           <p class="sub warn">Se você não comandar hoje, o inimigo age mesmo assim e a moral cai.</p>`
        : '<p>Você já comandou a guerra hoje. O inimigo se move durante a noite.</p>';
    } else {
      const mode = app.ui.warMode;
      const selT = sel ? terr(w, sel) : undefined;
      body = `<div class="seg">${(['reforcar', 'atacar', 'mover'] as const).map((m) => `<button class="${mode === m ? 'on' : ''}" data-act="mode" data-arg="${m}">${{ reforcar: `Reforçar (${w.reinforcements})`, atacar: 'Atacar', mover: w.moveUsed ? 'Mover ✓' : 'Mover' }[m]}</button>`).join('')}</div>
        <p class="sub">${{ reforcar: 'Clique nos seus escudos no mapa para posicionar os reforços.', atacar: 'Escolha um exército seu (2+ tropas) e depois um inimigo vizinho, que pisca em vermelho.', mover: 'Escolha um exército seu e depois um vizinho seu. Uma vez por turno.' }[mode]}</p>
        ${selT ? `<p>Selecionado: <b>${PROVINCES[selT.id].name}</b> (${selT.units})</p>` : ''}
        ${app.ui.warResult ?? ''}
        <button class="btn primary" data-act="endTurn">Encerrar turno</button>`;
      if (canNegotiatePeace(s)) body += `<button class="btn" data-act="peace" ${s.res.influencia < PEACE_COST ? 'disabled' : ''}>Negociar paz (−${PEACE_COST} Influência)</button>`;
    }
    side = `<h2>Guerra contra ${enemyName}</h2>
      <div class="pd-row"><span>Turno <b>${w.turn}</b></span><span>Suas tropas <b>${tot.rei}</b></span><span>Inimigo <b>${tot.inimigo}</b></span></div>
      <p class="sub">${hasSkill(s, 'tatico') ? 'Olhar Tático: +1 no seu maior dado de ataque. ' : ''}${knows(s, 'tatica') ? 'A Arte da Muralha: +1 no maior dado de defesa. ' : ''}${knows(s, 'norhelm') && w.enemy === 'norhelm' ? 'Crônicas de Norhelm: empates são seus ao atacar.' : ''}</p>
      ${body}
      <div class="war-log">${w.log.slice(0, 6).map((l) => `<p>${esc(l)}</p>`).join('')}</div>`;
  }

  return `<div class="map-stage with-card war-stage">
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
  const targets = w && selected && app.ui.warMode === 'atacar' && turnOpen(app) ? ADJ[selected].filter((id) => terr(w, id)?.owner === 'inimigo') : [];
  map.onPick = (id) => {
    if (w && turnOpen(app)) {
      onTerritory(app, id);
      save(s);
      app.render();
    }
  };
  if (!w) map.onPick = (id) => pickMarch(app, id);
  map.update(s, w ? { lens: 'guerra', selected, target: to ?? null, targets, clash: app.ui.warClash as ProvinceId | null } : { lens: 'exercito', selected: null, target: (app.ui.warSel || null) as ProvinceId | null });
}

function pickMarch(app: App, id: ProvinceId) {
  if (!MARCH_TARGETS.includes(id)) return app.toast(`${PROVINCES[id].name} pertence a Norhelm.`);
  app.ui.warSel = id === armyAt(app.s) ? null : id;
  app.render();
}

function clash(app: App, id: ProvinceId) {
  app.ui.warClash = id;
  window.setTimeout(() => {
    if (app.ui.warClash === id) {
      app.ui.warClash = null;
      if (app.ui.screen === 'guerra') app.render();
    }
  }, 1300);
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
        const c = terr(w, 'castelmar');
        if (c?.owner === 'rei') c.units += 1;
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
      if (!w || !canTakeTurn(s)) return;
      if (!canSpend(s, warTurnHours(s))) return app.toast('Não há horas suficientes hoje.');
      spendHours(s, warTurnHours(s));
      s.flags.warTurnDay = s.day;
      app.ui.warMode = 'reforcar';
      app.ui.warSel = null;
      app.ui.warResult = null;
      break;
    case 'mode':
      app.ui.warMode = arg as typeof app.ui.warMode;
      app.ui.warSel = null;
      app.ui.warResult = null;
      break;
    case 'terr':
      if (!w || !turnOpen(app)) return;
      onTerritory(app, arg as ProvinceId);
      break;
    case 'roll':
    case 'blitz': {
      if (!w || !app.ui.warSel) return;
      const [from, to] = app.ui.warSel.split('>') as ProvinceId[];
      if (!to) return;
      clash(app, to);
      if (act === 'roll') {
        const r = attackOnce(s, from, to);
        app.ui.warResult = diceHtml(r) + attackButtons(app, from, to);
      } else {
        const rounds = blitz(s, from, to);
        app.ui.warResult = `<small>${rounds.length} rodadas de batalha.</small>`;
        app.ui.warSel = null;
      }
      if (terr(w, to)!.owner === 'rei') {
        app.ui.warSel = null;
        app.ui.warResult = `<p class="good">${PROVINCES[to].name} conquistada!</p>`;
      }
      break;
    }
    case 'endTurn': {
      if (!w) return;
      const out = endPlayerTurn(s);
      s.flags.warTurnDay = 0;
      app.ui.warSel = null;
      app.ui.warResult = null;
      app.toast(out.join(' ') || 'O inimigo aguardou.');
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

function attackButtons(app: App, from: ProvinceId, to: ProvinceId) {
  const a = terr(app.s.war!, from)!;
  const d = terr(app.s.war!, to)!;
  if (a.units < 2 || d.owner === 'rei') return '';
  return `<div class="row"><button class="btn" data-act="roll">Rolar dados</button><button class="btn primary" data-act="blitz">Atacar até o fim</button></div>`;
}

function onTerritory(app: App, id: ProvinceId) {
  const s = app.s;
  const w = s.war!;
  const t = terr(w, id)!;
  const mode = app.ui.warMode;
  const cur = app.ui.warSel?.split('>')[0] as ProvinceId | undefined;
  if (mode === 'reforcar') {
    if (t.owner !== 'rei') return;
    if (w.reinforcements <= 0) return app.toast('Sem reforços restantes neste turno.');
    reinforce(s, id);
    return;
  }
  if (mode === 'atacar') {
    if (t.owner === 'rei') {
      if (t.units < 2) return app.toast('Precisa de pelo menos 2 tropas para atacar.');
      app.ui.warSel = id;
      app.ui.warResult = null;
      return;
    }
    if (!cur || !ADJ[cur].includes(id)) return app.toast('Escolha primeiro um território seu vizinho a este.');
    app.ui.warSel = `${cur}>${id}`;
    app.ui.warResult = `<p>Atacar <b>${PROVINCES[id].name}</b> (${t.units}) a partir de <b>${PROVINCES[cur].name}</b> (${terr(w, cur)!.units})?</p>${attackButtons(app, cur, id)}`;
    return;
  }
  // mover
  if (t.owner !== 'rei') return;
  if (!cur) {
    app.ui.warSel = id;
    return;
  }
  if (w.moveUsed) return app.toast('Você já moveu tropas neste turno.');
  if (!ADJ[cur].includes(id)) return app.toast('Só é possível mover para um vizinho.');
  const n = Math.floor((terr(w, cur)!.units - 1) / 2) || terr(w, cur)!.units - 1;
  fortify(s, cur, id, n);
  app.ui.warSel = null;
  app.toast(`${n} tropas movidas para ${PROVINCES[id].name}.`);
}
