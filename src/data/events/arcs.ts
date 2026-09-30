import type { GameEvent, GameState, HouseId } from '../../types';
import { char } from '../characters';
import { hasSkill } from '../../engine/core';
import { startWar } from '../../engine/war';

// Arcos narrativos de vários dias: conspiração Montclair, o bastardo Cedric,
// a fuga de Sigrid, a família real, dívidas e escândalos, e o Ato II (dias 25 a 45).
const sp = (s: GameState) => (s.spouse ? char(s.spouse).name : 'a rainha');
const SPOUSE_HOUSE: Record<string, HouseId> = { elenora: 'valmont', rhoswen: 'drakon' };
const noWar = (s: GameState) => !s.war || !!s.war.result;
const evidence = (s: GameState) =>
  Number(!!s.flags.testemunhaLysandra) + Number(!!s.flags.testemunhaBrandt) + Number(!!s.flags.assassinoVivo) + Number(!!s.flags.claraEspia) + Number(!!s.flags.amendoaCozinha) +
  // provas colhidas depois (espião nas montanhas, a presa protegida, a armadilha do veneno)
  Number(!!s.flags.provaOtho) + Number(!!s.flags.lysandraProtegida) + Number(!!s.flags.armadilhaVeneno);

export const ARC_EVENTS: GameEvent[] = [
  // ======================= CONSPIRAÇÃO MONTCLAIR =======================
  {
    id: 'lysandra_convite', speaker: 'lysandra', topic: 'Uma dama encantadora', kind: 'audiencia', minDay: 7, maxDay: 26, weight: 4, cond: (s) => !s.flags.lysandra,
    nodes: {
      start: {
        text: 'Lady Lysandra Cinzel, dama dos Montclair, faz uma reverência baixa demais para ser só educação. "Majestade. Lorde Otho mandou presentes: um cálice de prata das minas e... a mim, para lhe fazer companhia nas noites longas de conselho." Ela ri. "Brincadeira. Mais ou menos."',
        advice: {
          isabelle: { text: 'Isabelle, sem mover os lábios: "Essa moça sorri com a boca e calcula com os olhos. Eu conheço esse sorriso. Eu inventei esse sorriso."', choice: { label: 'Mandar Isabelle vigiá-la', sub: 'Conselho da mãe', color: 'roxo', icon: 'olho', effects: { flags: { lysandra: 1, vigiaLysandra: true }, rel: { isabelle: 6 }, xp: 12 }, reply: 'Lysandra passa a ter uma "nova amiga": a rainha-mãe, que a acompanha até ao banheiro. Ela ainda assim marca um brinde com você à noite, mas agora você está avisado.' } },
        },
        choices: [
          { label: 'Aceitar a companhia', sub: 'Curiosidade perigosa', color: 'roxo', icon: 'coracao', effects: { flags: { lysandra: 1 }, rel: { lysandra: 10 }, loyalty: { montclair: 4 }, xp: 8 }, reply: '"Então brindaremos numa dessas noites", ela diz, e toca sua mão de leve. Um toque frio como prata.' },
          { label: 'Aceitar o cálice, recusar a dama', sub: 'Educação seca', color: 'azul', icon: 'escudo', effects: { flags: { lysandra: 1 }, res: { ouro: 40 }, loyalty: { montclair: 2 }, xp: 8 }, reply: '"Que pena." Ela não parece desapontada. Parece paciente.' },
          { label: 'Devolver tudo a Otho', sub: 'Desconfiança', color: 'vermelho', icon: 'coroa', effects: { flags: { lysandra: 1, desconfiaOtho: true }, loyalty: { montclair: -6 }, res: { prestigio: 2 }, xp: 10 }, reply: 'Ela recolhe o cálice sem perder o sorriso. "Lorde Otho vai ficar tão triste." Não vai. Vai ficar atento.' },
          { label: 'Exige Venenos da Corte: examinar o cálice', sub: 'Prata escurece...', color: 'verde', icon: 'livro', req: { knowledge: 'venenos' }, effects: { flags: { lysandra: 1, conspiracaoRevelada: true, amendoaCozinha: true }, loyalty: { montclair: -3 }, res: { influencia: 5 }, xp: 18 }, reply: 'Você passa o dedo no fundo do cálice. Um resíduo escuro. Lysandra nota que você notou. O jogo agora é às claras.' },
        ],
      },
    },
  },
  {
    id: 'atentado', speaker: 'aurelian', topic: 'Um punhal na sala do trono', kind: 'urgente',
    nodes: {
      start: {
        text: (s) => {
          const safe = s.flags.guardaQuarto || s.flags.sombraContratada || hasSkill(s, 'rede') || (s.rel.aurelian ?? 0) >= 30 || s.flags.vigiaLysandra;
          return safe
            ? 'No meio da audiência, um "peticionário" puxa um punhal. Antes que dê dois passos, o Capitão Aurelian o derruba. Seus preparativos salvaram sua vida. O assassino está no chão, vivo, cuspindo sangue e o nome de ninguém.'
            : 'No meio da audiência, um "peticionário" puxa um punhal e salta. Você cai do trono. O punhal rasga seu braço. Aurelian chega um segundo tarde e o assassino morre na espada dele. Você sangra, vivo por um triz, e a corte inteira viu seu rei no chão.';
        },
        choices: [
          { label: 'Interrogá-lo agora', sub: 'Se ainda houver quem interrogar', color: 'roxo', icon: 'mascara', effects: { run: (s) => { const safe = s.flags.guardaQuarto || s.flags.sombraContratada || hasSkill(s, 'rede') || (s.rel.aurelian ?? 0) >= 30 || s.flags.vigiaLysandra; if (safe) s.flags.assassinoVivo = true; else { s.res.prestigio = Math.max(0, s.res.prestigio - 8); s.res.moral = Math.max(0, s.res.moral - 5); } }, schedule: [{ id: 'julgamento_otho', in: 2 }], rel: { aurelian: 6 }, xp: 20 }, reply: (s) => (s.flags.assassinoVivo ? 'O assassino aguenta três horas. Depois fala: "Cinzel. Otho. Ouro." O suficiente para um julgamento.' : 'Morto não fala. Mas no bolso dele há uma moeda cunhada nas minas de Cinzel. Um fio fino para um julgamento.') },
          { label: 'Fechar os portões do castelo', sub: 'Pânico controlado', color: 'vermelho', icon: 'castelo', effects: { res: { povo: -3, moral: 3 }, schedule: [{ id: 'julgamento_otho', in: 2 }], xp: 12 }, reply: 'Ninguém entra, ninguém sai. Dois cúmplices são pegos tentando pular o muro. Um deles é o sobrinho do administrador de Otho.' },
          { label: 'Voltar ao trono sangrando', sub: 'Mostrar força', color: 'dourado', icon: 'coroa', effects: { res: { prestigio: 10, povo: 5, moral: 6 }, schedule: [{ id: 'julgamento_otho', in: 2 }], xp: 20 }, reply: 'Você se levanta, amarra o braço com a própria capa, e diz: "Próximo." A história corre o reino. Os bardos já exageram: agora eram cinco assassinos.' },
        ],
      },
    },
    ignored: { text: 'O rei não tratou do atentado. Os conspiradores, animados, se reorganizam.', res: { prestigio: -8 }, loyalty: { montclair: -5 } },
  },
  {
    id: 'julgamento_otho', speaker: 'otho', topic: 'O julgamento de Otho Montclair', kind: 'conselho', hours: 2,
    nodes: {
      start: {
        text: (s) => `Lorde Otho entra acorrentado, mas com o queixo erguido. "Majestade, isto é um absurdo. Uma moeda, um criminoso, fofocas de criadas... Onde está a prova?" A corte inteira assiste. As provas reunidas pela coroa: ${evidence(s)}.${s.flags.testemunhaLysandra ? ' Lady Lysandra está pronta para testemunhar.' : ''}${s.flags.testemunhaBrandt ? ' Brandt Drakon, sóbrio e furioso, também.' : ''}`,
        advice: {
          aldric: { text: 'Aldric: "Sem provas suficientes, um julgamento vira perseguição. As outras casas vão se perguntar quem é o próximo."', choice: { label: 'Adiar e colher mais provas', sub: 'Prudência', color: 'azul', icon: 'ampulheta', effects: { loyalty: { montclair: 4 }, res: { prestigio: -2 }, flags: { othoAdiado: true }, rel: { aldric: 5 }, xp: 10 }, reply: 'Otho é solto "por ora". Ele sai sorrindo. As casas respiram. Você não.' } },
        },
        choices: [
          { label: 'Condenar ao exílio', sub: 'Precisa de 2 provas', color: 'vermelho', icon: 'martelo', req: { test: (s) => evidence(s) >= 2, label: '2 provas' }, effects: { loyalty: { montclair: -25, drakon: 5, seren: 3 }, res: { prestigio: 10, povo: 4 }, flags: { othoExilado: true }, law: 'Exílio de Otho Montclair', xp: 30 }, reply: 'Otho é exilado para Véridian. A Casa Montclair jura lealdade ao sobrinho dele, com os dentes cerrados. Ferro e rancor, como sempre.' },
          { label: 'Exige Direito de Sangue: transferir o título', sub: 'A lei antiga', color: 'verde', icon: 'livro', req: { knowledge: 'herancas' }, effects: { loyalty: { montclair: 10 }, res: { prestigio: 8, influencia: 6 }, flags: { othoDeposto: true }, xp: 30 }, reply: 'A lei antiga permite ao rei transferir o título de um traidor ao herdeiro seguinte. A sobrinha de Otho, Dama Irene, assume as montanhas, e fica devendo tudo a você.' },
          { label: 'Perdoar em troca das minas', sub: '+300 ouro, parece fraco', color: 'dourado', icon: 'moedas', effects: { res: { ouro: 300, prestigio: -8 }, loyalty: { montclair: 12 }, flags: { othoPerdoado: true }, xp: 15 }, reply: 'Otho paga, beija seu anel e sai livre. As casas aprendem o preço de uma tentativa de regicídio: trezentas moedas. Barato.' },
          { label: 'Ele que prove a inocência em duelo', sub: 'Julgamento por combate', color: 'roxo', icon: 'espadas', goto: 'duelo' },
        ],
      },
      duelo: {
        text: 'Otho sorri: "Aceito. Meu campeão será Sir Aldo Picoalto." O cavaleiro mais temido das montanhas entra no salão. Quem será o campeão da coroa?',
        choices: [
          { label: 'Capitão Aurelian', sub: 'O mais leal', color: 'azul', icon: 'escudo', effects: { run: (s) => { if ((s.rel.aurelian ?? 0) + s.res.moral / 2 > 40) { s.loyalty.montclair -= 20; s.res.prestigio += 10; s.flags.othoExilado = true; } else { s.res.prestigio -= 10; s.loyalty.montclair += 5; s.flags.othoPerdoado = true; } }, xp: 25 }, reply: (s) => (s.flags.othoExilado ? 'Aurelian vence em três golpes e poupa Picoalto. Otho é exilado. A guarda real canta até de manhã.' : 'Aurelian cai, ferido. Pela lei do combate, Otho é inocente. Ele sai sorrindo. Você terá de conviver com esse sorriso.') },
          { label: 'Eu mesmo', sub: 'Loucura ou lenda', color: 'vermelho', icon: 'coroa', effects: { run: (s) => { const win = s.flags.treinoRhoswen || s.spouse === 'rhoswen' || hasSkill(s, 'coracaoleao') || hasSkill(s, 'lenda'); if (win) { s.loyalty.montclair -= 20; s.res.prestigio += 20; s.res.moral += 10; s.flags.othoExilado = true; } else { s.res.prestigio -= 5; s.res.povo += 6; s.flags.othoPerdoado = true; } }, xp: 30 }, reply: (s) => (s.flags.othoExilado ? 'Contra todas as apostas, você desarma Picoalto com o golpe que Rhoswen lhe ensinou. O salão explode. Otho é exilado e você vira lenda.' : 'Picoalto o desarma em segundos, mas se recusa a ferir o rei. Otho é declarado inocente. O povo, curiosamente, adora o rei que teve coragem de tentar.') },
        ],
      },
    },
  },
  // ======================= CEDRIC DE LYS, O BASTARDO =======================
  {
    id: 'cedric_chega', speaker: 'cedric', topic: 'Um homem com o rosto do seu pai', kind: 'audiencia', day: 16, cond: (s) => !s.flags.cedricConhecido,
    nodes: {
      start: {
        text: 'Um homem de uns vinte anos entra no salão sem se curvar. Tem o queixo do seu pai, o nariz do seu pai e, pior, o sorriso do seu pai. "Majestade. Irmãozinho. Sou Cedric de Lys. Não vim pedir o trono. Ainda. Vim pedir que me reconheça como filho do rei. Um nome. É tudo."',
        advice: {
          isabelle: { text: 'Isabelle, com uma voz que corta vidro: "Seu pai teve um único filho legítimo. Dois, contando o Lucas nos dias bons. Este aqui é um erro de uma noite em Lys."', choice: { label: 'Deixar Isabelle responder', sub: 'A rainha-mãe fala', color: 'vermelho', icon: 'coroa', effects: { flags: { cedricConhecido: true, cedricInimigo: true }, rel: { isabelle: 8, cedric: -15 }, res: { prestigio: 2 }, xp: 10 }, reply: '"Erro de uma noite", repete Cedric, calmo. "A senhora sempre teve talento para as palavras, Majestade. Meu pai dizia isso. No meu quarto. Em Lys." A corte engasga. Isso não vai acabar bem.' } },
        },
        choices: [
          { label: 'Prove', sub: 'Pedir provas', color: 'azul', icon: 'olho', effects: { flags: { cedricConhecido: true } }, goto: 'prova' },
          { label: 'Bem-vindo, irmão', sub: 'Aceitar de cara', color: 'verde', icon: 'aperto', effects: { flags: { cedricConhecido: true, cedricAceito: true }, rel: { cedric: 15, isabelle: -15, lucas: -8 }, res: { povo: 3, prestigio: -4 }, xp: 10 }, reply: 'O salão inteiro prende a respiração. Isabelle sai sem pedir licença. Lucas sussurra: "Então agora eu sou o terceiro. Ótimo."' },
          { label: 'Prendê-lo por impostura', sub: 'Cortar pela raiz', color: 'vermelho', icon: 'cadeado', effects: { flags: { cedricConhecido: true, cedricPreso: true }, rel: { cedric: -20, isabelle: 6 }, res: { povo: -4 }, schedule: [{ id: 'cedric_fuga', in: 3 }], xp: 8 }, reply: 'Os guardas o levam. Ele não resiste. Na praça, o povo começa a cantar o nome dele. Mártires são mais perigosos que pretendentes.' },
        ],
      },
      prova: {
        text: 'Ele tira do pescoço um anel de sinete com o leão real. É autêntico. "Seu pai me deu no meu décimo aniversário. Disse que eu nunca poderia usá-lo. Estou usando."',
        choices: [
          { label: 'Exige Direito de Sangue: sinete não é reconhecimento', sub: 'A lei ao seu lado', color: 'verde', icon: 'livro', req: { knowledge: 'herancas' }, effects: { flags: { cedricLeiContra: true }, res: { prestigio: 5, influencia: 4 }, rel: { cedric: -5, aldric: 6 }, xp: 18 }, reply: '"O sinete prova o sangue, não o direito. Sem reconhecimento formal diante de testemunhas, você é filho do rei, mas não um príncipe." Cedric sorri pela primeira vez sem ironia: "Você estudou. Nosso pai nunca estudou."' },
          { label: 'Oferecer um título menor', sub: 'Senhor de Lys', color: 'dourado', icon: 'coroa', effects: { flags: { cedricTitulo: true }, rel: { cedric: 10, isabelle: -8 }, res: { ouro: -80 }, xp: 12 }, reply: '"Senhor de Lys. Uma cidade pequena, um castelo que chove dentro." Ele pesa o título. "Aceito. Por enquanto."' },
          { label: 'Pagar para ele sumir', sub: '−150 ouro', color: 'roxo', icon: 'moedas', req: { ouro: 150 }, effects: { res: { ouro: -150 }, flags: { cedricPago: true }, rel: { cedric: -3 }, xp: 8 }, reply: 'Ele pega o ouro, conta, e sorri. "Vou gastar tudo em Castelmar mesmo. Adoro a cidade." Não vai sumir.' },
        ],
      },
    },
  },
  {
    id: 'cedric_mae', speaker: 'isabelle', topic: 'A rainha-mãe e o bastardo', kind: 'familia', minDay: 17, maxDay: 30, weight: 6, cond: (s) => !!s.flags.cedricConhecido && !s.flags.cedricMaeFalou,
    nodes: {
      start: {
        text: '"Aquele homem..." Isabelle joga uma luva na mesa. "Eu sabia dele há dezoito anos. A mãe era uma cantora de Lys. Seu pai mandava dinheiro todo mês e achava que eu não via as contas. Eu VIA as contas. Eu ASSINAVA as contas." Ela respira. "Quero que ele desapareça, filho. Não morto. Desaparecido."',
        choices: [
          { label: 'Mãe, ele também é filho do pai', sub: 'Empatia difícil', color: 'azul', icon: 'coracao', effects: { flags: { cedricMaeFalou: true }, rel: { isabelle: -10, cedric: 6 }, res: { povo: 2 }, xp: 14 }, reply: '"E eu também fui esposa do seu pai. Foi pior." Ela sai. Horas depois, você a encontra chorando na capela. Ela não deixa você ver o rosto.' },
          { label: 'Vou cuidar disso, mãe', sub: 'Promessa perigosa', color: 'vermelho', icon: 'escudo', effects: { flags: { cedricMaeFalou: true, cedricPromessa: true }, rel: { isabelle: 12 }, xp: 10 }, reply: '"Eu sei que vai." Ela beija sua testa. É a primeira vez que você percebe que sua mãe tem medo.' },
          { label: 'E o Brandt, mãe?', sub: 'Golpe baixo', color: 'roxo', icon: 'mascara', req: { test: (s) => !!s.flags.segredoIsabelle, label: 'Saber do segredo dela' }, effects: { flags: { cedricMaeFalou: true }, rel: { isabelle: -6 }, res: { influencia: 5 }, xp: 14 }, reply: 'Ela fica branca. Depois ri, um riso cansado. "Touché, Majestade. Você está ficando bom nisso. Isso me orgulha e me assusta."' },
        ],
      },
    },
  },
  {
    id: 'cedric_apoio', speaker: 'aldric', topic: 'Os lordes e o bastardo', kind: 'conselho', minDay: 20, maxDay: 36, weight: 5, cond: (s) => !!s.flags.cedricConhecido && !s.flags.cedricResolvido && !s.flags.cedricPago,
    nodes: {
      start: {
        text: (s) => `"Majestade, preocupação." Aldric abre um mapa. "Cedric janta com lordes toda noite. ${s.loyalty.valmont < 10 ? 'Gaspard Valmont já pagou dois jantares.' : 'Os Valmont ainda recusam.'} ${s.loyalty.montclair < 10 ? 'Os Montclair mandaram ferro para a casa dele.' : ''} Na taverna, cantam uma música chamada O Leão Verdadeiro. Não é sobre o senhor."`,
        choices: [
          { label: 'Convidá-lo para o conselho', sub: 'Manter o inimigo perto', color: 'azul', icon: 'aperto', effects: { rel: { cedric: 12, aldric: -6, isabelle: -8 }, res: { influencia: -4 }, flags: { cedricConselho: true }, schedule: [{ id: 'cedric_final', in: 4 }], xp: 14 }, reply: 'Cedric aceita. Nas reuniões ele é brilhante, educado e irritantemente certo. Aldric começa a tomar chá de camomila.' },
          { label: 'Espalhar que a mãe dele era uma farsa', sub: 'Guerra de boatos', color: 'roxo', icon: 'mascara', req: { attr: ['intriga', 2] }, effects: { rel: { cedric: -12 }, res: { povo: -2, influencia: 5 }, schedule: [{ id: 'cedric_final', in: 4 }], xp: 14 }, reply: 'O boato pega. Metade da taverna agora canta O Leão Falso. A outra metade canta mais alto a versão original.' },
          { label: 'Fazer uma festa maior que os jantares dele', sub: '−120 ouro', color: 'dourado', icon: 'moedas', req: { ouro: 120 }, effects: { res: { ouro: -120, prestigio: 6, povo: 4 }, loyalty: { valmont: 4, montclair: 3 }, schedule: [{ id: 'cedric_final', in: 4 }], xp: 12 }, reply: 'Um banquete com javali, três bardos e um urso dançarino. Os lordes lembram quem é o rei, e de quem é o vinho.' },
        ],
      },
    },
  },
  {
    id: 'cedric_final', speaker: 'cedric', topic: 'O leão e o leão', kind: 'urgente', lasts: 2, cond: (s) => !!s.flags.cedricConhecido && !s.flags.cedricResolvido,
    nodes: {
      start: {
        text: (s) => (s.flags.cedricConselho
          ? '"Irmão." Cedric entra sozinho, sem armas. "Passei dias no seu conselho. Você decide devagar, erra às vezes, mas escuta. Nosso pai nunca escutou." Ele coloca o anel de sinete no braço do trono. "Não quero sua coroa. Quero um lugar. E quero que sua mãe pare de me olhar como se eu fosse uma mancha."'
          : 'Cedric entra com doze homens armados e dois lordes menores atrás dele. "Irmão. A cidade canta meu nome. Três casas me ouvem. Proponho uma coisa simples: um conselho da coroa com poder de veto, e uma cadeira para mim." Não é um pedido.'),
        choices: [
          { label: 'Reconhecê-lo como príncipe', sub: 'Família inteira', color: 'verde', icon: 'coracao', effects: { flags: { cedricResolvido: 'irmao' }, rel: { cedric: 25, isabelle: -20, lucas: -5 }, res: { povo: 8, prestigio: 2 }, law: 'Reconhecimento do Príncipe Cedric', xp: 30 }, reply: 'Cedric se ajoelha. Pela primeira vez, sem ironia. Lucas, no fundo do salão, murmura: "Bem-vindo ao clube dos reservas." Isabelle não aparece no jantar.' },
          { label: 'Nomeá-lo embaixador em Véridian', sub: 'Longe, mas honrado', color: 'azul', icon: 'aperto', effects: { flags: { cedricResolvido: 'embaixador' }, rel: { cedric: 8, isabelle: 6 }, res: { influencia: 6 }, xp: 25 }, reply: '"Um exílio de seda." Cedric sorri. "Aceito. Mas vou escrever toda semana. E vou contar tudo que ouvir." Um espião talentoso, e seu.' },
          { label: 'Prendê-lo agora', sub: 'Golpe contra golpe', color: 'vermelho', icon: 'cadeado', effects: { run: (s) => { const strong = (s.rel.aurelian ?? 0) >= 20 || s.res.moral >= 55; s.flags.cedricResolvido = strong ? 'preso' : 'fugiu'; if (!strong) { s.res.prestigio -= 8; s.res.povo -= 6; } else s.res.prestigio += 8; }, rel: { cedric: -30, isabelle: 10 }, xp: 25 }, reply: (s) => (s.flags.cedricResolvido === 'preso' ? 'A guarda real é mais rápida. Cedric vai para a torre, sorrindo. "Nosso pai também me prendeu uma vez. Durou uma semana."' : 'Os homens dele resistem. Na confusão, Cedric escapa pela janela da capela. Agora ele é um fugitivo com um exército de canções.') },
          { label: 'Duelo, você e eu, agora', sub: 'Resolver como irmãos', color: 'roxo', icon: 'espadas', effects: { run: (s) => { const win = hasSkill(s, 'coracaoleao') || s.flags.treinoRhoswen || s.spouse === 'rhoswen' || s.res.moral >= 70; s.flags.cedricResolvido = win ? 'duelo' : 'humilhado'; if (win) s.res.prestigio += 15; else s.res.prestigio -= 12; }, xp: 30 }, reply: (s) => (s.flags.cedricResolvido === 'duelo' ? 'O duelo dura um minuto. Você vence. Cedric, no chão, ri: "Você luta feio, igual a ele." Ele parte para Lys e nunca mais volta ao castelo. Às vezes, manda cartas.' : 'Cedric o desarma e devolve a espada, com uma reverência. "Um rei não precisa vencer duelos. Só precisa não perder o reino." Ele vai embora. O salão viu tudo.') },
        ],
      },
    },
    ignored: { text: 'O rei ignorou Cedric. Cedric não gostou de ser ignorado.', res: { prestigio: -6, povo: -4 }, flags: { cedricResolvido: 'ignorado' } },
  },
  {
    id: 'cedric_fuga', speaker: 'aurelian', topic: 'A torre está vazia', kind: 'urgente', cond: (s) => !!s.flags.cedricPreso && !s.flags.cedricResolvido,
    nodes: {
      start: {
        text: '"Majestade... Cedric fugiu da torre." Aurelian está vermelho de vergonha. "Os guardas dizem que ele cantou para eles a noite inteira. Canções do seu pai. Quando acordaram, a porta estava aberta e dois deles tinham ido junto."',
        choices: [
          { label: 'Caçá-lo com a guarda', sub: 'Custa moral', color: 'vermelho', icon: 'espadas', effects: { res: { moral: -4 }, flags: { cedricResolvido: 'cacado' }, rel: { aurelian: 2 }, xp: 12 }, reply: 'Três dias de caçada. Ele some na fronteira de Véridian. Um problema adiado é, às vezes, um problema resolvido.' },
          { label: 'Deixá-lo ir', sub: 'Menos um problema aqui', color: 'azul', icon: 'olho', effects: { flags: { cedricResolvido: 'fugiu' }, res: { povo: 2 }, xp: 8 }, reply: 'Você deixa. Na taverna, a canção ganha um verso novo: "e o leão fugiu cantando".' },
        ],
      },
    },
  },
  // ======================= SIGRID: A FUGA DO NORTE =======================
  {
    id: 'sigrid_fuga', speaker: 'sigrid', topic: 'Uma princesa na neve', kind: 'urgente', day: 10, cond: (s) => !!s.flags.recusouNorhelm && !s.flags.met_sigrid && !s.flags.noiva && !s.spouse,
    nodes: {
      start: {
        text: 'Os guardas trazem uma moça de cabelos brancos, com o manto rasgado e uma faca na bota. "Sou Sigrid, filha do rei de Norhelm. Meu irmão Ragnar me prometeu a um jarl de sessenta anos porque o senhor recusou nossa aliança. Então eu fugi. Andei cinco dias." Ela não pede asilo. Ela exige.',
        advice: {
          isabelle: { text: 'Isabelle, baixo: "Uma princesa do norte fugida é uma espada que corta para os dois lados, filho. Pode trazer guerra. Ou impedir uma."', choice: { label: 'Esconder a fuga de Norhelm', sub: 'Conselho da mãe', color: 'roxo', icon: 'mascara', effects: { flags: { met_sigrid: true, sigridEscondida: true }, rel: { sigrid: 8, isabelle: 4 }, schedule: [{ id: 'cortejo_sigrid', in: 3 }], xp: 14 }, reply: 'Sigrid passa a ser "Lady Sif, prima distante". Ninguém acredita, mas ninguém sabe o suficiente para desmentir.' } },
        },
        choices: [
          { label: 'Dar asilo e honras', sub: 'Proteção real', color: 'azul', icon: 'escudo', effects: { flags: { met_sigrid: true }, rel: { sigrid: 15 }, loyalty: { drakon: -4 }, schedule: [{ id: 'cortejo_sigrid', in: 4 }], xp: 14 }, reply: '"Obrigada, rei do sul." Ela não se curva. Mas, pela primeira vez em nove dias, dorme.' },
          { label: 'Por que eu deveria confiar em você?', sub: 'Desconfiança', color: 'dourado', icon: 'olho', effects: { flags: { met_sigrid: true, infoNorhelm: true }, rel: { sigrid: 4 }, schedule: [{ id: 'cortejo_sigrid', in: 5 }], xp: 12 }, reply: '"Não deve. Mas eu sei onde Ragnar guarda os grãos, quantos homens ele tem e quais jarls o odeiam. Isso compra confiança?" Compra.' },
          { label: 'Devolvê-la a Norhelm', sub: 'Frieza política', color: 'vermelho', icon: 'coroa', effects: { flags: { met_sigrid: true, sigridDevolvida: true }, rel: { sigrid: -40 }, res: { prestigio: -4 }, loyalty: { drakon: 5 }, xp: 8 }, reply: 'Ela não grita. Só diz: "Lembrarei do seu rosto, rei do sul." Os guardas nortistas a levam. Norhelm não agradece.' },
        ],
      },
    },
  },
  // ======================= FAMÍLIA =======================
  {
    id: 'lucas_taverna', speaker: 'lucas', topic: 'Lucas apaixonado', kind: 'familia', cond: (s) => !!s.flags.lucasTaverna,
    nodes: {
      start: {
        text: 'Lucas entra no salão radiante e com um olho roxo. "Irmão! Duas notícias. Uma: estou apaixonado pela Anelise, a cantora do Javali Cego. Duas: o noivo dela me deu um soco. Três: eu devolvi. Quatro: ele é filho do mestre da Guilda. São quatro notícias, eu contei errado."',
        choices: [
          { label: 'Um príncipe e uma cantora? Que lindo', sub: 'Apoiar o irmão', color: 'verde', icon: 'coracao', effects: { rel: { lucas: 15, isabelle: -6, tobias: -8 }, res: { povo: 4 }, flags: { lucasAnelise: true }, xp: 12 }, reply: 'O povo adora a história. A Guilda, nem tanto. Isabelle manda perguntar se a moça pelo menos sabe ler. Sabe. E canta melhor que qualquer dama.' },
          { label: 'Pagar o noivo para desistir', sub: '−60 ouro', color: 'dourado', icon: 'moedas', req: { ouro: 60 }, effects: { res: { ouro: -60 }, rel: { lucas: 8, tobias: 4 }, flags: { lucasAnelise: true }, xp: 10 }, reply: 'O noivo desiste por sessenta moedas e um barril. Anelise fica ofendida de ter sido tão barata. Lucas tem trabalho pela frente.' },
          { label: 'Acabou a taverna, Lucas', sub: 'Ordem real', color: 'vermelho', icon: 'coroa', effects: { rel: { lucas: -15, isabelle: 5 }, flags: { lucasTaverna: false }, xp: 6 }, reply: '"Você está virando a mãe", Lucas diz. Não é elogio. Naquela noite, a janela da biblioteca tem uma nova corda de lençóis.' },
        ],
      },
    },
  },
  {
    id: 'brandt_isabelle', speaker: 'brandt', topic: 'Um urso pede a mão', kind: 'audiencia', minDay: 20, weight: 6, cond: (s) => !!s.flags.isabelleBrandt && !s.flags.brandtPediu,
    nodes: {
      start: {
        text: 'Lorde Brandt Drakon entra de roupa nova, barba aparada e cheirando a lavanda, o que é assustador. "Majestade. Eu... vim... quer dizer..." Ele desiste do discurso. "Quero casar com sua mãe. Pronto. Falei. Se quiser me enforcar, prefiro que seja rápido."',
        choices: [
          { label: 'Você tem minha bênção, pai', sub: 'Brincar', color: 'dourado', icon: 'balao', effects: { flags: { brandtPediu: true, casamentoIsabelle: true }, rel: { brandt: 20, isabelle: 15 }, loyalty: { drakon: 20 }, res: { ouro: -100 }, xp: 20 }, reply: 'Brandt quase desmaia com a palavra "pai". O casamento é pequeno, com trezentos Drakon bêbados. Isabelle ri a noite inteira.' },
          { label: 'Só depois da guerra', sub: 'Adiar', color: 'azul', icon: 'ampulheta', effects: { flags: { brandtPediu: true }, rel: { brandt: 4, isabelle: -4 }, loyalty: { drakon: 4 }, xp: 10 }, reply: '"Depois da guerra." Brandt concorda. Isabelle, não. Ela diz que já esperou uma guerra inteira pelo seu pai.' },
          { label: 'Minha mãe não é moeda de aliança', sub: 'Recusar', color: 'vermelho', icon: 'coroa', effects: { flags: { brandtPediu: true }, rel: { brandt: -12, isabelle: -15 }, loyalty: { drakon: -10 }, xp: 8 }, reply: '"Ninguém disse que era aliança", Brandt diz, baixo. "Eu disse que era amor." Ele sai. Sua mãe não fala com você até o fim da semana.' },
        ],
      },
    },
  },
  // ======================= DÍVIDAS E ESCÂNDALOS =======================
  {
    id: 'guilda_cobra_favor', speaker: 'tobias', topic: 'A Guilda cobra o favor', kind: 'audiencia', lasts: 2,
    nodes: {
      start: {
        text: 'Mestre Tobias abre um papel com o seu selo. "Majestade, o favor. A Guilda gostaria de... pouca coisa. O monopólio da venda de vinho na capital por um ano. Ou quatrocentas moedas. Ou o senhor proíbe Kasim de Véridian de vender no mercado. Somos flexíveis. Como uma corda."',
        choices: [
          { label: 'Dar o monopólio do vinho', sub: 'O povo paga mais caro', color: 'dourado', icon: 'uva', effects: { res: { povo: -6 }, rel: { tobias: 12 }, law: 'Monopólio do vinho para a Guilda', xp: 10 }, reply: 'O preço do vinho dobra na capital. As tavernas xingam a Guilda. E o rei. Principalmente o rei.' },
          { label: 'Expulsar Kasim do mercado', sub: 'Perde o comércio do sul', color: 'vermelho', icon: 'escudo', effects: { rel: { tobias: 10, kasim: -20, isolde: -5 }, res: { ouro: -20 }, xp: 10 }, reply: 'Kasim vai embora xingando em três línguas. O papagaio dele, em quatro.' },
          { label: 'Exige Contabilidade Real: contestar os juros', sub: 'Ler o contrato', color: 'verde', icon: 'livro', req: { knowledge: 'contabilidade' }, effects: { res: { ouro: -100 }, rel: { tobias: -2 }, xp: 18 }, reply: 'A cláusula 7 é ilegal pela lei de mercado de 1290. Você paga só cem moedas. Tobias aplaude devagar: "Um rei que lê contratos. Que tempos terríveis."' },
          { label: 'Rasgar o papel', sub: 'Calote real', color: 'roxo', icon: 'mascara', effects: { rel: { tobias: -25 }, res: { prestigio: -3 }, flags: { caloteGuilda: true }, xp: 8 }, reply: 'Tobias recolhe os pedaços com dignidade. "A Guilda nunca esquece, Majestade. Temos livros para isso."' },
        ],
      },
    },
    ignored: { text: 'A Guilda cobrou o favor sozinha: juros.', res: { ouro: -250 } },
  },
  {
    id: 'escandalo_cozinha', speaker: 'dama', topic: 'O escândalo da cozinha', kind: 'urgente', cond: (s) => !!s.spouse && !!s.flags.casoBianca,
    nodes: {
      start: {
        text: (s) => `Lady Maren entra quase correndo, e com um prazer mal disfarçado. "Majestade, péssima notícia. ${sp(s)} encontrou uma carta sua para Bianca. Aquela com o poema. Sobre as 'tortas'. Ela leu em voz alta. No jantar. Para os lordes."`,
        choices: [
          { label: 'Ir até a rainha agora', sub: 'Encarar', color: 'azul', icon: 'coracao', effects: { flags: { casoBianca: false, bianca: false }, run: (s) => { if (s.spouse) s.rel[s.spouse] = (s.rel[s.spouse] ?? 0) - 12; }, res: { prestigio: -4 }, xp: 14 }, reply: (s) => `${sp(s)} está calma, o que é muito pior. "Você escreve mal, sabia? 'Tortas' rima com 'portas'. Você rimou com 'tortas' de novo." Bianca é mandada embora. Você passa uma semana dormindo na biblioteca.` },
          { label: 'Dizer que era sobre tortas de verdade', sub: 'Negar até o fim', color: 'dourado', icon: 'mascara', req: { attr: ['intriga', 2] }, effects: { run: (s) => { if (s.spouse) s.rel[s.spouse] = (s.rel[s.spouse] ?? 0) - 4; }, res: { prestigio: -2 }, xp: 12 }, reply: 'Você defende com seriedade a sua paixão por confeitaria. Manda servir tortas em todos os jantares por um mês. A corte engorda. A rainha finge acreditar, e isso é uma vitória, ou uma armadilha.' },
          { label: 'Exige Poesia Cortesã: foi um exercício literário', sub: 'Versos para salvar', color: 'verde', icon: 'livro', req: { knowledge: 'poesia' }, effects: { run: (s) => { if (s.spouse) s.rel[s.spouse] = (s.rel[s.spouse] ?? 0) + 2; }, res: { prestigio: 2 }, xp: 18 }, reply: 'Você recita um soneto de catorze versos ali mesmo, dedicado à rainha, e explica que o outro era "um rascunho alegórico". Lorde Florian chora de inveja. A rainha, derrotada pela cara de pau, ri.' },
        ],
      },
    },
    ignored: { text: 'O rei não apareceu no jantar. O escândalo cresceu sozinho.', res: { prestigio: -8 }, run: (s) => { if (s.spouse) { s.rel[s.spouse] = (s.rel[s.spouse] ?? 0) - 15; const h = SPOUSE_HOUSE[s.spouse]; if (h) s.loyalty[h] -= 10; } } },
  },
  {
    id: 'osric_julgamento', speaker: 'morgana', topic: 'A viúva acusa um cavaleiro', kind: 'audiencia', minDay: 11, weight: 6, cond: (s) => !!s.flags.cartasOsric && !s.flags.osricJulgado,
    nodes: {
      start: {
        text: 'Lady Morgana entra seguida por Sir Osric Âncora, o cavaleiro mais vaidoso dos Valmont, que ajeita o cabelo no reflexo do escudo. "Majestade", diz Morgana, "trago as cartas. Este homem vendeu o flanco no Rio Frio. Meu marido morreu por causa de dezessete moedas." Osric ri: "Dezoito. E eram falsas."',
        choices: [
          { label: 'Então você confessa?', sub: 'Pegá-lo na palavra', color: 'roxo', icon: 'olho', goto: 'confessa' },
          { label: 'Julgamento formal pela lei', sub: 'Justiça', color: 'azul', icon: 'martelo', req: { attr: ['justica', 2] }, effects: { flags: { osricJulgado: true }, rel: { morgana: 12, gaspard: -6 }, loyalty: { drakon: 6, valmont: -6 }, res: { prestigio: 6 }, xp: 20 }, reply: 'As cartas são lidas em público. Osric perde a espada, as esporas e a vaidade. Morgana, pela primeira vez em anos, tira o véu negro.' },
          { label: 'Isso foi no reinado do meu pai', sub: 'Não é problema meu', color: 'vermelho', icon: 'coroa', effects: { flags: { osricJulgado: true }, rel: { morgana: -15 }, loyalty: { drakon: -5, valmont: 3 }, xp: 6 }, reply: 'Morgana guarda as cartas. "O senhor tem razão. Não é problema seu. Ainda." Ela sai. Osric pisca para você. Você se sente sujo.' },
        ],
      },
      confessa: {
        text: 'Osric percebe o erro e fica pálido por baixo do pó de arroz. "Eu... quis dizer... hipoteticamente dezoito." Lady Morgana sorri pela primeira vez. É um sorriso horrível.',
        choices: [
          { label: 'Rebaixá-lo a escudeiro', sub: 'Humilhação', color: 'dourado', icon: 'balao', effects: { flags: { osricJulgado: true }, rel: { morgana: 10, gaspard: -4 }, loyalty: { drakon: 5, valmont: -3 }, res: { povo: 3 }, xp: 16 }, reply: 'Sir Osric agora é Osric, escudeiro, e carrega o escudo de Sir Bram, que não fala nada há três anos. É a punição mais silenciosa do reino.' },
          { label: 'Duelo com a viúva', sub: 'Ela pediu', color: 'vermelho', icon: 'espadas', effects: { flags: { osricJulgado: true }, rel: { morgana: 15 }, loyalty: { drakon: 6, valmont: -8 }, res: { moral: 5 }, xp: 16 }, reply: 'Morgana luta de vestido preto e vence em quatro golpes. Não o mata. Corta o cabelo dele. Osric preferia a morte.' },
        ],
      },
    },
  },
  // ======================= ATO II (dias 25 a 45) =======================
  {
    id: 'ato2_conselho', speaker: 'aldric', topic: 'O segundo mês', kind: 'conselho', day: 31,
    nodes: {
      start: {
        text: (s) => `"Majestade, trinta dias." Aldric fecha o livro. "Nenhum rei sobreviveu tão pouco e errou tanto quanto o senhor... brincadeira. Seu avô errou mais. Mas agora vem o inverno. ${s.flags.invernoPrevisto ? 'Graças às suas estrelas, os celeiros estão cheios.' : 'E os celeiros não estão cheios.'} As casas querem saber que tipo de rei o senhor vai ser no segundo mês."`,
        choices: [
          { label: 'Um rei que constrói', sub: 'Obras e comércio', color: 'dourado', icon: 'martelo', effects: { res: { ouro: -60, povo: 6, prestigio: 3 }, flags: { ato2: 'construtor' }, xp: 15 }, reply: 'Você anuncia uma ponte, um mercado e um aqueduto. Corvin desmaia ao ouvir o orçamento. O povo aplaude.' },
          { label: 'Um rei que protege', sub: 'Exército e muralhas', color: 'vermelho', icon: 'escudo', effects: { res: { exercito: 80, moral: 6, ouro: -50 }, flags: { ato2: 'guardiao' }, loyalty: { drakon: 5 }, xp: 15 }, reply: 'Novos recrutas, novas muralhas. Os Drakon aprovam. Os outros perguntam contra quem.' },
          { label: 'Um rei que escuta', sub: 'Povo e casas', color: 'azul', icon: 'povo', effects: { res: { povo: 5, influencia: 6 }, loyalty: { valmont: 3, drakon: 3, seren: 3, montclair: 3 }, flags: { ato2: 'ouvinte' }, xp: 15 }, reply: 'Você manda abrir o salão dois dias por semana só para ouvir queixas. A fila dá a volta no castelo. Pimenta vende lugares na fila.' },
        ],
      },
    },
  },
  {
    id: 'inverno_chega', speaker: 'marta', topic: 'A primeira neve', kind: 'urgente', day: 33,
    nodes: {
      start: {
        text: (s) => (s.flags.invernoPrevisto ? 'Marta chega coberta de neve, mas sorrindo. "Majestade, nevou três semanas antes do normal. Mas os celeiros estavam cheios, graças ao senhor. Pela primeira vez em anos, ninguém na cidade baixa vai passar fome no inverno."' : 'Marta chega coberta de neve. "Majestade, nevou três semanas antes do normal. Os celeiros não estão cheios. Na cidade baixa já estão queimando móveis para aquecer as crianças."'),
        choices: [
          { label: 'Abrir os celeiros reais', sub: '−100 ouro, povo agradece', color: 'verde', icon: 'trigo', effects: { res: { ouro: -100, povo: 10 }, rel: { marta: 10 }, xp: 14 }, reply: 'Pão e lenha para todos. Na cidade baixa, uma criança desenha o rei com uma coroa de pão. Bruna, a ferreira, pendura o desenho na forja.' },
          { label: 'Pedir aos lordes que dividam', sub: 'Custa lealdade', color: 'azul', icon: 'aperto', effects: { res: { povo: 6 }, loyalty: { valmont: -4, seren: -3, montclair: -4, drakon: -2 }, xp: 12 }, reply: 'Os lordes dividem, resmungando. Aveline Seren manda lenha e um sermão. Otho manda ferro, que não esquenta ninguém.' },
          { label: 'O povo que se vire', sub: 'Economizar', color: 'vermelho', icon: 'moedas', effects: { res: { povo: -12, prestigio: -3 }, rel: { marta: -12 }, xp: 5 }, reply: 'O inverno é longo. Os mortos são contados em silêncio. Os vivos contam outra coisa: quem não ajudou.' },
          { label: 'Exige Ervas e Curas: montar enfermarias', sub: 'Salvar os doentes', color: 'roxo', icon: 'livro', req: { knowledge: 'medicina' }, effects: { res: { ouro: -40, povo: 12 }, rel: { irma: 12, marta: 8 }, xp: 20 }, reply: 'Irmã Hedda comanda três enfermarias com as receitas do livro. As febres do inverno matam metade do normal. O povo passa a chamá-lo de "Rei Curandeiro".' },
        ],
      },
    },
  },
  {
    id: 'cometa', speaker: 'frei_aske', topic: 'Uma estrela com cauda', kind: 'audiencia', day: 28,
    nodes: {
      start: {
        text: 'Frei Aske entra correndo, o que ele nunca faz. "Majestade! Um COMETA! Uma estrela com cauda de fogo sobre o castelo! O povo está de joelhos na praça. Metade acha que é o fim do mundo, a outra metade acha que é um sinal de que o senhor é o escolhido. Eu, sinceramente, acho que é uma pedra."',
        choices: [
          { label: 'Anunciar que é um sinal divino', sub: 'Usar o medo', color: 'dourado', icon: 'estrela', effects: { res: { prestigio: 8, povo: 4 }, rel: { frei_aske: -3, aveline: 6 }, xp: 12 }, reply: 'O povo aplaude. Os Seren acendem fogueiras sagradas. Frei Aske resmunga que nunca mais vai contar nada a um rei.' },
          { label: 'Exige Mapas das Estrelas: explicar a verdade', sub: 'Ciência', color: 'verde', icon: 'livro', req: { knowledge: 'astronomia' }, effects: { res: { povo: 3, influencia: 6 }, rel: { theodric: 12, frei_aske: 6 }, xp: 20 }, reply: 'Você explica que cometas voltam a cada tantos anos e que este já passou no reinado do seu tataravô. O povo se acalma. Theodric escreve seu nome no livro dos reis sábios, a lápis.' },
          { label: 'Declarar feriado', sub: 'Festa!', color: 'azul', icon: 'balao', effects: { res: { povo: 6, ouro: -40 }, rel: { pimenta: 6 }, xp: 10 }, reply: 'Três dias de festa sob o cometa. Pimenta vende "pedaços do cometa" (carvão) por uma moeda cada. Fica rico.' },
        ],
      },
    },
  },
  {
    id: 'ragnar_ultimato', speaker: 'ragnar', topic: 'O herdeiro do norte', kind: 'urgente', day: 36, cond: (s) => !s.flags.pazNorhelm && noWar(s),
    nodes: {
      start: {
        text: (s) => `Príncipe Ragnar de Norhelm entra coberto de neve e peles, cheirando a cavalo e a raiva. "Rei-menino. Meu pai está doente. Logo o norte é meu. ${s.flags.met_sigrid && s.spouse !== 'sigrid' ? 'E minha irmã está na sua corte, o que eu não perdoo. ' : ''}Vou te dar uma chance: o Vale Rubro e mil sacas de grão. Ou eu desço o passo antes do degelo."`,
        choices: [
          { label: 'Mil sacas, sem o vale', sub: '−200 ouro, paz provisória', color: 'dourado', icon: 'trigo', req: { ouro: 200 }, effects: { res: { ouro: -200, prestigio: -4 }, loyalty: { drakon: -4 }, flags: { pazNorhelm: true }, xp: 15 }, reply: '"Grão sem terra." Ragnar pensa. "Por ora, basta. Meus homens comem, e homens que comem não marcham." Uma paz comprada. Até o próximo inverno.' },
          { label: 'Nem uma saca', sub: 'Guerra', color: 'vermelho', icon: 'espadas', effects: { res: { prestigio: 5, moral: 6 }, loyalty: { drakon: 8 }, run: (s) => startWar(s, 'norhelm'), xp: 20 }, reply: 'Ragnar sorri, como quem esperava por isso. "Até a primavera, então. Ou até antes." Três dias depois, tochas no Passo Cinzento. A guerra começou.' },
          { label: 'Usar o que Sigrid contou', sub: 'Os jarls o odeiam', color: 'roxo', icon: 'mascara', req: { test: (s) => !!s.flags.infoNorhelm, label: 'Informações de Norhelm' }, effects: { res: { prestigio: 8, influencia: 6 }, flags: { pazNorhelm: true }, rel: { ragnar: -10 }, xp: 25 }, reply: 'Você cita os nomes de três jarls que conspiram contra ele. Ragnar fica branco. "Quem te contou?" Ele parte sem ultimato. Tem uma guerra em casa agora.' },
        ],
      },
    },
    ignored: { text: 'Ragnar não foi recebido. Ele considerou isso uma declaração de guerra.', res: { prestigio: -5 }, run: (s) => { if (!s.war || s.war.result) startWar(s, 'norhelm'); } },
  },
  {
    id: 'herdeiro', speaker: 'isabelle', topic: 'Uma notícia no café da manhã', kind: 'familia', minDay: 27, weight: 8, cond: (s) => !!s.spouse && (s.rel[s.spouse] ?? 0) >= 20 && !s.flags.herdeiro,
    nodes: {
      start: {
        text: (s) => `Isabelle chega antes de todo mundo, com um brilho estranho no olhar. "Filho, sente-se. ${sp(s)} está grávida. Não, ela não te contou ainda. Sim, eu soube primeiro. As sogras sempre sabem primeiro." Ela aperta sua mão. "Você vai ser pai. Que Deus ajude a criança."`,
        choices: [
          { label: 'Correr até a rainha', sub: 'Alegria', color: 'verde', icon: 'coracao', effects: { flags: { herdeiro: true }, run: (s) => { if (s.spouse) s.rel[s.spouse] = (s.rel[s.spouse] ?? 0) + 15; }, rel: { isabelle: 8 }, res: { prestigio: 8, povo: 6 }, xp: 20 }, reply: (s) => `${sp(s)} está furiosa porque a sogra contou primeiro. E feliz. E furiosa. Os sinos tocam o dia inteiro. O reino terá um herdeiro.` },
          { label: 'Anunciar ao reino agora', sub: 'Política', color: 'dourado', icon: 'coroa', effects: { flags: { herdeiro: true }, res: { prestigio: 12, povo: 8 }, loyalty: { valmont: 3, drakon: 3, seren: 3, montclair: 3 }, run: (s) => { if (s.spouse) s.rel[s.spouse] = (s.rel[s.spouse] ?? 0) - 4; }, xp: 18 }, reply: (s) => `O reino comemora. ${sp(s)} descobre pelo pregoeiro na praça. Ela não acha graça nenhuma.` },
          { label: 'E se for menina?', sub: 'A pergunta errada', color: 'roxo', icon: 'balao', effects: { flags: { herdeiro: true }, rel: { isabelle: -6 }, xp: 10 }, reply: '"Se for menina, vai governar melhor que você e seu pai juntos", responde Isabelle. "Como eu teria governado, se alguém tivesse perguntado."' },
        ],
      },
    },
  },
  {
    id: 'aniversario', speaker: 'pimenta', topic: 'O aniversário do rei', kind: 'audiencia', day: 38,
    nodes: {
      start: {
        text: 'Pimenta entra dando cambalhotas. "MAJESTADE! Hoje o senhor faz dezessete anos! A corte preparou uma surpresa! Mentira, ninguém lembrou. Só eu. E a sua mãe. E a Bianca fez um bolo, mas o Sálvio jogou no fosso por inveja." Ele cai sentado. "Quer uma festa?"',
        choices: [
          { label: 'Uma festa para o reino todo', sub: '−120 ouro', color: 'dourado', icon: 'moedas', req: { ouro: 120 }, effects: { res: { ouro: -120, povo: 10, prestigio: 6, moral: 5 }, loyalty: { valmont: 3, drakon: 3, seren: 3, montclair: 3 }, xp: 15 }, reply: 'Fogueiras, vinho, torneio, e um urso dançarino que foge e é encontrado dormindo na capela. A melhor festa em vinte anos.' },
          { label: 'Um jantar só com a família', sub: 'Intimidade', color: 'verde', icon: 'coracao', effects: { rel: { isabelle: 10, lucas: 10, pimenta: 6 }, run: (s) => { if (s.spouse) s.rel[s.spouse] = (s.rel[s.spouse] ?? 0) + 8; }, xp: 12 }, reply: 'Isabelle conta histórias de quando você era bebê. Todas humilhantes. Lucas anota. Pimenta faz um brinde ao "rei que ainda molhava a cama aos seis".' },
          { label: 'Reis não fazem aniversário', sub: 'Trabalhar', color: 'vermelho', icon: 'pergaminho', effects: { res: { influencia: 4 }, rel: { pimenta: -6, isabelle: -4 }, xp: 8 }, reply: 'Você passa o dia nos livros. À noite, encontra um bolo torto na sua cama, com uma vela e um bilhete: "de todo mundo que você esqueceu que gosta de você".' },
        ],
      },
    },
  },
  {
    id: 'embaixada_veridian', speaker: 'kasim', topic: 'Um navio de Véridian', kind: 'audiencia', minDay: 26, weight: 4,
    nodes: {
      start: {
        text: 'Kasim entra com um turbante novo e uma expressão de negócios. "Grande Rei! Véridian propõe um tratado: nossas especiarias e sedas pelo seu ferro e vinho, sem tarifas. Os mercadores da Guilda vão chorar. Mas o senhor vai rir. Todo o caminho até o banco."',
        choices: [
          { label: 'Assinar o tratado', sub: 'Comércio livre', color: 'dourado', icon: 'pergaminho', effects: { res: { ouro: 150 }, rel: { kasim: 12, tobias: -15, isolde: 8 }, loyalty: { valmont: -4 }, law: 'Tratado de livre comércio com Véridian', xp: 18 }, reply: 'Os navios de Véridian enchem o porto. Os preços caem. Tobias escreve uma carta de protesto de doze páginas. Você lê só a primeira.' },
          { label: 'Exige O Livro dos Mercadores: exigir cotas', sub: 'Negociar melhor', color: 'verde', icon: 'livro', req: { knowledge: 'mercado' }, effects: { res: { ouro: 220 }, rel: { kasim: 4, tobias: -5 }, xp: 20 }, reply: 'Você exige cotas e uma tarifa mínima sobre sedas. Kasim ri, xinga, e assina. "O senhor negocia como um veridiano. É o maior elogio que conheço."' },
          { label: 'Proteger a Guilda', sub: 'Recusar', color: 'azul', icon: 'escudo', effects: { rel: { tobias: 12, kasim: -8 }, xp: 10 }, reply: 'Kasim parte. Tobias manda um barril de vinho de agradecimento. Já sem tarifa, curiosamente.' },
        ],
      },
    },
  },
  {
    id: 'peste_cidade', speaker: 'irma', topic: 'Febre na cidade baixa', kind: 'urgente', minDay: 12, weight: 2, repeat: 30,
    nodes: {
      start: {
        text: 'Irmã Hedda chega com as mangas manchadas. "Majestade, febre na cidade baixa. Doze casas. Amanhã serão trinta. Preciso de ervas, de água limpa e de alguém que impeça os padres de mandar rezar em grupo, que é como a febre mais gosta de viajar."',
        choices: [
          { label: 'Isolar o bairro', sub: 'Duro mas eficaz', color: 'vermelho', icon: 'escudo', effects: { res: { povo: -5, ouro: -30 }, rel: { irma: 6, frei_aske: -4 }, xp: 12 }, reply: 'O bairro é cercado. As pessoas choram nos portões. Mas a febre não sai de lá.' },
          { label: 'Dar ouro para as ervas', sub: '−80 ouro', color: 'verde', icon: 'moedas', req: { ouro: 80 }, effects: { res: { ouro: -80, povo: 6 }, rel: { irma: 10 }, xp: 12 }, reply: 'Hedda trabalha três dias sem dormir. A febre recua. Ela dorme por um dia inteiro depois.' },
          { label: 'Exige Ervas e Curas: casca de salgueiro e água fervida', sub: 'Saber salva', color: 'roxo', icon: 'livro', req: { knowledge: 'medicina' }, effects: { res: { povo: 10, ouro: -20 }, rel: { irma: 15 }, xp: 20 }, reply: 'Hedda o olha espantada. "O senhor LEU o meu livro?" Com as ervas certas, a febre dura dois dias. Os padres chamam de milagre. Hedda chama de leitura.' },
          { label: 'Ordenar orações', sub: 'Fé', color: 'azul', icon: 'estrela', effects: { res: { povo: -8 }, rel: { frei_aske: 8, irma: -12 }, xp: 5 }, reply: 'Todos rezam juntos na praça. A febre agradece o convite. Trinta casas viram noventa.' },
        ],
      },
    },
    ignored: { text: 'Ninguém cuidou da febre na cidade baixa. Ela cuidou de si mesma.', res: { povo: -10, exercito: -30 } },
  },
];
