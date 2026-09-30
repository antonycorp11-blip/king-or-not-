import type { GameEvent, GameState } from '../../types';

// REFEIÇÕES NO SALÃO DE BANQUETES
// O almoço (12h30) e o jantar (19h) estão na agenda todo dia. O rei precisa ir até
// a mesa para comer. Quem senta perto dele, o que se fala e o que se cala: tudo
// depende do estado do reino e das decisões anteriores.
const P = 'pessoal' as const;
const M = (e: Omit<GameEvent, 'kind' | 'domain'>): GameEvent => ({ ...e, kind: 'atividade', domain: P, repeat: e.repeat ?? 9 });
const low = (s: GameState, h: 'valmont' | 'drakon' | 'seren' | 'montclair') => s.loyalty[h] < 0;

export const MEAL_EVENTS: GameEvent[] = [
  // ======================= ALMOÇOS DA CORTE =======================
  M({
    id: 'almoco_lugares', speaker: 'aldric', topic: 'Quem senta onde',
    nodes: { start: {
      text: 'Antes de servirem a sopa, Aldric se inclina: "Majestade, o protocolo pede que um lorde sente à sua direita. Os Valmont esperam esse lugar há três dias. Os Drakon juram que é deles por direito de sangue." Os dois enviados estão de pé, olhando para a mesma cadeira.',
      choices: [
        { label: 'O lugar é do Valmont', sub: 'Valmont +4 · Drakon −3', color: 'azul', icon: 'moedas', say: 'O enviado da Casa Valmont senta à minha direita hoje. A Costa Serena sustenta metade do tesouro deste reino; é justo que se sente perto dele.', effects: { loyalty: { valmont: 4, drakon: -3 }, xp: 5 }, reply: 'O enviado Valmont sorri como quem ganhou um porto. O Drakon senta no fim da mesa e não toca na comida.' },
        { label: 'O lugar é do Drakon', sub: 'Drakon +4 · Valmont −3', color: 'vermelho', icon: 'espadas', say: 'Sente-se aqui, enviado Drakon. Quem guarda a fronteira com o próprio sangue senta ao lado do rei. O ouro pode esperar na outra ponta.', effects: { loyalty: { drakon: 4, valmont: -3 }, xp: 5 }, reply: 'O Drakon bate o punho no peito antes de sentar. O Valmont anota alguma coisa num caderninho.' },
        { label: 'Que sente a rainha-mãe', sub: 'Ninguém ganha, ninguém perde muito', color: 'dourado', icon: 'coroa', say: 'O lugar à minha direita é da minha mãe, como sempre foi. Os senhores dividam a mesa como irmãos, ou pelo menos como primos que se toleram.', effects: { rel: { isabelle: 4 }, loyalty: { valmont: -1, drakon: -1 }, xp: 6 }, reply: 'Isabelle senta com a dignidade de quem esperava isso desde o começo. Os dois enviados se sentam lado a lado, emburrados, e acabam discutindo o preço do ferro.' },
      ],
    } },
  }),
  M({
    id: 'almoco_provador', speaker: 'cozinheiro', topic: 'O provador de comida',
    cond: (s) => !!s.flags.envenenado || !!s.flags.lysandraPresa || s.conspiracy.clues.length >= 3,
    nodes: { start: {
      text: (s) => `Sálvio, o cozinheiro, aparece ao seu lado com um menino magro de uns doze anos. "Majestade, ${s.flags.envenenado ? 'depois do vinho daquela noite' : 'com tanta gente estranha nos corredores'}, achei melhor. O Tico prova tudo antes do senhor. Ele come muito, é verdade, mas é de confiança."`,
      choices: [
        { label: 'Aceitar o provador', sub: 'Segurança', color: 'azul', icon: 'escudo', say: 'Aceito, Sálvio. E você, Tico: coma devagar e me diga se alguma coisa tiver gosto de amêndoa amarga. Obrigado por cuidar de mim.', effects: { flags: { provadorReal: true }, mood: { stress: -6 }, xp: 6 }, reply: 'Tico prova a sopa, o pão e, por via das dúvidas, três pedaços de torta. Tudo em ordem. Ele sorri com a boca cheia.' },
        { label: 'Recusar: um rei não tem medo', sub: 'Orgulho', color: 'vermelho', icon: 'coroa', say: 'Agradeço, Sálvio, mas não. Um rei que precisa de um menino para provar a sopa já perdeu metade da coroa. Que todos vejam que eu como sem medo.', effects: { res: { prestigio: 2 }, mood: { stress: 4 }, xp: 5 }, reply: 'A mesa fica em silêncio enquanto você toma a primeira colherada. Nada acontece. Alguém, em algum lugar da mesa, parece decepcionado.' },
      ],
    } },
  }),
  M({
    id: 'almoco_guerra', speaker: 'aurelian', topic: 'Pão de soldado',
    cond: (s) => !!s.war && !s.war.result,
    nodes: { start: {
      text: 'Aurelian chega ao almoço ainda de armadura, com lama nas botas. Ele olha para os pratos da corte, carne, vinho, tortas, e depois para você. "No acampamento, os homens comem pão duro e sopa de nabo, Majestade. Não estou reclamando. Só estou contando."',
      choices: [
        { label: 'Mandar metade da mesa ao quartel', sub: '−40 ouro · moral +4', color: 'verde', icon: 'coracao', say: 'Então que a metade desta mesa vá para o quartel agora mesmo. A carne, o vinho e as tortas. A corte sobrevive a um almoço de sopa; os soldados merecem saber que o rei lembra deles.', effects: { res: { ouro: -40, moral: 4 }, rel: { aurelian: 6 }, xp: 8 }, reply: 'Os criados saem carregando travessas pela galeria. À tarde, dizem que no quartel cantaram o seu nome com a boca cheia.' },
        { label: 'Comer a sopa dos soldados', sub: 'Gesto simbólico', color: 'azul', icon: 'escudo', say: 'Traga-me uma tigela da sopa de nabo, Aurelian. Hoje eu como o que os meus homens comem. E que a corte coma comigo.', effects: { res: { moral: 2, prestigio: 1 }, rel: { aurelian: 4 }, mood: { joy: -2 }, xp: 7 }, reply: 'A sopa é horrível. A corte faz caretas educadas. Aurelian não sorri, mas tira as luvas para comer com você.' },
        { label: 'A guerra não se ganha com sopa', sub: 'Pragmatismo', color: 'dourado', icon: 'moedas', say: 'Entendo, Aurelian, mas guerras não se ganham com gestos na mesa. Se os homens precisam de comida melhor, traga-me um pedido de suprimentos com números, e eu assino.', effects: { rel: { aurelian: -2 }, res: { influencia: 1 }, xp: 5 }, reply: '"Números. Sim, Majestade." Ele sai antes da sobremesa.' },
      ],
    } },
  }),
  M({
    id: 'almoco_fome_povo', speaker: 'isabelle', topic: 'O preço do pão',
    cond: (s) => s.res.povo < 45,
    nodes: { start: {
      text: 'No meio do almoço, pela janela aberta, chega um canto da praça. É uma cantiga de mercado, mas a letra mudou: fala de um rei que come faisão enquanto o pão dobra de preço. Isabelle pousa o garfo. "Eles estão cantando para nós ouvirmos, meu filho."',
      choices: [
        { label: 'Distribuir o pão da mesa na praça', sub: '−30 ouro · povo +4', color: 'verde', icon: 'trigo', say: 'Então que ouçam também a resposta. Todo o pão desta mesa vai para a praça agora, e amanhã o dobro. Um rei não almoça enquanto a cidade canta com fome.', effects: { res: { ouro: -30, povo: 4 }, rel: { isabelle: 3 }, xp: 8 }, reply: 'Os cestos saem pelo portão. A cantiga para. Depois recomeça, com outra letra, mais gentil. Por enquanto.' },
        { label: 'Fechar as janelas', sub: 'Ignorar', color: 'roxo', icon: 'mascara', say: 'Fechem as janelas. Não vou governar pelo que cantam na praça.', effects: { res: { povo: -2 }, mood: { stress: 4 }, xp: 3 }, reply: 'O canto fica abafado. Não some. Durante o resto do almoço, todos na mesa comem olhando para as janelas fechadas.' },
      ],
    } },
  }),
  M({
    id: 'almoco_tesoureiro', speaker: 'corvin', topic: 'A conta do banquete',
    nodes: { start: {
      text: (s) => `Corvin come pouco e anota muito. Quando a sobremesa chega, ele empurra um papel pela toalha. "O custo da mesa real, Majestade. ${s.res.ouro < 200 ? 'Com o tesouro como está, cada faisão é um soldado a menos.' : 'Nada alarmante. Mas o vinho de Véridian custa três vezes o da Costa Serena, e ninguém nota a diferença.'}"`,
      choices: [
        { label: 'Cortar os luxos da mesa', sub: '+15 ouro por semana · corte −1', color: 'dourado', icon: 'moedas', say: 'Corte o vinho de Véridian, as tortas de amêndoa e o terceiro prato de carne. A corte vai reclamar por uma semana e esquecer na seguinte.', effects: { res: { ouro: 40, prestigio: -1 }, rel: { corvin: 4 }, flags: { mesaModesta: true }, xp: 6 }, reply: 'Corvin quase sorri. Na mesa de baixo, Lady Maren descobre, horrorizada, que a sobremesa agora é maçã cozida.' },
        { label: 'A mesa do rei é política', sub: 'Manter o banquete', color: 'azul', icon: 'coroa', say: 'Corvin, esta mesa não é luxo, é política. Os lordes medem o reino pelo que veem aqui. Um rei que serve maçã cozida parece um rei falido.', effects: { res: { prestigio: 1 }, rel: { corvin: -2 }, xp: 5 }, reply: 'Corvin guarda o papel. "Anotado, Majestade. Anoto tudo."' },
      ],
    } },
  }),
  M({
    id: 'almoco_lucas', speaker: 'lucas', topic: 'Lucas quer ir junto',
    cond: (s) => !s.flags.lucasMissao,
    nodes: { start: {
      text: 'Lucas empurra o prato. "Todo mundo nesta mesa já fez alguma coisa. Aurelian lutou em duas guerras. Corvin roubou... quer dizer, contou muito dinheiro. Eu? Eu desenho mapas de lugares onde nunca fui." Ele olha para você. "Me dá alguma coisa para fazer. Qualquer coisa."',
      choices: [
        { label: 'Dar uma missão de verdade', sub: 'Lucas leva cartas ao Vale Rubro', color: 'verde', icon: 'aperto', say: 'Então vá ao Vale Rubro levar minhas cartas a Brandt. Pessoalmente. É uma missão de verdade, Lucas: se ele receber mal a carta, vai receber mal você também.', effects: { rel: { lucas: 10 }, bond: { lucas: { confianca: 6 } }, flags: { lucasMissao: true }, loyalty: { drakon: 2 }, xp: 8 }, reply: 'Lucas quase derruba a jarra de tanto que levanta rápido. Isabelle fica pálida. Ninguém termina o almoço.' },
        { label: 'Ensinar a ler as contas', sub: 'Tarefa segura', color: 'azul', icon: 'pergaminho', say: 'Comece por aqui: amanhã você senta com Corvin e aprende a ler as contas do reino. Quem entende o tesouro entende metade do castelo.', effects: { rel: { lucas: 2, corvin: 2 }, xp: 6 }, reply: '"Contas." Lucas diz a palavra como se fosse uma doença. Mas, no dia seguinte, aparece no tesouro. Atrasado, mas aparece.' },
        { label: 'Seu trabalho é estar seguro', sub: 'Proteger o herdeiro', color: 'dourado', icon: 'escudo', say: 'Seu trabalho, Lucas, é estar vivo e seguro. Enquanto eu não tiver um filho, você é o herdeiro. Isso já é uma missão, mesmo que pareça chata.', effects: { rel: { lucas: -5, isabelle: 4 }, xp: 4 }, reply: '"Herdeiro de um trono que eu não quero." Lucas vai embora antes da sobremesa. Isabelle aprova em silêncio.' },
      ],
    } },
  }),
  M({
    id: 'almoco_enviado_seren', speaker: 'aveline', topic: 'A mesa dos Seren',
    cond: (s) => low(s, 'seren') || s.loyalty.seren > 30,
    nodes: { start: {
      text: (s) => s.loyalty.seren > 30
        ? 'A Senhora Aveline trouxe dos Bosques Reais uma cesta de pães de centeio e mel. "Na nossa casa, o pão é partido pelo mais velho e dividido pelo mais jovem. Hoje, Majestade, o senhor é os dois."'
        : 'A Senhora Aveline come em silêncio, e o silêncio dela pesa na mesa inteira. Por fim: "Nos Bosques, dizem que o rei esqueceu os carvalhos. Eu digo que o rei nunca os conheceu."',
      choices: [
        { label: 'Partir e dividir o pão', sub: 'Respeitar o costume · Seren +4', color: 'verde', icon: 'arvore', say: 'Então eu parto, e eu divido. O primeiro pedaço é seu, Senhora Aveline, e o segundo é da Casa Seren. Que os carvalhos saibam que o rei aprendeu o costume.', effects: { loyalty: { seren: 4 }, rel: { aveline: 5 }, xp: 7 }, reply: 'Aveline recebe o pão com as duas mãos. É a primeira vez que você a vê sorrir de verdade.' },
        { label: 'Prometer visitar os Bosques', sub: 'Compromisso futuro', color: 'azul', icon: 'aperto', say: 'Irei aos Bosques Reais, senhora. Não num dia de festa, mas num dia comum, para ver os carvalhos como eles são. Pode dizer isso à sua gente.', effects: { loyalty: { seren: 2 }, rel: { aveline: 3 }, flags: { promessaBosques: true }, xp: 6 }, reply: '"Vou dizer. E vou lembrar." Na boca de Aveline, as duas frases soam iguais.' },
      ],
    } },
  }),
  M({
    id: 'almoco_otho', speaker: 'otho', topic: 'O vinho de Montclair',
    cond: (s) => !s.flags.othoExilado && !s.flags.othoDeposto,
    nodes: { start: {
      text: 'Lorde Otho Montclair ergue a taça antes de todos. "Um brinde ao rei! Vinho das encostas de Cinzel, que eu mesmo trouxe." Ele serve a sua taça pessoalmente. Do outro lado da mesa, Isabelle para de mastigar.',
      choices: [
        { label: 'Pedir que Otho beba primeiro', sub: 'Desconfiança elegante', color: 'roxo', icon: 'olho', say: 'Que gentileza, Lorde Otho. Em honra de Montclair, beba o senhor primeiro da minha taça. Faço questão.', effects: { bond: { otho: { medo: 6, ressentimento: 4 } }, clue: 'taca_otho', xp: 10 }, reply: 'Otho hesita um instante longo demais antes de beber. Não acontece nada. Mas a corte inteira viu o instante.' },
        { label: 'Brindar sem hesitar', sub: 'Confiança', color: 'azul', icon: 'coroa', say: 'Ao reino, e à Casa Montclair. Que o vinho das montanhas seja tão leal quanto a pedra de onde vem.', effects: { rel: { otho: 4 }, loyalty: { montclair: 2 }, xp: 5 }, reply: 'O vinho é bom. Muito bom. Otho sorri o almoço inteiro. Isabelle não sorri nenhuma vez.' },
      ],
    } },
  }),
  M({
    id: 'almoco_fofoca', speaker: 'pimenta', topic: 'Pimenta à mesa',
    nodes: { start: {
      text: 'Pimenta, o bobo, pula sobre um banco e anuncia: "Senhores! Uma adivinha! O que é, o que é: tem cinco chaves, nenhuma porta e todo mundo quer abrir?" A mesa ri, meio sem graça. Aldric não ri.',
      choices: [
        { label: 'Qual é a resposta, Pimenta?', sub: 'Entrar na brincadeira', color: 'roxo', icon: 'mascara', say: 'Não sei, Pimenta. Diga você. Aqui ninguém vai ser punido por uma adivinha.', effects: { clue: 'adivinha_pimenta', rel: { pimenta: 4, aldric: -2 }, xp: 10 }, reply: '"A cabeça de um rei!" Pimenta faz uma reverência. Depois, passando atrás de você, sussurra: "Cinco cadeiras, Majestade. Conte quantas estão do seu lado."' },
        { label: 'Chega de adivinhas', sub: 'Manter a ordem', color: 'azul', icon: 'escudo', say: 'Chega, Pimenta. Adivinhas depois da sobremesa. Agora deixe a corte comer em paz.', effects: { rel: { pimenta: -2, aldric: 2 }, xp: 3 }, reply: 'Pimenta desce do banco com uma cambalhota triste. Aldric volta a comer, aliviado demais.' },
      ],
    } },
  }),
  M({
    id: 'almoco_simples', speaker: 'isabelle', topic: 'Um almoço tranquilo',
    repeat: 3,
    nodes: { start: {
      text: (s) => `Por uma vez, ninguém pede nada. ${s.spouse ? 'A rainha conta uma história da infância que faz Lucas rir com a boca cheia.' : 'Lucas conta uma história absurda sobre um falcão e o chapéu de Aurelian.'} Isabelle finge desaprovar. A sopa está quente, o pão está fresco, e o castelo, por meia hora, parece uma casa.`,
      choices: [
        { label: 'Aproveitar o momento', sub: 'Descansar', color: 'verde', icon: 'coracao', say: 'Deixem os papéis do lado de fora hoje. Quero ouvir o resto da história do falcão.', effects: { mood: { joy: 6, stress: -8 }, rel: { isabelle: 1, lucas: 1 }, xp: 3 }, reply: 'A história do falcão tem três finais diferentes. Todos são mentira. Todos são ótimos.' },
        { label: 'Aproveitar para despachar', sub: 'Trabalhar comendo', color: 'dourado', icon: 'pergaminho', say: 'Já que estamos todos aqui, aproveito. Aldric, traga os papéis de ontem; assino entre um prato e outro.', effects: { res: { influencia: 1 }, mood: { stress: 3 }, xp: 4 }, reply: 'Você assina seis documentos e deixa cair molho em dois. Isabelle suspira. O momento passa.' },
      ],
    } },
  }),
  // ======================= JANTARES DA CORTE =======================
  M({
    id: 'jantar_corte_rivais', speaker: 'aldric', topic: 'Duas casas à mesma mesa',
    cond: (s) => Math.abs(s.loyalty.valmont - s.loyalty.drakon) > 15,
    nodes: { start: {
      text: (s) => { const up = s.loyalty.valmont > s.loyalty.drakon ? 'Valmont' : 'Drakon'; const down = up === 'Valmont' ? 'Drakon' : 'Valmont'; return `No jantar, o enviado ${down} fala alto o bastante para todos ouvirem: "Engraçado como o vinho chega mais rápido à ponta da mesa dos ${up}." Uma taça é pousada com força demais. Aldric olha para você: é o momento de dizer alguma coisa.`; },
      choices: [
        { label: 'Servir os dois com a mesma jarra', sub: 'Equilíbrio', color: 'azul', icon: 'aperto', say: 'Tragam uma jarra só. Eu mesmo sirvo os dois enviados, da mesma jarra, na mesma medida. Nesta mesa ninguém bebe mais que ninguém.', effects: { loyalty: { valmont: 1, drakon: 1 }, res: { prestigio: 2 }, xp: 8 }, reply: 'Os dois enviados aceitam a taça das mãos do rei. Brindam, rígidos. É pouco, mas ninguém sai no meio do jantar.' },
        { label: 'Repreender quem reclamou', sub: 'Autoridade', color: 'vermelho', icon: 'coroa', say: (s) => `Se a Casa ${s.loyalty.valmont > s.loyalty.drakon ? 'Drakon' : 'Valmont'} tem queixas, que as traga ao salão do trono, de dia, e não à minha mesa. Aqui se janta.`, effects: { run: (s) => { if (s.loyalty.valmont > s.loyalty.drakon) s.loyalty.drakon -= 4; else s.loyalty.valmont -= 4; }, res: { prestigio: 1 }, xp: 5 }, reply: 'O enviado se cala. Mais tarde, dizem que escreveu uma carta longa para casa, com a pena apertada demais.' },
      ],
    } },
  }),
  M({
    id: 'jantar_corte_musico', speaker: 'pimenta', topic: 'Um trovador de passagem',
    nodes: { start: {
      text: 'Um trovador de passagem pede licença para tocar no jantar. A canção é sobre um jovem rei e uma coroa grande demais. A corte ri nas partes certas, e presta atenção demais nas partes erradas.',
      choices: [
        { label: 'Pagar e pedir outra', sub: '−10 ouro · prestígio +1', color: 'dourado', icon: 'moedas', say: 'Muito bem, trovador. Aqui está pela canção. Agora cante outra, e desta vez deixe o rei ganhar no final.', effects: { res: { ouro: -10, prestigio: 1 }, mood: { joy: 5 }, xp: 4 }, reply: 'A segunda canção termina com o rei vencendo um dragão. Ninguém acredita, mas todos aplaudem.' },
        { label: 'Perguntar quem ensinou a letra', sub: 'Desconfiar', color: 'roxo', icon: 'olho', say: 'Bela canção. Diga-me, trovador: onde aprendeu essa letra? Ela sabe coisas demais sobre o meu castelo.', effects: { res: { influencia: 2 }, clue: 'cancao_taverna', xp: 8 }, reply: '"Numa taverna, Majestade. Um homem de botas de montanha pagou bebida para quem aprendesse." O trovador engole em seco. "Eu só canto."' },
      ],
    } },
  }),
  M({
    id: 'jantar_corte_cansaco', speaker: 'isabelle', topic: 'O rei cochila à mesa',
    cond: (s) => s.mood.fatigue > 60,
    nodes: { start: {
      text: 'Entre o segundo e o terceiro prato, sua cabeça pesa. Você acorda com a colher na mão e a mesa inteira fingindo não ter visto. Isabelle pousa a mão no seu braço: "Vá dormir, meu filho. O reino não acaba esta noite."',
      choices: [
        { label: 'Obedecer à mãe', sub: 'Descansar', color: 'verde', icon: 'coracao', say: 'Tem razão, mãe. Senhores, perdoem o rei: até coroas precisam de travesseiro.', effects: { mood: { fatigue: -15 }, rel: { isabelle: 3 }, xp: 3 }, reply: 'A corte ri, aliviada. Pela primeira vez em dias, você dorme antes da meia-noite.' },
        { label: 'Endireitar-se e continuar', sub: 'Aparência de força', color: 'vermelho', icon: 'coroa', say: 'Estou bem. Só pensava no norte. Continuemos; quero ouvir o relatório do tesoureiro antes da sobremesa.', effects: { res: { prestigio: 1 }, mood: { fatigue: 6, stress: 4 }, xp: 4 }, reply: 'Você aguenta até o fim. Ninguém acredita que estava pensando no norte.' },
      ],
    } },
  }),
  M({
    id: 'jantar_corte_tranquilo', speaker: 'lucas', topic: 'Um jantar comum',
    repeat: 3,
    nodes: { start: {
      text: 'O jantar é longo e sem surpresas. Os lordes falam do tempo, do preço do ferro e de um cavalo que Lucas jura ter visto voar. As velas descem devagar.',
      choices: [
        { label: 'Contar uma história do pai', sub: 'Memória', color: 'azul', icon: 'coroa', say: 'Meu pai também jurava que tinha visto um cavalo voar, Lucas. Foi na campanha do Passo, e o cavalo era de Brandt. Brandt nunca desmentiu.', effects: { rel: { lucas: 2, isabelle: 2 }, mood: { joy: 4 }, xp: 3 }, reply: 'A mesa ri. Isabelle ri também, e depois fica quieta, olhando a cadeira vazia do outro lado.' },
        { label: 'Retirar-se cedo', sub: 'Descanso', color: 'verde', icon: 'seta', say: 'Boa noite a todos. O rei vai dormir cedo hoje, e recomendo que os senhores façam o mesmo.', effects: { mood: { fatigue: -6 }, xp: 2 }, reply: 'Você sai pela porta lateral. Atrás de você, a conversa fica mais solta. Sempre fica.' },
      ],
    } },
  }),
];
