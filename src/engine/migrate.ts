import type { Bond, CastleState, ConspiracyState, CouncilState, GameState, MoodState } from '../types';

// Versões do save. v1: Atos I e II no salão. v2: castelo vivo, agenda, conselho,
// humor, relações profundas, conspiração e dinastia. Saves antigos são completados,
// nunca descartados.
export const SAVE_VERSION = 2;

export function defaultCastle(room: CastleState['room'] = 'quarto'): CastleState {
  return room === 'salao'
    ? { room, x: 640, y: 330, seated: true, visitedToday: ['salao'], lastEncounter: {} }
    : { room, x: 640, y: 470, seated: false, visitedToday: [room], lastEncounter: {} };
}

export function defaultCouncil(): CouncilState {
  return {
    // Os cinco guardiões das chaves herdados do antigo rei.
    seats: { chanceler: 'aldric', tesoureiro: 'corvin', marechal: 'aurelian', sussurros: 'isabelle', guardiao: 'otho' },
    power: { aldric: 32, corvin: 18, aurelian: 16, isabelle: 22, otho: 26 },
    delegated: {},
    ignored: {},
    queue: [],
    decided: [],
  };
}

export function defaultMood(): MoodState {
  return { joy: 5, anger: 0, stress: 30, fatigue: 10, memo: [] };
}

export function defaultConspiracy(): ConspiracyState {
  // Otho já pertence ao Pacto quando o jogo começa. Os outros são recrutados pelas
  // circunstâncias que o próprio rei cria (poder acumulado, ressentimento, casamento).
  return { clues: [], members: ['otho'], exposed: [], turned: [], prep: {}, stage: 0 };
}

const clampB = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

// Perfis iniciais: quem ama, quem teme, quem é leal. Derivados da relação simples
// para personagens sem perfil escrito.
const AUTHORED: Record<string, Partial<Bond>> = {
  isabelle: { amor: 72, confianca: 55, lealdade: 85, medo: 5 },
  lucas: { amor: 78, confianca: 60, lealdade: 70, medo: 5 },
  aldric: { amor: 20, confianca: 50, lealdade: 70, medo: 5 },
  corvin: { amor: 5, confianca: 35, lealdade: 45, medo: 25 },
  aurelian: { amor: 10, confianca: 55, lealdade: 82, medo: 10 },
  otho: { amor: 0, confianca: 30, lealdade: 20, medo: 15 },
  theodric: { amor: 15, confianca: 55, lealdade: 60 },
  sombra: { amor: 0, confianca: 10, lealdade: 15, medo: 5 },
};

export function defaultBond(id: string, rel = 0): Bond {
  const a = AUTHORED[id] ?? {};
  return {
    amor: clampB(a.amor ?? Math.max(0, rel) * 0.5),
    confianca: clampB(a.confianca ?? 35 + rel / 3),
    ressentimento: clampB(a.ressentimento ?? Math.max(0, -rel) / 2),
    medo: clampB(a.medo ?? 10),
    lealdade: clampB(a.lealdade ?? 45 + rel / 3),
  };
}

// Completa qualquer save (v1 ou v2 parcial) com os campos da versão atual.
export function migrate(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as GameState & Record<string, unknown>;
  if (typeof s.version !== 'number' || s.version < 1 || s.version > SAVE_VERSION) return null;
  if (!s.res || !s.loyalty || !s.rel) return null;
  const fromV1 = s.version === 1;
  s.phase ??= 'reinado';
  // Quem vinha de um save antigo estava no salão; continua lá, sentado.
  s.castle ??= defaultCastle(fromV1 ? 'salao' : 'quarto');
  s.castle.visitedToday ??= [s.castle.room];
  s.castle.lastEncounter ??= {};
  s.agenda ??= [];
  s.council ??= defaultCouncil();
  s.council.queue ??= [];
  s.council.decided ??= [];
  s.council.delegated ??= {};
  s.council.ignored ??= {};
  s.bonds ??= {};
  s.mood ??= defaultMood();
  s.mood.memo ??= [];
  s.conspiracy ??= defaultConspiracy();
  s.conspiracy.prep ??= {};
  s.dynasty ??= [];
  s.tracks ??= {};
  s.activitiesToday ??= [];
  s.letters ??= [];
  s.summoned ??= {};
  // Decisões antigas que já significavam algo para a conspiração viram pistas.
  if (fromV1) {
    if (s.flags.conspiracaoRevelada) s.conspiracy.clues.push('cartas_lysandra');
    if (s.flags.segredoOtho) s.conspiracy.clues.push('otho_norte');
    if (s.flags.herdeiro && s.spouse && !s.dynasty.length)
      s.dynasty.push({ id: 'herdeiro1', name: 'Herdeiro', sex: 'm', due: s.day + 30, mother: s.spouse, alive: true });
  }
  s.version = SAVE_VERSION;
  return s;
}
