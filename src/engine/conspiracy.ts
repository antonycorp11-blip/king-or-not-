import type { CouncilSeatId, GameState, KeyHolder, LogEntry } from '../types';
import { CLUES } from '../data/clues';
import { ADVISORS, SEATS, SEAT_IDS } from '../data/council';
import { bond } from './bonds';
import { char } from '../data/characters';

// O Pacto das Cinco Chaves: segredo que cresce com o poder que o rei entrega.
// O jogador nunca vê uma porcentagem; vê pistas, rostos e chaves.

export function addClue(s: GameState, id: string): boolean {
  if (!CLUES[id] || s.conspiracy.clues.includes(id)) return false;
  s.conspiracy.clues.push(id);
  s.log.push({ icon: 'mascara', title: 'Nova anotação no caderno', text: `${CLUES[id].title}. Está escrito no Caderno do Rei.`, tone: 'rumor' });
  return true;
}

// Quanto do plano o rei entende (0..100). Uso interno: libera opções durante a queda.
export function insight(s: GameState): number {
  return Math.min(100, s.conspiracy.clues.reduce((a, c) => a + (CLUES[c]?.weight ?? 0), 0) + s.conspiracy.exposed.length * 10);
}

// Palavras em vez de número
export function insightLabel(s: GameState): string {
  const v = insight(s);
  if (v >= 90) return 'Você enxerga o plano inteiro.';
  if (v >= 50) return 'As peças começam a formar um desenho.';
  if (v >= 20) return 'Há algo errado nesta corte. Você sente.';
  if (v > 0) return 'Uma suspeita, nada mais.';
  return 'Nenhuma suspeita. Por enquanto.';
}

// De que lado está cada chave hoje. "dúvida" = um guardião poderoso e pouco leal.
export function keyHolder(s: GameState, seat: CouncilSeatId): KeyHolder {
  const who = s.council.seats[seat];
  if (!who) return 'coroa';
  const c = s.conspiracy;
  if (c.members.includes(who) && !c.turned.includes(who) && !c.exposed.includes(who)) return 'pacto';
  const power = s.council.power[who] ?? 0;
  if (power >= 45 && bond(s, who).lealdade < 45) return 'duvida';
  return 'coroa';
}

export function keysForPact(s: GameState) {
  return SEAT_IDS.filter((k) => keyHolder(s, k) === 'pacto').length;
}

// Todo dia, o Pacto tenta recrutar guardiões poderosos, magoados ou ambiciosos.
// É aqui que delegar demais, ignorar conselheiros e humilhar gente vira perigo real.
export function conspiracyDaily(s: GameState, rng: () => number, entries: LogEntry[]) {
  const c = s.conspiracy;
  if (s.phase !== 'reinado') return;
  c.stage = s.day < 21 ? 0 : s.day < 36 ? 1 : s.day < 56 ? 2 : s.day < 68 ? 3 : 4;
  if (s.day < 12) return;
  for (const seat of SEAT_IDS) {
    const who = s.council.seats[seat];
    if (!who || who === s.spouse || c.members.includes(who) || c.exposed.includes(who)) continue;
    const prof = ADVISORS[who];
    const b = bond(s, who);
    const power = s.council.power[who] ?? 0;
    const pull = (prof?.ambition ?? 40) / 100 * 0.5 + power / 250 + b.ressentimento / 200 - b.lealdade / 160 - b.amor / 300;
    if (pull > 0.25 && rng() < (pull - 0.25) * 0.35) {
      c.members.push(who);
      // O jogador não é informado. Só um guardião atento percebe algo.
      if (s.council.seats.sussurros && s.council.seats.sussurros !== who && !c.members.includes(s.council.seats.sussurros) && rng() < 0.5)
        entries.push({ icon: 'mascara', title: 'Um sussurro', text: `${SEATS.sussurros.name} comenta que ${nameOf(who)} anda jantando com gente estranha.`, tone: 'rumor' });
    }
  }
  // O casamento leva o Pacto a recrutar dentro da casa da rainha (quem, depende do caminho).
  if (s.day >= 30 && s.spouse) {
    const houseAgent: Record<string, string> = { elenora: 'gaspard', rhoswen: 'brandt', isolde: 'kasim', sigrid: 'ragnar' };
    const agent = houseAgent[s.spouse];
    if (agent && !c.members.includes(agent) && (s.tracks[trackOf(s.spouse)] ?? 0) >= 40) c.members.push(agent);
  }
  c.fallDay ??= 72 + Math.floor(rng() * 7) - 3;
}

export function trackOf(spouse: string) {
  return ({ elenora: 'dividaValmont', rhoswen: 'oficiaisDrakon', isolde: 'presencaVeridian', sigrid: 'agentesNorte' } as Record<string, string>)[spouse] ?? 'nenhum';
}

const nameOf = (id: string) => char(id).name;
