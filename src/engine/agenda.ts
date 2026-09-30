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
import { isAbsent } from './npcs';
import { applyMood } from './mood';

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
  // 5. Refeições: o rei precisa ir ao Salão de Banquetes para comer
  const family = ['isabelle', 'lucas'].filter((id) => !isAbsent(s, id));
  const guest = lunchGuest(s, rng);
  add(s, { kind: 'refeicao', meal: 'almoco', title: 'Almoço da corte', room: 'banquete', hour: 12.5, duration: 1, spot: 'mesa1', who: [...new Set([...(s.spouse ? [s.spouse] : []), ...family, ...(guest ? [guest] : [])])], importance: 1, eventId: pickFrom(s, 'almoco_'), note: 'Sem almoço, o rei atravessa a tarde com fome e mau humor.' });
  if (s.spouse) add(s, { kind: 'jantar', meal: 'jantar', title: `Jantar com ${char(s.spouse).name}`, room: 'banquete', hour: 19, duration: 1, spot: 'mesa1', who: [s.spouse, ...family], importance: 2, eventId: pickFrom(s, `jantar_${s.spouse}_`) ?? pickFrom(s, 'jantar_rainha_') ?? pickFrom(s, 'jantar_corte_'), note: 'Ela vai jantar sozinha. E vai lembrar.' });
  else add(s, { kind: 'familia', meal: 'jantar', title: 'Jantar em família', room: 'banquete', hour: 19, duration: 1, spot: 'mesa1', who: family, importance: 1, eventId: (s.day % 2 === 0 ? pickFrom(s, 'jantar_familia_') : undefined) ?? pickFrom(s, 'jantar_corte_'), note: 'Sua mãe servirá o seu prato mesmo assim.' });
  // quem conduz a conversa da refeição também está à mesa
  for (const ap of s.agenda) if (ap.meal && ap.eventId) { const sp = EVENT_MAP[ap.eventId]?.speaker; if (sp && !ap.who.includes(sp) && !isAbsent(s, sp)) ap.who.push(sp); }
  // 6. Encontros marcados: quem combinou um lugar e uma hora espera lá
  for (const a of s.audiences) if (!a.done) placeAppointment(s, a);
  s.agenda.sort((a, b) => a.hour - b.hour);
}

// Quem almoça com o rei: um conselheiro ou um enviado de uma casa que está no castelo
function lunchGuest(s: GameState, rng: () => number): string | null {
  const pool = SEAT_IDS.map((k) => holder(s, k)).filter((id): id is string => !!id && !isAbsent(s, id) && id !== 'isabelle');
  return pool.length ? pool[Math.floor(rng() * pool.length)] : null;
}

// Um acontecimento com lugar e hora vira compromisso na agenda
export function placeAppointment(s: GameState, a: { eventId: string; done: boolean }) {
  const ev = EVENT_MAP[a.eventId];
  if (!ev?.place || a.done || s.agenda.some((x) => x.eventId === ev.id && x.state === 'pendente')) return;
  const p = ev.place;
  add(s, { kind: 'encontro', title: p.title ?? `${char(ev.speaker).name}: ${ev.topic}`, room: p.room, hour: p.hour, duration: p.duration ?? 1, spot: p.spot, who: [ev.speaker, ...(ev.present ?? [])], importance: 2, eventId: ev.id, note: ev.ignored?.text ?? `${char(ev.speaker).name} vai esperar em vão.` });
  s.agenda.sort((x, y) => x.hour - y.hour);
}

// O pajem avisa uma hora antes (só avisos, não entram no resumo do dia)
export function reminders(s: GameState): LogEntry[] {
  const out: LogEntry[] = [];
  for (const a of s.agenda) {
    if (a.state !== 'pendente' || a.reminded || !a.eventId || a.kind === 'audiencia' || a.kind === 'diplomacia') continue;
    if (s.hour < a.hour - 1 || s.hour >= a.hour + a.duration) continue;
    a.reminded = true;
    const h = `${String(Math.floor(a.hour)).padStart(2, '0')}:${String(Math.round((a.hour % 1) * 60)).padStart(2, '0')}`;
    out.push({ icon: a.meal ? 'trigo' : 'ampulheta', title: a.meal ? (a.meal === 'almoco' ? 'O almoço vai ser servido' : 'O jantar vai ser servido') : 'Lembrete', text: `${a.title}, às ${h}, em ${ROOMS[a.room].name}.`, tone: 'neutro' });
  }
  return out;
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
  return s.agenda.find((a) => a.state === 'pendente' && a.room === room && (a.eventId || a.meal) && s.hour >= a.hour - 0.5 && s.hour < a.hour + a.duration) ?? null;
}

// O rei chegou: está atrasado?
export function attend(s: GameState, a: Appointment): LogEntry | null {
  const late = s.hour > a.hour + 0.34;
  a.state = late ? 'atrasado' : 'feito';
  if (a.eventId) s.seen[a.eventId] = s.day;
  // o encontro marcado deixa de esperar na lista de pendências
  for (const x of s.audiences) if (x.eventId === a.eventId && !x.done && EVENT_MAP[x.eventId]?.place) x.done = true;
  if (a.meal) eat(s);
  if (!late) return null;
  for (const w of a.who) addBond(s, w, { ressentimento: 1 });
  return { icon: 'ampulheta', title: 'Atrasado', text: `Você chegou atrasado a: ${a.title}. Todos esperaram de pé.`, tone: 'neutro' };
}

// O tempo passou: quem ficou esperando à toa?
export function tickAgenda(s: GameState): LogEntry[] {
  const out: LogEntry[] = [];
  const waited: string[] = [];
  for (const a of s.agenda) {
    if (a.state !== 'pendente' || s.hour < a.hour + a.duration) continue;
    if (a.kind === 'audiencia' || a.kind === 'diplomacia') {
      // audiências são resolvidas pela fila; aqui só se registra a demora
      a.state = s.audiences.some((x) => !x.done && EVENT_MAP[x.eventId]?.speaker === a.who[0]) ? 'pendente' : 'feito';
      if (a.state === 'pendente' && s.hour >= a.hour + a.duration + 2) {
        a.state = 'atrasado';
        applyEffect(s, { rel: { [a.who[0]]: -3 }, bond: { [a.who[0]]: { ressentimento: 4 } } });
        waited.push(char(a.who[0]).name);
      }
      continue;
    }
    a.state = 'faltou';
    out.push(...miss(s, a));
  }
  if (waited.length) out.push({ icon: 'ampulheta', title: 'Esperando há horas', text: `${waited.join(', ')} ${waited.length > 1 ? 'continuam' : 'continua'} de pé no salão. Já não sorriem.`, tone: 'ruim' });
  return out;
}

// O rei comeu: a fome passa e o humor melhora
export function eat(s: GameState) {
  s.tracks.fome = 0;
  applyMood(s, { fatigue: -12, stress: -4, joy: 3 });
}

function hunger(s: GameState, meal: 'almoco' | 'jantar'): LogEntry {
  s.tracks.fome = (s.tracks.fome ?? 0) + 1;
  const n = s.tracks.fome;
  applyMood(s, { fatigue: 6 + n * 3, stress: 4 + n * 2, anger: n >= 2 ? 6 : 0, why: 'fome' });
  return { icon: 'trigo', title: meal === 'almoco' ? 'Sem almoço' : 'Sem jantar', text: n >= 2 ? 'O rei não come há horas. A cabeça pesa, a paciência some.' : 'A cadeira do rei ficou vazia na mesa. O estômago dele vai cobrar isso.', tone: 'ruim' };
}

function miss(s: GameState, a: Appointment): LogEntry[] {
  const fome = a.meal ? [hunger(s, a.meal)] : [];
  return [...missWhat(s, a), ...fome];
}

function missWhat(s: GameState, a: Appointment): LogEntry[] {
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
    case 'refeicao':
      if (a.who.length) applyEffect(s, { rel: Object.fromEntries(a.who.map((w) => [w, -1])) });
      return [];
    case 'encontro': {
      const ev = a.eventId ? EVENT_MAP[a.eventId] : undefined;
      for (const x of s.audiences) if (x.eventId === a.eventId) x.done = true;
      if (!ev) return [];
      const origin = { day: s.day, event: ev.topic, decision: 'Não compareceu ao encontro' };
      s.flags[`ignored_${ev.id}`] = true;
      (s.flagOrigins ??= {})[`ignored_${ev.id}`] = origin;
      if (ev.ignored) {
        applyEffect(s, ev.ignored, { ignoredMode: true, origin });
        return [{ icon: 'ampulheta', title: `Faltou: ${a.title}`, text: ev.ignored.text, tone: 'ruim' }];
      }
      applyEffect(s, { rel: { [ev.speaker]: -8 }, bond: { [ev.speaker]: { ressentimento: 6 } } });
      return [{ icon: 'ampulheta', title: `Faltou: ${a.title}`, text: `${char(ev.speaker).name} esperou em ${ROOMS[a.room].name} e o rei não apareceu.`, tone: 'ruim' }];
    }
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
