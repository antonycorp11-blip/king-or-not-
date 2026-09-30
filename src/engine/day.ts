import type { Audience, DecisionOrigin, GameEvent, GameState, LogEntry, Resources } from '../types';
import { AUDIENCE_KINDS, EVENTS, EVENT_MAP } from '../data/events';
import { HOUSE_IDS, HOUSES, PROVINCES, GOODS } from '../data/realm';
import { char } from '../data/characters';
import { ACT_END, DAY_END, DAY_START, MARRIAGE_DEADLINE, applyEffect, clamp, governabilidade, hasSkill, influenceGain, rand, save } from './core';
import { enemyLabel, warEndOfDay } from './war';
import { armyDaily } from './army';
import { demobilize } from './campaign';
import { deliverLetters } from './letters';
import { checkRebellions } from '../data/events/crisis';
import { companion } from '../data/companions';
import { computeEconomy, marketDaily, taxKey, tradeDaily, treasurerRoutes } from './economy';
import { holder } from './council';
import { buildAgenda, placeAppointment, reminders, tickAgenda } from './agenda';
import { captures, delegate } from './council';
import { conspiracyDaily, trackOf } from './conspiracy';
import { applyMood, moodHours, moodLabel, moodSleep, MOOD_NAMES } from './mood';
import { bond } from './bonds';
import { worldPoint } from '../data/castle';
import { housesDaily } from './houses';
import { applyPolicy, resolveForwarded } from './policy';

// Avisos que a interface mostra assim que o tempo passa (compromissos perdidos etc.)
export const notices: LogEntry[] = [];

export const WAKE_HOUR = DAY_START - 0.5;

export function eventOf(a: Audience): GameEvent {
  return EVENT_MAP[a.eventId];
}

function eligible(s: GameState, ev: GameEvent): boolean {
  if (ev.minDay && s.day < ev.minDay) return false;
  if (ev.maxDay && s.day > ev.maxDay) return false;
  const last = s.seen[ev.id];
  if (last !== undefined && (!ev.repeat || s.day - last < ev.repeat)) return false;
  if (s.audiences.some((a) => a.eventId === ev.id && !a.done)) return false;
  return ev.cond ? ev.cond(s) : true;
}

function addAudience(s: GameState, ev: GameEvent, arrive = DAY_START, origin?: DecisionOrigin) {
  // encontro marcado: vale só para hoje, no lugar e na hora combinados
  const placed = !!ev.place;
  s.audiences.push({ uid: s.nextUid++, eventId: ev.id, expires: placed ? s.day : s.day + (ev.lasts ?? 1) - 1, done: false, arrive: placed ? ev.place!.hour : arrive, origin: origin ?? (ev.cause ? s.flagOrigins?.[ev.cause] : undefined) });
  s.seen[ev.id] = s.day;
}

// Encontros combinados para hoje mesmo (numa conversa, "às 17h no jardim")
export function placeDue(s: GameState) {
  const due = s.scheduled.filter((x) => x.day <= s.day && EVENT_MAP[x.id]?.place);
  if (!due.length) return;
  s.scheduled = s.scheduled.filter((x) => !due.includes(x));
  for (const d of due) {
    const ev = EVENT_MAP[d.id];
    if (!ev || (ev.cond && !ev.cond(s)) || s.audiences.some((a) => a.eventId === ev.id && !a.done)) continue;
    if (ev.place!.hour + (ev.place!.duration ?? 1) <= s.hour) { s.scheduled.push({ ...d, day: s.day + 1 }); continue; } // já passou da hora: fica para amanhã
    addAudience(s, ev, DAY_START, d.origin);
    placeAppointment(s, s.audiences[s.audiences.length - 1]);
  }
}

// Coloca alguém na fila de audiências (usado por convocações e pelas noites)
export function pushAudience(s: GameState, eventId: string, arrive: number) {
  const ev = EVENT_MAP[eventId];
  if (!ev || s.audiences.some((a) => a.eventId === eventId && !a.done)) return;
  addAudience(s, ev, arrive);
}

// Noite: às vezes alguém aborda o rei quando ele encerra o dia
export function pickNight(s: GameState, wake?: boolean): GameEvent | null {
  if (rand(s) > 0.5) return null;
  const pool = EVENTS.filter((e) => e.kind === 'noite' && e.weight && (wake === undefined || !!e.wake === wake) && eligible(s, e));
  if (!pool.length) return null;
  const total = pool.reduce((a, e) => a + e.weight!, 0);
  let r = rand(s) * total;
  return pool.find((e) => (r -= e.weight!) <= 0) ?? pool[0];
}

export function startDay(s: GameState) {
  // O rei acorda no quarto, antes de a corte abrir as portas.
  s.hour = WAKE_HOUR;
  s.log = [];
  const [kx, ky] = worldPoint('quarto', 'porta');
  s.castle = { ...s.castle, room: 'quarto', x: kx, y: ky - 70, seated: false, visitedToday: ['quarto'], world: true };
  s.activitiesToday = [];
  s.dayStart = { res: { ...s.res }, loyalty: { ...s.loyalty } };
  s.audiences = s.audiences.filter((a) => !a.done && a.expires >= s.day);
  for (const a of s.audiences) a.arrive = DAY_START; // quem voltou já espera desde cedo

  // eventos agendados por decisões anteriores
  const due = s.scheduled.filter((x) => x.day <= s.day);
  s.scheduled = s.scheduled.filter((x) => x.day > s.day);
  for (const d of due) {
    const ev = EVENT_MAP[d.id];
    if (ev?.kind === 'reuniao') { if (!s.council.queue.includes(ev.id)) s.council.queue.push(ev.id); continue; }
    if (ev && (!ev.cond || ev.cond(s)) && !s.audiences.some((a) => a.eventId === ev.id)) addAudience(s, ev, DAY_START, d.origin);
  }
  // roteiro do dia
  for (const ev of EVENTS) if (ev.day === s.day && (AUDIENCE_KINDS.includes(ev.kind) || ev.place) && eligible(s, ev)) addAudience(s, ev);

  deliverLetters(s);

  // Desdobramentos vêm primeiro, para decisões antigas não se perderem no sorteio.
  const followups = EVENTS.filter((e) => e.followup && (AUDIENCE_KINDS.includes(e.kind) || !!e.place) && eligible(s, e))
    .sort((a, b) => (s.flagOrigins?.[a.cause ?? '']?.day ?? 0) - (s.flagOrigins?.[b.cause ?? '']?.day ?? 0));
  for (const ev of followups.slice(0, 2)) addAudience(s, ev, DAY_START);

  // A fila deve dar escolhas, não virar uma segunda lista de tarefas. Os
  // pedidos importantes e os desdobramentos de decisões antigas entram
  // primeiro; as rotinas completam só o espaço que sobrar.
  const target = s.day === 1 ? 6 : s.day <= 3 ? 8 : 10;
  const importantSpeakers = new Set(['gaspard', 'brandt', 'aveline', 'otho', 'aldric', 'corvin', 'theodric', 'aurelian', 'isabelle', 'rhoswen', 'isolde', 'sigrid', 'haakon', 'lucas']);
  const audienceWeight = (e: GameEvent) => {
    let m = 1;
    if (e.kind === 'urgente') m *= 3;
    else if (e.kind === 'conselho' || e.kind === 'casamento' || e.kind === 'familia') m *= 2;
    if (importantSpeakers.has(e.speaker)) m *= 1.8;
    if (e.id.startsWith('rotina_')) m *= 0.45;
    return (e.weight ?? 1) * m;
  };
  let guard = 0;
  while (s.audiences.length < target && guard++ < 40) {
    const pool = EVENTS.filter((e) => e.weight && !e.followup && AUDIENCE_KINDS.includes(e.kind) && eligible(s, e));
    if (!pool.length) break;
    const total = pool.reduce((a, e) => a + audienceWeight(e), 0);
    let r = rand(s) * total;
    const pick = pool.find((e) => (r -= audienceWeight(e)) <= 0) ?? pool[pool.length - 1];
    // as demandas chegam ao longo do dia; urgentes e as primeiras chegam cedo
    const early = s.audiences.length < 2 || pick.kind === 'urgente';
    addAudience(s, pick, early ? DAY_START : 9 + Math.floor(rand(s) * 8));
  }
  // Conselheiros muito poderosos atendem pedidos antes que cheguem ao rei.
  for (const a of s.audiences) {
    const ev = eventOf(a);
    if (a.done || ev.place || !captures(s, ev, () => rand(s))) continue;
    if (delegate(s, ev, () => rand(s), 'Chegou ao conselheiro antes de chegar ao rei')) a.done = true;
  }
  // A política de audiências: o que o rei não quer receber vai direto ao conselho
  applyPolicy(s);
  // urgentes primeiro
  s.audiences.sort((a, b) => Number(eventOf(b).kind === 'urgente') - Number(eventOf(a).kind === 'urgente'));
  buildAgenda(s, () => rand(s));
  save(s);
}

// Quem está na fila do salão (acontecimentos pelo castelo não entram na fila)
export function visibleAudiences(s: GameState) {
  return s.audiences.filter((a) => !a.done && !a.fwd && (a.arrive ?? DAY_START) <= s.hour && isQueued(eventOf(a)));
}

export const isQueued = (ev: GameEvent | undefined) => !!ev && !ev.place && (AUDIENCE_KINDS.includes(ev.kind) || ev.kind === 'noite');

// Grandes acontecimentos que ainda vão chegar (dia fixo), dos mais próximos aos mais distantes
export function upcomingBig(s: GameState, within = 5): { ev: GameEvent; day: number }[] {
  return EVENTS.filter((e) => e.big && e.day && e.day > s.day && e.day - s.day <= within && (!e.cond || e.cond(s)) && s.seen[e.id] === undefined)
    .map((e) => ({ ev: e, day: e.day! })).sort((a, b) => a.day - b.day);
}

export function currentObjective(s: GameState): { title: string; text: string } {
  if (s.war && !s.war.result) return { title: 'Vencer a guerra', text: `Contra ${enemyLabel(s.war.enemy)} · turno ${s.war.turn}` };
  if (!s.spouse && !s.flags.noiva) return { title: 'Escolher uma rainha', text: `O conselho exige um casamento até o Dia ${MARRIAGE_DEADLINE}` };
  if (!s.spouse && s.flags.noiva) return { title: 'O casamento real', text: `Cerimônia no Dia ${MARRIAGE_DEADLINE}` };
  if (s.day < 22) return { title: 'Consolidar o reino', text: 'O norte está quieto demais...' };
  if (s.day <= 30) return { title: 'Sobreviver ao primeiro mês', text: 'O inverno se aproxima...' };
  return { title: 'O primeiro inverno', text: `Fim do Ato II no Dia ${ACT_END}` };
}

export function canSpend(s: GameState, hours: number) {
  return s.hour + hours <= DAY_END;
}

// O tempo passa: cansa o rei e faz a agenda andar. Retorna o que aconteceu enquanto isso.
export function spendHours(s: GameState, hours: number, activity: 'trabalho' | 'andar' | 'descanso' = 'trabalho') {
  s.hour = Math.min(DAY_END, s.hour + hours);
  moodHours(s, hours, activity);
  const missed = tickAgenda(s);
  s.log.push(...missed);
  notices.push(...missed);
  placeDue(s);
  notices.push(...reminders(s));
  return missed;
}

const RES_META: Record<keyof Resources, { icon: string; title: string }> = {
  ouro: { icon: 'moedas', title: 'Tesouro Real' },
  influencia: { icon: 'flor', title: 'Influência' },
  prestigio: { icon: 'coroa', title: 'Prestígio' },
  povo: { icon: 'povo', title: 'Apoio do Povo' },
  exercito: { icon: 'espadas', title: 'Exército Real' },
  moral: { icon: 'escudo', title: 'Moral das Tropas' },
};

function signed(n: number) {
  return (n > 0 ? '+' : '') + n;
}

// Fecha o dia: demandas ignoradas, economia, povo, exército e o resumo.
export function endDay(s: GameState): LogEntry[] {
  const entries: LogEntry[] = [];

  // 0. O que foi encaminhado ao conselho é decidido agora
  resolveForwarded(s, () => rand(s), entries);

  // 1. Demandas não atendidas
  const pending: Audience[] = [];
  for (const a of s.audiences) {
    if (a.done) continue;
    const ev = eventOf(a);
    if (!isQueued(ev)) { a.done = true; continue; } // conversa ou atividade interrompida
    if (a.expires > s.day) {
      pending.push(a);
      continue;
    }
    a.done = true;
    // Quando o rei não governa, alguém governa por ele.
    const d = delegate(s, ev, () => rand(s));
    if (d) continue;
    const origin = { day: s.day, event: ev.topic, decision: 'Audiência ignorada' };
    s.flags[`ignored_${ev.id}`] = true;
    (s.flagOrigins ??= {})[`ignored_${ev.id}`] = origin;
    if (ev.ignored) {
      applyEffect(s, ev.ignored, { ignoredMode: true, origin });
      entries.push({ icon: 'selo', title: `Ignorado: ${ev.topic}`, text: ev.ignored.text, tone: 'ruim' });
    } else {
      // toda demanda ignorada tem algum custo, mesmo que pequeno
      const who = char(ev.speaker);
      applyEffect(s, { rel: { [ev.speaker]: -6 } }, { ignoredMode: true, origin });
      entries.push({ icon: 'selo', title: `Ignorado: ${ev.topic}`, text: `${who.name} esperou em vão pela sua atenção.`, delta: '−6', tone: 'ruim' });
    }
  }

  // 1b. Compromissos que ficaram para trás
  const hour = s.hour;
  s.hour = 24;
  tickAgenda(s);
  s.hour = hour;

  // 2. Guerra: o inimigo age se você não comandou hoje; em paz, o acampamento do exército
  warEndOfDay(s, entries);
  demobilize(s, entries);
  armyDaily(s, entries);

  // 3. Economia
  const eco = computeEconomy(s);
  s.res.ouro += eco.net;
  entries.push({ icon: 'moedas', title: 'Renda Provincial', text: `Impostos ${eco.taxTotal}, tarifas ${eco.tradeTotal}${eco.cuts ? `, parte de ${eco.cutWho.join(' e ')} −${eco.cuts}` : ''}, caravanas −${eco.caravans}, soldo do exército −${eco.upkeep}.`, delta: signed(eco.net), tone: eco.net >= 0 ? 'bom' : 'ruim' });
  // celeiro real
  s.granary = Math.max(0, (s.granary ?? 0) + eco.stored - eco.granaryDraw);
  if (eco.granaryDraw) entries.push({ icon: 'trigo', title: 'Celeiro real', text: `${eco.granaryDraw} sacas saíram do celeiro para matar a fome. Restam ${s.granary}.`, tone: 'neutro' });
  if (s.day === 32 && (s.granary ?? 0) >= 20) s.flags.invernoPrevisto = true;
  marketDaily(s, eco, () => rand(s), entries);
  tradeDaily(s, () => rand(s), entries);
  treasurerRoutes(s, holder(s, 'tesoureiro'), entries);

  if (s.res.ouro < 0) {
    const loss = hasSkill(s, 'comandante') ? 5 : 10;
    s.res.moral = clamp(s.res.moral - loss, 0, 100);
    entries.push({ icon: 'escudo', title: 'Soldo atrasado', text: 'O tesouro está em dívida. Os soldados não foram pagos e murmuram nos quartéis.', delta: `−${loss} moral`, tone: 'ruim' });
    if (!s.flags.motimAgendado && s.res.moral < 35) {
      s.flags.motimAgendado = true;
      s.scheduled.push({ id: 'motim_quartel', day: s.day + 1 });
    }
  } else if (s.res.moral < 70) {
    s.res.moral = clamp(s.res.moral + 1, 0, 100);
  }

  // 3. Escassez nas províncias
  const hurt = new Set<string>();
  for (const sh of eco.shortages) {
    if (hasSkill(s, 'celeiros') && s.day % 2 === 1) break;
    const key = taxKey(sh.province);
    if (hurt.has(sh.province)) continue;
    hurt.add(sh.province);
    if (key === 'coroa') s.res.povo = clamp(s.res.povo - 2, 0, 100);
    else s.loyalty[key] = clamp(s.loyalty[key] - 1, -100, 100);
  }
  if (hurt.size) {
    const names = [...hurt].map((p) => PROVINCES[p as keyof typeof PROVINCES].name).join(', ');
    const goods = [...new Set(eco.shortages.map((x) => GOODS[x.good].name.toLowerCase()))].join(', ');
    entries.push({ icon: 'trigo', title: 'Escassez', text: `Faltam ${goods} em ${names}. O descontentamento cresce. Em Províncias, abra a ficha e use "Trazer de…" para criar uma rota.`, tone: 'ruim' });
  }
  // rotas comerciais agradam quem vende
  for (const h of HOUSE_IDS) {
    const sells = eco.routes.some((r) => r.amount > 0 && PROVINCES[r.route.from].house === h);
    if (sells && s.loyalty[h] < 40) s.loyalty[h] += 1;
  }

  // 4. Impostos e o povo comum
  if (s.taxes.coroa === 'alto') s.res.povo = clamp(s.res.povo - 2, 0, 100);
  if (s.taxes.coroa === 'baixo') s.res.povo = clamp(s.res.povo + 1, 0, 100);
  for (const h of HOUSE_IDS) {
    if (s.taxes[h] === 'alto') s.loyalty[h] = clamp(s.loyalty[h] - 2, -100, 100);
    if (s.taxes[h] === 'baixo') s.loyalty[h] = clamp(s.loyalty[h] + 1, -100, 100);
  }

  // 5b. Habilidades de carisma
  if (hasSkill(s, 'amado')) s.res.povo = clamp(s.res.povo + 1, 0, 100);
  if (hasSkill(s, 'lenda')) s.res.prestigio = clamp(s.res.prestigio + 1, 0, 100);
  if (hasSkill(s, 'coracaoleao')) s.res.moral = clamp(s.res.moral + 1, 0, 100);

  // 5a. Quem ficou ao lado do trono
  const comp = companion(s);
  if (comp) {
    applyEffect(s, { ...comp.daily, rel: { [comp.id]: 2 } });
    entries.push({ icon: 'coroa', title: `Ao seu lado: ${char(comp.id).name}`, text: `${comp.role} passou o dia junto ao trono. ${comp.bonus}.`, tone: 'neutro' });
  }

  // 5. Governabilidade gera Influência
  const gov = governabilidade(s);
  const gain = influenceGain(s);
  s.res.influencia += gain;
  entries.push({ icon: 'flor', title: 'Governabilidade', text: `O reino está ${govLabel2(gov)} (${gov}). Sua autoridade rendeu Influência.`, delta: `+${gain}`, tone: gov >= 35 ? 'bom' : 'ruim' });
  if (gov < 25 && !s.flags.tumultoAgendado) {
    s.flags.tumultoAgendado = true;
    s.scheduled.push({ id: 'tumulto_praca', day: s.day + 1 });
  }

  // 6. Diferenças do dia (casas e recursos)
  if (s.dayStart) {
    for (const h of HOUSE_IDS) {
      const d = s.loyalty[h] - s.dayStart.loyalty[h];
      if (Math.abs(d) >= 3)
        entries.push({ icon: HOUSES[h].sigil, title: HOUSES[h].name, text: d > 0 ? `A relação com a ${HOUSES[h].name} melhorou.` : `A ${HOUSES[h].name} não está de acordo com suas decisões.`, delta: signed(d), tone: d > 0 ? 'bom' : 'ruim' });
    }
    for (const k of ['prestigio', 'povo', 'exercito'] as (keyof Resources)[]) {
      const d = s.res[k] - s.dayStart.res[k];
      if (d !== 0 && Math.abs(d) >= (k === 'exercito' ? 50 : 2))
        entries.push({ icon: RES_META[k].icon, title: RES_META[k].title, text: d > 0 ? 'Suas decisões fortaleceram a coroa.' : 'Suas decisões custaram caro.', delta: signed(d), tone: d > 0 ? 'bom' : 'ruim' });
    }
  }

  // 7. Registros das decisões do dia (leis, rumores, conquistas)
  entries.push(...s.log);

  if (pending.length)
    entries.push({ icon: 'pergaminho', title: 'Pedidos Pendentes', text: `${pending.length} solicitação(ões) ainda aguardam sua decisão.`, delta: String(pending.length), tone: 'neutro' });

  // 8. Lembrete do conselho sobre o casamento
  const left = MARRIAGE_DEADLINE - s.day;
  if (!s.spouse && !s.flags.noiva && [17, 13, 9, 5, 3, 2, 1].includes(left))
    entries.push({ icon: 'ampulheta', title: 'O conselho lembra', text: `O Chanceler Aldric deixa um bilhete: "Faltam ${left} dia(s) para o prazo do casamento, Majestade."`, tone: 'neutro' });

  // 9. O que vem por aí: os grandes dias são anunciados com antecedência
  for (const b of upcomingBig(s, 3)) {
    const d = b.day - (s.day + 1);
    const line = b.ev.big!.teaser[Math.max(0, b.ev.big!.teaser.length - 1 - d)];
    entries.push({ icon: 'estrela', title: d === 0 ? `Amanhã: ${b.ev.big!.title}` : `Em ${d + 1} dias: ${b.ev.big!.title}`, text: line, tone: 'rumor' });
  }
  // 9b. Rumores para o dia seguinte
  const rumor = pickRumor(s);
  if (rumor) entries.push(rumor);

  // 8b. O Pacto se move no escuro; a casa da rainha avança sua trilha
  conspiracyDaily(s, () => rand(s), entries);
  if (s.spouse && s.day >= 21) s.tracks[trackOf(s.spouse)] = (s.tracks[trackOf(s.spouse)] ?? 0) + 1;

  // 8c. O dia pesa no rei: humor antes de dormir
  if (s.dayStart) {
    const dp = s.res.prestigio - s.dayStart.res.prestigio;
    const dv = s.res.povo - s.dayStart.res.povo;
    applyMood(s, { joy: Math.round((dp + dv) / 2), stress: dp < -4 || dv < -4 ? 6 : 0 });
  }
  const mood = moodLabel(s);
  if (mood !== 'sereno') entries.push({ icon: 'coracao', title: 'O rei vai dormir ' + MOOD_NAMES[mood], text: s.mood.memo.filter((m) => m.day === s.day).map((m) => m.text).slice(-2).join('. ') || 'O dia deixou marcas.', tone: ['satisfeito', 'esperancoso'].includes(mood) ? 'bom' : 'neutro' });
  const baseline = (gov - 50) / 2 + (s.spouse ? (bond(s, s.spouse).amor - 50) / 4 : 0);
  moodSleep(s, baseline, s.mood.stress > 70);

  // 8d. As casas reagem: exigências, ressentimento, tropas próprias e ciúmes
  housesDaily(s, entries);

  // 9. Casas furiosas se rebelam; fim de jogo?
  checkRebellions(s);
  checkEnd(s);

  s.history.push({ day: s.day, entries });
  s.day++;
  if (!s.ended && s.day > ACT_END) {
    s.ended = { kind: 'fimAto', title: 'Fim do Ato II', text: epilogue(s) };
  }
  if (!s.ended) startDay(s);
  else save(s);
  return entries;
}

function govLabel2(g: number) {
  if (g >= 75) return 'firme';
  if (g >= 55) return 'estável';
  if (g >= 35) return 'frágil';
  if (g >= 20) return 'instável';
  return 'à beira do colapso';
}

function pickRumor(s: GameState): LogEntry | null {
  const upcoming = s.scheduled.filter((x) => x.day === s.day + 1).map((x) => EVENT_MAP[x.id]).filter(Boolean);
  const hidden = upcoming.find((e) => e.kind === 'urgente' || e.kind === 'conselho');
  if (hidden && (hasSkill(s, 'espioes') || rand(s) < 0.5)) {
    return { icon: 'mascara', title: 'Rumor', text: `Dizem nos corredores que ${char(hidden.speaker).name} virá amanhã tratar de: ${hidden.topic.toLowerCase()}.`, tone: 'rumor' };
  }
  if (s.loyalty.montclair < 0 && !s.flags.conspiracaoRevelada && rand(s) < 0.35)
    return { icon: 'mascara', title: 'Rumor', text: 'Há movimentações suspeitas na Casa Montclair. Mais informações chegarão em breve.', tone: 'rumor' };
  return null;
}

function checkEnd(s: GameState) {
  if (s.res.povo <= 0)
    s.ended = { kind: 'derrota', title: 'A Revolta do Pão', text: 'O povo comum invadiu os portões do castelo. Sem o apoio das ruas, nenhuma coroa se sustenta. Seu reinado terminou em chamas e gritos.' };
  else if (s.res.prestigio <= 0)
    s.ended = { kind: 'derrota', title: 'Deposto pelo Conselho', text: 'Os lordes e o pequeno conselho declararam o jovem rei incapaz de governar. Você foi enviado a um mosteiro distante.' };
  else if (s.res.moral <= 0)
    s.ended = { kind: 'derrota', title: 'O Golpe da Guarda', text: 'Sem soldo e sem esperança, a guarda real abriu os portões para um usurpador. A coroa caiu antes do amanhecer.' };
  else if (s.war?.result === 'derrota')
    s.ended = { kind: 'derrota', title: 'Castelmar Caiu', text: 'Os estandartes inimigos tremulam sobre a capital. O reino foi conquistado.' };
}

function epilogue(s: GameState): string {
  const spouse = s.spouse ? char(s.spouse).name : 'nenhuma rainha';
  const gov = governabilidade(s);
  const war = s.war?.result === 'vitoria' ? 'venceu a guerra' : s.war?.result === 'paz' ? 'selou uma paz frágil' : s.war ? 'ainda luta uma guerra' : 'evitou a guerra';
  const worst = [...HOUSE_IDS].sort((a, b) => s.loyalty[a] - s.loyalty[b])[0];
  return `${ACT_END} dias depois da coroação, o rei ${s.kingName} está casado com ${spouse}, ${war} e governa um reino ${govLabel2(gov)}. ` +
    `A ${HOUSES[worst].name} é quem mais o despreza (${s.loyalty[worst]}). Leis aprovadas: ${s.laws.length ? s.laws.join('; ') : 'nenhuma'}. ` +
    `A história continua no Ato III.`;
}

export { DAY_END, DAY_START };
