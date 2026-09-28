import type { Character } from '../types';

const SKIN = { claro: '#f3c9a8', rosado: '#eab89a', medio: '#d49a72', moreno: '#a86e4c', escuro: '#7a4a32' };

export const CHARACTERS: Record<string, Character> = {
  rei: {
    id: 'rei', name: 'Rei', title: 'Soberano de Castelmar', realm: 'coroa', ageYears: 21,
    look: { female: false, skin: SKIN.claro, hair: '#6b4226', hairStyle: 'desgrenhado', eyes: '#3d6fb6', outfit: '#23346e', trim: '#e2b64c', head: 'coroa', fur: true, age: 'jovem' },
  },
  isabelle: {
    id: 'isabelle', name: 'Isabelle', title: 'Rainha-mãe', realm: 'coroa',
    look: { female: true, skin: SKIN.rosado, hair: '#d9d4c7', hairStyle: 'coque', eyes: '#5a7fa8', outfit: '#6a2a52', trim: '#e2b64c', head: 'coroa', fur: true, age: 'velho' },
    traits: ['Família', 'Corte', 'Tradição'],
  },
  lucas: {
    id: 'lucas', name: 'Príncipe Lucas', title: 'Irmão do Rei', realm: 'coroa',
    look: { female: false, skin: SKIN.claro, hair: '#c9b48a', hairStyle: 'curto', eyes: '#4f8a5e', outfit: '#274a3a', trim: '#c9a24a', age: 'jovem' },
    traits: ['Família', 'Diplomacia', 'Juventude'],
  },
  aldric: {
    id: 'aldric', name: 'Chanceler Aldric', title: 'Conselheiro do Antigo Rei', realm: 'coroa',
    look: { female: false, skin: SKIN.rosado, hair: '#e6e2da', hairStyle: 'curto', eyes: '#5b6b7a', outfit: '#3b2f5e', trim: '#d8b45a', beard: 'cheia', age: 'velho', accessory: 'pergaminho' },
    traits: ['Conselho', 'Leis', 'Prudência'],
  },
  corvin: {
    id: 'corvin', name: 'Mestre Corvin', title: 'Tesoureiro Real', realm: 'coroa',
    look: { female: false, skin: SKIN.medio, hair: '#2b2b33', hairStyle: 'careca', eyes: '#3a3024', outfit: '#5a4122', trim: '#e2b64c', beard: 'bigode', age: 'adulto', accessory: 'livro' },
    traits: ['Tesouro', 'Impostos', 'Números'],
  },
  aurelian: {
    id: 'aurelian', name: 'Capitão Aurelian', title: 'Comandante da Guarda Real', realm: 'coroa',
    look: { female: false, skin: SKIN.moreno, hair: '#3a2416', hairStyle: 'desgrenhado', eyes: '#3a2a1a', outfit: '#7a1f24', trim: '#b8b8c8', beard: 'curta', armor: true, age: 'adulto' },
    traits: ['Exército', 'Guarda', 'Lealdade'],
  },
  theodric: {
    id: 'theodric', name: 'Grão-Meistre Theodric', title: 'Guardião da Biblioteca', realm: 'coroa',
    look: { female: false, skin: SKIN.claro, hair: '#bdbdbd', hairStyle: 'longo', eyes: '#4a5a6a', outfit: '#4a4a52', trim: '#9c8a5a', beard: 'cheia', head: 'capuz', age: 'velho', accessory: 'livro' },
    traits: ['Saber', 'História', 'Paciência'],
  },
  // --- Lordes das grandes casas ---
  gaspard: {
    id: 'gaspard', name: 'Lorde Gaspard Valmont', title: 'Senhor da Costa Serena', realm: 'valmont',
    look: { female: false, skin: SKIN.claro, hair: '#b8943a', hairStyle: 'ondulado', eyes: '#3d6fb6', outfit: '#1f3f8a', trim: '#e2b64c', beard: 'curta', fur: true, age: 'adulto' },
    traits: ['Comércio', 'Frotas', 'Riqueza'],
  },
  brandt: {
    id: 'brandt', name: 'Lorde Brandt Drakon', title: 'Senhor do Vale Rubro', realm: 'drakon',
    look: { female: false, skin: SKIN.medio, hair: '#2a1a12', hairStyle: 'desgrenhado', eyes: '#5a3a1a', outfit: '#8a1c1c', trim: '#d4a444', beard: 'cheia', fur: true, armor: true, age: 'adulto' },
    traits: ['Guerra', 'Fronteira', 'Orgulho'],
  },
  aveline: {
    id: 'aveline', name: 'Senhora Aveline Seren', title: 'Matriarca dos Bosques Reais', realm: 'seren',
    look: { female: true, skin: SKIN.claro, hair: '#8a8a82', hairStyle: 'tranca', eyes: '#4f8a5e', outfit: '#23573c', trim: '#c9b98a', head: 'capuz', age: 'velho' },
    traits: ['Fé', 'Colheitas', 'Tradição'],
  },
  otho: {
    id: 'otho', name: 'Lorde Otho Montclair', title: 'Senhor das Montanhas de Ferro', realm: 'montclair',
    look: { female: false, skin: SKIN.rosado, hair: '#4a4a4a', hairStyle: 'curto', eyes: '#6a6a7a', outfit: '#4a4d57', trim: '#a8a8b8', beard: 'bigode', age: 'adulto' },
    traits: ['Minas', 'Segredos', 'Paciência'],
  },
  // --- Pretendentes ---
  elenora: {
    id: 'elenora', name: 'Lady Elenora Valmont', title: 'Filha de Lorde Gaspard', realm: 'valmont', ageYears: 23,
    look: { female: true, skin: SKIN.claro, hair: '#e8c46a', hairStyle: 'ondulado', eyes: '#3d7fd6', outfit: '#1f3f9a', trim: '#e8c45a', head: 'tiara', age: 'jovem' },
    traits: ['Alianças', 'Comércio', 'Influência'],
  },
  rhoswen: {
    id: 'rhoswen', name: 'Lady Rhoswen Drakon', title: 'Filha de Lorde Brandt', realm: 'drakon', ageYears: 25,
    look: { female: true, skin: SKIN.medio, hair: '#5a1a14', hairStyle: 'tranca', eyes: '#8a5a2a', outfit: '#8a1c24', trim: '#c8c8d0', armor: true, age: 'jovem', accessory: 'lanca' },
    traits: ['Exército', 'Honra', 'Fronteira'],
  },
  isolde: {
    id: 'isolde', name: 'Lady Isolde Véridian', title: 'Princesa de Véridian', realm: 'veridian', ageYears: 24,
    look: { female: true, skin: SKIN.claro, hair: '#1c1418', hairStyle: 'ondulado', eyes: '#3a9a5a', outfit: '#1c5a3a', trim: '#e2c05a', head: 'diadema', age: 'jovem', accessory: 'leque' },
    traits: ['Diplomacia', 'Riqueza', 'Ambição'],
  },
  sigrid: {
    id: 'sigrid', name: 'Princesa Sigrid', title: 'Filha do Rei de Norhelm', realm: 'norhelm', ageYears: 26,
    look: { female: true, skin: SKIN.claro, hair: '#f0e6c8', hairStyle: 'tranca', eyes: '#8ac4e6', outfit: '#3a4a6a', trim: '#c8d8e8', fur: true, head: 'diadema', age: 'jovem' },
    traits: ['Paz', 'Norte', 'Mistério'],
  },
  // --- Estrangeiros e povo ---
  haakon: {
    id: 'haakon', name: 'Jarl Haakon', title: 'Emissário de Norhelm', realm: 'norhelm',
    look: { female: false, skin: SKIN.rosado, hair: '#c86a2a', hairStyle: 'tranca', eyes: '#6a9ac4', outfit: '#3a4a5a', trim: '#8a8a9a', beard: 'cheia', fur: true, age: 'adulto' },
    traits: ['Norte', 'Ameaça', 'Tratados'],
  },
  tobias: {
    id: 'tobias', name: 'Mestre Tobias', title: 'Guilda dos Mercadores', realm: 'coroa',
    look: { female: false, skin: SKIN.medio, hair: '#5a3a1a', hairStyle: 'curto', eyes: '#3a2a1a', outfit: '#6a4a1a', trim: '#e2b64c', beard: 'curta', age: 'adulto' },
    traits: ['Guilda', 'Comércio', 'Lucro'],
  },
  marta: {
    id: 'marta', name: 'Marta, a Aldeã', title: 'Porta-voz do Povo', realm: 'coroa',
    look: { female: true, skin: SKIN.moreno, hair: '#3a2a1a', hairStyle: 'coque', eyes: '#3a2a1a', outfit: '#6a5a3a', trim: '#9a8a6a', head: 'capuz', age: 'adulto' },
    traits: ['Povo', 'Colheita', 'Coragem'],
  },
  // --- Genéricos (povo, corte e guarda) ---
  guarda: {
    id: 'guarda', name: 'Guarda Real', title: 'Guarda do Castelo', realm: 'coroa',
    look: { female: false, skin: SKIN.medio, hair: '#3a2416', hairStyle: 'curto', eyes: '#3a2a1a', outfit: '#8a1c24', trim: '#e2b64c', armor: true, head: 'elmo', accessory: 'lanca', age: 'adulto' },
  },
  campones: {
    id: 'campones', name: 'Oswin, o Lavrador', title: 'Camponês', realm: 'coroa',
    look: { female: false, skin: SKIN.moreno, hair: '#4a3020', hairStyle: 'desgrenhado', eyes: '#3a2a1a', outfit: '#8a7250', trim: '#5a4a30', beard: 'curta', age: 'adulto' },
    traits: ['Povo', 'Terra', 'Trabalho'],
  },
  camponesa: {
    id: 'camponesa', name: 'Velha Berta', title: 'Camponesa', realm: 'coroa',
    look: { female: true, skin: SKIN.medio, hair: '#e0dcd4', hairStyle: 'coque', eyes: '#4a3a2a', outfit: '#5a6a3a', trim: '#8a8a7a', head: 'capuz', age: 'velho' },
    traits: ['Povo', 'Memória', 'Fé'],
  },
  mensageiro: {
    id: 'mensageiro', name: 'Pip, o Mensageiro', title: 'Mensageiro Real', realm: 'coroa',
    look: { female: false, skin: SKIN.claro, hair: '#6a4226', hairStyle: 'curto', eyes: '#4a6a8a', outfit: '#23346e', trim: '#e2b64c', accessory: 'pergaminho', age: 'jovem' },
    traits: ['Notícias', 'Estradas', 'Pressa'],
  },
  cavaleiro: {
    id: 'cavaleiro', name: 'Sir Edmund', title: 'Cavaleiro Vassalo', realm: 'coroa',
    look: { female: false, skin: SKIN.rosado, hair: '#1a1418', hairStyle: 'curto', eyes: '#3a3a4a', outfit: '#8a8a90', trim: '#c8c8d0', armor: true, age: 'adulto' },
    traits: ['Honra', 'Juramento', 'Espada'],
  },
  dama: {
    id: 'dama', name: 'Lady Maren', title: 'Dama da Corte', realm: 'coroa',
    look: { female: true, skin: SKIN.claro, hair: '#8a3a22', hairStyle: 'coque', eyes: '#4a6a4a', outfit: '#a8a4b0', trim: '#f0ece0', age: 'adulto' },
    traits: ['Corte', 'Fofocas', 'Etiqueta'],
  },
  irma: {
    id: 'irma', name: 'Irmã Hedda', title: 'Curandeira do Povo', realm: 'coroa',
    look: { female: true, skin: SKIN.rosado, hair: '#7a6a5a', hairStyle: 'coque', eyes: '#5a6a4a', outfit: '#6a4a2a', trim: '#c8b88a', head: 'capuz', age: 'adulto' },
    traits: ['Cura', 'Fé', 'Povo'],
  },
  // --- Vassalos: arte do cavaleiro e da dama, recolorida com a cor da casa ---
  sir_ferrao: { id: 'sir_ferrao', name: 'Sir Gerald Ferrão', title: 'Cavaleiro vassalo dos Drakon', realm: 'drakon', base: 'cavaleiro', tint: '#9a1f24', look: { female: false, skin: SKIN.rosado, hair: '#1a1418', hairStyle: 'curto', eyes: '#3a3a4a', outfit: '#9a1f24', trim: '#c8c8d0', armor: true }, traits: ['Honra', 'Duelo', 'Fronteira'] },
  sir_picoalto: { id: 'sir_picoalto', name: 'Sir Aldo Picoalto', title: 'Cavaleiro vassalo dos Montclair', realm: 'montclair', base: 'cavaleiro', tint: '#4a4d57', look: { female: false, skin: SKIN.rosado, hair: '#1a1418', hairStyle: 'curto', eyes: '#3a3a4a', outfit: '#4a4d57', trim: '#c8c8d0', armor: true }, traits: ['Lealdade', 'Segredos', 'Cicatrizes'] },
  dama_brisamar: { id: 'dama_brisamar', name: 'Lady Coralie Brisamar', title: 'Dama vassala dos Valmont', realm: 'valmont', base: 'dama', tint: '#2350b0', look: { female: true, skin: SKIN.claro, hair: '#8a3a22', hairStyle: 'coque', eyes: '#4a6a4a', outfit: '#2350b0', trim: '#f0ece0' }, traits: ['Navios', 'Comércio', 'Charme'] },
  dama_carvalhal: { id: 'dama_carvalhal', name: 'Lady Brígida Carvalhal', title: 'Dama vassala dos Seren', realm: 'seren', base: 'dama', tint: '#1f6a44', look: { female: true, skin: SKIN.claro, hair: '#8a3a22', hairStyle: 'coque', eyes: '#4a6a4a', outfit: '#1f6a44', trim: '#f0ece0' }, traits: ['Fé', 'Bosques', 'Medo'] },
};

// Personagens que reaproveitam a arte de outro (recolorida quando a roupa é neutra)
function variant(id: string, name: string, title: string, realm: Character['realm'], base: string, tint: string | undefined, traits: string[]): Character {
  const b = CHARACTERS[base];
  return { id, name, title, realm, base, tint, look: { ...b.look, ...(tint ? { outfit: tint } : {}) }, traits };
}

const EXTRA: Character[] = [
  variant('clara', 'Clara', 'Camareira do Castelo', 'coroa', 'dama', '#5a7a9a', ['Toalhas', 'Suspiros', 'Segredos']),
  variant('bianca', 'Bianca', 'Confeiteira Real', 'coroa', 'dama', '#8a5a3a', ['Tortas', 'Paixão', 'Fofoca']),
  variant('pimenta', 'Pimenta', 'Bobo da Corte', 'coroa', 'mensageiro', undefined, ['Piadas', 'Verdades', 'Insolência']),
  variant('kasim', 'Kasim', 'Mercador de Véridian', 'veridian', 'tobias', undefined, ['Especiarias', 'Papagaios', 'Lábia']),
  variant('sir_osric', 'Sir Osric Âncora', 'Cavaleiro vassalo dos Valmont', 'valmont', 'cavaleiro', '#2350b0', ['Torneios', 'Vaidade', 'Mar']),
  variant('viuva', 'Viúva Greta', 'Viúva de guerra', 'coroa', 'camponesa', undefined, ['Luto', 'Netos', 'Pão']),
  variant('sombra', 'A Sombra', 'Mestre dos Sussurros', 'coroa', 'irma', undefined, ['Corvos', 'Segredos', 'Preço']),
  variant('cedric', 'Cedric de Lys', 'Diz ser filho do falecido rei', 'coroa', 'cavaleiro', '#7a2a5a', ['Sangue', 'Carisma', 'Ambição']),
  variant('lysandra', 'Lady Lysandra Cinzel', 'Dama vassala dos Montclair', 'montclair', 'dama', '#4a4d57', ['Veneno', 'Sorrisos', 'Cartas']),
  variant('morgana', 'Lady Morgana Rocha-Negra', 'Dama vassala dos Drakon', 'drakon', 'dama', '#6a1018', ['Orgulho', 'Luto', 'Vingança']),
  variant('florian', 'Lorde Florian', 'Poeta da corte', 'coroa', 'cavaleiro', '#8a3a9a', ['Versos', 'Vaidade', 'Dívidas']),
  variant('ragnar', 'Príncipe Ragnar', 'Herdeiro de Norhelm', 'norhelm', 'haakon', undefined, ['Guerra', 'Orgulho', 'Fome']),
  variant('tomas', 'Tomás', 'Padeiro da cidade baixa', 'coroa', 'campones', undefined, ['Pão', 'Queixas', 'Farinha']),
  variant('bruna', 'Bruna', 'Ferreira da capital', 'coroa', 'marta', undefined, ['Martelo', 'Brasas', 'Franqueza']),
  variant('salvio', 'Mestre Sálvio', 'Cozinheiro-chefe', 'coroa', 'corvin', undefined, ['Molhos', 'Venenos?', 'Drama']),
  variant('frei_aske', 'Frei Aske', 'Monge cronista', 'coroa', 'theodric', undefined, ['Crônicas', 'Profecias', 'Vinho']),
  variant('sir_bram', 'Sir Bram Salgueiro', 'Cavaleiro vassalo dos Seren', 'seren', 'cavaleiro', '#1f6a44', ['Fé', 'Arco', 'Silêncio']),
];
for (const c of EXTRA) CHARACTERS[c.id] = c;

// Nome-base dos arquivos de arte em assets/personagens/ (NN_id_corpo.png / NN_id_retrato.png)
export const ASSET_FILES: Record<string, string> = {
  rei: '01_rei', isabelle: '02_isabelle', lucas: '03_lucas', aldric: '04_aldric', corvin: '05_corvin',
  aurelian: '06_aurelian', theodric: '07_theodric', gaspard: '08_gaspard', brandt: '09_brandt', aveline: '10_aveline',
  otho: '11_otho', elenora: '12_elenora', rhoswen: '13_rhoswen', isolde: '14_isolde', sigrid: '15_sigrid',
  haakon: '16_haakon', tobias: '17_tobias', marta: '18_marta', guarda: '19_guarda', campones: '20_campones',
  camponesa: '21_camponesa', mensageiro: '22_mensageiro', cavaleiro: '23_cavaleiro', dama: '24_dama', irma: '25_irma',
  clara: '26_clara', bianca: '27_bianca', pimenta: '28_pimenta', cedric: '29_cedric',
};

export const SUITORS = ['elenora', 'rhoswen', 'isolde', 'sigrid'] as const;

export function char(id: string): Character {
  const c = CHARACTERS[id];
  if (!c) throw new Error(`Personagem desconhecido: ${id}`);
  return c;
}
