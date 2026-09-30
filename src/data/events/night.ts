import type { GameEvent, GameState } from '../../types';
import { char } from '../characters';
import { hasSkill } from '../../engine/core';

// Noites: quando o rei encerra o dia, às vezes alguém o aborda no corredor.
// Não gastam horas; ao terminar, o dia se encerra.
const sp = (s: GameState) => (s.spouse ? char(s.spouse).name : 'a rainha');
const married = (s: GameState) => !!s.spouse;
const notWar = (s: GameState) => !s.war || !!s.war.result;

function spouseNight(id: string, text: string, a: [string, string, string], b: [string, string, string], c: [string, string, string]): GameEvent {
  return {
    id: `noite_${id}`, speaker: id, topic: 'No quarto real', kind: 'noite', wake: true, weight: 4, repeat: 5, cond: (s) => s.spouse === id,
    nodes: {
      start: {
        text,
        choices: [
          { label: a[0], sub: a[1], color: 'azul', icon: 'coracao', effects: { rel: { [id]: 8 }, xp: 8 }, reply: a[2] },
          { label: b[0], sub: b[1], color: 'dourado', icon: 'olho', effects: { rel: { [id]: 3 }, res: { influencia: 3 }, xp: 10 }, reply: b[2] },
          { label: c[0], sub: c[1], color: 'vermelho', icon: 'escudo', effects: { rel: { [id]: -6 }, res: { prestigio: 1 }, xp: 5 }, reply: c[2] },
        ],
      },
    },
  };
}

export const NIGHT_EVENTS: GameEvent[] = [
  // ---------- Clara, a camareira apaixonada ----------
  {
    id: 'noite_clara', speaker: 'clara', topic: 'A camareira no corredor', kind: 'noite', weight: 4, minDay: 4, cond: (s) => !!s.flags.admiradoraClara && !s.flags.claraFim,
    nodes: {
      start: {
        text: 'Clara surge do nada com uma pilha de toalhas limpas que ninguém pediu. "Majestade! Que coincidência. Eu... estava passando. Pelo corredor. Que é o seu. Às onze da noite." Ela deixa cair duas toalhas. Depois uma terceira, de propósito.',
        choices: [
          { label: 'Foi você que mandou o bilhete?', sub: 'Direto ao ponto', color: 'azul', icon: 'balao', goto: 'bilhete' },
          { label: 'Ajudar a pegar as toalhas', sub: 'Cavalheirismo', color: 'verde', icon: 'coracao', effects: { rel: { clara: 6 } }, goto: 'toalhas' },
          { label: 'Clara, vá dormir', sub: 'Encerrar isso', color: 'vermelho', icon: 'escudo', effects: { rel: { clara: -10 }, flags: { claraFim: true }, xp: 5 }, reply: '"Sim, Majestade." Ela sai correndo. No dia seguinte, sua cama está feita com uma precisão militar e nenhum carinho.' },
        ],
      },
      bilhete: {
        text: 'Ela fica da cor de uma maçã. "Bilhete? Que bilhete? Ah, AQUELE bilhete. Foi... a outra Clara. Da lavanderia." Pausa longa. "Não existe outra Clara, não é? Eu devia ter inventado um nome melhor."',
        choices: [
          { label: 'Rir junto com ela', sub: 'Leveza', color: 'dourado', icon: 'balao', effects: { rel: { clara: 10 }, res: { povo: 1 }, xp: 8 }, reply: 'Vocês riem até um guarda aparecer, olhar os dois, e ir embora muito devagar, como quem vai contar para todo mundo.' },
          { label: 'Beijá-la', sub: 'Péssima ideia ótima', color: 'roxo', icon: 'coracao', effects: { rel: { clara: 18 }, flags: { casoClara: true }, xp: 8, run: (s) => { if (s.spouse) s.rel[s.spouse] = (s.rel[s.spouse] ?? 0) - 3; } }, reply: 'O corredor fica em silêncio. Em algum lugar, um retrato do seu avô parece desaprovar. Clara sai flutuando e esquece as toalhas.' },
          { label: 'Explicar que um rei não pode', sub: 'Honestidade', color: 'azul', icon: 'coroa', effects: { rel: { clara: -2 }, flags: { claraFim: true }, res: { prestigio: 1 }, xp: 10 }, reply: '"Eu sei, Majestade. Mas uma camareira pode sonhar. É de graça, e o salário não dá para mais nada." Ela sorri triste e vai embora.' },
        ],
      },
      toalhas: {
        text: 'Vocês se abaixam ao mesmo tempo e batem as cabeças. "AI! Perdão! Bati a cabeça no rei! Isso é traição? É forca?" Ela está entre o pânico e o riso.',
        choices: [
          { label: 'Traição gravíssima. Pena: um sorriso', sub: 'Flertar', color: 'roxo', icon: 'coracao', effects: { rel: { clara: 12 }, flags: { claraFlerte: true }, xp: 8 }, reply: 'Ela sorri. A pena é cumprida com juros. Lady Maren, escondida atrás de uma tapeçaria, anota tudo.' },
          { label: 'Chamar o médico para os dois', sub: 'Exagero', color: 'dourado', icon: 'balao', effects: { rel: { clara: 5 }, res: { ouro: -5 }, xp: 5 }, reply: 'O médico chega de camisola, examina dois galos e cobra cinco moedas. "Pela hora", explica.' },
        ],
      },
    },
  },
  {
    id: 'noite_clara_2', speaker: 'clara', topic: 'Clara e um segredo', kind: 'noite', weight: 5, minDay: 10, cond: (s) => !!s.flags.casoClara || !!s.flags.claraFlerte,
    nodes: {
      start: {
        text: (s) => `Clara o puxa para trás de uma cortina, séria desta vez. "Majestade, eu arrumo os quartos dos lordes também. Hoje, no quarto de Lorde Otho, tinha uma carta com o seu nome e a palavra 'depois'. Só isso. 'Depois'. ${s.spouse ? 'E... a rainha perguntou de mim na lavanderia.' : 'Achei que o senhor devia saber.'}"`,
        choices: [
          { label: 'Traga-me essa carta', sub: 'Usar a espiã acidental', color: 'roxo', icon: 'mascara', effects: { rel: { clara: 6 }, flags: { conspiracaoRevelada: true, claraEspia: true }, loyalty: { montclair: -2 }, res: { influencia: 4 }, xp: 14 }, reply: 'Na noite seguinte, a carta está debaixo do seu travesseiro, junto com um biscoito. A letra é de Lady Lysandra.' },
          { label: 'Não se arrisque por mim', sub: 'Protegê-la', color: 'azul', icon: 'escudo', effects: { rel: { clara: 12 }, xp: 10 }, reply: '"Tarde demais, Majestade. Eu já me arrisco toda vez que dobro suas meias em forma de cisne."' },
          { label: 'Isto precisa acabar', sub: 'Encerrar o caso', color: 'vermelho', icon: 'coroa', effects: { rel: { clara: -12 }, flags: { casoClara: false, claraFlerte: false, claraFim: true }, xp: 8 }, reply: 'Ela entende antes que você termine a frase. Sai sem chorar. Chora só na lavanderia, onde a água já esconde tudo.' },
        ],
      },
    },
  },
  // ---------- Bianca, a confeiteira ----------
  {
    id: 'noite_bianca', speaker: 'bianca', topic: 'Um cheiro de canela', kind: 'noite', weight: 3, minDay: 6, cond: (s) => !s.flags.bianca && !s.flags.casoBianca,
    nodes: {
      start: {
        text: 'Um cheiro de canela vem da escada da cozinha. Bianca, a confeiteira, está sentada nos degraus com uma torta inteira e dois garfos. "Majestade. Eu sabia que o senhor ia descer. Todos os reis descem. Seu pai descia toda quinta." Ela oferece um garfo. "Ele comia metade e me contava os problemas do reino."',
        choices: [
          { label: 'Sentar e comer', sub: 'Torta à meia-noite', color: 'verde', icon: 'coracao', effects: { rel: { bianca: 10 }, flags: { bianca: true } }, goto: 'torta' },
          { label: 'Que problemas meu pai contava?', sub: 'Curiosidade', color: 'dourado', icon: 'olho', effects: { flags: { bianca: true } }, goto: 'pai' },
          { label: 'Reis não comem na escada', sub: 'Dignidade', color: 'vermelho', icon: 'coroa', effects: { rel: { bianca: -5 }, xp: 4 }, reply: '"Não comem mesmo", ela concorda, e come o seu pedaço também.' },
        ],
      },
      torta: {
        text: 'A torta é absurdamente boa. Bianca o observa comer com os olhos brilhando. "O segredo é manteiga e desobediência. O Mestre Sálvio diz que uso açúcar demais. Eu digo que ele usa amargura demais." Ela se aproxima um pouco. Canela, farinha e perigo.',
        choices: [
          { label: 'Amanhã eu volto', sub: 'Começa um caso', color: 'roxo', icon: 'coracao', effects: { rel: { bianca: 12 }, flags: { casoBianca: true }, run: (s) => { if (s.spouse) s.rel[s.spouse] = (s.rel[s.spouse] ?? 0) - 2; }, xp: 6 }, reply: '"Quinta-feira", ela diz. "Os reis sempre descem na quinta."' },
          { label: 'Elogiar a torta e subir', sub: 'Só a torta', color: 'azul', icon: 'aperto', effects: { rel: { bianca: 4 }, res: { moral: 1 }, xp: 6 }, reply: 'Você sobe com farinha no manto. O guarda da escada finge não ver. É o terceiro rei que ele finge não ver.' },
        ],
      },
      pai: {
        text: '"Ele dizia que o Chanceler Aldric sabia demais, que sua mãe sabia mais ainda, e que Lorde Otho sabia coisas que não devia." Ela lambe o garfo. "E dizia que tinha medo de você ser igual a ele. Ou pior: diferente."',
        choices: [
          { label: 'Ele disse mais alguma coisa sobre Otho?', sub: 'Investigar', color: 'roxo', icon: 'mascara', effects: { flags: { segredoOtho: true }, rel: { bianca: 4 }, res: { influencia: 3 }, xp: 12 }, reply: '"Que ele comprava venenos com nome de tempero. Eu achei que era piada. Agora não sei."' },
          { label: 'Obrigado, Bianca', sub: 'Gratidão', color: 'azul', icon: 'coracao', effects: { rel: { bianca: 8, isabelle: 1 }, xp: 8 }, reply: 'Ela sorri. "Quinta-feira tem torta de maçã. Ele gostava de maçã."' },
        ],
      },
    },
  },
  // ---------- O fantasma do rei (é o Pimenta) ----------
  {
    id: 'noite_fantasma', speaker: 'pimenta', topic: 'O fantasma do rei morto', kind: 'noite', wake: true, weight: 3, minDay: 3,
    nodes: {
      start: {
        text: 'Um lençol com dois buracos flutua pelo corredor gemendo: "Filhoooo... você está cobrando impostos demaaaais... e seu irmão pegou minhas botaaaas..." Dá para ver os sapatos com guizos do Pimenta, o bobo da corte, por baixo do lençol.',
        choices: [
          { label: 'Entrar no jogo: Pai! Que saudade!', sub: 'Comédia', color: 'dourado', icon: 'balao', goto: 'jogo' },
          { label: 'Puxar o lençol', sub: 'Desmascarar', color: 'vermelho', icon: 'mascara', effects: { rel: { pimenta: -3 }, res: { prestigio: 1 }, xp: 5 }, reply: 'Pimenta, de camisola, faz uma reverência. "O senhor estragou o melhor número do ano. Os guardas iam desmaiar amanhã."' },
          { label: 'Chamar a guarda: FANTASMA!', sub: 'Caos', color: 'roxo', icon: 'escudo', effects: { res: { moral: 3 }, rel: { pimenta: 8, aurelian: -3 }, xp: 6 }, reply: 'Seis guardas perseguem um lençol pelo castelo até as três da manhã. O quartel ri disso por uma semana. A moral sobe; a dignidade do Capitão Aurelian, não.' },
        ],
      },
      jogo: {
        text: 'O "fantasma" hesita, surpreso. "Ahn... sim, filho. Do além eu vejo tudo. Vejo que... Corvin está roubando velas. E que sua mãe tem um admirador. E que você precisa dar um aumento ao bobo."',
        choices: [
          { label: 'Um aumento, pai? Quanto?', sub: '−20 ouro, bobo feliz', color: 'dourado', icon: 'moedas', effects: { res: { ouro: -20 }, rel: { pimenta: 14 }, xp: 8 }, reply: '"Vinte moedas e a eternidade em paz", geme o fantasma, e sai correndo com o lençol enroscado num candelabro.' },
          { label: 'Que admirador da minha mãe?', sub: 'Espere aí', color: 'roxo', icon: 'olho', effects: { flags: { pistaIsabelle: true }, rel: { pimenta: 4 }, xp: 10 }, reply: 'O fantasma tosse. "Os mortos... não falam de fofoca... boa noite!" Pimenta foge. Mas plantou a dúvida, e ele nunca planta à toa.' },
        ],
      },
    },
  },
  // ---------- Lucas escapando ----------
  {
    id: 'noite_lucas', speaker: 'lucas', topic: 'O príncipe na janela', kind: 'noite', weight: 4, minDay: 5, cond: (s) => !s.flags.lucasPego,
    nodes: {
      start: {
        text: 'Você encontra Lucas pendurado para fora da janela da biblioteca, com uma corda feita de lençóis e uma capa de camponês. Ele congela. "Ah. Oi. Eu estava... verificando a resistência dos lençóis. Assunto de segurança do reino."',
        choices: [
          { label: 'Aonde você vai?', sub: 'Irmão mais velho', color: 'azul', icon: 'balao', effects: { flags: { lucasPego: true } }, goto: 'onde' },
          { label: 'Vou com você', sub: 'Aventura real', color: 'roxo', icon: 'coroa', effects: { flags: { lucasPego: true } }, goto: 'junto' },
          { label: 'Guardas!', sub: 'Autoridade', color: 'vermelho', icon: 'escudo', effects: { rel: { lucas: -12, isabelle: 3 }, flags: { lucasPego: true }, xp: 5 }, reply: 'Lucas é escoltado de volta ao quarto. Ele não fala com você por dois dias. Em ambos, deixa um sapo na sua bota.' },
        ],
      },
      onde: {
        text: '"Para a Taverna do Javali Cego. Tem uma moça lá, Anelise, que canta. E ninguém lá sabe que eu sou príncipe. Lá eu sou só o Luc, que perde nos dados." Ele desvia o olhar. "Aqui eu sou o irmão reserva."',
        choices: [
          { label: 'Vá, mas leve um guarda disfarçado', sub: 'Meio-termo', color: 'verde', icon: 'escudo', effects: { rel: { lucas: 12 }, flags: { lucasTaverna: true }, schedule: [{ id: 'lucas_taverna', in: 3 }], xp: 10 }, reply: 'Lucas sai com Sir Edmund vestido de "tio Ed, vendedor de nabos". Ninguém acredita, mas todos fingem.' },
          { label: 'Você não é reserva de ninguém', sub: 'Consolar', color: 'azul', icon: 'coracao', effects: { rel: { lucas: 14, isabelle: 2 }, xp: 12 }, reply: 'Ele desce da janela. Vocês conversam até o sol nascer, como quando eram pequenos e o pai ainda estava vivo.' },
          { label: 'Um príncipe não vai a tavernas', sub: 'Proibir', color: 'vermelho', icon: 'coroa', effects: { rel: { lucas: -8 }, res: { prestigio: 1 }, xp: 5 }, reply: '"Claro, Majestade." A palavra Majestade sai como um tapa.' },
        ],
      },
      junto: {
        text: 'Lucas arregala os olhos. "Sério?! O REI no Javali Cego?" Meia hora depois, dois irmãos de capuz entram numa taverna fedorenta. Anelise canta. Um bêbado grita que "o rei novo é um frangote". Lucas segura o riso.',
        choices: [
          { label: 'Pagar uma rodada para todos', sub: '−30 ouro, o povo gosta', color: 'dourado', icon: 'moedas', effects: { res: { ouro: -30, povo: 5 }, rel: { lucas: 15 }, xp: 14 }, reply: 'O bêbado brinda "ao frangote". Na manhã seguinte descobre quem pagou e se muda para outra cidade.' },
          { label: 'Desafiar o bêbado nos dados', sub: 'Honra do frangote', color: 'roxo', icon: 'balao', effects: { res: { povo: 3, prestigio: -1 }, rel: { lucas: 12 }, xp: 12 }, reply: 'Você perde três vezes e ganha a última. A taverna inteira canta seu nome errado. Lucas nunca vai deixar você esquecer.' },
        ],
      },
    },
  },
  // ---------- Isabelle e o encontro secreto ----------
  {
    id: 'noite_isabelle', speaker: 'isabelle', topic: 'Uma sombra no jardim', kind: 'noite', weight: 3, minDay: 8, cond: (s) => !s.flags.segredoIsabelle,
    nodes: {
      start: {
        text: 'Da janela, você vê sua mãe no jardim à meia-noite, sem guardas, falando baixo com um homem alto de manto vermelho. Ele beija a mão dela. Ela ri, um riso que você não ouve desde o enterro. O homem se vira: é Lorde Brandt Drakon.',
        choices: [
          { label: 'Descer e confrontar os dois', sub: 'Escândalo', color: 'vermelho', icon: 'espadas', effects: { flags: { segredoIsabelle: 'confronto' } }, goto: 'confronto' },
          { label: 'Fingir que não viu', sub: 'Guardar o segredo', color: 'azul', icon: 'olho', effects: { flags: { segredoIsabelle: 'guardado' }, res: { influencia: 2 }, xp: 10 }, reply: 'Você fecha a cortina. Um segredo de família é uma moeda. Você ainda não sabe quanto ela vale.' },
          { label: 'Mandar Pimenta tocar alaúde para eles', sub: 'Constrangimento máximo', color: 'dourado', icon: 'balao', effects: { flags: { segredoIsabelle: 'alaude' }, rel: { isabelle: -4, brandt: -2, pimenta: 6 }, res: { moral: 1 }, xp: 10 }, reply: 'Pimenta surge atrás de um arbusto cantando uma balada sobre "viúvas e lobos". Brandt foge pulando uma cerca viva. Isabelle olha para a sua janela. Ela sabe.' },
        ],
      },
      confronto: {
        text: 'Brandt põe a mão no punho da espada por reflexo, depois tira, envergonhado. Isabelle fica entre vocês, ereta como uma rainha. "Eu enterrei seu pai há dois meses, filho. Não enterrei a mim mesma."',
        choices: [
          { label: 'Você tem minha bênção', sub: 'Maturidade', color: 'verde', icon: 'coracao', effects: { rel: { isabelle: 15, brandt: 12 }, loyalty: { drakon: 10 }, flags: { isabelleBrandt: true }, xp: 18 }, reply: 'Brandt, um homem que já matou ursos, chora um pouco. Isabelle o abraça. Os Drakon agora são quase família.' },
          { label: 'Não em público. Nunca', sub: 'Condição', color: 'azul', icon: 'escudo', effects: { rel: { isabelle: 4, brandt: 4 }, loyalty: { drakon: 4 }, xp: 12 }, reply: '"Nunca foi em público", diz sua mãe. "Até você abrir a janela."' },
          { label: 'Lorde Brandt, deixe o castelo', sub: 'Proibir', color: 'vermelho', icon: 'coroa', effects: { rel: { isabelle: -18, brandt: -15 }, loyalty: { drakon: -12 }, res: { prestigio: 2 }, xp: 8 }, reply: 'Brandt parte ao amanhecer. Isabelle não desce para o café por três dias. A Casa Drakon comenta. Muito.' },
        ],
      },
    },
  },
  // ---------- Corvin sonâmbulo ----------
  {
    id: 'noite_corvin', speaker: 'corvin', topic: 'O tesoureiro sonâmbulo', kind: 'noite', weight: 3, minDay: 4, repeat: 20,
    nodes: {
      start: {
        text: 'Mestre Corvin anda pelo corredor de camisola, olhos fechados, contando no ar: "...trezentos e doze, trezentos e treze... o rei não pode saber das velas... trezentos e catorze..." Ele carrega um castiçal de prata da capela.',
        choices: [
          { label: 'Perguntar baixinho: que velas, Corvin?', sub: 'Interrogar o sonâmbulo', color: 'roxo', icon: 'mascara', goto: 'velas' },
          { label: 'Acordá-lo com um grito', sub: 'Susto', color: 'vermelho', icon: 'balao', effects: { rel: { corvin: -6 }, res: { moral: 1 }, xp: 5 }, reply: 'Corvin acorda, grita mais alto que você, joga o castiçal pela janela e desmaia. O castiçal nunca é encontrado.' },
          { label: 'Guiá-lo de volta à cama', sub: 'Gentileza', color: 'azul', icon: 'coracao', effects: { rel: { corvin: 6 }, xp: 6 }, reply: 'Você o coloca na cama. Ele murmura "obrigado, majestade, o senhor é bom demais para esse trabalho", e ronca.' },
        ],
      },
      velas: {
        text: '"As velas... compramos mil, usamos trezentas... as outras setecentas... o sobrinho do Lorde Gaspard revende no porto... e eu fico com um décimo... é pouco, majestade, é muito pouco..." Ele sorri dormindo.',
        choices: [
          { label: 'Confrontá-lo pela manhã', sub: '+80 ouro recuperado', color: 'dourado', icon: 'moedas', effects: { res: { ouro: 80 }, rel: { corvin: -8 }, loyalty: { valmont: -3 }, flags: { corrupcaoValmont: true }, xp: 14 }, reply: 'De manhã, Corvin nega tudo, depois chora, depois devolve oitenta moedas "encontradas atrás de uma estante".' },
          { label: 'Guardar o segredo para usar depois', sub: 'Chantagem futura', color: 'roxo', icon: 'mascara', effects: { flags: { corvinChantagem: true }, res: { influencia: 4 }, xp: 12 }, reply: 'Você anota: velas, sobrinho, porto, um décimo. Um dia, Corvin vai precisar muito de um favor seu. Ou você dele.' },
          { label: 'Exige Contabilidade Real: auditar tudo', sub: 'Faxina no tesouro', color: 'verde', icon: 'livro', req: { knowledge: 'contabilidade' }, effects: { res: { ouro: 150, influencia: 3 }, rel: { corvin: -4 }, loyalty: { valmont: -4 }, xp: 18 }, reply: 'Em uma noite com o livro-caixa você acha as velas, os reparos fantasmas e um cavalo que não existe mas come aveia todo mês. 150 moedas voltam ao tesouro.' },
        ],
      },
    },
  },
  // ---------- Carta debaixo do travesseiro ----------
  {
    id: 'noite_travesseiro', speaker: 'sombra', topic: 'Alguém no seu quarto', kind: 'noite', wake: true, weight: 3, minDay: 7, repeat: 12,
    nodes: {
      start: {
        text: (s) => `Ao entrar no quarto, uma figura de capuz está sentada na sua cama, comendo suas uvas. "Os guardas da porta dormem ${s.flags.guardaQuarto ? 'em turnos, pelo menos. Progresso' : 'como bebês. Bebês bêbados'}, Majestade. Eu sou A Sombra. Vendo segredos. Hoje tenho três. Escolha um."`,
        choices: [
          { label: 'O segredo sobre um lorde', sub: '−40 ouro', color: 'roxo', icon: 'mascara', req: { ouro: 40 }, effects: { res: { ouro: -40, influencia: 6 }, flags: { segredoOtho: true, conspiracaoRevelada: true }, xp: 12 }, reply: '"Otho Montclair paga Lady Lysandra para ficar perto do senhor. Ela sorri demais. Pergunte a si mesmo por quê."' },
          { label: 'O segredo sobre a minha família', sub: '−40 ouro', color: 'dourado', icon: 'coroa', req: { ouro: 40 }, effects: { res: { ouro: -40 }, flags: { pistaIsabelle: true, pistaCedric: true }, xp: 12 }, reply: '"Seu pai teve um filho antes de você. Com uma mulher de Lys. O menino cresceu. Tem o queixo do seu pai e a ambição da mãe."' },
          { label: 'O segredo sobre você mesmo', sub: '−40 ouro', color: 'azul', icon: 'olho', req: { ouro: 40 }, effects: { res: { ouro: -40, prestigio: 2 }, xp: 15 }, reply: '"O senhor ronca, Majestade. Alto. A corte inteira sabe. Ninguém tem coragem de contar." Ela some pela janela. As uvas também.' },
          { label: 'Chamar os guardas', sub: 'Invasora!', color: 'vermelho', icon: 'escudo', effects: { flags: { sombraInimiga: true }, res: { moral: -1 }, xp: 5 }, reply: 'Quando os guardas chegam, só sobram os caroços das uvas, arrumados no formato de uma coroa quebrada.' },
        ],
      },
    },
  },
  // ---------- Brandt bêbado ----------
  {
    id: 'noite_brandt', speaker: 'brandt', topic: 'Um urso bêbado no corredor', kind: 'noite', weight: 3, minDay: 3, repeat: 15, cond: notWar,
    nodes: {
      start: {
        text: 'Lorde Brandt Drakon está sentado no chão do corredor, abraçado a um barril pequeno, cantando uma canção de guerra desafinada. "MAJESTADE! O rei-menino! Senta aqui. Senta. Vou te contar como matei um urso. Com as mãos. Bom, com uma espada. Bom, o urso já estava doente."',
        choices: [
          { label: 'Sentar e beber com ele', sub: 'Laços de sangue (e vinho)', color: 'verde', icon: 'aperto', effects: { loyalty: { drakon: 8 }, rel: { brandt: 10 }, res: { prestigio: -1 } }, goto: 'bebe' },
          { label: 'Carregá-lo até o quarto', sub: 'Força real', color: 'azul', icon: 'escudo', effects: { rel: { brandt: 6 }, xp: 6 }, reply: 'Ele pesa como um cavalo de armadura. No caminho, ele declara que você é "o melhor rei desde o urso". Ninguém entende qual urso.' },
          { label: 'Tomar o barril dele', sub: 'Confiscar', color: 'vermelho', icon: 'coroa', effects: { rel: { brandt: -6 }, loyalty: { drakon: -2 }, res: { ouro: 10 }, xp: 5 }, reply: 'É vinho de Véridian, caríssimo. Você vende para Kasim por dez moedas. Brandt jura vingança e esquece na manhã seguinte.' },
        ],
      },
      bebe: {
        text: 'Três canecas depois, Brandt fica sério. "Rei... posso contar uma coisa? Otho Montclair me ofereceu ferro barato se os Drakon ficassem neutros... caso algo acontecesse com você. Eu disse não. Acho. Eu estava bêbado. Como agora."',
        choices: [
          { label: 'Você é um amigo, Brandt', sub: 'Gratidão', color: 'azul', icon: 'coracao', effects: { rel: { brandt: 10 }, loyalty: { drakon: 6 }, flags: { conspiracaoRevelada: true }, xp: 14 }, reply: 'Ele o abraça e quase quebra uma costela sua. Depois dorme no chão, feliz.' },
          { label: 'Amanhã você repete isso sóbrio', sub: 'Testemunha', color: 'roxo', icon: 'pergaminho', effects: { flags: { testemunhaBrandt: true, conspiracaoRevelada: true }, rel: { brandt: 2 }, res: { influencia: 4 }, xp: 14 }, reply: '"Sóbrio eu não repito nada", ele ronca. Mas lembra. E, no dia do julgamento, vai lembrar ainda melhor.' },
        ],
      },
    },
  },
  // ---------- Morgana ----------
  {
    id: 'noite_morgana', speaker: 'morgana', topic: 'A viúva de preto', kind: 'noite', weight: 2, minDay: 9, cond: (s) => !s.flags.morganaNoite,
    nodes: {
      start: {
        text: 'Lady Morgana Rocha-Negra, viúva e vestida de preto até os dentes, espera encostada na porta do seu quarto. "Majestade. Meu marido morreu defendendo seu pai. Seu pai me prometeu justiça contra o homem que o traiu. Seu pai morreu antes. Então agora... a promessa é sua." Ela sorri. Não é um sorriso de luto.',
        choices: [
          { label: 'Quem traiu seu marido?', sub: 'Ouvir', color: 'azul', icon: 'balao', effects: { flags: { morganaNoite: true } }, goto: 'quem' },
          { label: 'Amanhã, na sala do trono', sub: 'Formalidade', color: 'dourado', icon: 'coroa', effects: { flags: { morganaNoite: true }, rel: { morgana: -4 }, xp: 5 }, reply: '"Na sala do trono todos escutam, Majestade. É exatamente por isso que vim aqui." Ela vai embora deixando um perfume de cravo e ameaça.' },
        ],
      },
      quem: {
        text: '"Sir Osric Âncora, dos Valmont. Ele abriu o flanco na Batalha do Rio Frio. Por dinheiro. Tenho as cartas." Ela se aproxima demais. "E eu sei agradecer, Majestade. De muitas formas."',
        choices: [
          { label: 'Aceitar as cartas e mais nada', sub: 'Frieza estratégica', color: 'roxo', icon: 'pergaminho', effects: { rel: { morgana: 4 }, flags: { cartasOsric: true }, res: { influencia: 4 }, xp: 14 }, reply: 'Ela entrega as cartas, desapontada e impressionada ao mesmo tempo. "Você é mais parecido com sua mãe do que com seu pai."' },
          { label: 'Aceitar o agradecimento', sub: 'Péssima ideia', color: 'vermelho', icon: 'coracao', effects: { rel: { morgana: 14 }, flags: { cartasOsric: true, casoMorgana: true }, run: (s) => { if (s.spouse) s.rel[s.spouse] = (s.rel[s.spouse] ?? 0) - 6; }, res: { prestigio: -2 }, xp: 6 }, reply: 'No dia seguinte a corte inteira sabe. Ninguém sabe como. Morgana sabe como.' },
          { label: 'Vingança não é justiça', sub: 'Recusar', color: 'azul', icon: 'escudo', effects: { rel: { morgana: -10 }, res: { prestigio: 2 }, xp: 10 }, reply: '"Diga isso à minha filha, que não tem pai", ela responde, e some no corredor escuro.' },
        ],
      },
    },
  },
  // ---------- Theodric e as estrelas ----------
  {
    id: 'noite_estrelas', speaker: 'theodric', topic: 'Uma torre e um céu', kind: 'noite', weight: 2, minDay: 5, repeat: 18,
    nodes: {
      start: {
        text: 'O Grão-Meistre Theodric o chama para o topo da torre da biblioteca. Há um tubo de latão apontado para o céu. "Um vidreiro de Véridian me vendeu isto. Diz que aproxima as estrelas. Aproxima. Majestade, a lua tem montanhas. MONTANHAS. Ninguém pode saber disso."',
        choices: [
          { label: 'Por que ninguém pode saber?', sub: 'Curiosidade', color: 'azul', icon: 'olho', effects: { rel: { theodric: 6 }, xp: 10 }, reply: '"Porque os padres dizem que a lua é um espelho perfeito de Deus. E Deus, pelo visto, tem espinhas." Vocês ficam olhando até o amanhecer.' },
          { label: 'Exige Mapas das Estrelas: prever o inverno', sub: 'Usar o que leu', color: 'verde', icon: 'livro', req: { knowledge: 'astronomia' }, effects: { rel: { theodric: 10 }, flags: { invernoPrevisto: true }, res: { influencia: 5 }, xp: 18 }, reply: 'A constelação do Cervo está sumindo. O inverno chegará cedo. Você manda encher os celeiros. Quando a neve cair, o reino estará pronto.' },
          { label: 'Estou com sono, meistre', sub: 'Honestidade', color: 'vermelho', icon: 'balao', effects: { rel: { theodric: -3 }, xp: 3 }, reply: '"Os reis sempre estão com sono quando a ciência é interessante", ele suspira.' },
        ],
      },
    },
  },
  // ---------- Aurelian e a ronda ----------
  {
    id: 'noite_ronda', speaker: 'aurelian', topic: 'A ronda da meia-noite', kind: 'noite', weight: 3, minDay: 3, repeat: 14,
    nodes: {
      start: {
        text: 'O Capitão Aurelian faz a ronda e se surpreende ao vê-lo acordado. "Majestade. Posso dizer uma coisa franca? Os guardas apostam quantos meses o senhor vai durar. A média está em sete. Eu apostei em quarenta anos. Estou perdendo muito dinheiro."',
        choices: [
          { label: 'Quem apostou menos?', sub: 'Curioso', color: 'dourado', icon: 'olho', effects: { rel: { aurelian: 4 }, res: { moral: 2 }, xp: 6 }, reply: '"O cabo Tibúrcio. Duas semanas." No dia seguinte, Tibúrcio é promovido a guarda da sua porta. Ele passa a rezar pela sua saúde com um fervor comovente.' },
          { label: 'Fazer a ronda com ele', sub: 'Rei soldado', color: 'verde', icon: 'escudo', effects: { rel: { aurelian: 10 }, res: { moral: 5 }, xp: 10 }, reply: 'Vocês acham dois guardas dormindo, um jogando dados e um beijando a filha do padeiro. Você perdoa todos. A guarda inteira sabe na manhã seguinte, e as apostas sobem para doze meses.' },
          { label: 'Proibir apostas', sub: 'Disciplina', color: 'vermelho', icon: 'coroa', effects: { rel: { aurelian: 2 }, res: { moral: -3, prestigio: 1 }, xp: 5 }, reply: 'As apostas continuam, agora em segredo, e agora também sobre quanto tempo a proibição vai durar.' },
        ],
      },
    },
  },
  // ---------- Sálvio e o lanche da madrugada ----------
  {
    id: 'noite_salvio', speaker: 'salvio', topic: 'O cozinheiro insone', kind: 'noite', weight: 2, minDay: 4, repeat: 16,
    nodes: {
      start: {
        text: 'Mestre Sálvio, o cozinheiro-chefe, está na cozinha às duas da manhã provando um molho com cara de tragédia. "Majestade. Ninguém entende meu molho. Dezoito ingredientes. DEZOITO. E ontem Lorde Gaspard pediu... sal." Ele pronuncia sal como quem diz peste.',
        choices: [
          { label: 'Provar o molho', sub: 'Coragem culinária', color: 'verde', icon: 'coracao', goto: 'prova' },
          { label: 'Sal é bom, Sálvio', sub: 'Provocar', color: 'vermelho', icon: 'balao', effects: { rel: { salvio: -8 }, xp: 4 }, reply: 'Sálvio põe a mão no peito como se tivesse levado uma flechada. Por três dias, sua comida vem sem tempero nenhum. Uma vingança de chef.' },
        ],
      },
      prova: {
        text: 'O molho é... surpreendente. Arde, depois é doce, depois arde de novo, depois você vê cores. Sálvio espera com as mãos juntas.',
        choices: [
          { label: 'É uma obra-prima', sub: 'Mentira gentil', color: 'dourado', icon: 'coroa', effects: { rel: { salvio: 12 }, res: { moral: 1 }, xp: 6 }, reply: 'Sálvio chora. O molho entra no banquete da semana. Dois lordes passam mal, mas elogiam por educação.' },
          { label: 'Tem gosto de amêndoas...', sub: 'Espere...', color: 'roxo', icon: 'olho', req: { knowledge: 'venenos', label: 'Exige Venenos da Corte' }, effects: { rel: { salvio: 6 }, flags: { amendoaCozinha: true, conspiracaoRevelada: true }, xp: 16 }, reply: 'Sálvio empalidece. "Eu não uso amêndoas. Nunca." Alguém mexeu na despensa real. O cozinheiro, pela primeira vez, fica em silêncio.' },
          { label: 'Honestamente? Precisa de sal', sub: 'Crítica', color: 'azul', icon: 'balao', effects: { rel: { salvio: -4 }, xp: 8 }, reply: '"Até o senhor..." Sálvio desliga o fogo e vai dormir em silêncio. Amanhã você terá uma comida perfeita e ofendida.' },
        ],
      },
    },
  },
  // ---------- Frei Aske e o vinho sacramental ----------
  {
    id: 'noite_frei', speaker: 'frei_aske', topic: 'Um monge na adega', kind: 'noite', weight: 2, minDay: 6, repeat: 20,
    nodes: {
      start: {
        text: 'Frei Aske está na adega real "abençoando" o vinho. Já abençoou quatro barris. "Majestade! O Senhor me mandou um sonho. O senhor vai reinar por muito tempo... ou pouco. O sonho estava meio borrado. Culpa do vinho. Do sonho. Do vinho do sonho."',
        choices: [
          { label: 'Escrever isso nas crônicas', sub: 'Profecia oficial', color: 'dourado', icon: 'pergaminho', effects: { res: { povo: 2, prestigio: 1 }, rel: { frei_aske: 8 }, xp: 6 }, reply: 'A profecia "o rei reinará por muito ou pouco tempo" é lida na praça. O povo acha profundíssima.' },
          { label: 'Beber um barril com ele', sub: 'Fé líquida', color: 'roxo', icon: 'uva', effects: { rel: { frei_aske: 12 }, res: { prestigio: -2, influencia: 2 }, xp: 8 }, reply: 'Frei Aske conta os segredos de confissão de metade da corte. Você não devia saber que Lady Maren tem um marido em outro reino. Mas agora sabe.' },
          { label: 'Fechar a adega a chave', sub: 'Sobriedade', color: 'azul', icon: 'cadeado', effects: { rel: { frei_aske: -6 }, res: { ouro: 15 }, xp: 5 }, reply: 'O consumo de vinho do castelo cai pela metade. Corvin fica radiante. Frei Aske faz um sermão sobre reis avarentos.' },
        ],
      },
    },
  },
  // ---------- Pimenta insone ----------
  {
    id: 'noite_pimenta', speaker: 'pimenta', topic: 'O bobo sem graça', kind: 'noite', weight: 2, minDay: 10, repeat: 20,
    nodes: {
      start: {
        text: 'Pimenta está sentado sozinho no trono, sem guizos, sem pintura. "Não se assuste, Majestade. De noite eu sou só o Beto. O Beto não tem piada. O Beto tem medo. Se o reino cair, o bobo é o primeiro a ser enforcado. Os tiranos odeiam quem ri deles."',
        choices: [
          { label: 'Ninguém vai enforcar o Beto', sub: 'Proteger', color: 'azul', icon: 'escudo', effects: { rel: { pimenta: 15 }, xp: 10 }, reply: '"Promessa de rei vale pouco", ele diz, pintando o sorriso de volta. "Mas a sua eu vou guardar."' },
          { label: 'Me conte uma piada, Beto', sub: 'Alegrar o bobo', color: 'dourado', icon: 'balao', effects: { rel: { pimenta: 8 }, res: { moral: 1 }, xp: 8 }, reply: '"Um rei, um chanceler e um bobo entram numa sala. Só o bobo sai rico. Porque é o único que não fala a verdade de graça." Vocês riem até doer.' },
          { label: 'Sair do meu trono, Beto', sub: 'Protocolo', color: 'vermelho', icon: 'coroa', effects: { rel: { pimenta: -8 }, xp: 3 }, reply: 'Ele sai. Mas deixa um guizo no assento, que você só descobre na audiência do dia seguinte, ao sentar.' },
        ],
      },
    },
  },
  // ---------- Lysandra e o vinho (arco da conspiração) ----------
  {
    id: 'noite_vinho', speaker: 'lysandra', topic: 'Um brinde à meia-noite', kind: 'noite', weight: 9, cond: (s) => s.flags.lysandra === 1,
    nodes: {
      start: {
        text: 'Lady Lysandra Cinzel o espera na galeria com duas taças e um sorriso ensaiado. "Majestade. Prometi que brindaríamos. Vinho de Cinzel, envelhecido nas minas. Um presente de Lorde Otho." Ela ergue a taça dela. A sua cheira levemente a amêndoas.',
        choices: [
          { label: 'Beber', sub: 'Confiar', color: 'vermelho', icon: 'uva', effects: { flags: { lysandra: 2 } }, goto: 'bebe' },
          { label: 'Trocar as taças com um truque', sub: 'Exige Intriga 3', color: 'roxo', icon: 'mascara', req: { attr: ['intriga', 3] }, effects: { flags: { lysandra: 3, conspiracaoRevelada: true }, schedule: [{ id: 'atentado', in: 3 }], xp: 22 }, reply: 'Você a distrai apontando um retrato e troca as taças. Ela bebe a sua e percebe tarde demais. Sai correndo, pálida, para vomitar no jardim. Agora você sabe. E ela sabe que você sabe.' },
          { label: 'Isso cheira a amêndoas, milady', sub: 'Exige Venenos da Corte', color: 'verde', icon: 'livro', req: { knowledge: 'venenos' }, effects: { flags: { lysandra: 3, conspiracaoRevelada: true }, xp: 22 }, goto: 'desmascara' },
          { label: 'Obrigado, mas estou cansado', sub: 'Recusar', color: 'azul', icon: 'escudo', effects: { flags: { lysandra: 3 }, schedule: [{ id: 'atentado', in: 3 }], rel: { aurelian: 2 }, xp: 8 }, reply: 'Ela sorri sem mostrar os dentes. "Outro dia, então." Algo no jeito que ela diz "outro dia" faz você trancar a porta duas vezes.' },
        ],
      },
      bebe: {
        text: (s) => (s.flags.tacaTestada || hasSkill(s, 'rede') ? 'Você leva a taça aos lábios e para. Lembra do provador que passou mal com o vinho de Otho. Joga o vinho no vaso de planta. Na manhã seguinte, a planta está morta. Lysandra já fugiu do castelo.' : 'O vinho desce doce. Dez minutos depois o mundo gira, a boca queima, e você cai de joelhos. Lysandra desaparece no escuro. Os guardas o encontram no chão, e a Irmã Hedda passa a noite fazendo você vomitar tudo, incluindo o orgulho.'),
        choices: [
          { label: 'Sobreviver. E caçá-la', sub: 'A conspiração é real', color: 'vermelho', icon: 'espadas', effects: { res: { prestigio: -3, moral: 4 }, flags: { envenenado: true, conspiracaoRevelada: true }, schedule: [{ id: 'atentado', in: 3 }], rel: { irma: 6 }, xp: 20 }, reply: 'Você passa um dia de cama. A corte sussurra. Alguém tentou matar o rei, e errou. Quem erra uma vez, tenta de novo.' },
        ],
      },
      desmascara: {
        text: 'O sorriso dela congela. Por um segundo ela pensa em fugir; depois pensa melhor e se ajoelha. "Majestade... eles têm minha irmã nas minas de Cinzel. Eu não tinha escolha. Lorde Otho quer o senhor morto antes do inverno."',
        choices: [
          { label: 'Testemunhe contra Otho e será perdoada', sub: 'Virar a peça', color: 'roxo', icon: 'pergaminho', effects: { flags: { testemunhaLysandra: true }, rel: { lysandra: 15 }, schedule: [{ id: 'atentado', in: 4 }], res: { influencia: 6 }, xp: 20 }, reply: 'Ela aceita, tremendo. Mas Otho vai perceber que ela falhou. E um homem desesperado manda outros assassinos.' },
          { label: 'Prendê-la agora', sub: 'Justiça imediata', color: 'vermelho', icon: 'cadeado', effects: { flags: { lysandraPresa: true }, loyalty: { montclair: -6 }, schedule: [{ id: 'atentado', in: 3 }], res: { prestigio: 3 }, xp: 16 }, reply: 'Os guardas a levam. Ela não fala mais nada. Na masmorra, alguém tentará calá-la para sempre.' },
        ],
      },
    },
  },
  // ---------- Esposas ----------
  spouseNight('elenora', 'Elenora está acordada com três livros-caixa abertos na cama. "Meu rei. Descobri que meu pai cobra de nós o dobro pelo sal. O meu próprio pai. Estou orgulhosa e furiosa ao mesmo tempo. Devo contar a ele que descobri ou devo cobrar juros?"',
    ['Cobre juros. Com amor', 'Parceria', 'Ela ri e beija você na testa. "Eu sabia que tinha me casado bem." Gaspard recebe uma carta muito educada e muito cara.'],
    ['Use isso para negociar a frota', 'Estratégia', '"Chantagear meu pai com carinho. Você está aprendendo." A frota Valmont passa a escoltar seus navios sem custo.'],
    ['Não quero falar de sal agora', 'Cansaço', '"Ninguém nunca quer falar de sal", ela suspira, e fecha os livros com força demais.']),
  spouseNight('rhoswen', 'Rhoswen está afiando uma espada na cama, de camisola. "Não consigo dormir. Sonhei que você caía do cavalo na frente dos Drakon. Amanhã às cinco treinamos. Você vai cair de novo, mas vai cair melhor."',
    ['Treinar agora, à luz de velas', 'Paixão marcial', 'Vocês duelam no quarto, derrubam uma armadura antiga e acordam o castelo inteiro. Rhoswen ri como uma criança. Os guardas contam que a rainha venceu. Ela venceu.'],
    ['Me ensine o golpe dos Drakon', 'Aprender', '"O golpe dos Drakon é não ter medo." Ela o derruba três vezes. Na quarta, você resiste um segundo. É o melhor segundo do casamento até agora.'],
    ['Às cinco da manhã? Não', 'Recusar', '"Então às quatro", ela diz, e vira para o lado. Você não sabe se foi piada.']),
  spouseNight('isolde', 'Isolde lê cartas à luz de uma vela, rindo baixinho. "Meu amor, a corte de Véridian acha que eu estou infeliz aqui. Minha prima já está reservando meu antigo quarto. Quer que eu escreva de volta que o senhor é um tédio, e que por isso eu sou feliz?"',
    ['Escreva que sou irresistível', 'Vaidade a dois', '"Vou escrever que o senhor ronca, e que eu gosto." Ela dobra a carta e sela com um beijo. Véridian recebe a carta mais doce e mais estranha do ano.'],
    ['Quais cartas são essas, exatamente?', 'Desconfiança útil', 'Ela sorri. "Nenhum segredo que o senhor não possa comprar com um beijo." São relatórios sobre a Guilda. Ela espiona para você. Por enquanto.'],
    ['Pare de conspirar na cama', 'Irritação', '"Conspirar na cama é tradição em Véridian, meu rei. Mas está bem. Eu conspiro no café da manhã, então."']),
  spouseNight('sigrid', 'Sigrid está na janela aberta, apesar do frio, olhando para o norte. "Lá em Hjalmgard, agora, meu irmão está bebendo e prometendo matar você. Todo inverno ele promete matar alguém. Só às vezes cumpre." Ela fecha a janela. "Quero que saiba que, se ele vier, eu fico do seu lado."',
    ['Eu sei. E fico do seu', 'Confiança', 'Ela o abraça com a força de quem já perdeu muita coisa. É a primeira vez que ela deixa você ver que tem medo.'],
    ['Me ensine como ele pensa', 'Inteligência', '"Ragnar pensa como um lobo faminto: ataca o mais fraco primeiro." Ela desenha o Passo Cinzento no vidro embaçado. Agora você sabe por onde ele virá.'],
    ['Como vou saber se é verdade?', 'Suspeita', 'Ela fica em silêncio por muito tempo. "Não vai. É isso que é confiar." Ela dorme de costas para você.']),
  // ---------- Escândalo: caso com a confeiteira e a rainha ----------
  {
    id: 'noite_flagra', speaker: 'bianca', topic: 'Farinha na escada', kind: 'noite', weight: 5, minDay: 21, repeat: 10, cond: (s) => married(s) && !!s.flags.casoBianca,
    nodes: {
      start: {
        text: (s) => `Quinta-feira. Você desce a escada da cozinha. Bianca está lá com a torta de maçã. E, dois degraus acima, de braços cruzados, com uma vela na mão, está ${sp(s)}.`,
        choices: [
          { label: 'Eu só vim pela torta', sub: 'A pior defesa', color: 'dourado', icon: 'balao', goto: 'torta' },
          { label: 'Confessar tudo', sub: 'Honestidade tardia', color: 'azul', icon: 'coracao', goto: 'confessa' },
          { label: 'Culpar o Pimenta', sub: 'Sem vergonha', color: 'roxo', icon: 'mascara', effects: { rel: { pimenta: -10 } }, goto: 'culpa' },
        ],
      },
      torta: {
        text: (s) => `${sp(s)} olha para a torta. Depois para Bianca. Depois para você. "É uma torta muito boa, então." Ela pega a torta inteira e sobe as escadas com ela.`,
        choices: [
          { label: 'Segui-la e implorar', sub: 'Salvar o casamento', color: 'azul', icon: 'aperto', effects: { flags: { casoBianca: false, bianca: false }, rel: { bianca: -10 }, run: (s) => { if (s.spouse) s.rel[s.spouse] = (s.rel[s.spouse] ?? 0) - 10; }, res: { prestigio: -3 }, xp: 10 }, reply: 'Você implora por duas horas. Ela come a torta inteira na sua frente, sem oferecer. Bianca é transferida para Véridian. O perdão, se vier, virá devagar.' },
          { label: 'Ficar com Bianca', sub: 'Escândalo real', color: 'vermelho', icon: 'coracao', effects: { rel: { bianca: 15 }, run: (s) => { if (s.spouse) { s.rel[s.spouse] = (s.rel[s.spouse] ?? 0) - 30; const h = { elenora: 'valmont', rhoswen: 'drakon' }[s.spouse] as 'valmont' | 'drakon' | undefined; if (h) s.loyalty[h] -= 20; } }, res: { prestigio: -10, povo: 2 }, xp: 8 }, reply: 'A notícia corre o reino antes do amanhecer. Os bardos compõem "A Balada da Torta de Maçã". A família da rainha, nada contente, parou de responder às suas cartas.' },
        ],
      },
      confessa: {
        text: (s) => `${sp(s)} escuta tudo sem piscar. "Obrigada por não mentir. Pelo menos isso." Ela desce os degraus, pega um garfo, prova a torta. "Está boa mesmo. Bianca, você parte amanhã. Com uma carta de recomendação. Não é culpa sua que o rei é um idiota."`,
        choices: [
          { label: 'Aceitar a sentença', sub: 'Humildade', color: 'azul', icon: 'escudo', effects: { flags: { casoBianca: false, bianca: false }, rel: { bianca: -5 }, run: (s) => { if (s.spouse) s.rel[s.spouse] = (s.rel[s.spouse] ?? 0) - 5; }, xp: 14 }, reply: 'Bianca parte chorando e levando a receita. O castelo nunca mais come uma torta decente. Esse é o verdadeiro castigo.' },
        ],
      },
      culpa: {
        text: (s) => `"O PIMENTA?" ${sp(s)} fica tão perplexa que quase ri. Nesse momento, o próprio Pimenta aparece do nada: "Culpado! Eu fiz a torta, seduzi a confeiteira e obriguei o rei a descer. Sou um monstro." Ele faz uma reverência. Ninguém acredita, mas é engraçado demais para brigar.`,
        choices: [
          { label: 'Aproveitar a deixa e fugir', sub: 'Covardia com estilo', color: 'dourado', icon: 'balao', effects: { rel: { pimenta: 12 }, flags: { casoBianca: false }, run: (s) => { if (s.spouse) s.rel[s.spouse] = (s.rel[s.spouse] ?? 0) - 8; }, xp: 8 }, reply: 'Você sobe. A rainha fica. Ela e Pimenta conversam por uma hora. Você nunca vai saber sobre o quê, e isso é o pior.' },
        ],
      },
    },
  },
];
