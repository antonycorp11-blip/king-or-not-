import type { Audience, GameEvent, GameState, LogEntry, Resources } from '../types';
import { EVENTS, EVENT_MAP } from '../data/events';
import { HOUSE_IDS, HOUSES, PROVINCES, GOODS } from '../data/realm';
import { char } from '../data/characters';
import { ACT_END, DAY_END, DAY_START, MARRIAGE_DEADLINE, applyEffect, clamp, governabilidade, hasSkill, influenceGain, rand, save } from './core';
import { warEndOfDay } from './war';
import { companion } from '../data/companions';
import { computeEconomy, taxKey } from './economy';

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

function addAudience(s: GameState, ev: GameEvent, arrive = DAY_START) {
  s.audiences.push({ uid: s.nextUid++, eventId: ev.id, expires: s.day + (ev.lasts ?? 1) - 1, done: false, arrive });
  s.seen[ev.id] = s.day;
}

export function startDay(s: GameState) {
  s.hour = DAY_START;
  s.log = [];
  s.dayStart = { res: { ...s.res }, loyalty: { ...s.loyalty } };
  s.audiences = s.audiences.filter((a) => !a.done && a.expires >= s.day);
  for (const a of s.audiences) a.arrive = DAY_START; // quem voltou já espera desde cedo

  // eventos agendados por decisões anteriores
  const due = s.scheduled.filter((x) => x.day <= s.day);
  s.scheduled = s.scheduled.filter((x) => x.day > s.day);
  for (const d of due) {
    const ev = EVENT_MAP[d.id];
    if (ev && (!ev.cond || ev.cond(s)) && !s.audiences.some((a) => a.eventId === ev.id)) addAudience(s, ev);
  }
  // roteiro do dia
  for (const ev of EVENTS) if (ev.day === s.day && eligible(s, ev)) addAudience(s, ev);

  // demandas aleatórias até preencher a agenda
  const target = s.day === 1 ? 4 : s.day <= 3 ? 6 : 7;
  let guard = 0;
  while (s.audiences.length < target && guard++ < 20) {
    const pool = EVENTS.filter((e) => e.weight && eligible(s, e));
    if (!pool.length) break;
    const total = pool.reduce((a, e) => a + e.weight!, 0);
    let r = rand(s) * total;
    const pick = pool.find((e) => (r -= e.weight!) <= 0) ?? pool[pool.length - 1];
    // as demandas chegam ao longo do dia; urgentes e as primeiras chegam cedo
    const early = s.audiences.length < 2 || pick.kind === 'urgente';
    addAudience(s, pick, early ? DAY_START : 9 + Math.floor(rand(s) * 8));
  }
  // urgentes primeiro
  s.audiences.sort((a, b) => Number(eventOf(b).kind === 'urgente') - Number(eventOf(a).kind === 'urgente'));
  save(s);
}

export function visibleAudiences(s: GameState) {
  return s.audiences.filter((a) => !a.done && (a.arrive ?? DAY_START) <= s.hour);
}

export function currentObjective(s: GameState): { title: string; text: string } {
  if (s.war && !s.war.result) return { title: 'Vencer a guerra', text: `Contra ${s.war.enemy === 'norhelm' ? 'Norhelm' : 'os rebeldes Drakon'} · turno ${s.war.turn}` };
  if (!s.spouse && !s.flags.noiva) return { title: 'Escolher uma rainha', text: `O conselho exige um casamento até o Dia ${MARRIAGE_DEADLINE}` };
  if (!s.spouse && s.flags.noiva) return { title: 'O casamento real', text: `Cerimônia no Dia ${MARRIAGE_DEADLINE}` };
  if (s.day < 22) return { title: 'Consolidar o reino', text: 'O norte está quieto demais...' };
  return { title: 'Sobreviver ao primeiro mês', text: `Fim do Ato I no Dia ${ACT_END}` };
}

export function canSpend(s: GameState, hours: number) {
  return s.hour + hours <= DAY_END;
}

export function spendHours(s: GameState, hours: number) {
  s.hour = Math.min(DAY_END, s.hour + hours);
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

  // 1. Demandas não atendidas
  const pending: Audience[] = [];
  for (const a of s.audiences) {
    if (a.done) continue;
    const ev = eventOf(a);
    if (a.expires > s.day) {
      pending.push(a);
      continue;
    }
    a.done = true;
    if (ev.ignored) {
      applyEffect(s, ev.ignored, { ignoredMode: true });
      entries.push({ icon: 'selo', title: `Ignorado: ${ev.topic}`, text: ev.ignored.text, tone: 'ruim' });
    } else {
      // toda demanda ignorada tem algum custo, mesmo que pequeno
      const who = char(ev.speaker);
      applyEffect(s, { rel: { [ev.speaker]: -4 } }, { ignoredMode: true });
      entries.push({ icon: 'selo', title: `Ignorado: ${ev.topic}`, text: `${who.name} esperou em vão pela sua atenção.`, delta: '−4', tone: 'ruim' });
    }
  }

  // 2. Guerra: o inimigo age se você não comandou hoje
  warEndOfDay(s, entries);

  // 3. Economia
  const eco = computeEconomy(s);
  s.res.ouro += eco.net;
  entries.push({ icon: 'moedas', title: 'Renda Provincial', text: `Impostos ${eco.taxTotal}, tarifas ${eco.tradeTotal}, soldo do exército −${eco.upkeep}.`, delta: signed(eco.net), tone: eco.net >= 0 ? 'bom' : 'ruim' });

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

  // 9. Rumores para o dia seguinte
  const rumor = pickRumor(s);
  if (rumor) entries.push(rumor);

  // 9. Fim de jogo?
  checkEnd(s);

  s.history.push({ day: s.day, entries });
  s.day++;
  if (!s.ended && s.day > ACT_END) {
    s.ended = { kind: 'fimAto', title: 'Fim do Ato I', text: epilogue(s) };
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
  return `Trinta dias depois da coroação, o rei ${s.kingName} está casado com ${spouse}, ${war} e governa um reino ${govLabel2(gov)}. ` +
    `A ${HOUSES[worst].name} é quem mais o despreza (${s.loyalty[worst]}). Leis aprovadas: ${s.laws.length ? s.laws.join('; ') : 'nenhuma'}. ` +
    `A história continua no Ato II.`;
}

export { DAY_END, DAY_START };
