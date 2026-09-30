import type { Choice, CouncilSeatId, DialogNode, GameEvent, GameState, HouseId, LogEntry, Resources } from '../types';
import { ADVISORS, SEATS, SEAT_IDS } from '../data/council';
import { HOUSE_IDS, HOUSES } from '../data/realm';
import { char } from '../data/characters';
import { applyEffect, clamp } from './core';
import { addBond, bond } from './bonds';
import { isAbsent } from './npcs';

// ======================= cadeiras =======================
export const holder = (s: GameState, seat: CouncilSeatId) => {
  const id = s.council.seats[seat];
  return id && !isAbsent(s, id) ? id : null;
};
export const seatOf = (s: GameState, id: string) => SEAT_IDS.find((k) => s.council.seats[k] === id) ?? null;

export function competence(id: string, seat: CouncilSeatId) {
  return ADVISORS[id]?.competence[seat] ?? 1;
}

export function powerLabel(v: number) {
  if (v >= 70) return 'indispensável';
  if (v >= 50) return 'muito influente';
  if (v >= 30) return 'respeitado';
  if (v >= 15) return 'ouvido';
  return 'decorativo';
}

// Nomear alguém: quem sai guarda mágoa, quem entra deve o cargo ao rei (por enquanto).
export function appoint(s: GameState, seat: CouncilSeatId, id: string): LogEntry {
  const prev = s.council.seats[seat];
  const other = seatOf(s, id);
  if (other) s.council.seats[other] = null;
  s.council.seats[seat] = id;
  if (prev && prev !== id) {
    addBond(s, prev, { ressentimento: 25, lealdade: -15, confianca: -10 });
    s.council.power[prev] = clamp((s.council.power[prev] ?? 0) - 12, 0, 100);
    s.rel[prev] = clamp((s.rel[prev] ?? 0) - 12, -100, 100);
  }
  addBond(s, id, { lealdade: 10, confianca: 6 });
  s.council.power[id] = clamp((s.council.power[id] ?? 0) + 10, 0, 100);
  const house = ADVISORS[id]?.house;
  if (house) for (const h of HOUSE_IDS) s.loyalty[h] = clamp(s.loyalty[h] + (h === house ? 8 : -2), -100, 100);
  const e: LogEntry = { icon: SEATS[seat].icon, title: `Novo ${SEATS[seat].name}`, text: `${char(id).name} recebe a ${SEATS[seat].key}.${prev && prev !== id ? ` ${char(prev).name} devolve a chave em silêncio.` : ''}${house ? ` A ${HOUSES[house].name} comemora; as outras casas anotam.` : ''}`, tone: 'lei' };
  s.log.push(e);
  return e;
}

export function dismiss(s: GameState, seat: CouncilSeatId): LogEntry | null {
  const prev = s.council.seats[seat];
  if (!prev) return null;
  s.council.seats[seat] = null;
  addBond(s, prev, { ressentimento: 30, lealdade: -20 });
  s.council.power[prev] = clamp((s.council.power[prev] ?? 0) - 15, 0, 100);
  s.rel[prev] = clamp((s.rel[prev] ?? 0) - 15, -100, 100);
  const e: LogEntry = { icon: 'selo', title: `${SEATS[seat].name} demitido`, text: `${char(prev).name} entrega a ${SEATS[seat].key}. A cadeira fica vazia, e ninguém governa essa parte do reino por você.`, tone: 'ruim' };
  s.log.push(e);
  return e;
}

// ======================= domínio de cada assunto =======================
const SPEAKER_DOMAIN: Record<string, CouncilSeatId | 'pessoal'> = {
  gaspard: 'chanceler', brandt: 'chanceler', aveline: 'chanceler', otho: 'chanceler', haakon: 'chanceler', ragnar: 'chanceler',
  dama_brisamar: 'chanceler', dama_carvalhal: 'chanceler', morgana: 'chanceler', lysandra: 'sussurros', florian: 'chanceler', cedric: 'chanceler',
  tobias: 'tesoureiro', corvin: 'tesoureiro', kasim: 'tesoureiro', bruna: 'tesoureiro',
  aurelian: 'marechal', guarda: 'marechal', cavaleiro: 'marechal', sir_ferrao: 'marechal', sir_picoalto: 'marechal', sir_osric: 'marechal', sir_bram: 'marechal', mensageiro: 'marechal',
  sombra: 'sussurros', dama: 'sussurros',
  marta: 'guardiao', campones: 'guardiao', camponesa: 'guardiao', viuva: 'guardiao', tomas: 'guardiao', irma: 'guardiao', frei_aske: 'guardiao', salvio: 'guardiao', theodric: 'guardiao',
  isabelle: 'pessoal', lucas: 'pessoal', elenora: 'pessoal', rhoswen: 'pessoal', isolde: 'pessoal', sigrid: 'pessoal', clara: 'pessoal', bianca: 'pessoal', pimenta: 'pessoal', aldric: 'chanceler',
};

export function domainOf(ev: GameEvent): CouncilSeatId | 'pessoal' {
  if (ev.domain) return ev.domain;
  if (['casamento', 'familia', 'noite', 'encontro', 'atividade', 'conversa'].includes(ev.kind)) return 'pessoal';
  if (ev.council) return ev.council.lead;
  return SPEAKER_DOMAIN[ev.speaker] ?? 'chanceler';
}

// ======================= delegação =======================
// O conselheiro escolhe como ele mesmo escolheria: simula cada saída numa cópia
// do reino e fica com a que mais combina com o que ele valoriza.
interface Pick { path: Choice[]; score: number }

function score(before: GameState, after: GameState, id: string): number {
  const p = ADVISORS[id];
  const cares = p?.cares ?? { prestigio: 0.5, povo: 0.5, ouro: 0.02 };
  let v = 0;
  for (const k of ['ouro', 'influencia', 'prestigio', 'povo', 'exercito', 'moral'] as (keyof Resources)[])
    v += (cares[k] ?? 0) * (after.res[k] - before.res[k]);
  const houseDelta = (h: HouseId) => after.loyalty[h] - before.loyalty[h];
  if (p?.house) v += (cares.house ?? 1) * houseDelta(p.house);
  // estabilidade geral: ninguém gosta de casas furiosas
  v += HOUSE_IDS.reduce((a, h) => a + houseDelta(h), 0) * 0.15;
  // quem se importa com o rei evita humilhá-lo
  v += (cares.king ?? 0) * (after.res.prestigio - before.res.prestigio) * 0.5;
  // e ninguém quer ser o responsável por uma guerra
  if (!before.war && after.war) v -= 25;
  // ambição: quem quer subir escolhe o que dá influência e poder a si mesmo
  v += (p?.ambition ?? 30) / 100 * ((after.council.power[id] ?? 0) - (before.council.power[id] ?? 0)) * 2;
  // relação com o rei: quem o ama protege o prestígio dele; quem o ressente, nem tanto
  const b = before.bonds[id];
  if (b) v += ((b.lealdade - 50) / 50) * (after.res.prestigio - before.res.prestigio) * 0.6;
  // quem já pertence ao Pacto prefere o que deixa o rei mais fraco
  if (before.conspiracy.members.includes(id)) v -= (after.res.prestigio - before.res.prestigio) * 0.8 + (after.res.povo - before.res.povo) * 0.3;
  return v;
}

function bestPath(s: GameState, ev: GameEvent, node: DialogNode, id: string, depth: number, rng: () => number): Pick | null {
  const seat = seatOf(s, id);
  const comp = seat ? competence(id, seat) : 1;
  const viable = node.choices.filter((c) => (!c.req || reqOk(s, c)) && !c.outburst);
  if (!viable.length) return null;
  const picks: Pick[] = [];
  for (const c of viable) {
    const clone = structuredClone(s) as GameState;
    clone.log = [];
    try { applyEffect(clone, c.effects); } catch { continue; } // saída que não faz sentido fora do contexto dela
    let path = [c];
    let sc = score(s, clone, id);
    if (c.goto && depth < 3 && ev.nodes[c.goto]) {
      const next = bestPath(clone, ev, ev.nodes[c.goto], id, depth + 1, rng);
      if (next) { path = [c, ...next.path]; sc += next.score; }
    }
    picks.push({ path, score: sc });
  }
  picks.sort((a, b) => b.score - a.score);
  // conselheiro pouco competente às vezes erra feio
  if (rng() < (5 - comp) * 0.11) return picks[Math.floor(rng() * picks.length)];
  return picks[0];
}

function reqOk(s: GameState, c: Choice) {
  const r = c.req!;
  if (r.ouro && s.res.ouro < r.ouro) return false;
  if (r.influencia && s.res.influencia < r.influencia) return false;
  if (r.test) return r.test(s);
  if (r.knowledge || r.attr || r.mood) return false; // conhecimento e humor são do rei, não do conselheiro
  return true;
}

export interface Delegation { who: string; seat: CouncilSeatId; labels: string[]; summary: string }

export function delegate(s: GameState, ev: GameEvent, rng: () => number, why = 'O rei não recebeu', seatOverride?: CouncilSeatId): Delegation | null {
  const dom = seatOverride ?? domainOf(ev);
  if (dom === 'pessoal') return null;
  const who = holder(s, dom);
  if (!who) return null;
  const pick = bestPath(s, ev, ev.nodes.start, who, 0, rng);
  if (!pick) return null;
  const before = structuredClone({ res: s.res, loyalty: s.loyalty });
  const origin = { day: s.day, event: ev.topic, decision: `${SEATS[dom].name}: ${pick.path[pick.path.length - 1].label}` };
  try { for (const c of pick.path) applyEffect(s, c.effects, { origin }); } catch { return null; }
  s.council.power[who] = clamp((s.council.power[who] ?? 0) + 3, 0, 100);
  s.council.delegated[who] = (s.council.delegated[who] ?? 0) + 1;
  // Quem veio falar com o rei foi atendido por outro. Nota-se.
  if (ev.speaker !== who) s.rel[ev.speaker] = clamp((s.rel[ev.speaker] ?? 0) - 3, -100, 100);
  const summary = deltaText(before, s);
  const labels = pick.path.map((c) => c.label);
  s.log.push({ icon: SEATS[dom].icon, title: `Resolvido pelo Conselho: ${ev.topic}`, text: `${why}. ${char(who).name} (${SEATS[dom].name}) decidiu: "${labels[labels.length - 1]}".`, delta: summary, tone: 'neutro' });
  return { who, seat: dom, labels, summary };
}

function deltaText(before: { res: Resources; loyalty: Record<HouseId, number> }, s: GameState) {
  const parts: string[] = [];
  const names: Partial<Record<keyof Resources, string>> = { ouro: 'ouro', povo: 'povo', prestigio: 'prestígio', influencia: 'influência', moral: 'moral', exercito: 'soldados' };
  for (const k of Object.keys(names) as (keyof Resources)[]) {
    const d = s.res[k] - before.res[k];
    if (d) parts.push(`${d > 0 ? '+' : ''}${d} ${names[k]}`);
  }
  for (const h of HOUSE_IDS) {
    const d = s.loyalty[h] - before.loyalty[h];
    if (d) parts.push(`${d > 0 ? '+' : ''}${d} ${HOUSES[h].name.replace('Casa ', '')}`);
  }
  return parts.slice(0, 4).join(' · ');
}

// ======================= reuniões =======================
// Escolher a posição de um conselheiro: ele ganha confiança; os vencidos lembram.
export function recordVote(s: GameState, ev: GameEvent, chosen: CouncilSeatId | null) {
  if (!ev.council) return;
  for (const seat of Object.keys(ev.council.positions) as CouncilSeatId[]) {
    const who = holder(s, seat);
    if (!who) continue;
    if (seat === chosen) {
      addBond(s, who, { confianca: 6, lealdade: 2 });
      s.council.power[who] = clamp((s.council.power[who] ?? 0) + 2, 0, 100);
    } else {
      addBond(s, who, { ressentimento: 3 });
      s.council.ignored[who] = (s.council.ignored[who] ?? 0) + 1;
      // quem é contrariado muitas vezes deixa de ser leal
      if ((s.council.ignored[who] ?? 0) % 4 === 0) addBond(s, who, { lealdade: -6, ressentimento: 6 });
    }
  }
  // o rei que governa pessoalmente tira poder de quem governava por ele
  for (const id of Object.values(s.council.seats)) if (id) s.council.power[id] = clamp((s.council.power[id] ?? 0) - 1, 0, 100);
  s.council.decided.push(ev.id);
  s.council.lastMeeting = s.day;
}

// Sem o rei, a mesa decide pela cadeira que lidera o assunto (ou pela mais poderosa).
export function councilDecidesAlone(s: GameState, ev: GameEvent): LogEntry | null {
  if (!ev.council) return null;
  const seats = Object.keys(ev.council.positions) as CouncilSeatId[];
  const lead = holder(s, ev.council.lead) ? ev.council.lead
    : seats.filter((k) => holder(s, k)).sort((a, b) => (s.council.power[holder(s, b)!] ?? 0) - (s.council.power[holder(s, a)!] ?? 0))[0];
  s.council.decided.push(ev.id);
  if (!lead) {
    const e: LogEntry = { icon: 'selo', title: `Conselho vazio: ${ev.topic}`, text: 'Ninguém compareceu para decidir. O assunto apodreceu na mesa.', tone: 'ruim' };
    applyEffect(s, { res: { prestigio: -3 } });
    s.log.push(e);
    return e;
  }
  const who = holder(s, lead)!;
  const pos = ev.council.positions[lead]!;
  const before = structuredClone({ res: s.res, loyalty: s.loyalty });
  applyEffect(s, pos.choice.effects, { origin: { day: s.day, event: ev.topic, decision: `Conselho sem o rei: ${pos.choice.label}` } });
  s.council.power[who] = clamp((s.council.power[who] ?? 0) + 5, 0, 100);
  s.council.delegated[who] = (s.council.delegated[who] ?? 0) + 1;
  const e: LogEntry = { icon: SEATS[lead].icon, title: `O Conselho decidiu sem o rei: ${ev.topic}`, text: `A cadeira do rei ficou vazia. ${char(who).name} conduziu a reunião e decidiu: "${pos.choice.label}".`, delta: deltaText(before, s), tone: 'neutro' };
  s.log.push(e);
  return e;
}

// Posições da mesa viram escolhas com o rosto de quem as defende
export function councilChoices(s: GameState, ev: GameEvent): Choice[] {
  if (!ev.council) return [];
  const out: Choice[] = [];
  for (const seat of SEAT_IDS) {
    const pos = ev.council.positions[seat];
    const who = holder(s, seat);
    if (!pos || !who) continue;
    out.push({ ...pos.choice, who, seat, sub: `${SEATS[seat].name} · ${pos.choice.sub}` });
  }
  return out;
}

// Quanto um conselheiro "manda" de fato: usado para rotear pedidos antes do rei
export function captures(s: GameState, ev: GameEvent, rng: () => number): boolean {
  const dom = domainOf(ev);
  if (dom === 'pessoal' || ev.kind === 'urgente' || ev.day || ev.followup) return false;
  const who = holder(s, dom);
  if (!who) return false;
  const p = s.council.power[who] ?? 0;
  return p >= 55 && rng() < (p - 45) / 110;
}

export function bondOf(s: GameState, id: string) {
  return bond(s, id);
}
