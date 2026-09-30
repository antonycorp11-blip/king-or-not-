import type { RoomId } from '../types';

// Decoração de cada cômodo, em coordenadas LOCAIS do cômodo (0,0 = canto superior esquerdo).
// x = centro; y = linha do pé (móveis), topo (peças de parede) ou centro (tapetes).
// w = largura desenhada; a altura sai da proporção da arte.
// "hot" transforma o móvel num lugar: tocar nele faz o rei ir até lá e agir.
// Peças "atlas:*" vêm do atlas original do salão (trono, colunas, degraus...).
export interface Place {
  p: string;
  x: number;
  y: number;
  w: number;
  wall?: boolean; // pendurado na parede do fundo
  floor?: boolean; // colado no chão, embaixo de todos
  solid?: boolean; // bloqueia a passagem (padrão: sim)
  flip?: boolean;
  light?: number; // raio de luz
  base?: number; // fração da altura que ocupa o chão (colisão)
  hot?: string[]; // atividades que este lugar oferece
  tile?: [number, number]; // repetir a peça (largura total, altura) — passadeiras, muralhas
}

export interface RoomLayout {
  floor: string;
  tile: number;
  wall?: string;
  tint?: string;
  patches?: { tex: string; x: number; y: number; w: number; h: number }[];
  places: Place[];
}

const W = (p: string, x: number, y: number, w: number, light?: number): Place => ({ p, x, y, w, wall: true, light });
const F = (p: string, x: number, y: number, w: number, hot?: string[]): Place => ({ p, x, y, w, floor: true, solid: false, hot });
const O = (p: string, x: number, y: number, w: number, extra: Partial<Place> = {}): Place => ({ p, x, y, w, ...extra });

export const ROOM_LAYOUTS: Partial<Record<RoomId, RoomLayout>> = {
  // ---------------- ala norte ----------------
  biblioteca: { floor: 'tex_carvalho', tile: 160, wall: 'tex_parede', places: [
    W('janela_azul', 500, 6, 78, 150), W('arandela', 380, 56, 40, 90), W('arandela', 620, 56, 40, 90),
    F('tapete_leao', 500, 440, 230),
    O('estante_grande', 200, 250, 270, { base: 0.3, hot: ['estudar'] }),
    O('estante_grande', 800, 250, 270, { base: 0.3, hot: ['estudar'] }),
    O('busto', 500, 250, 38),
    O('estante_escada', 58, 430, 80, { hot: ['estudar'] }),
    O('estante_escada', 944, 350, 80, { flip: true, hot: ['estudar'] }),
    O('mesa_leitura', 500, 480, 214, { light: 120, base: 0.6, hot: ['estudar'] }),
    O('poltrona_leitura', 350, 470, 52), O('poltrona_leitura', 650, 470, 52, { flip: true }),
    O('globo', 150, 610, 56), O('atril', 850, 610, 58, { hot: ['estudar'] }),
    O('escrivaninha_pequena', 290, 630, 86, { light: 60 }),
    O('pilha_livros', 700, 630, 42), O('pilha_livros2', 750, 636, 36), O('cesto_pergaminhos', 950, 636, 44),
    O('candelabro_alto', 60, 634, 40, { light: 120 }),
  ] },
  arquivos: { floor: 'tex_carvalho', tile: 150, wall: 'tex_parede', tint: '#0b0a1430', places: [
    W('tocha', 300, 26, 22, 110), W('tocha', 700, 26, 22, 110),
    O('estante_pergaminhos', 90, 196, 80), O('estante_pergaminhos', 180, 196, 80),
    O('estante_pergaminhos', 820, 196, 80), O('estante_pergaminhos', 910, 196, 80),
    O('gaveteiro_mapas', 330, 300, 112), O('mesa_escriba', 670, 300, 100, { light: 90, hot: ['pesquisar'] }),
    O('armario_documentos', 960, 300, 64), O('candelabro', 250, 300, 34, { light: 100 }),
  ] },
  salao: { floor: 'tex_pedra', tile: 150, wall: 'tex_parede', places: [
    W('atlas:window', 200, 12, 70, 150), W('atlas:window', 840, 12, 70, 150),
    W('atlas:redBanner', 360, 16, 72), W('atlas:redBanner', 680, 16, 72),
    W('atlas:blueBanner', 90, 30, 48), W('atlas:blueBanner', 950, 30, 48),
    F('atlas:carpet', 520, 630, 160), F('atlas:medallion', 520, 560, 170),
    F('atlas:steps', 520, 284, 400),
    O('atlas:throne', 520, 252, 116, { base: 0.5, hot: ['sentar'] }),
    O('atlas:candles', 390, 262, 54, { light: 130 }), O('atlas:candles', 650, 262, 54, { light: 130 }),
    O('atlas:armor', 290, 300, 46), O('atlas:armor', 750, 300, 46),
    O('atlas:column', 170, 430, 60), O('atlas:column', 870, 430, 60),
    O('atlas:column', 170, 660, 60), O('atlas:column', 870, 660, 60),
    O('atlas:column', 170, 890, 60), O('atlas:column', 870, 890, 60),
    O('atlas:statue', 60, 560, 44), O('atlas:statue', 980, 560, 44),
    O('atlas:plant', 60, 930, 52), O('atlas:plant', 980, 930, 52),
    O('atlas:brazier', 330, 960, 58, { light: 150 }), O('atlas:brazier', 710, 960, 58, { light: 150 }),
    // a corte assiste às audiências dos bancos dos dois lados da passadeira
    O('banco_igreja', 330, 700, 150), O('banco_igreja', 710, 700, 150),
    O('banco_igreja', 330, 800, 150), O('banco_igreja', 710, 800, 150),
    O('armadura', 60, 380, 42), O('armadura', 980, 380, 42, { flip: true }),
    O('estandarte_pe', 60, 790, 40), O('estandarte_pe', 980, 790, 40),
    O('mesinha_vaso', 300, 470, 46), O('mesinha_vaso', 740, 470, 46),
    W('quadro_rei', 520, 10, 60),
  ] },
  conselho: { floor: 'tex_carvalho', tile: 160, wall: 'tex_parede', places: [
    W('janela_azul', 230, 6, 76, 140), W('janela_azul', 770, 6, 76, 140), W('arandela', 370, 62, 40, 90), W('arandela', 630, 62, 40, 90),
    O('lareira_leao', 500, 250, 200, { light: 200, base: 0.25 }),
    F('tapete_azul', 500, 540, 380),
    O('mesa_conselho', 500, 620, 460, { base: 0.62, hot: ['cadeiras', 'mesa_chaves'] }),
    O('armario_documentos', 910, 340, 80),
    O('estandarte_pe', 150, 600, 44), O('estandarte_pe', 850, 600, 44),
    O('mesa_mapa', 220, 900, 240, { light: 60, hot: ['mapa'] }),
    O('globo', 800, 880, 60), O('candelabro_alto', 90, 780, 42, { light: 120 }), O('candelabro_alto', 930, 780, 42, { light: 120 }),
    O('planta_vaso', 930, 960, 54),
    O('armadura', 290, 290, 42), O('armadura', 710, 290, 42, { flip: true }),
    W('quadro_rei', 100, 14, 56), W('bandeira_azul', 900, 10, 42),
    O('bau_fechado', 80, 520, 70), O('mesinha_vaso', 920, 520, 48),
    O('escrivaninha_pequena', 780, 780, 90, { light: 60 }), O('pilha_livros', 700, 800, 40),
    O('cesto_pergaminhos', 340, 930, 44), O('estante_baixa', 90, 330, 90, { hot: ['comercio'] }),
  ] },
  // ---------------- galeria ----------------
  galeria: { floor: 'tex_pedra', tile: 140, wall: 'tex_parede', places: [
    { p: 'passadeira_h', x: 1560, y: 196, w: 290, floor: true, solid: false, tile: [3060, 54] },
    F('passadeira_cruz', 1580, 190, 220),
    W('quadro_rei', 170, 8, 52), W('bandeira_azul', 320, 4, 38), W('janela_azul', 720, 4, 52, 100), W('bandeira_vermelha', 900, 4, 36),
    W('quadro_rei', 1100, 8, 52), W('janela_azul', 1300, 4, 52, 100), W('janela_azul', 1860, 4, 52, 100), W('bandeira_vermelha', 2040, 4, 36),
    W('quadro_rei', 2300, 8, 52), W('arandela', 2440, 40, 32, 80), W('janela_azul', 2860, 4, 52, 100), W('bandeira_azul', 3020, 4, 38),
    O('atlas:armor', 1400, 272, 38), O('atlas:armor', 1760, 272, 38),
    O('planta_vaso', 210, 274, 44), O('planta_vaso', 700, 274, 44), O('estatua_nobre', 930, 274, 38),
    O('planta_vaso', 1260, 274, 44), O('planta_vaso', 1950, 274, 44), O('estatua_nobre', 2460, 274, 38),
    O('planta_vaso', 2640, 274, 44), O('planta_vaso', 3060, 274, 44),
  ] },
  // ---------------- ala sul ----------------
  cozinha: { floor: 'tex_cozinha', tile: 150, wall: 'tex_parede', places: [
    W('panelas_parede', 600, 24, 170), W('tocha', 60, 50, 22, 90),
    O('lareira_cozinha', 170, 256, 200, { light: 220, base: 0.3, hot: ['provar'] }),
    O('forno', 640, 250, 120, { light: 120, hot: ['provar'] }),
    O('prateleira_potes', 510, 250, 90),
    O('mesa_preparo', 290, 460, 180, { base: 0.55 }), O('mesa_banquete', 560, 580, 180, { light: 60, base: 0.55 }),
    O('caldeirao', 100, 540, 76, { light: 100, hot: ['provar'] }),
    O('barris', 690, 690, 100), O('sacos_grao', 110, 700, 90), O('caixote_legumes', 250, 706, 60),
    O('cesto_paes', 420, 706, 52), O('balde', 340, 706, 34),
  ] },
  tesouro: { floor: 'tex_pedra', tile: 140, wall: 'tex_parede', tint: '#0b0a1422', places: [
    W('tocha', 70, 50, 22, 110), W('tocha', 490, 50, 22, 110), W('bandeira_vermelha', 150, 14, 44), W('bandeira_vermelha', 420, 14, 44),
    O('mesa_moedas', 130, 310, 150, { light: 60, hot: ['comercio', 'contar'] }),
    O('prateleira_ouro', 440, 290, 140),
    F('tapete_leao', 280, 530, 170),
    O('coroa_pedestal', 280, 540, 62, { light: 110 }),
    O('bau_aberto', 90, 460, 90), O('bau_grande', 480, 470, 90),
    O('ouro_grande', 150, 660, 190, { base: 0.6 }), O('ouro_medio', 430, 670, 160, { base: 0.6 }),
    F('ouro_pouco', 290, 700, 100), O('saco1', 260, 706, 38),
  ] },
  entrada: { floor: 'tex_marmore', tile: 150, wall: 'tex_parede', places: [
    W('bandeira_vermelha', 60, 14, 42), W('bandeira_vermelha', 380, 14, 42),
    F('passadeira_v', 220, 440, 88),
    O('estatua_nobre', 58, 430, 48), O('estatua_nobre', 382, 430, 48),
    O('candelabro_alto', 70, 610, 40, { light: 130 }), O('candelabro_alto', 370, 610, 40, { light: 130 }),
    F('escada_desce', 220, 660, 190),
    O('armadura', 60, 300, 40), O('armadura', 380, 300, 40, { flip: true }),
    O('planta_vaso', 60, 520, 40), O('planta_vaso', 380, 520, 40),
  ] },
  quarto: { floor: 'tex_carvalho', tile: 150, wall: 'tex_parede', places: [
    W('janela_azul', 530, 6, 70, 140), W('arandela', 230, 58, 36, 90),
    O('lareira_leao', 110, 240, 170, { light: 190, base: 0.25 }),
    F('tapete_leao', 300, 560, 200),
    O('cama_rei', 470, 480, 172, { base: 0.78, hot: ['dormir', 'descansar'] }),
    O('criado_mudo', 590, 300, 42, { light: 60 }),
    O('bau_rei', 470, 540, 82, { hot: ['escrivaninha'] }),
    O('escrivaninha_rei', 150, 460, 140, { light: 70, hot: ['correio', 'caderno'] }),
    O('poltrona_rei', 150, 520, 50),
    O('guarda_roupa', 590, 660, 86),
    O('manto_coroa', 60, 670, 58),
    O('candelabro_alto', 250, 300, 38, { light: 120 }),
  ] },
  aposentos: { floor: 'tex_parquet', tile: 140, wall: 'tex_parede', places: [
    W('janela_rosa', 90, 6, 66, 130), W('janela_rosa', 470, 6, 66, 130),
    O('cama_rainha', 440, 360, 168, { base: 0.7 }),
    O('penteadeira', 90, 290, 94), O('banquinho', 90, 312, 30, { solid: false }),
    F('tapete_rosa', 250, 520, 190),
    O('mesa_cha', 250, 530, 78, { hot: ['lerJuntos'] }),
    O('poltrona_creme', 170, 530, 52), O('poltrona_creme', 330, 530, 52, { flip: true }),
    O('harpa', 58, 470, 50), O('biombo', 480, 640, 96),
    O('cama_principe', 90, 700, 82, { base: 0.7 }), O('comoda', 300, 700, 68),
    O('vaso_rosas', 530, 710, 40), O('candelabro', 380, 700, 34, { light: 110 }),
  ] },
  // ---------------- fora da muralha ----------------
  masmorra: { floor: 'tex_pedra', tile: 130, wall: 'tex_parede', tint: '#06081258', places: [
    W('correntes', 150, 20, 44), W('correntes', 450, 20, 44), W('tocha', 300, 40, 22, 130),
    O('cela', 150, 310, 180, { base: 0.25 }), O('cela', 440, 310, 160, { base: 0.25 }),
    F('cama_palha', 150, 470, 110), O('tronco', 440, 560, 96),
    O('mesa_chaves', 300, 660, 88, { light: 110, hot: ['presos'] }),
    O('porta_cela', 60, 730, 66),
  ] },
  estabulos: { floor: 'tex_calcada', tile: 170, places: [
    O('baia_cavalo', 130, 210, 150, { hot: ['cavalgar', 'cacar2'] }), O('baia_vazia', 290, 210, 150),
    O('baia_cavalo', 450, 210, 150, { flip: true, hot: ['cavalgar', 'cacar2'] }), O('baia_vazia', 610, 210, 150),
    O('cavalo_branco', 600, 540, 40), O('suporte_selas', 140, 660, 120),
    F('feno_solto', 360, 560, 120), O('cocho', 370, 710, 110), O('fardos_feno', 620, 720, 88), O('barris', 70, 530, 66),
  ] },
  patio: { floor: 'tex_calcada', tile: 170, places: [
    O('suporte_armas', 470, 250, 110, { hot: ['treinar'] }),
    O('boneco_treino', 250, 340, 50, { hot: ['treinar'] }), O('boneco_treino', 350, 370, 50, { hot: ['treinar'] }),
    O('alvo', 170, 520, 70, { hot: ['treinar'] }),
    O('braseiro_tripe', 640, 290, 40, { light: 110 }),
    O('tenda', 870, 300, 160, { hot: ['inspecionar'] }),
    O('poco', 560, 480, 84),
    O('forja', 900, 580, 140, { light: 90 }),
    O('carroca', 700, 710, 110), O('bebedouro', 350, 712, 120), O('fardos_feno', 1040, 712, 80),
    O('mastro', 80, 700, 50),
    O('portaria', 560, 766, 220, { solid: false, hot: ['cidade'] }),
  ] },
  capela: { floor: 'tex_marmore', tile: 150, wall: 'tex_parede', places: [
    W('vitral', 140, 4, 62, 130), W('vitral', 420, 4, 62, 130),
    O('altar', 280, 300, 130, { light: 130, base: 0.35, hot: ['rezar'] }),
    O('estatua_senhora', 150, 280, 46), O('velas_votivas', 410, 280, 70, { light: 100 }),
    F('passadeira_v', 280, 560, 70),
    O('banco_igreja', 160, 470, 150), O('banco_igreja', 400, 470, 150),
    O('banco_igreja', 160, 570, 150), O('banco_igreja', 400, 570, 150),
    O('banco_igreja', 160, 670, 150), O('banco_igreja', 400, 670, 150),
    O('confessionario', 72, 300, 92), O('candelabro_alto', 60, 450, 34, { light: 110 }), O('candelabro_alto', 500, 450, 34, { light: 110 }),
    O('pia_batismal', 70, 740, 44), O('entrada_cripta', 490, 750, 76, { hot: ['cripta'] }),
  ] },
  jardim: { floor: 'tex_grama', tile: 150,
    patches: [
      { tex: 'tex_cascalho', x: 400, y: 0, w: 120, h: 2920 },
      { tex: 'tex_cascalho', x: 0, y: 520, w: 400, h: 130 }, { tex: 'tex_cascalho', x: 0, y: 1140, w: 400, h: 130 },
      { tex: 'tex_cascalho', x: 0, y: 1720, w: 400, h: 130 }, { tex: 'tex_cascalho', x: 0, y: 2440, w: 400, h: 130 },
      { tex: 'tex_cascalho', x: 300, y: 1400, w: 320, h: 260 },
    ],
    places: [
      O('arvore', 150, 260, 150), O('arvore', 780, 260, 150),
      O('arco_rosas', 460, 330, 110, { solid: false }),
      O('canteiro_ret', 220, 460, 150), O('canteiro_ret', 720, 460, 150),
      O('banco_jardim', 290, 820, 100, { hot: ['passear'] }), O('banco_jardim', 630, 820, 100, { hot: ['passear'] }),
      O('poste_luz', 370, 780, 32, { light: 100 }), O('poste_luz', 550, 780, 32, { light: 100 }),
      O('canteiro_redondo', 160, 1000, 100), O('canteiro_redondo', 760, 1000, 100),
      O('topiaria', 300, 1080, 40), O('topiaria', 620, 1080, 40),
      O('sebe_v', 240, 1560, 42), O('sebe_v', 680, 1560, 42),
      O('fonte', 460, 1620, 170, { base: 0.55, hot: ['passear'] }),
      O('arco_rosas', 820, 1300, 100, { solid: false }),
      O('arvore', 170, 2100, 150), O('banco_jardim', 300, 2260, 100, { hot: ['passear'] }),
      O('lago_cisnes', 690, 2400, 240, { base: 0.6, hot: ['passear'] }),
      O('poste_luz', 550, 2180, 32, { light: 100 }),
      O('canteiro_ret', 200, 2780, 150), O('arvore', 780, 2760, 150), O('topiaria', 560, 2840, 40),
      O('sebe_h', 690, 1960, 180), O('sebe_v', 880, 700, 38), O('sebe_v', 880, 1150, 38), O('sebe_v', 880, 2000, 38),
      // lanternas ao longo do caminho, arbustos e pinheiros nas bordas
      O('lanterna_pedra', 370, 120, 30, { light: 80 }), O('lanterna_pedra', 550, 120, 30, { light: 80 }),
      O('lanterna_pedra', 370, 1360, 30, { light: 80 }), O('lanterna_pedra', 550, 1360, 30, { light: 80 }),
      O('lanterna_pedra', 370, 1960, 30, { light: 80 }), O('lanterna_pedra', 550, 2700, 30, { light: 80 }),
      O('pinheiro', 860, 420, 90), O('pinheiro', 70, 890, 90), O('pinheiro', 860, 1480, 90), O('pinheiro', 70, 1640, 90),
      O('pinheiro', 860, 2230, 90), O('pinheiro', 70, 2400, 90), O('pinheiro', 860, 2900, 90),
      O('arbusto', 80, 420, 64), O('arbusto', 330, 470, 56), O('arbusto', 600, 470, 56), O('arbusto', 820, 900, 64),
      O('arbusto', 90, 1100, 60), O('arbusto', 640, 1300, 56), O('arbusto', 250, 1330, 56),
      O('arbusto', 690, 1740, 64), O('arbusto', 110, 1960, 60), O('arbusto', 330, 1990, 56),
      O('arbusto', 700, 2150, 60), O('arbusto', 120, 2700, 60), O('arbusto', 650, 2700, 56),
      O('arvore', 170, 1560, 140), O('arvore', 760, 1600, 140),
      O('canteiro_redondo', 250, 1820, 90),
      O('vaso_rosas', 350, 2560, 36), O('vaso_rosas', 350, 530, 36),
    ] },
};
