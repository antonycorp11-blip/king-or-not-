import type { CouncilSeatId, HouseId, Resources } from '../types';

// Os cinco cargos do conselho. Cada um guarda uma das Cinco Chaves.
export interface SeatDef {
  id: CouncilSeatId;
  name: string;
  key: string; // a chave que o cargo guarda
  domain: string; // do que cuida
  icon: string;
}

export const SEATS: Record<CouncilSeatId, SeatDef> = {
  chanceler: { id: 'chanceler', name: 'Chanceler', key: 'Chave do Selo', domain: 'Leis, casas nobres e diplomacia interna', icon: 'pergaminho' },
  tesoureiro: { id: 'tesoureiro', name: 'Tesoureiro', key: 'Chave do Tesouro', domain: 'Ouro, impostos e comércio', icon: 'moedas' },
  marechal: { id: 'marechal', name: 'Marechal', key: 'Chave do Arsenal', domain: 'Exército, fronteiras e segurança', icon: 'espadas' },
  sussurros: { id: 'sussurros', name: 'Mestre dos Sussurros', key: 'Chave do Arquivo das Sombras', domain: 'Espionagem, segredos e investigações', icon: 'mascara' },
  guardiao: { id: 'guardiao', name: 'Guardião do Reino', key: 'Chave dos Portões', domain: 'Províncias, povo, obras e logística', icon: 'castelo' },
};
export const SEAT_IDS = Object.keys(SEATS) as CouncilSeatId[];

// Perfil de quem pode sentar à mesa. Competência por cargo (0..5): quem é bom em quê.
// "cares" diz o que a pessoa valoriza ao decidir sozinha (é assim que ela governa por você).
export interface AdvisorProfile {
  id: string;
  competence: Partial<Record<CouncilSeatId, number>>;
  ambition: number; // 0..100
  house?: HouseId;
  cares: Partial<Record<keyof Resources, number>> & { house?: number; king?: number };
  style: string; // como governa quando o rei não aparece
}

export const ADVISORS: Record<string, AdvisorProfile> = {
  aldric: { id: 'aldric', competence: { chanceler: 5, guardiao: 3, tesoureiro: 2, sussurros: 2 }, ambition: 45, cares: { prestigio: 1, influencia: 0.8, house: 0.3, povo: 0.3, ouro: 0.02 }, style: 'decide devagar, pelo precedente e pela lei' },
  corvin: { id: 'corvin', competence: { tesoureiro: 4, guardiao: 2 }, ambition: 35, cares: { ouro: 0.08, povo: 0.15, prestigio: 0.2 }, style: 'escolhe sempre o que enche o cofre' },
  aurelian: { id: 'aurelian', competence: { marechal: 4, guardiao: 2 }, ambition: 20, cares: { moral: 1, exercito: 0.02, prestigio: 0.3, povo: 0.2, king: 1 }, style: 'protege os soldados e a coroa, nessa ordem' },
  isabelle: { id: 'isabelle', competence: { sussurros: 4, chanceler: 3 }, ambition: 50, cares: { prestigio: 1.2, influencia: 0.6, house: 0.4, povo: 0.1, king: 1 }, style: 'defende a dignidade da coroa acima de tudo' },
  otho: { id: 'otho', competence: { guardiao: 3, tesoureiro: 3, sussurros: 3 }, ambition: 85, house: 'montclair', cares: { ouro: 0.04, house: 1.6, prestigio: 0.2, povo: -0.1 }, style: 'favorece as montanhas, sempre com um sorriso' },
  theodric: { id: 'theodric', competence: { chanceler: 3, sussurros: 2, guardiao: 3 }, ambition: 10, cares: { povo: 0.8, prestigio: 0.4, influencia: 0.4, king: 0.6 }, style: 'busca a solução mais justa, mesmo que lenta' },
  gaspard: { id: 'gaspard', competence: { tesoureiro: 5, chanceler: 3 }, ambition: 75, house: 'valmont', cares: { ouro: 0.07, house: 1.5, povo: 0.05 }, style: 'lucra junto com a coroa, e um pouco antes dela' },
  brandt: { id: 'brandt', competence: { marechal: 4 }, ambition: 60, house: 'drakon', cares: { moral: 0.8, exercito: 0.03, house: 1.4, prestigio: 0.4 }, style: 'resolve tudo com mais soldados' },
  aveline: { id: 'aveline', competence: { guardiao: 4, chanceler: 3 }, ambition: 40, house: 'seren', cares: { povo: 0.9, house: 1.2, prestigio: 0.3 }, style: 'pensa no povo e nos bosques antes do ouro' },
  marta: { id: 'marta', competence: { guardiao: 3 }, ambition: 15, cares: { povo: 1.5, ouro: 0.01 }, style: 'decide como a cidade baixa decidiria' },
  sombra: { id: 'sombra', competence: { sussurros: 5 }, ambition: 55, cares: { influencia: 1.2, ouro: 0.03 }, style: 'guarda metade do que descobre para si' },
  dama: { id: 'dama', competence: { sussurros: 3 }, ambition: 40, cares: { influencia: 1, prestigio: 0.4 }, style: 'sabe de tudo e conta metade' },
  lucas: { id: 'lucas', competence: { chanceler: 2, marechal: 2 }, ambition: 30, cares: { povo: 0.6, prestigio: 0.5, king: 1.2 }, style: 'tenta agradar a todos, e às vezes consegue' },
  elenora: { id: 'elenora', competence: { tesoureiro: 5, chanceler: 2 }, ambition: 40, house: 'valmont', cares: { ouro: 0.06, house: 0.8, povo: 0.3, king: 1 }, style: 'governa como uma contadora apaixonada' },
  rhoswen: { id: 'rhoswen', competence: { marechal: 5 }, ambition: 55, house: 'drakon', cares: { moral: 1, exercito: 0.03, house: 0.9, king: 0.8 }, style: 'decide rápido e corta o que atrapalha' },
  isolde: { id: 'isolde', competence: { sussurros: 5, chanceler: 4 }, ambition: 65, cares: { influencia: 1, prestigio: 0.6, ouro: 0.03 }, style: 'sempre ganha algo, nem sempre para você' },
  sigrid: { id: 'sigrid', competence: { marechal: 3, chanceler: 3 }, ambition: 30, cares: { prestigio: 0.6, moral: 0.6, povo: 0.4, king: 1 }, style: 'honesta até doer' },
  cedric: { id: 'cedric', competence: { chanceler: 4, sussurros: 3 }, ambition: 80, cares: { povo: 0.8, influencia: 0.8, prestigio: 0.5 }, style: 'governa para ser amado' },
  tobias: { id: 'tobias', competence: { tesoureiro: 4 }, ambition: 50, cares: { ouro: 0.06, povo: -0.05 }, style: 'escolhe o que agrada à Guilda' },
};

export const SEAT_CANDIDATES: Record<CouncilSeatId, string[]> = {
  chanceler: ['aldric', 'theodric', 'isabelle', 'aveline', 'lucas', 'cedric', 'sigrid', 'isolde', 'gaspard'],
  tesoureiro: ['corvin', 'gaspard', 'elenora', 'tobias', 'otho'],
  marechal: ['aurelian', 'brandt', 'rhoswen', 'sigrid', 'lucas'],
  sussurros: ['isabelle', 'sombra', 'dama', 'isolde', 'otho', 'cedric'],
  guardiao: ['otho', 'marta', 'aveline', 'theodric', 'aldric', 'aurelian'],
};
