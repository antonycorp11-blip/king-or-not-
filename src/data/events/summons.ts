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

// Convocar uma pretendente abre uma conversa própria. Cada uma reage ao histórico
// e oferece mais de uma maneira de se aproximar (ou se afastar).
const SUITOR_CHATS: GameEvent[] = [
  {
    id: 'conv_elenora', speaker: 'elenora', topic: 'Uma conversa com Elenora', kind: 'casamento', lasts: 1,
    nodes: {
      start: {
        text: (s) => s.spouse === 'elenora'
          ? '"Um convite formal do meu marido?" Elenora ri. "Espero que seja para falar de algo que não caiba em ata. Passei a manhã lutando com as contas de meu pai."'
          : s.flags.elenoraAutonomia
            ? '"Você me chamou sem pedir autorização ao meu pai. Começamos bem." Ela esconde um sorriso. "Diga: quer a minha companhia ou a frota dos Valmont?"'
            : '"Meu pai achou que era sobre taxas portuárias. Eu disse que não se pode cobrar imposto sobre uma conversa. Ele perguntou: por quê?"',
        choices: [
          { label: 'Quero ouvir seus planos', sub: 'Para além da Casa Valmont', color: 'azul', icon: 'balao', goto: 'planos', tension: -6 },
          { label: 'Roubei uma hora só para nós', sub: 'Fugir dos escribas', color: 'verde', icon: 'coracao', goto: 'passeio', tension: -10 },
          { label: 'Quanto vale sua frota?', sub: 'Negociação sem disfarce', color: 'dourado', icon: 'moedas', goto: 'frota', tension: 12 },
        ],
      },
      planos: {
        text: '"Abrir os cais a pequenos capitães. Meu pai diz que a concorrência é uma doença. Eu digo que monopólio também." Ela gira um anel no dedo. "Quando era menina, desenhava mapas. Depois todos começaram a desenhar meu futuro por mim."',
        choices: [
          { label: 'Mostre-me seus mapas', sub: 'Interesse verdadeiro', color: 'verde', icon: 'olho', effects: { rel: { elenora: 11 }, flags: { elenoraMapas: true }, xp: 10 }, reply: 'Ela abre os mapas sobre o chão para caber o litoral inteiro. Por uma hora fala como capitã, não como filha. Ao sair, deixa um deles com você.' },
          { label: 'Seu pai teme perder dinheiro', sub: 'Entender o conflito', color: 'azul', icon: 'aperto', effects: { rel: { elenora: 6 }, res: { influencia: 1 }, xp: 8 }, reply: '"Ele teme perder controle", corrige Elenora. "Dinheiro ele consegue de volta. Controle exige uma pessoa disposta a obedecer."' },
          { label: 'Concorrência enfraquece Valmont', sub: 'Dar razão a Gaspard', color: 'vermelho', icon: 'coroa', effects: { rel: { elenora: -8, gaspard: 3 }, xp: 5 }, reply: '"Você e ele acabariam amigos." Ela recolhe os mapas antes que a conversa vire a reunião de negócios que temia.' },
        ],
      },
      passeio: {
        text: 'Elenora aceita o caminho pelos pomares, longe dos lordes. "Tem três damas fingindo que não nos seguem. A de azul é paga por meu pai. A de verde, por sua mãe. A de branco escreve para as duas." Ela oferece o braço. "Vamos decepcioná-las ou dar assunto?"',
        choices: [
          { label: 'Desaparecer pelo portão de serviço', sub: 'Uma tarde sem plateia', color: 'roxo', icon: 'mascara', effects: { rel: { elenora: 13 }, res: { prestigio: -1 }, xp: 10 }, reply: 'Vocês dividem vinho barato num banco dos criados. "É melhor que o banquete inteiro do meu pai", ela diz. Desta vez não está sendo educada.' },
          { label: 'Pedir um beijo, diante delas', sub: 'Se ela quiser', color: 'verde', icon: 'coracao', req: { test: (s) => (s.rel.elenora ?? 0) >= 20, label: 'Elenora ainda não confia em você' }, effects: { rel: { elenora: 13 }, flags: { elenoraBeijo: true }, res: { prestigio: -1 }, xp: 12 }, reply: '"Quero." O beijo é breve, mas as três espiãs discordam sobre quanto durou. Elenora pergunta se você pretende cobrar ingresso da próxima vez.' },
          { label: 'Falar de política no passeio', sub: 'O rei não descansa', color: 'dourado', icon: 'pergaminho', effects: { rel: { elenora: -4 }, res: { influencia: 2 }, xp: 6 }, reply: '"Você conseguiu transformar um pomar em conselho." Ela aponta uma maçã. "Ao menos aquela ainda não pediu cargo."' },
        ],
      },
      frota: {
        text: '"Quarenta navios, se contar os pequenos. Meu pai conta cinquenta quando quer impressionar e trinta quando chegam os impostos." Elenora cruza os braços. "Mas a pergunta é o que você acha que eu valho sem eles."',
        choices: [
          { label: 'Quero você sem contrato', sub: 'Romper a barganha', color: 'verde', icon: 'coracao', effects: { rel: { elenora: 12 }, flags: { elenoraAutonomia: true }, xp: 12 }, reply: '"Então não vamos contar navios hoje." Ela empurra a lista para longe e pergunta qual foi a última coisa que você fez só porque quis.' },
          { label: 'Quero uma parceira que os comande', sub: 'Poder compartilhado', color: 'azul', icon: 'aperto', effects: { rel: { elenora: 8 }, res: { influencia: 2 }, xp: 10 }, reply: '"Melhor resposta." Ela entrega uma rota comercial que Gaspard não sabe que existe. "Não diga que fui sentimental."' },
          { label: 'Seu pai faria um preço', sub: 'Frieza de mercador', color: 'vermelho', icon: 'moedas', effects: { rel: { elenora: -14, gaspard: 5 }, xp: 5 }, reply: '"E você o pagaria." A resposta sai calma. É isso que a torna pior.' },
        ],
      },
    },
  },
  {
    id: 'conv_rhoswen', speaker: 'rhoswen', topic: 'Uma conversa com Rhoswen', kind: 'casamento', lasts: 1,
    nodes: {
      start: {
        text: (s) => s.spouse === 'rhoswen'
          ? '"Outra audiência?" Rhoswen apoia o elmo na mesa. "Então vamos fingir que não jantamos juntos ontem. Fale como rei; depois fale como você."'
          : s.flags.rhoswenIgual
            ? '"Trouxe duas espadas de madeira. Antes que reclame: a segunda é para mim. Prometi não deixar você apanhar sozinho."'
            : '"Vim do treino. Se for para dançar, aviso que minhas botas têm lama. Se for para falar da fronteira, trago um mapa. Se for só para me olhar, pelo menos seja honesto."',
        choices: [
          { label: 'Treinar comigo?', sub: 'Ela respeita esforço', color: 'vermelho', icon: 'espadas', goto: 'treino', tension: 9 },
          { label: 'Conte algo que não contou ao pai', sub: 'Confiança fora do campo', color: 'verde', icon: 'coracao', goto: 'segredo', tension: -5 },
          { label: 'Que ameaça você teme de verdade?', sub: 'Além de Norhelm', color: 'azul', icon: 'olho', goto: 'medo', tension: 6 },
        ],
      },
      treino: {
        text: 'Rhoswen gira a espada e sorri. "Três golpes. Se me tocar, conto um segredo. Se não, você contará um." Ela avança antes de você terminar de aceitar. Os guardas fingem estar ocupados.',
        choices: [
          { label: 'Lutar sem truques', sub: 'Honra no pátio', color: 'azul', icon: 'escudo', effects: { rel: { rhoswen: 10 }, res: { moral: 2 }, xp: 10 }, reply: 'Ela vence por um golpe. "Seu segredo", exige. Você admite que temia perder. "Ótimo", ela diz. "Medo significa que prestou atenção."' },
          { label: 'Fingir tropeçar e beijá-la?', sub: 'Arriscar o ridículo', color: 'verde', icon: 'coracao', req: { test: (s) => (s.rel.rhoswen ?? 0) >= 20, label: 'Rhoswen ainda não confia em você' }, effects: { rel: { rhoswen: 13 }, flags: { rhoswenBeijo: true }, xp: 12 }, reply: 'Ela segura você antes da queda. "Péssima técnica", murmura, e aceita o beijo. Depois exige a revanche, mais séria que a primeira luta.' },
          { label: 'Mandar um guarda lutar por mim', sub: 'Esconder-se no posto', color: 'dourado', icon: 'coroa', effects: { rel: { rhoswen: -8 }, xp: 5 }, reply: '"Ótimo. O guarda tem mais coragem." Ela o derrota em dois movimentos e deixa a terceira espada para você guardar.' },
        ],
      },
      segredo: {
        text: '"Tenho um caderno." Ela fala tão baixo que você quase pede para repetir. "Escrevo o nome dos soldados que morreram sob meu comando. Meu pai memoriza vitórias. Alguém precisa memorizar gente."',
        choices: [
          { label: 'Me deixe ler com você', sub: 'Compartilhar o peso', color: 'verde', icon: 'livro', effects: { rel: { rhoswen: 13 }, flags: { rhoswenCaderno: true }, xp: 12 }, reply: 'Ela lê três nomes em voz alta. Você lembra os três quando ela volta dias depois. É o presente que ela não esperava.' },
          { label: 'São perdas inevitáveis', sub: 'Estratégia sem consolo', color: 'dourado', icon: 'escudo', effects: { rel: { rhoswen: -10 }, res: { prestigio: 1 }, xp: 5 }, reply: '"Inevitáveis não significa anônimas." Ela fecha o caderno. A conversa termina antes do horário.' },
          { label: 'Vou evitar a próxima batalha', sub: 'Promessa imprudente', color: 'azul', icon: 'aperto', effects: { rel: { rhoswen: 4 }, res: { influencia: -1 }, xp: 7 }, reply: '"Não prometa o impossível." Ela abre o caderno outra vez. "Prometa lembrar."' },
        ],
      },
      medo: {
        text: '"Que um dia a guerra acabe e eu não saiba viver em paz." Rhoswen tira uma luva devagar. "Norhelm eu sei enfrentar. Um jantar sem inimigos me deixa sem instruções."',
        choices: [
          { label: 'Podemos aprender juntos', sub: 'Futuro além da guerra', color: 'verde', icon: 'coracao', effects: { rel: { rhoswen: 12 }, xp: 11 }, reply: '"Talvez. Mas se o jantar tiver peixe, você explica qual garfo é arma e qual não é."' },
          { label: 'A guerra sempre voltará', sub: 'Realismo sombrio', color: 'vermelho', icon: 'espadas', effects: { rel: { rhoswen: -4 }, res: { moral: 1 }, xp: 6 }, reply: '"É o que meu pai diria. Eu esperava algo que não coubesse na boca dele."' },
          { label: 'Comece com este jantar', sub: 'Convite sem estratégia', color: 'azul', icon: 'balao', effects: { rel: { rhoswen: 8 }, xp: 9 }, reply: '"Aceito. Mas se alguém tocar alaúde por mais de dez minutos, declaro guerra ao alaúde."' },
        ],
      },
    },
  },
  {
    id: 'conv_isolde', speaker: 'isolde', topic: 'Uma conversa com Isolde', kind: 'casamento', lasts: 1,
    nodes: {
      start: {
        text: (s) => s.spouse === 'isolde'
          ? '"Um convite do rei para a rainha." Isolde fecha o leque. "Meu irmão chamaria isso de diplomacia. Eu chamaria de talvez você sentir minha falta."'
          : s.flags.isoldeSemMascara
            ? '"Hoje trouxe o leque, mas deixei a máscara." Ela o deposita sobre a mesa. "O que quer saber sem uma plateia?"'
            : '"Chamou? Uma dama de Véridian conta quantas vezes é chamada. Eu conto o que o anfitrião pergunta quando acha que não estou anotando."',
        choices: [
          { label: 'Jogar uma partida de xadrez', sub: 'Ela prefere riscos inteligentes', color: 'roxo', icon: 'coroa', goto: 'xadrez', tension: 5 },
          { label: 'Perguntar do irmão', sub: 'Família e dever', color: 'azul', icon: 'balao', goto: 'irmao', tension: 7 },
          { label: 'Pedir uma história de casa', sub: 'Véridian além dos tratados', color: 'verde', icon: 'coracao', goto: 'casa', tension: -7 },
        ],
      },
      xadrez: {
        text: '"Você tem dois movimentos para salvar a rainha." Isolde empurra o tabuleiro. "O rei está seguro, claro. Reis costumam estar." Ela observa sua mão mais que as peças.',
        choices: [
          { label: 'Sacrificar o rei para salvá-la', sub: 'Quebrar as regras', color: 'roxo', icon: 'mascara', effects: { rel: { isolde: 12 }, xp: 12 }, reply: '"É um movimento ilegal." Ela sorri. "Finalmente algo interessante." Ela o ensina a vencer sem pedir licença às peças.' },
          { label: 'Salvar ambos com um blefe', sub: 'Ela reconhecerá o truque', color: 'azul', icon: 'olho', effects: { rel: { isolde: 9 }, res: { influencia: 2 }, xp: 10 }, reply: 'Ela percebe o blefe e deixa você jogar. "Quero ver até onde vai antes de admitir." A partida dura até as velas acabarem.' },
          { label: 'Deixar a rainha cair', sub: 'Jogada fria', color: 'vermelho', icon: 'coroa', effects: { rel: { isolde: -9 }, res: { prestigio: 1 }, xp: 5 }, reply: '"Estratégico", ela concede. E não toca mais nas peças.' },
        ],
      },
      irmao: {
        text: '"Meu irmão me ensinou a negociar aos dez anos. Aos vinte, descobri que ele me ensinava porque pretendia negociar a mim." Ela ri sem humor. "Ele envia presentes quando quer desculpas. Esta semana enviou seis."',
        choices: [
          { label: 'Não precisa defendê-lo aqui', sub: 'Ela pode ser honesta', color: 'verde', icon: 'coracao', effects: { rel: { isolde: 12 }, flags: { isoldeIrmao: true }, xp: 12 }, reply: '"Não pretendo. Só não quero que use minha raiva como instrumento contra ele." É a primeira vez que ela pede algo sem oferecer nada em troca.' },
          { label: 'Os presentes são uma mensagem', sub: 'Ler a política', color: 'azul', icon: 'olho', effects: { rel: { isolde: 6 }, res: { influencia: 2 }, xp: 10 }, reply: '"Seis presentes para seis conselheiros seus. Exatamente." Ela parece aliviada por não ter de explicar o óbvio a mais um homem.' },
          { label: 'Posso usá-lo contra Norhelm', sub: 'Instrumentalizar a família', color: 'dourado', icon: 'espadas', effects: { rel: { isolde: -7 }, xp: 6 }, reply: '"Você ouviu a palavra irmão e pensou em frota. Meu irmão teria gostado de você."' },
        ],
      },
      casa: {
        text: '"Minha casa tem janelas para o mar. Minha mãe cantava enquanto desenhava mapas. O cheiro de laranja entra até no inverno." Ela hesita. "Quando sentirei falta de lá sem sentir culpa por gostar daqui?"',
        choices: [
          { label: 'Não precisa escolher só um lar', sub: 'Aceitar as duas terras', color: 'verde', icon: 'coracao', effects: { rel: { isolde: 13 }, xp: 11 }, reply: '"É uma frase perigosa para um rei." Isolde encosta a mão na sua. "Também é a primeira que me fez querer ficar."' },
          { label: 'Mostre-me Véridian um dia', sub: 'Viagem imaginada', color: 'azul', icon: 'navio', effects: { rel: { isolde: 8 }, xp: 9 }, reply: '"Só se prometer não taxar as laranjas." Ela passa a próxima meia hora descrevendo a cidade, sem citar uma única tarifa.' },
          { label: 'Castelmar deve bastar', sub: 'Cobrança disfarçada', color: 'vermelho', icon: 'coroa', effects: { rel: { isolde: -11 }, xp: 5 }, reply: '"Então talvez Castelmar precise aprender a caber mais gente." Ela recolhe o leque e a história.' },
        ],
      },
    },
  },
  {
    id: 'conv_sigrid', speaker: 'sigrid', topic: 'Uma conversa com Sigrid', kind: 'casamento', lasts: 1,
    nodes: {
      start: {
        text: (s) => s.spouse === 'sigrid'
          ? '"Você ainda me chama por mensageiro formal." Sigrid fecha a porta atrás de si. "Meu pai acharia ridículo. É uma das razões para continuar."'
          : s.flags.sigridEscolha
            ? '"Trouxe uma canção do norte. Não é sobre guerra. Você parece surpreso. Há outras coisas no mundo além do que nossos pais quebraram."'
            : '"Em Norhelm, quando alguém me convoca ao salão, é para anunciar casamento ou execução. Em Castelmar você tem mais opções. Espero."',
        choices: [
          { label: 'Ensine-me a canção', sub: 'Conhecer o norte por ela', color: 'verde', icon: 'balao', goto: 'cancao', tension: -8 },
          { label: 'Falar do inverno', sub: 'Povo antes de tratados', color: 'azul', icon: 'trigo', goto: 'inverno', tension: 5 },
          { label: 'Perguntar sobre Ragnar', sub: 'O irmão que ameaça', color: 'roxo', icon: 'olho', goto: 'ragnar', tension: 10 },
        ],
      },
      cancao: {
        text: 'Sigrid canta uma melodia baixa, sem palavras que você entenda. "É sobre uma raposa que encontra abrigo na casa de um inimigo. Quando chega a primavera, ela não sabe qual floresta é sua." Ela espera que você diga alguma coisa.',
        choices: [
          { label: 'Talvez ela tenha duas florestas', sub: 'Pertencer sem escolher', color: 'verde', icon: 'coracao', effects: { rel: { sigrid: 13 }, flags: { sigridCancao: true }, xp: 12 }, reply: '"Minha mãe teria gostado dessa versão." Sigrid canta a última estrofe outra vez, desta vez com a cabeça perto da sua.' },
          { label: 'Quero aprender as palavras', sub: 'Estudar por ela', color: 'azul', icon: 'livro', effects: { rel: { sigrid: 9 }, xp: 10 }, reply: 'Você pronuncia tudo errado. Ela ri de verdade e ensina até a melodia caber na sua voz.' },
          { label: 'A raposa devia voltar', sub: 'Raízes importam', color: 'dourado', icon: 'arvore', effects: { rel: { sigrid: -6 }, xp: 6 }, reply: '"Talvez. Ou talvez a casa fosse o primeiro lugar que não pediu que ela mordesse alguém." A canção termina cedo.' },
        ],
      },
      inverno: {
        text: '"Meu povo guarda carne sob a neve e grão em cavernas. Este ano as cavernas estão quase vazias. Ragnar chama guerra de solução porque nunca passou uma noite contando crianças com fome."',
        choices: [
          { label: 'Planejar um comboio civil', sub: '−45 ouro, salvar aldeias', color: 'verde', icon: 'trigo', req: { ouro: 45 }, effects: { res: { ouro: -45, povo: 2 }, rel: { sigrid: 11 }, flags: { ajudaNorhelm: true }, xp: 12 }, reply: '"Não ponha meu nome na carta. Ponha o das aldeias." Sigrid marca rotas longe das patrulhas do irmão.' },
          { label: 'Negociar com os jarls', sub: 'Influência +2', color: 'azul', icon: 'aperto', effects: { res: { influencia: 2 }, rel: { sigrid: 6 }, xp: 10 }, reply: 'Ela escreve três nomes de jarls que escutam antes de sacar a espada. É uma lista curta e valiosa.' },
          { label: 'Preparar a muralha', sub: 'Moral +2, distância dela', color: 'vermelho', icon: 'espadas', effects: { res: { moral: 2 }, rel: { sigrid: -8 }, xp: 6 }, reply: '"Muralhas detêm soldados, não o inverno." Ela deixa o mapa aberto para você olhar de novo.' },
        ],
      },
      ragnar: {
        text: '"Ragnar me ensinou a atirar uma faca antes de ensinar a ler. Dizia que palavras não detêm uma invasão. Cresci para descobrir que facas também não." Ela vira uma pequena lâmina entre os dedos. "Você quer saber se ele me ama?"',
        choices: [
          { label: 'Quero saber se você sente falta dele', sub: 'Pessoa antes da ameaça', color: 'verde', icon: 'coracao', effects: { rel: { sigrid: 12 }, xp: 11 }, reply: '"Do irmão que me ensinou a mirar, sim. Do homem que mira para cá, ainda não sei." Ela guarda a faca.' },
          { label: 'Ele ouviria um acordo seu?', sub: 'Diplomacia pela irmã', color: 'azul', icon: 'aperto', effects: { rel: { sigrid: 5 }, res: { influencia: 2 }, xp: 9 }, reply: '"Ouvir, sim. Aceitar, talvez se pudesse dizer que foi ideia dele. Orgulho também é uma língua."' },
          { label: 'Prefiro saber onde ele guarda as facas', sub: 'Paranoia útil', color: 'roxo', icon: 'olho', effects: { rel: { sigrid: -5 }, res: { prestigio: 1 }, xp: 6 }, reply: '"Em todo lugar", ela diz. Depois percebe que sua resposta foi séria e fica triste com isso.' },
        ],
      },
    },
  },
];

export const SUMMON_EVENTS: GameEvent[] = [...Object.keys(LORDS).map(lordEvent), ...CHATS, ...SUITOR_CHATS];
