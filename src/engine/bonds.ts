import type { Bond, GameState } from '../types';
import { defaultBond } from './migrate';

// Relações em camadas: amor, confiança, ressentimento, medo e lealdade.
// Só personagens centrais precisam delas; o restante segue com a relação simples (rel).
export const DEEP: string[] = [
  'isabelle', 'lucas', 'aldric', 'corvin', 'aurelian', 'theodric', 'otho', 'gaspard', 'brandt', 'aveline',
  'elenora', 'rhoswen', 'isolde', 'sigrid', 'cedric', 'sombra', 'dama', 'marta', 'pimenta',
];

const clampB = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

export function bond(s: GameState, id: string): Bond {
  return (s.bonds[id] ??= defaultBond(id, s.rel[id] ?? 0));
}

export function addBond(s: GameState, id: string, d: Partial<Bond>) {
  const b = bond(s, id);
  for (const [k, v] of Object.entries(d) as [keyof Bond, number][]) b[k] = clampB(b[k] + v);
}

// Uma mudança na relação simples também mexe nas camadas, com peso menor.
export function echoRel(s: GameState, id: string, v: number) {
  if (!DEEP.includes(id) || !v) return;
  if (v > 0) addBond(s, id, { confianca: v * 0.35, ressentimento: -v * 0.2 });
  else addBond(s, id, { ressentimento: -v * 0.45, confianca: v * 0.2 });
}

// Uma leitura humana da relação, sem números
export function bondReading(s: GameState, id: string): string {
  const b = bond(s, id);
  const parts: string[] = [];
  if (b.amor >= 65) parts.push(b.confianca < 35 ? 'Ama você, mas não confia' : 'Ama você');
  else if (b.amor >= 35) parts.push('Tem carinho por você');
  if (b.ressentimento >= 55) parts.push('guarda mágoas');
  else if (b.ressentimento >= 30) parts.push('algo o incomoda');
  if (b.medo >= 55) parts.push('tem medo de você');
  if (b.lealdade >= 75) parts.push('leal até o fim');
  else if (b.lealdade <= 25) parts.push('lealdade duvidosa');
  if (!parts.length) parts.push(b.confianca >= 60 ? 'Confia em você' : 'Ainda o observa');
  const t = parts.join(', ');
  return t[0].toUpperCase() + t.slice(1) + '.';
}
