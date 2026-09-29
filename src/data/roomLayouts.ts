import type { RoomId } from '../types';

// Onde fica cada peça de arte em cada cômodo (coordenadas do cenário 1280x720).
// x = centro; y = linha do pé (móveis), topo (peças de parede) ou centro (tapetes).
// w = largura desenhada; a altura sai da proporção da arte.
export interface Place {
  p: string;
  x: number;
  y: number;
  w: number;
  wall?: boolean; // pendurado na parede do fundo, atrás de todos
  floor?: boolean; // colado no chão, embaixo de todos (tapetes, lápides)
  solid?: boolean; // bloqueia a passagem (padrão: sim)
  flip?: boolean;
  light?: number; // raio de luz (velas, lareiras)
  base?: number; // fração da altura que ocupa o chão (colisão); padrão 0.45
}

export interface RoomLayout {
  floor: string; // textura do piso
  tile: number; // tamanho do ladrilho desenhado
  wall?: string; // textura da parede do fundo
  exterior?: boolean;
  patches?: { tex: string; x: number; y: number; w: number; h: number }[]; // caminhos de cascalho etc.
  tint?: string; // escurecer (masmorra)
  places: Place[];
}

const W = (p: string, x: number, y: number, w: number, light?: number): Place => ({ p, x, y, w, wall: true, light });
const F = (p: string, x: number, y: number, w: number): Place => ({ p, x, y, w, floor: true });

export const ROOM_LAYOUTS: Partial<Record<RoomId, RoomLayout>> = {
  quarto: { floor: 'tex_carvalho', tile: 192, wall: 'tex_parede', places: [
    F('tapete_leao', 640, 470, 250),
    W('janela_azul', 200, 32, 86, 150), W('janela_azul', 1080, 32, 86, 150),
    W('bandeira_vermelha', 470, 36, 56), W('bandeira_vermelha', 810, 36, 56),
    { p: 'lareira_leao', x: 640, y: 214, w: 190, light: 200, base: 0.3 },
    { p: 'cama_rei', x: 350, y: 450, w: 182, base: 0.8 },
    { p: 'criado_mudo', x: 218, y: 300, w: 50, light: 60 },
    { p: 'criado_mudo', x: 482, y: 300, w: 50 },
    { p: 'bau_rei', x: 350, y: 500, w: 92 },
    { p: 'guarda_roupa', x: 1150, y: 300, w: 100 },
    { p: 'escrivaninha_rei', x: 900, y: 320, w: 150, light: 70 },
    { p: 'poltrona_rei', x: 900, y: 392, w: 58 },
    { p: 'candelabro_alto', x: 770, y: 262, w: 48, light: 130 },
    { p: 'manto_coroa', x: 1080, y: 590, w: 70 },
    { p: 'lavatorio', x: 160, y: 620, w: 66 },
    { p: 'planta_vaso', x: 160, y: 500, w: 70 },
    { p: 'poltrona_rei', x: 520, y: 330, w: 56 },
  ] },
  aposentos: { floor: 'tex_parquet', tile: 160, wall: 'tex_parede', places: [
    F('tapete_rosa', 640, 440, 220),
    W('janela_rosa', 330, 32, 84, 140), W('janela_rosa', 950, 32, 84, 140),
    W('prateleira_parede', 640, 62, 150), W('arandela', 490, 88, 46, 90), W('arandela', 790, 88, 46, 90),
    { p: 'cama_rainha', x: 1010, y: 410, w: 196, base: 0.75 },
    { p: 'penteadeira', x: 1150, y: 260, w: 104 },
    { p: 'banquinho', x: 1150, y: 292, w: 34, solid: false },
    { p: 'biombo', x: 790, y: 262, w: 110 },
    { p: 'mesa_cha', x: 640, y: 480, w: 92 },
    { p: 'poltrona_creme', x: 548, y: 478, w: 62 },
    { p: 'poltrona_creme', x: 732, y: 478, w: 62, flip: true },
    { p: 'harpa', x: 480, y: 300, w: 62 },
    { p: 'guarda_roupa_branco', x: 200, y: 300, w: 92 },
    { p: 'comoda', x: 318, y: 300, w: 80 },
    { p: 'vaso_rosas', x: 1160, y: 580, w: 56 },
    { p: 'cama_principe', x: 250, y: 630, w: 92, base: 0.7 },
    { p: 'candelabro', x: 890, y: 580, w: 44, light: 110 },
  ] },
  conselho: { floor: 'tex_carvalho', tile: 192, wall: 'tex_parede', places: [
    F('tapete_azul', 640, 450, 300),
    W('janela_azul', 380, 32, 84, 140), W('janela_azul', 900, 32, 84, 140),
    W('bandeira_azul', 640, 34, 70), W('arandela', 520, 92, 44, 90), W('arandela', 760, 92, 44, 90),
    { p: 'mesa_conselho', x: 640, y: 505, w: 440, base: 0.75 },
    { p: 'mesa_mapa', x: 240, y: 620, w: 220, light: 60 },
    { p: 'globo', x: 1130, y: 300, w: 56 },
    { p: 'armario_documentos', x: 150, y: 300, w: 92 },
    { p: 'estante_baixa', x: 1110, y: 620, w: 96 },
    { p: 'estandarte_pe', x: 250, y: 262, w: 46 },
    { p: 'estandarte_pe', x: 1030, y: 262, w: 46 },
    { p: 'candelabro_alto', x: 330, y: 420, w: 46, light: 120 },
    { p: 'candelabro_alto', x: 950, y: 420, w: 46, light: 120 },
  ] },
  biblioteca: { floor: 'tex_carvalho', tile: 192, wall: 'tex_parede', places: [
    F('tapete_leao', 640, 470, 210),
    W('janela_azul', 640, 32, 84, 150), W('arandela', 500, 92, 44, 90), W('arandela', 780, 92, 44, 90),
    { p: 'estante_grande', x: 290, y: 250, w: 250, base: 0.35 },
    { p: 'estante_grande', x: 990, y: 250, w: 250, base: 0.35 },
    { p: 'estante_escada', x: 1160, y: 380, w: 86 },
    { p: 'estante_escada', x: 120, y: 380, w: 86, flip: true },
    { p: 'mesa_leitura', x: 640, y: 490, w: 230, light: 120, base: 0.7 },
    { p: 'escrivaninha_pequena', x: 910, y: 590, w: 96, light: 60 },
    { p: 'globo', x: 410, y: 590, w: 62 },
    { p: 'atril', x: 790, y: 330, w: 64 },
    { p: 'poltrona_leitura', x: 470, y: 330, w: 58 },
    { p: 'pilha_livros', x: 1110, y: 620, w: 48 },
    { p: 'pilha_livros2', x: 320, y: 630, w: 44 },
    { p: 'cesto_pergaminhos', x: 1010, y: 630, w: 50 },
    { p: 'candelabro_alto', x: 180, y: 620, w: 46, light: 120 },
  ] },
  arquivos: { floor: 'tex_carvalho', tile: 176, wall: 'tex_parede', tint: '#0b0a1440', places: [
    W('tocha', 420, 70, 28, 110), W('tocha', 860, 70, 28, 110),
    { p: 'estante_pergaminhos', x: 140, y: 270, w: 92 }, { p: 'estante_pergaminhos', x: 250, y: 270, w: 92 },
    { p: 'estante_pergaminhos', x: 1030, y: 270, w: 92 }, { p: 'estante_pergaminhos', x: 1140, y: 270, w: 92 },
    { p: 'gaveteiro_mapas', x: 420, y: 480, w: 130 },
    { p: 'mesa_escriba', x: 850, y: 480, w: 112, light: 90 },
    { p: 'armario_documentos', x: 150, y: 600, w: 88 },
    { p: 'cesto_pergaminhos', x: 1110, y: 620, w: 50 },
    { p: 'pilha_livros', x: 620, y: 610, w: 44 },
    { p: 'candelabro', x: 640, y: 380, w: 44, light: 120 },
  ] },
  capela: { floor: 'tex_marmore', tile: 192, wall: 'tex_parede', places: [
    F('passadeira_v', 640, 450, 92),
    W('vitral', 400, 32, 78, 130), W('vitral', 880, 32, 78, 130),
    { p: 'altar', x: 640, y: 292, w: 150, light: 130, base: 0.35 },
    { p: 'estatua_senhora', x: 470, y: 276, w: 58 },
    { p: 'velas_votivas', x: 820, y: 272, w: 88, light: 100 },
    { p: 'banco_igreja', x: 460, y: 410, w: 200 }, { p: 'banco_igreja', x: 820, y: 410, w: 200 },
    { p: 'banco_igreja', x: 460, y: 490, w: 200 }, { p: 'banco_igreja', x: 820, y: 490, w: 200 },
    { p: 'banco_igreja', x: 460, y: 570, w: 200 }, { p: 'banco_igreja', x: 820, y: 570, w: 200 },
    { p: 'confessionario', x: 180, y: 330, w: 118 },
    { p: 'pulpito', x: 1090, y: 330, w: 108 },
    F('lapide', 1090, 470, 150),
    { p: 'pia_batismal', x: 1100, y: 630, w: 54 },
    { p: 'entrada_cripta', x: 210, y: 640, w: 90 },
    { p: 'candelabro_alto', x: 330, y: 330, w: 44, light: 120 },
    { p: 'candelabro_alto', x: 950, y: 330, w: 44, light: 120 },
  ] },
  cozinha: { floor: 'tex_cozinha', tile: 192, wall: 'tex_parede', places: [
    W('panelas_parede', 640, 66, 210), W('tocha', 420, 70, 28, 90), W('tocha', 860, 70, 28, 90),
    { p: 'lareira_cozinha', x: 250, y: 266, w: 210, light: 220, base: 0.35 },
    { p: 'forno', x: 1010, y: 256, w: 130, light: 120, base: 0.4 },
    { p: 'prateleira_potes', x: 700, y: 256, w: 104 },
    { p: 'mesa_preparo', x: 480, y: 450, w: 190, base: 0.6 },
    { p: 'mesa_banquete', x: 820, y: 480, w: 190, light: 60, base: 0.6 },
    { p: 'caldeirao', x: 160, y: 460, w: 80, light: 90 },
    { p: 'barris', x: 1130, y: 620, w: 110 },
    { p: 'sacos_grao', x: 170, y: 630, w: 100 },
    { p: 'caixote_legumes', x: 300, y: 640, w: 70 },
    { p: 'cesto_paes', x: 610, y: 610, w: 60 },
    { p: 'balde', x: 430, y: 630, w: 42 },
  ] },
  tesouro: { floor: 'tex_pedra', tile: 192, wall: 'tex_parede', tint: '#0b0a1428', places: [
    W('tocha', 300, 70, 28, 110), W('tocha', 980, 70, 28, 110), W('bandeira_vermelha', 460, 36, 52), W('bandeira_vermelha', 820, 36, 52),
    { p: 'ouro_grande', x: 340, y: 510, w: 230, light: 70, base: 0.7 },
    { p: 'ouro_medio', x: 930, y: 530, w: 180, base: 0.7 },
    { p: 'ouro_pouco', x: 640, y: 620, w: 120, solid: false },
    { p: 'coroa_pedestal', x: 640, y: 430, w: 72, light: 100 },
    { p: 'bau_aberto', x: 180, y: 330, w: 110 },
    { p: 'bau_grande', x: 1090, y: 330, w: 112 },
    { p: 'bau_fechado', x: 1110, y: 620, w: 80 },
    { p: 'prateleira_ouro', x: 860, y: 262, w: 160 },
    { p: 'mesa_moedas', x: 420, y: 290, w: 180, light: 60 },
    { p: 'saco1', x: 180, y: 620, w: 50 }, { p: 'saco2', x: 240, y: 632, w: 40 }, { p: 'saco3', x: 1180, y: 470, w: 34 },
  ] },
  masmorra: { floor: 'tex_pedra', tile: 160, wall: 'tex_parede', tint: '#06081260', places: [
    W('correntes', 470, 56, 50), W('correntes', 810, 56, 50), W('tocha', 150, 70, 28, 120), W('tocha', 1130, 70, 28, 120),
    { p: 'cela', x: 290, y: 250, w: 200, base: 0.25 },
    { p: 'cela', x: 990, y: 250, w: 200, base: 0.25 },
    { p: 'cama_palha', x: 260, y: 420, w: 120, solid: false },
    { p: 'tronco', x: 930, y: 470, w: 110 },
    { p: 'mesa_chaves', x: 640, y: 520, w: 100, light: 100 },
    { p: 'porta_cela', x: 1150, y: 480, w: 84 },
    { p: 'porta_cela', x: 130, y: 480, w: 84, flip: true },
  ] },
  patio: { floor: 'tex_calcada', tile: 192, exterior: true, places: [
    W('muralha', 160, 6, 250), W('muralha', 400, 6, 250), W('muralha', 880, 6, 250), W('muralha', 1120, 6, 250),
    W('portaria', 640, 0, 260),
    { p: 'torre', x: 50, y: 240, w: 100 }, { p: 'torre', x: 1230, y: 240, w: 100 },
    { p: 'suporte_armas', x: 350, y: 300, w: 120 },
    { p: 'boneco_treino', x: 330, y: 430, w: 56 }, { p: 'boneco_treino', x: 450, y: 450, w: 56 },
    { p: 'alvo', x: 300, y: 580, w: 80 },
    { p: 'braseiro_tripe', x: 560, y: 330, w: 44, light: 110 },
    { p: 'mastro', x: 760, y: 300, w: 58 },
    { p: 'poco', x: 640, y: 470, w: 92 },
    { p: 'tenda', x: 990, y: 380, w: 170 },
    { p: 'forja', x: 1030, y: 560, w: 150, light: 90 },
    { p: 'carroca', x: 790, y: 580, w: 118 },
    { p: 'bebedouro', x: 480, y: 640, w: 140 },
    { p: 'fardos_feno', x: 620, y: 640, w: 96 },
  ] },
  jardim: { floor: 'tex_grama', tile: 160, exterior: true,
    patches: [{ tex: 'tex_cascalho', x: 590, y: 170, w: 100, h: 500 }, { tex: 'tex_cascalho', x: 60, y: 430, w: 1160, h: 90 }],
    places: [
      W('sebe_h', 160, 150, 200), W('sebe_h', 400, 150, 200), W('sebe_h', 880, 150, 200), W('sebe_h', 1120, 150, 200),
      { p: 'arco_rosas', x: 640, y: 262, w: 118, solid: false },
      { p: 'arvore', x: 170, y: 340, w: 150 },
      { p: 'canteiro_ret', x: 400, y: 370, w: 150 }, { p: 'canteiro_ret', x: 880, y: 370, w: 150 },
      { p: 'banco_jardim', x: 470, y: 420, w: 100 }, { p: 'banco_jardim', x: 810, y: 420, w: 100 },
      { p: 'poste_luz', x: 560, y: 410, w: 34, light: 100 }, { p: 'poste_luz', x: 720, y: 410, w: 34, light: 100 },
      { p: 'fonte', x: 640, y: 640, w: 150, base: 0.6 },
      { p: 'lago_cisnes', x: 1010, y: 650, w: 230, base: 0.7 },
      { p: 'canteiro_redondo', x: 300, y: 620, w: 100 },
      { p: 'topiaria', x: 470, y: 640, w: 42 }, { p: 'topiaria', x: 810, y: 640, w: 42 },
      { p: 'sebe_v', x: 1190, y: 420, w: 42 }, { p: 'arvore', x: 1130, y: 330, w: 130 },
    ] },
  estabulos: { floor: 'tex_calcada', tile: 176, exterior: true, places: [
    W('muralha', 160, 6, 250), W('muralha', 400, 6, 250), W('muralha', 640, 6, 250), W('muralha', 880, 6, 250), W('muralha', 1120, 6, 250),
    { p: 'baia_cavalo', x: 250, y: 330, w: 180 }, { p: 'baia_vazia', x: 460, y: 330, w: 180 },
    { p: 'baia_cavalo', x: 670, y: 330, w: 180, flip: true }, { p: 'baia_vazia', x: 880, y: 330, w: 180 },
    { p: 'cavalo_branco', x: 1010, y: 540, w: 44 },
    { p: 'suporte_selas', x: 220, y: 570, w: 140 },
    F('feno_solto', 470, 560, 130),
    { p: 'cocho', x: 700, y: 580, w: 130 },
    { p: 'fardos_feno', x: 1120, y: 330, w: 100 },
    { p: 'barris', x: 1150, y: 630, w: 90 },
  ] },
};
