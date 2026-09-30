import type { GameState, RoomId } from '../types';
import { ROUTINES, ROUTINE_MAP, type RoutineStep } from '../data/routines';
import { ROOMS } from '../data/castle';
import { EVENT_MAP } from '../data/events';

// "Onde está Aldric?" é uma pergunta de verdade. A resposta vem, em ordem, de:
// ausências (exílio, morte, viagem) → compromissos → quem espera audiência → rotina.
export interface Whereabouts {
  room: RoomId;
  spot: string;
  activity: string;
  why: 'rotina' | 'compromisso' | 'audiencia' | 'encontro';
}

const QUEUE_KINDS = ['audiencia', 'urgente', 'familia', 'conselho', 'casamento'];

const ABSENT: Record<string, (s: GameState) => boolean> = {
  otho: (s) => !!s.flags.othoExilado || !!s.flags.othoDeposto,
  clara: (s) => !!s.flags.claraFim && !s.flags.casoClara,
  bianca: (s) => s.flags.bianca === false,
  cedric: (s) => ['embaixador', 'fugiu', 'cacado', 'duelo'].includes(String(s.flags.cedricResolvido)),
};

export function isAbsent(s: GameState, id: string) {
  return !!s.flags[`ausente_${id}`] || !!s.flags[`morto_${id}`] || !!ABSENT[id]?.(s);
}

function step(steps: RoutineStep[], hour: number): RoutineStep {
  let cur = steps[0];
  for (const st of steps) if (st[0] <= hour) cur = st;
  return cur;
}

export function whereIs(s: GameState, id: string, hour = s.hour): Whereabouts | null {
  if (isAbsent(s, id)) return null;
  // Compromisso em andamento com essa pessoa
  const ap = s.agenda.find((a) => a.state !== 'faltou' && a.state !== 'cancelado' && a.kind !== 'audiencia' && a.kind !== 'diplomacia' && a.who.includes(id) && hour >= a.hour - 0.25 && hour < a.hour + a.duration);
  if (ap) {
    const seat = ap.kind === 'conselho' ? Object.entries(s.council.seats).find(([, w]) => w === id)?.[0] : undefined;
    return { room: ap.room, spot: seat ?? ap.spot ?? '', activity: ap.kind === 'encontro' ? `esperando o rei (${ap.title.toLowerCase()})` : ap.meal ? 'à mesa do Salão de Banquetes' : `em compromisso: ${ap.title.toLowerCase()}`, why: 'compromisso' };
  }
  // Esperando para ser recebido
  const waiting = s.audiences.find((a) => !a.done && (a.arrive ?? 8) <= hour && EVENT_MAP[a.eventId]?.speaker === id && !EVENT_MAP[a.eventId]!.place && QUEUE_KINDS.includes(EVENT_MAP[a.eventId]!.kind));
  if (waiting) return { room: 'salao', spot: 'fila', activity: 'esperando audiência no salão', why: 'audiencia' };
  const r = ROUTINE_MAP[id];
  if (!r || (r.cond && !r.cond(s))) return null;
  const [, room, spot, activity] = step(r.alt?.(s) ?? r.steps, hour);
  return { room, spot, activity, why: 'rotina' };
}

// Quem está neste cômodo agora (pessoas com rotina; visitantes do salão ficam na fila)
export function presentIn(s: GameState, room: RoomId, hour = s.hour): { id: string; where: Whereabouts }[] {
  const out: { id: string; where: Whereabouts }[] = [];
  const ids = new Set<string>(ROUTINES.map((r) => r.id));
  for (const a of s.agenda) a.who.forEach((w) => ids.add(w));
  for (const id of ids) {
    const w = whereIs(s, id, hour);
    if (w && w.room === room && w.why !== 'audiencia') out.push({ id, where: w });
  }
  return out;
}

// Frase para "Onde está...?"
export function whereLine(s: GameState, id: string): string {
  const w = whereIs(s, id);
  if (!w) return 'Não está no castelo.';
  const R = ROOMS[w.room];
  return `${R.name}${R.ready ? '' : ' (fora do seu caminho por ora)'} · ${w.activity}`;
}
