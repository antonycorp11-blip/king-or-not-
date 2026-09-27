import type { Good, HouseId, ProvinceId, RealmId } from '../types';

export interface HouseDef {
  id: RealmId;
  name: string;
  color: string;
  dark: string;
  light: string;
  sigil: string; // id do ícone de brasão
  lord?: string;
  vassals: string[];
  levy: number; // soldados que a casa cede ao rei
  motto: string;
}

export const HOUSES: Record<RealmId, HouseDef> = {
  coroa: { id: 'coroa', name: 'Coroa de Castelmar', color: '#2a3f8f', dark: '#16224f', light: '#5a78d0', sigil: 'coroa', vassals: ['Casa Aldren'], levy: 0, motto: 'Uma coroa, um reino.' },
  valmont: { id: 'valmont', name: 'Casa Valmont', color: '#2350b0', dark: '#132a66', light: '#6a90e6', sigil: 'flor', lord: 'gaspard', vassals: ['Casa Brisamar', 'Casa Âncora'], levy: 400, motto: 'O mar paga suas dívidas.' },
  drakon: { id: 'drakon', name: 'Casa Drakon', color: '#9a1f24', dark: '#5a0f14', light: '#d65a5a', sigil: 'leao', lord: 'brandt', vassals: ['Casa Ferrão', 'Casa Rocha-Negra'], levy: 900, motto: 'Nós somos a muralha.' },
  seren: { id: 'seren', name: 'Casa Seren', color: '#1f6a44', dark: '#0f3a24', light: '#5ab07a', sigil: 'arvore', lord: 'aveline', vassals: ['Casa Carvalhal', 'Casa Salgueiro'], levy: 500, motto: 'Raízes antes de coroas.' },
  montclair: { id: 'montclair', name: 'Casa Montclair', color: '#6a6c78', dark: '#34363f', light: '#a8aab8', sigil: 'montanha', lord: 'otho', vassals: ['Casa Picoalto', 'Casa Cinzel'], levy: 600, motto: 'A pedra lembra.' },
  norhelm: { id: 'norhelm', name: 'Reino de Norhelm', color: '#4a5a78', dark: '#252d3f', light: '#9ab0d0', sigil: 'lobo', lord: 'haakon', vassals: [], levy: 0, motto: 'O inverno sempre vem.' },
  veridian: { id: 'veridian', name: 'Reino de Véridian', color: '#1c6a4a', dark: '#0c3a26', light: '#5ac08a', sigil: 'serpente', lord: 'isolde', vassals: [], levy: 800, motto: 'Todo rio leva ao mar.' },
};

export const HOUSE_IDS: HouseId[] = ['valmont', 'drakon', 'seren', 'montclair'];

export interface ProvinceDef {
  id: ProvinceId;
  name: string;
  house: RealmId;
  kingdom: 'castelmar' | 'norhelm';
  produces: Partial<Record<Good, number>>;
  needs: Partial<Record<Good, number>>;
  baseTax: number; // ouro por dia com imposto normal
  population: number;
  desc: string;
}

export const PROVINCES: Record<ProvinceId, ProvinceDef> = {
  castelmar: { id: 'castelmar', name: 'Castelmar', house: 'coroa', kingdom: 'castelmar', produces: { graos: 3 }, needs: { madeira: 2, ferro: 1, peixe: 1 }, baseTax: 32, population: 8200, desc: 'A capital real. Muralhas antigas, mercados cheios e um povo que observa o jovem rei.' },
  costa: { id: 'costa', name: 'Costa Serena', house: 'valmont', kingdom: 'castelmar', produces: { peixe: 4, vinho: 2 }, needs: { madeira: 1, graos: 1 }, baseTax: 24, population: 5100, desc: 'Portos ricos e frotas mercantes. Os Valmont enriquecem com o mar.' },
  vale: { id: 'vale', name: 'Vale Rubro', house: 'drakon', kingdom: 'castelmar', produces: { ferro: 2, graos: 1 }, needs: { graos: 2, peixe: 1 }, baseTax: 16, population: 4300, desc: 'Província fronteiriça com Norhelm. Guerreiros duros, colheitas magras.' },
  bosques: { id: 'bosques', name: 'Bosques Reais', house: 'seren', kingdom: 'castelmar', produces: { madeira: 4, graos: 3 }, needs: { ferro: 1 }, baseTax: 18, population: 4800, desc: 'Florestas sagradas e campos férteis. A fé dos Seren é antiga como os carvalhos.' },
  montanhas: { id: 'montanhas', name: 'Montanhas de Ferro', house: 'montclair', kingdom: 'castelmar', produces: { ferro: 3, prata: 2 }, needs: { graos: 2, madeira: 1 }, baseTax: 20, population: 3600, desc: 'Minas profundas de ferro e prata. Os Montclair guardam segredos e rancores.' },
  hjalmgard: { id: 'hjalmgard', name: 'Hjalmgard', house: 'norhelm', kingdom: 'norhelm', produces: {}, needs: {}, baseTax: 0, population: 9000, desc: 'Capital gelada de Norhelm.' },
  fiorde: { id: 'fiorde', name: 'Fiorde Gelado', house: 'norhelm', kingdom: 'norhelm', produces: {}, needs: {}, baseTax: 0, population: 3000, desc: 'Costas de gelo e navios-dragão.' },
  passo: { id: 'passo', name: 'Passo Cinzento', house: 'norhelm', kingdom: 'norhelm', produces: {}, needs: {}, baseTax: 0, population: 2000, desc: 'A passagem nas montanhas por onde Norhelm sempre invadiu.' },
};

export const KINGDOM_PROVINCES: ProvinceId[] = ['castelmar', 'costa', 'vale', 'bosques', 'montanhas'];

export const GOODS: Record<Good, { name: string; icon: string; price: number }> = {
  graos: { name: 'Grãos', icon: 'trigo', price: 6 },
  madeira: { name: 'Madeira', icon: 'madeira', price: 7 },
  ferro: { name: 'Ferro', icon: 'ferro', price: 10 },
  peixe: { name: 'Peixe', icon: 'peixe', price: 6 },
  vinho: { name: 'Vinho', icon: 'uva', price: 12 },
  prata: { name: 'Prata', icon: 'prata', price: 16 },
};

export function houseOf(p: ProvinceId): RealmId {
  return PROVINCES[p].house;
}
