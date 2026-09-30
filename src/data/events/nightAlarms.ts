import type { GameEvent, GameState } from '../../types';

// EMERGÊNCIAS DA NOITE
// O rei já está dormindo quando batem à porta. Ele acorda e tem que decidir ali,
// de camisola, com a vela na mão. (Eventos `wake`: só acontecem na cama.)
const N = (e: Omit<GameEvent, 'kind' | 'domain' | 'wake'>): GameEvent => ({ ...e, kind: 'noite', domain: 'pessoal', wake: true, repeat: e.repeat ?? 12 });
const courting = (s: GameState) => !s.spouse && s.day < 20;

export const NIGHT_ALARMS: GameEvent[] = [
  N({
    id: 'alarme_incendio', speaker: 'aurelian', topic: 'Fogo nos estábulos', weight: 3, minDay: 4,
    nodes: { start: {
      text: 'Batidas na porta, fortes. Aurelian, sem elmo, com fuligem no rosto: "Majestade! Fogo nos estábulos! Os cavalos estão presos e o vento empurra as chamas para o celeiro!" Pela janela, o céu está laranja.',
      choices: [
        { label: 'Ir pessoalmente carregar baldes', sub: 'Povo +4 · moral +3 · risco', color: 'verde', icon: 'coracao', say: 'Minhas botas. Agora! Se o rei fica na cama enquanto o celeiro queima, que tipo de rei ele é? Todo mundo nos baldes, eu primeiro.', effects: { res: { povo: 4, moral: 3, prestigio: 2 }, mood: { fatigue: 18, joy: 4 }, rel: { aurelian: 6 }, xp: 14 }, reply: 'Você passa baldes até as mãos sangrarem. O celeiro se salva; dois cavalos, não. De madrugada, os cavalariços contam na cidade que o rei carregou água de camisola. A história vai crescer.' },
        { label: 'Salvar o celeiro, sacrificar os estábulos', sub: 'Frieza · protege o grão', color: 'dourado', icon: 'trigo', say: 'Esqueçam os estábulos. Joguem terra no caminho do vento e salvem o celeiro. Cavalos se compram. O grão do inverno, não.', effects: { res: { moral: -2 }, flags: { estabulosQueimados: true }, xp: 10 }, reply: 'O celeiro sobrevive. Os estábulos viram cinza, e com eles seis cavalos. Os cavalariços olham para você de um jeito novo, e não é bom.' },
        { label: 'Perguntar quem estava lá', sub: 'Fogo não nasce sozinho', color: 'roxo', icon: 'olho', say: 'Apaguem o fogo. E Aurelian: quero saber quem foi o último a sair dos estábulos esta noite. Fogo não começa sozinho no outono.', effects: { res: { influencia: 2 }, clue: 'guarda_trocada', xp: 12 }, reply: 'Ao amanhecer, um cavalariço lembra de dois homens de capa cinza "que vieram ver os cavalos do rei". Ninguém sabe de onde vieram. Os portões estavam com a guarda nova.' },
      ],
    } },
  }),
  N({
    id: 'alarme_fuga', speaker: 'sentinela', topic: 'Uma cela vazia', weight: 2, minDay: 6,
    nodes: { start: {
      text: 'A sentinela da masmorra está branca como a parede. "Majestade, perdão, perdão. A cela dois está vazia. As correntes foram abertas por dentro, com chave. Alguém do castelo deu a chave a ele."',
      choices: [
        { label: 'Fechar os portões e revistar tudo', sub: 'Força · povo −2', color: 'vermelho', icon: 'cadeado', say: 'Fechem todos os portões. Ninguém sai do castelo até o sol nascer. Revistem cada quarto, cada adega, cada baú. E essa chave: quero saber de quem é.', effects: { res: { povo: -2, moral: 2 }, clue: 'mesa_chaves', mood: { anger: 10, fatigue: 10 }, xp: 12 }, reply: 'O preso é encontrado ao amanhecer, escondido na adega. A chave no bolso dele tem a marca de um dos guardiões do conselho.' },
        { label: 'Deixá-lo fugir e segui-lo', sub: 'Isca', color: 'roxo', icon: 'olho', say: 'Não façam barulho. Que ele pense que conseguiu. Mandem dois homens atrás dele, a pé, sem tochas. Quero saber para quem um preso corre quando fica livre.', effects: { clue: 'emissarios_norte', res: { influencia: 2 }, xp: 14 }, reply: 'Ele corre direto para uma casa perto dos portões, onde falam a língua do norte. Seus homens anotam a porta e voltam antes de serem vistos.' },
      ],
    } },
  }),
  N({
    id: 'alarme_corvo', speaker: 'pajem', topic: 'Um corvo da fronteira', weight: 3, minDay: 8, cond: (s) => !s.flags.pazNorhelm,
    nodes: { start: {
      text: 'O pajem entra correndo, tropeça no tapete e estende um pergaminho molhado. "Da fronteira, Majestade! O corvo chegou agora!" A letra de Brandt, tremida: "Tochas no Passo Cinzento. Muitas. Pode ser treino. Pode não ser. Preciso de ordens antes do amanhecer."',
      choices: [
        { label: 'Mandar reforços agora', sub: '−80 ouro · moral +3', color: 'vermelho', icon: 'espadas', say: 'Acorde o capitão da guarda. Duzentos homens partem para o Vale ainda esta noite. Se for treino, voltam cansados. Se não for, chegam a tempo.', effects: { res: { ouro: -80, moral: 3 }, loyalty: { drakon: 4 }, flags: { reforcoNoturno: true }, mood: { stress: 8, fatigue: 8 }, xp: 12 }, reply: 'As tochas no passo somem antes do amanhecer. Brandt escreve de novo: "Seja o que for, viram as suas tropas chegando. Obrigado." Vindo dele, é quase uma declaração de amor.' },
        { label: 'Esperar o amanhecer', sub: 'Prudência · risco', color: 'azul', icon: 'ampulheta', say: 'Diga a Brandt que mantenha a muralha e mande batedores. Não vou mover um exército por causa de tochas. Amanhã decidimos com a cabeça fria.', effects: { loyalty: { drakon: -3 }, mood: { stress: 6 }, xp: 8 }, reply: 'Você não dorme de novo. As tochas eram um treino, dizem os batedores. Brandt manda uma segunda carta, mais curta: "Da próxima vez, talvez não seja."' },
      ],
    } },
  }),
  N({
    id: 'alarme_mae', speaker: 'clara', topic: 'A rainha-mãe passou mal', weight: 2, minDay: 7, repeat: 30,
    nodes: { start: {
      text: 'Clara bate de leve, depois com força. "Majestade... a rainha-mãe. Ela desmaiou no corredor. Está acordada agora, mas não reconhece a Irmã Hedda. Chama pelo seu pai."',
      choices: [
        { label: 'Correr até ela', sub: 'Isabelle +10', color: 'verde', icon: 'coracao', say: 'Estou indo. Mande buscar a Irmã Hedda e ferva água. E ninguém, ninguém, conta isso na corte antes de eu saber o que é.', effects: { rel: { isabelle: 10 }, bond: { isabelle: { amor: 8 } }, mood: { stress: 10, fatigue: 10 }, xp: 12 }, reply: 'Você passa a noite segurando a mão dela. De madrugada, ela abre os olhos e diz o seu nome, o certo. "Você tem as mãos dele", diz, e volta a dormir. A Irmã Hedda diz que foi cansaço. Você não tem certeza.' },
        { label: 'Perguntar o que ela comeu', sub: 'Desconfiar do jantar', color: 'roxo', icon: 'olho', say: 'Antes de tudo: o que a rainha-mãe comeu hoje? Quem serviu? Guardem o prato e a taça, e não deixem ninguém lavar nada.', effects: { rel: { isabelle: 4 }, clue: 'morte_pai', mood: { stress: 12 }, xp: 14 }, reply: 'A taça dela tem um resíduo branco no fundo. A Irmã Hedda cheira e empalidece: amêndoas. Não o bastante para matar. O bastante para avisar.' },
      ],
    } },
  }),
  N({
    id: 'alarme_tesouro', speaker: 'corvin', topic: 'Passos no tesouro', weight: 2, minDay: 5, repeat: 20,
    nodes: { start: {
      text: 'Corvin, de gorro de dormir e com uma vela tremendo na mão: "Majestade. Ouvi passos no tesouro. Dormi lá. Às vezes durmo lá. Não importa. Alguém abriu o cofre pequeno com uma chave, e depois fechou de novo. Não levou nada. Só olhou."',
      choices: [
        { label: 'Contar o cofre agora', sub: 'Sem dormir', color: 'dourado', icon: 'moedas', say: 'Então vamos contar. Agora, você e eu, moeda por moeda. Se alguém só olhou, quero saber o que viu.', effects: { clue: 'contas_velas', rel: { corvin: 4 }, mood: { fatigue: 12 }, xp: 10 }, reply: 'O ouro está todo lá. O que falta é um papel: a lista das dívidas da coroa com os Valmont, com as cláusulas. Alguém quer saber quanto o rei deve, e para quem.' },
        { label: 'Trocar as fechaduras de manhã', sub: 'Proteção', color: 'azul', icon: 'cadeado', say: 'Volte a dormir, Corvin, se conseguir. De manhã, o ferreiro troca todas as fechaduras do tesouro, e as chaves novas ficam comigo.', effects: { res: { ouro: -20 }, flags: { tesouroTrancado: true }, xp: 8 }, reply: 'As fechaduras novas brilham. As chaves pesam no seu cinto. Corvin olha para elas como um homem olha para um amor perdido.' },
      ],
    } },
  }),
  N({
    id: 'alarme_pretendente', speaker: 'isolde', topic: 'Batidas leves na porta', weight: 3, minDay: 5, cond: (s) => courting(s) && !!s.flags.met_isolde,
    nodes: { start: {
      text: 'Três batidas leves, uma pausa, mais uma. Isolde, de capa escura sobre a camisola de seda, sem leque pela primeira vez. "Não grite. Ninguém me viu." Ela entra sem ser convidada e encosta a porta com as costas. "Tenho uma informação que custa caro. E uma pergunta que custa mais."',
      choices: [
        { label: 'Ouvir a informação', sub: 'Política à meia-noite', color: 'roxo', icon: 'olho', say: 'Uma princesa no quarto do rei à meia-noite, e ela quer falar de política. Está bem. A informação primeiro. A pergunta, depois, se eu sobreviver à primeira.', effects: { clue: 'banco_veridian', rel: { isolde: 8 }, xp: 12 }, reply: '"O banco do meu irmão compra as dívidas das suas casas. Todas. Discretamente." Ela se aproxima. "A pergunta era: você me escolheria, sabendo disso?" Ela vai embora antes de você responder. Deixa o perfume.' },
        { label: 'Pedir que fique', sub: 'Isolde +12 · escândalo se souberem', color: 'roxo', icon: 'coracao', say: 'Fique. Não pela informação, nem pela pergunta. Fique porque eu quero que fique, e porque você veio até aqui sabendo que eu ia pedir.', effects: { rel: { isolde: 12 }, flags: { noiteIsolde: true }, bond: { isolde: { amor: 10 } }, mood: { joy: 10 }, xp: 12 }, reply: 'Ela ri baixinho, a primeira risada sem cálculo que você ouve dela. Senta na beira da cama e conversa até a vela acabar. Só conversa. É mais íntimo do que qualquer outra coisa teria sido. Ela sai antes do amanhecer, pela porta de serviço.' },
        { label: 'Mandá-la de volta', sub: 'Protegê-la da corte', color: 'azul', icon: 'escudo', say: 'Volte para os seus aposentos, princesa, antes que um guarda a veja. Não por mim. Por você. A corte não perdoaria.', effects: { rel: { isolde: 3 }, res: { prestigio: 1 }, xp: 6 }, reply: '"Cavalheiro." Ela diz a palavra como um elogio e uma queixa ao mesmo tempo. Na porta, se vira: "Da próxima vez, eu não bato."' },
      ],
    } },
  }),
];
