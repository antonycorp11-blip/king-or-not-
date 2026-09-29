import type { GameState, Good, HouseId, LogEntry, ProvinceId, TaxLevel, TradeRoute } from '../types';
import { GOODS, KINGDOM_PROVINCES, PROVINCES } from '../data/realm';
import { clamp, hasSkill, knows } from './core';

export const TAX_MULT: Record<TaxLevel, number> = { baixo: 0.6, normal: 1, alto: 1.5 };
export const CARAVAN_COST = 1; // ouro por rota por dia
export const ESCORT_COST = 3;
export const WORK_DAYS = 3;
export const WORK_NAMES: Record<Good, string> = { graos: 'Moinho', madeira: 'Serraria', ferro: 'Mina', peixe: 'Porto de pesca', vinho: 'Vinícola', prata: 'Mina de prata' };

export interface RouteResult {
  route: TradeRoute;
  amount: number;
  tariff: number;
  blocked?: string; // por que a rota não andou hoje
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
  caravans: number; // custo das caravanas e escoltas
  cuts: number; // parte que fica com a Guilda e os Valmont
  cutWho: string[];
  stored: number; // grão mandado ao celeiro hoje
  granaryDraw: number; // grão tirado do celeiro para cobrir a fome
  net: number;
}

export function taxKey(p: ProvinceId): HouseId | 'coroa' {
  const h = PROVINCES[p].house;
  return h === 'norhelm' || h === 'veridian' ? 'coroa' : (h as HouseId | 'coroa');
}

export const isWinter = (s: GameState) => s.day >= 31;

export function price(s: GameState, g: Good) {
  return GOODS[g].price * (s.market?.[g] ?? 1);
}

export function production(s: GameState, p: ProvinceId): Partial<Record<Good, number>> {
  const inv = s.investments[p] ?? 0;
  const out: Partial<Record<Good, number>> = {};
  for (const [g, n] of Object.entries(PROVINCES[p].produces) as [Good, number][]) out[g] = Math.round(n * (1 + 0.25 * inv));
  return out;
}

export function needs(s: GameState, p: ProvinceId): Partial<Record<Good, number>> {
  const n = { ...PROVINCES[p].needs };
  // no inverno a capital come mais e queima lenha
  if (isWinter(s) && p === 'castelmar') { n.graos = (n.graos ?? 0) + 2; n.madeira = (n.madeira ?? 0) + 1; }
  return n;
}

// Por que uma rota não anda hoje (guerra, casa hostil, bandidos)
export function routeBlock(s: GameState, r: TradeRoute): string | undefined {
  const b = s.routeBlock?.[r.id];
  if (b && b.until >= s.day) return b.why;
  const enemy = (p: ProvinceId | string) => s.war && !s.war.result && s.war.territories.find((t) => t.id === p)?.owner === 'inimigo';
  if (enemy(r.from) || enemy(r.to)) return 'território inimigo';
  for (const p of [r.from, r.to]) {
    if (p === 'veridian' || p === 'celeiro') continue;
    const k = taxKey(p as ProvinceId);
    if (k !== 'coroa' && s.loyalty[k] <= -40) return `a ${k === 'valmont' ? 'Casa Valmont' : k === 'drakon' ? 'Casa Drakon' : k === 'seren' ? 'Casa Seren' : 'Casa Montclair'} fechou as estradas`;
  }
  return undefined;
}

export function computeEconomy(s: GameState): Economy {
  const supply = {} as Economy['supply'];
  const remainingNeed = {} as Record<ProvinceId, Partial<Record<Good, number>>>;
  for (const p of KINGDOM_PROVINCES) {
    supply[p] = { ...production(s, p) };
    remainingNeed[p] = needs(s, p);
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
  let stored = 0;
  let caravans = 0;
  // rotas internas primeiro (suprem necessidades), depois celeiro e exportação
  const order = (r: TradeRoute) => (r.to === 'veridian' ? 2 : r.to === 'celeiro' ? 1 : 0);
  for (const r of [...s.routes].sort((a, b) => order(a) - order(b))) {
    caravans += (hasSkill(s, "mercador") ? 0 : CARAVAN_COST) + (r.escort ? ESCORT_COST : 0);
    const blocked = routeBlock(s, r);
    if (blocked) { routes.push({ route: r, amount: 0, tariff: 0, blocked }); continue; }
    const avail = supply[r.from]?.[r.good] ?? 0;
    let amount = 0;
    let tariff = 0;
    if (r.to === 'veridian') {
      amount = avail;
      const alliance = s.spouse === 'isolde' ? 2 : 1.5;
      tariff = amount * price(s, r.good) * 0.25 * alliance * tariffMul;
    } else if (r.to === 'celeiro') {
      amount = r.good === 'graos' ? avail : 0;
      stored += amount;
    } else {
      const need = remainingNeed[r.to]?.[r.good] ?? 0;
      amount = Math.min(avail, need);
      remainingNeed[r.to][r.good] = need - amount;
      tariff = amount * price(s, r.good) * 0.25 * tariffMul;
    }
    supply[r.from][r.good] = avail - amount;
    routes.push({ route: r, amount, tariff: Math.round(tariff) });
  }

  // o celeiro real cobre a fome de grão
  let granary = s.granary ?? 0;
  let granaryDraw = 0;
  for (const p of KINGDOM_PROVINCES) {
    const need = remainingNeed[p].graos ?? 0;
    if (need > 0 && granary > 0) {
      const d = Math.min(need, granary);
      granary -= d; granaryDraw += d;
      remainingNeed[p].graos = need - d;
    }
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
    if (hasSkill(s, 'banqueiro')) t *= 1.15;
    if (key !== 'coroa' && s.loyalty[key] < -30) t *= 0.5; // casas hostis sonegam
    if (s.war && s.war.territories.find((w) => w.id === p)?.owner === 'inimigo') t = 0;
    taxes[p] = Math.round(t);
    taxTotal += taxes[p];
  }
  if (s.laws.includes('Lei do Pedágio Real')) taxTotal += 25;
  if (s.laws.includes('Pedágio com Isenção do Pão')) taxTotal += 15;
  if (s.laws.includes('Lei do Portão Livre')) taxTotal -= 20;
  const tradeTotal = routes.reduce((a, r) => a + r.tariff, 0);
  // quem fica com uma parte do comércio do rei
  const cutWho: string[] = [];
  let cutPct = 0;
  if (s.laws.some((l) => l.startsWith('Monopólio'))) { cutPct += 0.1; cutWho.push('a Guilda (monopólio)'); }
  const valmont = Math.min(0.2, (s.tracks.dividaValmont ?? 0) / 250);
  if (valmont > 0.01) { cutPct += valmont; cutWho.push('os Valmont (dívida)'); }
  const veridian = Math.min(0.15, (s.tracks.presencaVeridian ?? 0) / 300);
  if (veridian > 0.01) { cutPct += veridian; cutWho.push('os banqueiros de Véridian'); }
  const cuts = Math.round(tradeTotal * cutPct);
  const upkeep = Math.round(s.res.exercito * 0.06 * (hasSkill(s, 'disciplina') ? 0.8 : 1));
  return { supply, shortages, surplus: supply, taxes, routes, taxTotal, tradeTotal, upkeep, caravans, cuts, cutWho, stored, granaryDraw,
    net: taxTotal + tradeTotal - cuts - upkeep - caravans };
}

export function nextRouteId(s: GameState) {
  return s.routes.reduce((m, r) => Math.max(m, r.id), 0) + 1;
}

// ---------- o mercado se move todo dia ----------
export function marketDaily(s: GameState, eco: Economy, rng: () => number, entries: LogEntry[]) {
  s.market ??= {};
  s.marketHist ??= {};
  const moves: string[] = [];
  for (const g of Object.keys(GOODS) as Good[]) {
    let target = 1;
    if (isWinter(s)) target += g === 'graos' ? 0.35 : g === 'madeira' ? 0.25 : g === 'peixe' ? 0.1 : 0;
    if (s.war && !s.war.result) target += g === 'ferro' ? 0.45 : g === 'graos' ? 0.2 : 0;
    const short = eco.shortages.filter((x) => x.good === g).reduce((a, x) => a + x.missing, 0);
    target += Math.min(0.6, short * 0.08);
    const extra = KINGDOM_PROVINCES.reduce((a, p) => a + (eco.surplus[p]?.[g] ?? 0), 0);
    target -= Math.min(0.35, Math.max(0, extra - 4) * 0.04);
    if (g === 'vinho' && s.laws.includes('Monopólio do vinho para a Guilda')) target += 0.3;
    const cur = s.market[g] ?? 1;
    const next = clamp(cur + (target - cur) * 0.25 + (rng() - 0.5) * 0.08, 0.5, 2.3);
    s.market[g] = Math.round(next * 100) / 100;
    const h = (s.marketHist[g] ??= []);
    h.push(s.market[g]!);
    if (h.length > 8) h.shift();
    if (h.length >= 2 && Math.abs(next - h[0]) / h[0] > 0.25 && Math.abs(next - cur) > 0.05) moves.push(`${GOODS[g].name} ${next > h[0] ? 'sobe' : 'cai'}`);
  }
  if (moves.length) entries.push({ icon: 'moedas', title: 'Mercado', text: `${moves.join(', ')}. Veja o Livro de Contas.`, tone: 'neutro' });
}

// Bandidos, obras e o tesoureiro que cuida das rotas
export function tradeDaily(s: GameState, rng: () => number, entries: LogEntry[]) {
  s.routeBlock ??= {};
  for (const r of s.routes) {
    if (r.escort || r.to === 'celeiro' || routeBlock(s, r)) continue;
    const from = taxKey(r.from);
    const risk = 0.02 + (from !== 'coroa' && s.loyalty[from] < 10 ? 0.03 : 0) + (s.res.povo < 30 ? 0.02 : 0);
    if (rng() < risk) {
      s.routeBlock[r.id] = { until: s.day + 2, why: 'bandidos na estrada' };
      entries.push({ icon: 'espadas', title: 'Caravana assaltada', text: `Bandidos atacaram a rota de ${GOODS[r.good].name.toLowerCase()} saindo de ${PROVINCES[r.from].name}. Ela fica parada por dois dias. Uma escolta evitaria isso.`, tone: 'ruim' });
    }
  }
  for (const w of s.works ?? []) {
    if (w.ready !== s.day + 1) continue;
    s.investments[w.province] = (s.investments[w.province] ?? 0) + 1;
    entries.push({ icon: 'martelo', title: 'Obra concluída', text: `${w.name} em ${PROVINCES[w.province].name} começou a produzir.`, tone: 'bom' });
  }
  s.works = (s.works ?? []).filter((w) => w.ready > s.day + 1);
}

// O tesoureiro, se o rei deixar, abre rotas sozinho para cobrir a falta
export function treasurerRoutes(s: GameState, who: string | null, entries: LogEntry[]) {
  if (!who || !s.flags.tesoureiroRotas) return;
  const eco = computeEconomy(s);
  for (const sh of eco.shortages) {
    const src = KINGDOM_PROVINCES.filter((p) => p !== sh.province && (eco.surplus[p]?.[sh.good] ?? 0) > 0)
      .sort((a, b) => (eco.surplus[b]![sh.good] ?? 0) - (eco.surplus[a]![sh.good] ?? 0))[0];
    if (!src || s.routes.some((r) => r.from === src && r.to === sh.province && r.good === sh.good)) continue;
    s.routes.push({ id: nextRouteId(s), from: src, to: sh.province, good: sh.good });
    s.council.power[who] = clamp((s.council.power[who] ?? 0) + 1, 0, 100);
    entries.push({ icon: 'moedas', title: 'Rota aberta pelo Tesoureiro', text: `Sem consultar o rei, o Tesoureiro mandou ${GOODS[sh.good].name.toLowerCase()} de ${PROVINCES[src].name} para ${PROVINCES[sh.province].name}.`, tone: 'neutro' });
    return; // uma por dia
  }
}
