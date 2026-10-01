import type { GameState, RoomId } from '../types';
import { EVIDENCE_MAP, type SuspectId, SUSPECTS } from '../data/investigation';
import { inv, nextFor, discover } from './investigation';
import { clamp, rand } from './core';
import { char } from '../data/characters';

// AS NOITES DO BOBO
// Pimenta sempre entrega o relatório depois das 20h, num lugar secreto. Às
// vezes ele traz mais que um papel: um plano para aquela mesma noite.
//  · seguir: alguém vai encontrar alguém; o rei segue sem ser visto e escuta
//  · procurar: revirar um cômodo antes que a ronda volte
//  · armadilha: uma isca na galeria; quem vier buscá-la se entrega

export type NightOpKind = 'seguir' | 'procurar' | 'armadilha';
export interface NightOp {
  day: number;
  kind: NightOpKind;
  target: SuspectId;
  contact?: string;
  room: RoomId; // onde a coisa acontece (destino de quem é seguido, cômodo revirado, galeria da isca)
  evId?: string; // o que o rei ganha se der certo
  go?: boolean; // o rei aceitou
  done?: 'ok' | 'falhou' | 'desistiu';
}

// Lugares secretos dos encontros com Pimenta (giram a cada relatório)
export const MEET_ROOMS: { room: RoomId; where: string }[] = [
  { room: 'capela', where: 'na capela, atrás do confessionário' },
  { room: 'jardim', where: 'no jardim, junto da fonte' },
  { room: 'cozinha', where: 'nas cozinhas, perto do forno ainda quente' },
  { room: 'estabulos', where: 'nos estábulos, entre os fardos de feno' },
  { room: 'arquivos', where: 'nos arquivos, entre as estantes mais altas' },
  { room: 'masmorra', where: 'nas masmorras, onde ninguém desce à noite' },
  { room: 'biblioteca', where: 'na biblioteca, atrás do atril' },
];

export function nextMeet(s: GameState) {
  const n = Number(s.flags._meetN ?? 0);
  s.flags._meetN = n + 1;
  return MEET_ROOMS[(n + Math.floor(rand(s) * 3)) % MEET_ROOMS.length];
}

const HOME: Record<SuspectId, RoomId> = { corvin: 'tesouro', brandt: 'patio', isabelle: 'aposentos', otho: 'galeria', aldric: 'arquivos' };
const CONTACT: Record<SuspectId, string> = { corvin: 'gaspard', brandt: 'sir_ferrao', isabelle: 'aldric', otho: 'sir_picoalto', aldric: 'sombra' };
const SECRET_PLACES: RoomId[] = ['capela', 'jardim', 'masmorra', 'estabulos', 'cozinha'];
const slotsOf = (t: SuspectId) => [`alibi_${t}`, `seg_${t}`, `contra_${t}`, `motivo_${t}`, 'pagamento', 'metodo'];

// O que ganhar seguindo/vasculhando/esperando este suspeito
function prize(s: GameState, t: SuspectId) {
  return nextFor(s, slotsOf(t), 3)?.id;
}

export function planNightOp(s: GameState): NightOp | null {
  const I = inv(s);
  const free = SUSPECTS.filter((t) => I.accused?.id !== t && I.fled !== t && prize(s, t));
  if (!free.length) return null;
  const r = rand(s);
  // armadilha: quem está mais atento cai mais fácil
  if (r < 0.28) {
    const hot = [...free].sort((a, b) => I.heat[b] - I.heat[a])[0];
    return { day: s.day, kind: 'armadilha', target: hot, room: 'galeria', evId: prize(s, hot) };
  }
  const t = free[Math.floor(rand(s) * free.length)];
  if (r < 0.62) return { day: s.day, kind: 'procurar', target: t, room: HOME[t], evId: prize(s, t) };
  const dest = SECRET_PLACES.filter((x) => x !== HOME[t])[Math.floor(rand(s) * 4)];
  return { day: s.day, kind: 'seguir', target: t, contact: CONTACT[t], room: dest, evId: prize(s, t) };
}

// Pimenta só propõe às vezes (e no máximo uma por noite)
export function offerOp(s: GameState): NightOp | null {
  const I = inv(s);
  if (I.offer && I.offer.day === s.day) return 'none' in I.offer ? null : I.offer;
  const op = rand(s) < 0.6 ? planNightOp(s) : null;
  I.offer = op ?? { day: s.day, none: true };
  return op;
}
export function currentOp(s: GameState): NightOp | null {
  const o = inv(s).offer;
  return o && !('none' in o) && o.day === s.day ? o : null;
}

const NAME = (id: string) => char(id).name.replace(/^(Mestre|Lorde|Chanceler|Sir|Lady|Rainha-mãe) /, '');

export function opPitch(op: NightOp): string {
  const t = NAME(op.target);
  switch (op.kind) {
    case 'seguir': return `Pimenta segura seu braço. "Antes de você ir dormir: ${t} vai sair do quarto daqui a pouco. Ouvi a criada dizer que vai encontrar alguém ${op.room === 'capela' ? 'na capela' : op.room === 'jardim' ? 'no jardim' : op.room === 'masmorra' ? 'lá embaixo, nas masmorras' : op.room === 'estabulos' ? 'nos estábulos' : 'nas cozinhas'}. Se a gente seguir sem ser visto, escuta tudo. Regra do bobo: quando ${t} parar e olhar para trás, fique parado perto de um móvel. Parado. Como uma estátua feia."`;
    case 'procurar': return `"Eu não achei o que queria", admite Pimenta. "Mas sei onde está. Nas coisas de ${t}. A ronda passa a cada poucos minutos. Se o senhor revirar comigo agora, temos três chances antes que o guarda volte."`;
    case 'armadilha': return `Pimenta mostra uma carta lacrada, falsa. "Vou deixar isto na galeria, escrito 'O rei sabe'. Quem tem culpa no cartório vem buscar antes do amanhecer. A gente se esconde e vê quem aparece. Parado, Majestade. Se o senhor se mexer quando a pessoa olhar em volta, a armadilha pega a gente."`;
  }
}

// O que se ouve quando dá certo (seguir)
export function overheard(op: NightOp): [string, string][] {
  const t = op.target, c = op.contact ?? 'sombra';
  // Cada um tem algo a esconder; o que se ouve é o segredo, não necessariamente o crime
  const L: Record<SuspectId, [string, string][]> = {
    corvin: [[t, 'As velas desta semana já foram para o porto?'], [c, 'Todas. Seu sobrinho mandou agradecer.'], [t, 'Ninguém pode ver as contas do último inverno.'], [c, 'Cuidado com o bobo, Corvin. Ele fareja.']],
    brandt: [[t, 'Ela vem hoje?'], [c, 'Vem, meu senhor. Como nas noites em que o rei viajava.'], [t, 'O rei não viaja mais. O rei está morto.'], [c, 'Então ninguém mais precisa esconder nada. Ou precisa?']],
    isabelle: [[t, 'Onde eu estava naquela noite não é da conta de ninguém.'], [c, 'O menino vai perguntar, Majestade.'], [t, 'Meu filho não pode saber. Nunca.'], [c, 'Então pare de chorar na capela. As paredes falam.']],
    otho: [[t, 'O homem de Norhelm continua nas minas?'], [c, 'Continua. E quer mais prata.'], [t, 'Todo mundo olha para mim. É conveniente demais.'], [c, 'Enquanto olham para o senhor, não olham para quem deveriam.']],
    aldric: [[t, 'As cinco cadeiras não podem se reunir de novo tão cedo.'], [c, 'O rei menino não sabe da reunião.'], [t, 'Ainda não. E o bobo esteve debaixo daquela mesa.'], [c, 'Então o bobo é o próximo problema.']],
  };
  return L[op.target];
}

// O fim da operação
export function finishOp(s: GameState, op: NightOp, result: 'ok' | 'falhou' | 'desistiu'): { title: string; text: string; ev?: string } {
  const I = inv(s);
  op.done = result;
  const t = NAME(op.target);
  if (result === 'ok') {
    const d = op.evId ? discover(s, op.evId, 'O rei e Pimenta, à noite') : null;
    I.heat[op.target] = clamp(I.heat[op.target] + 4, 0, 100);
    return { title: 'A noite rendeu', text: d ? `Você volta para o quarto com algo na mão: "${d.title}". Pimenta some no escuro, assobiando baixinho.` : `${t} não deixou nada que preste. Mas agora você sabe onde ${t} vai de noite.`, ev: d?.id };
  }
  if (result === 'falhou') {
    I.heat[op.target] = clamp(I.heat[op.target] + 22, 0, 100);
    I.pimenta.danger = clamp(I.pimenta.danger + 10, 0, 100);
    return { title: 'Visto!', text: `${t} viu alguém nas sombras. Talvez não tenha reconhecido o rei. Talvez sim. Daqui para a frente, ${t} vai tomar mais cuidado, e Pimenta corre mais perigo.` };
  }
  return { title: 'Melhor não arriscar', text: 'Você desiste e volta para o quarto. Pimenta dá de ombros: "Fica para outra noite. As paredes não vão a lugar nenhum."' };
}

export const evTitle = (id?: string) => (id ? EVIDENCE_MAP[id]?.title : undefined);
