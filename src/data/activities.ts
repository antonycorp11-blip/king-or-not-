import type { Effect, GameState, RoomId, ScreenId } from '../types';
import { EVENTS } from './events';
import { insight } from '../engine/conspiracy';
import { whereIs } from '../engine/npcs';

const whereIsSpouseHere = (s: GameState) => whereIs(s, s.spouse!)?.room === 'aposentos';

// O que o rei pode fazer por iniciativa própria em cada lugar.
// Atividades abrem pequenas histórias (eventos 'atividade') ou mudam o dia do rei.
export interface ActivityDef {
  id: string;
  room: RoomId;
  label: string;
  sub: string;
  icon: string;
  hours: number;
  cond?: (s: GameState) => boolean;
  perDay?: boolean; // só uma vez por dia
  once?: string; // flag que, marcada, esconde a atividade para sempre
  effects?: Effect;
  rest?: boolean; // conta como descanso para o humor
  event?: string | ((s: GameState) => string | undefined); // história que se abre
  screen?: ScreenId; // leva a uma tela de gestão
  special?: 'dormir' | 'sentar' | 'cadeiras' | 'conselhoExtra' | 'caderno' | 'lerJuntos';
  toast?: string;
}

// Próxima variação não vista de uma série (mesma lógica da agenda)
function series(prefix: string) {
  return (s: GameState) => {
    const pool = EVENTS.filter((e) => e.id.startsWith(prefix) && (!e.cond || e.cond(s)) && (!e.minDay || s.day >= e.minDay));
    const unseen = pool.filter((e) => s.seen[e.id] === undefined);
    return (unseen[0] ?? pool.sort((a, b) => (s.seen[a.id] ?? 0) - (s.seen[b.id] ?? 0))[0])?.id;
  };
}

export const ACTIVITIES: ActivityDef[] = [
  // Quarto do Rei
  { id: 'dormir', room: 'quarto', label: 'Deitar e encerrar o dia', sub: 'Resumo do dia', icon: 'selo', hours: 0, special: 'dormir' },
  { id: 'descansar', room: 'quarto', label: 'Descansar', sub: '1 hora · alivia o cansaço', icon: 'ampulheta', hours: 1, perDay: true, rest: true, effects: { mood: { fatigue: -35, stress: -8, anger: -10 } }, toast: 'Você fecha os olhos por uma hora. O reino continua lá quando abre.' },
  { id: 'escrivaninha', room: 'quarto', label: 'A escrivaninha do meu pai', sub: 'Trancada desde o enterro', icon: 'cadeado', hours: 0.5, once: 'diarioPai', event: 'escrivaninha_pai', cond: (s) => s.day >= 3 },
  { id: 'ler', room: 'quarto', label: 'Ler antes de dormir', sub: 'Livros da biblioteca, à luz de vela', icon: 'livro', hours: 0, screen: 'biblioteca', cond: (s) => s.hour >= 16 },
  { id: 'caderno', room: 'quarto', label: 'Caderno do Rei', sub: 'Suspeitas e anotações', icon: 'livro', hours: 0, special: 'caderno' },
  // Aposentos
  { id: 'varanda', room: 'aposentos', label: 'Tomar ar na varanda', sub: '30 min · vista do jardim', icon: 'flor', hours: 0.5, perDay: true, rest: true, effects: { mood: { stress: -10, joy: 4 } }, toast: 'Lá embaixo, o jardim. Mais longe, a cidade. Mais longe ainda, tudo o que você governa.' },
  { id: 'lerJuntos', room: 'aposentos', label: 'Ler junto com a rainha', sub: 'Um livro a dois', icon: 'coracao', hours: 0, special: 'lerJuntos', perDay: true, cond: (s) => !!s.spouse && whereIsSpouseHere(s) },
  // Salão
  { id: 'sentar', room: 'salao', label: 'Sentar no trono', sub: 'Receber a fila de audiências', icon: 'coroa', hours: 0, special: 'sentar', cond: (s) => !s.castle.seated },
  { id: 'biblioteca', room: 'salao', label: 'Ir à biblioteca', sub: 'Ler e estudar', icon: 'livro', hours: 0, screen: 'biblioteca' },
  { id: 'correio', room: 'salao', label: 'Casas, pessoas e correio', sub: 'Convocar e responder cartas', icon: 'pergaminho', hours: 0, screen: 'corte' },
  // Conselho
  { id: 'cadeiras', room: 'conselho', label: 'As cinco cadeiras', sub: 'Nomear e demitir conselheiros', icon: 'escudo', hours: 0, special: 'cadeiras' },
  { id: 'extra', room: 'conselho', label: 'Convocar conselho extraordinário', sub: '1 hora · −5 influência', icon: 'selo', hours: 0, special: 'conselhoExtra', perDay: true, cond: (s) => s.res.influencia >= 5 },
  { id: 'mapa', room: 'conselho', label: 'Mapa de guerra', sub: 'Exército e fronteiras', icon: 'espadas', hours: 0, screen: 'guerra' },
  { id: 'provincias', room: 'conselho', label: 'Mapa das províncias', sub: 'Comércio, impostos e escassez', icon: 'castelo', hours: 0, screen: 'provincias' },
  { id: 'mesa_chaves', room: 'conselho', label: 'Examinar a Mesa das Chaves', sub: '30 min', icon: 'olho', hours: 0.5, event: 'mesa_chaves_ev', cond: (s) => s.day >= 12 && !s.conspiracy.clues.includes('mesa_chaves') },
  // Pátio
  { id: 'treinar', room: 'patio', label: 'Treinar com a guarda', sub: '1 hora · descarrega a raiva', icon: 'espadas', hours: 1, perDay: true, event: series('treino_') },
  { id: 'cacar', room: 'patio', label: 'Sair para caçar', sub: '3 horas', icon: 'lobo', hours: 3, perDay: true, event: series('caca_'), cond: (s) => s.hour <= 15 && (!s.war || !!s.war.result) },
  { id: 'cidade', room: 'patio', label: 'Descer à cidade disfarçado', sub: '2 horas', icon: 'povo', hours: 2, perDay: true, event: series('cidade_'), cond: (s) => s.hour <= 17 },
  { id: 'inspecionar', room: 'patio', label: 'Inspecionar o quartel', sub: '1 hora · moral', icon: 'escudo', hours: 1, perDay: true, effects: { res: { moral: 3 }, mood: { fatigue: 6 } }, toast: 'Você passa pelas fileiras, lembra dois nomes e elogia uma bota. A moral sobe.' },
  // Capela
  { id: 'rezar', room: 'capela', label: 'Rezar em silêncio', sub: '30 min · alivia a angústia', icon: 'estrela', hours: 0.5, perDay: true, rest: true, effects: { mood: { stress: -18, joy: 4 } }, toast: 'Você não sabe bem para quem reza. Mas o peito aperta menos.' },
  { id: 'cripta', room: 'capela', label: 'Esconder ouro na cripta', sub: '−100 ouro · reserva secreta', icon: 'moedas', hours: 1, perDay: true, cond: (s) => s.res.ouro >= 100 && (insight(s) >= 20 || s.day >= 30), effects: { res: { ouro: -100 }, run: (s) => { s.conspiracy.prep.reservas = (s.conspiracy.prep.reservas ?? 0) + 100; } }, toast: 'Cem moedas descansam agora sob a lápide do seu bisavô. Ninguém viu. Você acha.' },
];

export function activitiesIn(s: GameState, room: RoomId): ActivityDef[] {
  return ACTIVITIES.filter((a) => a.room === room && (!a.cond || a.cond(s)) && !(a.once && s.flags[a.once]) && !(a.perDay && s.activitiesToday.includes(a.id)));
}
