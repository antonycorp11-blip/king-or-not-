import type { Appointment, GameEvent, GameState, LogEntry, RoomId } from '../types';
import { EVENTS, EVENT_MAP } from '../data/events';
import { ROOMS } from '../data/castle';
import { char } from '../data/characters';
import { applyEffect } from './core';
import { addBond } from './bonds';
import { councilDecidesAlone, holder } from './council';
import { SEAT_IDS } from '../data/council';
import { computeEconomy } from './economy';
import { unreadCount } from './letters';

// A agenda do dia: compromissos com hora, lugar e gente esperando.
// Ela não prende o jogador. Ela só faz o mundo reagir quando ele falta.

const IMPORTANT = new Set(['gaspard', 'brandt', 'aveline', 'otho', 'haakon', 'ragnar', 'isolde', 'sigrid', 'elenora', 'rhoswen', 'cedric', 'kasim']);

function add(s: GameState, a: Omit<Appointment, 'uid' | 'state'>) {
  s.agenda.push({ ...a, uid: s.nextUid++, state: 'pendente' });
}

function eligibleMatter(s: GameState, e: GameEvent) {
  if (e.kind !== 'reuniao' || s.council.decided.includes(e.id)) return false;
  if (e.minDay && s.day < e.minDay) return false;
  if (e.maxDay && s.day > e.maxDay) return false;
  return e.cond ? e.cond(s) : true;
}

export function pickMatter(s: GameState, rng: () => number): GameEvent | null {
  // assuntos enviados ao conselho por decisões anteriores vêm primeiro
  while (s.council.queue.length) {
    const id = s.council.queue.shift()!;
    const ev = EVENT_MAP[id];
    if (ev && eligibleMatter(s, ev)) return ev;
  }
  const pool = EVENTS.filter((e) => eligibleMatter(s, e) && (e.weight ?? 0) > 0);
  if (!pool.length) return null;
  const total = pool.reduce((a, e) => a + (e.weight ?? 1), 0);
  let r = rng() * total;
  return pool.find((e) => (r -= e.weight ?? 1) <= 0) ?? pool[0];
}

export function buildAgenda(s: GameState, rng: () => number) {
  s.agenda = [];
  const seated = SEAT_IDS.map((k) => holder(s, k)).filter(Boolean) as string[];
  // 1. Conselho: quase todo dia há algo na mesa
  if (s.day >= 2 && (s.council.queue.length || rng() < 0.8)) {
    const m = pickMatter(s, rng);
    if (m) add(s, { kind: 'conselho', title: m.topic, room: 'conselho', hour: rng() < 0.7 ? 9 : 14, duration: 1.5, who: seated, importance: m.council?.lead === 'marechal' || s.war ? 3 : 2, eventId: m.id, matterId: m.id, note: 'Sem o rei, o conselho decide sozinho.' });
  }
  // 2. Audiências marcadas de gente importante (as demais apenas aparecem no salão)
  for (const a of s.audiences) {
    const ev = EVENT_MAP[a.eventId];
    if (!ev || a.done || ev.kind === 'noite' || !(IMPORTANT.has(ev.speaker) || ev.kind === 'urgente' || ev.day === s.day)) continue;
    add(s, { kind: ev.kind === 'casamento' ? 'diplomacia' : 'audiencia', title: `${char(ev.speaker).name}: ${ev.topic}`, room: 'salao', hour: Math.max(8, a.arrive ?? 8), duration: ev.hours ?? 1, who: [ev.speaker], importance: ev.kind === 'urgente' ? 3 : 2, note: a.expires > s.day ? 'Pode esperar até amanhã.' : 'Parte hoje se não for recebido.' });
  }
  // 3. Treino da guarda
  if (s.day % 3 === 0 || (s.war && !s.war.result)) add(s, { kind: 'treino', title: 'Treino da Guarda', room: 'patio', hour: 14, duration: 1, who: ['aurelian'], importance: 1, eventId: pickFrom(s, 'treino_'), note: 'Os soldados notam quando o rei não aparece.' });
  // 4. Missa
  if (s.day % 5 === 0) add(s, { kind: 'religioso', title: 'Missa na capela', room: 'capela', hour: 10, duration: 1, who: ['frei_aske', 'isabelle'], importance: 1, eventId: pickFrom(s, 'missa_'), note: 'Os Seren contam quem falta à missa.' });
  // 5. Jantar
  if (s.spouse) add(s, { kind: 'jantar', title: `Jantar com ${char(s.spouse).name}`, room: 'aposentos', hour: 18.5, duration: 1, who: [s.spouse], importance: 2, eventId: pickFrom(s, `jantar_${s.spouse}_`) ?? pickFrom(s, 'jantar_rainha_'), note: 'Ela vai jantar sozinha. E vai lembrar.' });
  else if (s.day % 2 === 0) add(s, { kind: 'familia', title: 'Jantar em família', room: 'aposentos', hour: 18.5, duration: 1, who: ['isabelle', 'lucas'], importance: 1, eventId: pickFrom(s, 'jantar_familia_'), note: 'Sua mãe servirá o seu prato mesmo assim.' });
  s.agenda.sort((a, b) => a.hour - b.hour);
}

// Escolhe a próxima variação ainda não vista de uma série de eventos (evita repetir diálogo)
function pickFrom(s: GameState, prefix: string): string | undefined {
  const pool = EVENTS.filter((e) => e.id.startsWith(prefix) && (!e.cond || e.cond(s)) && (!e.minDay || s.day >= e.minDay));
  if (!pool.length) return undefined;
  const unseen = pool.filter((e) => s.seen[e.id] === undefined);
  const list = unseen.length ? unseen : pool.sort((a, b) => (s.seen[a.id] ?? 0) - (s.seen[b.id] ?? 0));
  return list[0].id;
}

// Compromisso que acontece agora neste cômodo (o rei acabou de chegar)
export function dueHere(s: GameState, room: RoomId): Appointment | null {
  return s.agenda.find((a) => a.state === 'pendente' && a.room === room && a.eventId && s.hour >= a.hour - 0.5 && s.hour < a.hour + a.duration) ?? null;
}

// O rei chegou: está atrasado?
export function attend(s: GameState, a: Appointment): LogEntry | null {
  const late = s.hour > a.hour + 0.34;
  a.state = late ? 'atrasado' : 'feito';
  if (a.eventId) s.seen[a.eventId] = s.day;
  if (!late) return null;
  for (const w of a.who) addBond(s, w, { ressentimento: 1 });
  return { icon: 'ampulheta', title: 'Atrasado', text: `Você chegou atrasado a: ${a.title}. Todos esperaram de pé.`, tone: 'neutro' };
}

// O tempo passou: quem ficou esperando à toa?
export function tickAgenda(s: GameState): LogEntry[] {
  const out: LogEntry[] = [];
  for (const a of s.agenda) {
    if (a.state !== 'pendente' || s.hour < a.hour + a.duration) continue;
    if (a.kind === 'audiencia' || a.kind === 'diplomacia') {
      // audiências são resolvidas pela fila; aqui só se registra a demora
      a.state = s.audiences.some((x) => !x.done && EVENT_MAP[x.eventId]?.speaker === a.who[0]) ? 'pendente' : 'feito';
      if (a.state === 'pendente' && s.hour >= a.hour + a.duration + 2) {
        a.state = 'atrasado';
        applyEffect(s, { rel: { [a.who[0]]: -3 }, bond: { [a.who[0]]: { ressentimento: 4 } } });
        out.push({ icon: 'ampulheta', title: 'Esperando há horas', text: `${char(a.who[0]).name} continua de pé no salão. Já não sorri.`, tone: 'ruim' });
      }
      continue;
    }
    a.state = 'faltou';
    out.push(...miss(s, a));
  }
  return out;
}

function miss(s: GameState, a: Appointment): LogEntry[] {
  switch (a.kind) {
    case 'conselho': {
      const ev = a.matterId ? EVENT_MAP[a.matterId] : undefined;
      const e = ev ? councilDecidesAlone(s, ev) : null;
      return e ? [e] : [];
    }
    case 'jantar':
      applyEffect(s, { bond: { [a.who[0]]: { amor: -3, ressentimento: 5 } }, rel: { [a.who[0]]: -4 } });
      return [{ icon: 'coracao', title: 'Jantar frio', text: `${char(a.who[0]).name} jantou sozinha. O prato do rei esfriou do lado dela.`, tone: 'ruim' }];
    case 'familia':
      applyEffect(s, { rel: { isabelle: -2, lucas: -2 } });
      return [{ icon: 'coracao', title: 'Cadeira vazia', text: 'Sua mãe e Lucas jantaram olhando para a sua cadeira.', tone: 'neutro' }];
    case 'religioso':
      applyEffect(s, { loyalty: { seren: -2 }, rel: { frei_aske: -3 } });
      return [{ icon: 'estrela', title: 'Faltou à missa', text: 'Frei Aske fez o sermão sobre reis que esquecem Deus. Os Seren ouviram com atenção.', tone: 'ruim' }];
    case 'treino':
      applyEffect(s, { res: { moral: -1 }, bond: { aurelian: { confianca: -1 } } });
      return [{ icon: 'escudo', title: 'Treino sem o rei', text: 'Os recrutas treinaram olhando para a porta do salão. O rei não veio.', tone: 'neutro' }];
    default:
      return [];
  }
}

// Assuntos sem hora marcada: o que está esperando o rei em algum lugar
export function looseEnds(s: GameState): { text: string; room?: RoomId }[] {
  const out: { text: string; room?: RoomId }[] = [];
  const unread = unreadCount(s);
  if (unread) out.push({ text: `${unread} carta(s) no correio real` });
  const eco = computeEconomy(s);
  if (eco.shortages.length) out.push({ text: `Escassez em ${new Set(eco.shortages.map((x) => x.province)).size} província(s)`, room: 'conselho' });
  if (eco.net < 0) out.push({ text: 'O tesouro perde ouro todo dia', room: 'conselho' });
  if (s.skillPoints > 0) out.push({ text: 'Uma lição a registrar (ponto de habilidade)' });
  if (s.war && !s.war.result) out.push({ text: 'A guerra espera ordens no mapa', room: 'conselho' });
  const vacant = SEAT_IDS.filter((k) => !holder(s, k));
  if (vacant.length) out.push({ text: `${vacant.length} cadeira(s) vazia(s) no conselho`, room: 'conselho' });
  return out;
}

export const roomName = (r: RoomId) => ROOMS[r].name;
