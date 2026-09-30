import type { App } from '../app';
import { CHARACTERS } from '../../data/characters';
import { HOUSES, HOUSE_IDS, PROVINCES } from '../../data/realm';
import { governabilidade, govLabel, influenceGain, relLabel, save } from '../../engine/core';
import { levyUnits } from '../../engine/war';
import { RIVAL, demandOf, house, houseTroops } from '../../engine/houses';
import type { HouseId } from '../../types';
import { answerLetter, defOf, letters } from '../../engine/letters';
import { canSummon, summon, summonChance } from '../../engine/summon';
import { iconImg } from '../../render/pixel';
import { bar, esc, portrait, reqCheck, shield, txt } from '../common';

const GROUPS: [string, string[]][] = [
  ['Família e Conselho', ['isabelle', 'lucas', 'aldric', 'corvin', 'aurelian', 'theodric']],
  ['Pretendentes', ['elenora', 'rhoswen', 'isolde', 'sigrid']],
  ['Lordes', ['gaspard', 'brandt', 'aveline', 'otho']],
  ['Vassalos e corte', ['sir_ferrao', 'sir_osric', 'sir_bram', 'sir_picoalto', 'dama_brisamar', 'dama_carvalhal', 'lysandra', 'morgana', 'florian', 'pimenta', 'dama', 'clara', 'bianca']],
  ['Povo e Estrangeiros', ['marta', 'tobias', 'campones', 'camponesa', 'viuva', 'tomas', 'bruna', 'irma', 'haakon', 'kasim', 'cedric']],
];
const SUITORS = ['elenora', 'rhoswen', 'isolde', 'sigrid'];
const MET: Record<string, string> = { cedric: 'cedricConhecido', clara: 'admiradoraClara', bianca: 'bianca' };

let selectedLetter: number | null = null;

function known(app: App, id: string) {
  const s = app.s;
  if (SUITORS.includes(id)) return !!s.flags[`met_${id}`];
  if (MET[id]) return !!s.flags[MET[id]];
  return true;
}

function summonButton(app: App, id: string) {
  const s = app.s;
  if (!canSummon(s, id) && !s.summoned?.[id]) return '';
  if (!canSummon(s, id)) return `<small class="summoned">convocado há pouco</small>`;
  const p = Math.round(summonChance(s, id) * 100);
  return `<button class="btn sm summon" data-act="summon" data-arg="${id}" title="Chance de atender: ${p}%">Convocar <small>${p}% de vir</small></button>`;
}

// O que a casa quer, o quanto está ressentida e com quantos homens próprios conta
function houseLine(app: App, h: HouseId) {
  const s = app.s;
  const st = house(s, h);
  const d = demandOf(s, h);
  const g = Math.round(st.grievance);
  const mood = g >= 70 ? 'furiosa · sonega impostos' : g >= 35 ? 'ressentida' : 'tranquila';
  const troops = houseTroops(s, h) * 100, base = HOUSES[h].levy;
  return `<div class="hc-dyn">
    <small class="hc-demand ${d ? 'on' : ''}">${d ? `Exige: <b>${esc(d.def.title)}</b> · faltam ${Math.max(0, d.until - s.day)} dia(s)${d.promised ? ' · <em>o rei prometeu</em>' : ''}` : 'Nenhuma exigência no momento'}</small>
    <small>Humor: <b class="${g >= 70 ? 'bad' : ''}">${mood}</b> (${g}) · Homens próprios: <b>${troops}</b>${troops > base ? ' <em class="bad">armando-se</em>' : ''} · Rival: ${HOUSES[RIVAL[h]].name}</small>
  </div>`;
}

function peopleTab(app: App) {
  const s = app.s;
  const gov = governabilidade(s);
  const houses = HOUSE_IDS.map((h) => {
    const H = HOUSES[h];
    const prov = Object.values(PROVINCES).find((p) => p.house === h)!;
    const v = s.loyalty[h];
    return `<div class="house-card ${v < -20 ? 'angry' : ''}" style="--hc:${H.color}">
      ${shield(h, 'shield lg')}
      <div class="hc-body">
        <b>${H.name}</b><small>${esc(prov.name)} · "${esc(H.motto)}"</small>
        ${bar(v)}
        <small>Lealdade <b>${v}</b> · ${relLabel(v)} · Envia ao rei: ${levyUnits(s, h) * 100} · Impostos: ${s.taxes[h]}</small>
        ${houseLine(app, h)}
      </div>
      <div class="hc-lord">${portrait(H.lord!, 'aud-portrait')}${summonButton(app, H.lord!)}</div>
    </div>`;
  }).join('');

  const people = GROUPS.map(([title, ids]) => `<h3>${title}</h3><div class="people">${ids.filter((id) => CHARACTERS[id]).map((id) => {
    const c = CHARACTERS[id];
    const v = s.rel[id] ?? 0;
    const met = known(app, id);
    return `<div class="person ${met ? '' : 'unknown'} ${s.spouse === id ? 'spouse' : ''}">
      ${portrait(id, 'aud-portrait')}
      <div><b>${met ? esc(c.name) : '???'}</b><small>${esc(c.title)}</small>${bar(v)}<small>${relLabel(v)} (${v})${s.spouse === id ? ' · Rainha' : ''}</small>
      ${met ? summonButton(app, id) : ''}</div>
    </div>`;
  }).join('')}</div>`).join('');

  return `<div class="gov-box">
      <div>${iconImg('escudo', 'ico-xl')}</div>
      <div>
        <h2>Governabilidade: ${gov} · ${govLabel(gov)}</h2>
        <p class="sub">Nasce do <b>apoio do povo comum</b> (${s.res.povo}), do <b>prestígio</b> (${s.res.prestigio}) e da <b>lealdade das casas</b>. Gera <b>+${influenceGain(s)} de Influência</b> por dia. Convoque quem está insatisfeito: quem vier discute o problema; quem recusar aumenta a tensão.</p>
        ${bar(gov, 0, 100, 'wide')}
      </div>
    </div>
    <h3>Grandes Casas</h3>
    <div class="houses">${houses}</div>
    ${people}`;
}

function mailTab(app: App) {
  const s = app.s;
  const box = letters(s);
  if (!box.length) return '<p class="sub">Nenhuma carta por enquanto. O correio chega toda manhã.</p>';
  const sel = box.find((l) => l.uid === selectedLetter) ?? box[0];
  selectedLetter = sel.uid;
  if (!sel.read) {
    sel.read = true;
    save(s);
  }
  const d = defOf(sel);
  const from = CHARACTERS[d.from];
  const list = box.map((l) => {
    const ld = defOf(l);
    const pending = ld.choices?.length && l.answer === undefined;
    return `<button class="letter ${l.uid === sel.uid ? 'on' : ''} ${l.read ? '' : 'unread'} ${pending ? 'pending' : ''}" data-act="letter" data-arg="${l.uid}">
      ${portrait(ld.from, 'letter-portrait')}<span><b>${esc(ld.subject)}</b><small>${esc(CHARACTERS[ld.from]?.name ?? '')} · dia ${l.day}${pending ? ' · aguarda resposta' : ''}</small></span></button>`;
  }).join('');
  const choices = d.choices?.length
    ? sel.answer === undefined
      ? `<div class="letter-choices">${d.choices.map((ch, i) => {
          const r = reqCheck(s, ch.req);
          return `<button class="choice c-${ch.color} ${r.ok ? '' : 'locked'}" data-act="answer" data-arg="${i}" ${r.ok ? '' : 'disabled'}>${iconImg(r.ok ? ch.icon : 'cadeado', 'ico-lg')}<span class="choice-text"><b>${esc(ch.label)}</b><small>${r.ok ? esc(ch.sub) : 'Requer: ' + esc(r.why)}</small></span></button>`;
        }).join('')}</div>`
      : `<p class="letter-reply">${iconImg('selo')} ${esc(sel.reply ?? '')}</p>`
    : '';
  return `<div class="mail">
    <div class="mail-list">${list}</div>
    <div class="letter-view parchment">
      <div class="letter-head">${portrait(d.from, 'mid-portrait')}<div><h2>${esc(d.subject)}</h2><small>De ${esc(from?.name ?? '')}, ${esc(from?.title ?? '')} · dia ${sel.day}</small></div></div>
      <p class="letter-text">${esc(txt(d.text, s))}</p>
      ${choices}
    </div>
  </div>`;
}

export function render(app: App): string {
  app.scene.setMode('dim');
  const tab = app.ui.courtTab ?? 'pessoas';
  const unread = letters(app.s).filter((l) => !l.read).length;
  return `<div class="panel dark court-panel">
    <div class="tabs">
      <button class="${tab === 'pessoas' ? 'on' : ''}" data-act="courtTab" data-arg="pessoas">${iconImg('povo')} Casas e pessoas</button>
      <button class="${tab === 'correio' ? 'on' : ''}" data-act="courtTab" data-arg="correio">${iconImg('pergaminho')} Correio${unread ? ` <em>${unread}</em>` : ''}</button>
    </div>
    ${tab === 'correio' ? mailTab(app) : peopleTab(app)}
  </div>`;
}

export function handle(app: App, act: string, arg: string) {
  const s = app.s;
  switch (act) {
    case 'courtTab':
      app.ui.courtTab = arg as 'pessoas' | 'correio';
      return app.render();
    case 'letter':
      selectedLetter = Number(arg);
      return app.render();
    case 'answer': {
      if (selectedLetter == null) return;
      answerLetter(s, selectedLetter, Number(arg));
      save(s);
      return app.render();
    }
    case 'summon': {
      if (!canSummon(s, arg)) return;
      const r = summon(s, arg, Math.random());
      save(s);
      app.toast(r === 'vem' ? `${CHARACTERS[arg].name} aceitou o chamado e chegará ao salão em breve.` : `${CHARACTERS[arg].name} recusou o chamado. Chegou uma carta com a desculpa.`);
      return app.render();
    }
  }
}
