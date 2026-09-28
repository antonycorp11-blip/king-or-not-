import type { Choice, GameEvent, GameState, HouseId } from '../../types';
import { computeEconomy } from '../../engine/economy';
import { GOODS, KINGDOM_PROVINCES, PROVINCES } from '../realm';

// Conversas de convocação: o rei chama alguém ao salão para resolver uma tensão.
const LORDS: Record<string, { house: HouseId; name: string; hi: string[]; mid: string[]; lo: string[]; ask: string; gift: string }> = {
  gaspard: {
    house: 'valmont', name: 'Gaspard',
    hi: ['Majestade! Que prazer ser chamado. Espero que seja sobre negócios. É sempre sobre negócios, não é?'],
    mid: ['Majestade. Deixei três navios esperando para atender seu chamado. Espero que valha a maré perdida.'],
    lo: ['Majestade. Vim porque o senhor chamou, não porque quis. Os Valmont não esquecem quem lhes custa dinheiro.'],
    ask: 'Uma frota a serviço da coroa por uma semana', gift: 'um cofre de moedas de Véridian',
  },
  brandt: {
    house: 'drakon', name: 'Brandt',
    hi: ['Rei! Cheguei a cavalo, sem parar. Os Drakon atendem quando o rei chama. Diga o que precisa.'],
    mid: ['Estou aqui. Fale rápido, Majestade. A fronteira não se vigia sozinha.'],
    lo: ['Vim armado, Majestade. Não por desrespeito. Por hábito. E porque não confio mais nesta corte.'],
    ask: 'Cem lanceiros Drakon para o exército real', gift: 'um barril de hidromel do Vale',
  },
  aveline: {
    house: 'seren', name: 'Aveline',
    hi: ['Majestade. Os bosques me disseram que o senhor chamaria. Eles raramente erram.'],
    mid: ['Vim, Majestade. Os carvalhos não gostam de viagens, e eu também não.'],
    lo: ['Estou aqui, Majestade. Diga o que quer e me deixe voltar para as minhas árvores. Elas, ao menos, não me traem.'],
    ask: 'Grãos dos Bosques para os celeiros reais', gift: 'um ramo do carvalho mais antigo do reino',
  },
  otho: {
    house: 'montclair', name: 'Otho',
    hi: ['Majestade, que honra. Trouxe uma taça de prata. Não, não precisa mandar provar o vinho. Desta vez.'],
    mid: ['Majestade. Chamou e eu vim, como sempre. Os Montclair são... pontuais. Entre outras virtudes.'],
    lo: ['Majestade. Estou aqui. Não pense que não sei o que dizem de mim nesta corte. Pergunte o que quer perguntar.'],
    ask: 'Prata das minas de Cinzel para o tesouro', gift: 'uma caixinha de prata trabalhada',
  },
};

function grievance(s: GameState, h: HouseId): { text: string; fix?: Choice } {
  const prov = KINGDOM_PROVINCES.find((p) => PROVINCES[p].house === h)!;
  const eco = computeEconomy(s);
  const short = eco.shortages.filter((x) => x.province === prov);
  if (s.taxes[h] === 'alto')
    return { text: `Os seus coletores estão arrancando o couro da minha gente. Impostos altos, Majestade, e nenhuma explicação.`, fix: { label: 'Baixar os impostos da sua casa', sub: 'Impostos baixos', color: 'verde', icon: 'moedas', effects: { run: (st) => (st.taxes[h] = 'baixo'), loyalty: { [h]: 10 }, xp: 10 }, reply: 'Um alívio visível. "Isso eu vou contar aos meus vassalos, Majestade."' } };
  if (short.length) {
    const g = GOODS[short[0].good].name.toLowerCase();
    return { text: `Falta ${g} nas minhas terras, Majestade. Meu povo pergunta por que o rei deixa outros prosperarem enquanto nós passamos necessidade.`, fix: { label: `Prometer ${g} por rota comercial`, sub: 'Ir à tela de Províncias depois', color: 'verde', icon: 'aperto', effects: { loyalty: { [h]: 5 }, xp: 10 }, reply: `"Palavras bonitas. Quero ver a primeira carroça de ${g} chegar." Resolva em Províncias, na ficha, com "Trazer de…".` } };
  }
  if ((s.flags.armyAt || 'castelmar') === prov && s.loyalty[h] < 0)
    return { text: 'Há soldados reais acampados nas minhas terras, comendo meus grãos e olhando minhas filhas. Isso é proteção ou ocupação?', fix: { label: 'Retirar as tropas para a capital', sub: 'O exército volta', color: 'verde', icon: 'escudo', effects: { run: (st) => (st.flags.armyAt = 'castelmar'), loyalty: { [h]: 10 }, xp: 10 }, reply: 'As tropas levantam acampamento naquela tarde. O lorde relaxa os ombros pela primeira vez.' } };
  const spouseAnger: Partial<Record<HouseId, string[]>> = { drakon: ['elenora', 'sigrid', 'isolde'], valmont: ['rhoswen', 'isolde'], seren: ['isolde', 'sigrid'], montclair: ['elenora'] };
  if (s.spouse && spouseAnger[h]?.includes(s.spouse))
    return { text: 'A rainha que o senhor escolheu não tem nenhum amor pela minha casa. E todos sabem que rainhas sussurram no ouvido do rei à noite.', fix: { label: 'Dar à sua casa um lugar no conselho da rainha', sub: 'Custa 6 de Influência', color: 'azul', icon: 'coroa', req: { influencia: 6 }, effects: { res: { influencia: -6 }, loyalty: { [h]: 12 }, xp: 10 }, reply: '"Um lugar à mesa da rainha." O lorde sorri devagar. "Isso muda as coisas."' } };
  if (s.loyalty[h] < 0) return { text: 'O senhor não ouve minha casa. Mandamos pedidos, cartas, emissários. Voltam sem resposta. Uma casa ignorada começa a procurar quem a ouça.' };
  return { text: 'Nada de grave, Majestade. Só o de sempre: impostos, vizinhos invejosos e um clima que não ajuda. Mas agradeço por perguntar. Poucos reis perguntam.' };
}

function lordEvent(id: string): GameEvent {
  const L = LORDS[id];
  const h = L.house;
  const mood = (s: GameState) => (s.loyalty[h] >= 25 ? 'hi' : s.loyalty[h] >= -10 ? 'mid' : 'lo');
  return {
    id: `conv_${id}`, speaker: id, topic: 'Convocado pelo rei', kind: 'audiencia', lasts: 1,
    nodes: {
      start: {
        text: (s) => L[mood(s)][0],
        choices: [
          { label: 'O que o incomoda?', sub: 'Ouvir a queixa', color: 'azul', icon: 'balao', goto: 'queixa' },
          { label: 'Pedir apoio da sua casa', sub: 'Só com lealdade 25+', color: 'dourado', icon: 'aperto', req: { test: (s) => s.loyalty[h] >= 25, label: 'Lealdade da casa abaixo de 25' }, goto: 'apoio' },
          { label: 'Lembrar a quem ele deve lealdade', sub: 'Intimidar', color: 'vermelho', icon: 'coroa', effects: { loyalty: { [h]: -6 }, res: { prestigio: 4 }, xp: 8 }, reply: `${L.name} escuta em silêncio. "Entendido, Majestade." Ele entendeu. E vai lembrar disso quando for conveniente.` },
          { label: 'Oferecer um presente', sub: '−150 de ouro', color: 'verde', icon: 'moedas', req: { ouro: 150 }, effects: { res: { ouro: -150 }, loyalty: { [h]: 9 }, rel: { [id]: 6 }, xp: 8 }, reply: `${L.name} aceita o presente e, em troca, deixa ${L.gift}. "Entre amigos, Majestade."` },
        ],
      },
      queixa: {
        text: (s) => grievance(s, h).text,
        choices: [], // montadas dinamicamente (ver dynamicSummonChoices)
      },
      apoio: {
        text: `${'"'}Apoio?${'"'} O lorde pensa. ${'"'}Os amigos do rei são amigos da minha casa. O que o senhor precisa?${'"'}`,
        choices: [
          { label: L.ask, sub: 'Custa lealdade da casa', color: 'dourado', icon: 'coroa', effects: { loyalty: { [h]: -8 }, run: (s) => { if (h === 'drakon') s.res.exercito += 100; else if (h === 'seren') s.res.povo = Math.min(100, s.res.povo + 6); else s.res.ouro += 250; }, xp: 10 }, reply: 'Feito. O lorde cumpre, mas anota a dívida num livro que você nunca vai ver.' },
          { label: 'Só a amizade da sua casa', sub: 'Nada material', color: 'verde', icon: 'coracao', effects: { loyalty: { [h]: 4 }, rel: { [id]: 6 }, xp: 8 }, reply: '"Amizade é mais cara que ouro, Majestade. E mais rara."' },
        ],
      },
    },
    ignored: { text: `${L.name} veio ao chamado e esperou o dia inteiro. Voltou humilhado.`, loyalty: { [h]: -10 }, rel: { [id]: -8 } },
  };
}

export function dynamicSummonChoices(eventId: string, node: string, s: GameState): Choice[] | null {
  if (!eventId.startsWith('conv_') || node !== 'queixa') return null;
  const id = eventId.slice(5);
  const L = LORDS[id];
  if (!L) return null;
  const h = L.house;
  const g = grievance(s, h);
  return [
    ...(g.fix ? [g.fix] : []),
    { label: 'Prometer resolver', sub: 'Custa 4 de Influência', color: 'azul', icon: 'aperto', req: { influencia: 4 }, effects: { res: { influencia: -4 }, loyalty: { [h]: 6 }, xp: 8 }, reply: '"Promessas de rei valem ouro. Ou chumbo. Veremos qual das duas."' },
    { label: 'Compensar com ouro', sub: '−150 de ouro', color: 'dourado', icon: 'moedas', req: { ouro: 150 }, effects: { res: { ouro: -150 }, loyalty: { [h]: 8 }, xp: 8 }, reply: 'O ouro não resolve o problema, mas faz o problema parecer menor.' },
    { label: 'A coroa tem outras prioridades', sub: 'Firmeza', color: 'vermelho', icon: 'coroa', effects: { loyalty: { [h]: -5 }, res: { prestigio: 2 }, xp: 6 }, reply: 'O lorde faz uma reverência curta demais. Ele volta para casa com a queixa inteira, e mais uma.' },
  ];
}

// Conversas com a família, pretendentes e gente da corte (tom mais leve, às vezes ácido)
const CHATS: GameEvent[] = [
  {
    id: 'conv_isabelle', speaker: 'isabelle', topic: 'Um chá com a mãe', kind: 'familia', lasts: 1,
    nodes: {
      start: {
        text: (s) => (s.rel.isabelle >= 30 ? 'Você me chamou? Que milagre. Da última vez que um rei me chamou, era seu pai querendo saber onde tinha deixado a coroa.' : 'Chamou, Majestade? Achei que tinha esquecido que tinha mãe. Os reis costumam esquecer.'),
        choices: [
          { label: 'Pedir conselho sobre os lordes', sub: 'Ela conhece todos', color: 'azul', icon: 'olho', effects: { rel: { isabelle: 5 } }, goto: 'lordes' },
          { label: 'Só queria conversar', sub: 'Carinho', color: 'verde', icon: 'coracao', effects: { rel: { isabelle: 10 }, xp: 8 }, reply: 'Vocês tomam chá em silêncio por um tempo. Depois ela conta como seu pai caiu do cavalo tentando impressioná-la. É a primeira vez que você a vê rir desde o funeral.' },
          { label: 'Perguntar sobre os segredos da corte', sub: 'Ela sabe de tudo', color: 'roxo', icon: 'mascara', effects: { res: { influencia: 3 }, rel: { isabelle: 3 }, flags: { segredoOtho: true }, xp: 10 }, reply: '"Otho envenenou o próprio irmão para herdar as minas. Nunca provaram. Nunca precisaram." Ela toma um gole de chá. "Mais açúcar?"' },
        ],
      },
      lordes: {
        text: (s) => {
          const worst = (['valmont', 'drakon', 'seren', 'montclair'] as HouseId[]).sort((a, b) => s.loyalty[a] - s.loyalty[b])[0];
          const name = { valmont: 'Gaspard', drakon: 'Brandt', seren: 'Aveline', montclair: 'Otho' }[worst];
          return `"${name} é o problema, meu filho. Todo mundo vê, menos você. Um convite para jantar, um título honorário, uma filha bem casada... as casas se compram com orgulho, não com ouro."`;
        },
        choices: [
          { label: 'Seguir o conselho', sub: '+Influência', color: 'azul', icon: 'aperto', effects: { res: { influencia: 3 }, rel: { isabelle: 5 }, xp: 8 }, reply: '"Finalmente um rei que escuta a mãe. Seu pai levou vinte anos."' },
          { label: '"E você, mãe, se compra com o quê?"', sub: 'Ousadia', color: 'roxo', icon: 'mascara', effects: { rel: { isabelle: -2 }, xp: 10 }, reply: 'Ela sorri como uma raposa velha. "Com netos, Majestade. Netos."' },
        ],
      },
    },
  },
  {
    id: 'conv_lucas', speaker: 'lucas', topic: 'O irmão foi chamado', kind: 'familia', lasts: 1,
    nodes: {
      start: {
        text: 'Você me chamou?! Eu não fiz nada! Quer dizer... depende do que você ouviu. Se foi sobre o falcão, foi o falcão.',
        choices: [
          { label: 'Chamei só para treinar esgrima com você', sub: 'Tempo de irmãos', color: 'verde', icon: 'espadas', effects: { rel: { lucas: 14 }, res: { moral: 2 }, xp: 8 }, reply: 'Vocês lutam no pátio até escurecer. Lucas ganha uma vez. Você deixa. Ele sabe. Nenhum dos dois fala nada.' },
          { label: 'Pedir que ele espione a corte', sub: 'Olhos jovens', color: 'roxo', icon: 'mascara', effects: { rel: { lucas: 6 }, res: { influencia: 2 }, flags: { lucasEspiao: true }, xp: 10 }, reply: 'Lucas fica radiante. Nos dias seguintes você recebe relatórios detalhados: "Otho come de boca aberta." Nem tudo é útil.' },
          { label: 'Dar a ele uma responsabilidade real', sub: 'Mensageiro do rei', color: 'azul', icon: 'pergaminho', effects: { rel: { lucas: 10, isabelle: -3 }, flags: { lucasDiplomata: true }, xp: 10 }, reply: 'Lucas leva uma carta real aos Seren e volta com a resposta e um arranhão de galho. "Foi uma árvore sagrada, não conta pra mãe."' },
        ],
      },
    },
  },
  {
    id: 'conv_aldric', speaker: 'aldric', topic: 'Uma conversa franca', kind: 'conselho', lasts: 1,
    nodes: {
      start: {
        text: 'Majestade. Se me chamou fora da reunião do conselho, ou é muito importante ou o senhor está entediado. Espero, sinceramente, que seja importante.',
        choices: [
          { label: 'Quem é o maior perigo para a coroa?', sub: 'Análise política', color: 'azul', icon: 'olho', effects: { res: { influencia: 2 }, xp: 10 }, goto: 'perigo' },
          { label: 'Estou entediado', sub: 'Sinceridade', color: 'roxo', icon: 'mascara', effects: { rel: { aldric: 3 }, xp: 6 }, reply: 'Aldric suspira. "Então leia, Majestade. O tédio de hoje é a ignorância de amanhã." Ele deixa três livros na mesa. Todos grossos.' },
        ],
      },
      perigo: {
        text: (s) => (s.flags.cedricConhecido ? '"Cedric de Lys. Um bastardo com rosto de rei é mais perigoso que um exército. Exércitos se derrotam; lendas, não."' : s.res.povo < 40 ? '"O povo, Majestade. Lordes conspiram devagar. O povo com fome age depressa."' : '"O senhor mesmo, Majestade. Um rei jovem demais confia rápido demais. Eu incluso."'),
        choices: [
          { label: 'Agradecer a franqueza', sub: 'Confiança', color: 'azul', icon: 'aperto', effects: { rel: { aldric: 8 }, xp: 8 }, reply: '"Franqueza é o único presente que um velho ainda pode dar."' },
          { label: '"E se o perigo for você, Aldric?"', sub: 'Testar o chanceler', color: 'vermelho', icon: 'olho', effects: { rel: { aldric: -4 }, res: { prestigio: 2 }, xp: 10 }, reply: 'Aldric sorri pela primeira vez em semanas. "Então o senhor está aprendendo. Mas não, Majestade. Eu sou velho demais para trair. Dá muito trabalho."' },
        ],
      },
    },
  },
  {
    id: 'conv_pimenta', speaker: 'pimenta', topic: 'O bobo foi chamado', kind: 'audiencia', lasts: 1,
    nodes: {
      start: {
        text: 'Majestade me chamou! Finalmente alguém nesta corte percebeu que o único homem honesto do castelo usa guizos. O que deseja? Uma piada? Uma verdade? Aqui as duas custam o mesmo.',
        choices: [
          { label: 'Uma verdade', sub: 'Coragem', color: 'azul', icon: 'olho', goto: 'verdade' },
          { label: 'Uma piada', sub: 'Alívio', color: 'verde', icon: 'balao', effects: { res: { moral: 2, povo: 1 }, rel: { pimenta: 5 }, xp: 5 }, reply: '"Por que Otho não joga cartas? Porque ninguém deixa ele embaralhar o próprio veneno." O salão inteiro segura o riso. Menos o mordomo, que ri alto e é demitido.' },
        ],
      },
      verdade: {
        text: (s) => (s.res.ouro < 200 ? '"O tesouro está tão vazio que Corvin conta as moedas duas vezes para ter companhia."' : s.res.povo < 45 ? '"A cidade baixa canta músicas sobre o senhor. Nenhuma rima com \'amado\'."' : Object.values(s.loyalty).some((v) => v < -20) ? '"Um dos seus lordes afia a espada toda vez que ouve seu nome. Eu diria qual, mas gosto do meu pescoço."' : '"A verdade, Majestade? O senhor está se saindo melhor do que todos apostaram. Eu perdi três moedas por isso."'),
        choices: [
          { label: 'Rir', sub: 'O rei aguenta', color: 'verde', icon: 'coracao', effects: { rel: { pimenta: 8 }, res: { prestigio: 1 }, xp: 8 }, reply: 'Um rei que ri da verdade é um rei difícil de derrubar, diz o bobo, e faz uma reverência exagerada.' },
          { label: 'Mandar ele calar a boca', sub: 'Orgulho ferido', color: 'vermelho', icon: 'coroa', effects: { rel: { pimenta: -8 }, xp: 5 }, reply: '"Calar, Majestade? O senhor tem uma corte inteira para isso. Eu sou o único que fala."' },
        ],
      },
    },
  },
  {
    id: 'conv_marta', speaker: 'marta', topic: 'A porta-voz do povo', kind: 'audiencia', lasts: 1,
    nodes: {
      start: {
        text: (s) => (s.res.povo >= 60 ? 'Majestade! A vila inteira queria vir, mas eu disse que o castelo não cabia. O povo está contente, sabe? Pela primeira vez em anos.' : 'Majestade. A cidade baixa está com raiva. Eu vim, mas não sei se as pessoas vão gostar de saber que eu vim.'),
        choices: [
          { label: 'O que o povo mais precisa?', sub: 'Ouvir', color: 'azul', icon: 'povo', goto: 'precisa' },
          { label: 'Pedir que ela acalme a cidade', sub: 'Custa 4 de Influência', color: 'verde', icon: 'aperto', req: { influencia: 4 }, effects: { res: { influencia: -4, povo: 6 }, rel: { marta: 4 }, xp: 8 }, reply: 'Marta sobe num caixote no mercado e fala por vinte minutos. O povo resmunga, mas volta para casa.' },
        ],
      },
      precisa: {
        text: (s) => (s.taxes.coroa === 'alto' ? '"Impostos menores, Majestade. Ninguém consegue pagar o pão e o coletor no mesmo mês."' : s.laws.includes('Carta dos Direitos Comuns') ? '"Pão mais barato. A Carta nos deu dignidade, agora precisamos de farinha."' : '"Que ninguém seja preso sem julgamento. Os homens dos lordes levam quem querem."'),
        choices: [
          { label: 'Baixar os impostos da capital', sub: 'Menos renda, mais povo', color: 'verde', icon: 'moedas', effects: { run: (s) => (s.taxes.coroa = 'baixo'), res: { povo: 8 }, rel: { marta: 8 }, xp: 10 }, reply: 'Marta sai correndo para contar. Em uma hora, a cidade inteira sabe.' },
          { label: 'Prometer pensar nisso', sub: 'Adiar', color: 'dourado', icon: 'ampulheta', effects: { rel: { marta: -3 }, xp: 5 }, reply: '"O povo já ouviu muito \'vou pensar\', Majestade."' },
        ],
      },
    },
  },
  {
    id: 'conv_tobias', speaker: 'tobias', topic: 'O mercador foi chamado', kind: 'audiencia', lasts: 1,
    nodes: {
      start: {
        text: 'Majestade! Um rei que chama um mercador ou quer dinheiro, ou quer dinheiro emprestado. Qual dos dois?',
        choices: [
          { label: 'Quero saber como anda o mercado', sub: 'Informação', color: 'azul', icon: 'olho', effects: { res: { influencia: 2 }, xp: 8 }, reply: '"O vinho sobe, o ferro desce e Gaspard compra tudo que pode antes da guerra. Ele sabe algo que nós não sabemos, Majestade."' },
          { label: 'Quero um favor da Guilda', sub: '+200 ouro, a Guilda cobra depois', color: 'dourado', icon: 'moedas', effects: { res: { ouro: 200 }, rel: { tobias: -4 }, schedule: [{ id: 'guilda_cobra_favor', in: 5 }], xp: 8 }, reply: '"Favores da Guilda são como pão: frescos hoje, caros amanhã." Ele assina um papel. Você também.' },
        ],
      },
    },
  },
];

// Pretendentes: convocar é cortejar
const SUITOR_CHATS: GameEvent[] = [
  ['elenora', 'Elenora chega corada. "Meu pai achou que era um pedido de casamento. Eu disse que provavelmente era sobre taxas portuárias."'],
  ['rhoswen', 'Rhoswen chega com lama nas botas. "Vim do treino. Se for para dançar, vou embora. Se for para cavalgar, fico."'],
  ['isolde', 'Isolde entra devagar, abanando o leque. "Chamou? Uma dama de Véridian conta quantas vezes é chamada. Esta é a primeira. Continue."'],
  ['sigrid', 'Sigrid para na porta. "Você me chamou. Em Norhelm, quando um jarl chama uma mulher ao salão, é para anunciar um casamento ou uma execução."'],
].map(([id, text]) => ({
  id: `conv_${id}`, speaker: id, topic: 'Um convite do rei', kind: 'casamento' as const, lasts: 1,
  nodes: {
    start: {
      text,
      choices: [
        { label: 'Um passeio pelos jardins', sub: 'Romance', color: 'verde' as const, icon: 'coracao', effects: { rel: { [id]: 12 }, xp: 8 }, reply: 'O passeio dura mais do que o protocolo permite. Os jardineiros fingem não ver.' },
        { label: 'Perguntar o que ela quer da vida', sub: 'Conhecê-la', color: 'azul' as const, icon: 'balao', effects: { rel: { [id]: 8 }, res: { influencia: 1 }, xp: 10 }, reply: 'A resposta surpreende você. Não é o que a casa dela quer. É o que ela quer.' },
        { label: 'Falar de política', sub: 'Pragmatismo', color: 'dourado' as const, icon: 'pergaminho', effects: { rel: { [id]: 2 }, res: { influencia: 3 }, xp: 8 }, reply: 'Ela entende mais de política do que metade do seu conselho. Isso é uma qualidade ou um aviso.' },
      ],
    },
  },
}));

export const SUMMON_EVENTS: GameEvent[] = [...Object.keys(LORDS).map(lordEvent), ...CHATS, ...SUITOR_CHATS];
