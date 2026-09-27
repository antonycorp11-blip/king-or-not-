import type { GameEvent, GameState } from '../../types';
import { nextRouteId } from '../../engine/economy';

// Início do reinado, família, conselho e demandas recorrentes das casas.
export const COURT_EVENTS: GameEvent[] = [
  {
    id: 'coroacao', speaker: 'aldric', topic: 'O primeiro dia do reinado', kind: 'conselho', day: 1,
    nodes: {
      start: {
        text: (s) => `Majestade... Rei ${s.kingName}. Seu pai partiu cedo demais, e o reino não podia esperar. Norhelm afia as espadas no norte, e por isso o conselho o coroou sem rainha. Os lordes vão testá-lo. Você tem 20 dias para escolher uma esposa e selar alianças. Como deseja começar?`,
        choices: [
          { label: 'Governarei com firmeza', sub: 'Mostrar autoridade', color: 'vermelho', icon: 'coroa', effects: { res: { prestigio: 3 } }, goto: 'firmeza' },
          { label: 'Preciso do seu conselho', sub: 'Humildade', color: 'azul', icon: 'aperto', effects: { rel: { aldric: 6 } }, goto: 'conselho' },
          { label: 'Quero ouvir o povo', sub: 'Abrir os portões', color: 'verde', icon: 'povo', effects: { res: { povo: 4 } }, goto: 'povo' },
          { label: 'Fale-me de Norhelm', sub: 'Entender a ameaça', color: 'dourado', icon: 'olho', goto: 'norhelm' },
        ],
      },
      firmeza: {
        text: '"Firmeza é bom. Teimosia, não." Aldric o observa por cima dos óculos. "Seu pai confundia as duas. Posso lhe dar um conselho que ele nunca aceitou?"',
        choices: [
          { label: 'Diga', sub: 'Ouvir', color: 'azul', icon: 'balao', effects: { rel: { aldric: 6 }, res: { influencia: 2 }, xp: 12 }, reply: '"Nunca decida de manhã o que pode decidir à noite. E nunca prometa a dois lordes a mesma coisa." Ele sorri. "Ele fez as duas."' },
          { label: 'Hoje não, Chanceler', sub: 'Autonomia', color: 'vermelho', icon: 'coroa', effects: { rel: { aldric: -4 }, res: { prestigio: 2 }, xp: 8 }, reply: '"Como quiser, Majestade." Ele anota algo no pergaminho. Você não sabe o quê.' },
        ],
      },
      conselho: {
        text: '"Então comece pela biblioteca, Majestade. Reis que leem vivem mais." Ele baixa a voz. "E escolha bem quem fica ao seu lado no trono. Cada conselheiro puxa a coroa para o próprio lado, eu incluso."',
        choices: [
          { label: 'Até você, Aldric?', sub: 'Brincar', color: 'dourado', icon: 'balao', effects: { rel: { aldric: 6 }, xp: 10 }, reply: '"Principalmente eu, Majestade. Por isso sou honesto sobre isso."' },
          { label: 'Então confiarei em mim', sub: 'Lição aprendida', color: 'azul', icon: 'escudo', effects: { res: { influencia: 3 }, xp: 12 }, reply: '"Essa é a primeira resposta certa do seu reinado."' },
        ],
      },
      povo: {
        text: 'Aldric ergue as sobrancelhas. "Abrir os portões às petições? Seu pai os fechou há dez anos. O povo vai trazer de tudo: ovelhas roubadas, maridos bêbados, pontes caídas..."',
        choices: [
          { label: 'Que tragam', sub: 'Portões abertos', color: 'verde', icon: 'povo', effects: { res: { povo: 5 }, rel: { marta: 10, aldric: -3 }, flags: { portoesAbertos: true }, xp: 12 }, reply: 'Os portões se abrem ao meio-dia. Uma fila se forma antes do anoitecer.' },
          { label: 'Um dia por semana', sub: 'Equilíbrio', color: 'azul', icon: 'aperto', effects: { res: { povo: 3 }, rel: { aldric: 3 }, xp: 10 }, reply: '"Sensato", Aldric aprova. "O povo será ouvido, e o rei ainda terá tempo de governar."' },
        ],
      },
      norhelm: {
        text: 'Norhelm é um reino de inverno e fome. Invadem quando a colheita deles falha, e este ano falhou. O Passo Cinzento leva ao Vale Rubro dos Drakon. Dizem que em vinte dias, talvez trinta, eles descerão.',
        choices: [
          { label: 'Então nos prepararemos', sub: 'Foco na guerra', color: 'vermelho', icon: 'espadas', effects: { res: { moral: 5 }, loyalty: { drakon: 3 }, xp: 10 }, reply: '"Os Drakon ficarão felizes em ouvir isso", diz Aldric. "Os outros lordes, nem tanto."' },
          { label: 'Há outra saída?', sub: 'Diplomacia', color: 'azul', icon: 'aperto', effects: { rel: { aldric: 5 }, xp: 10 }, reply: '"Sempre há, Majestade. Casamentos já pararam mais guerras do que espadas."' },
        ],
      },
    },
  },
  {
    id: 'mae_boasvindas', speaker: 'isabelle', topic: 'Uma mãe e um rei', kind: 'familia', day: 1,
    nodes: {
      start: {
        text: 'Você tem os olhos do seu pai, e a coroa pesa neles. Escute-me: os lordes vão sorrir para você e afiar punhais nas costas. Confie na família. E case-se bem.',
        choices: [
          { label: 'Abraçar sua mãe', sub: 'Família primeiro', color: 'azul', icon: 'coracao', effects: { rel: { isabelle: 6 } }, goto: 'abraco' },
          { label: 'Pedir que ela fique no conselho', sub: 'Poder à rainha-mãe', color: 'dourado', icon: 'coroa', goto: 'conselho' },
          { label: 'Agora eu sou o rei', sub: 'Distância', color: 'vermelho', icon: 'escudo', effects: { rel: { isabelle: -6 } }, goto: 'distancia' },
        ],
      },
      abraco: {
        text: 'Ela o segura por um longo instante. "Você ainda cheira a menino." Depois se afasta e endireita sua coroa. "Lucas também precisa de você. Ele acha que perdeu o pai e o irmão no mesmo dia."',
        choices: [
          { label: 'Vou cuidar dele', sub: 'Promessa', color: 'verde', icon: 'coracao', effects: { rel: { isabelle: 6, lucas: 8 }, xp: 8 }, reply: '"Eu sei que vai." Ela sorri, e por um instante não é rainha, só mãe.' },
          { label: 'Lucas precisa crescer', sub: 'Firmeza', color: 'dourado', icon: 'escudo', effects: { rel: { isabelle: -2, lucas: -3 }, xp: 6 }, reply: '"Todos precisamos, filho. Uns mais rápido que outros."' },
        ],
      },
      conselho: {
        text: '"Aceito, meu filho." Um brilho nos olhos dela. "Aldric não vai gostar. Mas Aldric raramente gosta de algo. E eu conheço segredos desta corte que ele nem imagina."',
        choices: [
          { label: 'Que segredos?', sub: 'Curiosidade', color: 'roxo', icon: 'mascara', effects: { rel: { isabelle: 10, aldric: -6 }, flags: { maeConselho: true, segredoOtho: true }, xp: 12 }, reply: '"Por exemplo: Otho Montclair troca cartas com alguém do norte. Seu pai sabia. Nunca fez nada." Uma informação perigosa.' },
          { label: 'Fique à vontade', sub: 'Confiança', color: 'azul', icon: 'aperto', effects: { rel: { isabelle: 12, aldric: -6 }, flags: { maeConselho: true }, xp: 8 }, reply: 'Ela ocupa a cadeira ao lado do trono como se nunca a tivesse deixado.' },
        ],
      },
      distancia: {
        text: 'Ela endurece. "Sim. É. E um rei que despreza a mãe no primeiro dia ensina aos lordes que pode desprezar qualquer um."',
        choices: [
          { label: 'Desculpar-se', sub: 'Recuar', color: 'azul', icon: 'aperto', effects: { rel: { isabelle: 8 }, xp: 8 }, reply: '"Está desculpado." Mas ela vai lembrar.' },
          { label: 'Manter a posição', sub: 'Orgulho', color: 'vermelho', icon: 'coroa', effects: { rel: { isabelle: -6 }, res: { prestigio: 2 }, xp: 6 }, reply: 'Ela faz uma reverência perfeita, gelada, e sai. A corte inteira percebe.' },
        ],
      },
    },
  },
  {
    id: 'corvin_tesouro', speaker: 'corvin', topic: 'O estado do tesouro', kind: 'conselho', day: 1, lasts: 2,
    nodes: {
      start: {
        text: 'Majestade, os números. Temos 600 de ouro. O funeral do seu pai e a coroação custaram caro. O exército real consome cerca de 48 por dia em soldo, e os impostos mal cobrem isso. Se o soldo atrasar, os soldados deixam de ser soldados e viram problema.',
        choices: [
          { label: 'Onde podemos ganhar mais?', sub: 'Pedir opções', color: 'azul', icon: 'olho', goto: 'opcoes' },
          { label: 'Onde estamos gastando demais?', sub: 'Cortar', color: 'dourado', icon: 'martelo', goto: 'cortes' },
          { label: 'Revisar os livros de contas', sub: 'Exige O Livro dos Mercadores', color: 'roxo', icon: 'livro', req: { knowledge: 'mercado' }, effects: { res: { ouro: 300 }, rel: { corvin: -5 }, xp: 15 }, reply: 'Você encontra 300 moedas "esquecidas" em uma conta de reparos. Corvin fica pálido.' },
        ],
      },
      opcoes: {
        text: 'Corvin ajeita os óculos. "Três caminhos, Majestade. Impostos mais altos na capital, rápido e impopular. Exportar vinho para Véridian, lento e seguro. Ou um empréstimo da Guilda, fácil agora e caro depois."',
        choices: [
          { label: 'Aumentar impostos na capital', sub: '+ouro, −povo', color: 'vermelho', icon: 'moedas', effects: { res: { ouro: 150, povo: -8 }, run: (s) => (s.taxes.coroa = 'alto'), xp: 8 }, reply: '"Os mercados vão reclamar, mas o cofre agradece."' },
          { label: 'Abrir a rota do vinho', sub: 'Comércio com o sul', color: 'verde', icon: 'uva', effects: { run: addWineRoute, loyalty: { valmont: 4 }, xp: 10 }, reply: '"Uma escolha paciente." Corvin quase sorri. Os primeiros barris partem da Costa Serena amanhã.' },
          { label: 'Manter como está', sub: 'Prudência', color: 'azul', icon: 'escudo', effects: { rel: { corvin: 2 }, xp: 5 }, reply: '"Prudência também é uma estratégia. Cara, mas é."' },
        ],
      },
      cortes: {
        text: '"Os banquetes da corte custam mais que a guarda da muralha, Majestade. E a rainha-mãe mantém quarenta criadas." Ele engole seco. "Não diga a ela que eu disse isso."',
        choices: [
          { label: 'Cortar os banquetes', sub: '+100 ouro, a corte reclama', color: 'dourado', icon: 'martelo', effects: { res: { ouro: 100, prestigio: -2 }, rel: { corvin: 5 }, xp: 8 }, reply: 'Os nobres jantam mais modestamente. Reclamam, mas jantam.' },
          { label: 'Reduzir as criadas da mãe', sub: '+80 ouro, Isabelle furiosa', color: 'vermelho', icon: 'escudo', effects: { res: { ouro: 80 }, rel: { isabelle: -12, corvin: 3 }, xp: 8 }, reply: 'Isabelle descobre em uma hora quem sugeriu. Corvin passa a semana evitando os corredores.' },
          { label: 'Deixar tudo como está', sub: 'Paz na família', color: 'azul', icon: 'coracao', effects: { rel: { isabelle: 2 }, xp: 5 }, reply: 'Corvin suspira e fecha o livro-caixa.' },
        ],
      },
    },
  },

  // ---------- Demandas recorrentes ----------
  {
    id: 'drakon_soldo', speaker: 'brandt', topic: 'Soldo da guarnição', kind: 'audiencia', weight: 3, minDay: 3, repeat: 9, lasts: 2,
    nodes: {
      start: {
        text: 'A guarnição do Vale Rubro não vê ouro há dois meses, Majestade. Meus homens guardam o reino inteiro com barriga vazia. Peço 200 de ouro da coroa.',
        choices: [
          { label: 'Pagar a guarnição', sub: '−200 de ouro', color: 'dourado', icon: 'moedas', req: { ouro: 200 }, effects: { res: { ouro: -200 }, loyalty: { drakon: 10 }, rel: { brandt: 5 }, xp: 8 }, reply: '"Os homens vão brindar ao seu nome." Brandt parece genuinamente grato.' },
          { label: 'Por que dois meses?', sub: 'Investigar', color: 'azul', icon: 'olho', goto: 'porque' },
          { label: 'Os Drakon são ricos', sub: 'Recusar', color: 'vermelho', icon: 'coroa', effects: { loyalty: { drakon: -6 } }, goto: 'recusa' },
          { label: 'Honras em vez de ouro', sub: 'Exige Tratado das Casas', color: 'roxo', icon: 'livro', req: { knowledge: 'linhagens' }, effects: { loyalty: { drakon: 6 }, res: { influencia: -2 }, xp: 12 }, reply: 'Você concede à guarnição o direito de usar o antigo estandarte real. Orgulho enche barrigas por algum tempo.' },
        ],
      },
      porque: {
        text: 'Brandt hesita. "O coletor real passou pelo vale e... levou o soldo junto com os impostos. Disse que eram ordens do tesouro."',
        choices: [
          { label: 'Chamar Corvin às contas', sub: 'Justiça', color: 'vermelho', icon: 'escudo', effects: { loyalty: { drakon: 12 }, rel: { brandt: 8, corvin: -8 }, res: { ouro: -100 }, xp: 12 }, reply: 'Corvin jura que foi um erro de escrivão. O soldo é devolvido. Brandt nunca esquecerá que o rei o defendeu.' },
          { label: 'Pagar metade agora', sub: '−100 ouro', color: 'dourado', icon: 'moedas', req: { ouro: 100 }, effects: { res: { ouro: -100 }, loyalty: { drakon: 5 }, xp: 8 }, reply: '"Metade é melhor que nada", Brandt resmunga.' },
        ],
      },
      recusa: {
        text: 'Brandt fica vermelho. "Ricos? Nossa riqueza está em ferro e em túmulos de soldados, Majestade." Ele se aproxima. "Se Norhelm vier e meus homens estiverem com fome, quem o senhor culpará?"',
        choices: [
          { label: 'Você', sub: 'Frieza', color: 'vermelho', icon: 'coroa', effects: { loyalty: { drakon: -8 }, rel: { brandt: -10 }, res: { prestigio: 3 }, xp: 6 }, reply: 'Brandt sai sem pedir licença. A guarnição do Vale passará fome, e lembrará.' },
          { label: 'Tem razão. Pago metade', sub: 'Recuar', color: 'azul', icon: 'aperto', req: { ouro: 100 }, effects: { res: { ouro: -100 }, loyalty: { drakon: 8 }, rel: { brandt: 3 }, xp: 8 }, reply: '"Um rei que reconhece o erro." Ele assente, surpreso.' },
        ],
      },
    },
    ignored: { text: 'A guarnição do Vale Rubro continua sem soldo.', loyalty: { drakon: -8 }, res: { moral: -3 } },
  },
  {
    id: 'bandidos_estrada', speaker: 'mensageiro', topic: 'Bandidos na estrada real', kind: 'audiencia', weight: 3, minDay: 2, repeat: 8, lasts: 2,
    nodes: {
      start: {
        text: 'Majestade! Venho galopando desde os Bosques Reais. Bandidos atacam caravanas na estrada, e mercadores e peregrinos pedem proteção. O Capitão Aurelian pode enviar homens, mas a guarda da capital ficará mais fina.',
        choices: [
          { label: 'Quem são esses bandidos?', sub: 'Saber mais', color: 'dourado', icon: 'olho', goto: 'quem' },
          { label: 'Enviar a guarda', sub: '−50 soldados', color: 'vermelho', icon: 'espadas', effects: { res: { exercito: -50, povo: 4 }, loyalty: { seren: 6 }, xp: 8 }, reply: 'Três dias depois, cabeças de bandidos enfeitam os marcos da estrada.' },
          { label: 'Contratar mercenários', sub: '−150 de ouro', color: 'azul', icon: 'moedas', req: { ouro: 150 }, effects: { res: { ouro: -150, povo: 2 }, loyalty: { seren: 5 }, xp: 8 }, reply: 'Mercenários caros, eficientes e sem perguntas.' },
          { label: 'Isso é dever dos Seren', sub: 'Delegar', color: 'verde', icon: 'arvore', effects: { loyalty: { seren: -5 }, xp: 5 }, reply: 'O mensageiro leva a resposta. A Senhora Aveline não vai gostar.' },
        ],
      },
      quem: {
        text: '"Dizem que são camponeses expulsos das terras pelos coletores, Majestade. Famílias inteiras vivendo na floresta. Roubam para comer."',
        choices: [
          { label: 'Oferecer perdão e terras', sub: 'Viram camponeses de novo', color: 'verde', icon: 'povo', effects: { res: { povo: 8, prestigio: -2 }, loyalty: { seren: 2 }, rel: { marta: 6 }, xp: 14 }, reply: 'Metade volta aos campos. A história do rei que perdoou os famintos corre o reino inteiro.' },
          { label: 'Alistá-los no exército', sub: '+80 soldados', color: 'roxo', icon: 'mascara', effects: { res: { exercito: 80, prestigio: -3 }, loyalty: { seren: -2 }, xp: 10 }, reply: 'Soldados famintos e agradecidos. Os melhores e os piores que há.' },
          { label: 'A lei é a lei', sub: 'Mandar a guarda', color: 'vermelho', icon: 'escudo', effects: { res: { exercito: -50, prestigio: 2, povo: -3 }, loyalty: { seren: 6 }, xp: 8 }, reply: 'A estrada fica segura. A cidade baixa comenta que eram só famintos.' },
        ],
      },
    },
    ignored: { text: 'Caravanas continuam sendo saqueadas nos Bosques Reais.', loyalty: { seren: -5 }, res: { povo: -3, ouro: -50 } },
  },
  {
    id: 'colheita_ruim', speaker: 'aveline', topic: 'Colheita perdida', kind: 'audiencia', weight: 2, minDay: 4, repeat: 12, lasts: 2,
    nodes: {
      start: {
        text: 'Uma praga de gafanhotos devastou os campos de Salgueiro, Majestade. As famílias dos meus vassalos não terão o que comer no inverno. Os Seren pedem alívio nos impostos.',
        choices: [
          { label: 'Reduzir impostos dos Seren', sub: 'Menos renda', color: 'verde', icon: 'arvore', effects: { run: (s) => (s.taxes.seren = 'baixo'), loyalty: { seren: 10 }, res: { povo: 3 }, xp: 8 }, reply: '"Os bosques não esquecem quem os ajuda", Aveline diz, e se curva.' },
          { label: 'Enviar grãos reais', sub: '−120 de ouro', color: 'dourado', icon: 'trigo', req: { ouro: 120 }, effects: { res: { ouro: -120, povo: 5 }, loyalty: { seren: 8 }, rel: { aveline: 6 }, xp: 8 }, reply: 'Carroças partem da capital ao amanhecer.' },
          { label: 'Como sei que é verdade?', sub: 'Desconfiar', color: 'vermelho', icon: 'olho', goto: 'duvida' },
        ],
      },
      duvida: {
        text: 'Aveline fica imóvel. "O senhor duvida da palavra de uma Seren?" Ela respira fundo. "Mande seu próprio homem. Ele verá os campos comidos até a raiz."',
        choices: [
          { label: 'Mandar Aurelian verificar', sub: 'Prudência', color: 'azul', icon: 'escudo', effects: { loyalty: { seren: -3 }, rel: { aveline: -4 }, res: { influencia: 2 }, xp: 10 }, reply: 'Aurelian volta dois dias depois, pálido: "É pior do que ela disse." A ajuda chega atrasada, mas chega.' },
          { label: 'Desculpar-me e ajudar', sub: 'Reduzir impostos', color: 'verde', icon: 'aperto', effects: { run: (s) => (s.taxes.seren = 'baixo'), loyalty: { seren: 6 }, rel: { aveline: 2 }, xp: 8 }, reply: '"Desculpas aceitas. A ajuda também."' },
          { label: 'Recusar', sub: 'O reino inteiro sofre', color: 'vermelho', icon: 'coroa', effects: { loyalty: { seren: -8 }, res: { povo: -2 }, xp: 5 }, reply: 'Aveline sai em silêncio. Silêncio Seren.' },
        ],
      },
    },
    ignored: { text: 'Os camponeses de Salgueiro passam fome. A Senhora Aveline não esquecerá.', loyalty: { seren: -8 }, res: { povo: -4 } },
  },
  {
    id: 'mineiros_greve', speaker: 'otho', topic: 'Greve nas minas', kind: 'audiencia', weight: 2, minDay: 4, repeat: 10, lasts: 2,
    nodes: {
      start: {
        text: 'Os mineiros de Picoalto cruzaram os braços, Majestade. Querem pão e salários. Sem eles, não há ferro para as espadas do reino. Posso resolver... do meu jeito, se o rei permitir.',
        choices: [
          { label: 'Que jeito seria esse?', sub: 'Perguntar', color: 'dourado', icon: 'olho', goto: 'jeito' },
          { label: 'Pagar os mineiros', sub: '−150 de ouro', color: 'azul', icon: 'moedas', req: { ouro: 150 }, effects: { res: { ouro: -150, povo: 5 }, loyalty: { montclair: 3 }, xp: 8 }, reply: 'O ferro volta a sair das minas. E os mineiros cantam o nome do rei.' },
          { label: 'Investigar os salários', sub: 'Exige Sussurros da Corte', color: 'roxo', icon: 'livro', req: { knowledge: 'intriga' }, effects: { res: { ouro: 200, povo: 6 }, loyalty: { montclair: -6 }, rel: { otho: -10 }, xp: 15 }, reply: 'Otho embolsava metade dos salários. O dinheiro volta aos mineiros, e um pouco ao tesouro.' },
          { label: 'Negociar pessoalmente', sub: 'Custa 5 de Influência', color: 'verde', icon: 'aperto', req: { influencia: 5 }, effects: { res: { influencia: -5, povo: 6 }, loyalty: { montclair: 2 }, xp: 10 }, reply: 'Você desce à mina. Os mineiros nunca viram um rei de perto, e muito menos coberto de fuligem.' },
        ],
      },
      jeito: {
        text: 'Otho sorri devagar. "Chicotes nos líderes, pão para os obedientes. Em três dias o ferro volta a sair." Uma pausa. "Seu pai sempre me deixou agir."',
        choices: [
          { label: 'Deixar Otho agir', sub: 'Força bruta', color: 'vermelho', icon: 'martelo', effects: { res: { povo: -8 }, loyalty: { montclair: 8 }, rel: { otho: 5, marta: -8 }, xp: 5 }, reply: 'O ferro volta a fluir. As histórias também: chegam à capital em uma semana.' },
          { label: 'Eu não sou meu pai', sub: 'Proibir', color: 'azul', icon: 'escudo', effects: { loyalty: { montclair: -5 }, rel: { otho: -6 }, res: { povo: 3 } }, goto: 'proibir' },
        ],
      },
      proibir: {
        text: 'O sorriso de Otho fica mais fino. "Claro que não é, Majestade. Então me diga como o senhor resolveria, já que proíbe o meu jeito."',
        choices: [
          { label: 'Pão primeiro, depois conversa', sub: '−100 ouro', color: 'verde', icon: 'trigo', req: { ouro: 100 }, effects: { res: { ouro: -100, povo: 5 }, loyalty: { montclair: 2 }, xp: 12 }, reply: 'Barriga cheia, cabeça fria. A greve termina em dois dias, sem sangue.' },
          { label: 'Você resolve, sem chicotes', sub: 'Cobrar dele', color: 'dourado', icon: 'coroa', effects: { loyalty: { montclair: -3 }, res: { prestigio: 2 }, xp: 10 }, reply: 'Otho resolve, porque precisa. Mas pagou do próprio bolso e não esquecerá quem mandou.' },
        ],
      },
    },
    ignored: { text: 'As minas de Picoalto seguem paradas.', loyalty: { montclair: -5 }, res: { ouro: -80 } },
  },
  {
    id: 'guilda_impostos', speaker: 'tobias', topic: 'A Guilda pede isenção', kind: 'audiencia', weight: 2, minDay: 3, repeat: 12, lasts: 2,
    nodes: {
      start: {
        text: 'Majestade, a Guilda dos Mercadores de Castelmar sustenta metade dos seus mercados. Pedimos a isenção do imposto de portão por um ano. Em troca... nossa gratidão será generosa.',
        choices: [
          { label: 'Quão generosa?', sub: 'Negociar', color: 'dourado', icon: 'moedas', goto: 'quanto' },
          { label: 'Recusar', sub: 'Todos pagam', color: 'vermelho', icon: 'coroa', effects: { rel: { tobias: -10 }, res: { povo: 3 }, xp: 5 }, reply: '"Os pequenos comerciantes agradecem, Majestade. A Guilda, nem tanto."' },
          { label: 'Contraproposta', sub: 'Exige O Livro dos Mercadores', color: 'roxo', icon: 'livro', req: { knowledge: 'mercado' }, effects: { res: { ouro: 400 }, rel: { tobias: 5 }, xp: 15 }, reply: 'Você mostra que conhece os preços reais. Tobias ri, derrotado. "Vossa Majestade leu nosso livro."' },
        ],
      },
      quanto: {
        text: 'Tobias abre um sorriso de mercador. "Duzentas e cinquenta moedas, entregues discretamente. E a eterna amizade da Guilda." Ele se inclina. "Amizade vale muito em tempos de guerra, Majestade."',
        choices: [
          { label: 'Aceitar', sub: 'Lei do Portão Livre', color: 'dourado', icon: 'pergaminho', effects: { law: 'Lei do Portão Livre', res: { ouro: 250, povo: -3 }, rel: { tobias: 15 }, xp: 10 }, reply: 'O baú chega na mesma noite. Os pequenos comerciantes, que pagam tudo, não gostam.' },
          { label: 'Isso é suborno', sub: 'Indignação', color: 'vermelho', icon: 'escudo', effects: { rel: { tobias: -12 }, res: { prestigio: 3, povo: 2 }, xp: 8 }, reply: '"Suborno é uma palavra feia, Majestade. Prefiro investimento." Mas ele recolhe a proposta.' },
          { label: 'Isenção só pela metade', sub: 'Meio-termo', color: 'azul', icon: 'aperto', effects: { res: { ouro: 120 }, rel: { tobias: 6 }, xp: 10 }, reply: '"Metade do caminho é melhor que caminho nenhum", Tobias concorda.' },
        ],
      },
    },
  },
  {
    id: 'lucas_treino', speaker: 'lucas', topic: 'O irmão quer lutar', kind: 'familia', weight: 2, minDay: 3, repeat: 15,
    nodes: {
      start: {
        text: 'Irmão, quer dizer, Majestade! Quero treinar com a guarda do Capitão Aurelian. Tenho quatorze anos, nosso pai lutou com essa idade. Por favor?',
        choices: [
          { label: 'Por que agora, Lucas?', sub: 'Entender', color: 'azul', icon: 'balao', goto: 'porque' },
          { label: 'Sim, com Aurelian', sub: 'Lucas feliz', color: 'vermelho', icon: 'espadas', effects: { rel: { lucas: 12, aurelian: 5 }, res: { moral: 3 }, flags: { lucasSoldado: true }, xp: 5 }, reply: 'Lucas sai correndo pelo corredor, esquecendo toda a etiqueta.' },
          { label: 'Você é o herdeiro', sub: 'Proibido', color: 'dourado', icon: 'coroa', effects: { rel: { lucas: -12, isabelle: 5 }, xp: 5 }, reply: '"Herdeiro de quê? De ficar parado?" Ele bate a porta.' },
        ],
      },
      porque: {
        text: 'Ele baixa os olhos. "Porque quando Norhelm vier, não quero ficar escondido no castelo enquanto você... enquanto os outros lutam. Papai não teria se escondido."',
        choices: [
          { label: 'Treine, mas prometa não ir à frente sem ordem', sub: 'Acordo', color: 'verde', icon: 'aperto', effects: { rel: { lucas: 14, aurelian: 4 }, flags: { lucasSoldado: true }, xp: 12 }, reply: '"Prometo!" Ele abraça você, e depois fica envergonhado de ter abraçado o rei.' },
          { label: 'Estude primeiro, comigo', sub: 'Biblioteca', color: 'azul', icon: 'livro', effects: { rel: { lucas: 6, theodric: 5 }, flags: { lucasDiplomata: true }, xp: 10 }, reply: 'Lucas bufa, mas vai. Theodric diz depois que ele tem talento para línguas.' },
        ],
      },
    },
  },
  {
    id: 'isabelle_baile', speaker: 'isabelle', topic: 'Um baile real', kind: 'familia', weight: 2, minDay: 5, maxDay: 19, repeat: 30, lasts: 2,
    nodes: {
      start: {
        text: 'Meu filho, um rei solteiro precisa ser visto. Um baile no Salão das Estrelas reuniria as pretendentes, os lordes e seria o assunto do reino por semanas.',
        choices: [
          { label: 'Um baile grandioso', sub: '−250 de ouro', color: 'dourado', icon: 'coroa', req: { ouro: 250 }, effects: { res: { ouro: -250, prestigio: 4 } }, goto: 'baile' },
          { label: 'Um jantar modesto', sub: '−80 de ouro', color: 'azul', icon: 'aperto', req: { ouro: 80 }, effects: { res: { ouro: -80, prestigio: 2 }, rel: { isabelle: 3 }, xp: 8 }, reply: 'Um jantar elegante e curto. A mãe acha pouco, mas aceita.' },
          { label: 'Não há tempo para festas', sub: 'Recusar', color: 'vermelho', icon: 'ampulheta', effects: { rel: { isabelle: -6 }, xp: 3 }, reply: '"Seu pai também dizia isso", ela suspira.' },
        ],
      },
      baile: {
        text: 'Música, velas e intrigas até o amanhecer. No meio da noite, sua mãe aparece ao seu lado. "Com quem você vai abrir a dança? Todos estão olhando."',
        choices: [
          { label: 'Com Elenora', sub: 'Valmont', color: 'azul', icon: 'coracao', req: { test: (s) => !!s.flags.met_elenora, label: 'Você não a conhece' }, effects: { rel: { elenora: 12, isabelle: 6, rhoswen: -4, isolde: -4 }, loyalty: { valmont: 4 }, xp: 10 }, reply: 'Elenora dança como quem nasceu num salão. Isabelle sorri a noite inteira.' },
          { label: 'Com Rhoswen', sub: 'Drakon', color: 'vermelho', icon: 'coracao', req: { test: (s) => !!s.flags.met_rhoswen, label: 'Você não a conhece' }, effects: { rel: { rhoswen: 14, isabelle: -4, elenora: -4 }, loyalty: { drakon: 5 }, xp: 10 }, reply: 'Rhoswen pisa no seu pé três vezes e ri a cada uma. Os soldados na galeria aplaudem.' },
          { label: 'Com Isolde', sub: 'Véridian', color: 'verde', icon: 'coracao', req: { test: (s) => !!s.flags.met_isolde, label: 'Você não a conhece' }, effects: { rel: { isolde: 14, isabelle: -6, elenora: -4 }, loyalty: { seren: -3 }, xp: 10 }, reply: 'Isolde dança como quem conduz uma guerra. Todos os olhos do salão seguem vocês.' },
          { label: 'Com sua mãe', sub: 'Diplomacia perfeita', color: 'dourado', icon: 'coroa', effects: { rel: { isabelle: 14 }, res: { prestigio: 3 }, xp: 10 }, reply: 'Ninguém se ofende, todos se derretem. Isabelle guarda esse momento para sempre.' },
        ],
      },
    },
  },
  {
    id: 'espiao_capturado', speaker: 'aurelian', topic: 'Um espião de Norhelm', kind: 'audiencia', weight: 2, minDay: 6, repeat: 20,
    nodes: {
      start: {
        text: 'Pegamos um homem de Norhelm desenhando as muralhas, Majestade. Diz ser mercador de peles. Ninguém vende peles com um mapa das torres.',
        choices: [
          { label: 'Trazê-lo ao salão', sub: 'Ver com os próprios olhos', color: 'azul', icon: 'olho', goto: 'espiao' },
          { label: 'Executá-lo em praça pública', sub: 'Exemplo', color: 'vermelho', icon: 'espadas', effects: { res: { prestigio: 4, povo: 2 }, rel: { haakon: -10 }, xp: 8 }, reply: 'A praça se enche. O recado chega a Norhelm antes do corpo esfriar.' },
          { label: 'Transformá-lo em agente duplo', sub: 'Custa 6 de Influência', color: 'roxo', icon: 'mascara', req: { influencia: 6 }, effects: { res: { influencia: -6 }, flags: { agenteDuplo: true, infoNorhelm: true }, xp: 15 }, reply: 'Ele vai mandar mentiras para o norte. Suas mentiras.' },
        ],
      },
      espiao: {
        text: 'O homem é magro e tem as mãos tremendo. "Majestade... tenho três filhos em Hjalmgard. Ragnar disse que os mataria se eu não viesse." Ele cai de joelhos.',
        choices: [
          { label: 'Interrogar com cuidado', sub: 'Informação', color: 'dourado', icon: 'olho', effects: { flags: { infoNorhelm: true }, xp: 12 }, reply: 'Ele conta tudo: Norhelm concentrará tropas no Passo Cinzento. Na guerra, isso valerá ouro.' },
          { label: 'Libertá-lo com uma mensagem', sub: 'Gesto de paz', color: 'verde', icon: 'aperto', effects: { rel: { haakon: 8, sigrid: 6 }, loyalty: { drakon: -4 }, res: { povo: 2 }, xp: 10 }, reply: '"Diga ao seu rei que Castelmar não mata pais de família." O homem chora. Alguém em Norhelm vai ouvir essa história.' },
          { label: 'Prisão perpétua', sub: 'Frieza', color: 'vermelho', icon: 'escudo', effects: { res: { prestigio: 2 }, xp: 6 }, reply: 'A porta da masmorra fecha. Os filhos dele nunca saberão o que aconteceu.' },
        ],
      },
    },
  },
  {
    id: 'recrutamento', speaker: 'aurelian', topic: 'Reforçar o exército', kind: 'conselho', weight: 2, minDay: 5, repeat: 7, lasts: 2,
    nodes: {
      start: {
        text: 'Com Norhelm no horizonte, precisamos de mais homens, Majestade. Posso recrutar voluntários pagos, ou o senhor pode decretar o serviço militar obrigatório.',
        choices: [
          { label: 'Recrutar voluntários', sub: '−200 ouro, +200 soldados', color: 'dourado', icon: 'moedas', req: { ouro: 200 }, effects: { res: { ouro: -200, exercito: 200 }, xp: 8 }, reply: 'Duzentos homens se alistam. Alguns por ouro, outros por fome, poucos por glória.' },
          { label: 'Serviço obrigatório', sub: 'Uma lei dura', color: 'vermelho', icon: 'espadas', req: { test: (s) => !s.laws.includes('Lei do Serviço Militar'), label: 'Lei já aprovada' }, goto: 'obrigatorio' },
          { label: 'Treinar os que temos', sub: '+moral, −60 ouro', color: 'azul', icon: 'escudo', effects: { res: { moral: 8, ouro: -60 }, xp: 8 }, reply: '"Melhor cem bem treinados que mil com medo", Aurelian aprova.' },
        ],
      },
      obrigatorio: {
        text: 'Aurelian hesita. "Isso trará quatrocentos homens, Majestade. E quatrocentas famílias sem filho na colheita. O povo vai sentir." Ele baixa a voz. "Quer isentar alguém?"',
        choices: [
          { label: 'Ninguém é isento', sub: 'Lei do Serviço Militar', color: 'vermelho', icon: 'pergaminho', effects: { law: 'Lei do Serviço Militar', res: { exercito: 400, povo: -10, moral: -5 }, xp: 10 }, reply: 'Nobres e camponeses marcham lado a lado. O povo reclama, mas reconhece a justiça.' },
          { label: 'Isentar os filhos dos nobres', sub: 'Agradar os lordes', color: 'dourado', icon: 'coroa', effects: { law: 'Lei do Serviço Militar', res: { exercito: 350, povo: -15 }, loyalty: { valmont: 3, drakon: 2, seren: 3, montclair: 3 }, xp: 8 }, reply: 'Os lordes aprovam. Na cidade baixa, pichações aparecem nas paredes durante a noite.' },
          { label: 'Desistir da ideia', sub: 'Voltar atrás', color: 'azul', icon: 'escudo', effects: { rel: { aurelian: -3 }, xp: 5 }, reply: '"Como quiser. Mas quando Norhelm vier, vamos contar cada homem."' },
        ],
      },
    },
  },
  {
    id: 'mercador_veridian', speaker: 'tobias', topic: 'Navios do sul', kind: 'audiencia', weight: 2, minDay: 6, repeat: 30, lasts: 2,
    nodes: {
      start: {
        text: 'Mercadores de Véridian ancoraram na Costa Serena, Majestade. Querem comprar nosso vinho a preço de ouro. Basta um decreto real abrindo a rota.',
        choices: [
          { label: 'Abrir a rota do vinho', sub: 'Nova rota: vinho para Véridian', color: 'verde', icon: 'uva', effects: { run: addWineRoute, loyalty: { valmont: 6 }, rel: { tobias: 5 }, xp: 10 }, reply: 'Os barris partem na maré da manhã. Veja os navios no mapa das províncias.' },
          { label: 'O que a Guilda ganha?', sub: 'Desconfiar', color: 'dourado', icon: 'olho', goto: 'guilda' },
          { label: 'Mandá-los embora', sub: 'Desconfiança', color: 'vermelho', icon: 'escudo', effects: { rel: { isolde: -5 }, loyalty: { valmont: -5 }, xp: 5 }, reply: 'Os navios zarpam vazios. Em Véridian, alguém anota a desfeita.' },
        ],
      },
      guilda: {
        text: 'Tobias sorri, pego. "Uma pequena comissão, Majestade. Cinco por cento. Somos nós que carregamos os barris, afinal."',
        choices: [
          { label: 'Sem comissão, ou sem rota', sub: 'Pressionar', color: 'vermelho', icon: 'coroa', effects: { run: addWineRoute, rel: { tobias: -6 }, res: { prestigio: 2 }, loyalty: { valmont: 6 }, xp: 12 }, reply: 'Tobias engole a comissão. A rota abre, e toda a tarifa vai para a coroa.' },
          { label: 'Justo', sub: 'Aceitar', color: 'azul', icon: 'aperto', effects: { run: addWineRoute, rel: { tobias: 10 }, loyalty: { valmont: 6 }, xp: 10 }, reply: '"Um rei que entende de negócios!" A Guilda vai lembrar disso.' },
        ],
      },
    },
  },
  {
    id: 'otho_segredo', speaker: 'otho', topic: 'Um segredo à venda', kind: 'audiencia', weight: 2, minDay: 7, repeat: 30,
    nodes: {
      start: {
        text: 'Majestade... tenho algo que o senhor vai querer saber. Algo sobre um dos seus lordes e a correspondência dele com Norhelm. Mas segredos não são de graça. Quero as minas de prata de Cinzel isentas de imposto.',
        choices: [
          { label: 'Diga o nome primeiro', sub: 'Pressionar', color: 'vermelho', icon: 'olho', goto: 'nome' },
          { label: 'Aceitar o acordo', sub: 'Impostos baixos para Montclair', color: 'dourado', icon: 'aperto', effects: { run: (s) => (s.taxes.montclair = 'baixo'), loyalty: { montclair: 10 }, res: { influencia: 6 }, flags: { segredoOtho: true }, xp: 10 }, reply: '"Lorde Brandt troca cartas com Jarl Haakon. Sobre o quê, eu não sei... ainda." Uma informação perigosa.' },
          { label: 'Descobrir por conta própria', sub: 'Exige Sussurros da Corte', color: 'roxo', icon: 'livro', req: { knowledge: 'intriga' }, effects: { flags: { segredoOtho: true, conspiracaoRevelada: true }, rel: { otho: -5 }, xp: 15 }, reply: 'Seus próprios informantes descobrem: as cartas são de Otho, não de Brandt. Montclair tentava jogar você contra Drakon.' },
        ],
      },
      nome: {
        text: 'Otho sorri como quem esperava a pergunta. "Um nome sem provas é fofoca, Majestade. Com provas... é poder. As provas custam as minas de Cinzel."',
        choices: [
          { label: 'Ou custam sua cabeça', sub: 'Ameaçar', color: 'vermelho', icon: 'espadas', effects: { loyalty: { montclair: -10 }, rel: { otho: -12 }, res: { prestigio: 3 }, flags: { segredoOtho: true }, xp: 10 }, reply: 'Otho empalidece e solta o nome: "Brandt Drakon." Mas os olhos dele dizem que você acabou de ganhar um inimigo.' },
          { label: 'Então fique com seu segredo', sub: 'Recusar', color: 'azul', icon: 'escudo', effects: { loyalty: { montclair: -4 }, rel: { otho: -6 }, xp: 6 }, reply: '"Como quiser. Segredos não estragam. Ficam mais caros."' },
        ],
      },
    },
  },
  {
    id: 'aldric_pedagio', speaker: 'aldric', topic: 'Pedágio nas pontes', kind: 'conselho', weight: 1, minDay: 6, repeat: 40, lasts: 2,
    nodes: {
      start: {
        text: 'Majestade, uma proposta: um pedágio real nas pontes de Castelmar. Traria ouro todo dia, mas os camponeses que vendem nos mercados vão pagar a conta.',
        choices: [
          { label: 'Quanto renderia?', sub: 'Números', color: 'dourado', icon: 'moedas', goto: 'quanto' },
          { label: 'Rejeitar', sub: 'Proteger o povo', color: 'verde', icon: 'povo', effects: { res: { povo: 3 }, rel: { aldric: -3 }, xp: 5 }, reply: '"O povo agradece. O tesouro, não."' },
          { label: 'Isentar quem vende comida', sub: 'Exige Leis e Costumes', color: 'roxo', icon: 'livro', req: { knowledge: 'leis' }, effects: { law: 'Pedágio com Isenção do Pão', res: { ouro: 120, povo: 2 }, rel: { aldric: 5 }, xp: 15 }, reply: 'Aldric fica impressionado. "O senhor leu meu livro."' },
        ],
      },
      quanto: {
        text: '"Vinte e cinco moedas por dia, Majestade. Setecentas e cinquenta por mês." Ele hesita. "E uma revolta de carroceiros, provavelmente, na primeira semana."',
        choices: [
          { label: 'Aprovar mesmo assim', sub: 'Lei do Pedágio Real', color: 'dourado', icon: 'pergaminho', effects: { law: 'Lei do Pedágio Real', res: { ouro: 200, povo: -6 }, xp: 10 }, reply: 'As pontes ganham guaritas. Os carroceiros ganham um novo assunto para xingar.' },
          { label: 'Só nas pontes dos nobres', sub: 'Criativo', color: 'azul', icon: 'aperto', effects: { res: { ouro: 80, povo: 2 }, loyalty: { valmont: -3, montclair: -3 }, rel: { aldric: 4 }, xp: 12 }, reply: 'Os nobres reclamam de pagar pedágio. O povo acha graça.' },
        ],
      },
    },
  },
  {
    id: 'emprestimo_guilda', speaker: 'tobias', topic: 'Um empréstimo', kind: 'audiencia', weight: 4, minDay: 3, repeat: 12, cond: (s) => s.res.ouro < 200 && !s.flags.divida,
    nodes: {
      start: {
        text: 'Majestade, soube que o tesouro anda... leve. A Guilda pode emprestar 500 de ouro. Pagaria 650 em sete dias. Juros modestos, para um rei.',
        choices: [
          { label: 'Aceitar o empréstimo', sub: '+500 agora, −650 em 7 dias', color: 'dourado', icon: 'moedas', effects: { res: { ouro: 500 }, flags: { divida: true }, schedule: [{ id: 'cobranca_divida', in: 7 }], xp: 5 }, reply: '"Um prazer fazer negócios com a coroa."' },
          { label: 'Juros menores', sub: 'Pechinchar', color: 'azul', icon: 'balao', goto: 'juros' },
          { label: 'Recusar', sub: 'Orgulho', color: 'vermelho', icon: 'coroa', effects: { xp: 3 }, reply: '"A oferta continua de pé, Majestade. Por enquanto."' },
        ],
      },
      juros: {
        text: 'Tobias coça a barba. "Seiscentas, e a coroa garante à Guilda o monopólio das feiras de outono. Ou seiscentas e cinquenta, sem condições."',
        choices: [
          { label: 'Seiscentas com o monopólio', sub: 'O povo paga mais caro', color: 'dourado', icon: 'aperto', effects: { res: { ouro: 500, povo: -4 }, flags: { divida: true, dividaMenor: true }, rel: { tobias: 8 }, schedule: [{ id: 'cobranca_divida', in: 7 }], xp: 8 }, reply: 'A Guilda controla as feiras. Os preços sobem um pouco. O tesouro respira.' },
          { label: 'Deixa pra lá', sub: 'Recusar', color: 'vermelho', icon: 'escudo', effects: { xp: 3 }, reply: 'Tobias dá de ombros e guarda o contrato.' },
        ],
      },
    },
  },
  {
    id: 'cobranca_divida', speaker: 'tobias', topic: 'Cobrança da Guilda', kind: 'urgente',
    nodes: {
      start: {
        text: (s) => `Sete dias, Majestade. A Guilda veio buscar suas ${s.flags.dividaMenor ? '600' : '650'} moedas.`,
        choices: [
          { label: 'Pagar a dívida', sub: 'Honrar a palavra', color: 'dourado', icon: 'moedas', effects: { run: (s) => (s.res.ouro -= s.flags.dividaMenor ? 600 : 650), flags: { divida: false, dividaMenor: false }, rel: { tobias: 5 }, xp: 5 }, reply: '"A palavra do rei vale ouro. Literalmente."' },
          { label: 'Renegociar', sub: 'Custa 8 de Influência', color: 'azul', icon: 'aperto', req: { influencia: 8 }, effects: { res: { influencia: -8, ouro: -300 }, flags: { divida: false, dividaMenor: false }, xp: 8 }, reply: 'Tobias aceita metade, a contragosto.' },
          { label: 'Confiscar os bens da Guilda', sub: 'Tirania', color: 'vermelho', icon: 'martelo', effects: { res: { ouro: 300, prestigio: -8, povo: -4 }, rel: { tobias: -40 }, flags: { divida: false, dividaMenor: false }, xp: 5 }, reply: 'Os guardas invadem os armazéns. Nenhum mercador vai emprestar à coroa de novo.' },
        ],
      },
    },
    ignored: { text: 'A Guilda tomou o pagamento à força dos mercados reais.', res: { ouro: -800, prestigio: -5 }, flags: { divida: false } },
  },

  // ---------- Vassalos das grandes casas ----------
  {
    id: 'sir_ferrao', speaker: 'sir_ferrao', topic: 'Um duelo de honra', kind: 'audiencia', weight: 2, minDay: 4, repeat: 25, lasts: 2,
    nodes: {
      start: {
        text: 'Majestade, sou Sir Gerald Ferrão, vassalo dos Drakon. Um cavaleiro Valmont insultou minha irmã numa taverna da capital. Peço o direito de duelo, segundo a lei antiga.',
        choices: [
          { label: 'Que insulto foi esse?', sub: 'Ouvir a história', color: 'azul', icon: 'balao', goto: 'insulto' },
          { label: 'Conceder o duelo', sub: 'A lei antiga', color: 'vermelho', icon: 'espadas', effects: { loyalty: { drakon: 6, valmont: -6 }, res: { prestigio: 2 }, xp: 8 }, reply: 'O duelo acontece ao amanhecer. O cavaleiro Valmont sai com uma cicatriz, e a rixa entre as casas fica mais funda.' },
          { label: 'Duelos estão proibidos', sub: 'Autoridade', color: 'dourado', icon: 'coroa', effects: { loyalty: { drakon: -5 }, res: { prestigio: 3 }, xp: 6 }, reply: '"Então a honra dos Drakon vale menos que a paz dos Valmont." Ele sai rígido.' },
        ],
      },
      insulto: {
        text: '"Ele disse que as mulheres Drakon só servem para parir soldados." Ele aperta o punho da espada. "E disse isso sobre Lady Rhoswen também, Majestade."',
        choices: [
          { label: 'O Valmont pedirá desculpas públicas', sub: 'Justiça sem sangue', color: 'azul', icon: 'aperto', effects: { loyalty: { drakon: 6, valmont: -2 }, rel: { rhoswen: 5 }, res: { prestigio: 2 }, xp: 12 }, reply: 'O cavaleiro Valmont se desculpa de joelhos na praça. Os Drakon ficam satisfeitos, e os Valmont, humilhados, mas quietos.' },
          { label: 'Então lute, com a minha bênção', sub: 'Duelo real', color: 'vermelho', icon: 'espadas', effects: { loyalty: { drakon: 10, valmont: -8 }, rel: { rhoswen: 8, gaspard: -8 }, xp: 10 }, reply: 'Sir Gerald vence em três golpes. A corte comenta por dias.' },
          { label: 'Palavras de taverna não valem sangue', sub: 'Pacificar', color: 'verde', icon: 'coracao', effects: { loyalty: { drakon: -3 }, res: { influencia: 2 }, xp: 8 }, reply: 'Ele não concorda, mas obedece.' },
        ],
      },
    },
    ignored: { text: 'O cavaleiro Drakon resolveu por conta própria. Um cavaleiro Valmont amanheceu ferido.', loyalty: { drakon: -3, valmont: -6 } },
  },
  {
    id: 'dama_brisamar', speaker: 'dama_brisamar', topic: 'Um pedido da corte', kind: 'audiencia', weight: 2, minDay: 5, repeat: 25, lasts: 2,
    nodes: {
      start: {
        text: 'Majestade, sou Lady Coralie Brisamar, dos vassalos Valmont. Nossa casa construiu três navios novos este ano, mas o porto real cobra taxas absurdas para ancorá-los. Imploro sua clemência.',
        choices: [
          { label: 'Quanto vocês pagam?', sub: 'Números', color: 'dourado', icon: 'moedas', goto: 'quanto' },
          { label: 'Reduzir as taxas', sub: 'Agradar os Valmont', color: 'azul', icon: 'aperto', effects: { loyalty: { valmont: 7 }, res: { ouro: -60 }, xp: 8 }, reply: '"A Casa Brisamar lembrará da sua generosidade, Majestade."' },
          { label: 'Taxas são taxas', sub: 'Recusar', color: 'vermelho', icon: 'coroa', effects: { loyalty: { valmont: -4 }, xp: 5 }, reply: 'Ela faz uma reverência e sai. Os olhos dela não fazem.' },
        ],
      },
      quanto: {
        text: '"Quarenta moedas por navio, por semana." Ela sorri, doce. "E ouvi dizer que os navios Drakon no rio não pagam nada. Deve ser um engano, não é?"',
        choices: [
          { label: 'Taxar os Drakon também', sub: 'Igualdade', color: 'vermelho', icon: 'escudo', effects: { loyalty: { valmont: 6, drakon: -6 }, res: { ouro: 80 }, xp: 10 }, reply: 'Os Drakon ficam furiosos com a nova taxa fluvial. Lady Coralie sorri para você a noite inteira.' },
          { label: 'Isentar os três navios novos', sub: 'Meio-termo', color: 'azul', icon: 'aperto', effects: { loyalty: { valmont: 5 }, res: { ouro: -30 }, xp: 10 }, reply: '"Um rei justo e generoso. Que raro." Ela faz uma reverência profunda.' },
        ],
      },
    },
  },
  {
    id: 'sir_picoalto', speaker: 'sir_picoalto', topic: 'Um aviso das montanhas', kind: 'audiencia', weight: 2, minDay: 8, repeat: 30, cond: (s) => !s.flags.conspiracaoRevelada,
    nodes: {
      start: {
        text: 'Majestade. Sou Sir Aldo Picoalto, vassalo dos Montclair. Venho em segredo. Meu senhor, Lorde Otho, recebe visitas à noite. Homens de peles, falando com sotaque do norte.',
        choices: [
          { label: 'Por que me conta isso?', sub: 'Desconfiar', color: 'dourado', icon: 'olho', goto: 'porque' },
          { label: 'Vigie-o para mim', sub: 'Um espião na casa', color: 'roxo', icon: 'mascara', effects: { flags: { espiaoMontclair: true }, loyalty: { montclair: -2 }, res: { influencia: 3 }, xp: 12 }, reply: 'Sir Aldo assente. A partir de hoje, você tem olhos dentro das Montanhas de Ferro.' },
          { label: 'Prender Otho agora', sub: 'Ação imediata', color: 'vermelho', icon: 'espadas', effects: { loyalty: { montclair: -20 }, res: { prestigio: 4 }, flags: { conspiracaoRevelada: true }, xp: 10 }, reply: 'Guardas cercam Otho no castelo dele. Ele jura inocência. Os Montclair juram vingança.' },
        ],
      },
      porque: {
        text: '"Porque meu pai morreu defendendo o Passo Cinzento contra Norhelm, Majestade." Ele tira a luva: falta um dedo. "E eu também sangrei lá. Não vou servir a um traidor."',
        choices: [
          { label: 'Confio em você. Vigie-o', sub: 'Espião leal', color: 'azul', icon: 'escudo', effects: { flags: { espiaoMontclair: true, conspiracaoRevelada: true }, res: { influencia: 4 }, xp: 15 }, reply: 'Em uma semana, Sir Aldo traz cartas. Otho negociava com Norhelm. Você tem a prova.' },
          { label: 'Recompensá-lo e dispensá-lo', sub: 'Cautela', color: 'dourado', icon: 'moedas', effects: { res: { ouro: -50, influencia: 2 }, xp: 8 }, reply: 'Ele aceita a bolsa, decepcionado. Você não sabe se perdeu um aliado ou evitou uma armadilha.' },
        ],
      },
    },
  },
  {
    id: 'dama_carvalhal', speaker: 'dama_carvalhal', topic: 'A floresta sagrada', kind: 'audiencia', weight: 2, minDay: 6, repeat: 30, lasts: 2,
    nodes: {
      start: {
        text: 'Majestade, sou Lady Brígida Carvalhal, vassala dos Seren. Os lenhadores da capital estão derrubando carvalhos sagrados para vender madeira. A Senhora Aveline está furiosa, e eu tenho medo do que ela fará.',
        choices: [
          { label: 'O que ela pode fazer?', sub: 'Saber mais', color: 'dourado', icon: 'olho', goto: 'medo' },
          { label: 'Proibir o corte', sub: 'Proteger os carvalhos', color: 'verde', icon: 'arvore', effects: { loyalty: { seren: 8 }, rel: { tobias: -6 }, res: { ouro: -40 }, xp: 8 }, reply: 'Os lenhadores reclamam. Os Seren acendem velas em sua homenagem.' },
          { label: 'A capital precisa de madeira', sub: 'Economia primeiro', color: 'vermelho', icon: 'martelo', effects: { loyalty: { seren: -8 }, res: { ouro: 60 }, xp: 5 }, reply: 'A madeira continua saindo. Os Seren começam a rezar de um jeito diferente.' },
        ],
      },
      medo: {
        text: '"Ela pode chamar os camponeses dos bosques para proteger as árvores com foices." Lady Brígida torce as mãos. "E ninguém nos bosques desobedece a Senhora Aveline."',
        choices: [
          { label: 'Plantar dois carvalhos para cada um', sub: 'Solução criativa', color: 'verde', icon: 'arvore', effects: { loyalty: { seren: 10 }, res: { ouro: -80, povo: 3 }, rel: { aveline: 6 }, xp: 14 }, reply: 'A ideia agrada a todos. Até a Senhora Aveline sorri, ou quase.' },
          { label: 'O corte só com licença Seren', sub: 'Dar controle a eles', color: 'azul', icon: 'pergaminho', effects: { loyalty: { seren: 12 }, rel: { tobias: -8 }, res: { ouro: -20 }, xp: 12 }, reply: 'Os Seren ganham o controle do corte. A Guilda perde um negócio.' },
        ],
      },
    },
  },
];

function addWineRoute(s: GameState) {
  if (!s.routes.some((r) => r.to === 'veridian' && r.good === 'vinho')) s.routes.push({ id: nextRouteId(s), from: 'costa', to: 'veridian', good: 'vinho' });
}
