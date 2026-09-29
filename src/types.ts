// Tipos centrais do jogo. Todo conteúdo (eventos, livros, casas) é dado tipado.

export type HouseId = 'valmont' | 'drakon' | 'seren' | 'montclair';
export type RealmId = 'coroa' | HouseId | 'norhelm' | 'veridian';
export type ProvinceId = 'castelmar' | 'costa' | 'vale' | 'bosques' | 'montanhas' | 'hjalmgard' | 'fiorde' | 'passo';
export type Good = 'graos' | 'madeira' | 'ferro' | 'peixe' | 'vinho' | 'prata';
export type Attr = 'diplomacia' | 'estrategia' | 'comercio' | 'intriga' | 'carisma' | 'justica';
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
  ageYears?: number;
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
  // --- expansão v2 ---
  bond?: Record<string, Partial<Bond>>; // camadas da relação (amor, confiança...)
  mood?: MoodDelta; // o que a decisão fez com o rei por dentro
  clue?: string | string[]; // pistas da conspiração descobertas
  power?: Record<string, number>; // poder político de conselheiros
  track?: Record<string, number>; // trilhas de longo prazo (dívida Valmont, oficiais Drakon...)
}

// ======================= EXPANSÃO v2: o rei dentro do castelo =======================

// Castelo
export type RoomId =
  | 'quarto' | 'aposentos' | 'salao' | 'conselho' | 'patio' | 'capela'
  | 'tesouro' | 'masmorra' | 'cozinha' | 'arquivos' | 'jardim' | 'estabulos' | 'biblioteca';
export type FloorId = 'superior' | 'principal' | 'inferior' | 'exterior';

export interface CastleState {
  room: RoomId;
  x: number; // posição do rei no cômodo (coordenadas 1280x720)
  y: number;
  seated: boolean; // sentado no trono (só no salão)
  visitedToday: RoomId[];
  lastEncounter?: Partial<Record<RoomId, number>>; // dia do último encontro em cada cômodo
}

// Agenda
export type AppointmentKind = 'conselho' | 'audiencia' | 'julgamento' | 'diplomacia' | 'jantar' | 'banquete' | 'treino' | 'religioso' | 'familia' | 'investigacao' | 'viagem';
export type AppointmentState = 'pendente' | 'feito' | 'atrasado' | 'faltou' | 'cancelado';

export interface Appointment {
  uid: number;
  kind: AppointmentKind;
  title: string;
  room: RoomId;
  hour: number; // início
  duration: number; // horas
  who: string[]; // participantes
  importance: 1 | 2 | 3;
  mandatory?: boolean;
  eventId?: string; // o que acontece quando o rei comparece
  matterId?: string; // reunião do conselho
  state: AppointmentState;
  note?: string; // o que acontece se faltar
}

// Conselho
export type CouncilSeatId = 'chanceler' | 'tesoureiro' | 'marechal' | 'sussurros' | 'guardiao';

export interface CouncilState {
  seats: Record<CouncilSeatId, string | null>;
  power: Record<string, number>; // 0..100 poder político acumulado de cada conselheiro
  delegated: Record<string, number>; // decisões tomadas sem o rei
  ignored: Record<string, number>; // vezes em que foi voto vencido
  queue: string[]; // assuntos aguardando reunião
  decided: string[]; // assuntos já decididos (não voltam)
  lastMeeting?: number;
}

// Relações profundas
export interface Bond {
  amor: number; // 0..100
  confianca: number; // 0..100
  ressentimento: number; // 0..100
  medo: number; // 0..100
  lealdade: number; // 0..100
}

// Humor do rei (o jogador não escolhe; ele acontece)
export type MoodLabel = 'sereno' | 'satisfeito' | 'esperancoso' | 'cansado' | 'preocupado' | 'triste' | 'irritado' | 'furioso' | 'abalado';
export interface MoodState {
  joy: number; // −100..100
  anger: number; // 0..100
  stress: number; // 0..100
  fatigue: number; // 0..100
  memo: { day: number; text: string }[]; // de onde veio o humor (para o diário)
}
export interface MoodDelta { joy?: number; anger?: number; stress?: number; fatigue?: number; why?: string }

// A grande conspiração
export type KeyHolder = 'coroa' | 'pacto' | 'duvida';
export interface ConspiracyState {
  clues: string[]; // pistas descobertas
  members: string[]; // quem está no pacto (oculto do jogador)
  exposed: string[]; // membros que o rei desmascarou
  turned: string[]; // membros que viraram informantes
  prep: Record<string, number>; // preparação para a queda (reservas, rota de fuga, tropas ocultas...)
  fallDay?: number;
  stage: number; // 0 sementes · 1 recrutamento · 2 chaves · 3 sinais · 4 golpe · 5 queda
}

// Dinastia
export interface DynastyMember {
  id: string;
  name: string;
  sex: 'm' | 'f';
  born?: number; // dia de nascimento (undefined = ainda por nascer)
  due?: number; // dia previsto do parto
  mother?: string;
  alive: boolean;
}

export type CampaignPhase = 'reinado' | 'queda' | 'exilio' | 'reconquista' | 'segundo_reinado';

export interface Req {
  knowledge?: string;
  attr?: [Attr, number];
  ouro?: number;
  influencia?: number;
  test?: (s: GameState) => boolean;
  label?: string; // texto exibido quando bloqueado
  mood?: MoodLabel[]; // só disponível nesses humores
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
  tension?: number; // mudança dramática da tensão, além dos efeitos políticos
  who?: string; // quem propôs esta saída (retrato no botão: conselheiro, acompanhante)
  seat?: CouncilSeatId; // posição de uma cadeira do conselho
  outburst?: boolean; // resposta nascida do humor do rei
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

export type EventKind = 'audiencia' | 'urgente' | 'familia' | 'conselho' | 'casamento' | 'noite' | 'encontro' | 'reuniao' | 'atividade' | 'conversa';

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
  cause?: string; // flag cuja decisão originou esta consequência
  followup?: boolean; // desdobramento que deve entrar antes dos pedidos aleatórios
  // --- expansão v2 ---
  domain?: CouncilSeatId | 'pessoal'; // quem governa isto quando o rei não governa ('pessoal' = ninguém)
  room?: RoomId; // encontros: onde acontece
  hoursWindow?: [number, number]; // encontros: entre que horas
  present?: string[]; // encontros: quem mais aparece em cena
  council?: { lead: CouncilSeatId; positions: Partial<Record<CouncilSeatId, CouncilPosition>> };
}

export interface CouncilPosition {
  argument: Txt; // o que o conselheiro defende na mesa
  choice: Choice;
}

export interface DecisionOrigin {
  day: number;
  event: string;
  decision: string;
}

// Cartas: recados que chegam ao rei sem audiência (não gastam horas)
export interface LetterDef {
  id: string;
  from: string; // personagem
  subject: string;
  text: Txt;
  choices?: Choice[]; // respostas possíveis (só efeitos, sem continuação)
  day?: number;
  minDay?: number;
  maxDay?: number;
  cond?: (s: GameState) => boolean;
  weight?: number;
  repeat?: number;
}

export interface Letter {
  uid: number;
  defId: string;
  day: number;
  read: boolean;
  answer?: number; // índice da resposta escolhida
  reply?: string;
}

export interface Audience {
  uid: number;
  eventId: string;
  expires: number; // último dia em que pode ser atendida
  arrive?: number; // hora em que a pessoa chega ao castelo (padrão 8h)
  done: boolean;
  origin?: DecisionOrigin;
}

export interface TradeRoute {
  id: number;
  from: ProvinceId;
  to: ProvinceId | 'veridian' | 'celeiro';
  good: Good;
  escort?: boolean; // escolta contra bandidos
}

export interface Work { province: ProvinceId; name: string; ready: number } // obra em andamento

export interface WarTerritory {
  id: ProvinceId;
  owner: 'rei' | 'inimigo';
  units: number;
}

export interface WarState {
  enemy: 'norhelm' | HouseId;
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
  // --- v2 ---
  phase: CampaignPhase;
  castle: CastleState;
  agenda: Appointment[];
  council: CouncilState;
  bonds: Record<string, Bond>;
  mood: MoodState;
  conspiracy: ConspiracyState;
  dynasty: DynastyMember[];
  tracks: Record<string, number>;
  activitiesToday: string[];
  readUsed?: Record<string, number[]>; // trechos já lidos de cada livro
  readScore?: Record<string, [number, number]>; // acertos e tentativas de leitura por livro
  market?: Partial<Record<Good, number>>; // multiplicador de preço de cada mercadoria
  marketHist?: Partial<Record<Good, number[]>>;
  granary?: number; // sacas de grão no celeiro real
  routeBlock?: Record<number, { until: number; why: string }>;
  works?: Work[];
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
  scheduled: { id: string; day: number; origin?: DecisionOrigin }[];
  flagOrigins?: Record<string, DecisionOrigin>;
  seen: Record<string, number>;
  log: LogEntry[];
  dayStart?: { res: Resources; loyalty: Record<HouseId, number> };
  history: DaySummary[];
  spouse?: string;
  war?: WarState;
  nextUid: number;
  savedAt?: number;
  letters?: Letter[];
  summoned?: Record<string, number>; // último dia em que cada personagem foi convocado // quando foi salvo (para comparar com o save da nuvem)
  ended?: { kind: 'derrota' | 'fimAto'; title: string; text: string };
}
