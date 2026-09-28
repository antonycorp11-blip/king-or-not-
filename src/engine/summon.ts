import type { GameState, HouseId } from '../types';
import { CHARACTERS } from '../data/characters';
import { EVENT_MAP } from '../data/events';
import { clamp, hasSkill, log } from './core';
import { pushAudience } from './day';
import { sendLetter } from './letters';

// Convocar alguém ao salão: pode vir... ou mandar uma desculpa (e isso também é uma resposta).
export const SUMMON_COOLDOWN = 3;

export function canSummon(s: GameState, id: string) {
  if (!EVENT_MAP[`conv_${id}`]) return false;
  const last = s.summoned?.[id];
  return last === undefined || s.day - last >= SUMMON_COOLDOWN;
}

export function summonChance(s: GameState, id: string) {
  const realm = CHARACTERS[id]?.realm as HouseId;
  const base = realm in s.loyalty ? s.loyalty[realm] : (s.rel[id] ?? 0);
  return clamp(0.55 + base / 140 + (s.res.prestigio - 50) / 250 + (hasSkill(s, 'embaixador') ? 0.2 : 0), 0.12, 0.95);
}

export function summon(s: GameState, id: string, roll: number): 'vem' | 'recusa' {
  (s.summoned ??= {})[id] = s.day;
  const realm = CHARACTERS[id]?.realm as HouseId;
  if (roll < summonChance(s, id)) {
    pushAudience(s, `conv_${id}`, Math.min(19, s.hour + 1 + Math.floor(roll * 3)));
    return 'vem';
  }
  if (realm in s.loyalty && !hasSkill(s, 'corvos')) s.loyalty[realm] = clamp(s.loyalty[realm] - 5, -100, 100);
  s.rel[id] = clamp((s.rel[id] ?? 0) - 4, -100, 100);
  sendLetter(s, `recusa_${id}`);
  log(s, { icon: 'selo', title: 'Convocação recusada', text: `${CHARACTERS[id].name} não atendeu ao chamado do rei. A tensão aumentou.`, tone: 'ruim' });
  return 'recusa';
}
