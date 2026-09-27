import type { GameEvent } from '../../types';

// O povo comum: petições, pão, festas e revoltas. Alimentam o Apoio do Povo e a Governabilidade.
export const PEOPLE_EVENTS: GameEvent[] = [
  {
    id: 'peticao_terras', speaker: 'marta', topic: 'Petição: terras roubadas', kind: 'audiencia', weight: 3, minDay: 2, repeat: 10, lasts: 2,
    nodes: {
      start: {
        text: 'Majestade, sou Marta, de Vila Carvalho. Os homens da Casa Ferrão, vassalos dos Drakon, cercaram nossos pastos e dizem que agora são deles. Não temos a quem pedir, só ao rei.',
        choices: [
          { label: 'Vocês têm algum documento?', sub: 'Buscar provas', color: 'dourado', icon: 'pergaminho', goto: 'provas' },
          { label: 'Devolver as terras ao povo', sub: 'Justiça aos humildes', color: 'verde', icon: 'povo', effects: { res: { povo: 5 }, loyalty: { drakon: -4 }, rel: { marta: 6 } }, goto: 'devolver' },
          { label: 'Manter a palavra do nobre', sub: 'Ordem acima de tudo', color: 'vermelho', icon: 'escudo', effects: { res: { povo: -6 }, loyalty: { drakon: 5 }, rel: { marta: -12 }, xp: 5 }, reply: 'Marta não chora. Só olha você por um longo tempo e vai embora. A vila inteira saberá.' },
          { label: 'Ouvir mais o povo', sub: 'Exige Pão e Pedra', color: 'azul', icon: 'livro', req: { knowledge: 'povo' }, effects: { res: { povo: 12 }, loyalty: { drakon: -3 }, rel: { marta: 15 }, xp: 15 }, reply: 'Você pergunta pelos filhos dela pelo nome. Marta sai do castelo contando a todos que o rei os conhece.' },
        ],
      },
      provas: {
        text: '"Documento?" Ela ri, amarga. "Majestade, ninguém na vila sabe ler. Mas meu avô, e o avô dele, pastorearam naquelas terras. Todo mundo sabe. Até os Ferrão sabem."',
        choices: [
          { label: 'O costume vale como lei', sub: 'Exige Leis e Costumes', color: 'roxo', icon: 'livro', req: { knowledge: 'leis' }, effects: { res: { povo: 8, prestigio: 3 }, loyalty: { drakon: -1 }, rel: { marta: 10 }, xp: 15 }, reply: 'Você cita o Costume dos Pastos Comuns. Os Ferrão não têm como contestar. Justiça, e ninguém ofendido demais.' },
          { label: 'Então vou mandar um juiz', sub: 'Investigar', color: 'azul', icon: 'olho', effects: { res: { povo: 3, influencia: 1 }, rel: { marta: 4 }, xp: 10 }, reply: '"Um juiz do rei, na nossa vila?" Ela parece não acreditar. "Vou esperar, Majestade."' },
          { label: 'Sem documento, sem terras', sub: 'Letra da lei', color: 'vermelho', icon: 'escudo', effects: { res: { povo: -5 }, loyalty: { drakon: 4 }, rel: { marta: -10 }, xp: 5 }, reply: '"A lei dos que sabem ler", ela diz baixinho, e sai.' },
        ],
      },
      devolver: {
        text: 'Marta cai de joelhos. Depois se levanta rápido, envergonhada. "Obrigada. Mas, Majestade... os Ferrão vão se vingar quando o senhor não estiver olhando."',
        choices: [
          { label: 'Deixar dois guardas na vila', sub: '−20 soldados', color: 'azul', icon: 'escudo', effects: { res: { exercito: -20, povo: 4 }, rel: { marta: 10 }, xp: 12 }, reply: 'Dois guardas reais em Vila Carvalho. As crianças os seguem por todo lado.' },
          { label: 'Chamar Lorde Brandt para prestar contas', sub: 'Pressão nos Drakon', color: 'vermelho', icon: 'coroa', effects: { loyalty: { drakon: -4 }, res: { povo: 4, prestigio: 2 }, rel: { marta: 8 }, xp: 12 }, reply: 'Brandt recebe a carta real e fica furioso com os Ferrão, e um pouco com você.' },
          { label: 'Vocês terão que se defender', sub: 'Realismo', color: 'dourado', icon: 'mascara', effects: { rel: { marta: 2 }, xp: 8 }, reply: 'Ela assente, séria. "Então vamos nos defender."' },
        ],
      },
    },
    ignored: { text: 'Marta voltou para casa sem resposta. A vila inteira soube.', res: { povo: -4 }, rel: { marta: -8 } },
  },
  {
    id: 'preco_pao', speaker: 'marta', topic: 'O preço do pão', kind: 'audiencia', weight: 3, minDay: 3, repeat: 9, lasts: 2,
    nodes: {
      start: {
        text: 'O pão dobrou de preço, Majestade. Os moleiros dizem que é a guerra que vem. Minhas crianças comem uma vez por dia. A cidade inteira está assim.',
        choices: [
          { label: 'Os moleiros estão mentindo?', sub: 'Investigar', color: 'dourado', icon: 'olho', goto: 'moleiros' },
          { label: 'Subsidiar o pão', sub: '−120 de ouro', color: 'azul', icon: 'trigo', req: { ouro: 120 }, effects: { res: { ouro: -120, povo: 8 }, rel: { marta: 8 }, xp: 8 }, reply: 'O pão real sai das padarias do castelo. Marta volta para casa com dois pães debaixo do braço.' },
          { label: 'O mercado se ajusta sozinho', sub: 'Não intervir', color: 'vermelho', icon: 'moedas', effects: { res: { povo: -5 }, rel: { tobias: 5 }, xp: 5 }, reply: '"Os mercados não comem, Majestade. As crianças comem."' },
        ],
      },
      moleiros: {
        text: '"Mentindo não, Majestade. Escondendo." Ela baixa a voz. "Os armazéns da Guilda estão cheios de trigo. Eles esperam o preço subir mais para vender."',
        choices: [
          { label: 'Tabelar o preço', sub: 'Lei da Tabela do Pão', color: 'verde', icon: 'pergaminho', req: { test: (s) => !s.laws.includes('Lei da Tabela do Pão'), label: 'Lei já aprovada' }, effects: { law: 'Lei da Tabela do Pão', res: { povo: 10 }, rel: { tobias: -12, marta: 10 }, xp: 12 }, reply: 'Os moleiros protestam, a Guilda reclama, e o povo come.' },
          { label: 'Abrir os armazéns à força', sub: 'Confiscar o trigo', color: 'vermelho', icon: 'martelo', effects: { res: { povo: 12, prestigio: -2 }, rel: { tobias: -20, marta: 12 }, xp: 10 }, reply: 'Os guardas abrem os armazéns. Na praça, o povo grita o nome do rei. Na Guilda, alguém grita outra coisa.' },
          { label: 'Chamar Tobias para conversar', sub: 'Diplomacia', color: 'azul', icon: 'aperto', effects: { res: { povo: 5 }, rel: { tobias: -2, marta: 5 }, xp: 10 }, reply: 'Tobias jura que foi um "atraso logístico". O trigo aparece nas padarias no dia seguinte.' },
        ],
      },
    },
    ignored: { text: 'O preço do pão continuou subindo.', res: { povo: -5 } },
  },
  {
    id: 'festival_colheita', speaker: 'marta', topic: 'Festa da Colheita', kind: 'audiencia', weight: 2, minDay: 6, repeat: 14, lasts: 3,
    nodes: {
      start: {
        text: 'Majestade, todo outono o antigo rei abria a praça para a Festa da Colheita. Pão, cerveja e música. O povo pergunta se o novo rei também fará isso.',
        choices: [
          { label: 'Uma festa digna de reis', sub: '−200 de ouro', color: 'dourado', icon: 'coroa', req: { ouro: 200 }, effects: { res: { ouro: -200, povo: 8, prestigio: 3 } }, goto: 'festa' },
          { label: 'Aparecer na festa pessoalmente', sub: 'Custa 2h extras', color: 'verde', icon: 'povo', effects: { res: { povo: 5 }, run: (s) => (s.hour = Math.min(20, s.hour + 2)) }, goto: 'festa' },
          { label: 'Não há ouro para festas', sub: 'Recusar', color: 'vermelho', icon: 'moedas', effects: { res: { povo: -5 }, xp: 5 }, reply: '"Seu pai também dizia isso quando não queria", Marta resmunga.' },
        ],
      },
      festa: {
        text: 'Música, cerveja e fogueiras na praça. Um velho ferreiro, bêbado, levanta o caneco e grita: "Um brinde ao rei! E que ele baixe os impostos!" Todos riem e olham para você.',
        choices: [
          { label: 'Brindar e prometer pensar', sub: 'Carisma', color: 'verde', icon: 'coracao', effects: { res: { povo: 6 }, rel: { marta: 6 }, xp: 12 }, reply: 'A praça explode em vivas. Você dança com camponesas, prova a cerveja e ri com os ferreiros.' },
          { label: 'Baixar os impostos da capital ali mesmo', sub: 'Gesto grandioso', color: 'dourado', icon: 'moedas', effects: { run: (s) => (s.taxes.coroa = 'baixo'), res: { povo: 12 }, xp: 12 }, reply: 'O ferreiro desmaia de alegria. Corvin, quando souber, vai desmaiar de outra coisa.' },
          { label: 'Brindar ao reino, não ao rei', sub: 'Humildade', color: 'azul', icon: 'escudo', effects: { res: { povo: 5, prestigio: 2 }, xp: 10 }, reply: '"Ao reino!" A praça inteira repete. É a melhor noite do seu reinado até agora.' },
        ],
      },
    },
    ignored: { text: 'Pela primeira vez em trinta anos, não houve Festa da Colheita.', res: { povo: -6 } },
  },
  {
    id: 'nobre_ladrao', speaker: 'camponesa', topic: 'Um nobre ladrão', kind: 'audiencia', weight: 2, minDay: 5, repeat: 14,
    nodes: {
      start: {
        text: 'Majestade, sou velha, mas ainda enxergo bem. Um cavaleiro da Casa Cinzel, vassalos dos Montclair, levou as ovelhas do meu neto no mercado sem pagar e ainda bateu nele. É justo?',
        choices: [
          { label: 'Seu neto está bem?', sub: 'Compaixão', color: 'verde', icon: 'coracao', goto: 'neto' },
          { label: 'Prender o cavaleiro', sub: 'A lei vale para todos', color: 'vermelho', icon: 'escudo', effects: { res: { povo: 10, prestigio: 3 }, loyalty: { montclair: -8 }, xp: 10 }, reply: 'O cavaleiro passa a noite na masmorra. Na cidade baixa, a velha vira heroína.' },
          { label: 'Perdoar o cavaleiro', sub: 'Proteger a nobreza', color: 'azul', icon: 'aperto', effects: { res: { povo: -8 }, loyalty: { montclair: 5 }, xp: 5 }, reply: '"Entendi", ela diz. "Os velhos sempre entendem."' },
        ],
      },
      neto: {
        text: 'Os olhos dela se enchem de lágrimas. "Um olho roxo e o orgulho ferido, Majestade. Ele tem doze anos. Queria ser cavaleiro. Agora diz que cavaleiros são ladrões."',
        choices: [
          { label: 'Ele será pajem na guarda real', sub: 'Mudar a vida do menino', color: 'verde', icon: 'coroa', effects: { res: { povo: 10 }, rel: { camponesa: 15, aurelian: 3 }, loyalty: { montclair: -4 }, xp: 14 }, reply: 'A velha Berta chora de verdade agora. Em uma semana, o menino está polindo armaduras no castelo, e contando para todo mundo.' },
          { label: 'O cavaleiro pagará o dobro', sub: 'Multa', color: 'dourado', icon: 'moedas', effects: { res: { povo: 6 }, loyalty: { montclair: -3 }, rel: { camponesa: 6 }, xp: 10 }, reply: 'O cavaleiro paga, rangendo os dentes. A família ganha ovelhas novas.' },
        ],
      },
    },
    ignored: { text: 'O cavaleiro saiu impune, e o povo notou.', res: { povo: -5 } },
  },
  {
    id: 'carta_direitos', speaker: 'marta', topic: 'A Carta dos Comuns', kind: 'audiencia', minDay: 9, weight: 3, cond: (s) => (s.rel.marta ?? 0) >= 10 || s.res.povo >= 55, lasts: 3,
    nodes: {
      start: {
        text: 'Majestade, os artesãos, camponeses e mercadores pequenos juntaram suas marcas neste pergaminho. Pedimos uma Carta dos Direitos Comuns: que nenhum homem livre seja preso sem julgamento do rei. Os lordes vão odiar, mas o povo jamais esquecerá.',
        advice: {
          aldric: { text: 'Aldric, preocupado: "Uma carta assim muda o reino para sempre, Majestade. Deixe-me redigir uma versão que os lordes consigam engolir."', choice: { label: 'A versão do Chanceler', sub: 'Carta moderada', color: 'azul', icon: 'pergaminho', effects: { law: 'Carta dos Direitos Comuns', res: { povo: 8 }, loyalty: { drakon: -2, montclair: -2 }, rel: { marta: 6, aldric: 8 }, xp: 20 }, reply: 'Aldric escreve a noite inteira. A carta sai mais curta, mais cuidadosa, e aprovada por quase todos.' } },
          isabelle: { text: 'Isabelle, alarmada: "Seu pai jamais assinaria isso. Os lordes nos protegem, filho. O povo só pede."', choice: { label: 'Recusar, como a mãe quer', sub: 'Tradição', color: 'vermelho', icon: 'coroa', effects: { res: { povo: -10 }, loyalty: { drakon: 4, montclair: 4, valmont: 3 }, rel: { marta: -20, isabelle: 8 }, xp: 8 }, reply: 'Marta enrola o pergaminho devagar. "Então o rei é dos lordes." A frase corre a cidade baixa em uma hora.' } },
        },
        choices: [
          { label: 'Por que agora?', sub: 'Entender', color: 'dourado', icon: 'balao', goto: 'porque' },
          { label: 'Assinar a Carta', sub: 'Governabilidade +5 permanente', color: 'verde', icon: 'pergaminho', effects: { law: 'Carta dos Direitos Comuns', res: { povo: 15 }, loyalty: { valmont: -6, drakon: -8, seren: -3, montclair: -8 }, rel: { marta: 20 }, xp: 20 }, reply: 'Os sinos da cidade baixa tocam sem ordem de ninguém. Nos castelos, os lordes franzem a testa.' },
          { label: 'Uma versão moderada', sub: 'Exige Leis e Costumes', color: 'roxo', icon: 'livro', req: { knowledge: 'leis' }, effects: { law: 'Carta dos Direitos Comuns', res: { povo: 10 }, loyalty: { drakon: -3, montclair: -3 }, rel: { marta: 12 }, xp: 25 }, reply: 'Você redige com cuidado, preservando os tribunais dos lordes. Ambos os lados aceitam, a contragosto.' },
          { label: 'Rasgar o pergaminho', sub: 'O rei não se curva', color: 'vermelho', icon: 'coroa', effects: { res: { povo: -15, prestigio: 3 }, loyalty: { drakon: 5, montclair: 5 }, rel: { marta: -30 }, xp: 5 }, reply: 'O barulho do pergaminho rasgando ecoa pelo salão. E, depois, pela cidade inteira.' },
        ],
      },
      porque: {
        text: '"Porque semana passada os homens de Montclair prenderam o filho do padeiro por dizer que o pão estava caro. Três dias no escuro, sem julgamento." Ela ergue o queixo. "Amanhã pode ser qualquer um de nós."',
        choices: [
          { label: 'Assinar, então', sub: 'A Carta dos Comuns', color: 'verde', icon: 'pergaminho', effects: { law: 'Carta dos Direitos Comuns', res: { povo: 15 }, loyalty: { valmont: -5, drakon: -6, seren: -2, montclair: -10 }, rel: { marta: 22 }, xp: 22 }, reply: 'Você assina com a mão firme. Marta chora. Nos castelos, os lordes começam a escrever cartas.' },
          { label: 'Libertar o filho do padeiro hoje', sub: 'Resolver o caso', color: 'azul', icon: 'escudo', effects: { res: { povo: 6 }, loyalty: { montclair: -4 }, rel: { marta: 8 }, xp: 12 }, reply: '"Um caso resolvido não resolve os próximos", Marta diz. Mas agradece.' },
          { label: 'Vou pensar', sub: 'Adiar', color: 'dourado', icon: 'ampulheta', effects: { res: { povo: -3 }, rel: { marta: -5 }, xp: 5 }, reply: 'Ela deixa o pergaminho sobre os degraus do trono e vai embora.' },
        ],
      },
    },
    ignored: { text: 'A Carta dos Comuns ficou sem resposta. O povo entendeu isso como um "não".', res: { povo: -8 }, rel: { marta: -10 } },
  },
  {
    id: 'ponte_ruiu', speaker: 'campones', topic: 'A ponte caiu', kind: 'audiencia', weight: 2, minDay: 4, repeat: 20, lasts: 2,
    nodes: {
      start: {
        text: 'A velha ponte do Rio Manso desabou com uma carroça em cima, Majestade. Três mortos. Sem ela, os camponeses do sul levam dois dias para chegar ao mercado.',
        choices: [
          { label: 'Quem eram os mortos?', sub: 'Humanizar', color: 'verde', icon: 'coracao', goto: 'mortos' },
          { label: 'Reconstruir com pedra', sub: '−180 de ouro', color: 'dourado', icon: 'martelo', req: { ouro: 180 }, effects: { res: { ouro: -180, povo: 6 }, xp: 8 }, reply: 'Pedreiros da capital partem no dia seguinte. A ponte nova vai durar cem anos.' },
          { label: 'Montclair que forneça a pedra', sub: 'Exigir dos lordes', color: 'vermelho', icon: 'montanha', effects: { res: { povo: 5 }, loyalty: { montclair: -6 }, xp: 8 }, reply: 'Otho manda a pedra, e uma carta muito educada e muito furiosa.' },
        ],
      },
      mortos: {
        text: 'Oswin tira o chapéu de palha. "Um carroceiro, a mulher dele e o filho pequeno, Majestade. Levavam repolhos para vender." Ele aperta o chapéu. "A ponte rangia há anos. Ninguém fez nada."',
        choices: [
          { label: 'A ponte levará o nome deles', sub: 'Ponte nova, −180 ouro', color: 'verde', icon: 'coracao', req: { ouro: 180 }, effects: { res: { ouro: -180, povo: 10 }, rel: { campones: 12 }, xp: 14 }, reply: 'A Ponte dos Três Repolhos, o povo a chama. Mas todos sabem os nomes gravados na pedra.' },
          { label: 'Punir o coletor que ignorou a ponte', sub: 'Responsabilizar', color: 'vermelho', icon: 'escudo', effects: { res: { povo: 5, prestigio: 2 }, rel: { campones: 6 }, xp: 10 }, reply: 'O coletor é destituído. O povo gosta de ver alguém pagar.' },
          { label: 'Mutirão com ajuda do castelo', sub: '−60 ouro', color: 'azul', icon: 'povo', req: { ouro: 60 }, effects: { res: { ouro: -60, povo: 6 }, rel: { campones: 8 }, xp: 10 }, reply: 'Camponeses e soldados trabalham lado a lado. Em uma semana há uma ponte de madeira nova.' },
        ],
      },
    },
    ignored: { text: 'A ponte continua em ruínas. Os mercados do sul estão vazios.', res: { povo: -4, ouro: -40 } },
  },
  {
    id: 'curandeira', speaker: 'irma', topic: 'Febre na cidade baixa', kind: 'urgente', weight: 1, minDay: 8, repeat: 25,
    nodes: {
      start: {
        text: 'Majestade, cuido dos doentes da cidade baixa há vinte anos. Uma febre nova se espalha, e veio dos navios. Se nada for feito, vai subir até o castelo.',
        choices: [
          { label: 'O que a senhora precisa?', sub: 'Ouvir a especialista', color: 'verde', icon: 'balao', goto: 'precisa' },
          { label: 'Quarentena no porto', sub: 'Irrita os Valmont', color: 'vermelho', icon: 'escudo', effects: { res: { povo: 6 }, loyalty: { valmont: -8 }, xp: 10 }, reply: 'O porto fecha por uma semana. Gaspard Valmont conta as moedas que está perdendo, uma por uma.' },
          { label: 'Pagar curandeiros', sub: '−150 de ouro', color: 'dourado', icon: 'moedas', req: { ouro: 150 }, effects: { res: { ouro: -150, povo: 8 }, xp: 10 }, reply: 'Curandeiros de todo o reino chegam à cidade baixa.' },
        ],
      },
      precisa: {
        text: 'A Irmã Hedda parece surpresa por ser perguntada. "Ervas dos Bosques Reais, panos limpos, água fervida. E que os ricos parem de fugir para o campo levando a doença junto."',
        choices: [
          { label: 'Pedir ervas aos Seren', sub: 'Custa 3 de Influência', color: 'verde', icon: 'arvore', req: { influencia: 3 }, effects: { res: { povo: 8, influencia: -3 }, loyalty: { seren: 4 }, rel: { irma: 10 }, xp: 12 }, reply: 'Carroças de ervas chegam dos bosques. A febre recua em dez dias.' },
          { label: 'Fechar os portões da cidade', sub: 'Ninguém sai', color: 'vermelho', icon: 'escudo', effects: { res: { povo: 4, prestigio: -2 }, loyalty: { valmont: -3 }, rel: { irma: 6 }, xp: 10 }, reply: 'Os ricos protestam. A febre fica presa na cidade baixa, e morre lá.' },
          { label: 'Tudo o que ela pedir', sub: '−200 ouro', color: 'dourado', icon: 'moedas', req: { ouro: 200 }, effects: { res: { ouro: -200, povo: 12 }, rel: { irma: 15 }, xp: 12 }, reply: '"Deus o abençoe, Majestade." Em duas semanas, a cidade baixa volta a respirar.' },
        ],
      },
    },
    ignored: { text: 'A febre levou dezenas na cidade baixa.', res: { povo: -12, prestigio: -4 } },
  },
  {
    id: 'mensageiro_carta', speaker: 'mensageiro', topic: 'Uma carta sem remetente', kind: 'audiencia', weight: 2, minDay: 7, repeat: 30,
    nodes: {
      start: {
        text: 'Majestade, um homem encapuzado me entregou esta carta na estrada de Montclair e sumiu. Disse que era só para os olhos do rei. O selo foi arrancado.',
        choices: [
          { label: 'Abrir a carta', sub: 'Ler agora', color: 'dourado', icon: 'pergaminho', goto: 'carta' },
          { label: 'Queimar sem ler', sub: 'Pode ser armadilha', color: 'vermelho', icon: 'escudo', effects: { res: { prestigio: 1 }, xp: 5 }, reply: 'O papel vira cinza. Você nunca saberá o que dizia.' },
        ],
      },
      carta: {
        text: '"Quem guarda as minas de prata negocia com o inverno. Olhe as contas de Cinzel." Nada mais. O mensageiro espera, nervoso.',
        choices: [
          { label: 'Mandar Corvin auditar Cinzel', sub: 'Investigar Montclair', color: 'azul', icon: 'olho', effects: { flags: { auditoriaCinzel: true }, loyalty: { montclair: -4 }, res: { influencia: 3 }, xp: 12 }, reply: 'Corvin parte com três escrivães. Otho manda um presente caro para o castelo no dia seguinte, o que por si só já é suspeito.' },
          { label: 'Recompensar o mensageiro pelo silêncio', sub: '−20 ouro', color: 'dourado', icon: 'moedas', effects: { res: { ouro: -20 }, rel: { mensageiro: 8 }, flags: { segredoOtho: true }, xp: 10 }, reply: 'Pip guarda a moeda e o segredo. Você guarda a carta.' },
        ],
      },
    },
  },

  // ---------- Crises disparadas pelo motor ----------
  {
    id: 'tumulto_praca', speaker: 'marta', topic: 'Tumulto na praça!', kind: 'urgente',
    nodes: {
      start: {
        text: 'Majestade! O povo tomou a praça do mercado! Gritam que o rei não governa, que os lordes e os coletores fazem o que querem. A guarda está cercada!',
        choices: [
          { label: 'Distribuir pão', sub: '−200 de ouro', color: 'dourado', icon: 'trigo', req: { ouro: 200 }, effects: { res: { ouro: -200, povo: 15 }, flags: { tumultoAgendado: false }, xp: 10 }, reply: 'As carroças de pão abrem caminho na multidão. A raiva vira fome saciada.' },
          { label: 'Dispersar à força', sub: 'Sangue na praça', color: 'vermelho', icon: 'espadas', effects: { res: { povo: -10, prestigio: 4, moral: -5 }, flags: { tumultoAgendado: false }, xp: 5 }, reply: 'A praça esvazia. Fica o sangue nas pedras, e a memória.' },
          { label: 'Descer até a praça', sub: 'Falar ao povo', color: 'azul', icon: 'povo', req: { influencia: 10 }, effects: { res: { influencia: -10 }, flags: { tumultoAgendado: false } }, goto: 'praca' },
        ],
      },
      praca: {
        text: 'Você sobe na fonte da praça, sem guarda. O silêncio é total. Um homem grita: "Por que o rei deixa os coletores nos roubarem?" Mil olhos esperam a resposta.',
        choices: [
          { label: 'Porque eu não sabia. Agora sei', sub: 'Sinceridade', color: 'verde', icon: 'coracao', effects: { res: { povo: 16, prestigio: 2 }, xp: 15 }, reply: 'Alguém grita "Viva o rei!", e outros o seguem. Você volta ao castelo com a multidão atrás, cantando.' },
          { label: 'Os coletores serão julgados', sub: 'Prometer justiça', color: 'azul', icon: 'escudo', effects: { res: { povo: 12 }, loyalty: { montclair: -3, drakon: -3 }, xp: 12 }, reply: 'A multidão aplaude. Os lordes que empregam coletores começam a suar.' },
          { label: 'Baixar os impostos da capital', sub: 'Menos renda', color: 'dourado', icon: 'moedas', effects: { run: (s) => (s.taxes.coroa = 'baixo'), res: { povo: 14 }, xp: 10 }, reply: 'A praça explode em alegria. Corvin, lá no castelo, cobre o rosto com as mãos.' },
        ],
      },
    },
    ignored: { text: 'O tumulto virou saque. Lojas queimaram durante a noite.', res: { povo: -12, ouro: -150, prestigio: -6 }, flags: { tumultoAgendado: false } },
  },
  {
    id: 'motim_quartel', speaker: 'aurelian', topic: 'Motim nos quartéis', kind: 'urgente',
    nodes: {
      start: {
        text: 'Majestade, os homens não recebem há dias. Esta manhã, trancaram os oficiais no arsenal. Ainda são leais ao senhor, mas não por muito tempo.',
        choices: [
          { label: 'Pagar tudo agora', sub: '−300 de ouro', color: 'dourado', icon: 'moedas', req: { ouro: 300 }, effects: { res: { ouro: -300, moral: 25 }, flags: { motimAgendado: false }, xp: 10 }, reply: 'O ouro chega em carroças. Os oficiais são soltos, e ninguém fala mais nisso.' },
          { label: 'Ir pessoalmente aos quartéis', sub: 'Encarar os soldados', color: 'azul', icon: 'escudo', effects: { flags: { motimAgendado: false } }, goto: 'quartel' },
          { label: 'Enforcar os líderes', sub: 'Medo', color: 'vermelho', icon: 'espadas', effects: { res: { moral: -10, prestigio: 5, exercito: -100 }, flags: { motimAgendado: false }, xp: 5 }, reply: 'Três corpos balançam no pátio. A ordem volta. A lealdade, não.' },
        ],
      },
      quartel: {
        text: 'O pátio fica em silêncio quando você entra. Um sargento velho dá um passo à frente: "Majestade. Não queremos trair ninguém. Queremos comer. Nossas famílias querem comer."',
        choices: [
          { label: 'Prometer em nome do rei', sub: 'Custa 8 de Influência', color: 'azul', icon: 'coroa', req: { influencia: 8 }, effects: { res: { influencia: -8, moral: 15 }, xp: 12 }, reply: '"A palavra do rei basta." O sargento bate continência, e o pátio inteiro o segue.' },
          { label: 'Pedir um empréstimo aos Valmont', sub: '+400 ouro, −Valmont', color: 'verde', icon: 'flor', effects: { res: { ouro: 400, moral: 12 }, loyalty: { valmont: -10 }, xp: 10 }, reply: 'Gaspard empresta, com um sorriso que vai cobrar juros por anos.' },
          { label: 'Dividir a comida do castelo', sub: 'O rei come com os soldados', color: 'verde', icon: 'coracao', effects: { res: { moral: 18, prestigio: -2 }, rel: { aurelian: 10, isabelle: -5 }, xp: 14 }, reply: 'Você janta no refeitório dos soldados. A história corre todos os quartéis do reino.' },
        ],
      },
    },
    ignored: { text: 'Os amotinados saquearam o arsenal e metade desertou.', res: { exercito: -250, moral: -15, prestigio: -5 }, flags: { motimAgendado: false } },
  },
];
