import type { GameState, LogEntry, ProvinceId, WarState, WarTerritory } from '../types';
import { HOUSES, PROVINCES } from '../data/realm';
import { clamp, hasSkill, knows, rand } from './core';

// Tabuleiro estilo War: territórios, dados de ataque (até 3) contra defesa (até 2).
export const ADJ: Record<ProvinceId, ProvinceId[]> = {
  hjalmgard: ['fiorde', 'passo'],
  fiorde: ['hjalmgard', 'passo', 'vale'],
  passo: ['hjalmgard', 'fiorde', 'vale', 'montanhas'],
  vale: ['fiorde', 'passo', 'montanhas', 'bosques', 'castelmar'],
  montanhas: ['passo', 'vale', 'castelmar', 'costa'],
  bosques: ['vale', 'castelmar'],
  castelmar: ['vale', 'montanhas', 'bosques', 'costa'],
  costa: ['montanhas', 'castelmar'],
};

export const WAR_TURN_HOURS = 2;

export function levyUnits(s: GameState, house: 'valmont' | 'drakon' | 'seren' | 'montclair'): number {
  if (s.loyalty[house] < -20) return 0; // casas hostis não enviam tropas
  let n = HOUSES[house].levy / 100;
  if (house === 'drakon' && s.spouse === 'rhoswen') n *= 2;
  if (s.loyalty[house] >= 50) n += 2;
  return Math.floor(n);
}

export function startWar(s: GameState, enemy: 'norhelm' | 'drakon') {
  const moraleMul = s.res.moral < 40 ? 0.75 : 1;
  const u = (n: number) => Math.max(1, Math.round(n * moraleMul));
  const t: WarTerritory[] = [];
  const royal = Math.floor(s.res.exercito / 100);
  t.push({ id: 'castelmar', owner: 'rei', units: u(royal) });
  t.push({ id: 'costa', owner: 'rei', units: u(levyUnits(s, 'valmont') + (s.spouse === 'isolde' ? 8 : 0)) });
  t.push({ id: 'bosques', owner: 'rei', units: u(levyUnits(s, 'seren')) });
  t.push({ id: 'montanhas', owner: 'rei', units: u(levyUnits(s, 'montclair')) });
  if (enemy === 'norhelm') {
    t.push({ id: 'vale', owner: 'rei', units: u(levyUnits(s, 'drakon')) });
    t.push({ id: 'hjalmgard', owner: 'inimigo', units: 14 });
    t.push({ id: 'fiorde', owner: 'inimigo', units: 10 });
    t.push({ id: 'passo', owner: 'inimigo', units: 12 });
  } else {
    t.push({ id: 'vale', owner: 'inimigo', units: 14 + Math.max(0, Math.floor(-s.loyalty.drakon / 20)) });
  }
  // o exército real luta de onde está acampado (a capital fica com uma guarnição)
  const camp = (s.flags.armyAt as ProvinceId) || 'castelmar';
  const campT = t.find((x) => x.id === camp && x.owner === 'rei');
  if (campT && camp !== 'castelmar') {
    const cap = t.find((x) => x.id === 'castelmar')!;
    const moved = Math.floor(cap.units * 0.6); // 40% ficam guarnecendo a capital
    cap.units -= moved;
    campT.units += moved;
  }
  s.war = { enemy, turn: 1, lastTurnDay: s.day - 1, territories: t, reinforcements: 0, moveUsed: false, log: [] };
  beginPlayerTurn(s);
}

export function terr(w: WarState, id: ProvinceId) {
  return w.territories.find((x) => x.id === id);
}

export function neighbors(w: WarState, id: ProvinceId): WarTerritory[] {
  return ADJ[id].map((n) => terr(w, n)).filter((x): x is WarTerritory => !!x);
}

export function playerReinforcement(s: GameState) {
  return 2 + Math.floor(s.res.exercito / 400) + (hasSkill(s, 'senhorguerra') ? 2 : 0);
}

function beginPlayerTurn(s: GameState) {
  const w = s.war!;
  w.reinforcements = playerReinforcement(s);
  w.moveUsed = false;
}

export function canTakeTurn(s: GameState) {
  return !!s.war && !s.war.result && s.war.lastTurnDay < s.day;
}

function roll(s: GameState) {
  return 1 + Math.floor(rand(s) * 6);
}

export interface BattleRound {
  att: number[];
  def: number[];
  attLoss: number;
  defLoss: number;
}

// Uma rodada de dados. `playerAttacking` define quem recebe os bônus do rei.
export function battleRound(s: GameState, a: WarTerritory, d: WarTerritory): BattleRound {
  const w = s.war!;
  const playerAttacking = a.owner === 'rei';
  const att = Array.from({ length: Math.min(3, a.units - 1) }, () => roll(s)).sort((x, y) => y - x);
  const def = Array.from({ length: Math.min(2, d.units) }, () => roll(s)).sort((x, y) => y - x);
  if (playerAttacking && hasSkill(s, 'tatico')) att[0] = Math.min(7, att[0] + 1);
  if (!playerAttacking && knows(s, 'tatica')) def[0] = Math.min(7, def[0] + 1);
  const playerWinsTies = w.enemy === 'norhelm' && knows(s, 'norhelm');
  let attLoss = 0;
  let defLoss = 0;
  for (let i = 0; i < Math.min(att.length, def.length); i++) {
    const tieToPlayer = playerWinsTies && att[i] === def[i];
    const attackerWins = att[i] > def[i] || (tieToPlayer && playerAttacking);
    if (attackerWins) defLoss++;
    else attLoss++;
  }
  a.units -= attLoss;
  d.units -= defLoss;
  const playerLoss = playerAttacking ? attLoss : defLoss;
  s.res.exercito = Math.max(0, s.res.exercito - playerLoss * 50);
  return { att, def, attLoss, defLoss };
}

function conquer(s: GameState, a: WarTerritory, d: WarTerritory) {
  d.owner = a.owner;
  const move = Math.max(1, Math.ceil((a.units - 1) / 2));
  d.units = move;
  a.units -= move;
  s.war!.log.unshift(`${a.owner === 'rei' ? 'Suas tropas tomaram' : 'O inimigo tomou'} ${PROVINCES[d.id].name}!`);
}

// Ataque completo (rola até vencer ou o atacante ficar com 1 tropa).
export function blitz(s: GameState, from: ProvinceId, to: ProvinceId): BattleRound[] {
  const w = s.war!;
  const a = terr(w, from)!;
  const d = terr(w, to)!;
  const rounds: BattleRound[] = [];
  while (a.units > 1 && d.units > 0 && rounds.length < 50) rounds.push(battleRound(s, a, d));
  if (d.units <= 0) conquer(s, a, d);
  else w.log.unshift(`O ataque a ${PROVINCES[to].name} foi repelido.`);
  checkWarEnd(s);
  return rounds;
}

export function attackOnce(s: GameState, from: ProvinceId, to: ProvinceId): BattleRound {
  const w = s.war!;
  const a = terr(w, from)!;
  const d = terr(w, to)!;
  const r = battleRound(s, a, d);
  if (d.units <= 0) conquer(s, a, d);
  checkWarEnd(s);
  return r;
}

export function reinforce(s: GameState, id: ProvinceId) {
  const w = s.war!;
  const t = terr(w, id);
  if (!t || t.owner !== 'rei' || w.reinforcements <= 0) return;
  t.units++;
  w.reinforcements--;
}

export function fortify(s: GameState, from: ProvinceId, to: ProvinceId, n: number) {
  const w = s.war!;
  const a = terr(w, from)!;
  const b = terr(w, to)!;
  if (w.moveUsed || a.owner !== 'rei' || b.owner !== 'rei' || !ADJ[from].includes(to)) return;
  const k = Math.min(n, a.units - 1);
  a.units -= k;
  b.units += k;
  w.moveUsed = true;
}

// Turno do inimigo. Roda ao encerrar seu turno de guerra (ou ao fim do dia, se você não jogou).
export function enemyTurn(s: GameState): string[] {
  const w = s.war!;
  const out: string[] = [];
  if (w.result) return out;
  const mine = w.territories.filter((t) => t.owner === 'inimigo');
  if (!mine.length) return out;
  const frontier = mine.filter((t) => neighbors(w, t.id).some((n) => n.owner === 'rei'));
  const reinf = w.enemy === 'norhelm' ? 4 : 3;
  const target = frontier.length ? frontier[Math.floor(rand(s) * frontier.length)] : mine[0];
  target.units += reinf;
  out.push(`O inimigo reforçou ${PROVINCES[target.id].name} (+${reinf}).`);

  let attacks = 0;
  for (const t of [...frontier].sort((a, b) => b.units - a.units)) {
    if (attacks >= 2) break;
    const victims = neighbors(w, t.id).filter((n) => n.owner === 'rei' && t.units > n.units + 1).sort((a, b) => a.units - b.units);
    if (!victims.length) continue;
    const v = victims[0];
    attacks++;
    while (t.units > 2 && v.units > 0) battleRound(s, t, v);
    if (v.units <= 0) {
      conquer(s, t, v);
      out.push(`O inimigo conquistou ${PROVINCES[v.id].name}!`);
    } else out.push(`${PROVINCES[v.id].name} resistiu ao ataque inimigo.`);
    checkWarEnd(s);
    if (w.result) break;
  }
  w.log.unshift(...out.slice().reverse());
  return out;
}

export function endPlayerTurn(s: GameState): string[] {
  const w = s.war!;
  w.lastTurnDay = s.day;
  const out = enemyTurn(s);
  w.turn++;
  beginPlayerTurn(s);
  return out;
}

// Chamado pelo fim do dia: se o rei não conduziu a guerra hoje, o inimigo age mesmo assim.
export function warEndOfDay(s: GameState, entries: LogEntry[]) {
  const w = s.war;
  if (!w || w.result) return;
  if (s.flags.warTurnDay === s.day) {
    // o rei abriu o conselho mas não encerrou o turno: encerra sem punição
    const out = endPlayerTurn(s);
    s.flags.warTurnDay = 0;
    entries.push({ icon: 'espadas', title: 'Frente de batalha', text: out.join(' ') || 'O inimigo aguardou.', tone: 'neutro' });
  } else if (w.lastTurnDay < s.day) {
    const out = endPlayerTurn(s);
    s.res.moral = clamp(s.res.moral - 3, 0, 100);
    entries.push({ icon: 'espadas', title: 'Guerra sem comando', text: `Você não conduziu a guerra hoje. ${out.join(' ')}`, delta: '−3 moral', tone: 'ruim' });
  }
}

export function totals(w: WarState) {
  const sum = (o: 'rei' | 'inimigo') => w.territories.filter((t) => t.owner === o).reduce((a, t) => a + t.units, 0);
  return { rei: sum('rei'), inimigo: sum('inimigo') };
}

export function checkWarEnd(s: GameState) {
  const w = s.war!;
  if (w.result) return;
  const tot = totals(w);
  if (terr(w, 'castelmar')!.owner === 'inimigo' || tot.rei <= 0) {
    w.result = 'derrota';
    return;
  }
  const enemyCapital = w.enemy === 'norhelm' ? 'hjalmgard' : 'vale';
  if (terr(w, enemyCapital)!.owner === 'rei' || tot.inimigo <= 2) {
    w.result = 'vitoria';
    s.res.prestigio = clamp(s.res.prestigio + 20, 0, 100);
    s.res.povo = clamp(s.res.povo + 10, 0, 100);
    s.res.moral = clamp(s.res.moral + 20, 0, 100);
    s.log.push({ icon: 'coroa', title: 'Vitória!', text: w.enemy === 'norhelm' ? 'Norhelm foi derrotado. Os sinos de Castelmar tocam o dia inteiro.' : 'A rebelião dos Drakon foi esmagada. O Vale Rubro volta à coroa.', delta: '+20', tone: 'bom' });
    if (w.enemy === 'drakon') s.loyalty.drakon = -10;
  }
}

export function canNegotiatePeace(s: GameState) {
  const w = s.war;
  if (!w || w.result) return false;
  const enemyLost = w.territories.some((t) => t.owner === 'rei' && PROVINCES[t.id].house === (w.enemy === 'norhelm' ? 'norhelm' : 'drakon'));
  return w.turn >= 4 || enemyLost;
}

export const PEACE_COST = 20;

export function negotiatePeace(s: GameState) {
  const w = s.war!;
  if (s.res.influencia < PEACE_COST) return;
  s.res.influencia -= PEACE_COST;
  w.result = 'paz';
  s.res.prestigio = clamp(s.res.prestigio - 5, 0, 100);
  s.log.push({ icon: 'aperto', title: 'Tratado de Paz', text: 'A guerra terminou com um tratado. Ninguém venceu, mas o reino respira.', tone: 'neutro' });
  if (w.enemy === 'drakon') s.loyalty.drakon = 0;
}
