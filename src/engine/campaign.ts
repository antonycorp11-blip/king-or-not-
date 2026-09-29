import type { GameState, HouseId, LogEntry, OrderType, ProvinceId, Tactic, TroopType, WarArmy, WarState } from '../types';
import { HOUSES, PROVINCES } from '../data/realm';
import { char } from '../data/characters';
import { ADVISORS } from '../data/council';
import { attr, clamp, hasSkill, knows, rand } from './core';

// Guerra v2: exércitos com comandante, tipos de tropa, moral e suprimento. O rei dá
// ordens no Conselho de Guerra; à noite o terreno, o clima, as fortalezas e a tática
// decidem as batalhas. As guarnições das províncias (territories.units) continuam a
// existir: são os defensores fixos de cada lugar.

export const TROOPS: Record<TroopType, { name: string; power: number; icon: string }> = {
  infantaria: { name: 'Infantaria', power: 1, icon: 'escudo' },
  arqueiros: { name: 'Arqueiros', power: 0.9, icon: 'seta' },
  cavalaria: { name: 'Cavalaria', power: 1.4, icon: 'lobo' },
  guarda: { name: 'Guarda Real', power: 1.3, icon: 'coroa' },
  mercenarios: { name: 'Mercenários', power: 1.1, icon: 'moedas' },
};
export const TROOP_IDS = Object.keys(TROOPS) as TroopType[];

export const TERRAIN: Record<ProvinceId, { name: string; kind: 'cidade' | 'litoral' | 'planicie' | 'floresta' | 'montanha' | 'passo' }> = {
  castelmar: { name: 'cidade murada', kind: 'cidade' }, costa: { name: 'litoral', kind: 'litoral' }, vale: { name: 'planície', kind: 'planicie' },
  bosques: { name: 'floresta', kind: 'floresta' }, montanhas: { name: 'montanhas', kind: 'montanha' }, passo: { name: 'passo de montanha', kind: 'passo' },
  fiorde: { name: 'litoral gelado', kind: 'litoral' }, hjalmgard: { name: 'cidade fortificada', kind: 'cidade' },
};

export const ORDERS: Record<OrderType, { name: string; help: string }> = {
  defender: { name: 'Defender', help: 'Fica onde está e segura a posição.' },
  marchar: { name: 'Marchar', help: 'Anda uma província por noite até o destino, sem buscar combate.' },
  atacar: { name: 'Atacar', help: 'Avança até o destino e combate quem estiver no caminho.' },
  forragear: { name: 'Forragear', help: 'Para e junta comida: recupera suprimento, mas deixa a guarda baixa.' },
  recuar: { name: 'Recuar', help: 'Volta para a província amiga mais próxima da capital.' },
};

export const TACTICS: Record<Tactic, { name: string; help: string }> = {
  formacao: { name: 'Formação cerrada', help: 'Defende melhor e perde menos homens. Ataca com cautela.' },
  carga: { name: 'Carga', help: 'A cavalaria decide. Devastadora em campo aberto, desastrosa na chuva e no bosque.' },
  flanco: { name: 'Flanquear', help: 'Exige cavalaria e um comandante esperto (Estratégia 3+).' },
  falsa: { name: 'Falsa retirada', help: 'Atrai o inimigo para uma armadilha. Só funciona com moral alta; senão vira fuga de verdade.' },
};

// Comandantes: estratégia 1..5, coragem 1..5 e uma especialidade
export const COMMANDERS: Record<string, { estrategia: number; coragem: number; esp: 'cavalaria' | 'defesa' | 'cerco' | 'emboscada' | 'nenhuma' }> = {
  rei: { estrategia: 2, coragem: 3, esp: 'nenhuma' },
  aurelian: { estrategia: 3, coragem: 4, esp: 'defesa' },
  brandt: { estrategia: 3, coragem: 5, esp: 'cavalaria' },
  rhoswen: { estrategia: 4, coragem: 5, esp: 'cavalaria' },
  sigrid: { estrategia: 3, coragem: 4, esp: 'emboscada' },
  lucas: { estrategia: 1, coragem: 3, esp: 'nenhuma' },
  sir_ferrao: { estrategia: 2, coragem: 4, esp: 'defesa' },
  sir_osric: { estrategia: 1, coragem: 2, esp: 'nenhuma' },
  sir_bram: { estrategia: 3, coragem: 3, esp: 'emboscada' },
  sir_picoalto: { estrategia: 3, coragem: 4, esp: 'cerco' },
  gaspard: { estrategia: 2, coragem: 2, esp: 'nenhuma' },
  aveline: { estrategia: 3, coragem: 3, esp: 'emboscada' },
  otho: { estrategia: 3, coragem: 2, esp: 'cerco' },
  ragnar: { estrategia: 4, coragem: 5, esp: 'cavalaria' },
  haakon: { estrategia: 3, coragem: 4, esp: 'cerco' },
};
export const commander = (id: string) => COMMANDERS[id] ?? { estrategia: 2, coragem: 3, esp: 'nenhuma' as const };

export const ADJ: Record<ProvinceId, ProvinceId[]> = {
  hjalmgard: ['fiorde', 'passo'], fiorde: ['hjalmgard', 'passo', 'vale'], passo: ['hjalmgard', 'fiorde', 'vale', 'montanhas'],
  vale: ['fiorde', 'passo', 'montanhas', 'bosques', 'castelmar'], montanhas: ['passo', 'vale', 'castelmar', 'costa'],
  bosques: ['vale', 'castelmar'], castelmar: ['vale', 'montanhas', 'bosques', 'costa'], costa: ['montanhas', 'castelmar'],
};

const BASE_FORTS: Partial<Record<ProvinceId, number>> = { castelmar: 3, montanhas: 2, vale: 1, hjalmgard: 3, passo: 2, fiorde: 1, costa: 1 };

export const size = (a: WarArmy) => TROOP_IDS.reduce((n, t) => n + a.troops[t], 0);
const empty = (): Record<TroopType, number> => ({ infantaria: 0, arqueiros: 0, cavalaria: 0, guarda: 0, mercenarios: 0 });

function newArmy(w: WarState, a: Omit<WarArmy, 'id' | 'order' | 'tactic' | 'supply' | 'morale'> & Partial<WarArmy>): WarArmy {
  w.nextArmyId = (w.nextArmyId ?? 1) + 1;
  return { order: 'defender', tactic: 'formacao', supply: 5, morale: 60, ...a, id: w.nextArmyId };
}

// Monta os exércitos do começo da guerra a partir das guarnições do tabuleiro antigo
export function initArmies(s: GameState) {
  const w = s.war!;
  if (w.armies) return;
  w.armies = [];
  w.baseArmy = s.res.exercito;
  w.forts = { ...BASE_FORTS, ...(hasSkill(s, 'fortaleza') ? { castelmar: 4 } : {}) };
  const marshal = s.council.seats.marechal ?? 'aurelian';
  const camp = (s.flags.armyAt as ProvinceId) || 'castelmar';
  // o exército do rei sai das guarnições da capital e do acampamento
  const cap = w.territories.find((t) => t.id === 'castelmar')!;
  const campT = w.territories.find((t) => t.id === camp && t.owner === 'rei') ?? cap;
  // a capital sempre guarda uma guarnição de verdade atrás das muralhas
  const pool = Math.max(3, campT.units + (campT !== cap ? Math.floor(cap.units / 2) : 0) - 4);
  campT.units = Math.min(campT.units, campT === cap ? 4 : 2); if (campT !== cap) cap.units = Math.max(4, cap.units - Math.floor(cap.units / 2));
  const t = empty();
  t.infantaria = Math.ceil(pool * 0.45); t.arqueiros = Math.round(pool * 0.2); t.cavalaria = Math.round(pool * (s.spouse === 'rhoswen' ? 0.25 : 0.15)); t.guarda = Math.max(1, pool - t.infantaria - t.arqueiros - t.cavalaria);
  w.armies.push(newArmy(w, { owner: 'rei', name: 'Exército Real', commander: marshal, at: campT.id, troops: t, morale: s.res.moral }));
  // hostes das casas leais: saem da guarnição da própria província
  for (const tr of w.territories) {
    const P = PROVINCES[tr.id];
    const h = P.house as HouseId;
    if (tr.owner !== 'rei' || tr.id === 'castelmar' || !HOUSES[h]?.lord || tr.units < 4) continue;
    const n = tr.units - 2; tr.units = 2;
    const host = empty();
    host.infantaria = Math.ceil(n * 0.5); host.arqueiros = Math.round(n * (h === 'seren' ? 0.35 : 0.2)); host.cavalaria = Math.max(0, n - host.infantaria - host.arqueiros);
    w.armies.push(newArmy(w, { owner: 'rei', name: `Hoste ${HOUSES[h].name.replace('Casa ', '')}`, commander: HOUSES[h].lord!, at: tr.id, troops: host, house: h, morale: 50 + Math.round(s.loyalty[h] / 4) }));
  }
  // o inimigo
  for (const tr of w.territories.filter((x) => x.owner === 'inimigo')) {
    if (tr.units < 5) continue;
    const n = tr.units - 3; tr.units = 3;
    const host = empty();
    const norte = w.enemy === 'norhelm';
    host.infantaria = Math.ceil(n * 0.5); host.cavalaria = Math.round(n * (norte ? 0.3 : 0.2)); host.arqueiros = Math.max(0, n - host.infantaria - host.cavalaria);
    const cmd = norte ? (tr.id === 'passo' ? 'ragnar' : 'haakon') : (HOUSES[w.enemy as HouseId]?.lord ?? 'otho');
    w.armies.push(newArmy(w, { owner: 'inimigo', name: norte ? `Hoste de ${char(cmd).name.split(' ').slice(-1)[0]}` : `Rebeldes ${HOUSES[w.enemy as HouseId].name.replace('Casa ', '')}`, commander: cmd, at: tr.id, troops: host, morale: 65, order: 'atacar' }));
  }
  syncRoyal(s);
}

// O exército do rei (sem as hostes das casas) é o que aparece no HUD
function syncRoyal(s: GameState) {
  const w = s.war!;
  const royal = w.armies!.filter((a) => a.owner === 'rei' && !a.house);
  s.res.exercito = royal.reduce((n, a) => n + size(a), 0) * 100;
  if (royal.length) s.res.moral = Math.round(royal.reduce((n, a) => n + a.morale, 0) / royal.length);
}

export function totalsV2(w: WarState) {
  const g = (o: 'rei' | 'inimigo') => w.territories.filter((t) => t.owner === o).reduce((n, t) => n + t.units, 0);
  const a = (o: 'rei' | 'inimigo') => (w.armies ?? []).filter((x) => x.owner === o).reduce((n, x) => n + size(x), 0);
  return { rei: g('rei') + a('rei'), inimigo: g('inimigo') + a('inimigo') };
}

function nextStep(from: ProvinceId, to: ProvinceId): ProvinceId | null {
  if (from === to) return null;
  const prev = new Map<ProvinceId, ProvinceId>();
  const q: ProvinceId[] = [from];
  const seen = new Set<ProvinceId>([from]);
  while (q.length) {
    const c = q.shift()!;
    for (const n of ADJ[c]) {
      if (seen.has(n)) continue;
      seen.add(n); prev.set(n, c);
      if (n === to) { let k = n; while (prev.get(k) !== from) k = prev.get(k)!; return k; }
      q.push(n);
    }
  }
  return null;
}

// ---------- força de combate ----------
function armyPower(s: GameState, a: WarArmy, role: 'atk' | 'def', where: ProvinceId, weather: WarState['weather']): number {
  const kind = TERRAIN[where].kind;
  const c = commander(a.commander);
  const total = size(a) || 1;
  const cavShare = a.troops.cavalaria / total;
  let p = 0;
  for (const t of TROOP_IDS) {
    let v = TROOPS[t].power * a.troops[t];
    if (t === 'cavalaria') { if (kind === 'planicie' || kind === 'litoral') v *= 1.3; if (kind === 'floresta' || kind === 'montanha' || kind === 'passo') v *= 0.6; if (weather === 'chuva') v *= 0.7; }
    if (t === 'arqueiros') { if (role === 'def') v *= 1.4; if (kind === 'floresta') v *= 1.3; if (weather === 'chuva') v *= 0.8; }
    if (t === 'infantaria' && (kind === 'montanha' || kind === 'passo')) v *= 1.2;
    if (t === 'guarda' && role === 'def' && where === 'castelmar') v *= 1.3;
    p += v;
  }
  // comandante
  p *= 1 + (c.estrategia - 2) * 0.07;
  if (c.esp === 'defesa' && role === 'def') p *= 1.2;
  if (c.esp === 'cavalaria' && cavShare > 0.25) p *= 1.15;
  if (c.esp === 'emboscada' && role === 'atk' && (kind === 'floresta' || kind === 'passo' || weather === 'nevoa')) p *= 1.2;
  if (a.owner === 'rei' && a.commander === 'rei') p *= 1 + attr(s, 'estrategia') * 0.05;
  // tática
  const tac = a.tactic;
  if (tac === 'formacao') p *= role === 'def' ? 1.2 : 0.9;
  if (tac === 'carga') p *= (weather === 'chuva' || kind === 'floresta') ? 0.8 : 1 + cavShare * 0.6;
  if (tac === 'flanco') p *= cavShare >= 0.15 && c.estrategia >= 3 ? 1.25 : 0.95;
  if (tac === 'falsa') p *= a.morale >= 60 ? 1.35 : 0.7;
  // moral, fome, clima, livros
  p *= 0.55 + a.morale / 110;
  if (a.supply <= 0) p *= 0.75;
  if (weather === 'neve' && role === 'atk') p *= 0.8;
  if (a.owner === 'rei' && role === 'def' && knows(s, 'tatica')) p *= 1.1;
  if (a.owner === 'rei' && role === 'atk' && hasSkill(s, 'tatico')) p *= 1.1;
  if (a.owner === 'rei' && knows(s, 'cerco') && role === 'atk') p *= 1.05;
  return p;
}

function garrisonPower(w: WarState, id: ProvinceId, units: number) {
  return units * (1 + 0.35 * (w.forts?.[id] ?? 0));
}

function lose(a: WarArmy, frac: number) {
  for (const t of TROOP_IDS) a.troops[t] = Math.max(0, a.troops[t] - Math.max(a.troops[t] > 0 && frac > 0.15 ? 1 : 0, Math.round(a.troops[t] * frac)));
}

// ---------- a noite de campanha ----------
export function campaignNight(s: GameState, entries: LogEntry[]): string[] {
  const w = s.war!;
  initArmies(s);
  const report: string[] = [];
  const armies = w.armies!;
  // clima
  const r = rand(s);
  w.weather = s.day >= 31 ? (r < 0.35 ? 'neve' : r < 0.55 ? 'chuva' : 'limpo') : r < 0.25 ? 'chuva' : r < 0.35 ? 'nevoa' : 'limpo';
  // quem decide as ordens
  enemyOrders(s);
  const planned = w.plannedDay === s.day;
  if (w.delegated) royalOrders(s);
  else if (!planned) for (const a of armies.filter((x) => x.owner === 'rei')) a.morale = clamp(a.morale - 2, 0, 100);

  // suprimento
  for (const a of armies) {
    const own = w.territories.find((t) => t.id === a.at)?.owner === a.owner;
    const use = w.weather === 'neve' ? 2 : 1;
    if (a.order === 'forragear') a.supply = Math.min(6, a.supply + (own ? 3 : 2));
    else if (own && a.owner === 'rei' && ((s.granary ?? 0) > 0 || PROVINCES[a.at].produces.graos)) { a.supply = Math.min(6, a.supply + 1); if (!PROVINCES[a.at].produces.graos && (s.granary ?? 0) > 0) s.granary = (s.granary ?? 0) - 1; }
    else a.supply = Math.max(0, a.supply - use);
    if (a.supply <= 0) { a.morale = clamp(a.morale - 10, 0, 100); lose(a, 0.05); report.push(`${a.name} passa fome e perde homens.`); }
    if (a.troops.mercenarios && s.res.ouro < 0 && a.owner === 'rei') { a.troops.mercenarios = Math.floor(a.troops.mercenarios / 2); report.push('Sem pagamento, metade dos mercenários desertou.'); }
    if (a.morale < 20) { lose(a, 0.1); report.push(`${a.name}: a moral está tão baixa que soldados fogem à noite.`); }
  }

  // movimentos e batalhas
  for (const a of [...armies].sort((x) => (x.owner === 'inimigo' ? 1 : 0))) {
    if (!armies.includes(a) || size(a) <= 0) continue;
    if (a.order === 'recuar') {
      const home = nextStep(a.at, a.owner === 'rei' ? 'castelmar' : enemySeat(w));
      if (home) a.at = home;
      a.order = 'defender';
      continue;
    }
    if ((a.order !== 'marchar' && a.order !== 'atacar') || !a.to) { a.tired = false; continue; }
    if (a.tired) { a.tired = false; continue; } // reorganizando depois da batalha
    const step = nextStep(a.at, a.to);
    if (!step) { a.order = 'defender'; continue; }
    const foes = armies.filter((x) => x.owner !== a.owner && x.at === step && size(x) > 0);
    const terr = w.territories.find((t) => t.id === step)!;
    const hostile = terr.owner !== a.owner;
    if ((foes.length || hostile) && a.order === 'marchar') { report.push(`${a.name} para diante de ${PROVINCES[step].name}: há inimigos lá, e a ordem era só marchar.`); a.order = 'defender'; continue; }
    if (!foes.length && !hostile) { a.at = step; if (step === a.to) a.order = 'defender'; continue; }
    battle(s, a, foes, step, report);
  }
  // quem ficou com zero tropas some
  for (const a of [...armies]) if (size(a) <= 0) { armies.splice(armies.indexOf(a), 1); report.push(`${a.name} foi destruído.`); }
  // reforços: convocação do rei, hostes das casas leais e o inimigo
  const royal = armies.find((x) => x.owner === 'rei' && !x.house);
  if (royal && s.day % 2 === 0 && s.res.ouro >= 0) { royal.troops.infantaria += 1 + (hasSkill(s, 'senhorguerra') ? 1 : 0); report.push('Novos recrutas chegam ao Exército Real.'); }
  for (const h of armies.filter((x) => x.owner === 'rei' && x.house && s.day % 3 === 0)) if (s.loyalty[h.house!] >= 20) h.troops.infantaria += 1;
  if (s.day % 2 === 1) {
    const seat = enemySeat(w);
    const host = armies.find((x) => x.owner === 'inimigo' && x.at === seat) ?? armies.find((x) => x.owner === 'inimigo');
    const n = w.enemy === 'norhelm' ? 2 : 1;
    if (host) { host.troops.infantaria += n; host.supply = Math.min(6, host.supply + 2); }
    else if (w.territories.find((t) => t.id === seat)?.owner === 'inimigo') w.territories.find((t) => t.id === seat)!.units += n;
  }
  // inimigo acuado pede paz
  const tot = totalsV2(w);
  if (w.turn >= 5 && tot.inimigo < tot.rei * 0.65 && !s.scheduled.some((x) => x.id === 'paz_oferecida') && rand(s) < 0.35) s.scheduled.push({ id: 'paz_oferecida', day: s.day + 1 });
  syncRoyal(s);
  w.turn++;
  w.lastTurnDay = s.day;
  w.log.unshift(...report.slice().reverse());
  if (w.log.length > 40) w.log.length = 40;
  const tone = report.some((l) => l.includes('vence') || l.includes('toma')) ? 'bom' : 'neutro';
  entries.push({ icon: 'espadas', title: `Relatório do front · ${w.weather}`, text: report.join(' ') || 'Uma noite quieta nas linhas.', tone: report.some((l) => l.includes('perde') || l.includes('cai')) ? 'ruim' : tone });
  return report;
}

function enemySeat(w: WarState): ProvinceId {
  return w.enemy === 'norhelm' ? 'hjalmgard' : ({ valmont: 'costa', drakon: 'vale', seren: 'bosques', montclair: 'montanhas' } as Record<HouseId, ProvinceId>)[w.enemy as HouseId];
}

function battle(s: GameState, a: WarArmy, foes: WarArmy[], where: ProvinceId, report: string[]) {
  const w = s.war!;
  const terr = w.territories.find((t) => t.id === where)!;
  const atk = armyPower(s, a, 'atk', where, w.weather) * (0.85 + rand(s) * 0.3);
  const garrison = terr.owner !== a.owner ? garrisonPower(w, where, terr.units) : 0;
  const def = foes.reduce((n, f) => n + armyPower(s, f, 'def', where, w.weather), 0) * (0.85 + rand(s) * 0.3) + garrison;
  const R = atk / Math.max(0.5, def);
  const place = `${PROVINCES[where].name} (${TERRAIN[where].name}${w.weather !== 'limpo' ? `, ${w.weather}` : ''})`;
  const lossMul = (x: WarArmy) => (x.tactic === 'formacao' ? 0.8 : x.tactic === 'carga' ? 1.2 : 1);
  if (R > 1) {
    lose(a, (0.06 + 0.12 / R) * lossMul(a));
    for (const f of foes) { lose(f, Math.min(0.5, 0.2 + 0.12 * Math.min(R, 3)) * lossMul(f)); f.morale = clamp(f.morale - 14, 0, 100); const back = ADJ[where].find((n) => w.territories.find((t) => t.id === n)?.owner === f.owner && !w.armies!.some((x) => x.owner !== f.owner && x.at === n)); if (back) f.at = back; else lose(f, 1); }
    // muralhas: a guarnição só cai aos poucos, noite após noite (cerco)
    const fort = w.forts?.[where] ?? 0;
    const garrisonLoss = fort > 0 && terr.owner !== a.owner ? Math.min(terr.units, R > 2.5 ? 2 : 1) : Math.ceil(terr.units * Math.min(0.9, 0.35 * R));
    terr.units = Math.max(0, terr.units - garrisonLoss);
    a.tired = true;
    a.morale = clamp(a.morale + 8, 0, 100); a.wins = (a.wins ?? 0) + 1;
    if (terr.owner !== a.owner && terr.units <= 0) {
      terr.owner = a.owner; terr.units = 1; a.at = where; if (a.to === where) a.order = 'defender';
      report.push(`${a.name} vence em ${place} e toma a província.`);
    } else if (terr.owner !== a.owner) report.push(`${a.name} vence em ${place}, mas a guarnição resiste atrás das muralhas. Cerco em andamento.`);
    else { a.at = where; report.push(`${a.name} vence em ${place}.`); }
    if (a.owner === 'rei') glory(s, a);
  } else {
    lose(a, Math.min(0.45, (0.2 + 0.12 / Math.max(0.3, R)) * lossMul(a)));
    a.tired = true;
    for (const f of foes) { lose(f, (0.05 + 0.1 * R) * lossMul(f)); f.morale = clamp(f.morale + 5, 0, 100); }
    a.morale = clamp(a.morale - 12, 0, 100);
    a.order = 'defender';
    report.push(`${a.name} é repelido em ${place}${a.tactic === 'falsa' && a.morale < 60 ? ': a falsa retirada virou fuga de verdade' : ''}.`);
    if (a.owner === 'inimigo' && foes.some((f) => f.owner === 'rei')) for (const f of foes.filter((x) => x.owner === 'rei')) glory(s, f);
  }
}

// Vitórias dão poder a quem comanda. General vitorioso vira peso político.
function glory(s: GameState, a: WarArmy) {
  const c = a.commander;
  if (c === 'rei') { s.res.prestigio = clamp(s.res.prestigio + 3, 0, 100); return; }
  s.council.power[c] = clamp((s.council.power[c] ?? 0) + 4, 0, 100);
  const house = ADVISORS[c]?.house ?? a.house;
  if (house === 'drakon') s.tracks.oficiaisDrakon = (s.tracks.oficiaisDrakon ?? 0) + 2;
  if (a.house) s.loyalty[a.house] = clamp(s.loyalty[a.house] + 2, -100, 100);
}

// ---------- decisões automáticas ----------
function strengthAt(s: GameState, owner: 'rei' | 'inimigo', id: ProvinceId) {
  const w = s.war!;
  const t = w.territories.find((x) => x.id === id);
  const g = t && t.owner === owner ? garrisonPower(w, id, t.units) : 0;
  return g + w.armies!.filter((a) => a.owner === owner && a.at === id).reduce((n, a) => n + armyPower(s, a, 'def', id, w.weather), 0);
}

function enemyOrders(s: GameState) {
  const w = s.war!;
  for (const a of w.armies!.filter((x) => x.owner === 'inimigo')) {
    if (a.supply <= 1) { a.order = 'forragear'; continue; }
    const mine = armyPower(s, a, 'atk', a.at, w.weather);
    const targets = ADJ[a.at].filter((n) => w.territories.find((t) => t.id === n)?.owner === 'rei');
    const weakest = targets.map((n) => ({ n, d: strengthAt(s, 'rei', n) })).sort((x, y) => x.d - y.d)[0];
    if (weakest && mine > weakest.d * 1.15) { a.order = 'atacar'; a.to = weakest.n; a.tactic = rand(s) < 0.4 ? 'carga' : 'flanco'; }
    else if (a.at !== enemySeat(w) && mine < strengthAt(s, 'rei', a.at) * 0.6) a.order = 'recuar';
    else { a.order = 'atacar'; a.to = 'castelmar'; a.tactic = 'formacao'; }
  }
}

// O Marechal conduz a guerra do jeito dele (e fica com a glória)
export function royalOrders(s: GameState) {
  const w = s.war!;
  const dist = (from: ProvinceId, to: ProvinceId) => { let n = 0, c: ProvinceId | null = from; while (c && c !== to && n < 9) { c = nextStep(c, to); n++; } return n; };
  const threat = w.armies!.some((x) => x.owner === 'inimigo' && size(x) > 0 && dist(x.at, 'castelmar') <= 2);
  for (const a of w.armies!.filter((x) => x.owner === 'rei')) {
    // o exército do rei nunca abandona a capital quando o inimigo está perto
    if (!a.house && threat) { if (a.at === 'castelmar') { a.order = 'defender'; a.tactic = 'formacao'; } else { a.order = 'marchar'; a.to = 'castelmar'; } continue; }
    if (a.supply <= 1) { a.order = 'forragear'; continue; }
    const mine = armyPower(s, a, 'atk', a.at, w.weather);
    const targets = ADJ[a.at].filter((n) => w.territories.find((t) => t.id === n)?.owner === 'inimigo' || w.armies!.some((x) => x.owner === 'inimigo' && x.at === n));
    const best = targets.map((n) => ({ n, d: strengthAt(s, 'inimigo', n) })).sort((x, y) => x.d - y.d)[0];
    if (best && mine > best.d * 1.3) { a.order = 'atacar'; a.to = best.n; a.tactic = a.troops.cavalaria / Math.max(1, size(a)) > 0.2 ? 'flanco' : 'formacao'; }
    else { a.order = 'defender'; a.tactic = 'formacao'; }
  }
}

export function setOrder(s: GameState, id: number, order: OrderType, to?: ProvinceId) {
  const a = s.war?.armies?.find((x) => x.id === id);
  if (!a || a.owner !== 'rei') return;
  a.order = order;
  a.to = order === 'marchar' || order === 'atacar' ? to ?? a.to : undefined;
}

export function setTactic(s: GameState, id: number, t: Tactic) {
  const a = s.war?.armies?.find((x) => x.id === id);
  if (a && a.owner === 'rei') a.tactic = t;
}

export function royalArmy(s: GameState) {
  return s.war?.armies?.find((a) => a.owner === 'rei' && !a.house) ?? null;
}

// Fim da guerra: os convocados voltam para casa e o soldo volta ao normal
export function demobilize(s: GameState, entries: LogEntry[]) {
  const w = s.war;
  if (!w || !w.result || w.demobilized) return;
  w.demobilized = true;
  const keep = Math.max(w.baseArmy ?? 800, Math.round(s.res.exercito * 0.6 / 100) * 100);
  if (s.res.exercito > keep) {
    entries.push({ icon: 'escudo', title: 'Desmobilização', text: `${s.res.exercito - keep} convocados voltam para os campos. O soldo do exército diminui.`, tone: 'neutro' });
    s.res.exercito = keep;
  }
  s.res.moral = clamp(Math.max(s.res.moral, 45), 0, 100);
}
