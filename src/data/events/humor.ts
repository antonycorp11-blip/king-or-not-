import type { GameEvent, GameState } from '../../types';
import { char } from '../characters';

// Vida da corte: absurdos, pequenas crises e gente sem noção. Quase todos acontecem uma vez só.
const sp = (s: GameState) => (s.spouse ? char(s.spouse).name : 'sua futura rainha');

export const HUMOR_EVENTS: GameEvent[] = [
  {
    id: 'galinha_julgamento', speaker: 'campones', topic: 'O julgamento da galinha', kind: 'audiencia', minDay: 3, weight: 3,
    nodes: {
      start: {
        text: 'Oswin, o lavrador, entra segurando uma galinha pelo pescoço, com respeito. "Majestade, esta galinha é bruxa. Ela bota os ovos no quintal do vizinho. Todo dia. Só pode ser feitiço. O vizinho diz que os ovos são dele. Eu digo que a galinha é minha. A galinha não diz nada, o que é muito suspeito."',
        choices: [
          { label: 'Julgar a galinha formalmente', sub: 'O devido processo', color: 'azul', icon: 'martelo', goto: 'tribunal' },
          { label: 'Os ovos são de quem tem a galinha', sub: 'Lógica simples', color: 'dourado', icon: 'balao', effects: { res: { povo: 2 }, rel: { campones: 6 }, xp: 6 }, reply: 'Oswin sai triunfante. No dia seguinte, o vizinho aparece com um galo e uma nova teoria jurídica.' },
          { label: 'Confiscar a galinha para a cozinha real', sub: 'Solução definitiva', color: 'vermelho', icon: 'coroa', effects: { res: { povo: -2 }, rel: { campones: -8, salvio: 4 }, xp: 4 }, reply: 'Mestre Sálvio faz uma canja magnífica. Na vila, circula a lenda do "rei que come as provas".' },
        ],
      },
      tribunal: {
        text: 'Aldric, visivelmente sofrendo, lê a acusação. A galinha é colocada no banco dos réus. Pimenta se oferece como advogado de defesa. "A minha cliente só estava exercendo seu direito de ir e vir. E de botar."',
        choices: [
          { label: 'Inocente! Ovos compartilhados', sub: 'Justiça salomônica', color: 'verde', icon: 'aperto', effects: { res: { povo: 5, prestigio: -1 }, rel: { pimenta: 8, aldric: -3 }, law: 'Lei dos Ovos Compartilhados', xp: 12 }, reply: 'Os dois vizinhos dividem os ovos. A galinha vira celebridade. O povo passa a chamá-la de "Dona Justa". Aldric pede um dia de folga.' },
          { label: 'Exige Justiça 2: a cerca é a culpada', sub: 'Sentença sábia', color: 'roxo', icon: 'martelo', req: { attr: ['justica', 2] }, effects: { res: { povo: 7, prestigio: 2 }, rel: { campones: 8 }, xp: 16 }, reply: '"A galinha não é bruxa. A cerca tem um buraco." Você manda consertar a cerca com dinheiro da coroa. A vila inteira fala da sabedoria do rei por uma semana.' },
        ],
      },
    },
  },
  {
    id: 'florian_concurso', speaker: 'florian', topic: 'Um concurso de poesia', kind: 'audiencia', minDay: 4, weight: 3,
    nodes: {
      start: {
        text: 'Lorde Florian entra declamando antes mesmo de chegar ao tapete. "Ó rei de fronte tão serena, que governa com mão pequena..." Ele para. "Majestade! Quero organizar o Primeiro Concurso Real de Poesia. O prêmio: uma coroa de louros. O vencedor: eu, provavelmente."',
        choices: [
          { label: 'Aprovar o concurso', sub: '−30 ouro, a corte se diverte', color: 'dourado', icon: 'moedas', effects: { res: { ouro: -30, prestigio: 3, povo: 2 }, rel: { florian: 10 }, flags: { concursoPoesia: true }, xp: 8 }, reply: 'O concurso tem dezessete poetas. Florian perde para Pimenta, que recita uma ode aos pés do Lorde Otho. Florian chora de raiva.' },
          { label: 'Mão pequena?!', sub: 'Ofendido', color: 'vermelho', icon: 'coroa', effects: { rel: { florian: -8 }, res: { prestigio: 1 }, xp: 5 }, reply: '"Metáfora, Majestade! Metáfora da delicadeza!" Florian sai de costas, curvado, recitando desculpas em versos alexandrinos.' },
          { label: 'Exige Poesia Cortesã: desafiá-lo', sub: 'Duelo de versos', color: 'roxo', icon: 'livro', req: { knowledge: 'poesia' }, effects: { res: { prestigio: 6 }, rel: { florian: 6 }, loyalty: { seren: 2 }, xp: 18 }, reply: 'Você improvisa um soneto sobre um poeta vaidoso que rima "louro" com "tesouro". Catorze versos perfeitos. Florian se ajoelha. "Mestre." A corte aplaude de pé.' },
        ],
      },
    },
  },
  {
    id: 'salvio_panico', speaker: 'salvio', topic: 'O cozinheiro em pânico', kind: 'urgente', minDay: 5, weight: 2,
    nodes: {
      start: {
        text: 'Mestre Sálvio entra com uma concha na mão, suando. "Majestade, NÃO COMA O JANTAR. Alguém mexeu no meu molho. Estava com dezoito ingredientes, agora tem dezenove. Eu SENTI. Um cozinheiro sente."',
        choices: [
          { label: 'Mandar o provador experimentar', sub: 'Pobre provador', color: 'azul', icon: 'olho', effects: { rel: { salvio: 4 }, xp: 8 }, reply: 'O provador experimenta, sorri e diz que é o melhor molho da vida dele. O décimo nono ingrediente era uma pitada de sal que Bianca colocou escondido. Sálvio exige a cabeça dela. Você nega.' },
          { label: 'Exige Venenos da Corte: cheirar o molho', sub: 'Especialista', color: 'verde', icon: 'livro', req: { knowledge: 'venenos' }, effects: { rel: { salvio: 10 }, res: { influencia: 3 }, xp: 14 }, reply: 'Sal. Só sal. Mas você também percebe que o vinho da adega real está diluído com água. Corvin tem explicações a dar.' },
          { label: 'Comer mesmo assim, na frente dele', sub: 'Coragem ou tédio', color: 'vermelho', icon: 'coroa', effects: { res: { prestigio: 3, moral: 2 }, rel: { salvio: -3 }, xp: 8 }, reply: 'Você come tudo. Nada acontece. Sálvio fica decepcionado de você não ter morrido, porque aí ele teria razão.' },
        ],
      },
    },
  },
  {
    id: 'pimenta_brandt', speaker: 'brandt', topic: 'O bobo e o urso', kind: 'audiencia', minDay: 4, weight: 3,
    nodes: {
      start: {
        text: 'Lorde Brandt Drakon entra furioso, arrastando Pimenta pela gola. "Majestade! Este... ESTE BOBO... compôs uma música chamada “O Urso que Tem Medo de Pato”. Sobre mim. A cidade inteira está cantando. Exijo que ele seja enforcado. Ou que pare de cantar. Enforcado de preferência."',
        choices: [
          { label: 'Pedir que Pimenta cante a música', sub: 'Pela justiça, claro', color: 'dourado', icon: 'balao', effects: { rel: { pimenta: 8, brandt: -8 }, loyalty: { drakon: -4 }, res: { povo: 3, moral: 2 }, xp: 8 }, reply: 'Pimenta canta. Tem sete estrofes. Na quinta, até os guardas choram de rir. Brandt sai sem se despedir.' },
          { label: 'O bobo tem imunidade', sub: 'Tradição', color: 'azul', icon: 'pergaminho', effects: { rel: { pimenta: 6, brandt: -3 }, res: { prestigio: 1 }, xp: 8 }, reply: '"Bobos dizem o que os lordes pensam e os reis não podem dizer. É a lei mais antiga da corte." Brandt resmunga, mas aceita. E compra uma cópia da letra.' },
          { label: 'Obrigar Pimenta a compor uma sobre a coragem de Brandt', sub: 'Diplomacia', color: 'verde', icon: 'aperto', effects: { rel: { pimenta: -2, brandt: 10 }, loyalty: { drakon: 5 }, xp: 10 }, reply: 'A nova música se chama "O Urso Corajoso Que Não Tinha Medo de Pato Nenhum". É pior que a primeira. Brandt adora.' },
        ],
      },
    },
  },
  {
    id: 'papagaio_escandalo', speaker: 'aldric', topic: 'O papagaio sabe demais', kind: 'audiencia', minDay: 6, weight: 6, cond: (s) => !!s.flags.papagaio,
    nodes: {
      start: {
        text: '"Majestade, temos um problema de segurança." Aldric aponta para o papagaio no poleiro. O papagaio grita: "OTHO É UM RATO! GASPARD TEM PERUCA! O REI RONCA!" Aldric suspira. "Ele repete tudo que ouve no seu gabinete. Os lordes estão ouvindo."',
        choices: [
          { label: 'Mandá-lo para Véridian', sub: 'Exílio da ave', color: 'azul', icon: 'seta', effects: { flags: { papagaio: false }, rel: { kasim: -3 }, res: { prestigio: 1 }, xp: 6 }, reply: 'O papagaio parte gritando "TRAIÇÃO!". Um mês depois chega uma carta de Véridian: o papagaio agora é conselheiro do rei de lá.' },
          { label: 'Ensinar a ele coisas novas', sub: 'Espionagem reversa', color: 'roxo', icon: 'mascara', effects: { res: { influencia: 5 }, xp: 14 }, reply: 'Você ensina o papagaio a repetir: "OS DRAKON TÊM MIL HOMENS NA FRONTEIRA". Os espiões de Norhelm relatam isso em pânico. Não é verdade.' },
          { label: 'Gaspard tem peruca?', sub: 'Curiosidade', color: 'dourado', icon: 'olho', effects: { rel: { gaspard: -4 }, res: { povo: 1 }, xp: 5 }, reply: 'Tem. A corte inteira confirma o rumor na semana seguinte, quando um vento forte leva a peruca de Gaspard para o fosso.' },
        ],
      },
    },
  },
  {
    id: 'moedas_orelhas', speaker: 'corvin', topic: 'As moedas com orelhas grandes', kind: 'audiencia', minDay: 5, weight: 3,
    nodes: {
      start: {
        text: 'Mestre Corvin coloca uma moeda na mesa com a mão tremendo. "Majestade, estão cunhando moedas falsas com o seu rosto. Dá para saber que são falsas porque..." ele pigarreia, "...o artista exagerou nas orelhas. Muito. O povo prefere as falsas. Diz que são mais parecidas."',
        choices: [
          { label: 'Minhas orelhas são normais', sub: 'Vaidade ferida', color: 'vermelho', icon: 'coroa', effects: { res: { prestigio: -1 }, rel: { corvin: -2 }, xp: 5 }, reply: 'Corvin olha para as suas orelhas. Depois para a moeda. Depois para o chão. "Claro, Majestade."' },
          { label: 'Caçar os falsificadores', sub: 'Proteger o tesouro', color: 'azul', icon: 'olho', effects: { res: { ouro: 40, povo: -1 }, rel: { corvin: 6 }, xp: 10 }, reply: 'Os falsificadores são dois irmãos ourives de Valmont. Você confisca as moedas. Elas valem mais como curiosidade que como dinheiro.' },
          { label: 'Exige Contabilidade Real: recolher e recunhar', sub: 'Lucro', color: 'verde', icon: 'livro', req: { knowledge: 'contabilidade' }, effects: { res: { ouro: 90 }, rel: { corvin: 10 }, xp: 16 }, reply: 'Você troca cada moeda falsa por meia moeda verdadeira, derrete as falsas e lucra com a prata. Corvin chora de emoção. "O senhor é o filho que eu nunca tive."' },
          { label: 'Contratar o artista como cunhador oficial', sub: 'Humor real', color: 'dourado', icon: 'balao', effects: { res: { povo: 5, prestigio: -2 }, rel: { pimenta: 6 }, xp: 10 }, reply: 'As moedas oficiais agora têm orelhas enormes. O povo adora o rei que ri de si mesmo. Os lordes acham ultrajante. Os lordes não usam moedas, usam crédito.' },
        ],
      },
    },
  },
  {
    id: 'bruna_coroa', speaker: 'bruna', topic: 'Uma coroa nova', kind: 'audiencia', minDay: 6, weight: 3,
    nodes: {
      start: {
        text: 'Bruna, a ferreira da capital, coloca uma coroa de ferro no chão. O chão racha um pouco. "Majestade, fiz uma coroa nova. A sua é de ouro, mole, qualquer espada amassa. Esta é de ferro das montanhas. Pesa só onze quilos. Aguenta um machado."',
        choices: [
          { label: 'Experimentar', sub: 'Pescoço real em risco', color: 'dourado', icon: 'coroa', effects: { res: { povo: 4 }, rel: { bruna: 12 }, xp: 8 }, reply: 'Você coloca a coroa e seu pescoço estala. Você mantém a pose por dez segundos heroicos. O povo na porta aplaude. Bruna chora de orgulho.' },
          { label: 'Transformar em espada para a guarda', sub: 'Utilidade', color: 'azul', icon: 'espadas', effects: { res: { moral: 3 }, rel: { bruna: 6, aurelian: 4 }, xp: 8 }, reply: 'A coroa vira três espadas e um capacete. O capacete fica com o Capitão Aurelian, que diz que agora pensa melhor.' },
          { label: 'Pagar e guardar no tesouro', sub: '−25 ouro', color: 'verde', icon: 'moedas', effects: { res: { ouro: -25, povo: 2 }, rel: { bruna: 8 }, xp: 6 }, reply: 'A coroa de ferro fica exposta na sala do tesouro. Corvin usa como peso de porta.' },
        ],
      },
    },
  },
  {
    id: 'tomas_pao', speaker: 'tomas', topic: 'O pão com a cara do rei', kind: 'audiencia', minDay: 4, weight: 3,
    nodes: {
      start: {
        text: 'Tomás, o padeiro, traz um pão redondo com o seu rosto desenhado em farinha. "Majestade! Inventei o Pão Real! Vendo quinhentos por dia. Mas agora a Guilda diz que eu preciso pagar pelo uso da imagem do rei. Quem é dono da cara do rei, Majestade? O rei ou a Guilda?"',
        choices: [
          { label: 'Minha cara é do povo', sub: 'Liberar', color: 'verde', icon: 'povo', effects: { res: { povo: 6 }, rel: { tomas: 12, tobias: -6 }, xp: 10 }, reply: 'Em uma semana existem pães reais, queijos reais e uma cerveja chamada "O Rei Mandou". Você está em toda parte. Até nos banheiros.' },
          { label: 'Cobrar direitos: um décimo', sub: '+30 ouro por semana... ou quase', color: 'dourado', icon: 'moedas', effects: { res: { ouro: 40, povo: -3 }, rel: { tomas: -5 }, xp: 8 }, reply: 'Tomás paga, reclamando. Os pães seguintes têm o seu rosto com uma expressão levemente mais avarenta.' },
          { label: 'Provar o pão primeiro', sub: 'Prioridades', color: 'azul', icon: 'trigo', effects: { rel: { tomas: 8 }, res: { povo: 2 }, xp: 6 }, reply: 'O pão é excelente. Você come a própria bochecha e depois a testa. Tomás considera isso uma bênção oficial.' },
        ],
      },
    },
  },
  {
    id: 'frei_profecia', speaker: 'frei_aske', topic: 'A profecia do Frei', kind: 'audiencia', minDay: 7, weight: 2,
    nodes: {
      start: {
        text: 'Frei Aske ergue um pergaminho amassado. "Majestade, encontrei nas crônicas antigas uma profecia: quando um rei menino sentar no trono de carvalho, um cervo branco aparecerá, e o reino terá cem anos de paz ou de guerra." Ele pisca. "Ou era um cervo marrom. A tinta borrou."',
        choices: [
          { label: 'Mandar caçar um cervo branco', sub: 'Tornar a profecia real', color: 'dourado', icon: 'arvore', effects: { res: { prestigio: 5, ouro: -30 }, rel: { aveline: 5 }, loyalty: { seren: 3 }, xp: 10 }, reply: 'Os caçadores voltam com um cervo pintado de cal. O povo aceita. Os Seren sabem que é pintado, mas gostam do respeito.' },
          { label: 'Exige O Livro dos Carvalhos: a profecia está incompleta', sub: 'Fé com erudição', color: 'verde', icon: 'livro', req: { knowledge: 'fe' }, effects: { loyalty: { seren: 8 }, rel: { aveline: 10, frei_aske: 6 }, res: { prestigio: 4 }, xp: 18 }, reply: 'Você cita o verso seguinte, que Frei Aske não sabia: "e o cervo será visto por quem proteger os carvalhos". Aveline Seren ouve falar e manda uma carta emocionada.' },
          { label: 'Profecias são para vender almanaques', sub: 'Ceticismo', color: 'vermelho', icon: 'balao', effects: { rel: { frei_aske: -6, theodric: 4 }, loyalty: { seren: -2 }, xp: 6 }, reply: 'Frei Aske fica ofendido. Uma semana depois lança um almanaque. Vende muito bem.' },
        ],
      },
    },
  },
  {
    id: 'bram_voto', speaker: 'sir_bram', topic: 'O cavaleiro que não fala', kind: 'audiencia', minDay: 6, weight: 3,
    nodes: {
      start: {
        text: 'Sir Bram Salgueiro, cavaleiro dos Seren, fez voto de silêncio há três anos. Ele está tentando comunicar algo importante por mímica. Aponta para o norte. Faz um lobo. Faz um barco. Morre dramaticamente. Levanta. Faz o gesto de "dinheiro". Aponta para você.',
        choices: [
          { label: 'Norhelm vai atacar por mar e quer resgate?', sub: 'Adivinhar', color: 'azul', icon: 'olho', effects: { rel: { sir_bram: 6 }, xp: 8 }, reply: 'Bram balança a cabeça, frustrado. Desenha no chão com a espada: é o preço do peixe que subiu no norte. Ele só queria reclamar do peixe.' },
          { label: 'Liberar o voto só por hoje', sub: 'Autoridade real', color: 'dourado', icon: 'coroa', effects: { rel: { sir_bram: 10 }, loyalty: { seren: 3 }, flags: { bramFalou: true }, xp: 10 }, reply: 'Bram abre a boca pela primeira vez em três anos: "Os barcos de Norhelm estão pescando nas nossas águas." Depois fala por quatro horas seguidas sobre tudo o que viu. Você se arrepende um pouco.' },
          { label: 'Chamar Pimenta para traduzir', sub: 'Caos', color: 'roxo', icon: 'balao', effects: { rel: { pimenta: 5, sir_bram: -4 }, res: { moral: 2 }, xp: 6 }, reply: 'Pimenta "traduz": "Sir Bram diz que está apaixonado pelo cavalo do Lorde Otho." Bram persegue Pimenta pelo castelo, em silêncio absoluto.' },
        ],
      },
    },
  },
  {
    id: 'kasim_afrodisiaco', speaker: 'kasim', topic: 'Especiarias de efeito duvidoso', kind: 'audiencia', minDay: 8, weight: 2,
    nodes: {
      start: {
        text: 'Kasim entra com uma caixinha dourada. "Grande Rei, em confiança: o Pó do Sultão. Uma pitada no vinho e... como direi... a rainha nunca mais olha para outro. Ou o rei nunca mais dorme. Varia." Ele pisca. "Metade da corte já comprou. Lorde Otho comprou três."',
        choices: [
          { label: 'Proibir a venda na corte', sub: 'Decência', color: 'azul', icon: 'escudo', effects: { rel: { kasim: -6, isabelle: 4 }, res: { prestigio: 1 }, xp: 6 }, reply: 'A venda é proibida. O preço no mercado negro triplica. Kasim agradece a publicidade.' },
          { label: 'Comprar uma caixinha', sub: 'Para pesquisa', color: 'roxo', icon: 'coracao', effects: { res: { ouro: -20 }, rel: { kasim: 8 }, run: (s) => { if (s.spouse) s.rel[s.spouse] = (s.rel[s.spouse] ?? 0) + 4; }, xp: 6 }, reply: (s) => (s.spouse ? `É canela com pimenta. ${sp(s)} espirra a noite inteira. Vocês riem tanto que funciona do mesmo jeito.` : 'É canela com pimenta. Você espirra a noite inteira sozinho, o que é deprimente em vários níveis.') },
          { label: 'Exige Ervas e Curas: denunciar a fraude', sub: 'Proteger os tolos', color: 'verde', icon: 'livro', req: { knowledge: 'medicina' }, effects: { res: { povo: 3, ouro: 30 }, rel: { kasim: -10, irma: 5 }, xp: 14 }, reply: 'Você revela que é canela, pimenta e pó de tijolo. Kasim devolve o dinheiro de todo mundo. Menos o de Otho, que tem vergonha demais para pedir.' },
        ],
      },
    },
  },
  {
    id: 'duelo_cabra', speaker: 'sir_ferrao', topic: 'Um duelo por uma cabra', kind: 'audiencia', minDay: 5, weight: 3,
    nodes: {
      start: {
        text: 'Sir Gerald Ferrão (Drakon) e Sir Aldo Picoalto (Montclair) entram de armadura completa. "Majestade, pedimos licença para um duelo até a morte." "Por quê?", pergunta Aldric. Silêncio. "...Uma cabra", admite Ferrão. "A MINHA cabra", corrige Picoalto.',
        choices: [
          { label: 'Autorizar o duelo', sub: 'Honra é honra', color: 'vermelho', icon: 'espadas', effects: { res: { moral: 3 }, loyalty: { drakon: 2, montclair: -3 }, xp: 8 }, reply: 'O duelo dura duas horas. Ninguém morre, porque as armaduras são boas demais. A cabra come o estandarte dos Montclair durante a luta. Declara-se empate.' },
          { label: 'A cabra decide', sub: 'Justiça animal', color: 'dourado', icon: 'balao', effects: { res: { povo: 3 }, loyalty: { drakon: 1, montclair: 1 }, rel: { pimenta: 4 }, xp: 10 }, reply: 'A cabra é solta no meio do salão. Ela vai direto até o trono e come a barra do seu manto. A corte declara: a cabra é do rei. Os dois cavaleiros aceitam, aliviados.' },
          { label: 'Exige Justiça 1: quem alimentou a cabra no inverno?', sub: 'Lei de posse', color: 'azul', icon: 'martelo', req: { attr: ['justica', 1] }, effects: { loyalty: { drakon: 3, montclair: 3 }, res: { prestigio: 3 }, xp: 14 }, reply: 'Quem alimentou foi Ferrão. A cabra é dele. Picoalto recebe um cabrito como consolo. Os dois saem amigos, o que é muito mais perigoso.' },
        ],
      },
    },
  },
  {
    id: 'retrato_feio', speaker: 'mensageiro', topic: 'O retrato oficial', kind: 'audiencia', minDay: 6, weight: 3,
    nodes: {
      start: {
        text: 'Pip, o mensageiro, desvela um quadro enorme. É o seu retrato oficial, encomendado por Aldric. O pintor fez você com um queixo gigante, um olho mais alto que o outro e um cachorro que você não tem. "O pintor diz que é arte moderna, Majestade. E que já gastou o adiantamento."',
        choices: [
          { label: 'Pendurar no salão mesmo assim', sub: 'Humildade', color: 'verde', icon: 'coroa', effects: { res: { povo: 3, prestigio: -2 }, rel: { pimenta: 5 }, xp: 8 }, reply: 'O retrato vira atração. Os lordes ficam na frente dele com expressões de tortura para não rir. Pimenta cobra ingresso.' },
          { label: 'Mandar pintar de novo', sub: '−40 ouro', color: 'dourado', icon: 'moedas', effects: { res: { ouro: -40, prestigio: 2 }, xp: 6 }, reply: 'O segundo retrato é perfeito e sem graça nenhuma. Ninguém lembra dele. Todo mundo lembra do primeiro.' },
          { label: 'Quem é esse cachorro?', sub: 'Mistério', color: 'roxo', icon: 'olho', effects: { flags: { cachorroReal: true }, rel: { aurelian: 4 }, res: { moral: 2 }, xp: 8 }, reply: 'O pintor explica que "todo rei precisa de um cachorro". Na semana seguinte, Aurelian aparece com um vira-lata do quartel. Agora você tem um cachorro. Ele se chama Retrato.' },
        ],
      },
    },
  },
  {
    id: 'meias_sumidas', speaker: 'clara', topic: 'O mistério das meias', kind: 'audiencia', minDay: 5, weight: 3,
    nodes: {
      start: {
        text: 'Clara, a camareira, entra muito vermelha. "Majestade, desapareceram onze meias reais esta semana. Só as esquerdas. Os guardas desconfiam de mim. Eu juro que não fui. Eu só levei uma. Para lavar. Com carinho."',
        choices: [
          { label: 'Investigar o ladrão de meias', sub: 'Caso do século', color: 'roxo', icon: 'olho', effects: { rel: { clara: 6 }, res: { moral: 2 }, xp: 10 }, reply: 'Aurelian passa dois dias numa operação de vigilância. O ladrão é o cachorro do quartel, que guarda as meias num buraco no jardim. Todas esquerdas. Ninguém sabe por quê.' },
          { label: 'Pode ficar com uma, Clara', sub: 'Flertar sem querer', color: 'dourado', icon: 'coracao', effects: { rel: { clara: 12 }, flags: { admiradoraClara: true }, xp: 6 }, reply: 'Clara quase desmaia. Sai do salão abraçada à meia como a uma relíquia. Lady Maren anota.' },
          { label: 'Comprar meias novas', sub: '−5 ouro', color: 'azul', icon: 'moedas', effects: { res: { ouro: -5 }, xp: 3 }, reply: 'Problema resolvido. O ladrão, no entanto, continua solto. Semana que vem somem os chinelos.' },
        ],
      },
    },
  },
  {
    id: 'urso_presente', speaker: 'gaspard', topic: 'Um presente vivo', kind: 'audiencia', minDay: 9, weight: 2,
    nodes: {
      start: {
        text: 'Lorde Gaspard sorri como quem vende um navio furado. "Majestade, um presente da Casa Valmont!" Quatro homens empurram uma jaula. Dentro, um urso. Grande. Acordado. Com fome. "Capturado nas ilhas. Símbolo de força! E come só... bastante."',
        choices: [
          { label: 'Aceitar e dar um nome', sub: 'Mascote real', color: 'dourado', icon: 'leao', effects: { res: { ouro: -20, moral: 4, povo: 3 }, rel: { gaspard: 6 }, flags: { ursoReal: true }, xp: 8 }, reply: 'O urso se chama Chanceler. Aldric não acha graça. O urso come vinte moedas de peixe por semana e adora Pimenta.' },
          { label: 'Devolvê-lo com um bilhete', sub: 'Ironia', color: 'azul', icon: 'pergaminho', effects: { rel: { gaspard: -4 }, res: { prestigio: 2 }, xp: 8 }, reply: 'O bilhete diz: "Lorde Gaspard precisa mais de força que eu." Gaspard entende a piada três dias depois e fica ofendido com atraso.' },
          { label: 'Dar o urso para Brandt', sub: 'Presente com presente', color: 'verde', icon: 'aperto', effects: { rel: { gaspard: -6, brandt: 12 }, loyalty: { drakon: 5, valmont: -3 }, xp: 10 }, reply: 'Brandt fica emocionado. Diz que agora pode provar a história do urso. O urso, pelo visto, também tem uma versão.' },
        ],
      },
    },
  },
  {
    id: 'ratos_tesouro', speaker: 'corvin', topic: 'Ratos no tesouro', kind: 'audiencia', minDay: 8, weight: 2,
    nodes: {
      start: {
        text: '"Majestade, uma tragédia." Corvin segura restos de papel. "Os ratos comeram os registros de impostos dos Valmont. Três anos. Não sabemos mais quem pagou o quê. Gaspard já mandou dizer que “pagou tudo, com certeza, e um pouco mais”."',
        choices: [
          { label: 'Acreditar em Gaspard', sub: 'Fé nos homens', color: 'azul', icon: 'aperto', effects: { rel: { gaspard: 8 }, loyalty: { valmont: 5 }, res: { ouro: -60 }, xp: 6 }, reply: 'Gaspard fica radiante. Você nunca vai saber quanto perdeu. Gaspard sabe, e vai rir disso no jantar por anos.' },
          { label: 'Cobrar tudo de novo', sub: 'Na dúvida, cobra', color: 'vermelho', icon: 'moedas', effects: { res: { ouro: 100 }, loyalty: { valmont: -10 }, rel: { gaspard: -8 }, xp: 8 }, reply: 'Os Valmont pagam três anos outra vez, gritando. As outras casas escondem seus livros-caixa.' },
          { label: 'Comprar gatos para o tesouro', sub: 'Prevenção', color: 'dourado', icon: 'leao', effects: { res: { ouro: -10 }, rel: { corvin: 6 }, xp: 5 }, reply: 'Três gatos são nomeados Guardiões do Tesouro. Um deles se chama Sargento Bigodes Segundo. Os ratos se mudam para a biblioteca. Theodric declara guerra.' },
        ],
      },
    },
  },
  {
    id: 'livro_roubado', speaker: 'theodric', topic: 'Um livro sumiu', kind: 'audiencia', minDay: 9, weight: 3,
    nodes: {
      start: {
        text: 'Theodric está furioso, o que nele parece um gato molhado. "Majestade! Alguém roubou um livro da seção proibida. Venenos da Corte. A única cópia. Quem assinou o registro foi... “Uma Dama”. Com um R inclinado."',
        choices: [
          { label: 'R inclinado... Lysandra?', sub: 'Ligar os pontos', color: 'roxo', icon: 'mascara', req: { test: (s) => !!s.flags.lysandra || !!s.flags.conspiracaoRevelada, label: 'Ter conhecido Lady Lysandra' }, effects: { flags: { conspiracaoRevelada: true, amendoaCozinha: true }, loyalty: { montclair: -3 }, res: { influencia: 4 }, xp: 16 }, reply: 'Theodric empalidece. "Uma dama que estuda venenos. Majestade, eu não comeria nada que ela servisse." O livro aparece na manhã seguinte, com uma página arrancada: a das amêndoas.' },
          { label: 'Oferecer recompensa', sub: '−20 ouro', color: 'dourado', icon: 'moedas', effects: { res: { ouro: -20 }, rel: { theodric: 6 }, xp: 6 }, reply: 'O livro volta em dois dias, trazido por um criado que "o achou no jardim". Faltam três páginas.' },
          { label: 'É só um livro, meistre', sub: 'Pouco caso', color: 'vermelho', icon: 'balao', effects: { rel: { theodric: -10 }, xp: 3 }, reply: '"SÓ UM LIVRO?" Theodric não fala com você por dois dias e esconde o próximo livro que você ia ler.' },
        ],
      },
    },
  },
  {
    id: 'viuva_filho', speaker: 'viuva', topic: 'Uma mãe e um soldado', kind: 'audiencia', minDay: 10, weight: 3,
    nodes: {
      start: {
        text: 'A Viúva Greta segura um pão como se fosse um escudo. "Majestade, meu marido morreu na guerra do seu pai. Meus dois filhos mais velhos, também. O mais novo, Joca, tem quinze anos e foi recrutado ontem. Ele não sabe segurar nem uma colher direito. Devolva meu menino."',
        choices: [
          { label: 'Liberar o Joca', sub: 'Compaixão', color: 'verde', icon: 'coracao', effects: { res: { povo: 5, exercito: -5 }, rel: { viuva: 15 }, xp: 12 }, reply: 'Joca volta para casa de uniforme grande demais. Greta beija sua mão e sai sem dizer nada. Na vila, as mães passam a rezar pelo rei.' },
          { label: 'Transformá-lo em mensageiro do castelo', sub: 'Serviço sem batalha', color: 'azul', icon: 'pergaminho', effects: { res: { povo: 3 }, rel: { viuva: 10, mensageiro: 4 }, xp: 12 }, reply: 'Joca vira ajudante de Pip. Em uma semana, perde três cartas e acha uma conspiração por acidente.' },
          { label: 'O reino precisa de soldados', sub: 'Dureza', color: 'vermelho', icon: 'espadas', effects: { res: { povo: -5 }, rel: { viuva: -20 }, xp: 5 }, reply: 'Greta não chora. Deixa o pão na escada do trono e vai embora. Ninguém tem coragem de comer o pão.' },
          { label: 'Exige Justiça 3: lei do último filho', sub: 'Mudar a lei', color: 'dourado', icon: 'martelo', req: { attr: ['justica', 3] }, effects: { res: { povo: 10, exercito: -30 }, rel: { viuva: 20, marta: 8 }, law: 'Lei do Último Filho', xp: 22 }, reply: 'A partir de hoje, nenhuma família perde o último filho para a guerra. O exército perde trinta homens. O reino ganha trinta mães que nunca vão esquecer.' },
        ],
      },
    },
  },
  {
    id: 'aldric_ferias', speaker: 'aldric', topic: 'O chanceler está cansado', kind: 'conselho', minDay: 14, weight: 2,
    nodes: {
      start: {
        text: 'Aldric pousa o cajado com um suspiro de oitenta anos. "Majestade, servi seu avô, seu pai e agora o senhor. Em cinquenta anos tirei dois dias de folga. Num deles, seu pai declarou guerra a Norhelm. Gostaria de uma semana à beira-mar. Prometo levar a correspondência. Não prometo ler."',
        choices: [
          { label: 'Vá, velho amigo', sub: 'Uma semana sem Aldric', color: 'verde', icon: 'coracao', effects: { rel: { aldric: 15 }, res: { influencia: -4 }, xp: 10 }, reply: 'Aldric parte com um chapéu de palha ridículo. A corte fica um caos por uma semana. Ele volta bronzeado e insuportavelmente calmo.' },
          { label: 'Depois da crise, Aldric', sub: 'Ainda preciso de você', color: 'azul', icon: 'ampulheta', effects: { rel: { aldric: -3 }, res: { influencia: 2 }, xp: 6 }, reply: '"Sempre há uma crise, Majestade. Por isso nunca há férias." Ele volta ao trabalho, resmungando em latim.' },
          { label: 'Mandá-lo com Isabelle', sub: 'Maldade', color: 'roxo', icon: 'balao', effects: { rel: { aldric: -6, isabelle: -4, pimenta: 8 }, res: { moral: 2 }, xp: 8 }, reply: 'Os dois voltam em dois dias. Cada um com uma versão diferente de quem jogou quem no mar. Pimenta faz uma peça de teatro sobre isso.' },
        ],
      },
    },
  },
  {
    id: 'guardas_apostas', speaker: 'aurelian', topic: 'O torneio de primavera', kind: 'audiencia', minDay: 12, weight: 2,
    nodes: {
      start: {
        text: 'Aurelian traz um cavaleiro sem nome, de armadura verde e elmo fechado, que venceu todos no pátio de treino, incluindo Sir Osric, que agora mancando exige revanche. "Majestade, o Cavaleiro Verde pede para lutar no torneio real. Ninguém sabe quem é."',
        choices: [
          { label: 'Tire o elmo', sub: 'Quero saber', color: 'azul', icon: 'olho', goto: 'elmo' },
          { label: 'Deixá-lo lutar com o mistério', sub: 'Espetáculo', color: 'dourado', icon: 'espadas', effects: { res: { povo: 5, moral: 4 }, rel: { sir_osric: -4 }, xp: 8 }, reply: 'O Cavaleiro Verde vence o torneio inteiro e desaparece antes da premiação. Deixa só um bilhete: "Até a próxima primavera." O povo enlouquece.' },
        ],
      },
      elmo: {
        text: (s) => (s.flags.met_rhoswen ? 'O cavaleiro tira o elmo. Cabelo vermelho, sorriso torto: é Lady Rhoswen Drakon. "Meu pai não me deixa lutar em torneios. O senhor deixa?"' : 'O cavaleiro tira o elmo. É uma moça de cabelos vermelhos e cara de poucos amigos. "Sou Rhoswen, filha do Brandt. Meu pai não me deixa lutar. O senhor deixa?"'),
        choices: [
          { label: 'Deixo. E aposto em você', sub: 'Admiração', color: 'verde', icon: 'coracao', effects: { rel: { rhoswen: 15, brandt: -4 }, flags: { met_rhoswen: true }, res: { moral: 4 }, xp: 12 }, reply: 'Ela vence. Brandt, na plateia, alterna entre fúria e orgulho de pai até desistir e gritar mais alto que todos.' },
          { label: 'Seu pai tem razão', sub: 'Tradição', color: 'vermelho', icon: 'escudo', effects: { rel: { rhoswen: -12, brandt: 6 }, flags: { met_rhoswen: true }, xp: 6 }, reply: '"Então o senhor é igual a ele." Ela recoloca o elmo e sai. Você acaba de perder pontos com a moça mais perigosa do reino.' },
        ],
      },
    },
  },
  {
    id: 'hedda_sapos', speaker: 'irma', topic: 'Uma cura esquisita', kind: 'audiencia', minDay: 7, weight: 2,
    nodes: {
      start: {
        text: 'Irmã Hedda coloca um pote cheio de sapos na mesa do conselho. Aldric se afasta dois metros. "Majestade, o médico da corte receita sapos para a gota de Lorde Gaspard. Sapos. Vivos. Na perna. Eu quero autorização para expulsar esse charlatão e cuidar dos lordes eu mesma."',
        choices: [
          { label: 'Autorizar Hedda', sub: 'Ciência do povo', color: 'verde', icon: 'coracao', effects: { rel: { irma: 12, gaspard: 4 }, res: { povo: 2 }, xp: 10 }, reply: 'Hedda cura a gota de Gaspard com chá de salgueiro e menos vinho. Gaspard agradece à Hedda e reclama do chá por igual.' },
          { label: 'Exige Ervas e Curas: fazer um teste público', sub: 'Sapos contra ervas', color: 'roxo', icon: 'livro', req: { knowledge: 'medicina' }, effects: { rel: { irma: 16 }, res: { prestigio: 4, povo: 4 }, xp: 18 }, reply: 'Dois doentes, dois tratamentos, uma semana. O paciente das ervas melhora. O dos sapos só fica com medo de sapos. O charlatão foge do reino.' },
          { label: 'Deixar os sapos em paz', sub: 'Tradição médica', color: 'azul', icon: 'balao', effects: { rel: { irma: -8 }, xp: 3 }, reply: 'Os sapos continuam na perna de Gaspard. Hedda anota o nome do rei num caderno. É um caderno curto e perigoso.' },
        ],
      },
    },
  },
  {
    id: 'maren_fofoca', speaker: 'dama', topic: 'A lista de Lady Maren', kind: 'audiencia', minDay: 8, weight: 2,
    nodes: {
      start: {
        text: 'Lady Maren abre um leque. "Majestade, venho oferecer meus serviços. Eu sei quem dorme com quem, quem deve a quem, e quem mente sobre as duas coisas. Por uma pequena pensão, o senhor recebe tudo. Semanalmente. Com desenhos."',
        choices: [
          { label: 'Contratar Lady Maren', sub: '−30 ouro, fofoca útil', color: 'roxo', icon: 'mascara', effects: { res: { ouro: -30, influencia: 6 }, rel: { dama: 10 }, flags: { fofoqueira: true }, xp: 12 }, reply: 'O primeiro relatório tem doze páginas. Na página nove, há um desenho seu. Você decide não perguntar.' },
          { label: 'E o que dizem de mim?', sub: 'Vaidade', color: 'dourado', icon: 'olho', effects: { rel: { dama: 4 }, xp: 8 }, reply: (s) => `"Que o senhor é bonito, mas decide devagar. Que ${s.spouse ? `${sp(s)} manda mais do que parece` : 'ainda não sabe beijar'}. E que ronca." Todo mundo sabe que você ronca.` },
          { label: 'Fofoca é veneno', sub: 'Recusar', color: 'azul', icon: 'escudo', effects: { rel: { dama: -6 }, res: { prestigio: 1 }, xp: 5 }, reply: '"Veneno é o que servem nos jantares, Majestade. Fofoca é o antídoto." Ela sai, ofendida e com uma nova história para contar.' },
        ],
      },
    },
  },
  {
    id: 'aveline_arvore', speaker: 'aveline', topic: 'Um carvalho caiu', kind: 'audiencia', minDay: 10, weight: 2,
    nodes: {
      start: {
        text: 'Aveline Seren entra de preto. "Majestade, o Carvalho dos Reis caiu esta noite. Aquele sob o qual seu avô foi coroado. O povo diz que é mau presságio. Os Montclair dizem que é madeira grátis. Eu digo que alguém serrou a base."',
        choices: [
          { label: 'Investigar quem serrou', sub: 'Justiça para a árvore', color: 'azul', icon: 'olho', effects: { loyalty: { seren: 6, montclair: -4 }, rel: { aveline: 6 }, xp: 10 }, reply: 'O serrador é um lenhador pago em ferro. Ferro de Cinzel. Os Montclair negam, é claro. Aveline não esquece, é claro.' },
          { label: 'Exige O Livro dos Carvalhos: plantar dez', sub: 'O rito antigo', color: 'verde', icon: 'livro', req: { knowledge: 'fe' }, effects: { loyalty: { seren: 12 }, rel: { aveline: 12, frei_aske: 4 }, res: { ouro: -20, povo: 3 }, xp: 18 }, reply: 'Você mesmo planta a primeira muda, de joelhos na lama. Aveline, pela primeira vez, se curva a você de verdade.' },
          { label: 'Vender a madeira', sub: '+70 ouro', color: 'vermelho', icon: 'madeira', effects: { res: { ouro: 70 }, loyalty: { seren: -12 }, rel: { aveline: -12 }, xp: 5 }, reply: 'Otho compra a madeira. Aveline manda uma carta com uma única palavra: "Lembraremos." Os Seren lembram.' },
        ],
      },
    },
  },
  {
    id: 'lucas_poesia', speaker: 'lucas', topic: 'Lucas quer ser alguém', kind: 'familia', minDay: 9, weight: 3,
    nodes: {
      start: {
        text: '"Irmão, tomei uma decisão." Lucas senta na escada do trono, coisa proibida. "Quero ser alguma coisa. Não príncipe reserva. Alguma coisa. Pensei em: cavaleiro, diplomata, pirata ou bardo. A mãe riscou pirata e bardo da lista antes de eu terminar de falar."',
        choices: [
          { label: 'Cavaleiro: vá treinar com Aurelian', sub: 'Espada', color: 'vermelho', icon: 'espadas', effects: { rel: { lucas: 10, aurelian: 4 }, res: { moral: 2 }, flags: { lucasCavaleiro: true }, xp: 10 }, reply: 'Lucas treina todos os dias. Em uma semana, derruba um boneco de palha. Em duas, derruba Aurelian. Aurelian diz que escorregou.' },
          { label: 'Diplomata: vá com Aldric às reuniões', sub: 'Palavras', color: 'azul', icon: 'aperto', effects: { rel: { lucas: 8, aldric: 4 }, res: { influencia: 3 }, flags: { lucasDiplomata: true }, xp: 10 }, reply: 'Lucas descobre que tem talento para fazer lordes rirem e concordarem com coisas que eles não entenderam.' },
          { label: 'Pirata. Sério. Vai ser ótimo', sub: 'Irmão legal', color: 'dourado', icon: 'balao', effects: { rel: { lucas: 14, isabelle: -8 }, res: { ouro: -20 }, xp: 8 }, reply: 'Lucas ganha um barco pequeno no porto de Valmont e um chapéu. Afunda o barco no primeiro dia. Guarda o chapéu para sempre.' },
        ],
      },
    },
  },
  {
    id: 'rainha_redecorar', speaker: 'isabelle', topic: 'A guerra das cortinas', kind: 'familia', minDay: 22, weight: 4, cond: (s) => !!s.spouse,
    nodes: {
      start: {
        text: (s) => `Isabelle entra com a mandíbula travada. "Filho. ${sp(s)} mandou trocar as cortinas do salão principal. As cortinas que EU escolhi. Há vinte anos. Azul. Ela escolheu..." ela respira fundo, "...amarelo."`,
        choices: [
          { label: 'Ficar do lado da rainha', sub: 'Esposa primeiro', color: 'azul', icon: 'coracao', effects: { rel: { isabelle: -10 }, run: (s) => { if (s.spouse) s.rel[s.spouse] = (s.rel[s.spouse] ?? 0) + 8; }, xp: 10 }, reply: 'O salão fica amarelo. Isabelle passa a usar óculos escuros de vidro fumê de Véridian toda vez que entra. Diz que é pela luz.' },
          { label: 'Ficar do lado da mãe', sub: 'Tradição', color: 'dourado', icon: 'coroa', effects: { rel: { isabelle: 10 }, run: (s) => { if (s.spouse) s.rel[s.spouse] = (s.rel[s.spouse] ?? 0) - 8; }, xp: 10 }, reply: (s) => `As cortinas voltam a ser azuis. ${sp(s)} troca então os tapetes. Por verdes. A guerra está só começando.` },
          { label: 'Metade azul, metade amarela', sub: 'Salomão das cortinas', color: 'verde', icon: 'aperto', effects: { rel: { isabelle: -2, pimenta: 6 }, run: (s) => { if (s.spouse) s.rel[s.spouse] = (s.rel[s.spouse] ?? 0) - 2; }, res: { povo: 1 }, xp: 12 }, reply: 'O salão parece uma bandeira de um país que não existe. As duas odeiam. Juntas. É a primeira coisa em que concordam, e isso as aproxima.' },
        ],
      },
    },
  },
  {
    id: 'bobo_greve', speaker: 'pimenta', topic: 'O bobo entra em greve', kind: 'audiencia', minDay: 15, weight: 2,
    nodes: {
      start: {
        text: 'Pimenta entra sem guizos, com uma placa pintada: "BOBO EM GREVE". "Majestade, a guilda dos bobos, que sou eu, exige: aumento, um chapéu novo e o direito de zombar do Chanceler Aldric às terças. Até lá, nenhuma piada. O castelo vai ficar insuportavelmente sério."',
        choices: [
          { label: 'Atender todas as exigências', sub: '−15 ouro', color: 'dourado', icon: 'moedas', effects: { res: { ouro: -15, moral: 3 }, rel: { pimenta: 12, aldric: -5 }, xp: 8 }, reply: 'Toda terça-feira, Pimenta imita Aldric no café da manhã. Aldric passa a tomar café às quartas.' },
          { label: 'Então eu serei o bobo', sub: 'Inverter os papéis', color: 'roxo', icon: 'balao', effects: { res: { povo: 4, prestigio: -3 }, rel: { pimenta: 8 }, xp: 12 }, reply: 'Você coloca o chapéu de guizos e faz uma audiência inteira como bobo. Pimenta senta no trono. Os lordes não sabem mais a quem se curvar. Pimenta encerra a greve por medo de perder o emprego.' },
          { label: 'Bobos não fazem greve', sub: 'Autoridade', color: 'vermelho', icon: 'coroa', effects: { res: { moral: -3 }, rel: { pimenta: -10 }, xp: 5 }, reply: 'A corte fica séria por três dias. É insuportável. Até Aldric pede que o bobo volte.' },
        ],
      },
    },
  },
];
