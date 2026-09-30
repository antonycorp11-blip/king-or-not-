import type { Choice, GameEvent, GameState } from '../../types';

// OS GRANDES DIAS
// Acontecimentos que o reino inteiro espera. Eles são anunciados dias antes (no fim
// de cada dia e no relógio do HUD), para o jogador sentir que "amanhã vai acontecer
// uma grande coisa". Cada um tem lugar, hora e gente de verdade no castelo.
const SUITORS = ['elenora', 'rhoswen', 'isolde', 'sigrid'] as const;
const met = (s: GameState, id: string) => !!s.flags[`met_${id}`] || (id === 'sigrid' && !!s.flags.sigridAsilo);
const NAME: Record<string, string> = { elenora: 'Elenora', rhoswen: 'Rhoswen', isolde: 'Isolde', sigrid: 'Sigrid' };
const others = (id: string) => Object.fromEntries(SUITORS.filter((x) => x !== id).map((x) => [x, -4]));

export const BIG_EVENTS: GameEvent[] = [
  // ======================= DIA 6: O TORNEIO REAL =======================
  {
    id: 'torneio_real', speaker: 'aurelian', topic: 'O Torneio Real', kind: 'encontro', domain: 'pessoal', day: 6, hours: 2, talk: false,
    place: { room: 'patio', hour: 15, spot: 'treino', duration: 2, title: 'O Torneio Real (pátio)' },
    present: ['rhoswen', 'elenora', 'isolde'],
    big: { title: 'O Torneio Real', teaser: ['Cavaleiros de todas as províncias chegam à capital. Os ferreiros não dormem.', 'As pretendentes bordam fitas. Dizem que cada uma espera ver o rei usar a sua.', 'Amanhã, às 15h, o pátio vira arena. O povo já disputa lugar nas muralhas.'] },
    nodes: {
      start: {
        text: 'O pátio virou arena. Estandartes das quatro casas estalam ao vento, o povo se espreme nas muralhas e três damas ocupam o camarote: Elenora, de azul, aperta uma fita de seda; Rhoswen, de couro, não aperta nada, só observa as lanças; Isolde abana o leque como quem já apostou em alguém. Aurelian se inclina: "Majestade, a tradição manda o rei abrir o torneio. Com uma lança, ou com uma fita."',
        choices: [
          { label: 'Entrar na justa', sub: 'Arriscado · prestígio ou vergonha', color: 'vermelho', icon: 'espadas', say: 'Tragam meu cavalo. Um rei que só assiste torneio não merece que lutem por ele. Eu abro a justa.', goto: 'justa' },
          { label: 'Usar a fita de uma das damas', sub: 'Escolher em público', color: 'roxo', icon: 'coracao', say: 'Hoje eu não luto. Mas vou lutar pelo coração de alguém, pelo menos aos olhos do povo. Qual das damas me dá a honra de uma fita?', goto: 'fita' },
          { label: 'Deixar Rhoswen competir', sub: 'Ela pede com os olhos', color: 'dourado', icon: 'escudo', req: { test: (s) => met(s, 'rhoswen'), label: 'conhecer Rhoswen' }, say: 'Lady Rhoswen está olhando para as lanças como quem olha para um banquete. Que ela entre na liça, em meu nome.', goto: 'rhoswen' },
        ],
      },
      justa: {
        text: (s) => `O cavalo bufa. Do outro lado, Sir Osric Âncora baixa a viseira. As trombetas soam e o mundo encolhe até a ponta da lança dele. ${s.flags.treinouEspada || s.flags.rhoswenTreino ? 'Seus braços lembram cada manhã de treino.' : 'Seus braços não lembram de treino nenhum.'} No camarote, Elenora cobre a boca com as mãos.`,
        choices: [
          { label: 'Mirar no escudo', sub: 'Técnica', color: 'azul', icon: 'escudo', say: '(Firme. No centro do escudo, como Aurelian ensinou. Não feche os olhos.)', effects: { run: (s) => { const win = !!s.flags.treinouEspada || !!s.flags.rhoswenTreino || s.seed % 3 !== 0; s.flags.torneioVenceu = win; s.res.prestigio = Math.max(0, Math.min(100, s.res.prestigio + (win ? 8 : -4))); s.res.moral = Math.min(100, s.res.moral + (win ? 5 : 0)); s.rel.rhoswen = (s.rel.rhoswen ?? 0) + (win ? 8 : 3); s.rel.elenora = (s.rel.elenora ?? 0) + (win ? 4 : 10); }, xp: 16 },
            reply: (s) => (s.flags.torneioVenceu ? 'A lança de Osric escorrega. A sua acerta em cheio. Osric vai ao chão com um estrondo de lata e o pátio explode. Rhoswen se levanta no camarote e bate palmas, uma vez, alto. Vindo dela, vale mais que um hino.' : 'O mundo gira. Você está no chão, com gosto de areia e orgulho na boca. Antes dos guardas, quem chega é Elenora, ajoelhada na lama com o vestido azul: "Está vivo? Está. Então nunca mais faça isso." Ela não solta sua mão até o médico chegar.') },
          { label: 'Mirar no elmo', sub: 'Tudo ou nada', color: 'roxo', icon: 'coroa', say: '(No elmo. Se acertar, acabou. Se errar... que o povo lembre que eu tentei.)', effects: { run: (s) => { const win = s.seed % 2 === 0; s.flags.torneioVenceu = win; s.res.prestigio = Math.max(0, Math.min(100, s.res.prestigio + (win ? 12 : -6))); s.res.povo = Math.min(100, s.res.povo + (win ? 5 : 2)); s.rel.rhoswen = (s.rel.rhoswen ?? 0) + (win ? 12 : 5); s.rel.isolde = (s.rel.isolde ?? 0) + (win ? 8 : 0); }, xp: 18 },
            reply: (s) => (s.flags.torneioVenceu ? 'O elmo de Osric voa pelo pátio e cai aos pés de Isolde. Ela o pega, sorri e o devolve a você com uma reverência: "Troféu." O povo canta seu nome até escurecer.' : 'Você erra o elmo por um palmo e leva a lança no ombro. Cai. Levanta. O povo aplaude o rei que levantou, que é quase melhor que o rei que venceu. Rhoswen, de longe, acena com a cabeça: coragem ela respeita.') },
        ],
      },
      fita: {
        text: 'As três damas se levantam ao mesmo tempo, e o camarote fica em silêncio. Elenora estende uma fita azul, bordada com uma âncora. Rhoswen tira do pulso uma tira de couro vermelho, sem enfeite nenhum. Isolde não estende nada: segura o leque fechado e espera, como quem sabe que o rei vai atravessar o pátio até ela.',
        choices: SUITORS.filter((x) => x !== 'sigrid').map((id): Choice => ({
          label: `A fita de ${NAME[id]}`, sub: `${NAME[id]} +14 · as outras reparam`, color: id === 'elenora' ? 'azul' : id === 'rhoswen' ? 'vermelho' : 'verde', icon: 'coracao',
          req: { test: (s) => met(s, id), label: `conhecer ${NAME[id]}` },
          say: id === 'elenora' ? 'Lady Elenora, a sua fita. Azul como o mar da Costa. Vou usá-la no braço direito, o da espada, para todo o reino ver.' : id === 'rhoswen' ? 'Lady Rhoswen, o seu couro. Sem bordado, sem enfeite. Combina comigo mais do que seda.' : 'Princesa, a senhora não trouxe fita. Então me dê o leque. Vou prendê-lo no cinto e explicar a ninguém.',
          effects: { rel: { [id]: 14, ...others(id) }, flags: { [`fita_${id}`]: true }, res: { povo: 2 }, xp: 12 },
          reply: id === 'elenora' ? 'Elenora amarra a fita no seu braço com dedos que tremem um pouco. "Aperte menos, Majestade, ou vão achar que eu o prendi." Ela não parece se importar se acharem.' : id === 'rhoswen' ? 'Rhoswen amarra o couro com um nó de soldado e dá um tapinha no nó. "Agora não pode perder. É o meu nome amarrado aí." Pela primeira vez, ela cora.' : 'Isolde entrega o leque devagar, deixando os dedos encostarem nos seus. "Cuidado com ele, Majestade. Já cortou mais corações que espadas."',
        })),
      },
      rhoswen: {
        text: 'Rhoswen desce do camarote antes de você terminar a frase. Entra na liça sem elmo, trança solta, contra o campeão dos próprios Drakon, um brutamontes chamado Sir Gerald. Na primeira investida, ela abaixa o corpo e a lança dele passa por cima. Na segunda, Sir Gerald está no chão, e o pátio inteiro está de pé.',
        choices: [
          { label: 'Descer e coroá-la campeã', sub: 'Drakon +6 · Rhoswen +16', color: 'vermelho', icon: 'coroa', say: 'Abram caminho. A campeã do Torneio Real recebe a coroa de louros das mãos do rei. E o rei faz questão de colocá-la pessoalmente.', effects: { rel: { rhoswen: 16, elenora: -4, isolde: -3 }, loyalty: { drakon: 6 }, res: { moral: 4 }, flags: { rhoswenCampea: true }, xp: 14 }, reply: 'Você coloca os louros na cabeça dela. Ela está suada, ofegante, e sorri como quem nunca foi coroada por nada. "Achei que o senhor ia ter medo de me ver ganhar." "Eu tive." "Mentiroso." Ela ri, e o povo ri junto.' },
          { label: 'Aplaudir do camarote', sub: 'Discreto', color: 'azul', icon: 'aperto', say: 'Bravo, milady! Castelmar tem uma campeã. Que o Vale Rubro se orgulhe dela.', effects: { rel: { rhoswen: 6 }, loyalty: { drakon: 3 }, xp: 8 }, reply: 'Ela procura você no camarote antes de receber os aplausos do povo. Encontra. Acena com a lança.' },
        ],
      },
    },
    ignored: { text: 'O Torneio Real aconteceu sem o rei. Os cavaleiros lutaram olhando para um camarote vazio, e as damas guardaram as fitas.', res: { prestigio: -6 }, rel: { elenora: -5, rhoswen: -8, isolde: -5 } },
  },
  // ======================= DIA 12: O BAILE DAS PRETENDENTES =======================
  {
    id: 'baile_pretendentes', speaker: 'isabelle', topic: 'O Baile das Pretendentes', kind: 'encontro', domain: 'pessoal', day: 12, hours: 2, talk: false,
    place: { room: 'banquete', hour: 18, spot: 'mesa2', duration: 2, title: 'O Baile das Pretendentes (Salão de Banquetes)' },
    present: ['elenora', 'rhoswen', 'isolde', 'sigrid'],
    big: { title: 'O Baile das Pretendentes', teaser: ['Isabelle mandou polir o Salão de Banquetes inteiro. "Vai ser o baile da década", ela diz, "e a primeira dança conta mais que um tratado."', 'As costureiras não dormem. Dizem que uma das pretendentes encomendou um vestido "impossível de ignorar".', 'Amanhã, às 18h, o Baile das Pretendentes. A corte inteira vai ver com quem o rei dança primeiro.'] },
    nodes: {
      start: {
        text: 'Músicos, velas e seiscentos olhos. As pretendentes entram uma a uma, e cada entrada é uma declaração: Elenora de azul-noite, com o cabelo solto pela primeira vez; Rhoswen de vermelho, sem armadura, desconfortável e deslumbrante; Isolde de verde e ouro, com a máscara de raposa pendurada no pulso; Sigrid de branco, como neve que se recusa a derreter. Isabelle, ao seu lado, sussurra: "A primeira dança, meu filho. O reino inteiro vai ler nela o seu futuro."',
        choices: [],
      },
      ciume: {
        text: (s) => { const f = String(s.flags.primeiraDanca ?? 'elenora'); const rival = f === 'elenora' ? 'Rhoswen' : f === 'rhoswen' ? 'Elenora' : f === 'isolde' ? 'Sigrid' : 'Isolde'; return `No fim da música, ${rival} atravessa o salão até vocês. "Com licença", diz para ${NAME[f]}, sem esperar licença nenhuma. "O rei prometeu a próxima a mim." Você não prometeu nada. ${NAME[f]} não solta sua mão. O salão inteiro para de fingir que não está olhando.`; },
        choices: [
          { label: 'Continuar com quem está', sub: 'Firmeza · a outra se ofende', color: 'vermelho', icon: 'coracao', say: (s) => `Perdão, milady, mas esta música também é de ${NAME[String(s.flags.primeiraDanca ?? 'elenora')]}. A próxima, prometo, e desta vez prometo de verdade.`, effects: { run: (s) => { const f = String(s.flags.primeiraDanca ?? 'elenora'); s.rel[f] = (s.rel[f] ?? 0) + 8; const r = f === 'elenora' ? 'rhoswen' : f === 'rhoswen' ? 'elenora' : f === 'isolde' ? 'sigrid' : 'isolde'; s.rel[r] = (s.rel[r] ?? 0) - 8; }, xp: 10 }, goto: 'varanda', reply: 'A outra faz uma reverência perfeita e gelada. A que ficou encosta a cabeça no seu ombro durante a música inteira, e não é pelo cansaço.' },
          { label: 'Dançar com as duas', sub: 'Charme · arriscado', color: 'roxo', icon: 'mascara', say: 'Nenhuma lei proíbe o rei de dançar com duas damas ao mesmo tempo. Se proibisse, eu a revogaria agora.', effects: { run: (s) => { const f = String(s.flags.primeiraDanca ?? 'elenora'); s.rel[f] = (s.rel[f] ?? 0) + 2; }, res: { prestigio: 2 }, mood: { joy: 8 }, xp: 12 }, goto: 'varanda', reply: 'É a dança mais estranha da história de Castelmar: três pessoas, um passo errado a cada compasso, e duas damas que acabam rindo uma da outra. Isabelle esconde o rosto. A corte vai falar disso por um ano.' },
        ],
      },
      varanda: {
        text: (s) => { const f = String(s.flags.primeiraDanca ?? 'elenora'); return ({
          elenora: 'Na varanda, longe da música, Elenora tira os sapatos e os segura na mão. "Meu pai me mandou dançar com o senhor como quem assina um contrato." Ela olha para a lua. "Eu dancei como quem esquece que existe contrato. É muito pior, sabia? Agora eu quero."',
          rhoswen: 'Na varanda, Rhoswen desfaz o penteado com as duas mãos, aliviada. "Dançar é pior que guerra. Na guerra ninguém olha para os seus pés." Ela se vira para você, perto demais. "Mas você olhou para o meu rosto a música inteira. Achei que ia ser difícil desviar. Foi impossível."',
          isolde: 'Na varanda, Isolde coloca a máscara de raposa em você, não nela. "Agora ninguém sabe quem é o rei." Ela se aproxima até o leque encostar no seu peito. "Então me diga uma coisa que um rei não diria. Uma só. Eu guardo."',
          sigrid: 'Na varanda, Sigrid respira o ar frio como quem volta para casa. "No norte, depois de uma dança assim, o homem dá um presente à mulher. Ou uma resposta." Ela não olha para você. "Eu não quero presente."',
        } as Record<string, string>)[f]; },
        choices: [
          { label: 'Beijá-la', sub: 'Depois de perguntar com os olhos', color: 'roxo', icon: 'coracao', say: 'Posso?', effects: { run: (s) => { const f = String(s.flags.primeiraDanca ?? 'elenora'); s.rel[f] = (s.rel[f] ?? 0) + 14; s.flags[`beijo_${f}`] = true; }, mood: { joy: 14, stress: -8 }, xp: 14 }, reply: 'Ela responde antes de você terminar a palavra. Lá dentro, a música recomeça. Aqui fora, ninguém ouve.' },
          { label: 'Dizer o que sente', sub: 'Sinceridade', color: 'verde', icon: 'coracao', say: 'Eu vim a este baile para escolher uma rainha. Passei a noite inteira esquecendo disso sempre que olhava para você. Não sei o que isso faz de mim como rei. Como homem, eu sei.', effects: { run: (s) => { const f = String(s.flags.primeiraDanca ?? 'elenora'); s.rel[f] = (s.rel[f] ?? 0) + 10; s.bonds[f] = { ...(s.bonds[f] ?? { amor: 0, confianca: 30, ressentimento: 0, medo: 0, lealdade: 40 }), amor: Math.min(100, (s.bonds[f]?.amor ?? 0) + 12) }; }, xp: 14 }, reply: 'Ela fica em silêncio por tanto tempo que você acha que errou. Depois ela pega sua mão e a coloca sobre o próprio coração, que está disparado. "Isso responde?"' },
          { label: 'Voltar ao salão', sub: 'Prudência', color: 'azul', icon: 'seta', say: 'Vamos voltar. Se ficarmos mais um minuto aqui, a corte inventa um casamento antes de mim.', effects: { res: { prestigio: 1 }, xp: 6 }, reply: 'Ela sorri de lado. "Covarde." Mas segura o seu braço o caminho inteiro de volta.' },
        ],
      },
    },
    ignored: { text: 'O Baile das Pretendentes aconteceu sem o rei. Quatro damas dançaram com embaixadores e sobrinhos. Isabelle não fala com você até o dia seguinte.', rel: { isabelle: -10, elenora: -8, rhoswen: -8, isolde: -8, sigrid: -8 }, res: { prestigio: -5 } },
  },
  // ======================= DIA 17: A FESTA DA COLHEITA =======================
  {
    id: 'festa_colheita', speaker: 'marta', topic: 'A Festa da Colheita', kind: 'encontro', domain: 'pessoal', day: 17, hours: 2, talk: false,
    place: { room: 'patio', hour: 16, spot: 'portao', duration: 2, title: 'A Festa da Colheita (o povo no pátio)' },
    big: { title: 'A Festa da Colheita', teaser: ['Carroças de trigo e maçãs começam a chegar ao portão. Uma vez por ano, o povo entra no castelo.', 'Na cidade dizem que um homem com o rosto do rei velho vai aparecer na festa. Ninguém sabe se é boato.', 'Amanhã, às 16h, a Festa da Colheita no pátio. O povo vai ver o rei de perto. E o rei vai ver o povo.'] },
    nodes: {
      start: {
        text: (s) => `O portão está aberto e o pátio cheira a pão, maçã e suor. Camponeses que nunca viram um rei de perto se acotovelam para tocar a sua capa. Marta, da vila, empurra uma menina de tranças para a frente: ela segura uma coroa de trigo trançado, grande demais para a sua cabeça. ${s.flags.cedricConhecido ? 'Do outro lado do pátio, alguém grita "Viva o Leão de Lys!" e meia dúzia de vozes respondem. Cedric está lá, sorrindo, com uma caneca na mão.' : 'Pimenta faz malabares com três maçãs e uma galinha.'}`,
        choices: [
          { label: 'Ajoelhar para receber a coroa de trigo', sub: 'Povo +6', color: 'verde', icon: 'coracao', say: 'Venha, pequena. Um rei se abaixa para receber a coroa que o povo faz com as próprias mãos. Esta vale mais que a de ouro.', effects: { res: { povo: 6, prestigio: 2 }, rel: { marta: 8 }, mood: { joy: 10 }, xp: 12 }, reply: 'Você se ajoelha na palha. A menina coloca a coroa de trigo na sua cabeça, torta, e o pátio inteiro vem abaixo. Pelo resto da festa, ninguém lembra que existe outro nome para gritar.' },
          { label: 'Discursar ao povo', sub: 'Palavras para lembrar', color: 'azul', icon: 'coroa', say: 'Povo de Castelmar! Este castelo foi construído com o trigo de vocês, a madeira de vocês e o suor de vocês. Enquanto eu for rei, o portão abre todo ano. E o celeiro também.', effects: { res: { povo: 4, prestigio: 4 }, flags: { promessaCeleiro: true }, xp: 12 }, reply: 'A multidão aplaude. Alguém grita "e o preço do pão?", e outros o calam. Você sabe que vai ouvir essa promessa de volta.' },
          { label: 'Ir até Cedric', sub: 'Encarar o rival em público', color: 'vermelho', icon: 'espadas', req: { test: (s) => !!s.flags.cedricConhecido, label: 'ter conhecido Cedric' }, say: 'Abram caminho. Quero brindar com o homem que o povo chama de Leão. Um brinde, irmão, na frente de todos. Ao reino.', goto: 'cedric' },
        ],
      },
      cedric: {
        text: 'O povo abre um corredor. Cedric levanta a caneca devagar, sem pressa, e você percebe que ele esperava por isso. "Ao reino", ele repete, alto. Depois, só para você: "Eles gostam de mim porque eu pareço com o nosso pai. Gostam de você porque você é o rei. Qual dos dois dura mais, irmão?"',
        choices: [
          { label: 'Dividir a caneca', sub: 'Mostrar paz · povo +4', color: 'verde', icon: 'aperto', say: 'Os dois duram, se não formos tolos. Beba, Cedric, e deixe o povo ver os filhos do mesmo pai na mesma caneca.', effects: { res: { povo: 4 }, rel: { cedric: 10 }, xp: 14 }, reply: 'Vocês bebem da mesma caneca. O povo não sabe mais para quem gritar, então grita para os dois. Isabelle, na janela, fecha a cortina.' },
          { label: 'Lembrá-lo de quem é o rei', sub: 'Autoridade · Cedric −10', color: 'vermelho', icon: 'coroa', say: 'O rei dura mais, Cedric. Porque o rei é quem decide quanto tempo os outros duram. Aproveite a festa.', effects: { res: { prestigio: 3 }, rel: { cedric: -10 }, mood: { anger: 6 }, xp: 12 }, reply: 'Cedric sorri e faz uma reverência exagerada, para o povo ver. Metade ri do rei. A outra metade ri dele. Você não sabe qual metade é maior.' },
        ],
      },
    },
    ignored: { text: 'O povo esperou o rei na Festa da Colheita até o sol se pôr. Ele não veio.', res: { povo: -6 }, rel: { marta: -6 } },
  },
];

// A primeira dança: as escolhas dependem de quem o rei já conheceu
export function bailChoices(s: GameState): Choice[] {
  const list = SUITORS.filter((id) => met(s, id) && !s.flags[`recusou_${id}`]).map((id): Choice => ({
    label: `Dançar primeiro com ${NAME[id]}`, sub: `${NAME[id]} +12 · as outras vão notar`, color: id === 'elenora' ? 'azul' : id === 'rhoswen' ? 'vermelho' : id === 'isolde' ? 'verde' : 'roxo', icon: 'coracao',
    say: ({ elenora: 'Lady Elenora. Esta música é sua, se me aceitar. E se o seu pai perguntar, diga que foi o rei quem insistiu.', rhoswen: 'Lady Rhoswen. Sei que prefere uma espada, mas hoje me contento em ser o seu inimigo na pista de dança.', isolde: 'Princesa. Vamos ver quem conduz: o rei de Castelmar ou a raposa de Véridian.', sigrid: 'Sigrid. No norte, vocês dançam? Então me ensine. Aqui, todos vão olhar. Deixe olharem.' } as Record<string, string>)[id],
    effects: { rel: { [id]: 12, ...others(id) }, flags: { primeiraDanca: id }, xp: 10 }, goto: 'ciume',
  }));
  if (!list.length) return [{ label: 'Dançar com a rainha-mãe', sub: 'Nenhuma pretendente conhecida', color: 'azul', icon: 'coroa', say: 'Mãe, a primeira dança é sua. Como sempre foi.', effects: { rel: { isabelle: 8 }, xp: 6 }, reply: 'Isabelle ri, e por uma música inteira você volta a ter oito anos.' }];
  return list;
}
