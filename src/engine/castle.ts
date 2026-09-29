import type { Appointment, GameEvent, GameState, RoomId } from '../types';
import { EVENTS, EVENT_MAP } from '../data/events';
import { ROOMS, TRAVEL_HOURS, entryPoint, roomRoute } from '../data/castle';
import { canSpend, spendHours } from './day';
import { attend, dueHere } from './agenda';
import { rand, save } from './core';

// O rei anda pelo castelo. Cada porta custa um pouco de tempo; chegar a um lugar
// pode disparar um compromisso ou um encontro.

export interface TravelResult { ok: boolean; hours: number; reason?: string }

export function travelCost(s: GameState, to: RoomId): number | null {
  const route = roomRoute(s.castle.room, to);
  return route ? (route.length - 1) * TRAVEL_HOURS : null;
}

export function travel(s: GameState, to: RoomId): TravelResult {
  if (!ROOMS[to].ready) return { ok: false, hours: 0, reason: `${ROOMS[to].name} ainda está fechado.` };
  const route = roomRoute(s.castle.room, to);
  if (!route) return { ok: false, hours: 0, reason: 'Não há caminho até lá.' };
  const hours = (route.length - 1) * TRAVEL_HOURS;
  if (hours && !canSpend(s, hours) && s.hour < 20) return { ok: false, hours, reason: 'Não há tempo para isso hoje.' };
  const from = route[route.length - 2] ?? s.castle.room;
  if (hours) spendHours(s, Math.min(hours, Math.max(0, 20 - s.hour)), 'andar');
  const [x, y] = entryPoint(from, to);
  s.castle = { ...s.castle, room: to, x, y, seated: false, visitedToday: [...new Set([...s.castle.visitedToday, to])] };
  save(s);
  return { ok: true, hours };
}

// Ao chegar: há um compromisso aqui agora? Um encontro esperando?
export function arrival(s: GameState): { appointment?: Appointment; event?: GameEvent; late?: boolean } {
  const ap = dueHere(s, s.castle.room);
  if (ap) {
    const late = !!attend(s, ap);
    const ev = ap.eventId ? EVENT_MAP[ap.eventId] : undefined;
    return { appointment: ap, event: ev, late };
  }
  const enc = pickEncounter(s, s.castle.room);
  return enc ? { event: enc } : {};
}

function eligibleEncounter(s: GameState, e: GameEvent, room: RoomId) {
  if (e.kind !== 'encontro' || e.room !== room) return false;
  if (e.hoursWindow && (s.hour < e.hoursWindow[0] || s.hour >= e.hoursWindow[1])) return false;
  if (e.minDay && s.day < e.minDay) return false;
  if (e.maxDay && s.day > e.maxDay) return false;
  const last = s.seen[e.id];
  if (last !== undefined && (!e.repeat || s.day - last < e.repeat)) return false;
  return e.cond ? e.cond(s) : true;
}

export function pickEncounter(s: GameState, room: RoomId): GameEvent | null {
  if (s.castle.lastEncounter?.[room] === s.day) return null;
  const pool = EVENTS.filter((e) => eligibleEncounter(s, e, room));
  if (!pool.length || rand(s) > 0.5) return null;
  (s.castle.lastEncounter ??= {})[room] = s.day;
  const total = pool.reduce((a, e) => a + (e.weight ?? 1), 0);
  let r = rand(s) * total;
  return pool.find((e) => (r -= e.weight ?? 1) <= 0) ?? pool[0];
}

// Abre um acontecimento fora da fila (atividade, encontro, conversa, reunião)
export function startInline(s: GameState, eventId: string): number | null {
  const ev = EVENT_MAP[eventId];
  if (!ev) return null;
  const uid = s.nextUid++;
  s.audiences.push({ uid, eventId, expires: s.day, done: false, arrive: s.hour });
  s.seen[eventId] = s.day;
  return uid;
}
