import type { GameEvent, GameState } from '../../types';
import { addClue } from '../../engine/conspiracy';

// Encontros no castelo: o rei entra num cômodo e dá de cara com alguma coisa.
// Sempre com a opção de passar reto. O que se ouve às escondidas vale mais, e custa mais.
const E = (e: Omit<GameEvent, 'kind' | 'domain'>): GameEvent => ({ ...e, kind: 'encontro', domain: 'pessoal', hours: e.hours ?? 0.25 });
const track = (s: GameState, k: string) => s.tracks[k] ?? 0;

export const ENCOUNTER_EVENTS: GameEvent[] = [
  E({
    id: 'enc_aldric_corvin', speaker: 'aldric', topic: 'Uma discussão baixa', room: 'conselho', hoursWindow: [9, 17], weight: 3, minDay: 4, present: ['corvin'],
    nodes: {
      start: {
        text: 'Aldric e Corvin discutem perto da janela, em voz baixa e rápida. Corvin segura um livro-caixa contra o peito. Nenhum dos dois viu você entrar.',
        choices: [
          { label: 'Escutar escondido', sub: 'Atrás da tapeçaria', color: 'roxo', icon: 'olho', goto: 'escuta' },
          { label: 'Interromper', sub: '"Algum problema, senhores?"', color: 'azul', icon: 'coroa', effects: { bond: { corvin: { medo: 5 }, aldric: { confianca: 2 } }, xp: 4 }, reply: 'Os dois se separam como crianças flagradas. "Números, Majestade. Só números." Corvin some com o livro.' },
          { label: 'Passar reto', sub: 'Não é da sua conta (ainda)', color: 'dourado', icon: 'seta', reply: 'Você finge não ver. Eles fingem que você não viu. É assim que funciona um castelo.' },
        ],
      },
      escuta: {
        text: '"...não pode aparecer nas contas", sibila Aldric. "O rei vai perguntar." Corvin: "O rei não lê as contas. O pai dele também não lia, e veja como acabou." Silêncio. "Não foi isso que eu quis dizer."',
        choices: [
          { label: 'Sair das sombras agora', sub: 'Confronto', color: 'vermelho', icon: 'espadas', effects: { bond: { corvin: { medo: 12 }, aldric: { ressentimento: 4 } }, clue: 'contas_velas', mood: { anger: 12 }, xp: 14 }, reply: 'Corvin deixa cair o livro. Na página aberta, uma coluna inteira de "velas". Aldric fecha o livro com o pé.' },
          { label: 'Continuar escondido', sub: 'Guardar o que ouviu', color: 'roxo', icon: 'mascara', effects: { clue: 'contas_velas', res: { influencia: 2 }, xp: 14 }, reply: 'Eles saem cada um por uma porta. Você fica com a frase na cabeça: "e veja como acabou".' },
        ],
      },
    },
  }),
  E({
    id: 'enc_cadeiras', speaker: 'pimenta', topic: 'Cadeiras fora do lugar', room: 'conselho', hoursWindow: [18, 21], weight: 4, minDay: 24,
    nodes: { start: {
      text: 'A sala do conselho devia estar vazia. As cinco cadeiras estão viradas para o centro, em círculo, em volta da Mesa das Chaves. As velas ainda estão quentes. Pimenta, escondido embaixo da mesa, levanta um dedo sobre os lábios.',
      choices: [
        { label: 'Quem estava aqui, Pimenta?', sub: 'Perguntar ao bobo', color: 'roxo', icon: 'mascara', effects: { clue: 'reuniao_noturna', rel: { pimenta: 4 }, mood: { stress: 10 }, xp: 16 }, reply: '"Não vi rostos, só sapatos. Botas de montanha, sapatilhas de corte e uma bota que rangia." Ele sai de baixo da mesa. "Sapatos contam mais que rostos, Majestade."' },
        { label: 'Arrumar as cadeiras e sair', sub: 'Não deixar rastro', color: 'azul', icon: 'escudo', effects: { clue: 'reuniao_noturna', xp: 10 }, reply: 'Você coloca cada cadeira no lugar. Amanhã, quem as virou vai saber que alguém esteve aqui.' },
      ],
    } },
  }),
  E({
    id: 'enc_lucas_estabulo', speaker: 'lucas', topic: 'Um cavalo selado', room: 'patio', hoursWindow: [14, 19], weight: 3, minDay: 5, cond: (s) => !s.flags.lucasPego,
    nodes: { start: {
      text: 'Lucas está selando um cavalo atrás do estábulo, com um alforje estufado e um chapéu de camponês. Ele congela. "Isto não é o que parece. É um passeio. Muito longo. Com bagagem."',
      choices: [
        { label: 'Vou com você até o portão', sub: 'Irmão cúmplice', color: 'verde', icon: 'coracao', effects: { rel: { lucas: 10 }, bond: { lucas: { confianca: 8 } }, flags: { lucasTaverna: true, lucasPego: true }, schedule: [{ id: 'lucas_taverna', in: 3 }], xp: 10 }, reply: 'No portão, ele confessa: é a Taverna do Javali Cego, e uma cantora chamada Anelise. Você o deixa ir com um guarda disfarçado.' },
        { label: 'Desselar o cavalo', sub: 'Hoje não', color: 'vermelho', icon: 'coroa', effects: { rel: { lucas: -8 }, flags: { lucasPego: true }, xp: 5 }, reply: '"Você está virando a mãe", ele diz, e tira o chapéu. Não é elogio.' },
      ],
    } },
  }),
  E({
    id: 'enc_clara_cama', speaker: 'clara', topic: 'A camareira', room: 'quarto', hoursWindow: [8, 11], weight: 2, minDay: 3,
    nodes: { start: {
      text: 'Clara está arrumando sua cama e, ao ver você, derruba o travesseiro, depois o outro, depois a si mesma sentada no chão. "Majestade! Eu... estava verificando o nível de fofura dos travesseiros. Está ótimo."',
      choices: [
        { label: 'Ajudar a levantar', sub: 'Gentileza', color: 'verde', icon: 'coracao', effects: { rel: { clara: 8 }, flags: { admiradoraClara: true }, mood: { joy: 5 }, xp: 5 }, reply: 'Ela fica da cor das cortinas. Sai correndo esquecendo o balde. Volta para buscar o balde. Sai correndo de novo.' },
        { label: 'Perguntar o que se fala no castelo', sub: 'Camareiras ouvem tudo', color: 'roxo', icon: 'olho', effects: { res: { influencia: 2 }, rel: { clara: 3 }, xp: 8 }, reply: '"Que Lady Lysandra pediu a chave da adega. Que o Chanceler dorme no arquivo. E que o senhor ronca." Ela tampa a boca. "A última não."' },
      ],
    } },
  }),
  E({
    id: 'enc_confissao', speaker: 'frei_aske', topic: 'Vozes no confessionário', room: 'capela', hoursWindow: [11, 17], weight: 3, minDay: 9, present: ['lysandra'],
    nodes: { start: {
      text: 'Do confessionário vem uma voz de mulher, rápida e trêmula. "...não sei se consigo, padre. Ele é só um menino." Frei Aske responde algo que você não ouve. Depois a voz: "Perdoe-me pelo que ainda não fiz."',
      choices: [
        { label: 'Esperar para ver quem sai', sub: 'Paciência', color: 'roxo', icon: 'olho', effects: { clue: 'cartas_lysandra', mood: { stress: 8 }, xp: 14 }, reply: 'Lady Lysandra Cinzel sai do confessionário, vê você e sorri como se nada tivesse acontecido. O sorriso só falha no canto da boca.' },
        { label: 'Sair antes de ouvir mais', sub: 'O sigilo é sagrado', color: 'azul', icon: 'estrela', effects: { rel: { frei_aske: 4 }, loyalty: { seren: 1 }, xp: 6 }, reply: 'Você sai da capela. Algumas coisas não se escutam. Outras não se esquecem.' },
      ],
    } },
  }),
  E({
    id: 'enc_carta_escondida', speaker: 'isolde', topic: 'Uma carta escondida', room: 'aposentos', hoursWindow: [9, 18], weight: 3, minDay: 23, cond: (s) => !!s.spouse && !s.flags.cartaEscondidaVista,
    nodes: { start: {
      text: (s) => `Você entra nos aposentos sem se anunciar. ${s.spouse === 'isolde' ? 'Isolde' : 'A rainha'} dobra uma carta rápido demais e a esconde na manga. Sorri. Um sorriso bom, mas rápido demais também.`,
      choices: [
        { label: 'Pedir para ler', sub: 'Confiança direta', color: 'azul', icon: 'pergaminho', effects: { flags: { cartaEscondidaVista: true }, run: (s) => { const id = s.spouse!; const b = s.bonds[id]; if (b && b.confianca >= 45) { b.confianca = Math.min(100, b.confianca + 5); addClue(s, 'cinco_cadeiras'); } else if (b) b.ressentimento = Math.min(100, b.ressentimento + 6); }, xp: 12 }, reply: (s) => ((s.bonds[s.spouse!]?.confianca ?? 0) >= 50 ? 'Ela hesita e entrega. É de alguém da família dela: "Cinco cadeiras. Cuidado com a quarta." Ela também não sabe o que significa.' : '"É minha", ela diz, calma. E não entrega.') },
        { label: 'Fingir não ter visto', sub: 'Dar espaço', color: 'dourado', icon: 'olho', effects: { flags: { cartaEscondidaVista: true }, xp: 4 }, reply: 'Você fala do tempo. Ela fala do tempo. A carta fica na manga dela o jantar inteiro.' },
      ],
    } },
  }),
  E({
    id: 'enc_soldados_drakon', speaker: 'sir_ferrao', topic: 'Uma saudação estranha', room: 'patio', hoursWindow: [9, 18], weight: 4, cond: (s) => track(s, 'oficiaisDrakon') >= 15,
    nodes: { start: {
      text: 'Uma companhia marcha pelo pátio. Quando passam por você, batem continência. Quando passam pelo estandarte vermelho dos Drakon, batem continência e gritam. Sir Gerald Ferrão, à frente, não percebe a diferença. Ou percebe.',
      choices: [
        { label: 'Chamar Sir Gerald', sub: 'Perguntar a quem eles servem', color: 'vermelho', icon: 'coroa', effects: { clue: 'oficiais_drakon', rel: { sir_ferrao: -4 }, mood: { anger: 10 }, xp: 14 }, reply: '"Ao rei, naturalmente, Majestade." Uma pausa. "Através do Lorde Brandt." Ele não entende por que isso seria um problema.' },
        { label: 'Anotar e seguir', sub: 'Guardar para depois', color: 'roxo', icon: 'olho', effects: { clue: 'oficiais_drakon', xp: 10 }, reply: 'Você conta os estandartes no quartel. Vermelhos: onze. Azuis reais: quatro.' },
      ],
    } },
  }),
  E({
    id: 'enc_emissario_norte', speaker: 'haakon', topic: 'Medindo portas', room: 'salao', hoursWindow: [8, 19], weight: 4, cond: (s) => track(s, 'agentesNorte') >= 15,
    nodes: { start: {
      text: 'Um emissário do norte, que não é Haakon, mede a largura da porta do salão com uma corda cheia de nós. Quando vê você, Haakon aparece do nada e o empurra para fora. "Ele é arquiteto. Norhelm admira sua... arquitetura."',
      choices: [
        { label: 'Quero o nome dele', sub: 'Exigir', color: 'vermelho', icon: 'coroa', effects: { clue: 'emissarios_norte', rel: { haakon: -6 }, xp: 14 }, reply: 'Haakon diz um nome. Sigrid, mais tarde, diz que esse nome não existe no norte.' },
        { label: 'Oferecer a planta do castelo', sub: 'Uma planta falsa', color: 'roxo', icon: 'mascara', req: { attr: ['intriga', 2] }, effects: { clue: 'emissarios_norte', run: (s) => { s.conspiracy.prep.plantaFalsa = 1; }, xp: 18 }, reply: 'Theodric desenha em uma noite uma planta perfeita do castelo. Perfeita, exceto por três portas que não existem e uma que não aparece.' },
      ],
    } },
  }),
  E({
    id: 'enc_banqueiros', speaker: 'kasim', topic: 'Banqueiros no corredor', room: 'salao', hoursWindow: [9, 17], weight: 4, cond: (s) => track(s, 'presencaVeridian') >= 15,
    nodes: { start: {
      text: 'Kasim guia dois banqueiros de Véridian pelo salão. Eles apontam para as paredes, anotam, discutem preços. Um deles bate no trono com os nós dos dedos, testando a madeira.',
      choices: [
        { label: 'Sentar no trono na frente deles', sub: 'Lembrar de quem é', color: 'vermelho', icon: 'coroa', effects: { res: { prestigio: 2 }, track: { presencaVeridian: -3 }, rel: { kasim: -4 }, xp: 10 }, reply: 'Os banqueiros fazem uma reverência profunda. Anotam também a reverência. Tudo tem preço em Véridian.' },
        { label: 'Perguntar o que avaliam', sub: 'Curiosidade', color: 'roxo', icon: 'olho', effects: { clue: 'banco_veridian', xp: 12 }, reply: '"Garantias, Majestade", diz um deles, educado. "Só garantias." Você percebe que o castelo é uma delas.' },
      ],
    } },
  }),
  E({
    id: 'enc_pimenta_ensaio', speaker: 'pimenta', topic: 'O ensaio do bobo', room: 'salao', hoursWindow: [16, 20], weight: 2, minDay: 3,
    nodes: { start: {
      text: (s) => `Pimenta está sentado no trono, de costas, com uma coroa de papel, imitando você para três criadas. "${s.mood.anger >= 40 ? 'PRENDAM TODO MUNDO! E o cachorro também!' : s.mood.fatigue >= 60 ? 'Próximo... zzz... próximo...' : 'Hmm. Hmmmm. Vou pensar. Vou pensar muito. Guardas, tragam mais pensamento.'}" As criadas choram de rir.`,
      choices: [
        { label: 'Aplaudir', sub: 'Rir de si mesmo', color: 'verde', icon: 'balao', effects: { rel: { pimenta: 8 }, res: { povo: 1 }, mood: { joy: 10, anger: -10, why: 'Riu da própria imitação' }, xp: 6 }, reply: 'As criadas congelam. Pimenta se vira, vê você, e faz a reverência mais longa da história do castelo. Depois vocês três riem juntos.' },
        { label: 'Sente-se no chão, bobo', sub: 'Dignidade', color: 'vermelho', icon: 'coroa', effects: { rel: { pimenta: -6 }, res: { prestigio: 1 }, mood: { anger: 6 }, xp: 4 }, reply: 'Pimenta desce do trono devagar, com a dignidade de um rei deposto. As criadas somem. O salão fica frio.' },
      ],
    } },
  }),
  E({
    id: 'enc_damas_varanda', speaker: 'isabelle', topic: 'As damas na varanda', room: 'aposentos', hoursWindow: [14, 18], weight: 3, present: ['dama'],
    nodes: { start: {
      text: (s) => `Na varanda, Isabelle e Lady Maren tomam chá e comentam a corte com a crueldade de quem tem tempo. "${s.spouse ? 'A rainha usa verde demais para quem quer parecer confiável' : 'A pequena Valmont ri de tudo que o rei diz. Até do que não é piada'}", diz Maren. Nenhuma das duas viu você.`,
      choices: [
        { label: 'Juntar-se ao chá', sub: 'Ouvir as fofocas', color: 'dourado', icon: 'balao', effects: { res: { influencia: 3 }, rel: { dama: 4, isabelle: 3 }, mood: { joy: 4 }, xp: 8 }, reply: 'Em meia hora, você sabe quem deve a quem, quem dorme onde e qual lorde usa peruca. Informação é informação.' },
        { label: 'Pigarrear e sair', sub: 'Constrangimento', color: 'azul', icon: 'seta', effects: { rel: { dama: -2 }, xp: 3 }, reply: 'As duas continuam a conversa, agora sobre você. Mais alto.' },
      ],
    } },
  }),
];
