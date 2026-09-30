import type { AudienceCategory, CouncilSeatId, ForwardRecord, GameEvent, GameState, LogEntry, PolicyTarget } from '../types';
import { EVENT_MAP } from '../data/events';
import { SEATS } from '../data/council';
import { char } from '../data/characters';
import { clamp } from './core';
import { addBond, bond } from './bonds';
import { delegate, holder } from './council';

// POLÍTICA DE AUDIÊNCIAS
// O rei decide que tipo de demanda recebe pessoalmente e qual vai direto a uma
// cadeira do conselho. O conselheiro resolve do jeito dele (ver council.delegate) e
// ganha poder com isso. Quanto mais o rei entrega um domínio, mais aquele homem
// governa aquela parte do reino.

export const CATEGORIES: Record<AudienceCategory, { name: string; icon: string; seat: CouncilSeatId; desc: string }> = {
  povo: { name: 'Povo comum', icon: 'povo', seat: 'guardiao', desc: 'Petições de camponeses, vilas, pontes, pão' },
  comercio: { name: 'Comerciantes', icon: 'moedas', seat: 'tesoureiro', desc: 'Guilda, mercadores, rotas, licenças' },
  nobres: { name: 'Nobres', icon: 'coroa', seat: 'chanceler', desc: 'Lordes, vassalos, damas e cavaleiros' },
  militar: { name: 'Questões militares', icon: 'espadas', seat: 'marechal', desc: 'Exército, guarnições, fronteira, segurança' },
  religiao: { name: 'Questões religiosas', icon: 'estrela', seat: 'guardiao', desc: 'Capela, fé dos Seren, curas e sermões' },
  diplomacia: { name: 'Diplomacia', icon: 'aperto', seat: 'chanceler', desc: 'Emissários, reinos estrangeiros, tratados' },
  financas: { name: 'Assuntos financeiros', icon: 'trigo', seat: 'tesoureiro', desc: 'Tesouro, dívidas, empréstimos, impostos' },
  justica: { name: 'Assuntos jurídicos', icon: 'pergaminho', seat: 'guardiao', desc: 'Julgamentos, disputas, crimes, leis' },
  urgencias: { name: 'Urgências', icon: 'selo', seat: 'marechal', desc: 'Sempre chegam ao rei' },
};
export const CATEGORY_IDS = Object.keys(CATEGORIES) as AudienceCategory[];

const BY_SPEAKER: Record<string, AudienceCategory> = {
  marta: 'povo', campones: 'povo', camponesa: 'povo', viuva: 'povo', tomas: 'povo', bruna: 'povo', salvio: 'povo',
  tobias: 'comercio', kasim: 'comercio',
  gaspard: 'nobres', brandt: 'nobres', aveline: 'nobres', otho: 'nobres', dama_brisamar: 'nobres', dama_carvalhal: 'nobres', morgana: 'nobres', florian: 'nobres', sir_osric: 'nobres', sir_bram: 'nobres', dama: 'nobres', lysandra: 'nobres', cedric: 'nobres',
  aurelian: 'militar', guarda: 'militar', cavaleiro: 'militar', sir_ferrao: 'militar', sir_picoalto: 'militar', mensageiro: 'militar',
  frei_aske: 'religiao', irma: 'religiao', hedda: 'religiao',
  haakon: 'diplomacia', ragnar: 'diplomacia',
  corvin: 'financas',
  aldric: 'justica', theodric: 'justica',
};

// Que tipo de demanda é esta (ou null: assunto pessoal, sempre do rei)
export function categoryOf(ev: GameEvent): AudienceCategory | null {
  if (ev.kind === 'urgente') return 'urgencias';
  if (['casamento', 'familia', 'noite', 'encontro', 'atividade', 'conversa', 'reuniao'].includes(ev.kind) || ev.domain === 'pessoal') return null;
  const id = ev.id;
  if (/julgamento|justica|galinha|nobre_ladrao|peticao_terras|duelo/.test(id)) return 'justica';
  if (/imposto|emprestimo|cobranca|divida|tesouro|moedas/.test(id)) return 'financas';
  if (/guilda|mercador|comercio|rota|especulador|venda/.test(id)) return 'comercio';
  if (/missa|frei|fe$|curandeira|peste|capela/.test(id)) return 'religiao';
  if (/embaixada|haakon|ragnar|tributo|paz_/.test(id)) return 'diplomacia';
  if (/exercito|recrutamento|espiao|front_|guarda|motim|milicia|bandidos/.test(id)) return 'militar';
  const bySpeaker = BY_SPEAKER[ev.speaker];
  if (bySpeaker) return bySpeaker;
  if (ev.domain === 'tesoureiro') return 'financas';
  if (ev.domain === 'marechal') return 'militar';
  if (ev.domain === 'guardiao') return 'povo';
  if (ev.domain === 'sussurros') return 'justica';
  return 'nobres';
}

export const policyOf = (s: GameState, c: AudienceCategory): PolicyTarget => (c === 'urgencias' ? 'rei' : s.audiencePolicy?.[c] ?? 'rei');

// Pode ir ao conselho? Histórias com dia marcado, desdobramentos pessoais e escolhas
// montadas na hora ficam com o rei.
function forwardable(ev: GameEvent) {
  return !ev.day && !ev.place && !ev.big && ev.nodes.start.choices.length > 0 && !ev.id.startsWith('casa_pedido_') && !ev.id.startsWith('conv_');
}

// Começo do dia: separa a fila entre o rei e o conselho
export function applyPolicy(s: GameState): number {
  let n = 0;
  for (const a of s.audiences) {
    if (a.done || a.fwd) continue;
    const ev = EVENT_MAP[a.eventId];
    if (!ev || !forwardable(ev)) continue;
    const cat = categoryOf(ev);
    if (!cat) continue;
    const target = policyOf(s, cat);
    if (target === 'rei') continue;
    a.fwd = target;
    n++;
  }
  return n;
}

// Encaminhados que ainda esperam decisão
export function pendingForwarded(s: GameState) {
  return s.audiences.filter((a) => a.fwd && !a.done).map((a) => ({ a, ev: EVENT_MAP[a.eventId], cat: categoryOf(EVENT_MAP[a.eventId]) ?? 'nobres' }));
}

// O rei puxa o assunto de volta: a pessoa passa a esperar no salão
export function pullBack(s: GameState, uid: number): boolean {
  const a = s.audiences.find((x) => x.uid === uid && x.fwd && !x.done);
  if (!a) return false;
  a.fwd = undefined;
  a.arrive = Math.max(8, Math.ceil(s.hour));
  return true;
}

// Fim do dia: cada cadeira decide o que recebeu
export function resolveForwarded(s: GameState, rng: () => number, entries: LogEntry[]) {
  const done: ForwardRecord[] = [];
  const bySeat = new Map<CouncilSeatId, number>();
  for (const { a, ev, cat } of pendingForwarded(s)) {
    if (!ev) { a.done = true; continue; }
    const seat = a.fwd!;
    const who = holder(s, seat);
    a.done = true;
    if (!who) {
      // cadeira vazia: ninguém decidiu, e isso também tem preço
      s.rel[ev.speaker] = clamp((s.rel[ev.speaker] ?? 0) - 5, -100, 100);
      done.push({ day: s.day, eventId: ev.id, topic: ev.topic, category: cat, seat, unresolved: true });
      continue;
    }
    const d = delegate(s, ev, rng, 'Encaminhado pelo rei', seat);
    done.push({ day: s.day, eventId: ev.id, topic: ev.topic, category: cat, seat, who, decision: d?.labels[d.labels.length - 1], summary: d?.summary, unresolved: !d });
    bySeat.set(seat, (bySeat.get(seat) ?? 0) + 1);
  }
  if (!done.length) return;
  s.forwarded = [...(s.forwarded ?? []).filter((r) => r.day >= s.day - 6), ...done];
  const resolved = done.filter((r) => !r.unresolved).length;
  entries.push({ icon: 'selo', title: 'O Conselho governou por você', text: `${resolved} assunto(s) decidido(s) sem o rei${done.length > resolved ? `; ${done.length - resolved} ficou(aram) sem ninguém para decidir` : ''}. ${[...bySeat].map(([k, n]) => `${char(holder(s, k)!).name}: ${n}`).join(' · ')}.`, tone: 'neutro' });
  for (const [seat, n] of bySeat) consequences(s, seat, n, entries);
}

// Consequências políticas de entregar um domínio
function consequences(s: GameState, seat: CouncilSeatId, n: number, entries: LogEntry[]) {
  const who = holder(s, seat);
  if (!who) return;
  s.tracks[`dom_${seat}`] = (s.tracks[`dom_${seat}`] ?? 0) + n;
  const total = s.tracks[`dom_${seat}`];
  // quem governa por você passa a ser procurado no seu lugar
  s.council.power[who] = clamp((s.council.power[who] ?? 0) + Math.ceil(n / 2), 0, 100);
  const b = bond(s, who);
  // leal: sente-se confiado; ambicioso ou ressentido: sente-se dono
  if (b.lealdade >= 55) addBond(s, who, { confianca: 1, lealdade: 1 });
  else addBond(s, who, { lealdade: -1 });
  // um conspirador usa a cadeira para preparar o dia
  if (s.conspiracy.members.includes(who)) s.conspiracy.prep[who] = (s.conspiracy.prep[who] ?? 0) + n;
  const marks = [8, 20, 40];
  const hit = marks.find((m) => total >= m && total - n < m);
  if (hit) {
    const name = char(who).name;
    const txt = hit === 8
      ? `Os pedidos de ${SEATS[seat].domain.toLowerCase()} já nem sobem ao salão. Vão direto a ${name}.`
      : hit === 20
        ? `Na cidade, dizem que quem manda em ${SEATS[seat].domain.toLowerCase()} é ${name}, não o rei.`
        : `${name} governa metade de ${SEATS[seat].domain.toLowerCase()} por você. As casas mandam presentes a ele, não à coroa.`;
    entries.push({ icon: SEATS[seat].icon, title: `${SEATS[seat].name}: poder demais?`, text: txt, tone: 'rumor' });
  }
}

// Resumo para a agenda
export function forwardedSummary(s: GameState) {
  const pend = pendingForwarded(s);
  const count = new Map<AudienceCategory, number>();
  for (const p of pend) count.set(p.cat, (count.get(p.cat) ?? 0) + 1);
  const yesterday = (s.forwarded ?? []).filter((r) => r.day === s.day - 1);
  return { pend, count, yesterday };
}
