// Simulação sem interface: joga partidas com escolhas aleatórias para achar erros de lógica.
import { newGame, applyEffect, softenCost } from '../src/engine/core';
import { startDay, endDay, eventOf, canSpend, spendHours } from '../src/engine/day';
import { dynamicChoices } from '../src/data/events';
import { canTakeTurn, endPlayerTurn, blitz, ADJ, terr, reinforce } from '../src/engine/war';
import type { Choice, GameState, Req } from '../src/types';
import { BOOKS } from '../src/data/progression';
import { companionsFor, genericAdvice } from '../src/data/companions';
import { marchArmy } from '../src/engine/army';
import { KINGDOM_PROVINCES } from '../src/data/realm';

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
    if (s.war && canTakeTurn(s)) {
      const w = s.war;
      while (w.reinforcements > 0) reinforce(s, 'castelmar');
      for (const t of w.territories.filter((t) => t.owner === 'rei' && t.units > 3)) {
        const foe = ADJ[t.id].map((n) => terr(w, n)).find((n) => n && n.owner === 'inimigo' && n.units < t.units);
        if (foe && !w.result) blitz(s, t.id, foe.id);
      }
      if (!w.result) endPlayerTurn(s);
    }
    endDay(s);
  }
  wars[s.war ? `${s.war.enemy}:${s.war.result ?? 'andamento'}` : 'sem guerra'] = (wars[s.war ? `${s.war.enemy}:${s.war.result ?? 'andamento'}` : 'sem guerra'] ?? 0) + 1;
  gold += s.res.ouro; povo += s.res.povo;
  const key = s.ended ? s.ended.title : 'sem fim';
  results[key] = (results[key] ?? 0) + 1;
  spouses[s.spouse ?? 'nenhuma'] = (spouses[s.spouse ?? 'nenhuma'] ?? 0) + 1;
}
console.log('Finais:', results);
console.log('Rainhas:', spouses);
console.log('Guerras:', wars);
console.log('Ouro médio final:', Math.round(gold/300), 'Povo médio:', Math.round(povo/300));
