import type { Attr, Effect, GameState, HouseId, LogEntry, Resources } from '../types';
import { BOOKS, SKILLS, XP_PER_POINT } from '../data/progression';
import { HOUSE_IDS, HOUSES } from '../data/realm';
import { CHARACTERS } from '../data/characters';
import { cloudSave } from './cloud';
import { applyMood, moodXpMul } from './mood';
import { addBond, echoRel } from './bonds';
import { addClue } from './conspiracy';
import { SAVE_VERSION, defaultCastle, defaultConspiracy, defaultCouncil, defaultMood, migrate } from './migrate';

export const SAVE_KEY = 'king-or-not-save-v1';
export const DAY_START = 8;
export const DAY_END = 20;
export const MARRIAGE_DEADLINE = 20;
export const ACT_END = 45;

export function newGame(kingName = 'Edric'): GameState {
  const rel: Record<string, number> = {};
  for (const id of Object.keys(CHARACTERS)) rel[id] = 0;
  Object.assign(rel, { isabelle: 40, lucas: 50, aldric: 30, corvin: 10, aurelian: 25, theodric: 20, haakon: -10, marta: 0 });
  const s: GameState = {
    version: SAVE_VERSION,
    phase: 'reinado',
    castle: defaultCastle('quarto'),
    agenda: [],
    council: defaultCouncil(),
    bonds: {},
    mood: defaultMood(),
    conspiracy: defaultConspiracy(),
    dynasty: [],
    tracks: {},
    activitiesToday: [],
    seed: (Math.random() * 2 ** 31) | 0,
    kingName,
    day: 1,
    hour: DAY_START,
    res: { ouro: 600, influencia: 10, prestigio: 45, povo: 50, exercito: 800, moral: 60 },
    loyalty: { valmont: 20, drakon: 10, seren: 25, montclair: 0 },
    rel,
    flags: {},
    knowledge: [],
    bookProgress: {},
    xp: 0,
    skillPoints: 1,
    skills: [],
    laws: [],
    taxes: { coroa: 'normal', valmont: 'normal', drakon: 'normal', seren: 'normal', montclair: 'normal' },
    routes: [
      { id: 1, from: 'costa', to: 'castelmar', good: 'peixe' },
      { id: 2, from: 'bosques', to: 'castelmar', good: 'madeira' },
      { id: 3, from: 'bosques', to: 'vale', good: 'graos' },
      { id: 4, from: 'montanhas', to: 'castelmar', good: 'ferro' },
      { id: 5, from: 'montanhas', to: 'bosques', good: 'ferro' },
      { id: 6, from: 'castelmar', to: 'montanhas', good: 'graos' },
    ],
    investments: {},
    audiences: [],
    scheduled: [],
    seen: {},
    log: [],
    history: [],
    nextUid: 1,
  };
  return s;
}

// ---------- utilidades ----------
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function rand(s: GameState): number {
  // mulberry32 com a semente guardada no estado (determinístico por save)
  let t = (s.seed = (s.seed + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const hasSkill = (s: GameState, id: string) => s.skills.includes(id);
export const knows = (s: GameState, k: string) => s.knowledge.includes(k);
export const flag = (s: GameState, k: string) => s.flags[k];

export function attr(s: GameState, a: Attr): number {
  const fromSkills = SKILLS.filter((k) => k.attr === a && s.skills.includes(k.id)).length;
  const fromBooks = BOOKS.filter((b) => b.attr === a && s.knowledge.includes(b.knowledge)).length;
  return fromSkills + fromBooks;
}

// Governabilidade: o quanto o reino aceita ser governado por você.
// Nasce do apoio do povo comum, do prestígio da coroa e da lealdade das casas — e gera Influência.
export function governabilidade(s: GameState): number {
  const loyAvg = HOUSE_IDS.reduce((a, h) => a + s.loyalty[h], 0) / HOUSE_IDS.length;
  const loy01 = (loyAvg + 100) / 2;
  const [wp, wr, wl] = hasSkill(s, 'reidopovo') ? [0.55, 0.25, 0.2] : [0.45, 0.3, 0.25];
  let g = s.res.povo * wp + s.res.prestigio * wr + loy01 * wl;
  if (s.laws.includes('Carta dos Direitos Comuns')) g += 5;
  if (hasSkill(s, 'reijusto')) g += 5;
  return Math.round(clamp(g, 0, 100));
}

export function govLabel(g: number): string {
  if (g >= 75) return 'Firme';
  if (g >= 55) return 'Estável';
  if (g >= 35) return 'Frágil';
  if (g >= 20) return 'Instável';
  return 'Em colapso';
}

export function influenceGain(s: GameState): number {
  return 1 + Math.floor(governabilidade(s) / 20) + (hasSkill(s, 'palavra') ? 1 : 0) + (hasSkill(s, 'lingua') ? 1 : 0);
}

export function relLabel(v: number): string {
  if (v >= 60) return 'Devoto';
  if (v >= 25) return 'Amigável';
  if (v > -25) return 'Neutro';
  if (v > -60) return 'Hostil';
  return 'Inimigo';
}

export function log(s: GameState, e: LogEntry) {
  s.log.push(e);
}

export function addXp(s: GameState, n: number) {
  s.xp += n;
  while (s.xp >= XP_PER_POINT) {
    s.xp -= XP_PER_POINT;
    s.skillPoints++;
    log(s, { icon: 'livro', title: 'Sabedoria', text: 'Sua experiência como governante lhe ensinou novas lições. Um ponto de habilidade foi obtido.', delta: '+1', tone: 'bom' });
  }
}

// ---------- efeitos ----------
const BOUNDED: (keyof Resources)[] = ['prestigio', 'povo', 'moral'];

export function penaltyWeight(e: Effect | undefined): number {
  if (!e) return 0;
  let neg = 0;
  for (const v of Object.values(e.loyalty ?? {})) if (v! < 0) neg += -v!;
  for (const v of Object.values(e.rel ?? {})) if (v < 0) neg += -v * 0.5;
  if ((e.res?.povo ?? 0) < 0) neg += -e.res!.povo!;
  if ((e.res?.prestigio ?? 0) < 0) neg += -e.res!.prestigio!;
  return neg;
}

// Custo em Influência para suavizar (reduzir a 25%) as penalidades políticas de uma escolha.
export function softenCost(s: GameState, e: Effect | undefined): number {
  const w = penaltyWeight(e);
  if (w <= 0) return 0;
  const c = Math.ceil(w / 4) * (hasSkill(s, 'mediador') ? 0.7 : 1);
  return Math.max(1, Math.ceil(c));
}

export function applyEffect(s: GameState, e: Effect | undefined, opts: { soften?: boolean; ignoredMode?: boolean; origin?: import('../types').DecisionOrigin } = {}) {
  if (!e) return;
  const posMul = (hasSkill(s, 'carisma') ? 1.25 : 1) * (hasSkill(s, 'sorriso') ? 1.1 : 1);
  const ignoredMul = opts.ignoredMode ? (hasSkill(s, 'arbitro') ? 0.5 : 1) * (hasSkill(s, 'clemencia') ? 0.75 : 1) : 1;
  const negMul = opts.soften ? 0.25 : ignoredMul;
  const scale = (v: number) => Math.round(v >= 0 ? v * posMul : v * negMul);
  const HEARTS = ['elenora', 'rhoswen', 'isolde', 'sigrid', 'clara', 'bianca'];
  const relScale = (c: string, v: number) => (v > 0 && hasSkill(s, 'galanteio') && HEARTS.includes(c) ? Math.round(scale(v) * 1.25) : scale(v));

  if (e.res) {
    for (const [k, v] of Object.entries(e.res) as [keyof Resources, number][]) {
      const val = (k === 'povo' || k === 'prestigio') && v < 0 ? Math.round(v * negMul) : v;
      s.res[k] += val;
      if (BOUNDED.includes(k)) s.res[k] = clamp(s.res[k], 0, 100);
      if (k === 'influencia' || k === 'exercito') s.res[k] = Math.max(0, s.res[k]);
    }
  }
  if (e.loyalty) for (const [h, v] of Object.entries(e.loyalty) as [HouseId, number][]) s.loyalty[h] = clamp(s.loyalty[h] + scale(v), -100, 100);
  if (e.rel) for (const [c, v] of Object.entries(e.rel)) {
    const d = relScale(c, v);
    s.rel[c] = clamp((s.rel[c] ?? 0) + d, -100, 100);
    echoRel(s, c, d);
  }
  if (e.bond) for (const [c, d] of Object.entries(e.bond)) addBond(s, c, d);
  if (e.mood) applyMood(s, e.mood);
  if (e.clue) for (const c of Array.isArray(e.clue) ? e.clue : [e.clue]) addClue(s, c);
  if (e.power) for (const [c, v] of Object.entries(e.power)) s.council.power[c] = clamp((s.council.power[c] ?? 0) + v, 0, 100);
  if (e.track) for (const [k, v] of Object.entries(e.track)) s.tracks[k] = (s.tracks[k] ?? 0) + v;
  if (e.flags) {
    Object.assign(s.flags, e.flags);
    if (opts.origin) {
      s.flagOrigins ??= {};
      for (const key of Object.keys(e.flags)) s.flagOrigins[key] = opts.origin;
    }
  }
  if (e.schedule) for (const sc of e.schedule) s.scheduled.push({ id: sc.id, day: s.day + sc.in, origin: opts.origin });
  if (e.law && !s.laws.includes(e.law)) {
    s.laws.push(e.law);
    log(s, { icon: 'pergaminho', title: 'Lei aprovada', text: e.law, tone: 'lei' });
    if (hasSkill(s, 'reformador')) s.res.povo = clamp(s.res.povo + 5, 0, 100);
    if (hasSkill(s, 'juiz')) s.res.povo = clamp(s.res.povo + 2, 0, 100);
    if (hasSkill(s, 'codigo')) s.res.prestigio = clamp(s.res.prestigio + 3, 0, 100);
  }
  if (e.log) for (const l of Array.isArray(e.log) ? e.log : [e.log]) log(s, l);
  if (e.xp) addXp(s, Math.round(e.xp * moodXpMul(s)));
  e.run?.(s);
}

export function houseName(h: string) {
  return HOUSES[h as HouseId]?.name ?? h;
}

// ---------- persistência ----------
export function save(s: GameState) {
  s.savedAt = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    /* armazenamento indisponível: o jogo segue sem salvar */
  }
  cloudSave(s);
}

// Grava um save vindo de fora (nuvem) sem reenviá-lo.
export function storeLocal(s: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    /* ignora */
  }
}

export function load(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignora */
  }
}
