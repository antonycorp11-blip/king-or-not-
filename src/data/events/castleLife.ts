import type { GameEvent, GameState } from '../../types';
import { bond } from '../../engine/bonds';

// Compromissos da agenda e atividades do rei. Cada série tem variações que não se
// repetem até todas terem sido vistas (engine/agenda.ts → pickFrom).
// Os jantares com a rainha carregam as campanhas de cada casamento.
const P = 'pessoal' as const;
const love = (s: GameState, id: string) => bond(s, id).amor;
const trust = (s: GameState, id: string) => bond(s, id).confianca;

function dinner(id: string, spouse: string, minDay: number, text: GameEvent['nodes']['start']['text'], choices: GameEvent['nodes']['start']['choices'], extra: Record<string, GameEvent['nodes']['start']> = {}): GameEvent {
  return { id, speaker: spouse, topic: 'Jantar nos aposentos', kind: 'atividade', domain: P, minDay, cond: (s) => s.spouse === spouse, nodes: { start: { text, choices }, ...extra } };
}

export const CASTLE_LIFE_EVENTS: GameEvent[] = [
  // ======================= TREINO DA GUARDA =======================
  {
    id: 'treino_1', speaker: 'aurelian', topic: 'Treino da Guarda', kind: 'atividade', domain: P,
    nodes: { start: {
      text: 'Aurelian joga uma espada de treino aos seus pés. "Majestade. Os recrutas apostam que o senhor não aguenta três golpes. Eu apostei em quatro. Não me faça perder dinheiro."',
      choices: [
        { label: 'Lutar com Aurelian', sub: 'Suor e respeito', color: 'vermelho', icon: 'espadas', effects: { res: { moral: 4 }, bond: { aurelian: { confianca: 5 } }, mood: { anger: -25, stress: -10, fatigue: 18, why: 'Descarregou a raiva no treino' }, flags: { treinouEspada: true }, xp: 12 }, reply: 'Você aguenta cinco golpes. No sexto, está no chão, rindo. Os recrutas aplaudem. Aurelian recebe o dinheiro da aposta e divide com você.' },
        { label: 'Assistir e corrigir a formação', sub: 'O olho do rei', color: 'azul', icon: 'olho', effects: { res: { moral: 3 }, bond: { aurelian: { confianca: 3 } }, mood: { stress: -5 }, xp: 10 }, reply: 'Você nota que a segunda fileira sempre recua antes da primeira. Aurelian anota. "Seu avô também reparava nisso."' },
        { label: 'Desafiar o melhor recruta', sub: 'Exige Estratégia 1', color: 'dourado', icon: 'coroa', req: { attr: ['estrategia', 1] }, effects: { res: { moral: 6, prestigio: 2 }, mood: { joy: 8, fatigue: 15 }, xp: 14 }, reply: 'Você não é mais forte. É mais paciente. O recruta cansa primeiro. A guarda inteira fala disso no jantar.' },
      ],
    } },
  },
  {
    id: 'treino_2', speaker: 'aurelian', topic: 'Treino da Guarda', kind: 'atividade', domain: P, minDay: 5,
    nodes: { start: {
      text: 'Metade dos recrutas treina com espadas de madeira rachadas. "Pedimos espadas novas há três meses", diz Aurelian, sem olhar para você. "O tesouro disse que madeira é madeira."',
      choices: [
        { label: 'Comprar equipamento novo', sub: '−60 ouro, moral +6', color: 'verde', icon: 'moedas', req: { ouro: 60 }, effects: { res: { ouro: -60, moral: 6 }, bond: { aurelian: { lealdade: 4 } }, xp: 10 }, reply: 'Na semana seguinte, os recrutas batem uns nos outros com espadas novas e sorrisos novos.' },
        { label: 'Treinar mesmo assim', sub: 'Disciplina', color: 'azul', icon: 'escudo', effects: { res: { moral: 1 }, mood: { fatigue: 12, anger: -10 }, xp: 8 }, reply: 'Uma espada racha na sua mão no terceiro golpe. Os recrutas seguram o riso. Você não segura.' },
        { label: 'Perguntar quem negou o pedido', sub: 'Seguir o dinheiro', color: 'roxo', icon: 'olho', effects: { res: { influencia: 2 }, bond: { corvin: { medo: 6 } }, xp: 10 }, reply: 'O pedido foi negado pelo Tesoureiro. As espadas novas foram compradas. Só não chegaram aqui.' },
      ],
    } },
  },
  {
    id: 'treino_3', speaker: 'aurelian', topic: 'Os rostos novos', kind: 'atividade', domain: P, minDay: 15, cond: (s) => !!s.flags.portoesCasa,
    nodes: { start: {
      text: 'No meio do treino, Aurelian para ao seu lado e fala baixo. "Os homens que agora guardam os portões não treinam conosco. Não comem conosco. Recebem ordens de alguém que não sou eu. Pensei que o senhor devia saber, antes que precise saber."',
      choices: [
        { label: 'Quem dá as ordens a eles?', sub: 'Descobrir', color: 'roxo', icon: 'mascara', effects: { clue: 'guarda_trocada', bond: { aurelian: { confianca: 6 } }, xp: 16 }, reply: '"Um capitão com anel de casa. Não é o meu brasão, Majestade. Nem o seu."' },
        { label: 'Misture os seus homens com os deles', sub: 'Vigiar os vigias', color: 'azul', icon: 'escudo', effects: { clue: 'guarda_trocada', run: (s) => { s.conspiracy.prep.portoesVigiados = 1; }, bond: { aurelian: { lealdade: 5 } }, xp: 14 }, reply: 'Aurelian coloca dois veteranos em cada turno do portão. "Eles vão reclamar do cheiro dos meus homens. Ótimo sinal."' },
      ],
    } },
  },
  // ======================= MISSA =======================
  {
    id: 'missa_1', speaker: 'frei_aske', topic: 'Missa na capela', kind: 'atividade', domain: P,
    nodes: { start: {
      text: 'Frei Aske escolheu, para o sermão de hoje, a parábola do rei que dormiu durante o próprio reinado. Ele olha para você em todas as vírgulas.',
      choices: [
        { label: 'Ouvir com humildade', sub: 'Seren aprovam', color: 'verde', icon: 'estrela', effects: { loyalty: { seren: 3 }, rel: { frei_aske: 4 }, mood: { stress: -12, why: 'Achou paz na missa' }, xp: 6 }, reply: 'Depois da missa, Aveline Seren acena para você. Pela primeira vez, sem desconfiança.' },
        { label: 'Cochilar no banco real', sub: 'Honestidade física', color: 'dourado', icon: 'balao', effects: { rel: { frei_aske: -4, pimenta: 4 }, mood: { fatigue: -15 }, xp: 4 }, reply: 'Você acorda com o próprio ronco ecoando na capela. Frei Aske encerra o sermão com "...como Sua Majestade demonstra agora".' },
      ],
    } },
  },
  {
    id: 'missa_2', speaker: 'irma', topic: 'Missa pelo rei morto', kind: 'atividade', domain: P, minDay: 8,
    nodes: { start: {
      text: 'É a missa de dois meses da morte do seu pai. No fim, Irmã Hedda se aproxima com o rosto fechado. "Majestade. Eu cuidei dele na última noite. Quero dizer uma coisa que nunca disse a ninguém, e depois nunca mais falar disso."',
      choices: [
        { label: 'Fale, irmã', sub: 'Ouvir o que dói', color: 'azul', icon: 'coracao', effects: { clue: 'morte_pai', mood: { joy: -15, stress: 15, why: 'Soube que o pai talvez tenha sido envenenado' }, bond: { irma: { confianca: 10 } }, xp: 16 }, reply: '"O quarto cheirava a amêndoas. Febre não cheira a amêndoas." Ela aperta sua mão e vai embora sem olhar para trás.' },
        { label: 'Hoje não, irmã', sub: 'Não estou pronto', color: 'dourado', icon: 'escudo', effects: { mood: { stress: 5 }, xp: 4 }, reply: '"Então outro dia", ela diz. "Mas não demore. Eu estou velha, e segredos pesam."' },
      ],
    } },
  },
  {
    id: 'missa_3', speaker: 'dama_carvalhal', topic: 'Missa dos carvalhos', kind: 'atividade', domain: P, minDay: 12,
    nodes: { start: {
      text: 'Lady Brígida Carvalhal, dos Seren, reza de joelhos ao seu lado e sussurra sem abrir os olhos. "Os lenhadores de Montclair cortam carvalhos sagrados à noite, Majestade. Os bosques estão com medo. Os Seren também."',
      choices: [
        { label: 'Prometer proteger os bosques', sub: 'Seren +6', color: 'verde', icon: 'arvore', effects: { loyalty: { seren: 6, montclair: -2 }, xp: 10 }, reply: 'Brígida abre os olhos. "Promessa de rei na capela vale o dobro. E custa o dobro, se quebrada."' },
        { label: 'Pedir provas', sub: 'Justiça antes de fé', color: 'azul', icon: 'olho', effects: { loyalty: { seren: 1 }, res: { influencia: 1 }, xp: 8 }, reply: '"Provas." Ela sorri, triste. "Os carvalhos não sabem escrever, Majestade."' },
      ],
    } },
  },
  // ======================= JANTARES EM FAMÍLIA (solteiro) =======================
  {
    id: 'jantar_familia_1', speaker: 'isabelle', topic: 'Jantar em família', kind: 'atividade', domain: P,
    nodes: { start: {
      text: 'Isabelle serve o seu prato como se você ainda tivesse oito anos. Lucas faz uma estátua de purê com a sua cara e a coroa torta. "Um retrato fiel", diz ele. Isabelle finge não ver. Não consegue.',
      choices: [
        { label: 'Fazer uma estátua do Lucas', sub: 'Guerra de purê', color: 'dourado', icon: 'balao', effects: { rel: { lucas: 8, isabelle: -1 }, bond: { lucas: { amor: 4 } }, mood: { joy: 12, stress: -10, why: 'Riu no jantar com Lucas' }, xp: 6 }, reply: 'A guerra de purê dura três minutos. Isabelle declara trégua jogando uma ervilha em cada um. Há anos vocês não riam assim.' },
        { label: 'Perguntar à mãe sobre o pai', sub: 'Memória', color: 'azul', icon: 'coracao', effects: { bond: { isabelle: { confianca: 5 } }, mood: { joy: -4 }, xp: 8 }, reply: '"Ele comia rápido para voltar ao trabalho", ela diz. "E nos últimos meses, não comia nada que não visse ser servido. Achei que era mania."' },
      ],
    } },
  },
  {
    id: 'jantar_familia_2', speaker: 'lucas', topic: 'Jantar em família', kind: 'atividade', domain: P, minDay: 4,
    nodes: { start: {
      text: '"Então", Lucas começa, com a boca cheia, "qual das quatro você vai escolher? Fiz uma tabela." Ele tira um papel do bolso. Tem colunas para dote, exército, beleza e "chance de me matar de tédio".',
      choices: [
        { label: 'Ler a tabela com seriedade', sub: 'Ouvir o irmão', color: 'verde', icon: 'pergaminho', effects: { rel: { lucas: 8 }, bond: { lucas: { confianca: 5 } }, mood: { joy: 6 }, xp: 8 }, reply: 'A tabela é surpreendentemente boa. Na coluna de Rhoswen, "chance de me matar" diz: "literalmente".' },
        { label: 'E você, se casaria com qual?', sub: 'Virar o jogo', color: 'dourado', icon: 'balao', effects: { rel: { lucas: 5 }, mood: { joy: 5 }, xp: 6 }, reply: 'Lucas fica vermelho até as orelhas. Isabelle ergue uma sobrancelha. Descobre-se, naquele instante, que Lucas tem uma resposta.' },
      ],
    } },
  },
  {
    id: 'jantar_familia_3', speaker: 'isabelle', topic: 'Jantar em família', kind: 'atividade', domain: P, minDay: 8,
    nodes: { start: {
      text: 'Isabelle está calada demais. Quando Lucas sai, ela fala sem levantar os olhos. "Seu pai queria mudar uma lei antiga, nos últimos dias. Uma lei sobre chaves. Ele ficou tão agitado... Eu disse que era cansaço. Talvez eu devesse ter perguntado mais."',
      choices: [
        { label: 'Que lei sobre chaves?', sub: 'Puxar o fio', color: 'roxo', icon: 'olho', effects: { clue: 'lei_chaves', bond: { isabelle: { confianca: 4 } }, mood: { stress: 6 }, xp: 14 }, reply: '"As cinco chaves do conselho. Ele dizia que eram cinco facas apontadas para a coroa." Ela aperta o guardanapo. "Não sei mais nada. Juro."' },
        { label: 'Você não tinha como saber, mãe', sub: 'Consolar', color: 'verde', icon: 'coracao', effects: { bond: { isabelle: { amor: 5 } }, mood: { joy: 3 }, xp: 8 }, reply: 'Ela segura sua mão sobre a mesa. Fica assim até a vela acabar.' },
      ],
    } },
  },
  // ======================= ELENORA: o marido ou a família =======================
  dinner('jantar_elenora_1', 'elenora', 21, 'Elenora trouxe para o jantar o livro-caixa do castelo. "Desculpe. Não consigo comer sabendo que alguém paga três vezes pelas mesmas velas." Ela vira uma página. "Meu pai me pediu, na última carta, que eu mande a ele as contas da coroa. Todo mês."', [
    { label: 'Mande só o que eu aprovar', sub: 'Confiança com limites', color: 'azul', icon: 'pergaminho', effects: { bond: { elenora: { confianca: 6 } }, track: { dividaValmont: 2 }, xp: 10 }, reply: '"Então vamos ler juntos o que ele recebe." Ela sorri pela primeira vez na noite. Mentir para o pai, com a sua ajuda, é mais fácil.' },
    { label: 'Não mande nada', sub: 'Marido acima de pai', color: 'vermelho', icon: 'escudo', effects: { bond: { elenora: { confianca: 3, ressentimento: 4 } }, rel: { gaspard: -5 }, xp: 10 }, reply: '"Ele vai perceber." Ela fecha o livro. "E vai perguntar a mim por quê. Não sei mentir para ele. Nunca precisei."' },
    { label: 'Seja minha Tesoureira', sub: 'Dar a ela a chave do tesouro', color: 'dourado', icon: 'moedas', effects: { run: (s) => { const prev = s.council.seats.tesoureiro; s.council.seats.tesoureiro = 'elenora'; if (prev && prev !== 'elenora') { const b = s.bonds[prev]; if (b) b.ressentimento = Math.min(100, b.ressentimento + 25); } }, bond: { elenora: { amor: 6, lealdade: 8 } }, rel: { corvin: -12 }, xp: 14 }, reply: 'Elenora fica em silêncio por um tempo. "Você sabe que agora eu seguro uma das cinco chaves." Ela guarda o livro-caixa como quem guarda uma arma.' },
  ]),
  dinner('jantar_elenora_2', 'elenora', 28, (s) => `Elenora não toca na comida. ${trust(s, 'elenora') >= 45 ? 'Ela empurra um contrato para o seu lado da mesa.' : 'Ela esconde um papel no colo quando você entra.'} "Os empréstimos do meu pai à coroa têm uma cláusula. Se o rei for declarado incapaz, a dívida vira posse do porto. Quem escreve incapaz num contrato de família?"`, [
    { label: 'Você vai me ajudar a desfazer isso?', sub: 'Aliança no casamento', color: 'azul', icon: 'aperto', effects: { clue: 'emprestimo_valmont', bond: { elenora: { confianca: 8, lealdade: 6 } }, track: { dividaValmont: -6 }, xp: 18 }, reply: '"Vou. E ele nunca vai me perdoar." Ela come, finalmente. Come como quem decidiu alguma coisa.' },
    { label: 'Seu pai quer me derrubar?', sub: 'Pergunta direta', color: 'vermelho', icon: 'mascara', effects: { clue: 'emprestimo_valmont', bond: { elenora: { ressentimento: 8, medo: 6 } }, xp: 14 }, reply: '"Meu pai quer lucrar", ela diz, fria. "Com você de pé ou deitado. Não me faça escolher entre vocês dois esta noite."' },
  ]),
  dinner('jantar_elenora_3', 'elenora', 36, 'Elenora segura a taça com as duas mãos. "Uma pergunta, e quero a verdade. Se um dia meu pai e você estiverem em lados opostos de uma sala, você me perdoaria por ficar parada no meio?"', [
    { label: 'Eu nunca pediria para escolher', sub: 'Amor sem condições', color: 'verde', icon: 'coracao', effects: { bond: { elenora: { amor: 10 } }, run: (s) => { s.flags.elenoraLado = love(s, 'elenora') + trust(s, 'elenora') >= 110 ? 'rei' : 'meio'; }, xp: 16 }, reply: 'Ela chora, e ri de chorar. "É por isso que eu vou escolher você." Ou pelo menos é o que ela diz hoje.' },
    { label: 'Eu precisaria de você do meu lado', sub: 'A verdade', color: 'azul', icon: 'coroa', effects: { bond: { elenora: { confianca: 6 } }, run: (s) => { s.flags.elenoraLado = trust(s, 'elenora') >= 55 ? 'rei' : 'pai'; }, xp: 16 }, reply: '"Obrigada por não mentir." Ela pensa por um tempo longo demais. "Então me dê motivos todos os dias."' },
  ]),
  // ======================= RHOSWEN: o exército de quem? =======================
  dinner('jantar_rhoswen_1', 'rhoswen', 21, 'Rhoswen janta de botas, com um mapa de guerra servindo de toalha. "A cavalaria está uma vergonha. Os capitães obedecem ao nome do meu pai antes do seu. Eu posso consertar isso. Ou posso consertar a cavalaria. As duas coisas ao mesmo tempo, não."', [
    { label: 'Conserte a lealdade primeiro', sub: 'Exército do rei', color: 'azul', icon: 'coroa', effects: { bond: { rhoswen: { confianca: 6 } }, track: { oficiaisDrakon: -4 }, res: { moral: -2 }, xp: 12 }, reply: '"Vou trocar os capitães que só sabem dizer Drakon." Ela sorri. "Meu pai vai odiar. Eu vou adorar."' },
    { label: 'Conserte a cavalaria', sub: 'Força agora', color: 'vermelho', icon: 'espadas', effects: { res: { moral: 6 }, track: { oficiaisDrakon: 5 }, bond: { rhoswen: { amor: 4 } }, xp: 10 }, reply: 'Em uma semana, a cavalaria galopa em linha reta. Gritando "Drakon" em vez de "Rei". Detalhe.' },
    { label: 'Seja minha Marechal', sub: 'A chave do arsenal', color: 'dourado', icon: 'escudo', effects: { run: (s) => { const prev = s.council.seats.marechal; s.council.seats.marechal = 'rhoswen'; if (prev && prev !== 'rhoswen') { const b = s.bonds[prev]; if (b) b.ressentimento = Math.min(100, b.ressentimento + 25); } }, bond: { rhoswen: { amor: 8, lealdade: 6 } }, rel: { aurelian: -10 }, xp: 14 }, reply: 'Rhoswen fica séria como nunca. "Então o arsenal é meu." Aurelian recebe a notícia com uma reverência perfeita e um silêncio pior.' },
  ]),
  dinner('jantar_rhoswen_2', 'rhoswen', 28, (s) => `Rhoswen chega tarde, com sangue nos nós dos dedos. "Dei um soco num capitão. Ele disse que, se o rei e o Lorde Brandt dessem ordens diferentes, obedeceria ao meu pai. ${(s.tracks.oficiaisDrakon ?? 0) >= 15 ? 'Metade da mesa riu. Metade concordou.' : 'Os outros ficaram quietos. Pelo menos isso.'}"`, [
    { label: 'Quantos pensam como ele?', sub: 'Contar as espadas', color: 'roxo', icon: 'olho', effects: { clue: 'oficiais_drakon', bond: { rhoswen: { confianca: 6 } }, xp: 16 }, reply: '"Contei vinte e três." Ela limpa a mão no guardanapo. "Eu contaria de novo, mas o capitão ainda está no chão."' },
    { label: 'Você fez certo', sub: 'Apoiar a rainha', color: 'verde', icon: 'coracao', effects: { bond: { rhoswen: { amor: 8, lealdade: 4 } }, rel: { brandt: -4 }, xp: 12 }, reply: 'Ela ri, surpresa. "Meu pai diria que eu envergonhei a casa." Ela pensa. "Meu pai não está aqui."' },
  ]),
  dinner('jantar_rhoswen_3', 'rhoswen', 36, 'Rhoswen não se senta. "Meu pai me escreveu. Diz que se houver problemas na capital, eu devo ir para o Vale e levar a cavalaria. Problemas. Que problemas ele espera, se ninguém me conta?"', [
    { label: 'Se houver problemas, fique comigo', sub: 'Pedir', color: 'azul', icon: 'coroa', effects: { run: (s) => { s.flags.rhoswenLado = love(s, 'rhoswen') + trust(s, 'rhoswen') >= 105 ? 'rei' : 'pai'; }, bond: { rhoswen: { confianca: 6 } }, xp: 16 }, reply: '"Pedir é diferente de mandar." Ela finalmente se senta. "Estou pensando."' },
    { label: 'Mostre-me a carta', sub: 'Confiança à prova', color: 'roxo', icon: 'pergaminho', effects: { clue: 'oficiais_drakon', run: (s) => { s.flags.rhoswenLado = trust(s, 'rhoswen') >= 50 ? 'rei' : 'meio'; }, xp: 18 }, reply: 'Ela hesita, depois joga a carta na mesa. A caligrafia é do pai. O selo, não. É de alguém que não quis assinar.' },
  ]),
  // ======================= ISOLDE: a quem ela serve? =======================
  dinner('jantar_isolde_1', 'isolde', 21, '"Um jogo de Véridian", diz Isolde, servindo vinho. "Eu digo três verdades e uma mentira. Você acha a mentira. Se errar, eu ganho um segredo seu." Ela conta nos dedos. "Meu irmão me mandou aqui para espionar. Eu gosto de você. Eu odeio gatos. Eu nunca menti para você."', [
    { label: 'A mentira é "odeio gatos"', sub: 'Jogar com ela', color: 'dourado', icon: 'balao', effects: { bond: { isolde: { amor: 6 } }, mood: { joy: 8 }, xp: 10 }, reply: '"Errado. Eu odeio gatos." Ela ri. "Então sobram três. Boa sorte decidindo qual."' },
    { label: 'A mentira é "nunca menti"', sub: 'Direto ao ponto', color: 'roxo', icon: 'mascara', effects: { bond: { isolde: { confianca: 6 } }, xp: 12 }, reply: 'Ela para de sorrir, só um instante. "Certo." Depois volta a sorrir. "Você é mais divertido do que parece."' },
    { label: 'Seja minha Mestra dos Sussurros', sub: 'Uma espiã oficial', color: 'azul', icon: 'olho', effects: { run: (s) => { const prev = s.council.seats.sussurros; s.council.seats.sussurros = 'isolde'; if (prev && prev !== 'isolde') { const b = s.bonds[prev]; if (b) b.ressentimento = Math.min(100, b.ressentimento + 25); } }, track: { presencaVeridian: 6 }, bond: { isolde: { lealdade: 6 } }, rel: { isabelle: -10 }, xp: 14 }, reply: '"Uma espiã que o rei nomeia espiã." Isolde bate palmas devagar. "Isso é tão ousado que talvez funcione." Isabelle, sabendo, quebra uma taça.' },
  ]),
  dinner('jantar_isolde_2', 'isolde', 28, (s) => `Isolde está distraída, lendo uma carta cifrada. ${trust(s, 'isolde') >= 45 ? 'Ela a vira para você ler.' : 'Ela a queima na vela quando você entra.'} "Há gente em Véridian que compraria este reino em pedaços. Não é o meu irmão. Pior. São os banqueiros dele."`, [
    { label: 'Por que me contar?', sub: 'Testar', color: 'roxo', icon: 'olho', effects: { clue: 'banco_veridian', bond: { isolde: { confianca: 6 } }, xp: 16 }, reply: '"Porque se venderem o reino, eu viro esposa de um reino que não existe." Ela sorri. "E porque gosto de você. Não conte a ninguém."' },
    { label: 'Então pare de trazer banqueiros', sub: 'Exigir', color: 'vermelho', icon: 'coroa', effects: { track: { presencaVeridian: -6 }, bond: { isolde: { ressentimento: 6 } }, rel: { kasim: -6 }, xp: 12 }, reply: '"Eu não trago ninguém, meu rei. Eles vêm sozinhos, como moscas. Você é que deixou o mel na mesa."' },
  ]),
  dinner('jantar_isolde_3', 'isolde', 36, '"Se um dia eu desaparecer", diz Isolde, sem aviso, "não me procure no porto. Procure nos arquivos." Ela ri da sua cara. "É uma piada. Quase."', [
    { label: 'O que há nos arquivos?', sub: 'Não deixar passar', color: 'roxo', icon: 'mascara', effects: { clue: 'reuniao_noturna', run: (s) => { s.flags.isoldeLado = trust(s, 'isolde') >= 55 ? 'rei' : 'ela'; }, xp: 18 }, reply: '"Cinco cadeiras que mudam de lugar à noite." Ela beija sua testa. "Eu estou do seu lado. Mais ou menos. Bastante."' },
    { label: 'Eu te procuraria em qualquer lugar', sub: 'Romance', color: 'verde', icon: 'coracao', effects: { bond: { isolde: { amor: 10 } }, run: (s) => { s.flags.isoldeLado = love(s, 'isolde') >= 60 ? 'rei' : 'ela'; }, xp: 14 }, reply: 'Isolde fica sem resposta pela primeira vez desde que chegou. É, talvez, a coisa mais sincera que você já viu no rosto dela.' },
  ]),
  // ======================= SIGRID: a paz que abriu a porta =======================
  dinner('jantar_sigrid_1', 'sigrid', 21, 'Sigrid serve peixe defumado do norte com as mãos. "Em Hjalmgard, marido e mulher comem do mesmo prato no primeiro mês. Para lembrar que o inverno é dividido." Ela empurra o prato para o meio da mesa.', [
    { label: 'Comer do mesmo prato', sub: 'Tradição dela', color: 'verde', icon: 'coracao', effects: { bond: { sigrid: { amor: 8, confianca: 4 } }, mood: { joy: 10, why: 'Dividiu o prato com Sigrid' }, xp: 10 }, reply: 'O peixe é salgado demais. Você come tudo. Sigrid percebe, e por isso sorri.' },
    { label: 'Contar uma tradição daqui', sub: 'Troca', color: 'azul', icon: 'balao', effects: { bond: { sigrid: { confianca: 5 } }, xp: 8 }, reply: 'Você explica o brinde de três goles de Castelmar. Ela acha absurdo. Faz os três goles mesmo assim.' },
  ]),
  dinner('jantar_sigrid_2', 'sigrid', 28, (s) => `Sigrid está com o garfo parado no ar. "Hoje vi no pátio um homem com tatuagem do clã de Ragnar. Disse que era mercador de peles. Os mercadores de peles do norte não têm essa tatuagem. Só os guardas do meu irmão." ${(s.tracks.agentesNorte ?? 0) >= 15 ? 'Ela abaixa a voz. "E não era o primeiro."' : ''}`, [
    { label: 'Você me ajuda a encontrá-los?', sub: 'Confiar nela', color: 'azul', icon: 'aperto', effects: { clue: 'emissarios_norte', bond: { sigrid: { confianca: 8, lealdade: 6 } }, track: { agentesNorte: -5 }, xp: 18 }, reply: '"Eu conheço cada tatuagem do norte." Ela respira fundo. "Se meu irmão está usando a nossa paz, eu mesma o entrego a você."' },
    { label: 'Você sabia disso antes?', sub: 'Desconfiar', color: 'vermelho', icon: 'mascara', effects: { clue: 'emissarios_norte', bond: { sigrid: { ressentimento: 10, confianca: -6 } }, xp: 12 }, reply: 'Ela solta o garfo. "Eu contei a você porque não sabia." O silêncio depois disso tem cheiro de neve.' },
  ]),
  dinner('jantar_sigrid_3', 'sigrid', 36, (s) => `Sigrid põe uma carta lacrada com o lobo de Norhelm na mesa. ${trust(s, 'sigrid') >= 45 ? '"Chegou hoje. Não abri. É do Ragnar. Quero que a gente abra juntos."' : '"Chegou uma carta do meu irmão." Ela não diz o que havia nela.'}`, [
    { label: 'Abrir juntos', sub: 'Confiança', color: 'azul', icon: 'pergaminho', req: { test: (s) => trust(s, 'sigrid') >= 45, label: 'Ela ainda não confia o bastante' }, effects: { clue: 'emissarios_norte', run: (s) => { s.flags.sigridLado = 'rei'; }, bond: { sigrid: { amor: 8 } }, xp: 20 }, reply: '"Irmã, quando o castelo cair, esteja no portão norte." Sigrid rasga a carta ao meio. "Quando. Não se." Ela o encara. "Ele sabe de algo que nós não sabemos."' },
    { label: 'O que dizia a carta?', sub: 'Perguntar', color: 'dourado', icon: 'olho', effects: { run: (s) => { s.flags.sigridLado = love(s, 'sigrid') >= 60 ? 'rei' : 'norte'; }, xp: 12 }, reply: (s) => (s.flags.sigridLado === 'rei' ? '"Mentiras do meu irmão", ela diz, e segura sua mão com força. Ela escolheu. Talvez nem saiba que escolheu.' : '"Coisas de família", ela diz. Não olha nos seus olhos o resto da noite.') },
  ]),
  // ======================= ATIVIDADES =======================
  {
    id: 'escrivaninha_pai', speaker: 'rei', topic: 'A escrivaninha do meu pai', kind: 'atividade', domain: P,
    nodes: { start: {
      text: 'A escrivaninha do seu pai continua trancada desde o enterro. Ninguém tocou nela. A chave nunca foi encontrada. Há arranhões recentes em volta da fechadura.',
      choices: [
        { label: 'Forçar a gaveta', sub: 'Exige Intriga 1', color: 'roxo', icon: 'mascara', req: { attr: ['intriga', 1] }, effects: { clue: 'diario_pai', mood: { stress: 18, joy: -12, why: 'Leu o diário secreto do pai' }, flags: { diarioPai: true }, xp: 25 }, reply: 'Há um fundo falso. Um caderno de couro, a letra apressada do seu pai: "Três chaves já giram juntas. Se eu morrer de repente, não foi Deus."' },
        { label: 'Chamar um ferreiro discreto', sub: '−30 ouro, alguém vai saber', color: 'dourado', icon: 'martelo', req: { ouro: 30 }, effects: { res: { ouro: -30 }, clue: 'diario_pai', flags: { diarioPai: true, diarioVisto: true }, mood: { stress: 15, why: 'Leu o diário secreto do pai' }, xp: 20 }, reply: 'Bruna abre a gaveta em um minuto e sai sem perguntar nada. Mas Bruna tem uma irmã que trabalha na cozinha, e a cozinha sabe de tudo.' },
        { label: 'Deixar como está', sub: 'Não hoje', color: 'azul', icon: 'escudo', effects: { mood: { stress: 3 }, xp: 2 }, reply: 'Você passa a mão pela madeira fria. Os arranhões não saem da cabeça.' },
      ],
    } },
  },
  {
    id: 'mesa_chaves_ev', speaker: 'rei', topic: 'A Mesa das Chaves', kind: 'atividade', domain: P,
    nodes: { start: {
      text: 'No centro da mesa do conselho, cinco fechaduras de bronze formam um círculo em volta do brasão real. A Mesa das Chaves. Você nunca tinha olhado de perto.',
      choices: [
        { label: 'Examinar as fechaduras', sub: 'Olhar com atenção', color: 'roxo', icon: 'olho', effects: { clue: 'mesa_chaves', mood: { stress: 8 }, xp: 14 }, reply: 'Arranhões novos, brilhantes, nas bordas de três fechaduras. Alguém testou chaves aqui. Recentemente.' },
        { label: 'Mandar lacrar a mesa', sub: 'Precaução, alguém vai notar', color: 'vermelho', icon: 'cadeado', effects: { clue: 'mesa_chaves', run: (s) => { s.conspiracy.prep.mesaLacrada = 1; }, res: { influencia: -3 }, xp: 14 }, reply: 'Bruna derrama chumbo nas fechaduras. Amanhã, cinco pessoas vão perceber. Uma delas vai ficar com muita raiva.' },
      ],
    } },
  },
  {
    id: 'caca_1', speaker: 'brandt', topic: 'Caçada real', kind: 'atividade', domain: P,
    nodes: { start: {
      text: 'Lorde Brandt aparece de surpresa para a caçada, com dois cães do tamanho de pôneis. "Rei! Um javali enorme foi visto no Bosque Velho. Dizem que já matou três caçadores. Vamos matar quatro!" Ele percebe o que disse. "Javalis. Quatro javalis."',
      choices: [
        { label: 'Encarar o javali', sub: 'Perigo e glória', color: 'vermelho', icon: 'espadas', effects: { res: { prestigio: 5, moral: 3 }, rel: { brandt: 10 }, loyalty: { drakon: 4 }, mood: { anger: -30, joy: 12, fatigue: 25, why: 'Caçou um javali com Brandt' }, xp: 16 }, reply: 'O javali quase o derruba. Brandt termina o serviço e jura a todos que foi você. A história fica maior a cada taverna.' },
        { label: 'Deixar Brandt caçar e conversar', sub: 'Política a cavalo', color: 'azul', icon: 'aperto', effects: { rel: { brandt: 6 }, loyalty: { drakon: 3 }, mood: { anger: -20, fatigue: 15 }, res: { influencia: 2 }, xp: 12 }, reply: 'Entre um cão latindo e outro, Brandt fala mais do que devia sobre o que os lordes pensam de você. Nem tudo é ruim.' },
      ],
    } },
  },
  {
    id: 'caca_2', speaker: 'lucas', topic: 'Caçada real', kind: 'atividade', domain: P,
    nodes: { start: {
      text: 'Lucas insiste em ir junto. No meio do bosque, ele para o cavalo. "Irmão. Não quero caçar. Quero só... ficar longe do castelo. Lá dentro todo mundo olha para você. E ninguém olha para mim. Aqui, só as árvores."',
      choices: [
        { label: 'Ficar ali com ele', sub: 'Irmãos', color: 'verde', icon: 'coracao', effects: { rel: { lucas: 12 }, bond: { lucas: { amor: 8, confianca: 6 } }, mood: { joy: 10, stress: -15, fatigue: 12, why: 'Passou a tarde no bosque com Lucas' }, xp: 12 }, reply: 'Vocês voltam sem nenhuma caça e com lama até os joelhos. Isabelle grita com os dois. Vale a pena.' },
        { label: 'Dar a ele uma missão de verdade', sub: 'Algo que só ele pode fazer', color: 'azul', icon: 'coroa', effects: { rel: { lucas: 8 }, bond: { lucas: { lealdade: 8 } }, flags: { lucasMissao: true }, mood: { fatigue: 12 }, xp: 12 }, reply: '"Vigie a estrada do norte por mim. Discretamente." Lucas se endireita na sela como se tivesse crescido dez centímetros.' },
      ],
    } },
  },
  {
    id: 'caca_3', speaker: 'aveline', topic: 'Caçada no bosque sagrado', kind: 'atividade', domain: P, minDay: 10,
    nodes: { start: {
      text: 'A caçada entra, sem querer, num bosque de carvalhos marcados com fitas. Aveline Seren surge entre as árvores, a cavalo, pálida de raiva. "Majestade. Aqui não se caça. Aqui se reza. O seu avô sabia disso."',
      choices: [
        { label: 'Pedir desculpas e sair', sub: 'Seren +5', color: 'verde', icon: 'arvore', effects: { loyalty: { seren: 5 }, rel: { aveline: 6 }, mood: { fatigue: 10 }, xp: 10 }, reply: 'Aveline acompanha você até a borda do bosque. No caminho, conta a história de cada árvore. É, surpreendentemente, a melhor parte da caçada.' },
        { label: 'O bosque é do rei', sub: 'Autoridade', color: 'vermelho', icon: 'coroa', effects: { loyalty: { seren: -8 }, res: { prestigio: 2 }, mood: { anger: -10 }, xp: 6 }, reply: '"Os bosques eram de reis muito antes de você", diz Aveline. "E continuarão sendo depois." Os Seren anotam.' },
      ],
    } },
  },
  {
    id: 'cidade_1', speaker: 'marta', topic: 'O rei disfarçado', kind: 'atividade', domain: P,
    nodes: { start: {
      text: 'De capuz e roupas simples, você desce à cidade baixa. Marta o reconhece em três segundos. "Majestade? Não, não responda. Eu não vi nada." Ela puxa você para dentro de uma taverna. "Se quer saber o que o povo pensa, escute. Mas não peça cerveja com esse sotaque."',
      choices: [
        { label: 'Escutar as mesas', sub: 'O que dizem do rei', color: 'azul', icon: 'olho', effects: { res: { influencia: 3 }, mood: { stress: 5 }, xp: 12 }, reply: (s) => (s.res.povo >= 55 ? 'Falam bem de você. Não muito alto, porque ainda não confiam, mas bem. Um bêbado diz que o rei novo "até que é gente".' : 'Falam dos impostos, do pão caro e do "menino no trono". Um bêbado diz que o rei não aguentaria um dia aqui. Você aguenta uma hora.') },
        { label: 'Pagar uma rodada', sub: '−20 ouro, povo +3', color: 'dourado', icon: 'moedas', effects: { res: { ouro: -20, povo: 3 }, mood: { joy: 8 }, xp: 8 }, reply: 'A taverna brinda a um estranho generoso. Marta balança a cabeça: "O senhor vai ser descoberto em dois dias." É descoberto em um.' },
      ],
    } },
  },
  {
    id: 'cidade_2', speaker: 'tomas', topic: 'O rei disfarçado', kind: 'atividade', domain: P, minDay: 8,
    nodes: { start: {
      text: 'Na padaria de Tomás, dois homens de capa discutem baixo sobre "quando as chaves girarem". Tomás, amassando pão, finge não ouvir. Você também. Um deles tem um anel com uma montanha gravada.',
      choices: [
        { label: 'Segui-los', sub: 'Arriscado', color: 'roxo', icon: 'mascara', effects: { clue: 'cinco_cadeiras', mood: { stress: 10, fatigue: 10 }, xp: 16 }, reply: 'Eles entram numa casa perto do portão norte. Você conta cinco cavalos no estábulo dos fundos. Cinco.' },
        { label: 'Perguntar a Tomás depois', sub: 'Sem riscos', color: 'azul', icon: 'balao', effects: { rel: { tomas: 4 }, res: { influencia: 2 }, xp: 10 }, reply: '"Vêm toda semana, Majestade. Pagam com moedas das montanhas e nunca comem o pão." Tomás parece ofendido com a última parte.' },
      ],
    } },
  },
];
