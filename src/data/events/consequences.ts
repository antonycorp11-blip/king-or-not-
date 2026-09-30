import type { GameEvent, GameState } from '../../types';
import { addClue } from '../../engine/conspiracy';

// CONSEQUÊNCIAS
// Decisões que prometiam alguma coisa ("quem erra uma vez tenta de novo", "um dia essa
// conta vai chegar") agora voltam de verdade, dias depois, num lugar e numa hora.
// Cada evento nasce de uma marca deixada por uma escolha anterior (cause) e só aparece
// depois de alguns dias.
const after = (flag: string, days: number, extra?: (s: GameState) => boolean) => (s: GameState) =>
  !!s.flags[flag] && (s.flagOrigins?.[flag]?.day ?? 0) + days <= s.day && (!extra || extra(s));

const C = (e: GameEvent): GameEvent => ({ followup: true, domain: 'pessoal', ...e });

export const CONSEQUENCE_EVENTS: GameEvent[] = [
  // ======================= O VINHO ENVENENADO =======================
  C({
    id: 'eco_veneno_frasco', speaker: 'aurelian', topic: 'O frasco na cozinha', kind: 'encontro', cause: 'envenenado', cond: after('envenenado', 2),
    place: { room: 'cozinha', hour: 11, spot: 'fogao', title: 'Aurelian encontrou algo na cozinha' },
    nodes: { start: {
      text: 'Aurelian espera junto ao fogão, com um frasquinho de vidro escuro na mão enluvada. "Estava atrás dos sacos de farinha, Majestade. Cheira a amêndoa amarga. O mesmo cheiro que a Irmã Hedda sentiu no quarto do seu pai." Os cozinheiros fingem trabalhar e ouvem tudo.',
      choices: [
        { label: 'Interrogar a cozinha inteira', sub: 'Medo · pista', color: 'vermelho', icon: 'espadas', say: 'Ninguém sai desta cozinha até eu saber quem entrou aqui na noite do vinho. Cada um de vocês vai me dizer onde estava. Um de cada vez, na minha frente.', effects: { clue: 'morte_pai', res: { povo: -1 }, rel: { cozinheiro: -4 }, mood: { anger: 8 }, xp: 14 }, reply: 'Uma ajudante, chorando, lembra de uma dama de capa cinza que "veio buscar uma receita". A capa tinha um broche de Cinzel.' },
        { label: 'Seguir o frasco em silêncio', sub: 'Paciência · pista', color: 'roxo', icon: 'olho', say: 'Devolva o frasco onde estava, Aurelian. Quem o escondeu vai voltar para buscá-lo. E quando voltar, um homem seu vai estar atrás dos sacos de farinha.', effects: { clue: 'morte_pai', flags: { armadilhaVeneno: true }, xp: 16 }, reply: 'Dois dias depois, o frasco some. O guarda escondido viu só as botas de quem o levou: couro das montanhas, costura de Cinzel.' },
      ],
    } },
    ignored: { text: 'Aurelian esperou na cozinha. À tarde, o frasco já não estava atrás da farinha.', rel: { aurelian: -4 } },
  }),
  // ======================= LYSANDRA NA MASMORRA =======================
  C({
    id: 'eco_lysandra_cela', speaker: 'lysandra', topic: 'A presa da cela dois', kind: 'encontro', cause: 'lysandraPresa', cond: after('lysandraPresa', 1),
    place: { room: 'masmorra', hour: 10, spot: 'preso', title: 'Lysandra pede para falar só com o rei' },
    nodes: { start: {
      text: 'Lady Lysandra Cinzel está sentada na palha como se fosse um trono. "Vossa Majestade veio. Ótimo. Se tivesse demorado mais um dia, teria encontrado um corpo. Alguém já tentou me dar pão com cheiro de amêndoa." Ela sorri, pálida. "Proteja-me e eu digo quem me mandou servir aquele vinho."',
      choices: [
        { label: 'Prometer proteção', sub: 'Troca · pista forte', color: 'azul', icon: 'escudo', say: 'Você terá um guarda meu na porta, dia e noite, e ninguém além dele traz a sua comida. Agora fale. Quem mandou o vinho?', effects: { clue: ['cartas_lysandra', 'cinco_cadeiras'], flags: { lysandraProtegida: true }, rel: { lysandra: 10 }, xp: 18 }, reply: '"Otho. Mas Otho não manda sozinho: ele obedece a uma mesa com cinco cadeiras." Ela abaixa a voz. "Conte quantas estão vazias quando o senhor entra no conselho."' },
        { label: 'Ameaçar com o carrasco', sub: 'Medo', color: 'vermelho', icon: 'espadas', say: 'Você tentou matar o rei. Não está em posição de negociar. Fale agora, ou amanhã quem fala por você é o carrasco.', effects: { clue: 'cartas_lysandra', bond: { lysandra: { medo: 20, ressentimento: 15 } }, mood: { anger: 6 }, xp: 10 }, reply: '"O carrasco não sabe ler, Majestade. Eu sei." Ela diz só um nome: Otho. O resto, ela guarda como quem guarda uma faca.' },
      ],
    } },
    ignored: { text: 'Pela manhã, os carcereiros encontraram Lady Lysandra morta na cela. Havia pão ao lado dela, e cheiro de amêndoa.', flags: { morto_lysandra: true }, run: (s) => { addClue(s, 'morte_pai'); }, mood: { stress: 12 } },
  }),
  // ======================= A CHANTAGEM DE CORVIN =======================
  C({
    id: 'eco_corvin_favor', speaker: 'corvin', topic: 'O preço do silêncio', kind: 'encontro', cause: 'corvinChantagem', cond: after('corvinChantagem', 3),
    place: { room: 'tesouro', hour: 11, spot: 'mesa', title: 'Corvin quer falar a sós no tesouro' },
    nodes: { start: {
      text: 'Corvin tranca a porta do tesouro por dentro, o que nunca faz. "Majestade, sei que o senhor sabe. Das velas. Do sobrinho de Gaspard." Ele sua. "Eu posso ser muito útil a um rei que sabe guardar segredos. Muito útil."',
      choices: [
        { label: 'Cobrar o favor em ouro', sub: '+200 ouro por baixo dos panos', color: 'dourado', icon: 'moedas', say: 'Útil, Corvin? Então comece devolvendo o que desviou. Duzentas moedas, hoje, no cofre real. E o seu sobrinho de estimação no porto vai trabalhar para mim a partir de agora.', effects: { res: { ouro: 200 }, bond: { corvin: { medo: 15 } }, power: { corvin: -8 }, xp: 12 }, reply: 'Corvin conta as moedas com as mãos tremendo. Ele nunca mais vai conferir as contas sem pensar em você.' },
        { label: 'Transformá-lo em informante', sub: 'Pista sobre o Pacto', color: 'roxo', icon: 'mascara', say: 'Quero outra coisa. Quero saber quem ensinou um tesoureiro honesto a desviar pouco. Ninguém começa com velas por conta própria.', effects: { clue: 'emprestimo_valmont', run: (s) => { if (!s.conspiracy.turned.includes('corvin')) s.conspiracy.turned.push('corvin'); }, bond: { corvin: { medo: 8, lealdade: 6 } }, xp: 18 }, reply: '"Gaspard", ele sussurra. "Ele empresta à coroa com uma cláusula: se o rei for declarado incapaz, o porto é dele. Eu redigi a cláusula."' },
        { label: 'Perdoar, uma vez', sub: 'Lealdade', color: 'verde', icon: 'coracao', say: 'Guarde o sobrinho, as velas e o medo, Corvin. Esta foi a única vez. Na próxima, eu mesmo levo o livro-caixa ao conselho.', effects: { bond: { corvin: { lealdade: 14, confianca: 6 } }, rel: { corvin: 10 }, xp: 10 }, reply: 'Corvin fica tanto tempo parado que você acha que ele vai chorar. Ele não chora. Mas destranca a porta com cuidado, como quem sai de uma igreja.' },
      ],
    } },
  }),
  // ======================= A VIÚVA DE PRETO =======================
  C({
    id: 'eco_morgana_escandalo', speaker: 'isabelle', topic: 'O que a corte comenta', kind: 'familia', cause: 'casoMorgana', cond: after('casoMorgana', 2),
    nodes: { start: {
      text: (s) => `Isabelle entra sem ser anunciada. "Morgana. A viúva de preto. A corte inteira sabe, e agora ${s.spouse ? 'a rainha também' : 'as quatro pretendentes também'}." Ela cruza os braços. "Seu pai tinha amantes, meu filho. Mas tinha a decência de não deixar que elas agradecessem em público."`,
      choices: [
        { label: 'Assumir o erro', sub: 'Honestidade', color: 'verde', icon: 'coracao', say: 'A senhora tem razão, mãe. Foi um erro, e foi meu. Vou encerrar isso com dignidade e pedir desculpas a quem eu devo.', effects: { rel: { isabelle: 4, morgana: -8 }, run: (s) => { if (s.spouse) { s.rel[s.spouse] = (s.rel[s.spouse] ?? 0) - 6; } }, res: { prestigio: -1 }, xp: 8 }, reply: 'Isabelle suspira. "Ao menos você não mente para mim. Já é mais do que seu pai fazia."' },
        { label: 'Não é assunto da corte', sub: 'Orgulho', color: 'vermelho', icon: 'coroa', say: 'Com quem o rei se deita não é assunto da corte, mãe, nem seu. O assunto está encerrado.', effects: { rel: { isabelle: -8 }, res: { prestigio: -3 }, run: (s) => { if (s.spouse) { s.rel[s.spouse] = (s.rel[s.spouse] ?? 0) - 12; } }, xp: 5 }, reply: 'Ela sai. Nas próximas semanas, a corte encontra um novo esporte: contar quantas vezes o rei passa pela ala das viúvas.' },
      ],
    } },
  }),
  // ======================= CEDRIC DE LYS =======================
  C({
    id: 'eco_cedric_taverna', speaker: 'aurelian', topic: 'Brindes a Cedric', kind: 'urgente', cause: 'cedricInimigo', cond: after('cedricInimigo', 3, (s) => !s.flags.cedricResolvido),
    nodes: { start: {
      text: 'Aurelian não se senta. "Majestade, a taverna do Javali Cego virou quartel-general. Cedric paga bebida para qualquer soldado que brinde ao Leão de Lys. Três dos meus homens foram vistos lá. Depois do que a rainha-mãe disse no salão, ele já não precisa de desculpa."',
      choices: [
        { label: 'Fechar a taverna', sub: 'Força', color: 'vermelho', icon: 'espadas', say: 'Feche a taverna hoje. E os três homens que estavam lá: transferidos para a fronteira. Quem brinda a outro rei pode ir brindar ao frio.', effects: { res: { povo: -3, moral: 2 }, rel: { cedric: -10 }, xp: 10 }, reply: 'A taverna fecha. No dia seguinte, abrem duas, com o mesmo brinde e um nome diferente na porta.' },
        { label: 'Pagar a próxima rodada', sub: '−60 ouro · povo +3', color: 'dourado', icon: 'moedas', say: 'Não. Mande pagar a próxima rodada em nome do rei. Todas as rodadas desta noite. Que bebam o vinho da coroa e lembrem de quem é a coroa.', effects: { res: { ouro: -60, povo: 3, prestigio: 1 }, xp: 12 }, reply: 'Metade da taverna brinda ao rei, porque o rei pagou. Cedric aparece na porta, vê a cena e ri. É um riso de quem perdeu uma rodada, não o jogo.' },
      ],
    } },
  }),
  C({
    id: 'eco_cedric_lys', speaker: 'cedric', topic: 'O Senhor de Lys', kind: 'audiencia', cause: 'cedricTitulo', cond: after('cedricTitulo', 5),
    nodes: { start: {
      text: '"Senhor de Lys, como Vossa Majestade quis." Cedric faz uma reverência exata, nem um grau a mais. "O castelo chove dentro, como prometido. Peço duzentas moedas para o telhado, e o direito de cobrar pedágio na ponte. Um senhor sem renda é só um mendigo com título."',
      choices: [
        { label: 'Dar o telhado e a ponte', sub: '−200 ouro · Cedric leal', color: 'azul', icon: 'aperto', req: { ouro: 200 }, say: 'Tem o telhado e tem a ponte. Um senhor que o rei nomeia não pode dormir na chuva. Mas lembre: cada moeda do pedágio passa pelos livros de Corvin.', effects: { res: { ouro: -200 }, rel: { cedric: 14 }, bond: { cedric: { lealdade: 12 } }, flags: { cedricLeal: true }, xp: 12 }, reply: '"Vossa Majestade é mais generoso que nosso pai." Ele diz isso sem ironia, o que é mais perturbador do que se houvesse ironia.' },
        { label: 'Só o pedágio', sub: 'Meio-termo', color: 'dourado', icon: 'moedas', say: 'O pedágio, sim. O telhado, você conserta com o pedágio. É assim que se aprende a ser senhor.', effects: { rel: { cedric: 2 }, xp: 8 }, reply: '"Uma lição." Cedric sorri. "Anotada, irmão." É a primeira vez que ele usa a palavra.' },
      ],
    } },
  }),
  // ======================= O LADRÃO DO TRAVESSEIRO =======================
  C({
    id: 'eco_sombra_selo', speaker: 'clara', topic: 'O selo sumiu', kind: 'encontro', cause: 'sombraInimiga', cond: after('sombraInimiga', 4),
    place: { room: 'quarto', hour: 9, spot: 'escrivaninha', title: 'Clara achou algo errado no quarto' },
    nodes: { start: {
      text: 'Clara está pálida junto à escrivaninha. "Majestade, o selo pequeno, o de cera vermelha. Estava aqui ontem. Hoje só tem isto." Na gaveta, caroços de uva arrumados no formato de uma coroa quebrada.',
      choices: [
        { label: 'Trocar todos os selos hoje', sub: '−30 ouro · protege', color: 'azul', icon: 'selo', say: 'Mande o ourives fazer um selo novo hoje, Clara, com uma marca que só eu conheço. Tudo o que chegar com o selo antigo daqui em diante é falso.', effects: { res: { ouro: -30 }, clue: 'selo_copiado', flags: { seloTrocado: true }, xp: 14 }, reply: 'O ourives trabalha a noite toda. Três dias depois, uma carta com o selo antigo aparece no conselho, e Aldric a identifica como falsa na hora.' },
        { label: 'Deixar o ladrão achar que venceu', sub: 'Isca', color: 'roxo', icon: 'mascara', say: 'Não conte a ninguém, Clara. Nem à guarda. Quero ver onde esse selo vai aparecer. Quem roubou um selo vai querer usá-lo.', effects: { clue: 'selo_copiado', flags: { iscaSelo: true }, res: { influencia: 2 }, xp: 16 }, reply: 'Clara jura silêncio com as duas mãos no avental. Uma semana depois, uma ordem com o seu selo tenta trocar a guarda dos portões.' },
      ],
    } },
  }),
  // ======================= A MÃE E O ADMIRADOR =======================
  C({
    id: 'eco_isabelle_segredo', speaker: 'isabelle', topic: 'O admirador da rainha-mãe', kind: 'encontro', cause: 'pistaIsabelle', cond: after('pistaIsabelle', 2),
    place: { room: 'aposentos', hour: 15, spot: 'mae', title: 'Isabelle está sozinha em seus aposentos' },
    nodes: { start: {
      text: 'Isabelle borda perto da janela. Quando você entra, ela esconde uma carta embaixo do bastidor, rápido demais. "Meu filho. Achei que estaria no conselho a esta hora."',
      choices: [
        { label: 'Perguntar pela carta', sub: 'Direto', color: 'roxo', icon: 'olho', say: 'Mãe, que carta é essa embaixo do bordado? Dizem pelos corredores que a senhora tem um admirador. Prefiro ouvir da senhora do que do bobo.', effects: { clue: 'otho_norte', bond: { isabelle: { confianca: -2 } }, mood: { stress: 5 }, xp: 14 }, reply: 'Ela respira fundo e entrega. É de Otho, de anos atrás, pedindo que ela convencesse seu pai a "deixar as montanhas em paz". "Eu recusei. Guardei a carta porque ele assinou. Achei que um dia valeria alguma coisa."' },
        { label: 'Fingir que não viu', sub: 'Respeito', color: 'verde', icon: 'coracao', say: 'Vim só ver como a senhora estava. O conselho pode esperar meia hora. Continue o bordado; eu gosto de ver.', effects: { bond: { isabelle: { amor: 6, confianca: 4 } }, mood: { joy: 4 }, xp: 6 }, reply: 'Vocês ficam em silêncio por meia hora. Quando você sai, ela diz: "Um dia eu te conto. Não hoje."' },
      ],
    } },
  }),
  // ======================= ESPIÕES =======================
  C({
    id: 'eco_agente_duplo', speaker: 'aurelian', topic: 'O espião respondeu', kind: 'audiencia', cause: 'agenteDuplo', cond: after('agenteDuplo', 4),
    nodes: { start: {
      text: 'Aurelian traz um bilhete dobrado em oito. "O espião de Norhelm, o que viramos, mandou as mentiras que o senhor ditou. E voltou com uma resposta de Ragnar: quer saber quantos homens guardam o Passo Cinzento. Diga um número e eu faço chegar ao norte."',
      choices: [
        { label: 'Dizer que são poucos', sub: 'Atrair Ragnar para uma armadilha', color: 'vermelho', icon: 'espadas', say: 'Diga que são duzentos homens cansados e mal pagos. Se Ragnar vier, que venha confiante. E que encontre dois mil.', effects: { flags: { armadilhaPasso: true }, res: { moral: 3 }, xp: 14 }, reply: 'O bilhete parte ao amanhecer. Se o norte vier pelo passo, virá esperando uma porta aberta.' },
        { label: 'Dizer que são muitos', sub: 'Desencorajar a guerra', color: 'azul', icon: 'escudo', say: 'Diga que são três mil, com arqueiros nas encostas. Não quero guerra; quero que Ragnar ache que não pode ganhá-la.', effects: { flags: { passoTemido: true }, rel: { haakon: 3 }, xp: 12 }, reply: 'Semanas depois, um corvo conta que Ragnar gritou com os jarls por uma noite inteira. O passo continua quieto.' },
      ],
    } },
  }),
  C({
    id: 'eco_picoalto_cartas', speaker: 'sir_picoalto', topic: 'Cartas das montanhas', kind: 'audiencia', cause: 'espiaoMontclair', cond: after('espiaoMontclair', 4),
    nodes: { start: {
      text: 'Sir Aldo Picoalto chega coberto de pó de estrada. "Majestade, fiz o que pediu. Otho paga os mineiros em moedas de Cinzel e manda carroças vazias para o norte. Vazias na ida. Na volta, trazem homens que não falam a nossa língua."',
      choices: [
        { label: 'Pedir provas escritas', sub: 'Para o julgamento', color: 'azul', icon: 'pergaminho', say: 'Preciso de papel, Sir Aldo. Um recibo, uma carta, uma lista de carroças. Diante do conselho, a palavra de um cavaleiro não vence a de um lorde.', effects: { clue: ['moeda_cinzel', 'otho_norte'], flags: { provaOtho: true }, rel: { sir_picoalto: 6 }, xp: 16 }, reply: 'Duas semanas depois, chega um livro-razão roubado das minas. Na última página, uma data: o dia da febre do seu pai.' },
        { label: 'Mandá-lo voltar e vigiar', sub: 'Paciência', color: 'roxo', icon: 'olho', say: 'Volte e continue vigiando. Não faça nada. Quero saber para onde vão esses homens antes que Otho saiba que eu sei.', effects: { clue: 'emissarios_norte', rel: { sir_picoalto: 3 }, xp: 12 }, reply: 'Sir Aldo parte antes do anoitecer, pela estrada mais longa.' },
      ],
    } },
  }),
  C({
    id: 'eco_lucas_relatorio', speaker: 'lucas', topic: 'Relatório do espião mais jovem', kind: 'encontro', cause: 'lucasEspiao', cond: after('lucasEspiao', 3),
    place: { room: 'estabulos', hour: 14, spot: 'cavalos', title: 'Lucas tem um relatório (nos estábulos, onde ninguém ouve)' },
    nodes: { start: {
      text: 'Lucas o puxa para trás de um cavalo. "Não ri. Eu anotei tudo." Ele tira um caderno. "Um: Otho come de boca aberta. Dois: os guardas do portão novo não são do Aurelian, são de outra casa, e pagos em prata. Três: o Aldric vai aos arquivos toda noite. Sozinho."',
      choices: [
        { label: 'Levar o irmão a sério', sub: 'Pistas', color: 'verde', icon: 'aperto', say: 'Não vou rir, Lucas. O item dois pode salvar a minha vida. Continue anotando, e não conte a ninguém que é meu espião, nem à mãe.', effects: { clue: 'guarda_trocada', rel: { lucas: 8 }, bond: { lucas: { confianca: 6 } }, xp: 14 }, reply: 'Lucas fica tão orgulhoso que quase cai do fardo de feno. O caderno dele vai virar o melhor arquivo do castelo.' },
        { label: 'Encerrar a brincadeira', sub: 'É perigoso', color: 'azul', icon: 'escudo', say: 'Chega, Lucas. Isso ficou perigoso. Se alguém perceber que você anota essas coisas, você vira alvo. Me dê o caderno.', effects: { clue: 'guarda_trocada', rel: { lucas: -6 }, flags: { lucasEspiao: false }, xp: 8 }, reply: 'Ele entrega o caderno, emburrado. Na última página: "O rei não confia em ninguém. Nem em mim."' },
      ],
    } },
  }),
  // ======================= VALMONT, VÉRIDIAN E O PORTO =======================
  C({
    id: 'eco_porto_gaspard', speaker: 'gaspard', topic: 'O porto não está à venda', kind: 'audiencia', cause: 'portoVeridian', cond: after('portoVeridian', 3),
    nodes: { start: {
      text: '"Considerar o porto." Gaspard repete a frase como quem mastiga vidro. "Minha família paga as frotas deste reino há três gerações, e o rei considera entregar o nosso porto aos sulistas por um sorriso atrás de um leque. Diga-me que ouvi errado, Majestade."',
      choices: [
        { label: 'Era só diplomacia', sub: 'Acalmar Valmont', color: 'azul', icon: 'aperto', say: 'Ouviu certo, e entendeu errado. "Considerar" é a palavra que se usa para não dizer não a uma princesa. O porto é dos Valmont, e vai continuar sendo.', effects: { loyalty: { valmont: 5 }, rel: { gaspard: 6, isolde: -4 }, xp: 10 }, reply: 'Gaspard se acalma, devagar. Mas pede que isso seja escrito. E assinado. E selado.' },
        { label: 'O porto é da coroa', sub: 'Autoridade', color: 'vermelho', icon: 'coroa', say: 'O porto é da coroa, Lorde Gaspard. Os Valmont o administram porque a coroa permite. Se for bom para o reino, eu considero o que eu quiser.', effects: { loyalty: { valmont: -8 }, res: { prestigio: 3 }, rel: { gaspard: -10 }, xp: 10 }, reply: 'Gaspard faz uma reverência tão lenta que parece uma ameaça. Na semana seguinte, os juros dos empréstimos Valmont sobem.' },
      ],
    } },
  }),
  C({
    id: 'eco_frota_valmont', speaker: 'elenora', topic: 'A frota chega', kind: 'audiencia', cause: 'frotaValmont', cond: after('frotaValmont', 1, (s) => s.spouse === 'elenora'),
    nodes: { start: {
      text: 'Elenora entra com um rolo de pergaminho. "Meu pai cumpriu, com a cara que você imagina. Doze navios Valmont estão no porto real sob o estandarte da coroa. Ele pede só que o almirante continue sendo um Valmont." Ela sorri, cansada. "Ele sempre pede só mais uma coisa."',
      choices: [
        { label: 'Aceitar o almirante Valmont', sub: 'Frota pronta · Valmont +5', color: 'azul', icon: 'aperto', say: 'Que o almirante seja um Valmont. Os navios servem melhor sob quem os conhece. Agradeça ao seu pai por mim, e diga que o rei não esquece.', effects: { flags: { frotaReal: true }, loyalty: { valmont: 5 }, res: { prestigio: 4 }, xp: 12 }, reply: 'Os doze navios erguem o estandarte real no porto. Na cidade, as pessoas sobem nos telhados para ver.' },
        { label: 'Um almirante da coroa', sub: 'Frota pronta · Valmont −4', color: 'vermelho', icon: 'coroa', say: 'O almirante será da coroa. Navios do rei obedecem ao rei. Seu pai entende de contratos; vai entender isso também.', effects: { flags: { frotaReal: true }, loyalty: { valmont: -4 }, res: { prestigio: 6 }, rel: { elenora: -3 }, xp: 12 }, reply: 'Elenora escreve ao pai naquela noite. Pela primeira vez, você a vê rasgar uma carta antes de terminá-la.' },
      ],
    } },
  }),
  C({
    id: 'eco_dote_valmont', speaker: 'gaspard', topic: 'Mil moedas, contadas duas vezes', kind: 'audiencia', cause: 'doteValmont', cond: after('doteValmont', 1, (s) => s.spouse === 'elenora'),
    nodes: { start: {
      text: 'Quatro criados Valmont entram carregando um baú. Gaspard abre com um floreio. "O dote da minha filha, Majestade. Mil moedas." Corvin conta. Conta de novo. "Novecentas e oitenta", diz. Gaspard não pisca: "Vinte de taxa de transporte."',
      choices: [
        { label: 'Aceitar e sorrir', sub: '+980 ouro', color: 'dourado', icon: 'moedas', say: 'Novecentas e oitenta moedas e um sogro que cobra frete da própria filha. A coroa aceita, Lorde Gaspard. As vinte ficam como lembrança de quem o senhor é.', effects: { res: { ouro: 980 }, rel: { gaspard: 2 }, xp: 8 }, reply: 'Gaspard ri como se tivesse sido elogiado. Talvez tenha sido.' },
        { label: 'Exigir as vinte', sub: '+1000 ouro · orgulho Valmont ferido', color: 'vermelho', icon: 'coroa', say: 'Mil foi o acordado, e mil é o que a coroa recebe. Corvin, anote que Lorde Gaspard vai trazer as vinte que faltam antes do jantar.', effects: { res: { ouro: 1000, prestigio: 2 }, loyalty: { valmont: -2 }, rel: { gaspard: -4 }, xp: 10 }, reply: 'As vinte moedas chegam antes do jantar, uma por uma, cada uma trazida por um criado diferente.' },
      ],
    } },
  }),
  C({
    id: 'eco_promessa_exercito', speaker: 'gaspard', topic: 'A promessa do exército', kind: 'audiencia', cause: 'promessaReduzir', cond: after('promessaReduzir', 10, (s) => !s.war || !!s.war.result),
    nodes: { start: {
      text: (s) => `Gaspard volta com um papel na mão. "Majestade prometeu reduzir o exército depois. O depois chegou. São ${s.res.exercito} homens comendo às custas das casas, e nenhuma guerra à vista. As casas querem saber se a palavra do rei vale mais que a do meu banqueiro."`,
      choices: [
        { label: 'Cumprir: mandar metade para casa', sub: 'Exército −30% · casas +4', color: 'verde', icon: 'aperto', say: 'A palavra do rei vale. Um terço dos homens volta para casa até o fim da semana, com o soldo em dia. Que ninguém diga que a coroa promete e esquece.', effects: { run: (s) => { s.res.exercito = Math.round(s.res.exercito * 0.7); }, loyalty: { valmont: 4, seren: 3, montclair: 2 }, res: { prestigio: 3 }, flags: { promessaCumprida: true }, xp: 12 }, reply: 'Os soldados partem cantando. As casas escrevem cartas elogiosas. Aurelian fica em silêncio o jantar inteiro.' },
        { label: 'Adiar mais uma vez', sub: 'Palavra quebrada', color: 'vermelho', icon: 'escudo', say: 'O norte ainda não está seguro, Lorde Gaspard. O exército fica. A promessa continua de pé; só não chegou a hora.', effects: { loyalty: { valmont: -6, seren: -3 }, res: { prestigio: -3 }, rel: { gaspard: -8 }, xp: 6 }, reply: '"Não chegou a hora." Gaspard dobra o papel. "Vou anotar a data em que ela não chegou."' },
      ],
    } },
  }),
  // ======================= LUCAS NA FRENTE DE BATALHA =======================
  C({
    id: 'eco_lucas_frente', speaker: 'aurelian', topic: 'Notícias de Lucas', kind: 'urgente', cause: 'lucasNaFrente', cond: after('lucasNaFrente', 4),
    nodes: { start: {
      text: (s) => (s.seed % 3 === 0
        ? 'Aurelian tira o elmo antes de falar, e você já sabe que é ruim. "Lucas foi ferido numa escaramuça perto do passo. Uma flecha no ombro. Vai viver, mas perdeu muito sangue. Ele pede que ninguém conte à rainha-mãe. Já contaram."'
        : 'Aurelian quase sorri. "Seu irmão, Majestade. Segurou uma ponte com doze homens por uma tarde inteira até os reforços chegarem. Os soldados agora o chamam de Príncipe da Ponte. Ele pede para ficar na frente."'),
      choices: [
        { label: 'Trazê-lo para casa', sub: 'Proteger o herdeiro', color: 'azul', icon: 'escudo', say: 'Tragam Lucas de volta ao castelo. Com honras, se ele as mereceu, e com um médico, se precisar. Mas de volta. Ele é o herdeiro, não um capitão.', effects: { flags: { lucasNaFrente: false }, rel: { isabelle: 8, lucas: -4 }, res: { moral: -1 }, xp: 8 }, reply: 'Lucas volta numa carroça, reclamando o caminho inteiro. Isabelle o abraça tão forte que ele reclama mais.' },
        { label: 'Deixá-lo ficar', sub: 'Honra', color: 'vermelho', icon: 'espadas', say: 'Se ele quer ficar, que fique. Ele escolheu a frente, e os homens o seguem. Mandem a ele o meu escudo e a minha bênção.', effects: { res: { moral: 5, prestigio: 2 }, rel: { lucas: 10, isabelle: -10 }, bond: { isabelle: { ressentimento: 8 } }, xp: 10 }, reply: 'Os soldados gritam o nome de Lucas no pátio. Isabelle não sai dos aposentos por dois dias.' },
      ],
    } },
  }),
  // ======================= NORHELM E SIGRID =======================
  C({
    id: 'eco_sigrid_devolvida', speaker: 'mensageiro', topic: 'Um casamento no norte', kind: 'audiencia', cause: 'sigridDevolvida', cond: after('sigridDevolvida', 6),
    nodes: { start: {
      text: 'Um mensageiro do norte lê sem emoção: "Sigrid, filha do rei, foi dada em casamento ao jarl Hrolf de Vindgard. Ragnar agradece ao rei do sul pela devolução." Na última linha, com outra letra: "Lembrarei do seu rosto." Ninguém assina.',
      choices: [
        { label: 'Mandar um presente de casamento', sub: 'Remorso', color: 'verde', icon: 'coracao', say: 'Mande um presente ao norte em meu nome. Um manto de pele, o melhor do tesouro. E uma carta que diga só: "Sinto muito."', effects: { res: { ouro: -40 }, rel: { sigrid: 6, haakon: 2 }, mood: { joy: -6 }, xp: 8 }, reply: 'O manto parte com o mensageiro. Nenhuma resposta volta. Mas, no inverno seguinte, uma aldeia do norte recebe grão sem brasão, e ninguém sabe quem mandou.' },
        { label: 'Arquivar a carta', sub: 'Política é política', color: 'dourado', icon: 'pergaminho', say: 'Arquive a carta com os outros documentos do norte. A decisão foi tomada pelo bem do reino, e não vou fingir que não sabia o preço.', effects: { res: { influencia: 1 }, mood: { stress: 4 }, xp: 5 }, reply: 'A carta vai para os arquivos. Theodric a guarda numa pasta chamada "Decisões". Você nunca mais a abre. Nem precisa.' },
      ],
    } },
  }),
  C({
    id: 'eco_lady_sif', speaker: 'isabelle', topic: 'Lady Sif, prima distante', kind: 'familia', cause: 'sigridEscondida', cond: after('sigridEscondida', 7, (s) => s.spouse !== 'sigrid'),
    nodes: { start: {
      text: '"Meu filho", Isabelle começa, baixo. "Um emissário de Norhelm perguntou à criadagem por uma dama de cabelos brancos que fala com sotaque. Disse que Lady Sif é muito parecida com uma pessoa que ele procura. A criadagem mente bem. Mas não por muito tempo."',
      choices: [
        { label: 'Mandar Sigrid para os Bosques', sub: 'Escondê-la com os Seren', color: 'azul', icon: 'arvore', say: 'Leve Lady Sif para os Bosques Reais esta noite, com Aveline. Ninguém procura uma princesa do norte num mosteiro de carvalhos.', effects: { loyalty: { seren: 2 }, rel: { sigrid: 8, aveline: 4 }, xp: 10 }, reply: 'Sigrid parte de madrugada, encapuzada. Deixa um bilhete: "Você mentiu por mim. No norte, isso é um juramento."' },
        { label: 'Expulsar o emissário', sub: 'Confronto', color: 'vermelho', icon: 'espadas', say: 'Expulse o emissário do castelo. Quem vem ao meu salão fazer perguntas à minha criadagem pode fazê-las do lado de fora da muralha.', effects: { rel: { haakon: -8, sigrid: 4 }, res: { prestigio: 2 }, xp: 8 }, reply: 'O emissário sai rindo. Ele já tem a resposta que veio buscar.' },
      ],
    } },
  }),
  // ======================= OTHO =======================
  C({
    id: 'eco_otho_solto', speaker: 'sir_picoalto', topic: 'Otho aproveitou a liberdade', kind: 'urgente', cause: 'othoAdiado', cond: after('othoAdiado', 3),
    nodes: { start: {
      text: 'Um cavaleiro de Picoalto chega sem fôlego: "Majestade, desde que foi solto, Lorde Otho queimou dois livros-razão das minas e mandou três carroças para o norte à noite. Se o senhor quer provas, elas estão pegando fogo agora."',
      choices: [
        { label: 'Prender Otho de novo', sub: 'Montclair −10', color: 'vermelho', icon: 'cadeado', say: 'Mande vinte homens às minas agora. Otho volta para a torre, e desta vez não sai sem julgamento. Salvem o que ainda não queimou.', effects: { loyalty: { montclair: -10 }, clue: 'moeda_cinzel', flags: { othoDeposto: true }, xp: 14 }, reply: 'Os homens chegam a tempo de salvar metade de um livro. Na metade que sobrou, há nomes. Um deles é de alguém do conselho.' },
        { label: 'Deixar queimar e vigiar as carroças', sub: 'Seguir o dinheiro', color: 'roxo', icon: 'olho', say: 'Deixe os livros queimarem. Quero as carroças. Siga-as até onde forem, sem ser visto. Os papéis mentem; o destino de uma carroça, não.', effects: { clue: 'emissarios_norte', res: { influencia: 2 }, xp: 14 }, reply: 'As carroças param numa casa alugada perto dos portões da própria capital. Alguém do norte mora ali. Há semanas.' },
      ],
    } },
  }),
  C({
    id: 'eco_otho_cobranca', speaker: 'otho', topic: 'Otho pede um favor', kind: 'audiencia', cause: 'othoDevendo', cond: after('othoDevendo', 5, (s) => !s.flags.othoExilado && !s.flags.othoDeposto),
    nodes: { start: {
      text: '"Majestade", Otho começa, sorridente. "Um pequeno favor: as minas de prata precisam de isenção de impostos nesta estação. A neve, o senhor entende." Ele não menciona as tropas que se recusou a mandar. Você não esqueceu.',
      choices: [
        { label: 'Cobrar a dívida antiga', sub: 'Ele recusou tropas', color: 'vermelho', icon: 'pergaminho', say: 'Lembro de outra estação, Lorde Otho, em que a coroa pediu homens e Montclair mandou desculpas. Anotei naquele dia. A isenção vem quando os homens vierem.', effects: { res: { prestigio: 3, exercito: 150 }, loyalty: { montclair: -3 }, bond: { otho: { medo: 10 } }, xp: 12 }, reply: 'Otho engole o sorriso. Cento e cinquenta homens das montanhas chegam ao quartel na semana seguinte. Mal armados, mas chegam.' },
        { label: 'Conceder', sub: 'Montclair +5 · −ouro', color: 'dourado', icon: 'moedas', say: 'Concedo a isenção nesta estação. A coroa não guarda rancor, Lorde Otho. Mas guarda registros.', effects: { loyalty: { montclair: 5 }, res: { ouro: -60 }, xp: 6 }, reply: 'Otho sai satisfeito. Você fica com a sensação de ter pago uma conta que era dele.' },
      ],
    } },
  }),
  // ======================= BRANDT, GASPARD E O PODER =======================
  C({
    id: 'eco_marechal_norte', speaker: 'brandt', topic: 'O Marechal do Norte quer tropas', kind: 'audiencia', cause: 'brandtMarechal', cond: after('brandtMarechal', 5),
    nodes: { start: {
      text: '"Marechal do Norte." Brandt bate no próprio peito. "Título bonito, Majestade. Agora quero o que vem com ele: comando dos homens da fronteira. Os seus e os meus, sob uma bandeira só. A minha, de preferência."',
      choices: [
        { label: 'Dar o comando da fronteira', sub: 'Drakon +8 · poder de Brandt', color: 'vermelho', icon: 'espadas', say: 'O comando da fronteira é seu, Marechal. Sob a bandeira do rei, não a sua. Mas quem dá as ordens no passo é você.', effects: { loyalty: { drakon: 8 }, clue: 'oficiais_drakon', power: { aurelian: -6 }, rel: { brandt: 10, aurelian: -6 }, xp: 12 }, reply: 'Brandt ri tão alto que os cavalos do pátio relincham. Aurelian ouve tudo da porta e não diz nada.' },
        { label: 'O título é honorífico', sub: 'Drakon −6', color: 'azul', icon: 'coroa', say: 'O título é uma honra, Lorde Brandt, não um exército. Os homens do rei respondem ao rei e ao seu marechal. Os seus continuam seus.', effects: { loyalty: { drakon: -6 }, rel: { brandt: -8, aurelian: 4 }, xp: 10 }, reply: '"Honorífico." Brandt repete a palavra como quem cospe um osso. "Então vou honrar o título do Vale, bem longe daqui."' },
      ],
    } },
  }),
  C({
    id: 'eco_gaspard_cadeira', speaker: 'gaspard', topic: 'Uma cadeira no conselho', kind: 'audiencia', cause: 'gaspardConselho', cond: after('gaspardConselho', 4),
    nodes: { start: {
      text: 'Gaspard não traz presente desta vez, o que é o mais preocupante. "Majestade, pagamos o dote, a frota e as festas. Os Valmont querem uma voz no conselho. Uma cadeira. Pode ser a do tesouro; entendo de tesouros."',
      choices: [
        { label: 'Não há cadeira à venda', sub: 'Valmont −5', color: 'vermelho', icon: 'coroa', say: 'As cadeiras do conselho não se compram, Lorde Gaspard. Nem com dote, nem com frota. Um dia talvez um Valmont sente ali por mérito. Não por fatura.', effects: { loyalty: { valmont: -5 }, res: { prestigio: 3 }, xp: 10 }, reply: 'Gaspard sorri como quem arquivou a resposta para cobrar com juros.' },
        { label: 'Um assento de ouvinte', sub: 'Meio-termo · Valmont +3', color: 'dourado', icon: 'aperto', say: 'Uma cadeira, não. Mas um assento de ouvinte nas reuniões sobre comércio, sim. Ouvir é o primeiro passo de todo conselheiro.', effects: { loyalty: { valmont: 3 }, clue: 'emprestimo_valmont', xp: 12 }, reply: 'Gaspard aceita. Na primeira reunião, ele ouve com tanta atenção que Corvin esquece de respirar.' },
      ],
    } },
  }),
  // ======================= O DIÁRIO DO PAI =======================
  C({
    id: 'eco_diario_mae', speaker: 'isabelle', topic: 'A cozinha sabe de tudo', kind: 'encontro', cause: 'diarioPai', cond: after('diarioPai', 2),
    place: { room: 'capela', hour: 10, spot: 'bancos', title: 'Isabelle o espera na capela' },
    nodes: { start: {
      text: 'Isabelle está sozinha no primeiro banco da capela. Não se vira quando você entra. "A irmã da ferreira trabalha na cozinha. Então a cozinha sabe que você abriu a escrivaninha do seu pai." Uma pausa. "O que ele escreveu, meu filho?"',
      choices: [
        { label: 'Contar a verdade', sub: 'Confiar na mãe', color: 'verde', icon: 'coracao', say: 'Ele escreveu que três chaves já giravam juntas. E que, se morresse de repente, não teria sido Deus. Três dias depois, ele morreu. Não posso carregar isso sozinho, mãe.', effects: { bond: { isabelle: { confianca: 10, amor: 4 } }, clue: 'lei_chaves', mood: { stress: -6 }, xp: 14 }, reply: 'Isabelle fecha os olhos por muito tempo. "Então eu estava certa em ter medo." Ela segura sua mão. "Agora somos dois. Nunca mais você carrega isso sozinho."' },
        { label: 'Poupá-la', sub: 'Proteger', color: 'azul', icon: 'escudo', say: 'Contas antigas, mãe, e lembranças. Nada que mude o que já passou. Descanse.', effects: { bond: { isabelle: { confianca: -4 } }, xp: 5 }, reply: '"Você mente como ele mentia", ela diz, sem raiva. "Para me proteger. E eu também não acreditava nele."' },
      ],
    } },
  }),
  // ======================= BANDIDOS DE CINZEL =======================
  C({
    id: 'eco_bandidos_presos', speaker: 'aurelian', topic: 'Os bandidos de botas boas', kind: 'audiencia', cause: 'banditosMontclair', cond: after('banditosMontclair', 3),
    nodes: { start: {
      text: 'Aurelian traz dois homens acorrentados. "Pegamos na estrada da costa. Mesmas botas de Cinzel. Um deles fala se o rei prometer que não enforca." O mais novo treme. O mais velho olha para o chão como quem já sabe o preço de falar.',
      choices: [
        { label: 'Prometer a vida', sub: 'Pista sobre Montclair', color: 'azul', icon: 'aperto', say: 'Você não será enforcado. Tem a palavra do rei. Mas vai me dizer quem paga as botas, o soldo e o silêncio de vocês.', effects: { clue: 'moeda_cinzel', loyalty: { montclair: -3 }, xp: 14 }, reply: '"O capataz de Lorde Otho. Paga em moedas das minas. Diz que estradas perigosas fazem o povo pedir um rei mais forte." O mais velho cospe no chão.' },
        { label: 'Enforcá-los em praça pública', sub: 'Exemplo · povo +2', color: 'vermelho', icon: 'espadas', say: 'Bandidos de estrada são enforcados na praça. Não há o que negociar. Que os outros vejam o que acontece com quem ataca as estradas do rei.', effects: { res: { povo: 2, prestigio: 1 }, mood: { anger: 4 }, xp: 6 }, reply: 'A praça assiste. Ninguém sabe quem os pagava. O mais novo chorava. O mais velho, não.' },
      ],
    } },
  }),
  // ======================= COISAS LEVES QUE TAMBÉM LEMBRAM =======================
  C({
    id: 'eco_retrato_cachorro', speaker: 'clara', topic: 'Retrato comeu o decreto', kind: 'encontro', cause: 'cachorroReal', cond: after('cachorroReal', 3),
    place: { room: 'quarto', hour: 8, spot: 'cama', title: 'Clara precisa contar uma coisa (é sobre o cachorro)' },
    nodes: { start: {
      text: 'Clara segura um pedaço de pergaminho babado. Retrato, o cachorro real, abana o rabo ao lado dela, muito satisfeito. "Majestade, ele comeu o decreto sobre as tarifas do sal. O original. Com o selo."',
      choices: [
        { label: 'Rir e reescrever', sub: 'Humor', color: 'verde', icon: 'coracao', say: 'Retrato, você acaba de fazer mais pela Casa Valmont do que o conselho inteiro. Clara, peça ao escriba uma cópia. E um osso para o cão.', effects: { mood: { joy: 10, stress: -8 }, rel: { clara: 4 }, xp: 4 }, reply: 'O escriba reescreve o decreto. Retrato ganha o osso e, pelo resto da semana, segue você até o conselho.' },
        { label: 'Aproveitar e revogar', sub: 'Destino?', color: 'dourado', icon: 'pergaminho', say: 'Sabe de uma coisa? Talvez o cachorro tenha razão. Diga a Aldric que o decreto do sal está suspenso até segunda ordem. Ordem do rei. E do Retrato.', effects: { loyalty: { valmont: -2, drakon: 2 }, mood: { joy: 6 }, xp: 5 }, reply: 'Aldric lê o recado duas vezes para ter certeza de que não é piada. Não é. Ou é, mas é lei.' },
      ],
    } },
  }),
  C({
    id: 'eco_urso_chanceler', speaker: 'pimenta', topic: 'O urso fugiu', kind: 'encontro', cause: 'ursoReal', cond: after('ursoReal', 4),
    place: { room: 'patio', hour: 13, spot: 'treino', title: 'Confusão no pátio: o urso Chanceler' },
    nodes: { start: {
      text: 'O pátio é um caos. Chanceler, o urso, está sentado sobre o boneco de treino, comendo a palha. Os recrutas se escondem atrás do poço. Pimenta, o único calmo, oferece peixe ao urso como quem oferece chá. "Ele só quer atenção, Majestade. Como todo chanceler."',
      choices: [
        { label: 'Ajudar Pimenta com o peixe', sub: 'Coragem boba', color: 'verde', icon: 'coracao', say: 'Me dê um peixe, Pimenta. Se o rei tem medo do próprio urso, como vai enfrentar o conselho?', effects: { res: { prestigio: 2, moral: 2 }, rel: { pimenta: 6 }, mood: { joy: 8 }, xp: 6 }, reply: 'O urso come da sua mão, lambe sua luva e se deita como um cachorro gigante. Os recrutas aplaudem. A história chega à cidade no mesmo dia, aumentada.' },
        { label: 'Mandar o urso para os Bosques', sub: 'Fim da brincadeira', color: 'azul', icon: 'arvore', say: 'Chega. O urso vai para os Bosques Reais, onde há espaço e ninguém treina com espadas. Aveline vai saber cuidar dele.', effects: { rel: { pimenta: -4, gaspard: -2 }, loyalty: { seren: 1 }, xp: 4 }, reply: 'Pimenta se despede do urso com um discurso de dez minutos. O urso dorme no meio.' },
      ],
    } },
  }),
];
