import type { GameEvent, GameState } from '../../types';

const campedAt = (p: string) => (s: GameState) => (s.flags.armyAt || 'castelmar') === p && !s.war;

// Reações ao exército real: onde ele acampa e quanto ele cresce mexem com os lordes.
export const ARMY_EVENTS: GameEvent[] = [
  {
    id: 'exercito_drakon', speaker: 'brandt', topic: 'Tropas reais no Vale Rubro', kind: 'audiencia', lasts: 2, cond: campedAt('vale'),
    nodes: {
      start: {
        text: (s) => (s.loyalty.drakon >= 0 ? 'Majestade, seus soldados chegaram ao Vale. Meus homens estão... surpresos. Um rei que manda tropas para a fronteira em vez de escondê-las na capital. Isso é raro.' : 'Majestade. Há soldados reais acampados nas minhas terras, comendo meus grãos. Os Drakon querem saber: isso é proteção ou ameaça?'),
        choices: [
          { label: 'É proteção. Norhelm vem aí', sub: 'Tranquilizar', color: 'azul', icon: 'escudo', effects: { loyalty: { drakon: 5 }, rel: { brandt: 4 } }, goto: 'protecao' },
          { label: 'É um lembrete de quem manda', sub: 'Intimidar', color: 'vermelho', icon: 'coroa', effects: { loyalty: { drakon: -8 }, res: { prestigio: 4 }, rel: { brandt: -8 }, xp: 8 }, reply: 'Brandt fica muito quieto. "Entendido, Majestade." Ele entendeu. E vai lembrar.' },
          { label: 'Vamos treinar juntos', sub: 'Tropas unidas', color: 'verde', icon: 'aperto', effects: { res: { moral: 6 }, loyalty: { drakon: 6 }, xp: 10 }, reply: 'Soldados reais e lanceiros Drakon treinam lado a lado. No fim do dia, bebem juntos também.' },
        ],
      },
      protecao: {
        text: 'Brandt assente devagar. "Então que fiquem. Mas soldados comem, Majestade. Quem paga os grãos que eles tiram dos meus camponeses?"',
        choices: [
          { label: 'A coroa paga', sub: '−120 de ouro', color: 'dourado', icon: 'moedas', req: { ouro: 120 }, effects: { res: { ouro: -120 }, loyalty: { drakon: 8 }, rel: { brandt: 6 }, xp: 10 }, reply: '"Um rei que paga as próprias contas." Brandt quase sorri.' },
          { label: 'Os Drakon pagam, é a terra deles', sub: 'Economizar', color: 'vermelho', icon: 'escudo', effects: { loyalty: { drakon: -5 }, xp: 8 }, reply: 'Brandt paga, rangendo os dentes. Os camponeses do vale pagam mais ainda.' },
        ],
      },
    },
    ignored: { text: 'Lorde Brandt esperou uma explicação sobre as tropas no Vale Rubro. Não teve.', loyalty: { drakon: -5 } },
  },
  {
    id: 'exercito_valmont', speaker: 'gaspard', topic: 'Soldados na Costa Serena', kind: 'audiencia', lasts: 2, cond: campedAt('costa'),
    nodes: {
      start: {
        text: 'Majestade, soldados no porto espantam mercadores. Três navios de Véridian deram meia-volta ontem ao ver lanças no cais. O que o exército real faz na Costa Serena?',
        choices: [
          { label: 'Protegendo o porto de piratas', sub: 'Justificar', color: 'azul', icon: 'escudo', effects: { loyalty: { valmont: 3 } }, goto: 'porto' },
          { label: 'Vigiando os Valmont', sub: 'Franqueza perigosa', color: 'roxo', icon: 'olho', effects: { loyalty: { valmont: -10 }, rel: { gaspard: -10 }, res: { influencia: 3 }, xp: 8 }, reply: 'Gaspard empalidece. Naquela noite, três cartas saem da Costa Serena para destinos que você não conhece.' },
          { label: 'Vão embora amanhã', sub: 'Recuar', color: 'verde', icon: 'aperto', effects: { loyalty: { valmont: 5 }, run: (s) => (s.flags.armyAt = 'castelmar'), xp: 6 }, reply: 'As tropas voltam à capital. Os navios voltam ao porto.' },
        ],
      },
      porto: {
        text: '"Piratas." Gaspard sorri, sem acreditar. "Então que fiquem longe do cais e perto das praias. E que a coroa compense os navios que perdi."',
        choices: [
          { label: 'Compensar', sub: '−100 de ouro', color: 'dourado', icon: 'moedas', req: { ouro: 100 }, effects: { res: { ouro: -100 }, loyalty: { valmont: 6 }, xp: 10 }, reply: 'O ouro acalma Gaspard como poucas coisas acalmam.' },
          { label: 'Tropas afastadas do cais', sub: 'Meio-termo', color: 'azul', icon: 'aperto', effects: { loyalty: { valmont: 3 }, xp: 10 }, reply: 'As tropas acampam nas dunas. Os mercadores voltam, desconfiados.' },
        ],
      },
    },
    ignored: { text: 'O comércio da Costa Serena sofreu com os soldados no porto.', loyalty: { valmont: -5 }, res: { ouro: -60 } },
  },
  {
    id: 'exercito_seren', speaker: 'aveline', topic: 'Lanças nos bosques sagrados', kind: 'audiencia', lasts: 2, cond: campedAt('bosques'),
    nodes: {
      start: {
        text: 'Majestade, seus soldados cortaram carvalhos para as fogueiras do acampamento. Carvalhos sagrados. Os camponeses estão com medo, e com raiva.',
        choices: [
          { label: 'Punir quem cortou as árvores', sub: 'Respeitar a fé', color: 'verde', icon: 'arvore', effects: { loyalty: { seren: 8 }, res: { moral: -4 }, rel: { aveline: 6 }, xp: 10 }, reply: 'Três soldados são açoitados diante do bosque. Aveline assente, satisfeita. Os soldados, nem um pouco.' },
          { label: 'Soldados precisam de fogo', sub: 'Praticidade', color: 'vermelho', icon: 'espadas', effects: { loyalty: { seren: -8 }, rel: { aveline: -8 } }, goto: 'fogo' },
          { label: 'Mudar o acampamento', sub: 'Custa 1 de Influência', color: 'azul', icon: 'aperto', req: { influencia: 1 }, effects: { res: { influencia: -1 }, loyalty: { seren: 5 }, xp: 8 }, reply: 'O acampamento sai da clareira sagrada. As fogueiras usam lenha morta a partir de hoje.' },
        ],
      },
      fogo: {
        text: 'Os olhos de Aveline ficam frios como pedra de rio. "Então os bosques lembrarão deste inverno, Majestade. E do rei que o esquentou com árvores sagradas."',
        choices: [
          { label: 'Plantar dez carvalhos para cada um', sub: '−60 de ouro', color: 'verde', icon: 'arvore', req: { ouro: 60 }, effects: { res: { ouro: -60 }, loyalty: { seren: 10 }, rel: { aveline: 8 }, xp: 12 }, reply: '"Dez por um." Aveline repete, surpresa. "Isso os bosques também lembrarão."' },
          { label: 'Lembrar que o rei protege os bosques', sub: 'Firmeza', color: 'vermelho', icon: 'coroa', effects: { res: { prestigio: 2 }, loyalty: { seren: -3 }, xp: 8 }, reply: 'Aveline sai sem se despedir.' },
        ],
      },
    },
    ignored: { text: 'Os Seren acenderam velas negras pelos carvalhos cortados.', loyalty: { seren: -6 } },
  },
  {
    id: 'exercito_montclair', speaker: 'otho', topic: 'Um exército nas montanhas', kind: 'audiencia', lasts: 2, cond: campedAt('montanhas'),
    nodes: {
      start: {
        text: 'Majestade... que honra. O exército real inteiro, nas minhas montanhas. Posso perguntar o motivo? Os mineiros ficam nervosos com tantas lanças por perto.',
        choices: [
          { label: 'A fronteira com Norhelm', sub: 'Motivo oficial', color: 'azul', icon: 'escudo', effects: { loyalty: { montclair: 2 } }, goto: 'fronteira' },
          { label: 'Ouvi rumores sobre cartas do norte', sub: 'Pressionar', color: 'roxo', icon: 'mascara', effects: { loyalty: { montclair: -6 }, rel: { otho: -8 }, flags: { conspiracaoRevelada: true }, res: { influencia: 4 }, xp: 12 }, reply: 'Otho ri, mas a mão treme no copo. Se havia uma conspiração, ela acaba de ficar muito mais cara.' },
          { label: 'Inspecionar as minas', sub: 'Mostrar presença', color: 'dourado', icon: 'olho', effects: { res: { ouro: 120 }, loyalty: { montclair: -4 }, xp: 10 }, reply: 'Seus soldados "descobrem" um estoque de prata não declarado. A coroa confisca a sua parte.' },
        ],
      },
      fronteira: {
        text: '"A fronteira, claro." Otho sorri. "Então o senhor não se importará se meus homens ajudarem a vigiar. Afinal, conhecemos os passos melhor que ninguém."',
        choices: [
          { label: 'Aceitar a ajuda', sub: 'Confiança arriscada', color: 'verde', icon: 'aperto', effects: { loyalty: { montclair: 6 }, rel: { otho: 6 }, xp: 10 }, reply: 'Homens de Otho e soldados reais patrulham juntos. Você não sabe se ganhou guias ou espiões.' },
          { label: 'Recusar educadamente', sub: 'Cautela', color: 'azul', icon: 'escudo', effects: { loyalty: { montclair: -3 }, res: { influencia: 2 }, xp: 10 }, reply: '"Como quiser, Majestade." O sorriso não chega aos olhos.' },
        ],
      },
    },
    ignored: { text: 'Otho Montclair escreveu cartas preocupadas sobre o exército nas montanhas.', loyalty: { montclair: -4 } },
  },
  {
    id: 'capital_vazia', speaker: 'marta', topic: 'A capital sem soldados', kind: 'audiencia', lasts: 2, cond: (s) => (s.flags.armyAt || 'castelmar') !== 'castelmar' && !s.war,
    nodes: {
      start: {
        text: 'Majestade, desde que o exército saiu, os ladrões voltaram à cidade baixa. Roubaram a padaria do Tomás duas vezes. A guarda que ficou é pouca.',
        choices: [
          { label: 'O exército volta em breve', sub: 'Promessa', color: 'azul', icon: 'escudo', effects: { rel: { marta: 3 } }, goto: 'promessa' },
          { label: 'Formar uma milícia de bairro', sub: '−60 de ouro', color: 'verde', icon: 'povo', req: { ouro: 60 }, effects: { res: { ouro: -60, povo: 6 }, rel: { marta: 8 }, xp: 10 }, reply: 'Artesãos e padeiros ganham lanças e apitos. A cidade baixa dorme um pouco melhor.' },
          { label: 'O reino precisa das tropas lá fora', sub: 'Prioridade', color: 'vermelho', icon: 'coroa', effects: { res: { povo: -4 }, xp: 6 }, reply: '"E quem precisa de nós aqui dentro?", Marta pergunta, e vai embora.' },
        ],
      },
      promessa: {
        text: '"Em breve quando, Majestade? O povo conta os dias. E conta as padarias roubadas também."',
        choices: [
          { label: 'Mandar o exército voltar agora', sub: 'O exército volta à capital', color: 'verde', icon: 'povo', effects: { run: (s) => (s.flags.armyAt = 'castelmar'), res: { povo: 6 }, rel: { marta: 6 }, xp: 10 }, reply: 'As tropas voltam marchando pela avenida. O povo aplaude das janelas.' },
          { label: 'Reforçar a guarda da cidade', sub: '−100 ouro, +100 soldados', color: 'dourado', icon: 'moedas', req: { ouro: 100 }, effects: { res: { ouro: -100, exercito: 100, povo: 4 }, xp: 10 }, reply: 'Cem guardas novos na cidade baixa. Os ladrões mudam de bairro.' },
        ],
      },
    },
    ignored: { text: 'Os roubos continuaram na cidade baixa sem o exército.', res: { povo: -5 } },
  },
  {
    id: 'exercito_grande', speaker: 'gaspard', topic: 'Um exército grande demais', kind: 'audiencia', lasts: 2,
    nodes: {
      start: {
        text: 'Majestade, os lordes estão contando suas lanças. Mil e duzentos soldados reais... nenhum rei de Castelmar teve tantos em tempo de paz. As casas se perguntam contra quem.',
        advice: {
          aldric: { text: 'Aldric, preocupado: "Diga a eles que o exército será reduzido depois do perigo passar. Uma promessa barata que acalma muito."', choice: { label: 'Prometer reduzir depois', sub: 'Conselho do Chanceler', color: 'azul', icon: 'pergaminho', effects: { loyalty: { valmont: 4, montclair: 4, seren: 3 }, rel: { aldric: 5 }, flags: { promessaReduzir: true }, xp: 10 }, reply: 'Os lordes aceitam a promessa. Por enquanto.' } },
        },
        choices: [
          { label: 'Contra Norhelm, claro', sub: 'Tranquilizar', color: 'azul', icon: 'escudo', effects: { loyalty: { valmont: 3, drakon: 3 } }, goto: 'norte' },
          { label: 'Contra quem precisar', sub: 'Intimidar as casas', color: 'vermelho', icon: 'coroa', effects: { res: { prestigio: 5 }, loyalty: { valmont: -6, montclair: -6, seren: -4 }, xp: 8 }, reply: 'Gaspard engole em seco. A notícia corre os castelos em dois dias: o jovem rei não tem medo de usar o que tem.' },
          { label: 'Convidar as casas a contribuir', sub: 'Dividir o custo', color: 'dourado', icon: 'moedas', effects: { res: { ouro: 150 }, loyalty: { valmont: -2, montclair: -2 }, xp: 10 }, reply: 'As casas pagam uma "contribuição de defesa". Ninguém gosta, todos pagam.' },
        ],
      },
      norte: {
        text: '"Norhelm." Gaspard avalia você. "E depois que Norhelm passar, Majestade? Exércitos parados costumam procurar trabalho."',
        choices: [
          { label: 'Depois, eles vão para casa', sub: 'Promessa', color: 'verde', icon: 'aperto', effects: { loyalty: { valmont: 5, montclair: 4, seren: 4 }, flags: { promessaReduzir: true }, xp: 10 }, reply: 'Gaspard sorri. Ele vai cobrar essa promessa, com juros.' },
          { label: 'Depois, veremos', sub: 'Não se comprometer', color: 'roxo', icon: 'mascara', effects: { res: { influencia: 2 }, loyalty: { valmont: -3 }, xp: 8 }, reply: '"Veremos", ele repete. A palavra fica no ar como fumaça.' },
        ],
      },
    },
    ignored: { text: 'Os lordes ficaram sem resposta sobre o tamanho do exército e tiraram as próprias conclusões.', loyalty: { valmont: -4, montclair: -4, seren: -3 } },
  },
];
