import type { GameState, RoomId } from '../types';

// O CASTELO REPARA NO REI
// Quando o rei entra num cômodo, quem está ali comenta. As falas que dependem do
// estado do reino e de decisões antigas vêm primeiro: é assim que o jogador sente
// que o que fez teve efeito. As genéricas só completam.
interface Bark {
  who?: string[]; // quem pode dizer (vazio = qualquer um)
  room?: RoomId[]; // onde
  when?: (s: GameState) => boolean; // situação
  lines: string[] | ((s: GameState) => string[]);
}

const STAFF = ['criada', 'cozinheiro', 'cozinheira', 'jardineiro', 'escriba', 'pajem', 'sentinela', 'clara'];
const COZ = ['cozinheiro', 'cozinheira'];
const f = (k: string) => (s: GameState) => !!s.flags[k];

const BARKS: Bark[] = [
  // ---------- o rei com fome ----------
  { who: [...COZ, 'criada', 'clara'], when: (s) => (s.tracks.fome ?? 0) >= 1, lines: ['O senhor não comeu, Majestade. Quer que eu traga alguma coisa?', 'Pulou o almoço de novo? A Dona Ilda vai ficar ofendida.', 'Tem pão quente na cozinha, Majestade. É só pedir.'] },
  { who: ['isabelle'], when: (s) => (s.tracks.fome ?? 0) >= 1, lines: ['Você não apareceu à mesa. Um rei magro parece um rei doente.', 'Coma alguma coisa antes de decidir o destino de alguém, meu filho.'] },
  { who: ['pimenta'], when: (s) => (s.tracks.fome ?? 0) >= 2, lines: ['Majestade, sua barriga ronca mais alto que o Brandt!'] },
  // ---------- guerra ----------
  { who: ['aurelian', 'sentinela', 'pajem'], when: (s) => !!s.war && !s.war.result, lines: ['Chegou mais um corvo da fronteira, Majestade.', 'Os homens perguntam se o rei vai ao acampamento.', 'Dizem que o inimigo avançou mais um vale.'] },
  { who: [...COZ], when: (s) => !!s.war && !s.war.result, lines: ['Metade do nosso pão vai para o quartel agora.', 'Meu sobrinho foi convocado. Que Deus o traga de volta.'] },
  { who: ['aurelian'], when: (s) => s.res.moral < 35, lines: ['A moral está no chão, Majestade. Os homens não dormem de estômago vazio.'] },
  { who: ['aurelian'], when: f('promessaReduzir'), lines: ['Os homens perguntam quando serão dispensados, como o senhor prometeu.'] },
  // ---------- povo e tesouro ----------
  { who: ['criada', 'cozinheira', 'clara'], when: (s) => s.res.povo < 40, lines: ['Na feira dizem que o pão subiu de novo...', 'Minha irmã disse que na praça estão cantando coisas feias sobre a coroa.'] },
  { who: ['criada', 'cozinheira', 'jardineiro'], when: (s) => s.res.povo >= 75, lines: ['Na vila só se fala bem do senhor, Majestade.', 'As crianças brincam de ser o rei. Todas querem ser o senhor.'] },
  { who: ['corvin'], when: (s) => s.res.ouro < 150, lines: ['O cofre ecoa, Majestade. Ecoa.', 'Se me permite: cada decisão hoje custa o dobro amanhã.'] },
  { who: ['corvin'], when: (s) => s.res.ouro > 1500, lines: ['Os cofres nunca estiveram tão cheios. Isso atrai ladrões, Majestade. E lordes.'] },
  { who: ['cozinheira'], when: f('monopolioSal'), lines: ['O sal ficou caro depois que os Valmont ficaram com ele. A sopa agora vai mais sem graça.'] },
  { who: ['cozinheiro'], when: f('mesaModesta'), lines: ['Maçã cozida de sobremesa. Os lordes me olham como se eu tivesse matado alguém.'] },
  // ---------- casas ----------
  { who: ['aurelian', 'sentinela'], when: (s) => s.loyalty.drakon < -25, lines: ['Os capitães Drakon andam cochichando no quartel.', 'Um capitão do Vale Rubro recusou uma ordem hoje. Educadamente, mas recusou.'] },
  { who: ['pajem', 'escriba'], when: (s) => s.loyalty.valmont < -25, lines: ['Os mercadores Valmont estão cobrando adiantado de todo mundo no porto.'] },
  { who: ['frei_aske', 'irma'], when: (s) => s.loyalty.seren < -25, lines: ['Os Seren não mandaram as velas da capela este mês. Nem uma.'] },
  { who: ['escriba', 'pajem'], when: (s) => s.loyalty.montclair < -25, lines: ['Chegam menos carroças de ferro das montanhas. Otho diz que é a neve. Não nevou.'] },
  // ---------- humor do rei ----------
  { who: STAFF, when: (s) => s.mood.anger > 55, lines: ['(abaixa a cabeça e sai do caminho do rei)', '(finge estar muito ocupado com a vassoura)'] },
  { who: ['isabelle'], when: (s) => s.mood.stress > 70, lines: ['Você está com a cara do seu pai nos últimos meses. Isso me assusta.'] },
  // ---------- decisões antigas ----------
  { who: [...COZ], when: f('envenenado'), lines: ['Desde aquela noite do vinho, eu mesmo lavo as taças do rei.', 'Ninguém entra nesta cozinha sem eu ver a cara, Majestade.'] },
  { who: ['cozinheiro'], when: f('provadorReal'), lines: ['O Tico está engordando, Majestade. Bom sinal: ninguém tentou nada.'] },
  { who: ['sentinela'], when: f('lysandraPresa'), lines: ['A Lady Cinzel não para de pedir papel e tinta na cela.', 'A presa da cela dois diz que tem um recado para o rei. Só para o rei.'] },
  { who: ['pajem', 'criada'], when: (s) => !!s.flags.cedricInimigo || !!s.flags.cedricLeiContra, lines: ['Nas tavernas brindam a um tal Cedric. Dizem que é filho do rei velho.'] },
  { who: ['isabelle'], when: (s) => !!s.flags.diarioPai || !!s.flags.diarioVisto, lines: ['Você leu o diário do seu pai, não leu? Está na sua cara.'] },
  { who: ['isabelle'], when: f('lucasNaFrente'), lines: ['Não durmo desde que Lucas foi para a frente. Nem uma noite.'] },
  { who: ['aurelian'], when: f('treinouEspada'), lines: ['Continua treinando, Majestade? A guarda notou a diferença.'] },
  { who: ['corvin'], when: f('corvinChantagem'), lines: ['Majestade... sobre aquele assunto da outra noite... nosso acordo continua de pé?'] },
  { who: ['lucas'], when: f('lucasEspiao'), lines: ['(sussurrando) Tenho novidades do quartel. Depois conto.'] },
  { who: ['lucas'], when: f('lucasMissao'), lines: ['Brandt me deu um cavalo! Um cavalo de guerra de verdade!'] },
  { who: ['jardineiro'], when: f('sombraContratada'), lines: ['Tem alguém deixando bilhetes na terceira pedra do jardim, Majestade. Não mexi.'] },
  { who: ['aveline', 'frei_aske'], when: f('promessaBosques'), lines: ['Os Bosques esperam a sua visita, Majestade. Os carvalhos têm memória longa.'] },
  { who: ['frei_aske'], when: f('casoMorgana'), lines: ['(olha para o rei um segundo a mais do que devia) Que Deus o guarde, Majestade. De si mesmo, principalmente.'] },
  { who: STAFF, when: (s) => !!s.spouse && s.day - (s.flags.casamentoDia as number ?? 0) < 4, lines: ['Viva a rainha! Viva o rei!', 'O castelo ainda cheira a flores do casamento.'] },
  // ---------- a rainha ----------
  { who: ['elenora'], when: (s) => s.spouse === 'elenora', lines: ['Encontrei mais três velas contadas duas vezes. Estou de olho em Corvin.', 'Meu pai escreveu de novo. Queimei a carta. De novo.'] },
  { who: ['rhoswen'], when: (s) => s.spouse === 'rhoswen', lines: ['A guarda está mole. Amanhã eu acordo todo mundo às cinco.', 'Quer treinar depois do conselho? Prometo não derrubar você na frente de ninguém.'] },
  { who: ['isolde'], when: (s) => s.spouse === 'isolde', lines: ['Um lorde me elogiou demais hoje. Estou descobrindo o que ele quer.', 'Seu conselho mente com muito menos elegância que o do meu irmão.'] },
  { who: ['sigrid'], when: (s) => s.spouse === 'sigrid', lines: ['Aqui nunca neva de verdade. Sinto falta do silêncio da neve.', 'Os Drakon me olham como se eu fosse um machado na parede. Deixe olharem.'] },
  // ---------- lugares ----------
  { who: COZ, room: ['cozinha'], lines: ['O rei na cozinha! Escondam as tortas!', 'Cuidado com o caldeirão, Majestade, está fervendo desde o amanhecer.', 'Quer provar o molho? Ninguém tem coragem de me dizer se está bom.'] },
  { who: ['criada', 'clara'], room: ['quarto'], lines: ['Já arrumei a cama, Majestade. A lareira acendo ao anoitecer.', '(ajeita um travesseiro que já estava perfeito)'] },
  { who: ['escriba', 'theodric'], room: ['biblioteca', 'arquivos'], lines: ['Silêncio, por favor... ah, é o rei. Silêncio mesmo assim, Majestade.', 'Chegou um volume novo de Véridian. Cheira a mar.'] },
  { who: ['jardineiro'], room: ['jardim'], lines: ['As roseiras do seu pai estão florindo, Majestade.', 'Os cisnes brigaram de novo. O maior sempre ganha. Parece o conselho.'] },
  { who: ['frei_aske', 'irma'], room: ['capela'], lines: ['A casa de Deus está aberta ao rei. E a de confissões também.', 'Acendi uma vela pelo seu pai hoje.'] },
  { who: ['sentinela'], room: ['masmorra'], lines: ['Tudo quieto nas celas, Majestade. Quieto demais.', 'O preso da cela dois canta à noite. Mal.'] },
  { who: ['aurelian'], room: ['patio'], lines: ['Os recrutas melhoraram. Pouco, mas melhoraram.', 'Quer segurar uma espada hoje, Majestade?'] },
  { who: ['pajem'], lines: ['Majestade! Tenho um recado... esqueci qual era. Volto já.', 'Corri o castelo inteiro atrás do senhor!'] },
  { who: ['pimenta'], lines: ['Majestade! Sabe por que o conselho tem cinco cadeiras? Porque seis dava briga!', 'Um rei entrou numa sala... e todos fingiram trabalhar. Fim da piada.'] },
  { who: ['corvin'], lines: ['Majestade. (faz uma reverência e esconde um papel)', 'Os números vão bem. Mais ou menos bem.'] },
  { who: ['aldric'], lines: ['Majestade. Há três assuntos esperando o senhor, e um deles é urgente de verdade.', 'Um bom rei aparece onde não o esperam. Bom dia.'] },
  { who: ['isabelle'], lines: ['Meu filho. Endireite as costas; estão olhando.', 'Você dormiu? Não minta para a sua mãe.'] },
  { who: ['lucas'], lines: ['Irmão! Viu meu falcão? Ele fugiu de novo.', 'Se precisar de alguém para fugir de uma reunião, estou disponível.'] },
  { who: STAFF, lines: ['Majestade.', '(faz uma reverência apressada)', 'Bom dia, Majestade.'] },
];

// Falas para quem está no cômodo em que o rei acabou de entrar (as de situação vêm antes)
export function barkFor(s: GameState, id: string, room: RoomId): string | null {
  const fits = (b: Bark) => (!b.who || b.who.includes(id)) && (!b.room || b.room.includes(room)) && (!b.when || b.when(s));
  const pool = BARKS.filter(fits);
  if (!pool.length) return null;
  const situational = pool.filter((b) => b.when);
  const pick = situational.length && Math.random() < 0.75 ? situational : pool;
  const b = pick[Math.floor(Math.random() * pick.length)];
  const lines = typeof b.lines === 'function' ? b.lines(s) : b.lines;
  return lines[Math.floor(Math.random() * lines.length)] ?? null;
}
