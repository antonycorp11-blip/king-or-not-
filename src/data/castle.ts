import type { FloorId, RoomId } from '../types';

// O castelo como mapa: cômodos, andares e portas. Posições em coordenadas do
// cenário top-down (1280x720). Cada porta leva a outro cômodo e define onde o rei
// aparece do outro lado.
export interface ExitDef {
  to: RoomId;
  label: string;
  x: number; // ponto onde o rei atravessa
  y: number;
}

export interface RoomDef {
  id: RoomId;
  name: string;
  floor: FloorId;
  desc: string;
  ready: boolean; // cômodo já construído (os demais existem só no mapa, por enquanto)
  exits: ExitDef[];
  walk: [number, number, number, number]; // área caminhável: x0, y0, x1, y1
  spots: Record<string, [number, number]>; // lugares onde as pessoas ficam
  ambience: string; // chave de música/atmosfera
}

export const FLOOR_NAMES: Record<FloorId, string> = {
  superior: 'Andar superior', principal: 'Andar principal', inferior: 'Subsolo', exterior: 'Pátio e arredores',
};

export const ROOMS: Record<RoomId, RoomDef> = {
  quarto: {
    id: 'quarto', name: 'Quarto do Rei', floor: 'superior', ready: true, ambience: 'quarto',
    desc: 'A cama grande demais que foi do seu pai. A escrivaninha dele ainda está trancada.',
    exits: [
      { to: 'salao', label: 'Escadaria real', x: 640, y: 628 },
      { to: 'aposentos', label: 'Aposentos reais', x: 1150, y: 430 },
    ],
    walk: [150, 250, 1130, 640],
    spots: { cama: [580, 360], escrivaninha: [930, 400], janela: [640, 280], lareira: [330, 600], porta: [640, 600] },
  },
  aposentos: {
    id: 'aposentos', name: 'Aposentos Reais', floor: 'superior', ready: true, ambience: 'aposentos',
    desc: 'Os quartos da família: da rainha, da rainha-mãe e do príncipe Lucas, ao longo de um corredor com vista para o jardim.',
    exits: [{ to: 'quarto', label: 'Quarto do Rei', x: 130, y: 430 }],
    walk: [140, 250, 1140, 640],
    spots: { rainha: [880, 360], penteadeira: [1030, 330], mae: [420, 370], lucas: [640, 520], mesa: [640, 400], varanda: [640, 290] },
  },
  salao: {
    id: 'salao', name: 'Salão do Trono', floor: 'principal', ready: true, ambience: 'salao',
    desc: 'Onde o reino vem pedir, ameaçar e agradecer.',
    exits: [
      { to: 'quarto', label: 'Escadaria real', x: 150, y: 470 },
      { to: 'conselho', label: 'Sala do Conselho', x: 1130, y: 470 },
      { to: 'patio', label: 'Portões do pátio', x: 640, y: 612 },
    ],
    walk: [112, 215, 1168, 612],
    spots: { trono: [640, 330], janela: [210, 250], lateral: [1000, 450] },
  },
  conselho: {
    id: 'conselho', name: 'Sala do Conselho', floor: 'principal', ready: true, ambience: 'conselho',
    desc: 'A mesa longa, as cinco cadeiras e, embutida no tampo, a Mesa das Chaves.',
    exits: [{ to: 'salao', label: 'Salão do Trono', x: 130, y: 470 }],
    walk: [140, 250, 1140, 640],
    spots: {
      cabeceira: [1010, 420], chanceler: [790, 330], tesoureiro: [600, 330], marechal: [410, 330],
      sussurros: [790, 540], guardiao: [600, 540], mapa: [300, 470], janela: [640, 280],
    },
  },
  patio: {
    id: 'patio', name: 'Pátio e Quartel', floor: 'exterior', ready: true, ambience: 'patio',
    desc: 'Areia de treino, bonecos de palha, o portão da cidade e o cheiro de cavalo.',
    exits: [
      { to: 'salao', label: 'Salão do Trono', x: 640, y: 250 },
      { to: 'capela', label: 'Capela', x: 1150, y: 440 },
    ],
    walk: [120, 240, 1160, 640],
    spots: { treino: [420, 440], armas: [230, 360], portao: [640, 600], estabulo: [980, 560], quartel: [1000, 330] },
  },
  capela: {
    id: 'capela', name: 'Capela Real', floor: 'exterior', ready: true, ambience: 'capela',
    desc: 'Velas, bancos gastos e a estátua da Senhora dos Carvalhos. Aqui a corte finge rezar e realmente conversa.',
    exits: [{ to: 'patio', label: 'Pátio', x: 130, y: 470 }],
    walk: [140, 250, 1140, 640],
    spots: { altar: [640, 300], bancos: [520, 470], nicho: [980, 360], confessionario: [260, 380] },
  },
  // Ainda não construídos: existem no mapa e na arquitetura.
  tesouro: { id: 'tesouro', name: 'Sala do Tesouro', floor: 'inferior', ready: false, ambience: 'subsolo', desc: 'Cofres, livros-caixa e Corvin.', exits: [], walk: [140, 250, 1140, 640], spots: {} },
  masmorra: { id: 'masmorra', name: 'Masmorras', floor: 'inferior', ready: false, ambience: 'masmorra', desc: 'Prisioneiros, correntes e confissões.', exits: [], walk: [140, 250, 1140, 640], spots: {} },
  cozinha: { id: 'cozinha', name: 'Cozinhas', floor: 'inferior', ready: false, ambience: 'subsolo', desc: 'Sálvio, Bianca e todos os boatos do castelo.', exits: [], walk: [140, 250, 1140, 640], spots: {} },
  arquivos: { id: 'arquivos', name: 'Arquivos Reais', floor: 'inferior', ready: false, ambience: 'subsolo', desc: 'Leis antigas, genealogias e a cópia original da Lei das Cinco Chaves.', exits: [], walk: [140, 250, 1140, 640], spots: {} },
  jardim: { id: 'jardim', name: 'Jardim Interno', floor: 'exterior', ready: false, ambience: 'jardim', desc: 'Sebes, uma fonte e encontros que ninguém devia ver.', exits: [], walk: [140, 250, 1140, 640], spots: {} },
  estabulos: { id: 'estabulos', name: 'Estábulos', floor: 'exterior', ready: false, ambience: 'patio', desc: 'Cavalos, caçadas e fugas.', exits: [], walk: [140, 250, 1140, 640], spots: {} },
};

export const ROOM_IDS = Object.keys(ROOMS) as RoomId[];
export const READY_ROOMS = ROOM_IDS.filter((r) => ROOMS[r].ready);
export const TRAVEL_HOURS = 0.25; // cada porta atravessada: 15 minutos

// Caminho mais curto entre dois cômodos (em portas atravessadas)
export function roomRoute(from: RoomId, to: RoomId): RoomId[] | null {
  if (from === to) return [from];
  const prev = new Map<RoomId, RoomId>();
  const queue: RoomId[] = [from];
  const seen = new Set<RoomId>([from]);
  while (queue.length) {
    const cur = queue.shift()!;
    for (const e of ROOMS[cur].exits) {
      if (seen.has(e.to) || !ROOMS[e.to].ready) continue;
      seen.add(e.to);
      prev.set(e.to, cur);
      if (e.to === to) {
        const path: RoomId[] = [to];
        let k: RoomId | undefined = cur;
        while (k) { path.unshift(k); k = prev.get(k); }
        return path;
      }
      queue.push(e.to);
    }
  }
  return null;
}

// Onde o rei aparece ao entrar em "to" vindo de "from": junto à porta de volta.
export function entryPoint(from: RoomId, to: RoomId): [number, number] {
  const back = ROOMS[to].exits.find((e) => e.to === from);
  if (!back) return ROOMS[to].spots.porta ?? [640, 470];
  const [x0, y0, x1, y1] = ROOMS[to].walk;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  // um passo para dentro, em direção ao centro
  const dx = Math.sign(cx - back.x) * (Math.abs(cx - back.x) > 60 ? 70 : 0);
  const dy = Math.sign(cy - back.y) * (Math.abs(cy - back.y) > 60 ? 60 : 0);
  return [back.x + dx, back.y + dy];
}
