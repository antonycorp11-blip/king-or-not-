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
  facts: [string, string, string[]][]; // trecho com lacuna (___), resposta, opções
}

export const BOOKS: Book[] = [
  { id: 'linhagens', title: 'Tratado das Casas Nobres', author: 'Meistre Orwin', hours: 8, knowledge: 'linhagens', attr: 'diplomacia', color: '#2350b0', blurb: 'Genealogias, dívidas antigas e juramentos das grandes casas.', unlocks: 'Argumentos sobre linhagem e honra nas audiências com lordes.', facts: [["Os Drakon juraram lealdade à coroa no ano de ___.", "1204", ["1204", "1350", "987"]], ["O lema da Casa Valmont diz: o mar paga suas ___.", "dívidas", ["dívidas", "promessas", "tempestades"]], ["Os Montclair repetem: a pedra ___.", "lembra", ["lembra", "perdoa", "canta"]], ["Os vassalos dos Drakon são a Casa Ferrão e a Casa ___.", "Rocha-Negra", ["Rocha-Negra", "Brisamar", "Carvalhal"]], ["Os Seren dizem: raízes antes de ___.", "coroas", ["coroas", "espadas", "colheitas"]]] },
  { id: 'norhelm', title: 'Crônicas de Norhelm', author: 'Frei Aske', hours: 6, knowledge: 'norhelm', color: '#4a5a78', blurb: 'A história das três invasões do norte e dos reis que as enfrentaram.', unlocks: 'Diálogos com Norhelm e uma fraqueza de seus exércitos.', facts: [["Norhelm invade quando falha a ___.", "colheita", ["colheita", "lua", "maré"]], ["As invasões descem sempre pelo Passo ___.", "Cinzento", ["Cinzento", "Rubro", "Gelado"]], ["A capital de Norhelm é ___.", "Hjalmgard", ["Hjalmgard", "Castelmar", "Véridian"]], ["O filho mais velho do rei do norte se chama ___.", "Ragnar", ["Ragnar", "Haakon", "Aske"]], ["O último rei do norte que cruzou o passo voltou sem a ___.", "mão", ["mão", "coroa", "espada"]]] },
  { id: 'guerra', title: 'A Arte da Muralha', author: 'Rei Aldren I', hours: 10, knowledge: 'tatica', attr: 'estrategia', color: '#9a1f24', blurb: 'Escrito pelo seu bisavô: cercos, passos de montanha e moral de tropa.', unlocks: 'Opções táticas nas decisões militares.', facts: [["Quem defende um passo estreito precisa de menos ___.", "homens", ["homens", "cavalos", "bandeiras"]], ["Tropas sem ___ desertam antes da batalha.", "soldo", ["soldo", "estandarte", "canção"]], ["Nunca ataque com menos de ___ tropas.", "duas", ["duas", "dez", "cem"]], ["A moral cai quando o rei não ___ a guerra.", "comanda", ["comanda", "abençoa", "esquece"]], ["Um exército parado longe da fronteira chega ___.", "tarde", ["tarde", "cansado", "rico"]]] },
  { id: 'mercadores', title: 'O Livro dos Mercadores', author: 'Guilda de Castelmar', hours: 8, knowledge: 'mercado', attr: 'comercio', color: '#a8781a', blurb: 'Preços, rotas, tarifas e como mercadores mentem.', unlocks: 'Negociações comerciais e +20% nas tarifas das rotas.', facts: [["Uma rota leva o ___ de uma província para quem precisa.", "excedente", ["excedente", "imposto", "exército"]], ["A mercadoria mais cara do reino é a ___.", "prata", ["prata", "madeira", "lã"]], ["Véridian paga caro pelo nosso ___.", "vinho", ["vinho", "ferro", "peixe"]], ["Onde falta algo, a ___ da casa cai todo dia.", "lealdade", ["lealdade", "colheita", "moral"]], ["Impostos altos enchem o cofre e esvaziam a ___.", "paciência", ["paciência", "praça", "mesa"]]] },
  { id: 'sussurros', title: 'Sussurros da Corte', author: 'Anônimo', hours: 8, knowledge: 'intriga', attr: 'intriga', color: '#5a2a7a', blurb: 'Um manual proibido sobre espiões, venenos e sorrisos falsos.', unlocks: 'Perguntas astutas que revelam intenções ocultas.', facts: [["Quem sorri demais na corte quer algo em ___.", "troca", ["troca", "segredo", "dobro"]], ["Um segredo vale mais quando ninguém sabe que ele ___.", "existe", ["existe", "custa", "mente"]], ["Cartas sem selo costumam vir de ___.", "traidores", ["traidores", "poetas", "padeiros"]], ["O melhor espião é aquele que ninguém ___.", "nota", ["nota", "paga", "teme"]], ["Nunca confie em quem vende ___.", "segredos", ["segredos", "vinho", "ovelhas"]]] },
  { id: 'leis', title: 'Leis e Costumes do Reino', author: 'Chanceler Aldric', hours: 6, knowledge: 'leis', color: '#3b2f5e', blurb: 'Os direitos da coroa, dos lordes e do povo comum.', unlocks: 'Propor e defender leis com base nos costumes.', facts: [["Nenhum homem livre pode ser preso sem ___.", "julgamento", ["julgamento", "motivo", "testemunha"]], ["O Costume dos Pastos ___ divide as terras entre vizinhos.", "Comuns", ["Comuns", "Reais", "Antigos"]], ["O rei é a última ___ do reino.", "palavra", ["palavra", "espada", "esperança"]], ["O conselho existe para ___ o rei, não para substituí-lo.", "aconselhar", ["aconselhar", "vigiar", "servir"]], ["Um costume antigo vale como ___ quando ninguém o contesta.", "lei", ["lei", "ouro", "promessa"]]] },
  { id: 'povo', title: 'Pão e Pedra: Vida do Povo Comum', author: 'Irmã Hedda', hours: 5, knowledge: 'povo', color: '#6a5a3a', blurb: 'Relatos de camponeses, artesãos e mendigos da capital.', unlocks: 'Respostas que conquistam o povo nas petições populares.', facts: [["O pão é a primeira ___ do povo.", "preocupação", ["preocupação", "festa", "moeda"]], ["Todo outono o povo celebra a Festa da ___.", "Colheita", ["Colheita", "Lua", "Coroa"]], ["Quando o povo toma a ___, o rei já esperou demais.", "praça", ["praça", "igreja", "ponte"]], ["Um rei que sabe o nome das pessoas ganha ___.", "lealdade", ["lealdade", "ouro", "inimigos"]], ["A febre da cidade baixa chega pelos ___.", "navios", ["navios", "rios", "ventos"]]] },
  { id: 'veridian', title: 'Rotas do Mar do Sul', author: 'Capitã Lysa', hours: 5, knowledge: 'veridian', color: '#1c6a4a', blurb: 'Os portos, os costumes e a fé de Véridian.', unlocks: 'Diálogos com Véridian e comércio com o sul.', facts: [["Em Véridian, cumprimenta-se com a mão no ___.", "coração", ["coração", "ombro", "chapéu"]], ["A frota de Véridian domina o mar do ___.", "sul", ["sul", "norte", "leste"]], ["Em Véridian, o leque aberto é sinal de ___.", "interesse", ["interesse", "luto", "pressa"]], ["O lema de Véridian: todo rio leva ao ___.", "mar", ["mar", "rei", "templo"]], ["Véridian compra vinho e vende ___.", "especiarias", ["especiarias", "gelo", "ferro"]]] },
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
