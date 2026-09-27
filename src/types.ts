// Tipos centrais do jogo. Todo conteúdo (eventos, livros, casas) é dado tipado.

export type HouseId = 'valmont' | 'drakon' | 'seren' | 'montclair';
export type RealmId = 'coroa' | HouseId | 'norhelm' | 'veridian';
export type ProvinceId = 'castelmar' | 'costa' | 'vale' | 'bosques' | 'montanhas' | 'hjalmgard' | 'fiorde' | 'passo';
export type Good = 'graos' | 'madeira' | 'ferro' | 'peixe' | 'vinho' | 'prata';
export type Attr = 'diplomacia' | 'estrategia' | 'comercio' | 'intriga';
export type Tone = 'bom' | 'ruim' | 'neutro' | 'rumor' | 'lei';
export type ChoiceColor = 'azul' | 'dourado' | 'vermelho' | 'roxo' | 'verde';
export type ScreenId = 'trono' | 'provincias' | 'biblioteca' | 'rei' | 'corte' | 'guerra';
export type TaxLevel = 'baixo' | 'normal' | 'alto';
export type FlagVal = boolean | number | string;

export interface Resources {
  ouro: number;
  influencia: number;
  prestigio: number; // 0..100
  povo: number; // 0..100 satisfação do povo
  exercito: number; // soldados do exército real
  moral: number; // 0..100
}

export interface Look {
  female: boolean;
  skin: string;
  hair: string;
  hairStyle: 'longo' | 'curto' | 'coque' | 'careca' | 'tranca' | 'ondulado' | 'desgrenhado';
  eyes: string;
  outfit: string;
  trim: string;
  beard?: 'cheia' | 'curta' | 'bigode';
  head?: 'coroa' | 'tiara' | 'elmo' | 'capuz' | 'diadema';
  age?: 'jovem' | 'adulto' | 'velho';
  fur?: boolean;
  armor?: boolean;
  accessory?: 'leque' | 'pergaminho' | 'livro' | 'lanca';
}

export interface Character {
  id: string;
  name: string;
  title: string;
  realm: RealmId;
  look: Look;
  traits?: string[]; // palavras exibidas no estandarte (ex.: Alianças, Comércio)
  base?: string; // usa a arte de outro personagem (ex.: cavaleiro genérico)
  tint?: string; // recolore as roupas neutras com a cor da casa
}

export interface LogEntry {
  icon: string;
  title: string;
  text: string;
  delta?: string;
  tone: Tone;
}

export interface Effect {
  res?: Partial<Resources>;
  loyalty?: Partial<Record<HouseId, number>>;
  rel?: Record<string, number>;
  flags?: Record<string, FlagVal>;
  schedule?: { id: string; in: number }[];
  xp?: number;
  law?: string;
  log?: LogEntry | LogEntry[];
  run?: (s: GameState) => void;
}

export interface Req {
  knowledge?: string;
  attr?: [Attr, number];
  ouro?: number;
  influencia?: number;
  test?: (s: GameState) => boolean;
  label?: string; // texto exibido quando bloqueado
}

export interface Choice {
  label: string;
  sub: string;
  color: ChoiceColor;
  icon: string;
  req?: Req;
  effects?: Effect;
  reply?: Txt; // reação do interlocutor
  goto?: string; // continua o diálogo em outro nó (sem custo extra de tempo)
}

export type Txt = string | ((s: GameState) => string);

export interface DialogNode {
  speaker?: string;
  text: Txt;
  choices: Choice[];
  // conselho de quem está ao lado do trono (rainha-mãe, chanceler ou rainha)
  advice?: Partial<Record<string, Advice>>;
}

export interface Advice {
  text: Txt; // o que o conselheiro sussurra
  choice: Choice; // a nova saída que ele oferece
}

export type EventKind = 'audiencia' | 'urgente' | 'familia' | 'conselho' | 'casamento';

export interface GameEvent {
  id: string;
  speaker: string;
  topic: string;
  kind: EventKind;
  hours?: number;
  nodes: { start: DialogNode; [k: string]: DialogNode };
  day?: number; // dia fixo (roteiro)
  minDay?: number;
  maxDay?: number;
  cond?: (s: GameState) => boolean;
  weight?: number; // eventos aleatórios
  repeat?: number; // pode voltar após N dias (senão, único)
  lasts?: number; // dias que fica pendente (padrão 1)
  ignored?: Effect & { text: string };
}

export interface Audience {
  uid: number;
  eventId: string;
  expires: number; // último dia em que pode ser atendida
  arrive?: number; // hora em que a pessoa chega ao castelo (padrão 8h)
  done: boolean;
}

export interface TradeRoute {
  id: number;
  from: ProvinceId;
  to: ProvinceId | 'veridian';
  good: Good;
}

export interface WarTerritory {
  id: ProvinceId;
  owner: 'rei' | 'inimigo';
  units: number;
}

export interface WarState {
  enemy: 'norhelm' | 'drakon';
  turn: number;
  lastTurnDay: number;
  territories: WarTerritory[];
  reinforcements: number;
  moveUsed: boolean;
  log: string[];
  result?: 'vitoria' | 'derrota' | 'paz';
}

export interface DaySummary {
  day: number;
  entries: LogEntry[];
}

export interface GameState {
  version: number;
  seed: number;
  kingName: string;
  day: number;
  hour: number;
  res: Resources;
  loyalty: Record<HouseId, number>; // -100..100
  rel: Record<string, number>; // -100..100 por personagem
  flags: Record<string, FlagVal>;
  knowledge: string[];
  bookProgress: Record<string, number>;
  xp: number;
  skillPoints: number;
  skills: string[];
  laws: string[];
  taxes: Record<HouseId | 'coroa', TaxLevel>;
  routes: TradeRoute[];
  investments: Partial<Record<ProvinceId, number>>;
  audiences: Audience[];
  scheduled: { id: string; day: number }[];
  seen: Record<string, number>;
  log: LogEntry[];
  dayStart?: { res: Resources; loyalty: Record<HouseId, number> };
  history: DaySummary[];
  spouse?: string;
  war?: WarState;
  nextUid: number;
  savedAt?: number; // quando foi salvo (para comparar com o save da nuvem)
  ended?: { kind: 'derrota' | 'fimAto'; title: string; text: string };
}
