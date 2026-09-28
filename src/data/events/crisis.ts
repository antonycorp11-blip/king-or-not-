import type { GameEvent, GameState, HouseId, ProvinceId } from '../../types';
import { startWar, terr } from '../../engine/war';
import { clamp, hasSkill } from '../../engine/core';

const atWar = (s: GameState) => !!s.war && !s.war.result;
const addUnits = (s: GameState, id: ProvinceId, n: number) => {
  const t = s.war && terr(s.war, id);
  if (t) t.units = Math.max(1, t.units + n);
};
// territórios inimigos / aliados mais relevantes
const enemyBiggest = (s: GameState) => s.war!.territories.filter((t) => t.owner === 'inimigo').sort((a, b) => b.units - a.units)[0];
const myFront = (s: GameState) => s.war!.territories.filter((t) => t.owner === 'rei').sort((a, b) => b.units - a.units)[0];

// ================= REBELIÕES: lealdade muito baixa vira guerra civil =================
function rebellion(h: HouseId, lord: string, seatName: string, speech: string, grievance: string): GameEvent {
  return {
    id: `revolta_${h}`, speaker: lord, topic: 'A casa se levanta', kind: 'urgente', cond: (s) => !s.war,
    nodes: {
      start: {
        text: speech,
        advice: {
          aldric: { text: 'Aldric, pálido: "Uma guerra civil custa mais que qualquer concessão, Majestade. Mas ceder demais ensina as outras casas a se rebelarem também."', choice: { label: 'Oferecer um tribunal de arbitragem', sub: 'Conselho do Chanceler, −10 Influência', color: 'azul', icon: 'pergaminho', req: { influencia: 10 }, effects: { res: { influencia: -10 }, loyalty: { [h]: 30 }, rel: { aldric: 6 }, xp: 20 }, reply: 'Um tribunal de três lordes neutros vai julgar as queixas. A rebelião para, por enquanto. Todos os olhos agora estão no tribunal.' } },
          isabelle: { text: 'Isabelle, gelada: "Nenhuma casa desafia a coroa duas vezes se for esmagada na primeira."', choice: { label: 'Esmagar, como a mãe quer', sub: 'Guerra civil', color: 'vermelho', icon: 'espadas', effects: { res: { prestigio: 4 }, rel: { isabelle: 6 }, run: (s) => startWar(s, h), xp: 20 }, reply: 'Os estandartes reais sobem. A guerra civil começou. Abra a tela de Guerra para comandar.' } },
        },
        choices: [
          { label: 'Perguntar o que eles exigem', sub: 'Negociar', color: 'azul', icon: 'balao', goto: 'exige' },
          { label: 'Esmagar a rebelião', sub: 'Guerra civil', color: 'vermelho', icon: 'espadas', effects: { res: { prestigio: 3 }, run: (s) => startWar(s, h), xp: 20 }, reply: `A coroa declara ${seatName} em rebelião. Abra a tela de Guerra para comandar. Vai durar dias.` },
          { label: 'Prender o emissário', sub: 'Arriscado', color: 'roxo', icon: 'mascara', effects: { res: { prestigio: 2 }, loyalty: { [h]: -10 }, run: (s) => { startWar(s, h); const seat = s.war!.territories.find((t) => t.owner === 'inimigo'); if (seat) seat.units = Math.max(4, seat.units - 3); }, xp: 20 }, reply: 'Sem o emissário, os rebeldes perdem o comando por um dia. Mas agora a guerra é pessoal.' },
        ],
      },
      exige: {
        text: grievance,
        choices: [
          { label: 'Aceitar as exigências', sub: 'Paz cara', color: 'dourado', icon: 'aperto', effects: { loyalty: { [h]: 35 }, res: { prestigio: -12, ouro: -200 }, run: (s) => (s.taxes[h] = 'baixo'), law: `Concessões à ${h === 'valmont' ? 'Casa Valmont' : h === 'drakon' ? 'Casa Drakon' : h === 'seren' ? 'Casa Seren' : 'Casa Montclair'}`, xp: 15 }, reply: 'A rebelião se desfaz. As outras casas assistem, e aprendem que rebelião dá resultado.' },
          { label: 'Aceitar metade', sub: 'Custa 15 de Influência', color: 'azul', icon: 'pergaminho', req: { influencia: 15 }, effects: { res: { influencia: -15, prestigio: -4 }, loyalty: { [h]: 25 }, xp: 18 }, reply: 'Horas de negociação. Ninguém sai feliz, ninguém sai morto. É a definição de política.' },
          { label: 'Nenhuma. Guerra', sub: 'Guerra civil', color: 'vermelho', icon: 'espadas', effects: { run: (s) => startWar(s, h), res: { prestigio: 3 }, xp: 15 }, reply: 'O emissário sai do salão. Na manhã seguinte, as estradas para o sul estão fechadas.' },
        ],
      },
    },
    ignored: { text: `O rei não respondeu. ${seatName} se declarou livre e a guerra começou mesmo assim.`, res: { prestigio: -10 }, run: (s) => startWar(s, h) },
  };
}

export const CRISIS_EVENTS: GameEvent[] = [
  rebellion('valmont', 'gaspard', 'a Costa Serena', 'Majestade, a Casa Valmont não reconhece mais a autoridade de um rei que nos arruína. A frota está no porto. As portas da Costa Serena estão fechadas. Não é pessoal, Majestade. São só negócios.', '"Impostos baixos por dez anos, o monopólio do sal e um assento permanente no conselho. E duzentas moedas pelos navios que perdemos. É uma lista curta, considerando o que poderíamos pedir."'),
  rebellion('drakon', 'brandt', 'o Vale Rubro', 'Rei. Os Drakon sangraram por esta coroa durante trezentos anos. Hoje paramos de sangrar. O Vale Rubro se governa sozinho a partir desta manhã. Venha buscá-lo, se tiver coragem.', '"O título de Guardião Perpétuo do Norte, impostos baixos e que ninguém da coroa pise no Vale sem convite. Simples, como tudo que é honesto."'),
  rebellion('seren', 'aveline', 'os Bosques Reais', 'Majestade. Os carvalhos decidiram. Os Bosques Reais não pagarão mais tributo a uma coroa que despreza a fé antiga. As estradas estão bloqueadas por árvores caídas. Não foram os ventos.', '"Que a coroa jure proteger os bosques sagrados, abaixe nossos impostos e nunca mais corte um carvalho. E que peça desculpas. Publicamente."'),
  rebellion('montclair', 'otho', 'as Montanhas de Ferro', 'Majestade... que situação desagradável. As minas de Cinzel e Picoalto estão... digamos... fechadas para a coroa. Lamento. Mas o senhor sabe como são as montanhas: guardam rancor. E ferro.', '"Isenção de impostos nas minas, a devolução das cartas que o senhor, ahn, confiscou, e o esquecimento de certos boatos. O esquecimento, Majestade, é o que mais valorizo."'),

  // ================= NOTÍCIAS DO FRONT (só durante a guerra) =================
  {
    id: 'front_comboio', speaker: 'mensageiro', topic: 'Comboio emboscado', kind: 'urgente', weight: 3, repeat: 5, cond: atWar,
    nodes: {
      start: {
        text: 'Majestade! O comboio de suprimentos para a frente foi emboscado na estrada. Metade das carroças perdidas. Os soldados vão comer metade amanhã.',
        choices: [
          { label: 'Mandar outro comboio', sub: '−120 de ouro', color: 'dourado', icon: 'moedas', req: { ouro: 120 }, effects: { res: { ouro: -120 }, xp: 8 }, reply: 'Um novo comboio parte, dessa vez com escolta. Chega inteiro.' },
          { label: 'Os soldados que se virem', sub: 'Economizar', color: 'vermelho', icon: 'escudo', effects: { res: { moral: -8 }, xp: 5 }, reply: 'Os soldados comem raízes e reclamam em versos. A moral cai.' },
          { label: 'Caçar os emboscadores', sub: 'Tirar tropas do front', color: 'azul', icon: 'espadas', effects: { res: { moral: 3 }, run: (s) => addUnits(s, myFront(s).id, -1), xp: 10 }, reply: 'Os emboscadores são pegos. Eram camponeses famintos com arcos de caça. O comboio seguinte passa.' },
        ],
      },
    },
    ignored: { text: 'Sem suprimentos, as tropas passaram fome.', res: { moral: -10 } },
  },
  {
    id: 'front_desertores', speaker: 'aurelian', topic: 'Desertores', kind: 'audiencia', weight: 3, repeat: 6, cond: atWar,
    nodes: {
      start: {
        text: 'Pegamos doze desertores na estrada da capital, Majestade. Dizem que não comem há dois dias e que o sargento deles apostava as rações. A lei manda enforcar.',
        choices: [
          { label: 'Ouvir os desertores', sub: 'Entender', color: 'azul', icon: 'balao', goto: 'ouvir' },
          { label: 'Cumprir a lei', sub: 'Enforcar', color: 'vermelho', icon: 'espadas', effects: { res: { moral: 4, povo: -4, exercito: -30 }, xp: 6 }, reply: 'Doze cordas. A deserção para. O medo também é uma ração.' },
          { label: 'Perdoar e mandar de volta', sub: 'Clemência', color: 'verde', icon: 'coracao', effects: { res: { moral: -2, povo: 3 }, xp: 8 }, reply: 'Os desertores voltam ao front chorando de alívio. Alguns lutam como leões. Outros desertam de novo.' },
        ],
      },
      ouvir: {
        text: 'O mais velho, um homem de barba grisalha, se ajoelha: "Majestade, o sargento Vargo vendia nossa comida aos mercadores. Quem reclamava ia para a linha de frente sem escudo."',
        choices: [
          { label: 'Enforcar o sargento Vargo', sub: 'Justiça', color: 'vermelho', icon: 'escudo', effects: { res: { moral: 12, povo: 3 }, xp: 12 }, reply: 'O sargento é enforcado diante do regimento. Os doze desertores voltam à tropa e cantam o nome do rei.' },
          { label: 'Rebaixar o sargento', sub: 'Meio-termo', color: 'azul', icon: 'aperto', effects: { res: { moral: 6 }, xp: 10 }, reply: 'Vargo agora carrega os baldes. Ninguém mais passa fome no regimento.' },
        ],
      },
    },
  },
  {
    id: 'front_emissario', speaker: 'haakon', topic: 'Um emissário sob bandeira branca', kind: 'urgente', weight: 2, repeat: 6, cond: (s) => atWar(s) && s.war!.enemy === 'norhelm' && s.war!.turn >= 2,
    nodes: {
      start: {
        text: 'Rei-menino. Meu senhor está... cansado desta guerra. Não por medo. Por tédio. Propõe uma trégua: o Passo Cinzento fica conosco, o resto fica com vocês. E um tributo de trezentas moedas por ano.',
        choices: [
          { label: 'Aceitar a trégua', sub: 'Paz com perda de território', color: 'azul', icon: 'aperto', effects: { res: { prestigio: -8, ouro: -300 }, loyalty: { drakon: -12 }, run: (s) => { s.war!.result = 'paz'; }, xp: 15 }, reply: 'A guerra termina. Os Drakon nunca vão perdoar o passo entregue.' },
          { label: 'Contraproposta: tributo para nós', sub: 'Blefe', color: 'roxo', icon: 'mascara', effects: { res: { prestigio: 4 }, rel: { haakon: -8 }, xp: 12 }, reply: 'Haakon ri tanto que precisa sentar. "Você tem colhões, garoto. Isso não vai te salvar, mas é divertido."' },
          { label: 'Mandar a cabeça dele de volta', sub: 'Brutalidade', color: 'vermelho', icon: 'espadas', effects: { res: { moral: 8, prestigio: 2 }, rel: { haakon: -50, sigrid: -20 }, run: (s) => addUnits(s, enemyBiggest(s).id, 3), xp: 8 }, reply: 'Os soldados comemoram. Em Norhelm, três mil homens juram vingança. O inimigo reforça as linhas.' },
        ],
      },
    },
  },
  {
    id: 'front_heroi', speaker: 'aurelian', topic: 'Um herói improvável', kind: 'audiencia', weight: 2, repeat: 8, cond: atWar,
    nodes: {
      start: {
        text: 'Majestade, um cozinheiro do exército, um tal de Bartolomeu, segurou uma ponte sozinho com uma frigideira e uma panela de óleo quente. Os homens querem que ele seja feito cavaleiro.',
        choices: [
          { label: 'Sagrar Sir Bartolomeu da Frigideira', sub: 'Lenda instantânea', color: 'verde', icon: 'coroa', effects: { res: { moral: 12, povo: 4, prestigio: -1 }, xp: 10 }, reply: 'Sir Bartolomeu da Frigideira é sagrado diante de todo o exército. Os nobres acham ridículo. Os soldados lutam por ele como por um santo.' },
          { label: 'Uma medalha e o dobro de soldo', sub: 'Prudente', color: 'azul', icon: 'moedas', effects: { res: { moral: 6, ouro: -20 }, xp: 8 }, reply: 'Bartolomeu recebe a medalha, chora, e volta para a cozinha. Agora a sopa é heroica.' },
        ],
      },
    },
  },
  {
    id: 'front_mercenarios', speaker: 'kasim', topic: 'Espadas de aluguel', kind: 'audiencia', weight: 2, repeat: 6, cond: atWar,
    nodes: {
      start: {
        text: 'Grande Rei! Kasim conhece uma companhia de mercenários do sul: os Escorpiões Dourados. Trezentos homens, nenhuma lealdade, excelente pontaria. Quinhentas moedas pela temporada.',
        choices: [
          { label: 'Contratar os Escorpiões', sub: '−500 ouro, +3 tropas no front', color: 'dourado', icon: 'moedas', req: { ouro: 500 }, effects: { res: { ouro: -500 }, run: (s) => addUnits(s, myFront(s).id, 3), xp: 10 }, reply: 'Os Escorpiões chegam cantando em uma língua estranha. Lutam bem. Roubam as galinhas do acampamento. Ninguém reclama.' },
          { label: 'Pechinchar', sub: 'Exige Comércio 1', color: 'azul', icon: 'balao', req: { attr: ['comercio', 1] }, effects: { res: { ouro: -300 }, run: (s) => addUnits(s, myFront(s).id, 3), xp: 14 }, reply: 'Kasim reclama que vai morrer pobre. Mas aceita trezentas. Ele nunca morreu pobre.' },
          { label: 'Mercenários traem', sub: 'Recusar', color: 'vermelho', icon: 'escudo', effects: { xp: 4 }, reply: 'Kasim dá de ombros. Na semana seguinte, os Escorpiões lutam do outro lado.' },
        ],
      },
    },
  },
  {
    id: 'front_peste_acampamento', speaker: 'irma', topic: 'Febre no acampamento', kind: 'urgente', weight: 2, repeat: 8, cond: atWar,
    nodes: {
      start: {
        text: 'Majestade, uma febre se espalha no acampamento principal. Soldados morrem de disenteria mais depressa que de flecha. Preciso de ervas, panos limpos e que alguém cave latrinas longe do rio.',
        choices: [
          { label: 'Tudo o que ela pedir', sub: '−150 de ouro', color: 'dourado', icon: 'moedas', req: { ouro: 150 }, effects: { res: { ouro: -150, moral: 4 }, rel: { irma: 8 }, xp: 10 }, reply: 'A Irmã Hedda transforma o acampamento em hospital. Menos homens morrem na latrina do que na batalha, o que é um progresso.' },
          { label: 'Mover o acampamento', sub: '−1 tropa, evita a febre', color: 'azul', icon: 'escudo', effects: { run: (s) => addUnits(s, myFront(s).id, -1), xp: 8 }, reply: 'O acampamento muda de lugar. A febre fica para trás, com alguns homens.' },
          { label: 'Febre é para fracos', sub: 'Ignorar', color: 'vermelho', icon: 'espadas', effects: { res: { exercito: -150, moral: -10 }, run: (s) => addUnits(s, myFront(s).id, -2), xp: 4 }, reply: 'A febre não liga para o que o rei acha. Cento e cinquenta homens morrem sem ver o inimigo.' },
        ],
      },
    },
    ignored: { text: 'A febre varreu o acampamento.', res: { exercito: -120, moral: -8 } },
  },
  {
    id: 'front_aldeia', speaker: 'viuva', topic: 'Refugiados da guerra', kind: 'audiencia', weight: 2, repeat: 7, cond: atWar,
    nodes: {
      start: {
        text: 'Majestade... sou a viúva Greta, de novo. Trouxe conosco quarenta famílias de aldeias queimadas. Dormem nas escadarias da igreja. As crianças estão com frio.',
        choices: [
          { label: 'Abrir os celeiros reais', sub: '−100 ouro, +povo', color: 'verde', icon: 'trigo', req: { ouro: 100 }, effects: { res: { ouro: -100, povo: 8 }, rel: { viuva: 10 }, xp: 10 }, reply: 'Os refugiados comem. As crianças dormem no estábulo real, entre os cavalos. Dizem que foi a melhor noite em semanas.' },
          { label: 'Alistar os homens refugiados', sub: '+100 soldados, −povo', color: 'vermelho', icon: 'espadas', effects: { res: { exercito: 100, povo: -4 }, run: (s) => addUnits(s, 'castelmar', 1), xp: 8 }, reply: 'Os homens pegam lanças. As mulheres e crianças ficam na escadaria.' },
          { label: 'Mandá-los para os Bosques', sub: 'Os Seren acolhem', color: 'azul', icon: 'arvore', effects: { loyalty: { seren: -4 }, res: { povo: 2 }, xp: 8 }, reply: 'Aveline recebe os refugiados, mas manda uma carta: "Os bosques são grandes. A paciência dos Seren, nem tanto."' },
        ],
      },
    },
    ignored: { text: 'Os refugiados passaram a noite ao relento na escadaria da igreja.', res: { povo: -6 } },
  },
  {
    id: 'front_traidor', speaker: 'sombra', topic: 'Um traidor no conselho de guerra', kind: 'urgente', weight: 1, repeat: 12, cond: (s) => atWar(s) && !!s.flags.sombraContratada,
    nodes: {
      start: {
        text: 'Majestade. Os meus corvos ouviram algo. Alguém no seu conselho de guerra manda os planos para o inimigo. Tenho um nome. Custa cinquenta moedas. Ou posso só... resolver o problema.',
        choices: [
          { label: 'Pagar pelo nome', sub: '−50 de ouro', color: 'dourado', icon: 'moedas', req: { ouro: 50 }, effects: { res: { ouro: -50, influencia: 4 }, run: (s) => addUnits(s, enemyBiggest(s).id, -3), xp: 12 }, reply: 'O nome é de um escrivão de Otho. Preso, ele confessa. Os próximos planos chegam ao inimigo... falsos.' },
          { label: 'Resolva o problema', sub: 'Sem perguntas', color: 'roxo', icon: 'mascara', effects: { run: (s) => addUnits(s, enemyBiggest(s).id, -2), loyalty: { montclair: -6 }, xp: 10 }, reply: 'Um escrivão dos Montclair aparece no rio na manhã seguinte. Ninguém faz perguntas. Otho faz muitas.' },
        ],
      },
    },
  },
  {
    id: 'front_nevasca', speaker: 'aurelian', topic: 'Nevasca no front', kind: 'audiencia', weight: 2, repeat: 8, cond: (s) => atWar(s) && s.day >= 26,
    nodes: {
      start: {
        text: 'Majestade, a primeira nevasca chegou cedo. Nossos homens não têm casacos de inverno. Os do norte nasceram na neve.',
        choices: [
          { label: 'Comprar peles', sub: '−180 de ouro', color: 'dourado', icon: 'moedas', req: { ouro: 180 }, effects: { res: { ouro: -180, moral: 6 }, xp: 8 }, reply: 'Os soldados parecem ursos. Ursos felizes.' },
          { label: 'Recuar para os vales', sub: 'Proteger os homens', color: 'azul', icon: 'escudo', effects: { res: { moral: 3 }, run: (s) => addUnits(s, 'castelmar', 1), xp: 8 }, reply: 'As tropas recuam para lugares mais quentes. O inimigo avança um pouco, mas com os pés congelados também.' },
          { label: 'Aguentem', sub: 'Resistência', color: 'vermelho', icon: 'espadas', effects: { res: { moral: -8, exercito: -60 }, xp: 5 }, reply: 'Alguns homens não acordam na manhã seguinte.' },
        ],
      },
    },
  },
  {
    id: 'front_imposto_guerra', speaker: 'corvin', topic: 'O custo da guerra', kind: 'conselho', weight: 2, repeat: 8, cond: (s) => atWar(s) && s.res.ouro < 400,
    nodes: {
      start: {
        text: 'Majestade, a guerra come ouro como Lorde Brandt come carneiro. Proponho um imposto de guerra: dobra a renda por uma semana. O povo vai odiar. Os lordes também.',
        choices: [
          { label: 'Decretar o imposto de guerra', sub: '+400 ouro, −povo, −lealdade', color: 'vermelho', icon: 'pergaminho', effects: { res: { ouro: 400, povo: -10 }, loyalty: { valmont: -4, seren: -4, montclair: -4 }, law: 'Imposto de Guerra', xp: 10 }, reply: 'O ouro entra. A raiva também.' },
          { label: 'Vender joias da coroa', sub: '+300 ouro, −prestígio', color: 'dourado', icon: 'coroa', effects: { res: { ouro: 300, prestigio: -6 }, rel: { isabelle: -10 }, xp: 10 }, reply: 'Sua mãe vê o colar da avó na vitrine de um joalheiro de Véridian. Ela não fala com você por três dias.' },
          { label: 'Pedir empréstimo aos Valmont', sub: '+400 ouro, dívida', color: 'azul', icon: 'aperto', effects: { res: { ouro: 400 }, loyalty: { valmont: 3 }, flags: { dividaValmont: true }, xp: 8 }, reply: 'Gaspard empresta com um sorriso enorme. Juros de 30%. Ele vai lembrar disso até o seu funeral.' },
        ],
      },
    },
  },
  {
    id: 'front_prisioneiro', speaker: 'aurelian', topic: 'Um prisioneiro importante', kind: 'audiencia', weight: 2, repeat: 12, cond: (s) => atWar(s) && s.war!.turn >= 2,
    nodes: {
      start: {
        text: (s) => (s.war!.enemy === 'norhelm' ? 'Capturamos o jarl Ulf Barba-de-Gelo, primo do rei de Norhelm. Ele exige ser tratado com honra e comida decente. Especialmente comida.' : 'Capturamos o filho mais novo do lorde rebelde. Um rapaz de quinze anos, assustado e arrogante ao mesmo tempo. Como o senhor na coroação, se me permite.'),
        choices: [
          { label: 'Trocar por prisioneiros nossos', sub: '+2 tropas', color: 'azul', icon: 'aperto', effects: { run: (s) => addUnits(s, myFront(s).id, 2), xp: 10 }, reply: 'Soldados de Castelmar voltam para casa. O prisioneiro também, com uma carta sua dentro do gibão.' },
          { label: 'Pedir resgate', sub: '+300 de ouro', color: 'dourado', icon: 'moedas', effects: { res: { ouro: 300 }, xp: 10 }, reply: 'O resgate chega em três dias. Com uma carta cheia de ameaças, que Corvin arquiva junto com o ouro.' },
          { label: 'Usá-lo como moeda de paz', sub: 'Custa 8 de Influência', color: 'roxo', icon: 'mascara', req: { influencia: 8 }, effects: { res: { influencia: -8 }, run: (s) => addUnits(s, enemyBiggest(s).id, -3), xp: 14 }, reply: 'O inimigo hesita em atacar enquanto você tiver o refém. Três regimentos ficam parados, esperando ordens que não chegam.' },
        ],
      },
    },
  },
  {
    id: 'front_senhor_recusa', speaker: 'otho', topic: 'Um lorde que não manda tropas', kind: 'audiencia', weight: 2, repeat: 10, cond: (s) => atWar(s) && s.war!.enemy !== 'montclair' && s.loyalty.montclair < 20,
    nodes: {
      start: {
        text: 'Majestade, sobre as tropas de Montclair... infelizmente estão ocupadas protegendo as minas. De quem? De... possíveis ameaças. Muito possíveis. O senhor entende.',
        choices: [
          { label: 'Exigir as tropas agora', sub: 'Autoridade', color: 'vermelho', icon: 'coroa', effects: { loyalty: { montclair: -8 }, run: (s) => addUnits(s, 'montanhas', 2), xp: 8 }, reply: 'Otho manda as tropas. As piores que tem. Descalças.' },
          { label: 'Cobrar em ouro no lugar de tropas', sub: '+200 de ouro', color: 'dourado', icon: 'moedas', effects: { res: { ouro: 200 }, loyalty: { montclair: -3 }, xp: 10 }, reply: 'Otho paga, quase aliviado. Ouro, para ele, é mais barato que lealdade.' },
          { label: 'Anotar a recusa para depois', sub: 'Guardar rancor', color: 'roxo', icon: 'mascara', effects: { flags: { othoDevendo: true }, res: { influencia: 2 }, xp: 8 }, reply: 'Você anota. Otho sabe que você anotou. Ambos sabem que um dia essa conta vai chegar.' },
        ],
      },
    },
  },
];

// Gatilho das rebeliões (chamado no fim do dia)
export function checkRebellions(s: GameState) {
  if (s.war && !s.war.result) return;
  for (const h of ['valmont', 'drakon', 'seren', 'montclair'] as HouseId[]) {
    if (s.loyalty[h] <= (hasSkill(s, 'tribunal') ? -70 : -55) && !s.flags[`revoltou_${h}`]) {
      s.flags[`revoltou_${h}`] = true;
      s.scheduled.push({ id: `revolta_${h}`, day: s.day + 1 });
      s.loyalty[h] = clamp(s.loyalty[h], -100, 100);
      return;
    }
  }
}
