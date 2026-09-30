// Simulação sem interface: joga partidas com escolhas aleatórias para achar erros de lógica.
import { newGame, applyEffect, softenCost } from '../src/engine/core';
import { startDay, endDay, eventOf, canSpend, spendHours } from '../src/engine/day';
import { dynamicChoices } from '../src/data/events';
import { initArmies, setOrder, setTactic } from '../src/engine/campaign';
import type { Choice, GameState, ProvinceId, Req } from '../src/types';
import { BOOKS } from '../src/data/progression';
import { companionsFor, genericAdvice } from '../src/data/companions';
import { marchArmy } from '../src/engine/army';
import { KINGDOM_PROVINCES } from '../src/data/realm';
import { EVENT_MAP, EVENTS } from '../src/data/events';
import { councilChoices, recordVote } from '../src/engine/council';
import { keysForPact, insight } from '../src/engine/conspiracy';
import { moodLabel, moodAdjust } from '../src/engine/mood';
import { ACTIVITIES } from '../src/data/activities';
import { pickEncounter } from '../src/engine/castle';
import { attend } from '../src/engine/agenda';
import type { GameEvent } from '../src/types';

// Joga um acontecimento inteiro com escolhas aleatórias (mesma regra da interface)
function play(s: GameState, ev: GameEvent) {
  let node = 'start';
  for (let depth = 0; depth < 5; depth++) {
    let choices = (dynamicChoices(ev.id, s, node) ?? ev.nodes[node].choices) as Choice[];
    if (ev.council && node === 'start') choices = [...councilChoices(s, ev), ...choices];
    choices = moodAdjust(s, ev, choices);
    const avail = choices.filter((c) => ok(s, c.req));
    if (!avail.length) break;
    const c = avail[Math.floor(Math.random() * avail.length)];
    if (typeof ev.nodes[node].text === 'function') (ev.nodes[node].text as (s: GameState) => string)(s);
    applyEffect(s, c.effects);
    if (c.reply && typeof c.reply === 'function') c.reply(s);
    if (ev.council && depth === 0) recordVote(s, ev, c.seat ?? null);
    if (!c.goto) break;
    if (!ev.nodes[c.goto]) throw new Error(`goto inválido ${ev.id} -> ${c.goto}`);
    node = c.goto;
  }
}
const stats = { delegated: 0, members: 0, keys: 0, clues: 0, insight: 0, council: 0, encounters: 0 };
const moods: Record<string, number> = {};

function ok(s: GameState, r?: Req) {
  if (!r) return true;
  if (r.knowledge && !s.knowledge.includes(r.knowledge)) return false;
  if (r.ouro && s.res.ouro < r.ouro) return false;
  if (r.influencia && s.res.influencia < r.influencia) return false;
  if (r.test && !r.test(s)) return false;
  return true;
}

const results: Record<string, number> = {};
const wars: Record<string, number> = {};
let gold = 0, povo = 0, gov = 0;
const spouses: Record<string, number> = {};
for (let run = 0; run < 300; run++) {
  const s = newGame('Sim');
  startDay(s);
  let guard = 0;
  while (!s.ended && guard++ < 60) {
    // lê um livro às vezes
    if (Math.random() < 0.3 && canSpend(s, 2)) {
      const b = BOOKS.find((x) => !s.knowledge.includes(x.knowledge))!;
      if (b) { spendHours(s, 2); s.bookProgress[b.id] = (s.bookProgress[b.id] ?? 0) + 2; if (s.bookProgress[b.id] >= b.hours) s.knowledge.push(b.knowledge); }
    }
    if (Math.random() < 0.15) marchArmy(s, KINGDOM_PROVINCES[Math.floor(Math.random() * KINGDOM_PROVINCES.length)]);
    // o castelo: reuniões (metade das vezes), atividades e encontros
    for (const ap of s.agenda) {
      if (ap.state !== 'pendente' || !ap.eventId || Math.random() < (ap.meal ? 0.25 : 0.5)) continue;
      const ev = EVENT_MAP[ap.eventId];
      if (!ev) throw new Error('compromisso sem evento ' + ap.eventId);
      if (s.hour < ap.hour) s.hour = ap.hour;
      attend(s, ap);
      play(s, ev);
      if (ev.kind === 'reuniao') stats.council++;
    }
    if (Math.random() < 0.4) {
      const act = ACTIVITIES.filter((a) => a.event && (!a.cond || a.cond(s)))[Math.floor(Math.random() * 6)];
      const id = act && (typeof act.event === 'function' ? act.event(s) : act.event);
      if (id) { if (!EVENT_MAP[id]) throw new Error('atividade sem evento ' + id); s.seen[id] = s.day; play(s, EVENT_MAP[id]); }
    }
    for (const room of ['conselho', 'patio', 'capela', 'aposentos', 'salao', 'quarto'] as const) {
      s.hour = 9 + Math.random() * 9;
      const enc = pickEncounter(s, room);
      if (enc) { s.seen[enc.id] = s.day; play(s, enc); stats.encounters++; }
    }
    s.hour = 8;
    const comps = companionsFor(s);
    s.flags.companion = comps[Math.floor(Math.random() * comps.length)].id;
    for (const a of s.audiences) {
      if (a.done || Math.random() < 0.2) continue;
      const ev = eventOf(a);
      if (!ev) throw new Error('evento inexistente ' + a.eventId);
      if (!canSpend(s, ev.hours ?? 1)) break;
      let node = 'start';
      for (let depth = 0; depth < 5; depth++) {
        const dyn = dynamicChoices(ev.id, s, node);
        const choices = (dyn ?? ev.nodes[node].choices) as Choice[];
        const adv = ev.nodes[node].advice?.[s.flags.companion as string] ?? genericAdvice(s, ev);
        const avail = [...choices, ...(adv && Math.random() < 0.3 ? [adv.choice] : [])].filter((c) => ok(s, c.req));
        if (!avail.length) break;
        const c = avail[Math.floor(Math.random() * avail.length)];
        if (typeof ev.nodes[node].text === 'function') (ev.nodes[node].text as (s: GameState) => string)(s);
        applyEffect(s, c.effects, { soften: Math.random() < 0.2 && softenCost(s, c.effects) <= s.res.influencia });
        if (!c.goto) break;
        if (!ev.nodes[c.goto]) throw new Error(`goto inválido ${ev.id} -> ${c.goto}`);
        node = c.goto;
      }
      a.done = true;
      spendHours(s, ev.hours ?? 1);
    }
    // guerra: ordens aos exércitos (ou delegar ao Marechal)
    if (s.war && !s.war.result) {
      const w = s.war;
      initArmies(s);
      if (Math.random() < 0.7) w.delegated = true;
      else {
        w.delegated = false;
        w.plannedDay = s.day;
        const seat = w.enemy === 'norhelm' ? 'hjalmgard' : w.territories.find((t) => t.owner === 'inimigo')?.id;
        for (const a of w.armies!.filter((x) => x.owner === 'rei')) {
          const r = Math.random();
          setOrder(s, a.id, r < 0.45 ? 'atacar' : r < 0.75 ? 'defender' : r < 0.9 ? 'forragear' : 'recuar', seat as ProvinceId);
          setTactic(s, a.id, (['formacao', 'carga', 'flanco', 'falsa'] as const)[Math.floor(Math.random() * 4)]);
        }
      }
    }
    endDay(s);
  }
  wars[s.war ? `${s.war.enemy}:${s.war.result ?? 'andamento'}` : 'sem guerra'] = (wars[s.war ? `${s.war.enemy}:${s.war.result ?? 'andamento'}` : 'sem guerra'] ?? 0) + 1;
  gold += s.res.ouro; povo += s.res.povo;
  stats.delegated += Object.values(s.council.delegated).reduce((a, b) => a + b, 0);
  stats.members += s.conspiracy.members.length; stats.keys += keysForPact(s); stats.clues += s.conspiracy.clues.length; stats.insight += insight(s);
  moods[moodLabel(s)] = (moods[moodLabel(s)] ?? 0) + 1;
  JSON.parse(JSON.stringify(s)); // o save precisa ser serializável
  const key = s.ended ? s.ended.title : 'sem fim';
  results[key] = (results[key] ?? 0) + 1;
  spouses[s.spouse ?? 'nenhuma'] = (spouses[s.spouse ?? 'nenhuma'] ?? 0) + 1;
}
console.log('Finais:', results);
console.log('Rainhas:', spouses);
console.log('Guerras:', wars);
console.log('Ouro médio final:', Math.round(gold/300), 'Povo médio:', Math.round(povo/300));
console.log('Por partida (média): decisões delegadas', (stats.delegated / 300).toFixed(1), '· membros do Pacto', (stats.members / 300).toFixed(1), '· chaves do Pacto', (stats.keys / 300).toFixed(1), '· pistas', (stats.clues / 300).toFixed(1), '· entendimento', (stats.insight / 300).toFixed(0), '· reuniões', (stats.council / 300).toFixed(1), '· encontros', (stats.encounters / 300).toFixed(1));
console.log('Humor final:', moods);
// eventos agendados ou citados que não existem
const missing = new Set<string>();
const walk = (o: unknown) => { if (!o || typeof o !== 'object') return; const r = o as Record<string, unknown>; if (Array.isArray(r.schedule)) (r.schedule as { id: string }[]).forEach((x) => { if (!EVENT_MAP[x.id]) missing.add(x.id); }); for (const k in r) if (k !== 'run') walk(r[k]); };
walk(EVENTS);
if (missing.size) console.log('AGENDADOS INEXISTENTES:', [...missing]);
