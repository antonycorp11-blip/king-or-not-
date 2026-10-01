import type { GameEvent, GameState } from '../../types';
import { holder } from '../../engine/council';

// Reuniões do Conselho. Cada cadeira defende uma saída; o rei escolhe uma delas
// ou a própria. Se o rei não vier, a cadeira que lidera o assunto decide sozinha.
// As falas são do CARGO: quem estiver sentado nele as defende com o próprio rosto.
const atWar = (s: GameState) => !!s.war && !s.war.result;
const who = (s: GameState, seat: Parameters<typeof holder>[1]) => holder(s, seat) ?? 'ninguém';

export const COUNCIL_EVENTS: GameEvent[] = [
  {
    id: 'cm_festa_coroacao', speaker: 'aldric', topic: 'A festa da coroação', kind: 'reuniao', weight: 9, minDay: 2, maxDay: 5,
    nodes: { start: {
      text: 'Primeira reunião do seu reinado. Cinco pessoas em volta de uma mesa, cinco chaves penduradas em cinco cintos, e um único assunto: quanto gastar na festa da coroação. Parece pouco. Na primeira reunião, nada é pouco.',
      choices: [
        { label: 'Perguntar para que servem as chaves', sub: 'Curiosidade de rei novo', color: 'roxo', icon: 'olho', effects: { res: { influencia: 1 }, xp: 8 }, reply: 'A mesa fica em silêncio por um segundo a mais. "Tradição, Majestade", diz alguém. "Cada cargo guarda uma porta do reino." Ninguém explica qual porta.' },
      ],
    } },
    council: { lead: 'tesoureiro', positions: {
      tesoureiro: { argument: '"Uma festa modesta. O tesouro herdou dívidas, não comemorações."', choice: { label: 'Festa modesta', sub: '−40 ouro', color: 'dourado', icon: 'moedas', effects: { res: { ouro: -40 }, loyalty: { valmont: -2 }, xp: 6 }, reply: 'Pão, vinho e um bardo só. Os lordes comentam que o menino é pão-duro. O cofre agradece em silêncio.' } },
      chanceler: { argument: '"Os lordes precisam ver um rei. Uma festa digna diz mais que dez decretos."', choice: { label: 'Uma festa digna', sub: '−150 ouro, todas as casas +3', color: 'azul', icon: 'coroa', effects: { res: { ouro: -150, prestigio: 4 }, loyalty: { valmont: 3, drakon: 3, seren: 3, montclair: 3 }, mood: { joy: 10, why: 'A festa da coroação' }, xp: 8 }, reply: 'Três dias de música. Brandt dança com Isabelle, e ninguém tem coragem de comentar. O reino, por uma semana, sorri.' } },
      guardiao: { argument: '"Festa para o povo, na praça. Os lordes já comem bem todos os dias."', choice: { label: 'Festa na praça, para o povo', sub: '−80 ouro, povo +6', color: 'verde', icon: 'povo', effects: { res: { ouro: -80, povo: 6 }, loyalty: { montclair: -2 }, xp: 8 }, reply: 'A cidade baixa come carne de graça pela primeira vez em anos. Os lordes assistem da sacada, desconfortáveis.' } },
      marechal: { argument: '"Um desfile da guarda. O povo vê a força, os inimigos também."', choice: { label: 'Um desfile militar', sub: '−60 ouro, moral +5', color: 'vermelho', icon: 'espadas', effects: { res: { ouro: -60, moral: 5, prestigio: 2 }, xp: 6 }, reply: 'Oitocentos soldados marcham sob a sua janela. Os espiões de Norhelm contam cada um deles.' } },
    } },
  },
  {
    id: 'cm_selo_real', speaker: 'aldric', topic: 'O selo do rei morto', kind: 'reuniao', weight: 6, minDay: 3, maxDay: 9,
    nodes: { start: {
      text: 'O Chanceler lembra que decretos ainda saem com o selo do seu pai. Um selo novo precisa ser gravado, e alguém precisa guardá-lo. A mesa inteira parece ter uma opinião sobre quem.',
      choices: [
        { label: 'O selo fica comigo, no meu quarto', sub: 'Ninguém assina por mim', color: 'vermelho', icon: 'selo', effects: { flags: { seloComORei: true }, res: { prestigio: 2 }, run: (s) => { s.council.power.aldric = Math.max(0, (s.council.power.aldric ?? 0) - 6); }, bond: { aldric: { ressentimento: 5 } }, xp: 10 }, reply: 'O selo novo dorme na sua escrivaninha. O Chanceler faz uma reverência elegante e não diz nada. Mas passa a pedir audiência para cada carimbo.' },
      ],
    } },
    council: { lead: 'chanceler', positions: {
      chanceler: { argument: '"O selo sempre ficou com o Chanceler. É o que dá peso à palavra do rei quando o rei está ocupado."', choice: { label: 'O Chanceler guarda o selo', sub: 'Decretos andam mais rápido', color: 'azul', icon: 'pergaminho', effects: { power: { aldric: 6 }, res: { influencia: 2 }, xp: 6 }, reply: 'Aldric guarda o selo num estojo de couro. Os decretos passam a sair antes mesmo de você terminar de pensar neles.' } },
      sussurros: { argument: '"Um selo copiado derruba reinos. Que seja gravado com uma marca secreta, que só o rei conheça."', choice: { label: 'Gravar uma marca secreta', sub: '−20 ouro, proteção', color: 'roxo', icon: 'mascara', effects: { res: { ouro: -20 }, flags: { seloMarcado: true }, run: (s) => { s.conspiracy.prep.seloMarcado = 1; }, xp: 10 }, reply: 'O ourives grava um pequeno cervo no canto do selo, invisível sem lente. Se alguém um dia copiar o selo, vai copiar sem o cervo.' } },
    } },
  },
  {
    id: 'cm_fronteira', speaker: 'aldric', topic: 'Tropas na fronteira norte', kind: 'reuniao', weight: 4, minDay: 5, maxDay: 21, cond: (s) => !s.flags.pazNorhelm && !atWar(s),
    nodes: { start: {
      text: 'Batedores contam fogueiras do outro lado do Passo Cinzento. Muitas. O conselho se divide antes mesmo de o rei sentar.',
      choices: [
        { label: 'Eu mesmo vou olhar o passo', sub: 'Dois dias de viagem, moral alta', color: 'dourado', icon: 'montanha', effects: { res: { moral: 8, prestigio: 3 }, mood: { fatigue: 25, why: 'Cavalgou até o Passo Cinzento' }, flags: { reiNaFronteira: true }, xp: 14 }, reply: 'Você sobe a trilha com vinte guardas. As fogueiras são reais. Os soldados da fronteira nunca tinham visto um rei. Agora não esquecem.' },
      ],
    } },
    council: { lead: 'marechal', positions: {
      marechal: { argument: '"Mobilizar agora. Um exército parado longe da fronteira chega tarde."', choice: { label: 'Mobilizar o exército', sub: '−100 ouro, moral e Drakon sobem', color: 'vermelho', icon: 'espadas', effects: { res: { ouro: -100, moral: 6, exercito: 60 }, loyalty: { drakon: 5 }, xp: 10 }, reply: 'Os tambores tocam no pátio. Em Norhelm, alguém vai ouvir falar disso.' } },
      tesoureiro: { argument: '"Mobilizar custa cem moedas por dia de marcha. Fogueiras não custam nada. Esperem."', choice: { label: 'Esperar e economizar', sub: 'O cofre agradece', color: 'dourado', icon: 'moedas', effects: { res: { moral: -3 }, flags: { fronteiraFraca: true }, xp: 6 }, reply: 'O ouro fica no cofre. Os soldados da fronteira ficam sozinhos com as fogueiras.' } },
      chanceler: { argument: '"Um ultimato antes de qualquer tambor. Quem ameaça primeiro escolhe o terreno da conversa."', choice: { label: 'Enviar um ultimato', sub: 'Diplomacia armada', color: 'azul', icon: 'pergaminho', effects: { res: { prestigio: 3, influencia: -3 }, rel: { haakon: -5 }, xp: 10 }, reply: 'A carta parte com o selo real. A resposta, se vier, virá gelada.' } },
      sussurros: { argument: '"Contaram as fogueiras. Contaram os homens? Fogueira acesa não é soldado. Deixem-me mandar olhos."', choice: { label: 'Mandar espiões primeiro', sub: 'Informação antes da espada', color: 'roxo', icon: 'olho', effects: { res: { influencia: 3 }, flags: { infoNorhelm: true }, xp: 12 }, reply: 'Três dias depois: metade das fogueiras é de pastores. A outra metade, não.' } },
    } },
  },
  {
    id: 'cm_colheita', speaker: 'aldric', topic: 'A colheita fraca e os impostos', kind: 'reuniao', weight: 3, minDay: 4,
    nodes: { start: { text: 'A colheita veio fraca no vale e nos bosques. Os camponeses pedem redução dos impostos até a primavera. O tesouro pede o contrário.', choices: [] } },
    council: { lead: 'tesoureiro', positions: {
      tesoureiro: { argument: '"Se abrirmos exceção para um, todos vão chorar colheita fraca. Mantemos a cobrança."', choice: { label: 'Manter a cobrança', sub: '+120 ouro, povo −6', color: 'dourado', icon: 'moedas', effects: { res: { ouro: 120, povo: -6 }, loyalty: { valmont: 3 }, xp: 8 }, reply: 'Os coletores saem com escolta. Voltam com o ouro e com histórias feias.' } },
      guardiao: { argument: '"Camponês com fome não planta no ano seguinte. Um inverno de alívio vale três de cobrança."', choice: { label: 'Aliviar até a primavera', sub: '−80 ouro, povo +8', color: 'verde', icon: 'trigo', effects: { res: { ouro: -80, povo: 8 }, loyalty: { seren: 3 }, xp: 10 }, reply: 'Nas aldeias, pela primeira vez em anos, alguém brinda ao rei sem ironia.' } },
      chanceler: { argument: '"Alívio, sim, mas só para quem jurar lealdade de novo. Façam a gratidão ter assinatura."', choice: { label: 'Alívio em troca de juramentos', sub: '−4 influência, casas +3', color: 'azul', icon: 'aperto', effects: { res: { influencia: -4, povo: 3 }, loyalty: { seren: 3, drakon: 3, montclair: 2, valmont: 2 }, xp: 10 }, reply: 'Os juramentos são assinados em cima de sacos de grão. Ninguém esquece esse tipo de cena.' } },
      marechal: { argument: '"Se não pagam, cobramos. A guarda vai junto e ninguém discute."', choice: { label: 'Cobrar com soldados', sub: '+150 ouro, povo −12', color: 'vermelho', icon: 'espadas', effects: { res: { ouro: 150, povo: -12, moral: -2 }, xp: 6 }, reply: 'O ouro chega. Dois celeiros pegam fogo "por acidente" na mesma semana.' } },
    } },
  },
  {
    id: 'cm_ponte', speaker: 'aldric', topic: 'A ponte do Vale Rubro caiu', kind: 'reuniao', weight: 3, minDay: 6,
    nodes: { start: { text: 'A ponte de pedra sobre o rio Rubro desabou com a cheia. As carroças de grão estão paradas dos dois lados. Brandt Drakon diz que é obrigação da coroa. A coroa não tem certeza.', choices: [] } },
    council: { lead: 'guardiao', positions: {
      guardiao: { argument: '"Pedra, e pedra boa. Uma ponte que dura cem anos custa menos que três pontes de madeira."', choice: { label: 'Reconstruir em pedra', sub: '−150 ouro, Drakon +6', color: 'verde', icon: 'martelo', effects: { res: { ouro: -150, povo: 4 }, loyalty: { drakon: 6 }, xp: 10 }, reply: 'Pedreiros das montanhas descem para o vale. A ponte levará semanas, mas levará pedra.' } },
      tesoureiro: { argument: '"Madeira. Hoje. Um terço do preço. Daqui a dez anos, outro rei que se preocupe."', choice: { label: 'Ponte de madeira', sub: '−50 ouro, dura pouco', color: 'dourado', icon: 'madeira', effects: { res: { ouro: -50 }, loyalty: { drakon: 2 }, flags: { ponteMadeira: true }, xp: 6 }, reply: 'A ponte fica pronta em quatro dias. Range quando as carroças passam. Todos fingem não ouvir.' } },
      chanceler: { argument: '"O Vale é dos Drakon. A ponte também. Lembrem a Brandt quem jurou manter as estradas."', choice: { label: 'Os Drakon que paguem', sub: 'Drakon −6, prestígio +2', color: 'azul', icon: 'pergaminho', effects: { loyalty: { drakon: -6 }, res: { prestigio: 2 }, xp: 8 }, reply: 'Brandt paga, resmungando. E passa a cobrar pedágio na ponte nova. Em nome do rei, claro.' } },
    } },
  },
  {
    id: 'cm_guilda', speaker: 'aldric', topic: 'O monopólio que a Guilda quer', kind: 'reuniao', weight: 2, minDay: 8,
    nodes: { start: { text: 'A Guilda dos Mercadores oferece um adiantamento generoso em troca do monopólio do sal por cinco anos. O sal é barato. Por enquanto.', choices: [] } },
    council: { lead: 'tesoureiro', positions: {
      tesoureiro: { argument: '"Cento e cinquenta moedas agora. O sal vai subir? Vai. O cofre agradece hoje."', choice: { label: 'Vender o monopólio', sub: '+150 ouro, povo −4', color: 'dourado', icon: 'moedas', effects: { res: { ouro: 150, povo: -4 }, rel: { tobias: 10 }, law: 'Monopólio do sal para a Guilda', xp: 8 }, reply: 'Tobias assina com uma pena de ganso dourada. O preço do sal sobe na segunda-feira.' } },
      guardiao: { argument: '"O sal conserva o peixe e a carne do inverno. Quem controla o sal controla quem come."', choice: { label: 'Recusar a Guilda', sub: 'Povo +3, Guilda ofendida', color: 'verde', icon: 'povo', effects: { res: { povo: 3 }, rel: { tobias: -10 }, xp: 8 }, reply: 'Tobias recolhe o contrato com um sorriso que não chega aos olhos.' } },
      sussurros: { argument: '"Antes de responder, deixem-me ler os livros da Guilda. Quem oferece adiantamento está devendo a alguém."', choice: { label: 'Investigar a Guilda', sub: '+3 influência', color: 'roxo', icon: 'olho', effects: { res: { influencia: 3 }, flags: { guildaInvestigada: true }, xp: 10 }, reply: 'A Guilda deve ao banco de Véridian. Muito. Isso explica a pressa.' } },
    } },
  },
  {
    id: 'cm_espiao', speaker: 'aldric', topic: 'Um espião do norte na masmorra', kind: 'reuniao', weight: 3, minDay: 9, cond: (s) => !s.flags.pazNorhelm || s.spouse === 'sigrid',
    nodes: { start: { text: 'A guarda pegou um homem copiando o mapa das muralhas. Fala com sotaque do norte e jura que é vendedor de peles. As peles, curiosamente, têm as muralhas desenhadas por dentro.', choices: [] } },
    council: { lead: 'sussurros', positions: {
      sussurros: { argument: '"Um espião preso é um espião desperdiçado. Deixem-me virá-lo. Ele vai mandar para o norte o que nós escolhermos."', choice: { label: 'Transformá-lo em agente duplo', sub: '+5 influência', color: 'roxo', icon: 'mascara', effects: { res: { influencia: 5 }, flags: { espiaoDuplo: true }, xp: 14 }, reply: 'O "vendedor de peles" passa a mandar para o norte mapas cuidadosamente errados.' } },
      marechal: { argument: '"Enforcar no portão. Os outros espiões vão entender o recado."', choice: { label: 'Enforcá-lo no portão', sub: 'Moral +4, norte ofendido', color: 'vermelho', icon: 'espadas', effects: { res: { moral: 4, povo: -1 }, rel: { haakon: -10, sigrid: -6 }, xp: 8 }, reply: 'O corpo fica três dias no portão. Os mercadores do norte passam a usar outra estrada.' } },
      chanceler: { argument: '"Troquem-no. Norhelm tem dois dos nossos pescadores presos. Uma troca justa vale mais que uma corda."', choice: { label: 'Trocar por prisioneiros', sub: 'Prestígio +2, povo +2', color: 'azul', icon: 'aperto', effects: { res: { prestigio: 2, povo: 2 }, rel: { haakon: 4 }, xp: 10 }, reply: 'Os pescadores voltam para casa. O espião também. Todos fingem que foi um favor.' } },
    } },
  },
  {
    id: 'cm_portoes', speaker: 'aldric', topic: 'Quem guarda os portões', kind: 'reuniao', weight: 5, minDay: 14, cond: (s) => !s.flags.portoesDecididos,
    nodes: { start: {
      text: (s) => `${who(s, 'guardiao') === 'otho' ? 'Lorde Otho' : 'O Guardião do Reino'} propõe substituir os guardas reais dos portões da capital por soldados de uma casa aliada. "Mais baratos, mais disciplinados e já pagos." A proposta é simples demais.`,
      choices: [
        { label: 'Os portões são do rei', sub: 'Guardas reais, sempre', color: 'azul', icon: 'castelo', effects: { res: { ouro: -40 }, flags: { portoesDecididos: 'coroa' }, bond: { aurelian: { lealdade: 6 } }, xp: 12 }, reply: 'Os portões continuam com homens de Aurelian. Alguém na mesa guarda o papel da proposta, com cuidado, para outra ocasião.' },
      ],
    } },
    council: { lead: 'guardiao', positions: {
      guardiao: { argument: '"Soldados de casa aliada, pagos pela casa. A coroa economiza e dorme tranquila."', choice: { label: 'Aceitar soldados de casa', sub: '+120 ouro por ano (adiantado)', color: 'dourado', icon: 'moedas', effects: { res: { ouro: 120 }, flags: { portoesDecididos: 'casa', portoesCasa: true }, power: { otho: 6 }, xp: 8 }, reply: 'Na semana seguinte, os portões têm rostos novos. Eles saúdam o rei com perfeição. Perfeição demais.' } },
      tesoureiro: { argument: '"Economiza quarenta moedas por semana. Não vejo o problema. Nunca vejo problemas que economizam."', choice: { label: 'Aceitar, pela economia', sub: '+120 ouro', color: 'dourado', icon: 'moedas', effects: { res: { ouro: 120 }, flags: { portoesDecididos: 'casa', portoesCasa: true }, xp: 6 }, reply: 'Os guardas reais são mandados para a fronteira. Os novos não sabem o nome de ninguém no castelo.' } },
      marechal: { argument: '"Quem abre os portões decide quem entra. Isso não se terceiriza, Majestade."', choice: { label: 'Recusar: guardas reais', sub: '−40 ouro, portões seguros', color: 'vermelho', icon: 'escudo', effects: { res: { ouro: -40, moral: 2 }, flags: { portoesDecididos: 'coroa' }, bond: { aurelian: { lealdade: 6, confianca: 4 } }, xp: 12 }, reply: 'Aurelian dobra os turnos do portão sem pedir soldo extra. "Obrigado, Majestade", diz, e parece aliviado.' } },
    } },
  },
  {
    id: 'cm_lei_chaves', speaker: 'aldric', topic: 'A Lei das Cinco Chaves', kind: 'reuniao', weight: 6, minDay: 24,
    nodes: { start: {
      text: 'O Chanceler abre um pergaminho amarelado. "A Lei das Cinco Chaves. Se os cinco guardiões desta mesa girarem juntos as suas chaves, o rei é declarado incapaz e o reino passa a um conselho de regência. Ninguém a usa há duzentos anos." Uma pausa longa demais. "Alguém pediu uma cópia nos arquivos esta semana."',
      choices: [
        { label: 'Quem pediu a cópia?', sub: 'Exige Intriga 2', color: 'roxo', icon: 'olho', req: { attr: ['intriga', 2] }, effects: { clue: ['lei_chaves', 'cinco_cadeiras'], res: { influencia: 3 }, xp: 18 }, reply: 'O registro foi rasgado. Só sobrou a data e a marca de um anel de sinete. Alguém nesta mesa sabe de quem é.' },
        { label: 'Abolir a lei', sub: '−20 influência, casas furiosas', color: 'vermelho', icon: 'selo', req: { influencia: 20 }, effects: { res: { influencia: -20, prestigio: 4 }, loyalty: { valmont: -6, drakon: -6, seren: -6, montclair: -8 }, clue: 'lei_chaves', flags: { leiChavesAbolida: true }, run: (s) => { s.conspiracy.fallDay = Math.max(s.day + 18, (s.conspiracy.fallDay ?? 72) - 6); }, xp: 20 }, reply: 'A mesa inteira fica em silêncio. Seu pai tentou a mesma coisa. Você acaba de ver cinco pessoas pensando nisso ao mesmo tempo.' },
      ],
    } },
    council: { lead: 'chanceler', positions: {
      chanceler: { argument: '"É uma salvaguarda contra reis loucos. Mantê-la é prudência. Usá-la seria... excepcional."', choice: { label: 'Manter a lei como está', sub: 'Nada muda', color: 'azul', icon: 'pergaminho', effects: { clue: 'lei_chaves', xp: 8 }, reply: 'O pergaminho volta ao arquivo. Você nota que ninguém pergunta por que ele saiu de lá.' } },
      marechal: { argument: '"Uma chave do arsenal que pode depor o rei é uma chave que alguém vai querer roubar. Que as chaves voltem ao rei."', choice: { label: 'Exigir as chaves de volta', sub: 'Poder do conselho cai, mágoa sobe', color: 'vermelho', icon: 'coroa', effects: { clue: 'lei_chaves', run: (s) => { for (const id of Object.values(s.council.seats)) if (id) { s.council.power[id] = Math.max(0, (s.council.power[id] ?? 0) - 12); const b = s.bonds[id]; if (b) b.ressentimento = Math.min(100, b.ressentimento + 8); } }, flags: { chavesComORei: true }, xp: 16 }, reply: 'As cinco chaves são depositadas diante de você. Algumas mãos demoram mais que outras para soltá-las.' } },
      sussurros: { argument: '"Deixem a lei onde está e vigiem quem a lê. Uma armadilha só funciona se a isca parecer intocada."', choice: { label: 'Vigiar quem consulta a lei', sub: 'Isca nos arquivos', color: 'roxo', icon: 'mascara', effects: { clue: 'lei_chaves', flags: { iscaArquivos: true }, res: { influencia: 2 }, xp: 14 }, reply: 'Um criado dos arquivos passa a anotar cada mão que toca o pergaminho. Os nomes chegarão em breve.' } },
    } },
  },
  {
    id: 'cm_banquete', speaker: 'aldric', topic: 'Um banquete para as casas', kind: 'reuniao', weight: 2, minDay: 10,
    nodes: { start: { text: 'As casas andam se estranhando nos corredores. O Chanceler sugere um banquete de reconciliação. O Tesoureiro já está pálido.', choices: [] } },
    council: { lead: 'chanceler', positions: {
      chanceler: { argument: '"Vinho, música e lugares à mesa escolhidos com cuidado. Metade da política é o assento certo."', choice: { label: 'Dar o banquete', sub: '−120 ouro, todas as casas +4', color: 'azul', icon: 'uva', effects: { res: { ouro: -120, prestigio: 3 }, loyalty: { valmont: 4, drakon: 4, seren: 4, montclair: 4 }, mood: { joy: 8, fatigue: 10 }, xp: 10 }, reply: 'Brandt canta. Gaspard paga uma rodada. Aveline sorri uma vez. É o melhor que se pode esperar.' } },
      tesoureiro: { argument: '"Cento e vinte moedas para os lordes comerem o que já têm em casa? Não."', choice: { label: 'Nada de banquete', sub: 'O cofre agradece', color: 'dourado', icon: 'moedas', effects: { res: { prestigio: -1 }, xp: 4 }, reply: 'Os lordes jantam em casa, cada um reclamando do outro.' } },
      sussurros: { argument: '"Deem o banquete. E me deixem escolher quem serve o vinho. Bêbados falam."', choice: { label: 'Banquete com ouvidos', sub: '−120 ouro, +5 influência', color: 'roxo', icon: 'mascara', effects: { res: { ouro: -120, influencia: 5 }, loyalty: { valmont: 2, drakon: 2, seren: 2, montclair: 2 }, flags: { banqueteEspioes: true }, xp: 12 }, reply: 'Os criados anotam tudo. Na manhã seguinte, você sabe quem deve a quem, e quem odeia quem. Quase tudo.' } },
    } },
  },
  {
    id: 'cm_gado', speaker: 'aldric', topic: 'Peste no gado dos bosques', kind: 'reuniao', weight: 2, minDay: 12,
    nodes: { start: { text: 'Uma peste mata o gado nos Bosques Reais. Se chegar ao vale, o inverno será de fome. Aveline Seren pede ajuda. Os Montclair vendem carne salgada pelo triplo.', choices: [] } },
    council: { lead: 'guardiao', positions: {
      guardiao: { argument: '"Queimar os rebanhos doentes. Hoje. Dói agora para não doer no inverno."', choice: { label: 'Queimar os rebanhos', sub: 'Povo −4, Seren −4, peste contida', color: 'vermelho', icon: 'escudo', effects: { res: { povo: -4 }, loyalty: { seren: -4 }, xp: 10 }, reply: 'A fumaça se vê da capital. A peste para na margem do rio.' } },
      tesoureiro: { argument: '"Indenizamos os criadores, eles mesmos queimam. Custa, mas ninguém esconde vaca doente."', choice: { label: 'Indenizar e queimar', sub: '−100 ouro, Seren +5', color: 'verde', icon: 'moedas', effects: { res: { ouro: -100, povo: 2 }, loyalty: { seren: 5 }, xp: 12 }, reply: 'Os criadores entregam até as vacas saudáveis, por via das dúvidas. A peste some.' } },
      sussurros: { argument: '"Uma peste que aparece enquanto os Montclair vendem carne pelo triplo? Deixem-me perguntar quem vendeu o primeiro boi doente."', choice: { label: 'Investigar os Montclair', sub: 'Montclair −6, Seren +3', color: 'roxo', icon: 'olho', effects: { loyalty: { montclair: -6, seren: 3 }, res: { influencia: 2 }, xp: 10 }, reply: 'Nada se prova. Mas a carne dos Montclair volta ao preço normal na mesma semana.' } },
    } },
  },
  {
    id: 'cm_desertores', speaker: 'aldric', topic: 'Desertores nas estradas', kind: 'reuniao', weight: 2, minDay: 8,
    nodes: { start: { text: 'Trinta soldados fugiram do quartel da fronteira e assaltam carroças na estrada do sul. Dizem que fugiram porque o soldo atrasou.', choices: [] } },
    council: { lead: 'marechal', positions: {
      marechal: { argument: '"Enforcar os líderes. Os outros voltam ao quartel. Exército sem medo não é exército."', choice: { label: 'Enforcar os líderes', sub: 'Moral +4, povo −3', color: 'vermelho', icon: 'espadas', effects: { res: { moral: 4, povo: -3 }, xp: 8 }, reply: 'Três corpos na estrada do sul. Vinte e sete homens de volta ao quartel, calados.' } },
      guardiao: { argument: '"Anistia, e mandem-nos para os campos. Precisamos de braços na colheita, não de forcas."', choice: { label: 'Anistia e trabalho', sub: 'Povo +3, moral −3', color: 'verde', icon: 'trigo', effects: { res: { povo: 3, moral: -3 }, xp: 10 }, reply: 'Os desertores viram lavradores. Alguns até agradecem. Os soldados que ficaram se perguntam por que ficaram.' } },
      tesoureiro: { argument: '"Multem. Cada um paga o que roubou e mais um terço. Punição que dá lucro."', choice: { label: 'Multar os desertores', sub: '+40 ouro', color: 'dourado', icon: 'moedas', effects: { res: { ouro: 40, moral: -1 }, xp: 6 }, reply: 'As multas são pagas com o que foi roubado. É um tipo de justiça. Não o melhor.' } },
    } },
  },
  {
    id: 'cm_noiva_lucas', speaker: 'aldric', topic: 'Uma noiva para o príncipe', kind: 'reuniao', weight: 2, minDay: 16, cond: (s) => !s.flags.lucasAnelise && !s.flags.lucasNoivo,
    nodes: { start: { text: 'O conselho discute o casamento do príncipe Lucas. Lucas não foi convidado para a reunião. Ninguém achou isso estranho, exceto você.', choices: [
      { label: 'Chamar Lucas à mesa', sub: 'Ele decide com a gente', color: 'verde', icon: 'coracao', effects: { rel: { lucas: 12 }, bond: { lucas: { confianca: 10 } }, flags: { lucasNoivo: 'escolha' }, xp: 12 }, reply: 'Lucas entra corado, ouve tudo e diz: "Posso pensar?" É a primeira vez que alguém pergunta a ele.' },
    ] } },
    council: { lead: 'chanceler', positions: {
      chanceler: { argument: '"A filha mais nova dos Seren. A fé antiga ao lado da coroa acalma os bosques por uma geração."', choice: { label: 'Uma noiva Seren', sub: 'Seren +10, Lucas não foi ouvido', color: 'azul', icon: 'arvore', effects: { loyalty: { seren: 10 }, rel: { lucas: -6 }, flags: { lucasNoivo: 'seren' }, xp: 10 }, reply: 'Aveline aceita com lágrimas. Lucas aceita com silêncio.' } },
      tesoureiro: { argument: '"Uma Valmont traz dote. Um bom dote. Casamento também é contabilidade."', choice: { label: 'Uma noiva Valmont', sub: '+200 ouro, Valmont +8', color: 'dourado', icon: 'moedas', effects: { res: { ouro: 200 }, loyalty: { valmont: 8, drakon: -3 }, rel: { lucas: -6 }, flags: { lucasNoivo: 'valmont' }, track: { dividaValmont: 5 }, xp: 10 }, reply: 'Gaspard aperta sua mão por tempo demais. Mais um laço com os Valmont.' } },
      sussurros: { argument: '"Um príncipe solteiro é uma moeda que ainda não foi gasta. Guardem-no."', choice: { label: 'Mantê-lo solteiro por ora', sub: '+3 influência', color: 'roxo', icon: 'mascara', effects: { res: { influencia: 3 }, rel: { lucas: -3 }, xp: 8 }, reply: 'Três casas continuam a mandar presentes para Lucas. Ele não entende por quê. Você entende.' } },
    } },
  },
  // ---------- Os casamentos puxam o reino para caminhos diferentes ----------
  {
    id: 'cm_emprestimo_valmont', speaker: 'gaspard', topic: 'Um empréstimo dos Valmont', kind: 'reuniao', weight: 5, minDay: 22, cond: (s) => s.spouse === 'elenora' || s.res.ouro < 250,
    nodes: { start: { text: (s) => `Lorde Gaspard oferece à coroa quatrocentas moedas a juros "de família". ${s.spouse === 'elenora' ? 'Elenora está sentada ao seu lado e não diz nada. Ela leu o contrato.' : 'O contrato tem doze páginas. A cláusula mais importante está na décima primeira.'}`, choices: [
      { label: 'Ler a cláusula 11', sub: 'Exige Contabilidade Real', color: 'verde', icon: 'livro', req: { knowledge: 'contabilidade' }, effects: { clue: 'emprestimo_valmont', res: { ouro: 250 }, track: { dividaValmont: 4 }, flags: { dividaValmont: true }, xp: 18 }, reply: '"Em caso de incapacidade do monarca, a dívida converte-se na posse do porto." Você risca a cláusula na frente de Gaspard e aceita metade do valor. Ele sorri como quem perdeu uma aposta pequena.' },
    ] } },
    council: { lead: 'tesoureiro', positions: {
      tesoureiro: { argument: '"Juros baixos, ouro agora. Recusar dinheiro barato é luxo de reino rico."', choice: { label: 'Aceitar o empréstimo', sub: '+400 ouro, dívida com Valmont', color: 'dourado', icon: 'moedas', effects: { res: { ouro: 400 }, track: { dividaValmont: 15 }, flags: { dividaValmont: true }, loyalty: { valmont: 5 }, power: { gaspard: 5 }, xp: 8 }, reply: 'O ouro chega em carroças com a flor dos Valmont pintada. Todo o castelo vê as carroças.' } },
      chanceler: { argument: '"Aceitar, mas revisar cada cláusula. Um contrato de família ainda é um contrato."', choice: { label: 'Aceitar com revisão', sub: '+300 ouro, dívida menor', color: 'azul', icon: 'pergaminho', effects: { res: { ouro: 300, influencia: -2 }, track: { dividaValmont: 8 }, flags: { dividaValmont: true }, xp: 10 }, reply: 'O Chanceler corta duas cláusulas e deixa passar uma terceira. Qual delas, só o tempo vai dizer.' } },
      guardiao: { argument: '"Cortar gastos em vez de pedir. Um rei endividado é um rei alugado."', choice: { label: 'Recusar e cortar gastos', sub: 'Povo −3, independência', color: 'vermelho', icon: 'escudo', effects: { res: { povo: -3 }, loyalty: { valmont: -4 }, xp: 10 }, reply: 'Gaspard guarda o contrato "para quando Vossa Majestade precisar". Ele tem certeza de que você vai precisar.' } },
    } },
  },
  {
    id: 'cm_oficiais_drakon', speaker: 'brandt', topic: 'Oficiais Drakon para o exército', kind: 'reuniao', weight: 5, minDay: 22, cond: (s) => s.spouse === 'rhoswen' || atWar(s),
    nodes: { start: { text: 'Os Drakon oferecem vinte oficiais experientes para comandar companhias do exército real. De graça. "É o mínimo que a família da rainha pode fazer", diz Brandt.', choices: [] } },
    council: { lead: 'marechal', positions: {
      marechal: { argument: '"Oficiais bons são raros. Mas oficiais que juraram primeiro a outra casa... pensem bem em quem eles vão obedecer numa noite ruim."', choice: { label: 'Aceitar só dez', sub: 'Moral +4, controle mantido', color: 'azul', icon: 'escudo', effects: { res: { moral: 4 }, track: { oficiaisDrakon: 6 }, loyalty: { drakon: 2 }, xp: 12 }, reply: 'Dez oficiais Drakon, espalhados entre companhias reais. Aurelian escolhe onde cada um fica.' } },
      tesoureiro: { argument: '"De graça? Vinte oficiais de graça? Aceitem antes que ele mude de ideia."', choice: { label: 'Aceitar os vinte', sub: 'Moral +8, exército mais Drakon', color: 'dourado', icon: 'espadas', effects: { res: { moral: 8 }, track: { oficiaisDrakon: 15 }, loyalty: { drakon: 6 }, power: { brandt: 5 }, xp: 8 }, reply: 'O exército marcha melhor em uma semana. E canta canções do Vale Rubro.' } },
      chanceler: { argument: '"Recusem com gratidão. Uma casa que comanda o exército do rei não precisa mais do rei."', choice: { label: 'Recusar com gratidão', sub: 'Drakon −5', color: 'vermelho', icon: 'coroa', effects: { loyalty: { drakon: -5 }, rel: { brandt: -6 }, xp: 10 }, reply: 'Brandt ri alto demais. "Como quiser, genro." A palavra genro pesa na sala.' } },
    } },
  },
  {
    id: 'cm_banco_veridian', speaker: 'kasim', topic: 'O banco de Véridian', kind: 'reuniao', weight: 5, minDay: 22, cond: (s) => s.spouse === 'isolde',
    nodes: { start: { text: 'O banco de Véridian propõe comprar as dívidas que as casas nobres têm com a coroa, pagando à vista. A coroa recebe ouro hoje; o banco recebe o direito de cobrar as casas amanhã.', choices: [] } },
    council: { lead: 'tesoureiro', positions: {
      tesoureiro: { argument: '"Dívida velha vira ouro novo. Quem cobra depois não é problema nosso."', choice: { label: 'Vender as dívidas', sub: '+250 ouro, Véridian entra nas casas', color: 'dourado', icon: 'moedas', effects: { res: { ouro: 250 }, track: { presencaVeridian: 15 }, rel: { isolde: 6 }, xp: 8 }, reply: 'Os lordes descobrem que agora devem a estrangeiros. Olham para a rainha de outro jeito.' } },
      sussurros: { argument: '"Quem controla as dívidas das casas controla os votos das casas. Não vendam o que não se compra de volta."', choice: { label: 'Recusar o banco', sub: 'Isolde fica intrigada', color: 'roxo', icon: 'mascara', effects: { rel: { isolde: -4 }, clue: 'banco_veridian', xp: 12 }, reply: 'Isolde observa você por um longo tempo. "Você entendeu mais do que eu esperava." Não fica claro se isso é bom.' } },
      chanceler: { argument: '"Vendam só as dívidas pequenas. Um pé de Véridian na porta, não o corpo inteiro."', choice: { label: 'Vender só as pequenas', sub: '+100 ouro', color: 'azul', icon: 'pergaminho', effects: { res: { ouro: 100 }, track: { presencaVeridian: 6 }, xp: 10 }, reply: 'O banco aceita, educadamente, e pede uma sala no castelo "para facilitar a correspondência".' } },
    } },
  },
  {
    id: 'cm_fronteira_aberta', speaker: 'sigrid', topic: 'Abrir a fronteira do norte', kind: 'reuniao', weight: 5, minDay: 22, cond: (s) => s.spouse === 'sigrid',
    nodes: { start: { text: 'Com a paz selada pelo casamento, Norhelm pede a abertura do Passo Cinzento para mercadores e emissários. Sigrid defende a ideia. Os Drakon, nem um pouco.', choices: [] } },
    council: { lead: 'chanceler', positions: {
      chanceler: { argument: '"A paz se prova com estradas abertas. Fechar o passo é dizer que o casamento foi mentira."', choice: { label: 'Abrir o passo', sub: '+100 ouro, Drakon −5, emissários chegam', color: 'azul', icon: 'aperto', effects: { res: { ouro: 100, prestigio: 3 }, loyalty: { drakon: -5 }, track: { agentesNorte: 15 }, rel: { sigrid: 8 }, xp: 10 }, reply: 'Na primeira semana, peles, âmbar e cantigas atravessam o passo. E homens que não se apresentam a ninguém.' } },
      marechal: { argument: '"Paz não abre portão. Paz deixa o portão fechado sem tensão."', choice: { label: 'Manter o passo fechado', sub: 'Drakon +3, Sigrid magoada', color: 'vermelho', icon: 'escudo', effects: { loyalty: { drakon: 3 }, rel: { sigrid: -8 }, bond: { sigrid: { ressentimento: 6 } }, xp: 8 }, reply: 'Sigrid não discute. Só fica olhando o mapa, no ponto exato do passo, por muito tempo.' } },
      sussurros: { argument: '"Abram, e registrem cada rosto que passar. Um livro de viajantes custa pouco e vale muito."', choice: { label: 'Abrir com registro', sub: '+60 ouro, cada rosto anotado', color: 'roxo', icon: 'olho', effects: { res: { ouro: 60 }, track: { agentesNorte: 6 }, flags: { registroPasso: true }, rel: { sigrid: 3 }, xp: 12 }, reply: 'O livro de viajantes enche rápido. Alguns nomes aparecem duas vezes, com rostos diferentes.' } },
    } },
  },
  // ---------- a nova lei passa pela mesa (convocado sempre que uma conversa muda uma lei) ----------
  {
    id: 'cm_ratificar_lei', speaker: 'aldric', topic: 'A nova lei na mesa do conselho', kind: 'reuniao', weight: 0,
    nodes: { start: { text: (s: GameState) => `Os cinco já estão sentados quando o rei entra. No centro da mesa, o pergaminho: "${String(s.flags._leiPendente ?? 'a nova lei')}". Uma lei nascida numa conversa ainda não tem o peso desta mesa. Aldric pigarreia: "Majestade, cada cadeira tem uma opinião. Ouça antes de selar."`, choices: [] } },
    council: { lead: 'chanceler', positions: {
      chanceler: { argument: '"A lei é sua. Mas lei que o conselho não assina vira papel de embrulhar peixe. Selemos juntos, e ninguém poderá dizer que foi capricho do rei."', choice: { label: 'Ratificar com os cinco selos', sub: '+Prestígio, o Chanceler ganha força', color: 'azul', icon: 'selo', effects: { res: { prestigio: 3 }, power: { aldric: 3 }, flags: { leiRatificada: true }, xp: 10 }, reply: 'Cinco selos de cera, um ao lado do outro. A lei agora pesa como pedra.' } },
      tesoureiro: { argument: '"Toda lei custa, e esta não passou pelo Tesouro. Ratifique, mas por um ano. Se der prejuízo, ela morre sozinha."', choice: { label: 'Ratificar por um ano', sub: '−3 influência, o tesouro respira', color: 'dourado', icon: 'moedas', effects: { res: { influencia: -3, ouro: 30 }, flags: { leiTemporaria: true }, xp: 8 }, reply: 'Corvin anota a data no livro, com um sorriso de quem já sabe como a lei vai acabar.' } },
      guardiao: { argument: '"O povo precisa ouvir isto do rei, não de um pregoeiro. Uma lei que ninguém entende vira boato."', choice: { label: 'Ratificar e anunciar na praça', sub: '+Povo, um discurso pendente', color: 'verde', icon: 'povo', effects: { res: { povo: 3 }, run: (s: GameState) => { const c = s.crowd; if (c && !c.pending.some((p) => p.kind === 'reforma')) c.pending.push({ kind: 'reforma', since: s.day }); }, xp: 10 }, reply: 'O pregoeiro afixa a lei na porta da capela. Amanhã, a praça vai querer ouvir o rei explicar.' } },
      marechal: { argument: '"Revogue. Lei feita em conversa de corredor não serve a um reino que precisa de ordem."', choice: { label: 'Revogar a lei', sub: '−Prestígio, quem pediu a lei se ofende', color: 'vermelho', icon: 'espadas', effects: { res: { prestigio: -3 }, run: (s: GameState) => { const l = String(s.flags._leiPendente ?? ''); s.laws = s.laws.filter((x) => x !== l); s.flags.leiRevogada = l; }, xp: 6 }, reply: 'O pergaminho vai para a lareira. Alguém, em algum lugar do castelo, vai saber disso antes do jantar.' } },
      sussurros: { argument: '"Deixe a lei como está. Mas me deixe descobrir quem vai lucrar com ela. Toda lei nova tem um dono escondido."', choice: { label: 'Ratificar e vigiar quem lucra', sub: '+2 influência, olhos abertos', color: 'roxo', icon: 'olho', effects: { res: { influencia: 2 }, flags: { leiVigiada: true }, xp: 10 }, reply: 'Da cadeira dos sussurros vem só um aceno. Em uma semana, o rei vai saber quem brindou à lei. E quem não brindou.' } },
    } },
  },
  // ---------- assuntos recorrentes (voltam a cada poucos dias; enchem a pauta) ----------
  {
    id: 'cmr_tesouro', speaker: 'corvin', topic: 'As contas da semana', kind: 'reuniao', weight: 1,
    nodes: { start: { text: (s: GameState) => `Corvin abre o livro do Tesouro sobre a mesa. "${s.res.ouro < 200 ? 'O cofre está perigosamente leve, Majestade.' : s.res.ouro > 1200 ? 'Sobra ouro. E ouro parado atrai mãos.' : 'As contas fecham. Por pouco.'}" Cada cadeira tem uma ideia do que fazer com cada moeda.`, choices: [] } },
    council: { lead: 'tesoureiro', positions: {
      tesoureiro: { argument: '"Cortar banquetes, velas e presentes. Um rei econômico é um rei que dura."', choice: { label: 'Cortar os gastos do castelo', sub: '+80 ouro, a corte resmunga', color: 'dourado', icon: 'moedas', effects: { res: { ouro: 80, prestigio: -2 }, xp: 6 }, reply: 'Velas de sebo no lugar das de cera. A corte reclama do cheiro. O cofre não reclama de nada.' } },
      guardiao: { argument: '"Encher o celeiro agora. Ouro não se come no inverno."', choice: { label: 'Comprar grão para o celeiro', sub: '−80 ouro, +celeiro, +povo', color: 'verde', icon: 'trigo', effects: { res: { ouro: -80, povo: 2 }, run: (s: GameState) => { s.granary = (s.granary ?? 0) + 12; }, xp: 8 }, reply: 'Carroças de grão entram pelo portão sul. O povo vê, e conta para quem não viu.' } },
      marechal: { argument: '"Soldo em dia. Soldado bem pago não escuta conversa de traidor."', choice: { label: 'Adiantar o soldo das tropas', sub: '−60 ouro, +moral', color: 'vermelho', icon: 'escudo', effects: { res: { ouro: -60, moral: 6 }, xp: 6 }, reply: 'Nos quartéis, brindam ao rei. Com vinho barato, mas brindam.' } },
      chanceler: { argument: '"Os Valmont emprestam a juros baixos para quem tem a coroa. Por enquanto."', choice: { label: 'Pedir um empréstimo aos Valmont', sub: '+150 ouro, Valmont cobra depois', color: 'azul', icon: 'aperto', effects: { res: { ouro: 150 }, loyalty: { valmont: -3 }, flags: { dividaValmont: true }, xp: 6 }, reply: 'Gaspard assina sorrindo. Sorriso de credor.' } },
    } },
  },
  {
    id: 'cmr_casas', speaker: 'aldric', topic: 'As exigências das casas', kind: 'reuniao', weight: 1,
    nodes: { start: { text: (s: GameState) => { const worst = (['valmont', 'drakon', 'seren', 'montclair'] as const).slice().sort((a, b) => s.loyalty[a] - s.loyalty[b])[0]; return `Aldric empilha cartas lacradas. "As quatro casas escreveram esta semana. A que mais reclama é a ${({ valmont: 'Casa Valmont', drakon: 'Casa Drakon', seren: 'Casa Seren', montclair: 'Casa Montclair' })[worst]}. Ignorar uma casa é um luxo de reis velhos."`; }, choices: [] } },
    council: { lead: 'chanceler', positions: {
      chanceler: { argument: '"Títulos não custam ouro. Um cargo honorário para cada casa acalma todo mundo por um mês."', choice: { label: 'Distribuir títulos e honras', sub: '−5 influência, todas as casas +2', color: 'azul', icon: 'coroa', effects: { res: { influencia: -5 }, loyalty: { valmont: 2, drakon: 2, seren: 2, montclair: 2 }, xp: 8 }, reply: 'Quatro pergaminhos com fitas douradas saem do castelo. Quatro lordes fingem que não ficaram felizes.' } },
      tesoureiro: { argument: '"Paguem a mais insatisfeita em ouro e deixem as outras esperando. Ciúme também governa."', choice: { label: 'Pagar só a mais insatisfeita', sub: '−90 ouro, a pior casa +6', color: 'dourado', icon: 'moedas', effects: { res: { ouro: -90 }, run: (s: GameState) => { const w = (['valmont', 'drakon', 'seren', 'montclair'] as const).slice().sort((a, b) => s.loyalty[a] - s.loyalty[b])[0]; s.loyalty[w] = Math.min(100, s.loyalty[w] + 6); }, xp: 6 }, reply: 'O ouro chega numa carroça discreta. As outras três casas descobrem até o fim da semana.' } },
      marechal: { argument: '"Uma parada militar na estrada de cada casa. Ninguém exige nada de quem tem lanças."', choice: { label: 'Mostrar força', sub: '+prestígio, casas −2', color: 'vermelho', icon: 'espadas', effects: { res: { prestigio: 3 }, loyalty: { valmont: -2, drakon: -1, seren: -2, montclair: -2 }, xp: 6 }, reply: 'Os estandartes do rei passam pelas estradas. As cartas param de chegar. O ressentimento, não.' } },
      sussurros: { argument: '"Cada casa tem um segredo. Saber o deles vale mais que atender o que pedem."', choice: { label: 'Descobrir o que cada casa esconde', sub: '+3 influência, risco', color: 'roxo', icon: 'olho', effects: { res: { influencia: 3 }, rel: { aldric: -1 }, xp: 8 }, reply: 'Quatro informantes saem do castelo esta noite. Nenhum deles usa o nome verdadeiro.' } },
    } },
  },
  {
    id: 'cmr_estradas', speaker: 'aurelian', topic: 'Bandidos nas estradas', kind: 'reuniao', weight: 1, minDay: 4,
    nodes: { start: { text: 'Uma caravana chegou com metade da carga e três feridos. Bandidos na estrada do Vale. O capitão da guarda traz o relato, e a mesa se divide sobre o preço da segurança.', choices: [] } },
    council: { lead: 'marechal', positions: {
      marechal: { argument: '"Patrulhas a cavalo, dia e noite. Bandido não ataca o que vê chegando."', choice: { label: 'Patrulhar as estradas', sub: '−40 ouro, comércio seguro', color: 'vermelho', icon: 'escudo', effects: { res: { ouro: -40, prestigio: 2 }, loyalty: { valmont: 3 }, xp: 8 }, reply: 'Os cavaleiros saem em pares. Em uma semana, a estrada do Vale volta a cantar.' } },
      tesoureiro: { argument: '"Um pedágio nas pontes paga as patrulhas. Quem usa a estrada, paga a estrada."', choice: { label: 'Cobrar pedágio para pagar a guarda', sub: '+40 ouro, povo −3', color: 'dourado', icon: 'moedas', effects: { res: { ouro: 40, povo: -3 }, xp: 6 }, reply: 'Os pedágios sobem nas pontes. Os camponeses passam a usar o vau, mesmo com água na cintura.' } },
      guardiao: { argument: '"Armem as aldeias. Quem mora na estrada defende a estrada."', choice: { label: 'Milícias nas aldeias', sub: '−30 ouro, +povo', color: 'verde', icon: 'povo', effects: { res: { ouro: -30, povo: 4 }, loyalty: { seren: 2 }, xp: 8 }, reply: 'Lanças velhas saem dos depósitos. Os aldeões treinam aos domingos, depois da missa.' } },
      sussurros: { argument: '"Bandido organizado assim tem patrão. Infiltrar um homem e descobrir quem paga."', choice: { label: 'Descobrir quem paga os bandidos', sub: '+2 influência, uma pista', color: 'roxo', icon: 'olho', effects: { res: { influencia: 2 }, flags: { bandidosPagos: true }, xp: 10 }, reply: 'Um homem do castelo some na floresta com roupas de bandido. Volta em dez dias, ou não volta.' } },
    } },
  },
  {
    id: 'cmr_cidade', speaker: 'aldric', topic: 'As queixas da cidade', kind: 'reuniao', weight: 1, minDay: 3,
    nodes: { start: { text: (s: GameState) => `O pregoeiro trouxe a lista de queixas da semana: ruas sem calçamento, um poço contaminado, o preço do pão. ${s.res.povo < 40 ? 'O tom das queixas está ficando perigoso.' : 'Nada que não se resolva, se alguém resolver.'}`, choices: [] } },
    council: { lead: 'chanceler', positions: {
      guardiao: { argument: '"Obras. Um poço novo e calçamento na rua do mercado. O povo lembra de pedra por gerações."', choice: { label: 'Mandar fazer as obras', sub: '−100 ouro, povo +6', color: 'verde', icon: 'martelo', effects: { res: { ouro: -100, povo: 6 }, xp: 10 }, reply: 'Pedreiros na rua do mercado. As crianças passam a tarde vendo, e voltam para casa contando.' } },
      chanceler: { argument: '"Uma audiência pública uma vez por mês. Ouvir custa pouco e acalma muito."', choice: { label: 'Audiência pública mensal', sub: '−4 influência, povo +4', color: 'azul', icon: 'balao', effects: { res: { influencia: -4, povo: 4 }, flags: { audienciaPublica: true }, xp: 8 }, reply: 'O pregoeiro anuncia: uma vez por mês, o rei ouve qualquer um. A fila da primeira vai dar volta na praça.' } },
      tesoureiro: { argument: '"Queixas sempre existiram. Se atendermos todas, não sobra reino para atender."', choice: { label: 'Deixar para depois', sub: 'Nada muda (por enquanto)', color: 'dourado', icon: 'ampulheta', effects: { res: { povo: -2 }, xp: 4 }, reply: 'A lista volta para a gaveta. Na semana que vem, ela vai estar mais longa.' } },
      marechal: { argument: '"Toque de recolher nas ruas que reclamam. Ordem primeiro, obras depois."', choice: { label: 'Toque de recolher', sub: '+moral, povo −5', color: 'vermelho', icon: 'espadas', effects: { res: { moral: 3, povo: -5 }, xp: 4 }, reply: 'As ruas ficam vazias depois do sino das oito. As queixas também. Por fora.' } },
    } },
  },
];
