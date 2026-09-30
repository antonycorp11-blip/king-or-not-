import type { FloorId, RoomId } from '../types';

// O CASTELO COMO UM MAPA SÓ. Todos os cômodos existem ao mesmo tempo, lado a lado,
// separados por paredes grossas e ligados por portas. O rei anda de um para o outro;
// a câmera o acompanha. Coordenadas em pixels do mundo (personagem ≈ 100 px de altura).
//
//   ┌───────────┬──────────────┬───────────┐ ┌───────┐
//   │ Biblioteca│              │           │ │Salão de│
//   ├───────────┤ Salão do     │ Conselho  ├─┤Banque-│
//   │ Arquivos  │ Trono        │           │ │ tes   │
//   ├───────────┴──────┬───────┴───────────┤ ├───────┤
//   │                                      │ │ Jardim│
//   │        Galeria Real (tapete vermelho)│ │       │
//   ├───────┬──────┬───┴──┬───────┬────────┤ │       │
//   │Cozinha│Tesour│Entrad│Quarto │Aposent.│ │       │
//   ╞═══════╧══════╧══╤═══╧═══════╧════════╡ │       │   ← muralha
//   │Masmorra│Estábulos│ Pátio      │Capela│ │       │
//   └────────┴─────────┴────────────┴──────┘ └───────┘

export const WORLD_W = 4200;
export const WORLD_H = 3000;
export const WALL = 40; // espessura das paredes vistas de cima

export interface RoomDef {
  id: RoomId;
  name: string;
  floor: FloorId;
  desc: string;
  ready: boolean;
  rect: [number, number, number, number]; // x, y, w, h no mundo
  face: number; // altura da parede do fundo (0 = ao ar livre)
  exterior?: boolean;
  spots: Record<string, [number, number]>; // lugares nomeados, em coordenadas locais do cômodo
  ambience: string;
}

export const FLOOR_NAMES: Record<FloorId, string> = {
  superior: 'Ala norte', principal: 'Coração do castelo', inferior: 'Ala sul', exterior: 'Fora da muralha',
};

export const ROOMS: Record<RoomId, RoomDef> = {
  biblioteca: { id: 'biblioteca', name: 'Biblioteca Real', floor: 'superior', ready: true, ambience: 'biblioteca', rect: [40, 40, 1000, 640], face: 140,
    desc: 'Estantes até o teto, o cheiro de papel velho e Theodric vigiando cada página.',
    spots: { estante: [500, 300], mesa: [500, 560], leitura: [330, 520], atril: [840, 560] } },
  arquivos: { id: 'arquivos', name: 'Arquivos Reais', floor: 'superior', ready: true, ambience: 'subsolo', rect: [40, 720, 1000, 320], face: 100,
    desc: 'Leis antigas, genealogias e a cópia original da Lei das Cinco Chaves.',
    spots: { escriba: [640, 290], estantes: [180, 290], mapas: [380, 290] } },
  salao: { id: 'salao', name: 'Salão do Trono', floor: 'superior', ready: true, ambience: 'salao', rect: [1080, 40, 1040, 1000], face: 150,
    desc: 'Onde o reino vem pedir, ameaçar e agradecer.',
    spots: { trono: [520, 262], fala: [520, 470], fila1: [380, 900], fila2: [660, 900], lateral: [860, 700], janela: [200, 700], companheiro: [640, 300], porta: [520, 960] } },
  conselho: { id: 'conselho', name: 'Sala do Conselho', floor: 'superior', ready: true, ambience: 'conselho', rect: [2160, 40, 1000, 1000], face: 150,
    desc: 'A mesa longa, as cinco cadeiras e, embutida no tampo, a Mesa das Chaves.',
    spots: { cabeceira: [800, 520], marechal: [380, 400], chanceler: [500, 400], tesoureiro: [620, 400], sussurros: [440, 640], guardiao: [560, 640], mapa: [200, 860], janela: [500, 300] } },
  galeria: { id: 'galeria', name: 'Galeria Real', floor: 'principal', ready: true, ambience: 'salao', rect: [40, 1080, 3120, 280], face: 100,
    desc: 'O corredor que liga tudo. Quem passa por aqui é visto por todo mundo.',
    spots: { centro: [1560, 220], oeste: [500, 220], leste: [2600, 220] } },
  cozinha: { id: 'cozinha', name: 'Cozinhas', floor: 'inferior', ready: true, ambience: 'cozinha', rect: [40, 1400, 760, 720], face: 140,
    desc: 'Sálvio, Bianca e todos os boatos do castelo, entre panelas e fumaça.',
    spots: { fogao: [210, 330], mesa: [360, 480], forno: [620, 320], banquete: [520, 600] } },
  tesouro: { id: 'tesouro', name: 'Sala do Tesouro', floor: 'inferior', ready: true, ambience: 'subsolo', rect: [840, 1400, 560, 720], face: 140,
    desc: 'Cofres, livros-caixa e o brilho de um reino que nunca tem ouro suficiente.',
    spots: { mesa: [280, 360], cofres: [280, 520], coroa: [280, 620] } },
  entrada: { id: 'entrada', name: 'Grande Entrada', floor: 'inferior', ready: true, ambience: 'salao', rect: [1440, 1400, 440, 720], face: 140,
    desc: 'O vestíbulo por onde o reino entra no castelo. A escadaria desce para o pátio.',
    spots: { porta: [220, 300], centro: [220, 460] } },
  quarto: { id: 'quarto', name: 'Quarto do Rei', floor: 'inferior', ready: true, ambience: 'quarto', rect: [1920, 1400, 640, 720], face: 140,
    desc: 'A cama grande demais que foi do seu pai. A escrivaninha dele ainda está trancada.',
    spots: { cama: [380, 470], escrivaninha: [500, 330], lareira: [320, 280], porta: [320, 640] } },
  aposentos: { id: 'aposentos', name: 'Aposentos da Rainha', floor: 'inferior', ready: true, ambience: 'aposentos', rect: [2600, 1400, 560, 720], face: 140,
    desc: 'Os quartos da família: da rainha, da rainha-mãe e do príncipe Lucas.',
    spots: { rainha: [380, 480], penteadeira: [460, 300], mae: [150, 330], lucas: [140, 620], mesa: [280, 560], varanda: [280, 280] } },
  masmorra: { id: 'masmorra', name: 'Masmorras', floor: 'exterior', ready: true, ambience: 'masmorra', rect: [40, 2200, 600, 760], face: 140,
    desc: 'Prisioneiros, correntes e confissões que ninguém quer ouvir duas vezes.',
    spots: { guarda: [300, 600], preso: [150, 330], cela2: [450, 330] } },
  estabulos: { id: 'estabulos', name: 'Estábulos', floor: 'exterior', ready: true, ambience: 'patio', rect: [680, 2200, 720, 760], face: 0, exterior: true,
    desc: 'Cavalos, selas, feno e o caminho mais rápido para fora do castelo.',
    spots: { cavalos: [360, 420], selas: [140, 650] } },
  patio: { id: 'patio', name: 'Pátio e Quartel', floor: 'exterior', ready: true, ambience: 'patio', rect: [1440, 2200, 1120, 760], face: 0, exterior: true,
    desc: 'Areia de treino, bonecos de palha, o portão da cidade e o cheiro de cavalo.',
    spots: { treino: [300, 380], armas: [180, 250], portao: [560, 680], quartel: [880, 380], estabulo: [120, 560] } },
  capela: { id: 'capela', name: 'Capela Real', floor: 'exterior', ready: true, ambience: 'capela', rect: [2600, 2200, 560, 760], face: 140,
    desc: 'Velas, bancos gastos e a estátua da Senhora dos Carvalhos. Aqui a corte finge rezar e realmente conversa.',
    spots: { altar: [280, 330], bancos: [280, 520], nicho: [470, 320], confessionario: [90, 330] } },
  banquete: { id: 'banquete', name: 'Salão de Banquetes', floor: 'superior', ready: true, ambience: 'salao', rect: [3240, 40, 920, 1000], face: 150,
    desc: 'Onde a corte almoça e janta. Quem senta perto do rei, quem senta longe: tudo aqui é recado.',
    spots: { rei: [500, 450], mesa1: [240, 560], mesa2: [680, 560], mesa3: [240, 760], mesa4: [680, 760], servico: [820, 330], porta: [470, 930] } },
  jardim: { id: 'jardim', name: 'Jardim Interno', floor: 'exterior', ready: true, ambience: 'jardim', rect: [3240, 1080, 920, 1880], face: 0, exterior: true,
    desc: 'Sebes, uma fonte com cisnes e encontros que ninguém devia ver.',
    spots: { fonte: [460, 470], bancos: [300, 640], roseiras: [640, 330], lago: [600, 1180], topo: [460, 120], sebes: [700, 1000] } },
};

// Portas: vãos na parede entre dois cômodos (retângulo no mundo)
export interface DoorDef { a: RoomId; b: RoomId; rect: [number, number, number, number]; kind?: 'portao' | 'escada' }
export const DOORS: DoorDef[] = [
  { a: 'biblioteca', b: 'arquivos', rect: [480, 680, 120, 40] },
  { a: 'arquivos', b: 'galeria', rect: [480, 1040, 120, 40] },
  { a: 'biblioteca', b: 'salao', rect: [1040, 440, 40, 130] },
  { a: 'salao', b: 'galeria', rect: [1500, 1040, 200, 40] },
  { a: 'salao', b: 'conselho', rect: [2120, 440, 40, 130] },
  { a: 'conselho', b: 'galeria', rect: [2600, 1040, 130, 40] },
  { a: 'conselho', b: 'banquete', rect: [3160, 560, 80, 130] },
  { a: 'banquete', b: 'jardim', rect: [3620, 1040, 180, 40] },
  { a: 'galeria', b: 'jardim', rect: [3160, 1180, 80, 130] },
  { a: 'galeria', b: 'cozinha', rect: [360, 1360, 130, 40] },
  { a: 'galeria', b: 'tesouro', rect: [1060, 1360, 130, 40] },
  { a: 'galeria', b: 'entrada', rect: [1560, 1360, 200, 40] },
  { a: 'galeria', b: 'quarto', rect: [2180, 1360, 130, 40] },
  { a: 'galeria', b: 'aposentos', rect: [2820, 1360, 130, 40] },
  { a: 'aposentos', b: 'jardim', rect: [3160, 1760, 80, 130] },
  { a: 'entrada', b: 'patio', rect: [1580, 2120, 160, 80], kind: 'portao' },
  { a: 'patio', b: 'estabulos', rect: [1400, 2480, 40, 130] },
  { a: 'estabulos', b: 'masmorra', rect: [640, 2480, 40, 130] },
  { a: 'patio', b: 'capela', rect: [2560, 2480, 40, 130] },
  { a: 'capela', b: 'jardim', rect: [3160, 2480, 80, 130] },
];

export const ROOM_IDS = Object.keys(ROOMS) as RoomId[];
export const READY_ROOMS = ROOM_IDS;
export const WALK_HOURS = 0.08; // cada cômodo atravessado: uns 5 minutos

// Ponto do mundo a partir de um lugar nomeado (ou do centro do cômodo)
export function worldPoint(room: RoomId, spot?: string, index = 0): [number, number] {
  const R = ROOMS[room];
  const [x, y, w, h] = R.rect;
  const p = spot ? R.spots[spot] : undefined;
  // várias pessoas no mesmo lugar: lado a lado, depois uma fileira atrás
  if (p) return [x + p[0] + [0, 46, -46, 92, -92][index % 5], y + p[1] + Math.floor(index / 5) * 36];
  const cols = [0.3, 0.7, 0.45, 0.6, 0.2, 0.8];
  return [Math.round(x + w * cols[index % cols.length]), Math.round(y + Math.max(R.face + 60, h * (index % 2 ? 0.7 : 0.55)))];
}

export function roomAt(x: number, y: number): RoomId | null {
  for (const id of ROOM_IDS) {
    const [rx, ry, rw, rh] = ROOMS[id].rect;
    if (x >= rx && x < rx + rw && y >= ry && y < ry + rh) return id;
  }
  return null;
}

// Rota entre cômodos (para calcular tempo e "onde fica")
export function roomRoute(from: RoomId, to: RoomId): RoomId[] | null {
  if (from === to) return [from];
  const prev = new Map<RoomId, RoomId>();
  const q: RoomId[] = [from];
  const seen = new Set<RoomId>([from]);
  while (q.length) {
    const c = q.shift()!;
    for (const d of DOORS) {
      const n = d.a === c ? d.b : d.b === c ? d.a : null;
      if (!n || seen.has(n)) continue;
      seen.add(n); prev.set(n, c);
      if (n === to) { const path: RoomId[] = [to]; let k: RoomId | undefined = c; while (k) { path.unshift(k); k = prev.get(k); } return path; }
      q.push(n);
    }
  }
  return null;
}

// Área onde se pode andar: o chão de cada cômodo abaixo da parede do fundo, mais as portas
export function walkRects(): [number, number, number, number][] {
  const out: [number, number, number, number][] = ROOM_IDS.map((id) => { const R = ROOMS[id]; const [x, y, w, h] = R.rect; return [x + 12, y + R.face + 30, w - 24, h - R.face - 42]; });
  for (const d of DOORS) {
    const [x, y, w, h] = d.rect;
    const A = ROOMS[d.a].rect, B = ROOMS[d.b].rect;
    if (h > w) {
      // porta numa parede lateral: liga o chão de um cômodo ao do outro
      const [L, R] = A[0] < B[0] ? [A, B] : [B, A];
      out.push([L[0] + L[2] - 20, y + 20, R[0] - (L[0] + L[2]) + 40, h - 40]);
    } else {
      // porta na parede de baixo: atravessa também a parede do fundo do cômodo de baixo
      const [T, D] = A[1] < B[1] ? [d.a, d.b] : [d.b, d.a];
      const top = ROOMS[T].rect[1] + ROOMS[T].rect[3] - 40;
      const bottom = ROOMS[D].rect[1] + ROOMS[D].face + 60;
      out.push([x + 10, top, w - 20, bottom - top]);
    }
  }
  return out;
}

// compatibilidade com a interface antiga (nome usado em telas e agenda)
export const TRAVEL_HOURS = WALK_HOURS;
