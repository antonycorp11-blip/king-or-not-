import type { GameState, Good, HouseId, ProvinceId, TaxLevel, TradeRoute } from '../types';
import { GOODS, KINGDOM_PROVINCES, PROVINCES } from '../data/realm';
import { hasSkill, knows } from './core';

export const TAX_MULT: Record<TaxLevel, number> = { baixo: 0.6, normal: 1, alto: 1.5 };

export interface RouteResult {
  route: TradeRoute;
  amount: number;
  tariff: number;
}

export interface Economy {
  supply: Record<ProvinceId, Partial<Record<Good, number>>>;
  shortages: { province: ProvinceId; good: Good; missing: number }[];
  surplus: Record<ProvinceId, Partial<Record<Good, number>>>;
  taxes: Record<string, number>;
  routes: RouteResult[];
  taxTotal: number;
  tradeTotal: number;
  upkeep: number;
  net: number;
}

export function taxKey(p: ProvinceId): HouseId | 'coroa' {
  const h = PROVINCES[p].house;
  return h === 'norhelm' || h === 'veridian' ? 'coroa' : (h as HouseId | 'coroa');
}

export function production(s: GameState, p: ProvinceId): Partial<Record<Good, number>> {
  const inv = s.investments[p] ?? 0;
  const out: Partial<Record<Good, number>> = {};
  for (const [g, n] of Object.entries(PROVINCES[p].produces) as [Good, number][]) out[g] = Math.round(n * (1 + 0.25 * inv));
  return out;
}

export function computeEconomy(s: GameState): Economy {
  const supply = {} as Economy['supply'];
  const remainingNeed = {} as Record<ProvinceId, Partial<Record<Good, number>>>;
  for (const p of KINGDOM_PROVINCES) {
    supply[p] = { ...production(s, p) };
    remainingNeed[p] = { ...PROVINCES[p].needs };
    // a província consome primeiro o que ela mesma produz
    for (const [g, need] of Object.entries(remainingNeed[p]) as [Good, number][]) {
      const own = supply[p][g] ?? 0;
      const used = Math.min(own, need);
      supply[p][g] = own - used;
      remainingNeed[p][g] = need - used;
    }
  }

  const tariffMul = (knows(s, 'mercado') ? 1.2 : 1) * (hasSkill(s, 'mercador') ? 1.25 : 1);
  const routes: RouteResult[] = [];
  // rotas internas primeiro (suprem necessidades), depois exportação para Véridian (vende o excedente)
  const ordered = [...s.routes].sort((a, b) => (a.to === 'veridian' ? 1 : 0) - (b.to === 'veridian' ? 1 : 0));
  for (const r of ordered) {
    const avail = supply[r.from]?.[r.good] ?? 0;
    let amount = 0;
    let tariff = 0;
    if (r.to === 'veridian') {
      amount = avail;
      const alliance = s.spouse === 'isolde' ? 2 : 1.5;
      tariff = amount * GOODS[r.good].price * 0.25 * alliance * tariffMul;
    } else {
      const need = remainingNeed[r.to]?.[r.good] ?? 0;
      amount = Math.min(avail, need);
      remainingNeed[r.to][r.good] = need - amount;
      tariff = amount * GOODS[r.good].price * 0.25 * tariffMul;
    }
    supply[r.from][r.good] = avail - amount;
    routes.push({ route: r, amount, tariff: Math.round(tariff) });
  }

  const shortages: Economy['shortages'] = [];
  for (const p of KINGDOM_PROVINCES)
    for (const [g, n] of Object.entries(remainingNeed[p]) as [Good, number][]) if (n > 0) shortages.push({ province: p, good: g, missing: n });

  const taxes: Record<string, number> = {};
  let taxTotal = 0;
  for (const p of KINGDOM_PROVINCES) {
    const key = taxKey(p);
    let t = PROVINCES[p].baseTax * TAX_MULT[s.taxes[key]] * (1 + 0.15 * (s.investments[p] ?? 0));
    if (hasSkill(s, 'contas')) t *= 1.1;
    if (key !== 'coroa' && s.loyalty[key] < -30) t *= 0.5; // casas hostis sonegam
    if (s.war && s.war.territories.find((w) => w.id === p)?.owner === 'inimigo') t = 0;
    taxes[p] = Math.round(t);
    taxTotal += taxes[p];
  }
  if (s.laws.includes('Lei do Pedágio Real')) taxTotal += 25;
  if (s.laws.includes('Pedágio com Isenção do Pão')) taxTotal += 15;
  if (s.laws.includes('Lei do Portão Livre')) taxTotal -= 20;
  const tradeTotal = routes.reduce((a, r) => a + r.tariff, 0);
  const upkeep = Math.round(s.res.exercito * 0.06 * (hasSkill(s, 'disciplina') ? 0.8 : 1));
  return { supply, shortages, surplus: supply, taxes, routes, taxTotal, tradeTotal, upkeep, net: taxTotal + tradeTotal - upkeep };
}

export function nextRouteId(s: GameState) {
  return s.routes.reduce((m, r) => Math.max(m, r.id), 0) + 1;
}
