import type { GameState, HouseId, LogEntry, ProvinceId } from '../types';
import { KINGDOM_PROVINCES, PROVINCES } from '../data/realm';
import { clamp, log } from './core';
import { taxKey } from './economy';

// Exército real em tempo de paz: onde ele acampa muda o humor do reino.
export const MARCH_HOURS = 2;
export const BORDER: ProvinceId[] = ['vale', 'montanhas'];

export function armyAt(s: GameState): ProvinceId {
  return (s.flags.armyAt as ProvinceId) || 'castelmar';
}

export function northThreat(s: GameState) {
  return !s.flags.pazNorhelm && !s.war && s.day >= 10;
}

// Tensão 0..100 de cada província do reino
export function tension(s: GameState, p: ProvinceId): number {
  const key = taxKey(p);
  let t = key === 'coroa' ? 100 - s.res.povo : Math.max(0, -s.loyalty[key]) + (s.loyalty[key] < 15 ? 15 : 0);
  if (BORDER.includes(p) && northThreat(s)) t += 35 + Math.min(25, s.day - 10) * 2;
  return clamp(Math.round(t), 0, 100);
}

export function tensionLabel(t: number) {
  return t >= 60 ? 'alta' : t >= 30 ? 'média' : 'baixa';
}

// O que a marcha para `to` provoca (texto de previsão exibido antes de confirmar)
export function marchPreview(s: GameState, to: ProvinceId): string {
  const key = taxKey(to);
  if (to === 'castelmar') return 'O exército volta a proteger a capital. O povo se sente seguro.';
  const border = BORDER.includes(to) && northThreat(s) ? ' Na fronteira, as tropas ficam prontas para Norhelm.' : '';
  if (key === 'coroa') return `Tropas em ${PROVINCES[to].name}.${border}`;
  const loy = s.loyalty[key];
  const house = PROVINCES[to].name;
  const leaving = ' Sem o exército, a capital fica mais vulnerável: se a guerra começar, só uma guarnição a defenderá.';
  if (loy >= 0) return `A casa de ${house} verá o gesto como proteção.${border}${leaving}`;
  return `A casa de ${house} está hostil: verá tropas reais como ocupação e pode reagir mal, mas uma rebelião fica mais difícil.${border}${leaving}`;
}

export function marchArmy(s: GameState, to: ProvinceId) {
  const from = armyAt(s);
  if (from === to) return;
  s.flags.armyAt = to;
  const key = taxKey(to);
  if (key !== 'coroa') {
    s.loyalty[key] = clamp(s.loyalty[key] + (s.loyalty[key] >= 0 ? 4 : -6), -100, 100);
    s.scheduled.push({ id: `exercito_${key}`, day: s.day + 1 });
  }
  if (from === 'castelmar') s.scheduled.push({ id: 'capital_vazia', day: s.day + 2 });
  if (BORDER.includes(to) && northThreat(s)) s.res.moral = clamp(s.res.moral + 5, 0, 100);
  log(s, { icon: 'espadas', title: 'O exército marchou', text: `O exército real deixou ${PROVINCES[from].name} e acampou em ${PROVINCES[to].name}.`, tone: 'neutro' });
}

// Efeitos diários do acampamento (chamado no fim do dia)
export function armyDaily(s: GameState, entries: LogEntry[]) {
  if (s.war && !s.war.result) return;
  const at = armyAt(s);
  const key = taxKey(at);
  if (key !== 'coroa') {
    const house = key as HouseId;
    s.loyalty[house] = clamp(s.loyalty[house] + (s.loyalty[house] >= 0 ? 1 : -1), -100, 100);
    s.res.povo = clamp(s.res.povo - 1, 0, 100); // a capital sem o exército fica mais insegura
  }
  // exército grande preocupa os lordes
  if (s.res.exercito >= 1200 && !s.flags.exercitoGrande) {
    s.flags.exercitoGrande = true;
    s.scheduled.push({ id: 'exercito_grande', day: s.day + 1 });
  }
  if (at !== 'castelmar') entries.push({ icon: 'espadas', title: 'Acampamento real', text: `O exército segue acampado em ${PROVINCES[at].name}. A capital sente a ausência das tropas.`, tone: 'neutro' });
}

export const MARCH_TARGETS = KINGDOM_PROVINCES;
