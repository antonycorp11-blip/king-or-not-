import type { GameState, RoomId } from '../types';

// Rotinas diárias: a partir de que hora a pessoa está em que lugar, fazendo o quê.
// Calculadas por hora do jogo, nunca por quadro. Compromissos e acontecimentos
// passam por cima da rotina (ver engine/npcs.ts).
export type RoutineStep = [hour: number, room: RoomId, spot: string, activity: string];

export interface NpcRoutine {
  id: string;
  steps: RoutineStep[];
  cond?: (s: GameState) => boolean; // quando a pessoa vive no castelo
  alt?: (s: GameState) => RoutineStep[] | null; // variação por circunstância
}

const married = (id: string) => (s: GameState) => s.spouse === id;

export const ROUTINES: NpcRoutine[] = [
  { id: 'aldric', steps: [
    [7, 'arquivos', 'estantes', 'revisando precedentes nos arquivos'],
    [9, 'conselho', 'chanceler', 'preparando os papéis do conselho'],
    [12, 'salao', 'lateral', 'observando as audiências'],
    [15, 'biblioteca', 'mesa', 'escrevendo decretos'],
    [18, 'conselho', 'janela', 'lendo cartas das casas'],
    [21, 'aposentos', '', 'dormindo (dizem que ele não dorme)'],
  ] },
  { id: 'corvin', steps: [
    [7, 'tesouro', 'mesa', 'contando moedas'],
    [9, 'conselho', 'tesoureiro', 'somando as contas do dia'],
    [11, 'tesouro', 'mesa', 'recebendo mercadores'],
    [16, 'salao', 'lateral', 'cobrando alguém educadamente'],
    [18, 'tesouro', 'cofres', 'trancando os cofres (duas vezes)'],
  ] },
  { id: 'aurelian', steps: [
    [6, 'patio', 'treino', 'treinando os recrutas'],
    [10, 'salao', 'lateral', 'vigiando o salão'],
    [13, 'patio', 'quartel', 'no quartel'],
    [16, 'patio', 'portao', 'inspecionando o portão'],
    [19, 'salao', 'lateral', 'dobrando a guarda da noite'],
  ] },
  { id: 'isabelle', steps: [
    [7, 'capela', 'bancos', 'rezando pelo seu pai'],
    [9, 'aposentos', 'mae', 'escrevendo cartas'],
    [12, 'salao', 'janela', 'ouvindo as audiências (e julgando)'],
    [15, 'aposentos', 'varanda', 'na varanda com as damas'],
    [18, 'aposentos', 'mae', 'em seus aposentos'],
  ] },
  { id: 'lucas', steps: [
    [8, 'patio', 'armas', 'fingindo treinar'],
    [11, 'aposentos', 'lucas', 'desenhando mapas de lugares que nunca viu'],
    [14, 'patio', 'estabulo', 'nos estábulos com os cavalos'],
    [17, 'salao', 'janela', 'rondando o salão atrás de novidades'],
    [19, 'aposentos', 'lucas', 'no quarto (ou fingindo estar)'],
  ] },
  { id: 'theodric', steps: [[7, 'biblioteca', 'atril', 'organizando as estantes'], [11, 'arquivos', 'estantes', 'nos arquivos'], [13, 'capela', 'nicho', 'copiando inscrições antigas'], [16, 'biblioteca', 'leitura', 'lendo em voz baixa']] },
  { id: 'pimenta', steps: [
    [8, 'patio', 'portao', 'fazendo malabares para os guardas'],
    [11, 'salao', 'janela', 'imitando os lordes pelas costas'],
    [15, 'cozinha', 'banquete', 'roubando tortas'],
    [18, 'salao', 'lateral', 'ensaiando piadas'],
  ] },
  { id: 'clara', steps: [[8, 'quarto', 'cama', 'arrumando o quarto real'], [10, 'aposentos', 'mesa', 'trocando as flores'], [14, 'cozinha', 'mesa', 'na lavanderia'], [17, 'quarto', 'lareira', 'acendendo a lareira']], cond: (s) => !s.flags.claraFim },
  { id: 'frei_aske', steps: [[7, 'capela', 'altar', 'celebrando a missa'], [11, 'capela', 'confessionario', 'ouvindo confissões'], [15, 'cozinha', 'banquete', '"abençoando" o vinho'], [18, 'capela', 'altar', 'acendendo as velas']] },
  { id: 'irma', steps: [[8, 'capela', 'nicho', 'preparando ervas'], [12, 'patio', 'quartel', 'cuidando de soldados feridos'], [17, 'capela', 'bancos', 'rezando baixinho']] },
  { id: 'sombra', steps: [[8, 'arquivos', 'mapas', 'em lugar nenhum'], [19, 'capela', 'confessionario', 'no confessionário, esperando']], cond: (s) => !!s.flags.sombraContratada },
  // Rainhas: cada casamento traz um castelo diferente.
  { id: 'elenora', cond: married('elenora'), steps: [
    [8, 'aposentos', 'penteadeira', 'lendo cartas do porto'],
    [10, 'tesouro', 'mesa', 'conferindo as contas com Corvin'],
    [13, 'salao', 'janela', 'recebendo mercadores de Valmont'],
    [16, 'aposentos', 'rainha', 'escrevendo para o pai'],
    [18, 'aposentos', 'mesa', 'esperando o jantar'],
  ] },
  { id: 'rhoswen', cond: married('rhoswen'), steps: [
    [6, 'patio', 'treino', 'treinando antes do sol'],
    [10, 'patio', 'quartel', 'revistando a cavalaria'],
    [13, 'conselho', 'mapa', 'estudando o mapa de guerra'],
    [16, 'patio', 'armas', 'afiando a espada'],
    [18, 'aposentos', 'rainha', 'nos aposentos, de botas na mesa'],
  ] },
  { id: 'isolde', cond: married('isolde'), steps: [
    [9, 'aposentos', 'penteadeira', 'respondendo cartas de Véridian'],
    [11, 'jardim', 'fonte', 'caminhando com emissários do sul'],
    [14, 'arquivos', 'estantes', 'nos arquivos, lendo sobre leis antigas'],
    [17, 'salao', 'janela', 'conversando com lordes'],
    [19, 'aposentos', 'rainha', 'em seus aposentos'],
  ] },
  { id: 'sigrid', cond: married('sigrid'), steps: [
    [7, 'estabulos', 'cavalos', 'cuidando dos cavalos do norte'],
    [10, 'aposentos', 'varanda', 'olhando para o norte'],
    [13, 'capela', 'nicho', 'rezando aos deuses do norte, sozinha'],
    [16, 'patio', 'treino', 'ensinando a lutar com machado'],
    [18, 'aposentos', 'rainha', 'nos aposentos, perto da janela aberta'],
  ] },
];

// A criadagem: o castelo nunca está vazio
ROUTINES.push(
  { id: 'criada', steps: [[7, 'quarto', 'cama', 'arrumando a cama real'], [10, 'aposentos', 'mesa', 'tirando o pó'], [13, 'cozinha', 'mesa', 'ajudando na cozinha'], [16, 'biblioteca', 'estante', 'espanando livros'], [18, 'quarto', 'lareira', 'acendendo a lareira']] },
  { id: 'cozinheiro', steps: [[6, 'cozinha', 'fogao', 'mexendo o caldeirão'], [11, 'cozinha', 'mesa', 'cortando legumes'], [15, 'patio', 'portao', 'recebendo carroças de mantimentos'], [17, 'cozinha', 'forno', 'tirando pão do forno']] },
  { id: 'cozinheira', steps: [[6, 'cozinha', 'forno', 'assando pão'], [10, 'cozinha', 'banquete', 'montando as travessas'], [14, 'cozinha', 'fogao', 'brigando com o fogo'], [18, 'cozinha', 'mesa', 'servindo o jantar']] },
  { id: 'jardineiro', steps: [[6, 'jardim', 'roseiras', 'podando as roseiras'], [11, 'jardim', 'lago', 'alimentando os cisnes'], [15, 'jardim', 'bancos', 'varrendo o caminho'], [19, 'estabulos', 'selas', 'guardando as ferramentas']] },
  { id: 'escriba', steps: [[7, 'arquivos', 'escriba', 'copiando registros'], [12, 'biblioteca', 'mesa', 'catalogando livros'], [15, 'arquivos', 'mapas', 'arquivando cartas']] },
  { id: 'pajem', steps: [[7, 'salao', 'porta', 'esperando recados'], [10, 'conselho', 'janela', 'levando papéis ao conselho'], [13, 'patio', 'portao', 'correndo com cartas'], [16, 'salao', 'porta', 'cochilando encostado na parede']] },
  { id: 'sentinela', steps: [[6, 'masmorra', 'guarda', 'vigiando os presos'], [12, 'tesouro', 'coroa', 'guardando os cofres'], [18, 'masmorra', 'guarda', 'no turno da noite']] },
);

export const ROUTINE_MAP: Record<string, NpcRoutine> = Object.fromEntries(ROUTINES.map((r) => [r.id, r]));
