import type { CouncilSeatId, FloorId, RoomId } from '../types';
import type { App } from './app';
import { ROOMS, ROOM_IDS, FLOOR_NAMES } from '../data/castle';
import { ADVISORS, SEATS, SEAT_CANDIDATES, SEAT_IDS } from '../data/council';
import { CLUES, PREP_NAMES } from '../data/clues';
import { ROUTINES } from '../data/routines';
import { char, CHARACTERS } from '../data/characters';
import { HOUSES } from '../data/realm';
import { looseEnds } from '../engine/agenda';
import { travelCost } from '../engine/castle';
import { appoint, competence, dismiss, holder, powerLabel } from '../engine/council';
import { bondReading } from '../engine/bonds';
import { insight, insightLabel, keyHolder } from '../engine/conspiracy';
import { isAbsent, whereIs, whereLine } from '../engine/npcs';
import { moodLabel, MOOD_LOOK } from '../engine/mood';
import { save } from '../engine/core';
import { iconImg } from '../render/pixel';
import { esc, portrait } from './common';
import { BOOKS } from '../data/progression';
import { qualityLabel, readQuality } from './screens/library';

export type CastleModal = 'agenda' | 'mapa' | 'cadeiras' | 'caderno' | null;

const fmt = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
const STATE: Record<string, string> = { pendente: '', feito: 'Feito', atrasado: 'Atrasado', faltou: 'Faltou', cancelado: 'Cancelado' };
const APPOINT_COST = 3;

export function renderCastleModal(app: App): string {
  switch (app.ui.castleModal) {
    case 'agenda': return agenda(app);
    case 'mapa': return castleMap(app);
    case 'cadeiras': return seats(app);
    case 'caderno': return notebook(app);
    default: return '';
  }
}

function frame(cls: string, title: string, body: string) {
  return `<div class="modal-back castle-modal-back"><div class="parchment modal castle-modal ${cls}">
    <button class="modal-x" data-act="closeCastleModal" aria-label="Fechar">×</button>
    <h2>${title}</h2>${body}</div></div>`;
}

function agenda(app: App) {
  const s = app.s;
  const mood = moodLabel(s);
  const items = s.agenda.map((a) => {
    const here = a.room === s.castle.room;
    const cost = travelCost(s, a.room);
    const canGo = a.state === 'pendente' && !here && ROOMS[a.room].ready && cost !== null;
    return `<li class="ap ap-${a.state} imp-${a.importance}">
      <time>${fmt(a.hour)}</time>
      <div><b>${esc(a.title)}</b><small>${esc(ROOMS[a.room].name)}${a.who.length ? ` · ${a.who.slice(0, 3).map((w) => esc(char(w).name.split(' ')[0])).join(', ')}` : ''}${a.note && a.state === 'pendente' ? ` · <i>${esc(a.note)}</i>` : ''}</small></div>
      ${STATE[a.state] ? `<em>${STATE[a.state]}</em>` : canGo ? `<button class="btn sm" data-act="travel" data-arg="${a.room}">Ir (${Math.round((cost ?? 0) * 60)} min)</button>` : here && a.state === 'pendente' ? '<em class="here">Aqui</em>' : ''}
    </li>`;
  }).join('');
  const loose = looseEnds(s).map((l) => `<li>${esc(l.text)}${l.room && l.room !== s.castle.room ? ` <button class="btn sm" data-act="travel" data-arg="${l.room}">Ir</button>` : ''}</li>`).join('');
  return frame('agenda-modal', `Dia ${s.day} · Agenda do Rei`, `
    <p class="sub">${esc(MOOD_LOOK[mood])}</p>
    ${items ? `<ol class="agenda-list">${items}</ol>` : '<p class="sub">Nenhum compromisso marcado. O dia é seu, e o reino também.</p>'}
    ${loose ? `<h3>Sem hora marcada</h3><ul class="loose">${loose}</ul>` : ''}
    <p class="hint">Faltar tem consequência, mas a agenda não manda em você. Toque no chão para andar, nas portas para mudar de cômodo, nas pessoas para conversar.</p>
    <div class="row"><button class="btn primary" data-act="closeCastleModal">Começar o dia</button></div>`);
}

function castleMap(app: App) {
  const s = app.s;
  const floors: FloorId[] = ['superior', 'principal', 'inferior', 'exterior'];
  const col = (f: FloorId) => `<div class="floor"><h3>${FLOOR_NAMES[f]}</h3>${ROOM_IDS.filter((r) => ROOMS[r].floor === f).map((r) => {
    const R = ROOMS[r];
    const cost = travelCost(s, r);
    const here = s.castle.room === r;
    return `<button class="room-card ${here ? 'here' : ''} ${R.ready ? '' : 'closed'}" ${R.ready && !here ? `data-act="travel" data-arg="${r}"` : 'disabled'}>
      <b>${esc(R.name)}</b><small>${here ? 'Você está aqui' : R.ready ? `${Math.round((cost ?? 0) * 60)} min de caminhada` : 'Em breve'}</small></button>`;
  }).join('')}</div>`;
  // "Onde está...?"
  const ids = new Set<string>([...ROUTINES.map((r) => r.id), ...(Object.values(s.council.seats).filter(Boolean) as string[])]);
  const people = [...ids].filter((id) => CHARACTERS[id] && !isAbsent(s, id) && whereIs(s, id)).map((id) => {
    const w = whereIs(s, id)!;
    const go = ROOMS[w.room].ready && w.room !== s.castle.room;
    return `<li>${portrait(id, 'where-portrait')}<span><b>${esc(char(id).name)}</b><small>${esc(whereLine(s, id))}</small></span>${go ? `<button class="btn sm" data-act="travel" data-arg="${w.room}">Ir</button>` : w.room === s.castle.room ? '<em>aqui</em>' : ''}</li>`;
  }).join('');
  return frame('map-modal', 'O Castelo', `
    <div class="floors">${floors.map(col).join('')}</div>
    <h3>Onde está...?</h3><ul class="where-list">${people}</ul>`);
}

function seats(app: App) {
  const s = app.s;
  const pick = app.ui.seatPick;
  const knowsLaw = s.conspiracy.clues.includes('lei_chaves');
  if (pick) {
    const cands = SEAT_CANDIDATES[pick].filter((id) => CHARACTERS[id] && !isAbsent(s, id) && id !== s.council.seats[pick] && available(app, id));
    return frame('seats-modal', `${SEATS[pick].name}: quem recebe a ${SEATS[pick].key}?`, `
      <p class="sub">${esc(SEATS[pick].domain)}. Nomear custa ${APPOINT_COST} de influência. Quem sai guarda mágoa.</p>
      <ul class="cand-list">${cands.map((id) => {
        const p = ADVISORS[id];
        return `<li>${portrait(id, 'where-portrait')}<span><b>${esc(char(id).name)}</b><small>${stars(competence(id, pick))} · ${p?.house ? esc(HOUSES[p.house].name) : 'sem casa'} · ${esc(bondReading(s, id))}</small><i>${esc(p?.style ?? '')}</i></span>
          <button class="btn sm primary" data-act="appoint" data-arg="${pick}:${id}" ${s.res.influencia < APPOINT_COST ? 'disabled' : ''}>Nomear</button></li>`;
      }).join('') || '<li>Ninguém disponível para o cargo.</li>'}</ul>
      <div class="row"><button class="btn" data-act="seatBack">Voltar</button></div>`);
  }
  return frame('seats-modal', 'As cinco cadeiras', `
    <p class="sub">Cada guardião governa uma parte do reino quando o rei não governa, e guarda uma das Cinco Chaves.</p>
    <div class="seat-grid">${SEAT_IDS.map((k) => {
      const who = holder(s, k);
      const key = knowsLaw ? keyHolder(s, k) : null;
      const keyTxt = key === 'coroa' ? 'Chave segura' : key === 'duvida' ? 'Chave duvidosa' : key === 'pacto' ? (insight(s) >= 60 ? 'Chave suspeita' : 'Chave duvidosa') : '';
      return `<div class="seat-card">
        <header>${iconImg(SEATS[k].icon, 'ico-lg')}<b>${SEATS[k].name}</b><small>${esc(SEATS[k].key)}</small></header>
        ${who ? `${portrait(who, 'seat-portrait')}<b>${esc(char(who).name)}</b><small>${stars(competence(who, k))} · ${powerLabel(s.council.power[who] ?? 0)}</small><p>${esc(bondReading(s, who))}</p>${(s.council.delegated[who] ?? 0) ? `<p class="deleg">Decidiu ${s.council.delegated[who]}× sem você</p>` : ''}`
          : '<p class="vacant">Cadeira vazia</p>'}
        ${keyTxt ? `<em class="key key-${key}">${keyTxt}</em>` : ''}
        <div class="row"><button class="btn sm" data-act="seatPick" data-arg="${k}">${who ? 'Substituir' : 'Nomear'}</button>${who ? `<button class="btn sm" data-act="dismissSeat" data-arg="${k}">Demitir</button>` : ''}</div>
      </div>`;
    }).join('')}</div>`);
}

function available(app: App, id: string) {
  const s = app.s;
  if (['elenora', 'rhoswen', 'isolde', 'sigrid'].includes(id)) return s.spouse === id;
  if (id === 'cedric') return s.flags.cedricResolvido === 'irmao';
  if (id === 'sombra') return !!s.flags.sombraContratada;
  return true;
}

function stars(n: number) {
  return '★'.repeat(Math.max(0, Math.min(5, n))) + '☆'.repeat(5 - Math.max(0, Math.min(5, n)));
}

function notebook(app: App) {
  const s = app.s;
  const mood = moodLabel(s);
  const memo = s.mood.memo.slice(-5).reverse().map((m) => `<li><time>Dia ${m.day}</time> ${esc(m.text)}</li>`).join('');
  const clues = s.conspiracy.clues.map((c) => CLUES[c]).filter(Boolean).map((c) => `<li><b>${esc(c.title)}</b><p>${esc(c.text)}</p></li>`).join('');
  const knowsLaw = s.conspiracy.clues.includes('lei_chaves');
  const args = BOOKS.filter((b) => s.knowledge.includes(b.knowledge)).map((b) => `<li><b>${esc(b.title)}</b>: ${esc(b.unlocks)} <i>(${qualityLabel(readQuality(s, b.id)) || 'lido'})</i></li>`).join('');
  const prep = Object.entries(s.conspiracy.prep).filter(([, v]) => v).map(([k, v]) => `<li>${esc(PREP_NAMES[k] ?? k)}${k === 'reservas' ? `: ${v} moedas` : ''}</li>`).join('');
  return frame('notebook-modal', 'Caderno do Rei', `
    <div class="nb-cols">
      <section><h3>Como me sinto</h3><p>${esc(MOOD_LOOK[mood])}</p>${memo ? `<ul class="memo">${memo}</ul>` : ''}
        ${prep ? `<h3>O que guardei para o pior</h3><ul>${prep}</ul>` : ''}
        ${args ? `<h3>Argumentos que posso usar</h3><ul class="memo">${args}</ul>` : ''}</section>
      <section><h3>Suspeitas</h3><p class="sub">${esc(insightLabel(s))}</p>${clues ? `<ul class="clues">${clues}</ul>` : '<p class="sub">Nada escrito ainda. Ande pelo castelo, converse, escute.</p>'}
        ${knowsLaw ? `<h3>As cinco chaves</h3><ul class="keys">${SEAT_IDS.map((k) => { const h = keyHolder(s, k); const who = holder(s, k); return `<li>${esc(SEATS[k].key)}: ${who ? esc(char(who).name) : 'ninguém'} <em class="key key-${h === 'pacto' && insight(s) < 60 ? 'duvida' : h}">${h === 'coroa' ? 'confio' : h === 'duvida' ? 'não sei' : insight(s) >= 60 ? 'suspeito' : 'não sei'}</em></li>`; }).join('')}</ul>` : ''}
      </section>
    </div>`);
}

export function handleCastleModal(app: App, act: string, arg: string): boolean {
  const s = app.s;
  switch (act) {
    case 'agenda': app.ui.castleModal = 'agenda'; app.render(); return true;
    case 'castleMap': app.ui.castleModal = 'mapa'; app.render(); return true;
    case 'notebook': app.ui.castleModal = 'caderno'; app.render(); return true;
    case 'closeCastleModal': app.ui.castleModal = null; app.ui.seatPick = null; app.render(); app.afterModal(); return true;
    case 'seatPick': app.ui.seatPick = arg as CouncilSeatId; app.render(); return true;
    case 'seatBack': app.ui.seatPick = null; app.render(); return true;
    case 'appoint': {
      const [seat, id] = arg.split(':') as [CouncilSeatId, string];
      if (s.res.influencia < APPOINT_COST) return true;
      s.res.influencia -= APPOINT_COST;
      const e = appoint(s, seat, id);
      save(s);
      app.ui.seatPick = null;
      app.toast(e.text);
      app.render();
      return true;
    }
    case 'dismissSeat': {
      const e = dismiss(s, arg as CouncilSeatId);
      save(s);
      if (e) app.toast(e.text);
      app.render();
      return true;
    }
  }
  return false;
}

export const roomLabel = (r: RoomId) => ROOMS[r].name;
