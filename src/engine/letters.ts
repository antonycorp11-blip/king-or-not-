import type { GameState, Letter, LetterDef } from '../types';
import { LETTERS, LETTER_MAP } from '../data/letters';
import { applyEffect, rand } from './core';

// Correio real: recados que chegam sem audiência. Responder não gasta horas.
export function letters(s: GameState): Letter[] {
  return (s.letters ??= []);
}

export function unreadCount(s: GameState) {
  return letters(s).filter((l) => !l.read || (defOf(l).choices?.length && l.answer === undefined)).length;
}

export function defOf(l: Letter): LetterDef {
  return LETTER_MAP[l.defId];
}

export function sendLetter(s: GameState, id: string) {
  if (!LETTER_MAP[id]) return;
  letters(s).unshift({ uid: s.nextUid++, defId: id, day: s.day, read: false });
  s.seen[`carta:${id}`] = s.day;
}

function eligible(s: GameState, d: LetterDef) {
  if (d.day !== undefined) return false;
  if (d.minDay && s.day < d.minDay) return false;
  if (d.maxDay && s.day > d.maxDay) return false;
  const last = s.seen[`carta:${d.id}`];
  if (last !== undefined && (!d.repeat || s.day - last < d.repeat)) return false;
  return d.cond ? d.cond(s) : true;
}

// Chamado no começo do dia: cartas do roteiro e 0 a 2 cartas soltas
export function deliverLetters(s: GameState) {
  for (const d of LETTERS) if (d.day === s.day && (!d.cond || d.cond(s))) sendLetter(s, d.id);
  const n = rand(s) < 0.55 ? 1 : rand(s) < 0.5 ? 2 : 0;
  for (let k = 0; k < n; k++) {
    const pool = LETTERS.filter((d) => d.weight && eligible(s, d));
    if (!pool.length) break;
    const total = pool.reduce((a, d) => a + d.weight!, 0);
    let r = rand(s) * total;
    sendLetter(s, (pool.find((d) => (r -= d.weight!) <= 0) ?? pool[0]).id);
  }
  // cartas muito antigas e já resolvidas saem da caixa
  s.letters = letters(s).filter((l) => s.day - l.day < 8 || (defOf(l).choices?.length && l.answer === undefined));
}

export function answerLetter(s: GameState, uid: number, idx: number): string {
  const l = letters(s).find((x) => x.uid === uid);
  if (!l || l.answer !== undefined) return '';
  const ch = defOf(l).choices?.[idx];
  if (!ch) return '';
  l.answer = idx;
  l.read = true;
  applyEffect(s, ch.effects, { origin: { day: s.day, event: `Carta: ${defOf(l).subject}`, decision: ch.label } });
  const reply = typeof ch.reply === 'function' ? ch.reply(s) : ch.reply;
  l.reply = reply ?? 'Sua resposta foi selada e enviada.';
  return l.reply;
}
