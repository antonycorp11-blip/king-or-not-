import type { Attr } from '../types';

// Livros: lidos na biblioteca em sessões de 2h. Destravam linhas de diálogo (conhecimento).
export interface Book {
  id: string;
  title: string;
  author: string;
  hours: number;
  knowledge: string; // etiqueta usada em Req.knowledge
  attr?: Attr;
  color: string;
  blurb: string;
  unlocks: string;
}

export const BOOKS: Book[] = [
  { id: 'linhagens', title: 'Tratado das Casas Nobres', author: 'Meistre Orwin', hours: 4, knowledge: 'linhagens', attr: 'diplomacia', color: '#2350b0', blurb: 'Genealogias, dívidas antigas e juramentos das grandes casas.', unlocks: 'Argumentos sobre linhagem e honra nas audiências com lordes.' },
  { id: 'norhelm', title: 'Crônicas de Norhelm', author: 'Frei Aske', hours: 4, knowledge: 'norhelm', color: '#4a5a78', blurb: 'A história das três invasões do norte e dos reis que as enfrentaram.', unlocks: 'Diálogos com Norhelm e uma fraqueza de seus exércitos.' },
  { id: 'guerra', title: 'A Arte da Muralha', author: 'Rei Aldren I', hours: 6, knowledge: 'tatica', attr: 'estrategia', color: '#9a1f24', blurb: 'Escrito pelo seu bisavô: cercos, passos de montanha e moral de tropa.', unlocks: 'Opções táticas nas decisões militares.' },
  { id: 'mercadores', title: 'O Livro dos Mercadores', author: 'Guilda de Castelmar', hours: 5, knowledge: 'mercado', attr: 'comercio', color: '#a8781a', blurb: 'Preços, rotas, tarifas e como mercadores mentem.', unlocks: 'Negociações comerciais e +20% nas tarifas das rotas.' },
  { id: 'sussurros', title: 'Sussurros da Corte', author: 'Anônimo', hours: 5, knowledge: 'intriga', attr: 'intriga', color: '#5a2a7a', blurb: 'Um manual proibido sobre espiões, venenos e sorrisos falsos.', unlocks: 'Perguntas astutas que revelam intenções ocultas.' },
  { id: 'leis', title: 'Leis e Costumes do Reino', author: 'Chanceler Aldric', hours: 4, knowledge: 'leis', color: '#3b2f5e', blurb: 'Os direitos da coroa, dos lordes e do povo comum.', unlocks: 'Propor e defender leis com base nos costumes.' },
  { id: 'povo', title: 'Pão e Pedra: Vida do Povo Comum', author: 'Irmã Hedda', hours: 3, knowledge: 'povo', color: '#6a5a3a', blurb: 'Relatos de camponeses, artesãos e mendigos da capital.', unlocks: 'Respostas que conquistam o povo nas petições populares.' },
  { id: 'veridian', title: 'Rotas do Mar do Sul', author: 'Capitã Lysa', hours: 3, knowledge: 'veridian', color: '#1c6a4a', blurb: 'Os portos, os costumes e a fé de Véridian.', unlocks: 'Diálogos com Véridian e comércio com o sul.' },
];

// Árvore de habilidades: o rei cresce como pessoa. Pontos vêm da experiência (decisões tomadas).
export interface Skill {
  id: string;
  branch: 'voz' | 'espada' | 'coroa' | 'sombra';
  tier: number;
  name: string;
  desc: string;
  requires?: string;
  attr: Attr;
}

export const BRANCHES = {
  voz: { name: 'Voz do Rei', color: '#2350b0', icon: 'aperto' },
  espada: { name: 'Espada do Rei', color: '#9a1f24', icon: 'espadas' },
  coroa: { name: 'Coroa do Povo', color: '#a8781a', icon: 'coroa' },
  sombra: { name: 'Sombra do Rei', color: '#5a2a7a', icon: 'mascara' },
} as const;

export const SKILLS: Skill[] = [
  { id: 'palavra', branch: 'voz', tier: 1, name: 'Palavra Firme', desc: '+1 de Influência por dia.', attr: 'diplomacia' },
  { id: 'mediador', branch: 'voz', tier: 2, name: 'Mediador', desc: 'Suavizar decisões com Influência custa 30% menos.', requires: 'palavra', attr: 'diplomacia' },
  { id: 'carisma', branch: 'voz', tier: 3, name: 'Carisma Real', desc: 'Ganhos de relação com casas e pessoas +25%.', requires: 'mediador', attr: 'diplomacia' },
  { id: 'arbitro', branch: 'voz', tier: 4, name: 'Árbitro dos Lordes', desc: 'Casas descontentes perdem menos lealdade por demandas ignoradas.', requires: 'carisma', attr: 'diplomacia' },

  { id: 'tatico', branch: 'espada', tier: 1, name: 'Olhar Tático', desc: 'Na guerra, seu maior dado de ataque ganha +1.', attr: 'estrategia' },
  { id: 'disciplina', branch: 'espada', tier: 2, name: 'Disciplina', desc: 'Soldo do exército 20% mais barato.', requires: 'tatico', attr: 'estrategia' },
  { id: 'comandante', branch: 'espada', tier: 3, name: 'Comandante Nato', desc: 'Moral do exército cai pela metade quando em crise.', requires: 'disciplina', attr: 'estrategia' },
  { id: 'senhorguerra', branch: 'espada', tier: 4, name: 'Senhor da Guerra', desc: '+2 tropas de reforço por turno de guerra.', requires: 'comandante', attr: 'estrategia' },

  { id: 'contas', branch: 'coroa', tier: 1, name: 'Contas em Dia', desc: '+10% em toda renda de impostos.', attr: 'comercio' },
  { id: 'reidopovo', branch: 'coroa', tier: 2, name: 'Rei do Povo', desc: 'O apoio popular pesa mais na Governabilidade.', requires: 'contas', attr: 'comercio' },
  { id: 'mercador', branch: 'coroa', tier: 3, name: 'Rei Mercador', desc: 'Tarifas das rotas comerciais +25%.', requires: 'reidopovo', attr: 'comercio' },
  { id: 'reformador', branch: 'coroa', tier: 4, name: 'Reformador', desc: 'Leis aprovadas dão +5 de Apoio do Povo.', requires: 'mercador', attr: 'comercio' },

  { id: 'olhos', branch: 'sombra', tier: 1, name: 'Olhos na Corte', desc: 'Você passa a ver os efeitos das escolhas antes de decidir.', attr: 'intriga' },
  { id: 'espioes', branch: 'sombra', tier: 2, name: 'Rede de Espiões', desc: 'Rumores chegam com um dia de antecedência e trazem pistas.', requires: 'olhos', attr: 'intriga' },
  { id: 'sussurro', branch: 'sombra', tier: 3, name: 'Mestre dos Sussurros', desc: 'Pode gastar Influência para abafar escândalos (prestígio).', requires: 'espioes', attr: 'intriga' },
  { id: 'veneno', branch: 'sombra', tier: 4, name: 'Mão Invisível', desc: 'Conspiradores são descobertos antes de agir.', requires: 'sussurro', attr: 'intriga' },
];

export const XP_PER_POINT = 100;
