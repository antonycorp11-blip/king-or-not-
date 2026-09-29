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
    exits: [{ to: 'salao', label: 'Escadaria real', x: 640, y: 630 }, { to: 'aposentos', label: 'Aposentos reais', x: 1150, y: 430 }],
    walk: [110, 215, 1170, 640],
    spots: { cama: [540, 470], escrivaninha: [900, 440], janela: [640, 300], lareira: [640, 290], porta: [640, 600] },
  },
  aposentos: {
    id: 'aposentos', name: 'Aposentos Reais', floor: 'superior', ready: true, ambience: 'aposentos',
    desc: 'Os quartos da família: da rainha, da rainha-mãe e do príncipe Lucas.',
    exits: [{ to: 'quarto', label: 'Quarto do Rei', x: 130, y: 430 }, { to: 'jardim', label: 'Escada do jardim', x: 640, y: 630 }],
    walk: [110, 215, 1170, 640],
    spots: { rainha: [1000, 490], penteadeira: [1100, 330], mae: [430, 400], lucas: [380, 600], mesa: [640, 540], varanda: [640, 290] },
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
    spots: { trono: [640, 330], janela: [210, 250], lateral: [1000, 450], porta: [560, 560] },
  },
  conselho: {
    id: 'conselho', name: 'Sala do Conselho', floor: 'principal', ready: true, ambience: 'conselho',
    desc: 'A mesa longa, as cinco cadeiras e, embutida no tampo, a Mesa das Chaves.',
    exits: [
      { to: 'salao', label: 'Salão do Trono', x: 130, y: 470 },
      { to: 'biblioteca', label: 'Biblioteca', x: 1150, y: 470 },
      { to: 'tesouro', label: 'Escada do tesouro', x: 640, y: 630 },
    ],
    walk: [110, 215, 1170, 640],
    spots: {
      cabeceira: [900, 470], chanceler: [580, 335], tesoureiro: [700, 335], marechal: [470, 335],
      sussurros: [580, 560], guardiao: [700, 560], mapa: [260, 540], janela: [640, 290],
    },
  },
  biblioteca: {
    id: 'biblioteca', name: 'Biblioteca Real', floor: 'principal', ready: true, ambience: 'biblioteca',
    desc: 'Estantes até o teto, o cheiro de papel velho e Theodric vigiando cada página.',
    exits: [{ to: 'conselho', label: 'Sala do Conselho', x: 130, y: 470 }, { to: 'arquivos', label: 'Escada dos arquivos', x: 640, y: 630 }],
    walk: [110, 215, 1170, 640],
    spots: { estante: [640, 330], mesa: [640, 560], leitura: [470, 400], atril: [790, 400] },
  },
  arquivos: {
    id: 'arquivos', name: 'Arquivos Reais', floor: 'inferior', ready: true, ambience: 'subsolo',
    desc: 'Leis antigas, genealogias e a cópia original da Lei das Cinco Chaves.',
    exits: [{ to: 'biblioteca', label: 'Biblioteca', x: 640, y: 250 }],
    walk: [110, 215, 1170, 640],
    spots: { escriba: [850, 540], estantes: [640, 330], mapas: [420, 540] },
  },
  tesouro: {
    id: 'tesouro', name: 'Sala do Tesouro', floor: 'inferior', ready: true, ambience: 'subsolo',
    desc: 'Cofres, livros-caixa e o brilho de um reino que nunca tem ouro suficiente.',
    exits: [{ to: 'conselho', label: 'Sala do Conselho', x: 640, y: 250 }],
    walk: [110, 215, 1170, 640],
    spots: { mesa: [420, 350], cofres: [640, 330], coroa: [640, 500] },
  },
  patio: {
    id: 'patio', name: 'Pátio e Quartel', floor: 'exterior', ready: true, ambience: 'patio',
    desc: 'Areia de treino, bonecos de palha, o portão da cidade e o cheiro de cavalo.',
    exits: [
      { to: 'salao', label: 'Salão do Trono', x: 640, y: 250 },
      { to: 'jardim', label: 'Jardim', x: 1150, y: 330 },
      { to: 'capela', label: 'Capela', x: 1150, y: 520 },
      { to: 'cozinha', label: 'Cozinhas', x: 130, y: 330 },
      { to: 'estabulos', label: 'Estábulos', x: 130, y: 520 },
      { to: 'masmorra', label: 'Masmorras', x: 960, y: 630 },
    ],
    walk: [110, 215, 1170, 640],
    spots: { treino: [400, 500], armas: [350, 360], portao: [640, 560], estabulo: [200, 600], quartel: [990, 450] },
  },
  capela: {
    id: 'capela', name: 'Capela Real', floor: 'exterior', ready: true, ambience: 'capela',
    desc: 'Velas, bancos gastos e a estátua da Senhora dos Carvalhos. Aqui a corte finge rezar e realmente conversa.',
    exits: [{ to: 'patio', label: 'Pátio', x: 130, y: 470 }],
    walk: [110, 215, 1170, 640],
    spots: { altar: [640, 360], bancos: [640, 450], nicho: [1090, 400], confessionario: [180, 400] },
  },
  cozinha: {
    id: 'cozinha', name: 'Cozinhas', floor: 'inferior', ready: true, ambience: 'cozinha',
    desc: 'Sálvio, Bianca e todos os boatos do castelo, entre panelas e fumaça.',
    exits: [{ to: 'patio', label: 'Pátio', x: 1150, y: 330 }],
    walk: [110, 215, 1170, 640],
    spots: { fogao: [300, 340], mesa: [480, 510], forno: [1000, 330], banquete: [820, 540] },
  },
  masmorra: {
    id: 'masmorra', name: 'Masmorras', floor: 'inferior', ready: true, ambience: 'masmorra',
    desc: 'Prisioneiros, correntes e confissões que ninguém quer ouvir duas vezes.',
    exits: [{ to: 'patio', label: 'Pátio', x: 640, y: 250 }],
    walk: [110, 215, 1170, 640],
    spots: { guarda: [640, 590], preso: [290, 330], cela2: [990, 330] },
  },
  jardim: {
    id: 'jardim', name: 'Jardim Interno', floor: 'exterior', ready: true, ambience: 'jardim',
    desc: 'Sebes, uma fonte com cisnes e encontros que ninguém devia ver.',
    exits: [{ to: 'aposentos', label: 'Aposentos reais', x: 640, y: 250 }, { to: 'patio', label: 'Pátio', x: 130, y: 470 }],
    walk: [110, 215, 1170, 640],
    spots: { fonte: [640, 520], bancos: [470, 470], roseiras: [880, 440], lago: [1000, 540] },
  },
  estabulos: {
    id: 'estabulos', name: 'Estábulos', floor: 'exterior', ready: true, ambience: 'patio',
    desc: 'Cavalos, selas, feno e o caminho mais rápido para fora do castelo.',
    exits: [{ to: 'patio', label: 'Pátio', x: 1150, y: 470 }],
    walk: [110, 215, 1170, 640],
    spots: { cavalos: [560, 440], selas: [220, 620] },
  },
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
