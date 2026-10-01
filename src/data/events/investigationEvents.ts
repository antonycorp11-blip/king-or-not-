import type { Choice, GameEvent, GameState } from '../../types';
import { CONFESSION, EVIDENCE_MAP, KIND_INFO, MISSION_MAP, SUSPECTS, type SuspectId } from '../investigation';
import { accuse, canConfront, confront, inv, openCase, phase, seenKind, suspicion, takeReport, has, discover } from '../../engine/investigation';
import { char } from '../characters';
import { currentOp, offerOp, opPitch } from '../../engine/nightOps';

// EVENTOS DA INVESTIGAÇÃO: Pimenta, os relatórios, o perigo, os confrontos e a acusação
const P = 'pessoal' as const;

// o que Pimenta diz ao voltar, conforme o que achou
function reportText(s: GameState): string {
  const I = inv(s);
  const r = I.report;
  if (!r) return 'Pimenta aparece do nada, faz uma reverência e desaparece de novo. "Nada a relatar, Majestade. Só queria ver se o senhor ainda estava vivo."';
  const m = MISSION_MAP[r.missionId];
  const d = r.evId ? EVIDENCE_MAP[r.evId] : null;
  const intro = ({
    criadagem: 'Pimenta sai de trás de um barril, com farinha até nas orelhas. "As criadas sabem tudo, Majestade. E falam tudo, se você descascar batata com elas."',
    quarto_odran: 'Pimenta está sentado na cama do rei morto, balançando os pés. "Não se assuste. Ele não se importa. Já perguntei."',
    portaria: 'Pimenta mostra as mãos sujas de tinta. "Copiei o livro da portaria inteiro. O guarda achou que eu estava desenhando. Elogiou meus cavalos."',
    arquivos: 'Pimenta espirra atrás de uma pilha de pergaminhos. "Poeira de duzentos anos. E uma coisa que alguém devia ter queimado."',
    livro_tesouro: 'Pimenta conta nos dedos. Três vezes. "Corvin soma bem, Majestade. Subtrai melhor ainda."',
    seguir_corvin: 'Pimenta está pálido. "Seguir um tesoureiro é como seguir uma sombra que conta os passos. Mas eu vi aonde ele foi."',
    observar_brandt: 'Pimenta tem um galo na testa. "Brandt não me viu. O cavalo dele, sim."',
    investigar_isabelle: 'Pimenta não faz piada. Isso é o mais assustador. "Majestade... sobre a sua mãe."',
    investigar_otho: 'Pimenta joga uma pedrinha de Cinzel para o alto e pega. "Otho é óbvio demais. Quase como se alguém quisesse que ele fosse."',
    aldric_noite: 'Pimenta aparece de capuz, como um monge ruim. "O Chanceler dorme pouco, Majestade. E não é nos arquivos."',
    cozinha: 'Pimenta come uma torta inteira enquanto fala. "Investigação. Estou investigando esta torta também."',
    interceptar: 'Pimenta tem uma pena de pombo presa no cabelo. "O pombo lutou bravamente. Eu venci por pouco."',
    boticario: 'Pimenta cheira a ervas amargas. "O boticário achou que eu queria envenenar o Chanceler. Eu disse que ainda não."',
  } as Record<string, string>)[m.id] ?? 'Pimenta aparece com cara de quem sabe demais.';
  const found = d ? ` Ele entrega o que achou: "${d.title}". ${d.text}` : ' Desta vez ele não achou o que procurava, e isso também diz alguma coisa.';
  const warn = r.noticed ? ' No fim, ele baixa a voz: "Acho que alguém me viu. Vou ficar longe dos corredores por uns dias."' : '';
  return intro + found + warn;
}

const confrontChoices = (id: SuspectId) => (s: GameState): Choice[] => {
  const I = inv(s);
  const said = I.confronted[id] ?? [];
  const opt = (mode: 'suave' | 'blefe' | 'prova' | 'ameaca' | 'informante', label: string, sub: string, color: Choice['color'], icon: string, say: string): Choice => ({
    label, sub, color, icon, say, effects: { run: (st) => { (st.flags as Record<string, unknown>)[`_conf_${id}`] = confront(st, id, mode); }, xp: 10 },
    reply: (st) => String((st.flags as Record<string, unknown>)[`_conf_${id}`] ?? ''),
  });
  return [
    opt('suave', 'Perguntar com calma', 'Onde estava naquela noite?', 'azul', 'balao', 'Preciso saber uma coisa, sem acusar ninguém. Onde você estava na noite em que meu pai morreu?'),
    opt('blefe', 'Blefar', 'Fingir que sabe mais', 'roxo', 'mascara', 'Não precisa mentir. Eu já sei o que aconteceu naquela noite. Só quero ouvir da sua boca.'),
    ...(said.includes('prova') ? [] : [opt('prova', 'Mostrar as provas', 'Colocar tudo na mesa', 'vermelho', 'pergaminho', 'Olhe para isto. Cada papel, cada testemunha. Explique.')]),
    opt('ameaca', 'Ameaçar', 'Medo, não verdade', 'vermelho', 'espadas', 'Se eu descobrir que você teve qualquer coisa a ver com a morte do meu pai, não vai haver tribunal. Vai haver forca.'),
    ...(I.informant ? [] : [opt('informante', 'Propor um acordo', 'Vire meus olhos', 'dourado', 'aperto', 'Talvez você seja inocente. Então me ajude a provar isso. Traga-me o que ouvir, e eu esqueço o que sei sobre você.')]),
    { label: 'Guardar para depois', sub: 'Não mostrar o jogo', color: 'dourado', icon: 'escudo', say: 'Esqueça. Era só uma curiosidade. Pode ir.', reply: `${char(id).name} sai devagar, olhando para trás uma vez.` },
  ];
};

// O relatório da noite: às vezes Pimenta tem um plano para agora mesmo
const reportChoices = (s: GameState): Choice[] => {
  const op = offerOp(s);
  const base: Choice[] = [
    { label: 'Colocar na mesa', sub: 'Guardar a evidência', color: 'azul', icon: 'pergaminho', say: 'Bom trabalho. Vou pôr isso na mesa, junto com o resto. E você, descanse um pouco.', effects: { run: (st) => { takeReport(st); }, rel: { pimenta: 2 }, xp: 10 }, reply: op ? '"Descansar? Ainda não, Majestade." Ele olha para os lados.' : '"Descansar? Eu sou bobo, Majestade, não preguiçoso." Ele some antes de você terminar de agradecer.', goto: op ? 'op' : undefined },
    { label: 'Perguntar como ele conseguiu', sub: 'Conhecer o método', color: 'verde', icon: 'balao', say: 'Como você conseguiu isso sem ninguém perceber?', effects: { run: (st) => { takeReport(st); }, rel: { pimenta: 4 }, bond: { pimenta: { confianca: 4 } }, xp: 10 }, reply: '"Truque de bobo, Majestade: se você tropeça três vezes na frente de alguém, na quarta vez ele nem olha."' + (op ? ' Ele baixa a voz.' : ''), goto: op ? 'op' : undefined },
  ];
  return base;
};

export const INVESTIGATION_CHOICES: Record<string, (s: GameState) => Choice[]> = {
  ...Object.fromEntries(SUSPECTS.map((id) => [`confronto_${id}`, confrontChoices(id)])),
  olhos_relatorio: reportChoices,
};

export const INVESTIGATION_EVENTS: GameEvent[] = [
  // ======================= A PRIMEIRA PISTA =======================
  {
    id: 'odran_mel', speaker: 'pimenta', topic: 'Uma piada sobre mel', kind: 'encontro', domain: P, day: 1, talk: false,
    place: { room: 'galeria', hour: 18, spot: 'centro', title: 'Pimenta faz malabares na galeria' },
    nodes: {
      start: {
        text: (s) => (s.flags.prologoPimenta === 'perguntou' ? 'Pimenta está esperando na galeria, como prometeu no velório. ' : s.flags.prologoPimenta === 'calou' ? 'Pimenta está na galeria. Finge não ver você, e depois finge que acabou de ver. ' : '') + 'Pimenta equilibra três maçãs e uma taça vazia no meio da galeria. Quando você passa, ele deixa a taça cair e a pega no ar. "Cuidado, Majestade. Taças são perigosas nesta família." Ele cheira a taça. "Seu pai odiava vinho doce, sabia? Cuspia no chão, na frente dos embaixadores. Estranho terem encontrado mel na última taça dele." Uma maçã cai. Ele ri. "Estranho, não? Abelhas não sobem escadas."',
        choices: [
          { label: 'O que você quer dizer?', sub: 'Puxar o fio', color: 'roxo', icon: 'olho', say: 'Pimenta. Pare de rir e repita isso. Mel na taça do meu pai? Quem te contou isso?', effects: { run: (s) => openCase(s), xp: 12 }, reply: 'Pimenta pega a maçã do chão e dá uma mordida. "Eu? Eu não disse nada. Sou bobo. Bobos dizem coisas." Ele se afasta assobiando. Na porta, sem se virar: "Pergunte à cozinheira do que o seu pai gostava. E do que ele não gostava."' },
          { label: 'Rir e seguir adiante', sub: 'É só uma piada', color: 'dourado', icon: 'balao', say: '(Você ri.) Abelhas não sobem escadas. Essa é boa, Pimenta.', effects: { run: (s) => openCase(s), xp: 6 }, reply: 'Pimenta ri junto. Tarde da noite, porém, a frase volta: seu pai cuspia vinho doce na frente de embaixadores. Então quem pôs mel na taça dele, e por quê?' },
        ],
      },
    },
    ignored: { text: 'Pimenta deixou um bilhete torto sob a sua porta: "Seu pai odiava doce. Havia mel na última taça. Abelhas não sobem escadas." Nenhuma assinatura. Um desenho de guizo.', run: (s) => openCase(s) },
  },
  // ======================= OS OLHOS DO BOBO =======================
  {
    id: 'olhos_do_bobo', speaker: 'pimenta', topic: 'Os Olhos do Bobo', kind: 'encontro', domain: P, followup: true, talk: false, repeat: 3,
    cond: (s) => { const I = inv(s); return I.open && !I.eyes && s.day >= (I.openedDay ?? 99) + 1; },
    place: { room: 'arquivos', hour: 11, spot: 'mapas', title: 'Pimenta está escondido nos arquivos' },
    nodes: { start: {
      text: 'Pimenta está sentado dentro de uma estante vazia dos arquivos, como um livro. "Majestade. Ninguém olha para o bobo. Eu entro nas cozinhas, nas cavalariças, nos quartos, e ninguém para de falar porque eu cheguei. Sou a mobília que ri." Ele desce da estante. "Seu pai sabia disso. Se o senhor quiser saber o que aconteceu com ele, eu posso ser os seus olhos. Um trabalho de cada vez. E, se alguém perceber, o senhor finge que eu sou só um bobo."',
      choices: [
        { label: 'Aceitar os Olhos do Bobo', sub: 'Missões clandestinas', color: 'roxo', icon: 'olho', say: 'Então seja meus olhos, Pimenta. Um trabalho de cada vez, e ninguém sabe além de nós dois. E você toma cuidado. É uma ordem.', effects: { run: (s) => { inv(s).eyes = true; }, rel: { pimenta: 8 }, xp: 12 }, reply: '"Cuidado é meu segundo nome. O primeiro é Beto, mas ninguém usa." Ele faz uma reverência com o guizo. "O caso está na sua mesa, no quarto. Diga para onde olhar."' },
        { label: 'Isso é perigoso demais', sub: 'Proteger Pimenta (por ora)', color: 'azul', icon: 'escudo', say: 'Não, Pimenta. Se alguém matou meu pai, mata um bobo sem pensar. Não quero você nisso.', effects: { rel: { pimenta: 4 }, xp: 6 }, reply: '"O senhor é mais parecido com ele do que imagina", diz Pimenta, sério. "Ele também me disse isso. Uma semana antes." Ele sai. Vai voltar a perguntar.' },
      ],
    } },
    ignored: { text: 'Pimenta esperou nos arquivos a manhã inteira, dentro de uma estante.' },
  },
  {
    id: 'olhos_relatorio', speaker: 'pimenta', topic: 'Pimenta voltou', kind: 'encontro', domain: P, talk: false,
    place: { room: 'arquivos', hour: 20, duration: 2, title: 'Pimenta espera nos arquivos' },
    nodes: {
      op: {
        text: (s) => { const op = currentOp(s); return op ? opPitch(op) : 'Pimenta pensa melhor e desiste do plano. "Outra noite."'; },
        choices: [
          { label: 'Vamos agora', sub: 'Uma operação noturna', color: 'roxo', icon: 'olho', say: 'Vamos. Agora, enquanto o castelo dorme.', effects: { run: (s) => { const op = currentOp(s); if (op) op.go = true; }, rel: { pimenta: 3 }, xp: 6 }, reply: 'Pimenta apaga a vela com dois dedos. "Siga o bobo, Majestade. E não espirre."' },
          { label: 'Hoje não', sub: 'Ir dormir', color: 'azul', icon: 'coracao', say: 'Hoje não, Pimenta. Estou exausto. Outra noite.', effects: { run: (s) => { const op = currentOp(s); if (op) op.done = 'desistiu'; } }, reply: '"Outra noite, então. Mas as paredes não esperam para sempre."' },
        ],
      },
      start: {
      text: (s) => reportText(s),
      choices: [
        { label: 'Colocar na mesa', sub: 'Guardar a evidência', color: 'azul', icon: 'pergaminho', say: 'Bom trabalho. Vou pôr isso na mesa, junto com o resto. E você, descanse um pouco.', effects: { run: (s) => { takeReport(s); }, rel: { pimenta: 2 }, xp: 10 }, reply: '"Descansar? Eu sou bobo, Majestade, não preguiçoso." Ele some antes de você terminar de agradecer.' },
        { label: 'Perguntar como ele conseguiu', sub: 'Conhecer o método', color: 'verde', icon: 'balao', say: 'Como você conseguiu isso sem ninguém perceber?', effects: { run: (s) => { takeReport(s); }, rel: { pimenta: 4 }, bond: { pimenta: { confianca: 4 } }, xp: 10 }, reply: '"Truque de bobo, Majestade: se você tropeça três vezes na frente de alguém, na quarta vez ele nem olha." Ele tropeça de propósito ao sair. Ninguém olha.' },
      ],
    } },
    ignored: { text: 'Pimenta esperou com o relatório e foi embora. Vai tentar de novo amanhã.', run: (s) => { s.scheduled.push({ id: 'olhos_relatorio', day: s.day + 1 }); } },
  },
  // ======================= PERIGO =======================
  {
    id: 'pimenta_comprado', speaker: 'pimenta', topic: 'Uma bolsa de moedas', kind: 'encontro', domain: P, talk: false,
    place: { room: 'galeria', hour: 10, spot: 'oeste', title: 'Pimenta quer falar (parece nervoso)' },
    nodes: { start: {
      text: (s) => `Pimenta joga uma bolsa pesada na sua mão. "Alguém deixou isto no meu quarto ontem, com um bilhete: 'Para o bobo parar de fazer perguntas.' Cem moedas, Majestade. Nunca fui tão valorizado." Ele sorri, mas as mãos tremem. "${suspicion(s)[inv(s).murderer] >= 30 ? 'A bolsa cheira a' : 'A bolsa não tem cheiro de nada. Quem manda uma bolsa assim sabe o que faz.'}${suspicion(s)[inv(s).murderer] >= 30 ? ` ${({ corvin: 'cera de livro-caixa', brandt: 'cavalo e hidromel', isabelle: 'violetas', otho: 'pedra de mina', aldric: 'tinta de chancelaria' } as Record<SuspectId, string>)[inv(s).murderer]}.` : ''}"`,
      choices: [
        { label: 'Fingir que ele aceitou', sub: 'Usar o suborno contra quem pagou', color: 'roxo', icon: 'mascara', say: 'Fique com o dinheiro, e pare de perguntar em público. Quem pagou vai achar que ganhou. E vai relaxar.', effects: { run: (s) => { const I = inv(s); I.heat[I.murderer] = Math.max(0, I.heat[I.murderer] - 30); I.pimenta.danger = Math.max(0, I.pimenta.danger - 20); }, res: { ouro: 100 }, xp: 12 }, reply: '"Corrupto pela coroa. Minha mãe teria orgulho." A atenção sobre vocês esfria. Por enquanto.' },
        { label: 'Devolver com uma mensagem', sub: 'Mostrar que o rei sabe', color: 'vermelho', icon: 'coroa', say: 'Devolva a bolsa por onde ela veio, com um bilhete meu: "O rei não se vende, e o bobo também não."', effects: { run: (s) => { const I = inv(s); I.heat[I.murderer] = Math.min(100, I.heat[I.murderer] + 20); I.pimenta.danger = Math.min(100, I.pimenta.danger + 15); }, res: { prestigio: 1 }, xp: 10 }, reply: 'A bolsa some do lugar onde Pimenta a deixou. Quem a pegou agora sabe que o rei sabe. Isso muda o jogo, para os dois lados.' },
      ],
    } },
  },
  {
    id: 'pimenta_ameacado', speaker: 'pimenta', topic: 'Uma faca na porta', kind: 'encontro', domain: P, talk: false,
    place: { room: 'biblioteca', hour: 11, spot: 'leitura', title: 'Pimenta está escondido na biblioteca' },
    nodes: { start: {
      text: 'Pimenta está atrás de uma estante, sem guizos. "Hoje de manhã havia uma faca espetada na porta do meu quarto. E um desenho: um bobo sem cabeça. Péssimo desenhista, aliás." Ele tenta sorrir. "Majestade, eu não tenho medo de morrer. Tenho medo de morrer sem terminar."',
      choices: [
        { label: 'Pôr um guarda com ele', sub: 'Proteção, menos segredo', color: 'azul', icon: 'escudo', say: 'A partir de hoje, um guarda de Aurelian dorme na sua porta. E você não sai sozinho à noite.', effects: { run: (s) => { const I = inv(s); I.pimenta.danger = Math.max(0, I.pimenta.danger - 35); I.heat[I.murderer] = Math.min(100, I.heat[I.murderer] + 10); }, rel: { pimenta: 6, aurelian: 2 }, xp: 10 }, reply: '"Um bobo com guarda-costas. Agora sim sou nobre." Todo o castelo nota o guarda. Inclusive quem mandou a faca.' },
        { label: 'Suspender as missões por uns dias', sub: 'Deixar esfriar', color: 'verde', icon: 'coracao', say: 'Pare tudo por uns dias. Faça malabares, conte piadas, seja só um bobo. Eles precisam acreditar que você desistiu.', effects: { run: (s) => { const I = inv(s); I.pimenta.status = 'escondido'; I.pimenta.until = s.day + 3; I.mission = undefined; I.pimenta.danger = Math.max(0, I.pimenta.danger - 45); for (const k of SUSPECTS) I.heat[k] = Math.max(0, I.heat[k] - 15); }, rel: { pimenta: 4 }, xp: 8 }, reply: 'Pimenta passa três dias tropeçando em público e errando piadas de propósito. Ninguém mais o leva a sério. Esse era o plano.' },
        { label: 'Continuar como se nada fosse', sub: 'Arriscado', color: 'vermelho', icon: 'espadas', say: 'Se estão ameaçando, é porque estamos perto. Continue.', effects: { run: (s) => { inv(s).pimenta.danger = Math.min(100, inv(s).pimenta.danger + 10); }, rel: { pimenta: -4 }, xp: 6 }, reply: '"Perto de quê, Majestade? Do fim do caso ou do meu?" Ele coloca os guizos de volta, um por um.' },
      ],
    } },
  },
  {
    id: 'pimenta_ferido', speaker: 'irma', topic: 'Pimenta foi ferido', kind: 'urgente', domain: P,
    nodes: { start: {
      text: 'Irmã Hedda entra com as mãos manchadas. "Encontraram Pimenta na escada de serviço, desacordado. Alguém bateu nele por trás. Vai viver. Mas quando acordou, a primeira coisa que disse foi: \'Diga ao rei que não foi a escada.\'"',
      choices: [
        { label: 'Ir vê-lo agora', sub: 'O rei ao lado do bobo', color: 'verde', icon: 'coracao', say: 'Leve-me até ele. Agora.', effects: { rel: { pimenta: 10, irma: 4 }, bond: { pimenta: { lealdade: 12 } }, mood: { anger: 12, stress: 8 }, xp: 10 }, reply: 'Pimenta abre um olho quando você entra. "Majestade. Não se preocupe. Bateram na cabeça, e a minha cabeça nunca serviu para muita coisa." Ele segura sua manga. "Continue. Não por mim. Por ele."' },
        { label: 'Dobrar a guarda e caçar quem foi', sub: 'Resposta dura', color: 'vermelho', icon: 'espadas', say: 'Dobrem a guarda nos corredores. E eu quero saber quem estava na escada de serviço ontem à noite.', effects: { run: (s) => { const I = inv(s); I.heat[I.murderer] = Math.min(100, I.heat[I.murderer] + 15); }, res: { moral: 1 }, rel: { pimenta: 4 }, xp: 8 }, reply: 'A guarda revista a ala de serviço. Ninguém viu nada, e todos têm medo agora. Quem bateu em Pimenta sabe que o rei está com raiva.' },
      ],
    } },
  },
  // ======================= O SEGREDO DE PIMENTA =======================
  {
    id: 'pimenta_segredo', speaker: 'pimenta', topic: 'O que Pimenta não contou', kind: 'encontro', domain: P, followup: true, talk: false,
    cond: (s) => inv(s).open && phase(s) >= 5 && !has(s, 'pimenta_segredo') && inv(s).pimenta.status === 'ok',
    place: { room: 'capela', hour: 19, spot: 'bancos', title: 'Pimenta pediu para vê-lo na capela, à noite' },
    nodes: { start: {
      text: 'Pimenta está sentado no último banco da capela, sem pintura no rosto. "Majestade, eu menti. Um pouco. Por omissão, que é a mentira dos covardes." Ele tira do gibão um bilhete dobrado muitas vezes. "Seu pai me usava como olhos havia anos. Na noite em que morreu, me deu isto. Eu não abri por um mês. Tive medo do que ia ler."',
      choices: [
        { label: 'Perdoá-lo e ler juntos', sub: 'Confiança', color: 'verde', icon: 'coracao', say: 'Você carregou isso sozinho por meses, Pimenta. Não é covardia. Vamos ler juntos.', effects: { run: (s) => { discover(s, 'pimenta_segredo', 'Pimenta'); }, bond: { pimenta: { confianca: 15, lealdade: 10 } }, rel: { pimenta: 10 }, xp: 16 }, reply: 'A letra do seu pai, apressada: "Se eu cair, olhe para quem mais ganha com o menino no trono." Pimenta chora pela primeira vez. Você também, um pouco.' },
        { label: 'Por que só agora?', sub: 'Desconfiar', color: 'vermelho', icon: 'olho', say: 'Por que só agora, Pimenta? O que mais você está escondendo de mim?', effects: { run: (s) => { discover(s, 'pimenta_segredo', 'Pimenta'); }, bond: { pimenta: { confianca: -6 } }, xp: 14 }, reply: '"Nada, Majestade. Juro pelo meu guizo." Ele entrega o bilhete: "Se eu cair, olhe para quem mais ganha com o menino no trono." Depois sai, e não se despede.' },
      ],
    } },
  },
  // ======================= CONFRONTOS (opções montadas na hora) =======================
  ...SUSPECTS.map((id): GameEvent => ({
    id: `confronto_${id}`, speaker: id, topic: 'Perguntas sobre a noite da morte', kind: 'conversa', domain: P, talk: false, repeat: 1,
    nodes: { start: {
      text: (s) => `Você chama ${char(id).name} a sós. ${({ corvin: 'Corvin chega com o livro-caixa apertado contra o peito, como um escudo.', brandt: 'Brandt entra sem bater, enorme, e fica de pé, perto da porta.', isabelle: 'Sua mãe senta sem ser convidada e cruza as mãos no colo. Ela sabe por que está aqui. Mães sabem.', otho: 'Otho sorri antes mesmo de sentar. "Majestade. Que honra ser chamado a sós."', aldric: 'Aldric entra, tira os óculos, limpa as lentes. Devagar. Como quem ganha tempo.' } as Record<SuspectId, string>)[id]} (Índice de suspeita: ${suspicion(s)[id]}%.)`,
      choices: [],
    } },
  })),
  // ======================= ACUSAÇÃO FORMAL =======================
  ...SUSPECTS.map((id): GameEvent => ({
    id: `acusacao_${id}`, speaker: id, topic: `A acusação de ${char(id).name}`, kind: 'conversa', domain: P, talk: false, repeat: 99,
    nodes: { start: {
      text: (s) => `O salão está cheio. Os guardas fecham as portas. Diante da corte, você acusa ${char(id).name} pela morte do rei Odran. As evidências que você reuniu apontam para ${id === 'isabelle' ? 'ela' : 'ele'} com ${suspicion(s)[id]}% de força. ${suspicion(s)[id] < 50 ? 'É pouco, e todos sabem disso.' : suspicion(s)[id] < 70 ? 'Não é pouco. Não é certeza.' : 'A corte murmura: é muito.'}`,
      choices: [
        { label: 'Ler as provas e acusar', sub: 'Não há volta', color: 'vermelho', icon: 'pergaminho', say: `Diante de Deus e desta corte, acuso ${char(id).name} da morte do meu pai, o rei Odran. Que as provas falem.`, effects: { run: (s) => { const r = accuse(s, id); (s.flags as Record<string, unknown>)._acusacao = r.text; s.log.push({ icon: 'selo', title: r.title, text: r.text, tone: r.tone }); }, xp: 30 }, reply: (s) => String((s.flags as Record<string, unknown>)._acusacao ?? '') },
        { label: 'Recuar no último instante', sub: 'Ainda não', color: 'azul', icon: 'escudo', say: 'Não. Ainda não. A corte está dispensada.', effects: { res: { prestigio: -3 }, xp: 4 }, reply: 'Você dispensa a corte. Os murmúrios duram o dia inteiro. O acusado agora sabe o que você pensa.' },
      ],
    } },
  })),
  // ======================= A VERDADE VEM À TONA =======================
  {
    id: 'verdade_vem_a_tona', speaker: 'pimenta', topic: 'A verdade vem à tona', kind: 'urgente', domain: P,
    cond: (s) => !!s.investigation?.accused && !s.investigation.accused.correct,
    nodes: { start: {
      text: (s) => { const I = inv(s); const wrong = I.accused!.id; return `Pimenta entra sem guizos, com um papel na mão. "Majestade. Condenamos a pessoa errada." É uma prova que só aparece agora: ${char(wrong).name} estava em outro lugar naquela noite, e alguém plantou o resto. ${CONFESSION[I.murderer].link.split('.')[0]}. O verdadeiro culpado continua na corte.`; },
      choices: [
        { label: 'Admitir o erro publicamente', sub: 'Honra, mesmo cara', color: 'verde', icon: 'coracao', say: 'Vou admitir diante de todos. Um rei que erra e esconde é pior que um rei que erra.', effects: { run: (s) => { const I = inv(s); s.flags[`condenado_${I.accused!.id}`] = false; I.accused = undefined; s.flags.casoEncerrado = false; }, res: { prestigio: -8, povo: 4 }, xp: 20 }, reply: 'A corte fica em silêncio. O povo, curiosamente, respeita. O caso está reaberto, e agora o assassino sabe que você não desiste.' },
        { label: 'Enterrar a prova', sub: 'Proteger a coroa', color: 'roxo', icon: 'mascara', say: 'Queime isso, Pimenta. Ninguém pode saber.', effects: { res: { influencia: 3 }, run: (s) => { s.flags.verdadeEnterrada = true; if (s.conspiracy.fallDay) s.conspiracy.fallDay -= 2; }, rel: { pimenta: -10 }, xp: 8 }, reply: 'Pimenta queima o papel sem dizer nada. Pela primeira vez, ele não faz piada. O Pacto, em algum lugar, sorri.' },
      ],
    } },
  },
];

// para a interface: nome curto do tipo
export const kindName = (s: GameState, id: string) => KIND_INFO[seenKind(s, EVIDENCE_MAP[id])].name;
export { canConfront };
