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
  { id: 'ervas', title: "Ervas e Curas dos Bosques", author: "Irmã Hedda", hours: 6, knowledge: 'medicina', attr: 'justica', color: '#3a7a3a', blurb: "Receitas de curandeira: febres, feridas e o que nunca beber.", unlocks: "Tratar febres, pestes e feridas nas audiências.", facts: [["A febre dos navios se trata com casca de ___.", "salgueiro", ["salgueiro", "carvalho", "pinheiro"]], ["Amêndoas no vinho podem ser sinal de ___.", "veneno", ["veneno", "luxo", "safra"]], ["Feridas lavadas com vinho ___ menos.", "infeccionam", ["infeccionam", "doem", "sangram"]], ["A erva-de-são-joão afasta ___.", "pesadelos", ["pesadelos", "lobos", "credores"]], ["Água parada no acampamento traz ___.", "disenteria", ["disenteria", "sorte", "peixes"]]] },
  { id: 'carvalhos', title: "O Livro dos Carvalhos", author: "Anciões Seren", hours: 7, knowledge: 'fe', attr: 'justica', color: '#1f6a44', blurb: "A fé antiga dos bosques, seus ritos e suas vinganças.", unlocks: "Argumentos de fé com os Seren e com o povo devoto.", facts: [["Os reis de Castelmar são coroados sob os ___ sagrados.", "carvalhos", ["carvalhos", "pinheiros", "salgueiros"]], ["Cortar um carvalho sagrado exige plantar ___ no lugar.", "dez", ["dez", "um", "cem"]], ["A lua cheia é a noite dos ___.", "juramentos", ["juramentos", "banquetes", "impostos"]], ["O rei que queimou um bosque reinou só três ___.", "anos", ["anos", "dias", "invernos"]], ["Os Seren não perdoam: eles ___.", "lembram", ["lembram", "cobram", "cantam"]]] },
  { id: 'venenos', title: "Venenos da Corte", author: "Autor desconhecido", hours: 7, knowledge: 'venenos', attr: 'intriga', color: '#4a2a5a', blurb: "Um tratado proibido sobre como se mata um rei e como se evita morrer.", unlocks: "Detectar envenenamentos e armadilhas de corte.", facts: [["O veneno mais comum da corte cheira a ___.", "amêndoas", ["amêndoas", "rosas", "cravo"]], ["Um provador real deve comer ___ do rei.", "antes", ["antes", "depois", "longe"]], ["Taças de ___ escurecem com certos venenos.", "prata", ["prata", "ouro", "vidro"]], ["O envenenador sempre oferece o primeiro ___.", "brinde", ["brinde", "abraço", "pão"]], ["Quem tem pressa de herdar é o primeiro ___.", "suspeito", ["suspeito", "aliado", "santo"]]] },
  { id: 'sangue', title: "Direito de Sangue", author: "Chanceler Aldric", hours: 8, knowledge: 'herancas', attr: 'justica', color: '#7a2a5a', blurb: "Heranças, bastardos, testamentos e as guerras que eles causaram.", unlocks: "Julgar pretendentes ao trono e disputas de herança.", facts: [["Um bastardo só herda se for ___ pelo pai.", "reconhecido", ["reconhecido", "batizado", "amado"]], ["O anel de sinete prova o ___.", "sangue", ["sangue", "ouro", "amor"]], ["O filho legítimo herda antes do ___.", "irmão", ["irmão", "primo", "tio"]], ["Testamento sem testemunha vale ___.", "nada", ["nada", "ouro", "o dobro"]], ["Na lei antiga, a mãe do rei pode ser ___.", "regente", ["regente", "juíza", "herdeira"]]] },
  { id: 'conversa', title: "A Arte da Conversa", author: "Lady Maren", hours: 5, knowledge: 'etiqueta', attr: 'carisma', color: '#a83a5a', blurb: "Como elogiar sem bajular e insultar sem que percebam.", unlocks: "Respostas elegantes e sedutoras nos diálogos.", facts: [["Um elogio vale mais quando é ___.", "específico", ["específico", "longo", "caro"]], ["Nunca responda um insulto no ___.", "mesmo dia", ["mesmo dia", "jantar", "inverno"]], ["A pergunta certa desarma mais que a ___.", "espada", ["espada", "mentira", "risada"]], ["Quem fala por último, ___.", "decide", ["decide", "perde", "bebe"]], ["Ria das piadas do lorde, mas não ___ no que ele diz.", "acredite", ["acredite", "pense", "mexa"]]] },
  { id: 'cercos', title: "Cercos e Fortalezas", author: "Rei Aldren II", hours: 8, knowledge: 'cerco', attr: 'estrategia', color: '#6a4a3a', blurb: "Muralhas, túneis, fome e paciência: como se toma e se defende um castelo.", unlocks: "Ordens de cerco e defesa durante as guerras.", facts: [["Um cerco se vence mais pela ___ que pelas armas.", "fome", ["fome", "chuva", "música"]], ["Túneis sob a muralha se escutam com uma bacia de ___.", "água", ["água", "vinho", "areia"]], ["A torre mais fraca é a mais ___.", "nova", ["nova", "alta", "velha"]], ["Quem cerca precisa proteger as próprias ___.", "costas", ["costas", "torres", "mulas"]], ["Nenhum portão resiste a um ___ subornado.", "guarda", ["guarda", "padre", "cavalo"]]] },
  { id: 'contas', title: "Contabilidade Real", author: "Mestre Corvin", hours: 6, knowledge: 'contabilidade', attr: 'comercio', color: '#8a6a2a', blurb: "Livros-caixa, dívidas e como o tesouro some sem ninguém roubar.", unlocks: "Descobrir desvios e negociar dívidas.", facts: [["Toda dívida real cresce com os ___.", "juros", ["juros", "anos", "reis"]], ["O desvio mais comum está na conta de ___.", "reparos", ["reparos", "velas", "cavalos"]], ["Tesouro sem registro é tesouro ___.", "roubado", ["roubado", "seguro", "sagrado"]], ["A Guilda empresta no verão e cobra no ___.", "inverno", ["inverno", "outono", "jantar"]], ["Quem assina sem ler, ___.", "paga", ["paga", "ganha", "reina"]]] },
  { id: 'poesia', title: "Poesia Cortesã", author: "Lorde Florian", hours: 4, knowledge: 'poesia', attr: 'carisma', color: '#8a3a9a', blurb: "Sonetos, cantigas e as rimas que já derrubaram ministros.", unlocks: "Encantar pretendentes e humilhar lordes com versos.", facts: [["Um soneto tem ___ versos.", "catorze", ["catorze", "doze", "vinte"]], ["A rima mais preguiçosa para «rei» é ___.", "lei", ["lei", "mel", "sol"]], ["Poema de amor lido em público vira ___.", "escândalo", ["escândalo", "lei", "canção"]], ["O bobo é o único poeta que diz a ___.", "verdade", ["verdade", "hora", "conta"]], ["Cantigas de escárnio zombam dos ___.", "poderosos", ["poderosos", "pobres", "mortos"]]] },
  { id: 'estrelas', title: "Mapas das Estrelas", author: "Frei Aske", hours: 5, knowledge: 'astronomia', attr: 'diplomacia', color: '#23346e', blurb: "Constelações, presságios e a arte de prever o inverno.", unlocks: "Interpretar presságios e acalmar o povo supersticioso.", facts: [["A estrela do norte guia os ___.", "navegantes", ["navegantes", "ladrões", "reis"]], ["Um cometa anuncia ___, dizem os velhos.", "mudança", ["mudança", "chuva", "casamento"]], ["O inverno chega quando a constelação do ___ some.", "Cervo", ["Cervo", "Leão", "Barco"]], ["Eclipses assustam o povo e ___ os padres.", "enriquecem", ["enriquecem", "calam", "cegam"]], ["Frei Aske diz que o céu não mente, só é mal ___.", "interpretado", ["interpretado", "pintado", "vendido"]]] },
  { id: 'diario', title: "Diário de um Rei Menino", author: "Rei Aldren I (aos 16)", hours: 5, knowledge: 'diario', attr: 'carisma', color: '#5a3a2a', blurb: "O diário do seu tataravô, coroado aos dezesseis e ainda assim vivo aos oitenta.", unlocks: "Conselhos de um rei que já esteve no seu lugar.", facts: [["Na primeira página ele escreveu que ser rei era muito ___.", "chato", ["chato", "fácil", "bonito"]], ["Ele sobreviveu a três ___ de envenenamento.", "tentativas", ["tentativas", "banquetes", "casamentos"]], ["Seu segredo: nunca dormir no mesmo ___ duas noites.", "quarto", ["quarto", "castelo", "reino"]], ["Ele dizia que a melhor arma do rei é o ___.", "tempo", ["tempo", "ouro", "exército"]], ["Casou-se com a filha do seu maior ___.", "inimigo", ["inimigo", "amigo", "credor"]]] },
];

// Árvore de habilidades: o rei cresce como pessoa. Pontos vêm da experiência (decisões tomadas).
export interface Skill {
  id: string;
  branch: 'voz' | 'espada' | 'coroa' | 'sombra' | 'coracao' | 'balanca';
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
  coracao: { name: 'Coração do Rei', color: '#a83a5a', icon: 'coracao' },
  balanca: { name: 'Balança do Rei', color: '#3b5a6a', icon: 'pergaminho' },
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

  { id: 'embaixador', branch: 'voz', tier: 5, name: 'Embaixador Nato', desc: 'Convocados têm +20% de chance de atender.', requires: 'arbitro', attr: 'diplomacia' },
  { id: 'lingua', branch: 'voz', tier: 6, name: 'Língua de Prata', desc: '+1 de Influência por dia.', requires: 'embaixador', attr: 'diplomacia' },
  { id: 'fortaleza', branch: 'espada', tier: 5, name: 'Mestre das Muralhas', desc: 'Na guerra, a capital começa com +2 tropas.', requires: 'senhorguerra', attr: 'estrategia' },
  { id: 'vanguarda', branch: 'espada', tier: 6, name: 'Rei da Vanguarda', desc: 'O Conselho de Guerra custa só 1 hora.', requires: 'fortaleza', attr: 'estrategia' },
  { id: 'celeiros', branch: 'coroa', tier: 5, name: 'Celeiros Cheios', desc: 'Escassez nas províncias tira lealdade só em dias pares.', requires: 'reformador', attr: 'comercio' },
  { id: 'banqueiro', branch: 'coroa', tier: 6, name: 'Rei Banqueiro', desc: '+15% em toda renda de impostos.', requires: 'celeiros', attr: 'comercio' },
  { id: 'corvos', branch: 'sombra', tier: 5, name: 'Senhor dos Corvos', desc: 'Recusar uma convocação não custa lealdade a você.', requires: 'veneno', attr: 'intriga' },
  { id: 'rede', branch: 'sombra', tier: 6, name: 'Rede Invisível', desc: 'Atentados contra o rei são frustrados.', requires: 'corvos', attr: 'intriga' },

  { id: 'sorriso', branch: 'coracao', tier: 1, name: 'Sorriso Real', desc: 'Ganhos de relação com pessoas +10%.', attr: 'carisma' },
  { id: 'galanteio', branch: 'coracao', tier: 2, name: 'Galanteio', desc: 'Ganhos de relação com pretendentes e com a rainha +25%.', requires: 'sorriso', attr: 'carisma' },
  { id: 'amado', branch: 'coracao', tier: 3, name: 'Amado pelo Povo', desc: '+1 de Apoio do Povo por dia.', requires: 'galanteio', attr: 'carisma' },
  { id: 'confidente', branch: 'coracao', tier: 4, name: 'Confidente', desc: 'Seguir um conselho rende o dobro de relação com o conselheiro.', requires: 'amado', attr: 'carisma' },
  { id: 'lenda', branch: 'coracao', tier: 5, name: 'Lenda Viva', desc: '+1 de Prestígio por dia.', requires: 'confidente', attr: 'carisma' },
  { id: 'coracaoleao', branch: 'coracao', tier: 6, name: 'Coração de Leão', desc: '+1 de Moral das tropas por dia.', requires: 'lenda', attr: 'carisma' },
  { id: 'juiz', branch: 'balanca', tier: 1, name: 'Juiz do Reino', desc: 'Leis aprovadas dão +2 de Apoio do Povo.', attr: 'justica' },
  { id: 'leiantiga', branch: 'balanca', tier: 2, name: 'Lei Antiga', desc: 'Opções que exigem "Leis e Costumes" ficam liberadas.', requires: 'juiz', attr: 'justica' },
  { id: 'tribunal', branch: 'balanca', tier: 3, name: 'Tribunal Real', desc: 'Casas só se rebelam com lealdade −70 (em vez de −55).', requires: 'leiantiga', attr: 'justica' },
  { id: 'clemencia', branch: 'balanca', tier: 4, name: 'Clemência', desc: 'Demandas ignoradas custam 25% menos.', requires: 'tribunal', attr: 'justica' },
  { id: 'codigo', branch: 'balanca', tier: 5, name: 'Código do Rei', desc: 'Leis aprovadas dão +3 de Prestígio.', requires: 'clemencia', attr: 'justica' },
  { id: 'reijusto', branch: 'balanca', tier: 6, name: 'O Rei Justo', desc: 'Governabilidade +5.', requires: 'codigo', attr: 'justica' },
];

export const XP_PER_POINT = 100;
