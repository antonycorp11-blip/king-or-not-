// Verifica o ritmo de uma partida que tenta atender o máximo possível de pedidos.
import { newGame, applyEffect } from '../src/engine/core';
import { startDay, endDay, eventOf, canSpend, spendHours, visibleAudiences } from '../src/engine/day';
import { dynamicChoices } from '../src/data/events';
import { marry } from '../src/data/events/marriage';
import type { Choice, GameState, Req } from '../src/types';

function allowed(s: GameState, r?: Req) {
  if (!r) return true;
  if (r.knowledge && !s.knowledge.includes(r.knowledge)) return false;
  if (r.ouro && s.res.ouro < r.ouro) return false;
  if (r.influencia && s.res.influencia < r.influencia) return false;
  if (r.test && !r.test(s)) return false;
  return true;
}

function answer(s: GameState, uid: number) {
  const a = s.audiences.find((x) => x.uid === uid)!;
  const ev = eventOf(a);
  let node = 'start';
  for (let depth = 0; depth < 6; depth++) {
    const choices = (dynamicChoices(ev.id, s, node) ?? ev.nodes[node].choices) as Choice[];
    const ch = choices.find((c) => allowed(s, c.req) && (c.color === 'verde' || c.color === 'azul')) ?? choices.find((c) => allowed(s, c.req));
    if (!ch) break;
    applyEffect(s, ch.effects, { origin: { day: s.day, event: ev.topic, decision: ch.label } });
    if (!ch.goto) break;
    if (!ev.nodes[ch.goto]) throw new Error(`Falta nó ${ev.id} -> ${ch.goto}`);
    node = ch.goto;
  }
  a.done = true;
  spendHours(s, ev.kind === 'noite' ? 0 : ev.hours ?? 1);
}

const early = newGame('Teste');
let prevented = false;
try { marry(early, 'elenora'); } catch { prevented = true; }
if (!prevented || early.spouse) throw new Error('Casamento antes do Dia 20 ainda é possível.');

const provenance = newGame('Teste');
provenance.day = 9;
provenance.flags.promessaCavalaria = true;
provenance.flagOrigins = { promessaCavalaria: { day: 3, event: 'A filha da muralha', decision: 'Você comandaria a cavalaria' } };
startDay(provenance);
const echo = provenance.audiences.find((a) => a.eventId === 'eco_cavalaria');
if (!echo || echo.origin?.decision !== 'Você comandaria a cavalaria') throw new Error('Consequência sem origem na agenda.');

let days = 0, ignoredDays = 0, ignoredTotal = 0, maxQueue = 0;
for (let run = 0; run < 24; run++) {
  const s = newGame('Teste');
  startDay(s);
  while (s.day <= 16 && !s.ended) {
    if (s.spouse && s.day < 20) throw new Error('Casamento antecipado durante a simulação.');
    maxQueue = Math.max(maxQueue, s.audiences.filter((a) => !a.done).length);
    while (s.hour < 20) {
      const available = visibleAudiences(s).find((a) => canSpend(s, eventOf(a).hours ?? 1));
      if (available) answer(s, available.uid);
      else spendHours(s, 1);
    }
    const entries = endDay(s);
    if (s.day > 4) {
      const ignored = entries.filter((e) => e.title.startsWith('Ignorado:')).length;
      days++;
      if (ignored) ignoredDays++;
      ignoredTotal += ignored;
    }
  }
}
console.log(`Pressão (Dias 4–16): ${ignoredDays}/${days} dias com audiência ignorada; ${ignoredTotal} ignoradas; fila máxima ${maxQueue}.`);
if (!days || ignoredDays / days < 0.6) throw new Error('A agenda ainda deixa tempo demais para atender todo mundo.');
