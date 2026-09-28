import type { Choice, GameEvent, GameState } from '../../types';
import { SUITORS, char } from '../characters';
import { MARRIAGE_DEADLINE, clamp } from '../../engine/core';

type Suitor = (typeof SUITORS)[number];

const met = (s: GameState, id: Suitor) => !!s.flags[`met_${id}`];

// Consequências do casamento: nenhuma escolha é gratuita.
export const MARRIAGE_TERMS: Record<Suitor, { bonus: string[]; onus: string[] }> = {
  elenora: {
    bonus: ['Dote de 800 de ouro', 'Casa Valmont +30', 'Comércio marítimo fortalecido'],
    onus: ['Casa Drakon −20 (sentem-se preteridos)', 'Casa Montclair −10', 'Nenhum aliado estrangeiro contra Norhelm'],
  },
  rhoswen: {
    bonus: ['Casa Drakon +35 e tropas dobradas na guerra', '+300 soldados no exército real', 'Moral das tropas +15'],
    onus: ['Casa Valmont −20', 'Casa Seren −10', 'Os Drakon ficam perigosamente poderosos'],
  },
  isolde: {
    bonus: ['Aliança com Véridian (+8 tropas na guerra)', 'Exportações ao sul rendem o dobro', 'Dote de 500 de ouro'],
    onus: ['Todas as casas −10 (rainha estrangeira)', 'Casa Seren −15 extra (outra fé)', 'Apoio do Povo −5'],
  },
  sigrid: {
    bonus: ['Paz com Norhelm: a invasão não acontece', 'Prestígio +5 como pacificador', 'Tributo do norte'],
    onus: ['Casa Drakon −35 (sangraram contra Norhelm)', 'Demais casas −10', 'Apoio do Povo −10'],
  },
};

export function marry(s: GameState, id: Suitor, hasty = false) {
  if (s.day < MARRIAGE_DEADLINE) throw new Error('O casamento real só pode acontecer a partir do Dia 20.');
  s.spouse = id;
  s.flags.casado = true;
  s.flags.noiva = id;
  s.flags.companion = id;
  const L = s.loyalty;
  const add = (h: keyof typeof L, v: number) => (L[h] = clamp(L[h] + v, -100, 100));
  switch (id) {
    case 'elenora':
      s.res.ouro += 800;
      add('valmont', 30); add('drakon', -20); add('montclair', -10);
      break;
    case 'rhoswen':
      add('drakon', 35); add('valmont', -20); add('seren', -10);
      s.res.exercito += 300;
      s.res.moral = clamp(s.res.moral + 15, 0, 100);
      break;
    case 'isolde':
      s.res.ouro += 500;
      add('valmont', -10); add('drakon', -10); add('seren', -25); add('montclair', -10);
      s.res.povo = clamp(s.res.povo - 5, 0, 100);
      break;
    case 'sigrid':
      add('drakon', -35); add('valmont', -10); add('seren', -10); add('montclair', -10);
      s.res.povo = clamp(s.res.povo - 10, 0, 100);
      s.res.prestigio = clamp(s.res.prestigio + 5, 0, 100);
      s.flags.pazNorhelm = true;
      break;
  }
  if (hasty) s.res.prestigio = clamp(s.res.prestigio - 10, 0, 100);
  s.rel[id] = clamp((s.rel[id] ?? 0) + 20, -100, 100);
  s.log.push({ icon: 'coracao', title: 'Casamento Real', text: `O rei ${s.kingName} desposou ${char(id).name}. ${hasty ? 'A pressa da decisão foi notada pelos lordes.' : 'Os sinos tocaram por todo o reino.'}`, tone: 'bom' });
}

const SUITOR_COLORS: Record<Suitor, 'azul' | 'vermelho' | 'verde' | 'roxo'> = { elenora: 'azul', rhoswen: 'vermelho', isolde: 'verde', sigrid: 'roxo' };

function proposeChoices(hasty: boolean): Choice[] {
  return SUITORS.map((id) => ({
    label: char(id).name.replace('Lady ', '').replace('Princesa ', ''),
    sub: MARRIAGE_TERMS[id].bonus[0],
    color: SUITOR_COLORS[id],
    icon: 'coracao',
    req: { test: (st: GameState) => met(st, id), label: 'Você ainda não a conheceu' },
    effects: hasty ? { run: (st: GameState) => marry(st, id, true), xp: 30 } : { flags: { noiva: id }, rel: { [id]: 15 }, xp: 20 },
    reply: hasty ? 'O conselho aplaude, ainda que alguns lordes troquem olhares desconfiados.' : `O noivado com ${char(id).name} será anunciado. O casamento acontecerá no Dia 20.`,
  }));
}

export const MARRIAGE_EVENTS: GameEvent[] = [
  // ================= ELENORA VALMONT =================
  {
    id: 'elenora_1', speaker: 'elenora', topic: 'Proposta de aliança', kind: 'casamento', day: 2, lasts: 2,
    nodes: {
      start: {
        text: 'Majestade, minha casa oferece mais que um matrimônio. Oferecemos um futuro de prosperidade entre nossos reinos.',
        advice: {
          aldric: { text: 'Aldric sussurra: "Os Valmont devem à coroa desde a guerra do seu avô. Um bom momento para lembrá-los, com gentileza."', choice: { label: 'Lembrar a velha dívida', sub: 'Sugestão do Chanceler', color: 'dourado', icon: 'pergaminho', effects: { res: { ouro: 300 }, rel: { elenora: -4, aldric: 6 }, flags: { met_elenora: true }, schedule: [{ id: 'elenora_2', in: 4 }], xp: 10 }, reply: 'Elenora engole em seco. "Meu pai pagará, Majestade. Com juros, se for preciso." Ela sai mais séria do que entrou.' } },
        },
        choices: [
          { label: 'Apoiar a aliança', sub: 'Fortalece relações', color: 'azul', icon: 'aperto', effects: { rel: { elenora: 8 }, flags: { met_elenora: true } }, goto: 'alianca' },
          { label: 'Fazer uma pergunta astuta', sub: 'Descobrir suas intenções', color: 'dourado', icon: 'balao', effects: { flags: { met_elenora: true } }, goto: 'astuta' },
          { label: 'Definir condições', sub: 'Mostrar autoridade', color: 'vermelho', icon: 'coroa', effects: { rel: { elenora: -4 }, res: { prestigio: 2 }, flags: { met_elenora: true } }, goto: 'condicoes' },
          { label: 'Arriscar', sub: 'Um acordo mais ousado', color: 'roxo', icon: 'mascara', effects: { flags: { met_elenora: true } }, goto: 'ousado' },
        ],
      },
      alianca: {
        text: 'Ela sorri, aliviada. "Então Vossa Majestade não me vê apenas como um contrato." Ela hesita. "Posso perguntar... o senhor queria ser rei?"',
        choices: [
          { label: 'Não. Mas agora sou', sub: 'Sinceridade', color: 'verde', icon: 'coracao', effects: { rel: { elenora: 14 }, schedule: [{ id: 'elenora_2', in: 4 }], xp: 12 }, reply: '"Eu também não queria ser moeda de troca", ela diz baixinho. "Parece que temos algo em comum."' },
          { label: 'Nasci para isso', sub: 'Confiança', color: 'azul', icon: 'coroa', effects: { rel: { elenora: 5 }, res: { prestigio: 2 }, loyalty: { valmont: 4 }, schedule: [{ id: 'elenora_2', in: 4 }], xp: 10 }, reply: 'Ela assente, impressionada, mas algo em seus olhos se fecha um pouco.' },
          { label: 'Mudar de assunto', sub: 'Guardar-se', color: 'dourado', icon: 'escudo', effects: { rel: { elenora: -2 }, schedule: [{ id: 'elenora_2', in: 5 }], xp: 6 }, reply: '"Claro, Majestade. Perdoe minha ousadia." A cortesia volta a ser só cortesia.' },
        ],
      },
      astuta: {
        text: 'Ela abaixa a voz. "Sinceramente? Meu pai quer o monopólio do sal na Costa Serena. Eu... quero apenas não ser uma moeda de troca."',
        choices: [
          { label: 'Prometer o monopólio', sub: 'Agradar os Valmont', color: 'azul', icon: 'moedas', effects: { loyalty: { valmont: 12, drakon: -5 }, rel: { elenora: 3, gaspard: 15 }, flags: { monopolioSal: true }, schedule: [{ id: 'elenora_2', in: 4 }], xp: 10 }, reply: '"Meu pai ficará radiante." Ela diz isso sem nenhuma alegria.' },
          { label: 'Então não seja uma', sub: 'Falar com o coração', color: 'verde', icon: 'coracao', goto: 'coracao' },
          { label: 'Citar as dívidas dos Valmont', sub: 'Exige Tratado das Casas', color: 'vermelho', icon: 'livro', req: { knowledge: 'linhagens' }, effects: { loyalty: { valmont: 5 }, res: { ouro: 400, prestigio: 4 }, schedule: [{ id: 'elenora_2', in: 4 }], xp: 20 }, reply: 'Ela empalidece. "O senhor conhece a história da minha família melhor que eu. Meu pai pagará."' },
        ],
      },
      coracao: {
        text: '"Não ser uma?" Ela ri, surpresa. "Majestade, eu nasci filha de Gaspard Valmont. Sou uma moeda desde o berço. O que o senhor propõe?"',
        choices: [
          { label: 'Que você escolha também', sub: 'Igualdade', color: 'verde', icon: 'aperto', effects: { rel: { elenora: 22 }, schedule: [{ id: 'elenora_2', in: 4 }], xp: 15 }, reply: 'Por um longo instante ela não diz nada. Depois, com a voz trêmula: "Ninguém nunca me ofereceu isso."' },
          { label: 'Que confie em mim', sub: 'Promessa', color: 'azul', icon: 'escudo', effects: { rel: { elenora: 12 }, loyalty: { valmont: 3 }, schedule: [{ id: 'elenora_2', in: 4 }], xp: 12 }, reply: '"Confiança se constrói, Majestade. Mas é um bom começo."' },
        ],
      },
      condicoes: {
        text: '"Condições, Majestade?" Ela ergue uma sobrancelha. "A Casa Valmont sabe negociar. Diga as suas."',
        choices: [
          { label: 'Um dote de mil moedas', sub: 'Ouro', color: 'dourado', icon: 'moedas', effects: { flags: { elenoraCondicoes: true, doteValmont: true }, rel: { elenora: -4, gaspard: -6 }, schedule: [{ id: 'elenora_2', in: 4 }], xp: 10 }, reply: '"Mil? Meu pai vai gritar. E vai pagar." Ela sai calculando.' },
          { label: 'A frota Valmont a serviço da coroa', sub: 'Poder naval', color: 'azul', icon: 'aperto', effects: { flags: { elenoraCondicoes: true, frotaValmont: true }, loyalty: { valmont: -4 }, res: { prestigio: 3 }, schedule: [{ id: 'elenora_2', in: 4 }], xp: 10 }, reply: '"A frota inteira? O senhor não pede pouco." Um meio sorriso: "Gosto disso."' },
          { label: 'Que ela fale por si, não pelo pai', sub: 'Teste de caráter', color: 'verde', icon: 'olho', goto: 'coracao' },
        ],
      },
      ousado: {
        text: 'Você propõe que os Valmont financiem a guarda real como prova de boa-fé, antes de qualquer noivado. Ela hesita. "Isso seria... incomum. E caro."',
        choices: [
          { label: 'Insistir', sub: '+250 ouro agora', color: 'roxo', icon: 'moedas', effects: { res: { ouro: 250 }, loyalty: { valmont: -5 }, rel: { elenora: 4 }, schedule: [{ id: 'elenora_2', in: 4 }], xp: 10 }, reply: 'Ela assina a promissória com letra firme. "Espero que valha cada moeda, Majestade."' },
          { label: 'Era só um teste', sub: 'Sorrir', color: 'azul', icon: 'balao', effects: { rel: { elenora: 8 }, schedule: [{ id: 'elenora_2', in: 4 }], xp: 10 }, reply: 'Ela ri, genuinamente. "Um rei com senso de humor. Que raro."' },
        ],
      },
    },
    ignored: { text: 'Lady Elenora esperou o dia inteiro no salão e partiu humilhada.', rel: { elenora: -12, gaspard: -8 }, loyalty: { valmont: -8 }, flags: { met_elenora: true }, schedule: [{ id: 'elenora_2', in: 5 }] },
  },
  {
    id: 'elenora_2', speaker: 'elenora', topic: 'Um passeio nos jardins', kind: 'casamento', lasts: 3,
    nodes: {
      start: {
        text: (s) => `${s.flags.elenoraCondicoes ? 'Ainda penso nas suas condições, Majestade. ' : ''}Os jardins de Castelmar são lindos no outono. Na Costa Serena só temos o mar... e as ambições do meu pai. Posso ser franca? Temo que os Drakon nunca aceitem uma rainha Valmont.`,
        advice: {
          isabelle: { text: 'Isabelle, que acompanha o passeio a certa distância, se aproxima: "Deixe os Drakon comigo, querida. Brandt me deve favores antigos."', choice: { label: 'Aceitar a ajuda da mãe', sub: 'Isabelle acalma os Drakon', color: 'azul', icon: 'coroa', effects: { loyalty: { drakon: 6 }, rel: { elenora: 10, isabelle: 8 }, flags: { maeInfluencia: 1 }, schedule: [{ id: 'cortejo_elenora', in: 3 }], xp: 10 }, reply: 'Elenora olha para Isabelle com gratidão, e você percebe que sua mãe acabou de escolher uma nora.' } },
        },
        choices: [
          { label: 'Eu protegerei você', sub: 'Promessa pessoal', color: 'azul', icon: 'escudo', effects: { rel: { elenora: 8 } }, goto: 'protege' },
          { label: 'Drakon aprenderá', sub: 'A coroa decide', color: 'vermelho', icon: 'coroa', effects: { rel: { elenora: 4 }, loyalty: { drakon: -4 }, res: { prestigio: 2 } }, goto: 'firmeza' },
          { label: 'Ofereça paz a Drakon', sub: '−150 ouro em presentes', color: 'dourado', icon: 'moedas', req: { ouro: 150 }, effects: { res: { ouro: -150 }, loyalty: { drakon: 6 }, rel: { elenora: 10 }, schedule: [{ id: 'cortejo_elenora', in: 3 }], xp: 10 }, reply: '"O senhor pensa como um rei de verdade", ela diz, surpresa.' },
          { label: 'Mudar de assunto', sub: 'Manter distância', color: 'roxo', icon: 'mascara', effects: { rel: { elenora: -5 }, schedule: [{ id: 'cortejo_elenora', in: 4 }], xp: 5 }, reply: 'O resto do passeio é só sobre flores. Mais tarde, ela manda um convite escrito: "Podemos tentar falar de algo menos insuportável?"' },
        ],
      },
      protege: {
        text: 'Ela para diante de uma roseira. "E quem protege o senhor, Majestade? Vejo como os lordes olham para o trono. Como lobos olhando uma ovelha."',
        choices: [
          { label: 'Talvez você', sub: 'Confiar nela', color: 'verde', icon: 'coracao', effects: { rel: { elenora: 12 }, schedule: [{ id: 'cortejo_elenora', in: 3 }], xp: 12 }, reply: 'Ela segura sua mão por um instante a mais que o protocolo permite. "Talvez."' },
          { label: 'Eu mesmo', sub: 'Orgulho', color: 'vermelho', icon: 'espadas', effects: { rel: { elenora: 3 }, res: { prestigio: 1 }, schedule: [{ id: 'cortejo_elenora', in: 3 }], xp: 8 }, reply: '"Coragem não falta ao senhor", ela diz. "Espero que prudência também não."' },
        ],
      },
      firmeza: {
        text: '"Aprenderá?" Ela cruza os braços. "Brandt Drakon tem novecentas lanças e uma memória longa. O senhor tem certeza de que quer esse inimigo por minha causa?"',
        choices: [
          { label: 'Por você, sim', sub: 'Galanteio perigoso', color: 'roxo', icon: 'coracao', effects: { rel: { elenora: 14 }, loyalty: { drakon: -4 }, schedule: [{ id: 'cortejo_elenora', in: 3 }], xp: 10 }, reply: 'Ela enrubesce e não consegue esconder o sorriso. Um lorde Drakon que passava pelo jardim também ouviu.' },
          { label: 'Vou negociar com ele', sub: 'Recuar com elegância', color: 'azul', icon: 'aperto', effects: { rel: { elenora: 6 }, loyalty: { drakon: 3 }, schedule: [{ id: 'cortejo_elenora', in: 3 }], xp: 10 }, reply: '"Sábio", ela diz. E parece aliviada de verdade.' },
        ],
      },
    },
    ignored: { text: 'Elenora passeou sozinha pelos jardins.', rel: { elenora: -8 }, schedule: [{ id: 'cortejo_elenora', in: 4 }] },
  },
  {
    id: 'pedido_elenora', speaker: 'elenora', topic: 'O momento da decisão', kind: 'casamento', lasts: 3, cond: (s) => !s.flags.noiva,
    nodes: {
      start: {
        text: (s) => s.flags.elenoraAutonomia
          ? 'Meu pai exige uma resposta. Pela primeira vez, vou dar a minha antes da dele: quero ficar. Agora diga se está me oferecendo uma vida ao seu lado ou apenas um lugar na mesa dos Valmont.'
          : 'Majestade, meu pai exige uma resposta. Eu também. Depois da nossa conversa, não aceito que esconda sua vontade atrás de um tratado.',
        choices: [
          { label: 'Pedir sua mão', sub: 'Noivado com Elenora', color: 'azul', icon: 'coracao', goto: 'sim' },
          { label: 'Pedir mais tempo', sub: 'Ainda não decidi', color: 'dourado', icon: 'ampulheta', effects: { rel: { elenora: -6 } }, reply: '"O tempo, Majestade, é a única coisa que nenhum de nós tem."' },
          { label: 'Recusar com gentileza', sub: 'Encerrar o cortejo', color: 'vermelho', icon: 'selo', effects: { rel: { elenora: -20, gaspard: -15 }, loyalty: { valmont: -12 } }, reply: 'Ela faz uma reverência perfeita e sai sem olhar para trás. Só no corredor as mãos dela tremem.' },
        ],
      },
      sim: {
        text: (s) => s.flags.elenoraBeijo
          ? '"Sim", ela diz, lembrando a cozinha. "Mas desta vez vou avisar meu pai depois de provar a sobremesa. Ele já estragou jantares suficientes." Ela beija sua mão e pergunta onde anunciarão.'
          : '"Sim, se a escolha também for minha." Ela respira fundo. "Meu pai vai querer um banquete em Costa Serena, sua presença e promessas que eu não fiz. Onde anunciaremos?"',
        choices: [
          { label: 'Faremos do jeito dele', sub: 'Agradar os Valmont', color: 'azul', icon: 'aperto', effects: { flags: { noiva: 'elenora' }, rel: { elenora: 15, gaspard: 15 }, loyalty: { valmont: 14 }, res: { ouro: -100 }, xp: 20 }, reply: 'Gaspard Valmont organiza o banquete mais caro da década. Metade do reino fala disso.' },
          { label: 'Anunciaremos aqui, na capital', sub: 'O rei decide', color: 'vermelho', icon: 'coroa', effects: { flags: { noiva: 'elenora' }, rel: { elenora: 20, gaspard: -5 }, loyalty: { valmont: 6 }, res: { prestigio: 4 }, xp: 20 }, reply: 'Elenora sorri: "Eu esperava que o senhor dissesse isso."' },
        ],
      },
    },
  },

  // ================= RHOSWEN DRAKON =================
  {
    id: 'rhoswen_1', speaker: 'rhoswen', topic: 'A filha da muralha', kind: 'casamento', day: 3, lasts: 2,
    nodes: {
      start: {
        text: 'Não sei dançar nem bordar, Majestade. Sei cavalgar, lutar e segurar uma muralha. Meu pai diz que o reino precisa de uma rainha que não trema quando Norhelm vier. Ele tem razão.',
        advice: {
          isabelle: { text: 'Isabelle, gelada: "Uma rainha de armadura? Seu pai se reviraria no túmulo. Seja educado, e só."', choice: { label: 'Ser apenas protocolar', sub: 'A mãe aprova', color: 'dourado', icon: 'escudo', effects: { rel: { rhoswen: -10, isabelle: 8 }, flags: { met_rhoswen: true }, schedule: [{ id: 'rhoswen_2', in: 5 }], xp: 6 }, reply: 'Rhoswen percebe o frio e responde com mais frio. "Entendido, Majestade."' } },
          aldric: { text: 'Aldric: "Os Drakon guardam a fronteira. Uma aliança com eles seria... útil, se Norhelm vier."', choice: { label: 'Falar de estratégia', sub: 'Conselho do Chanceler', color: 'azul', icon: 'olho', effects: { rel: { rhoswen: 10, aldric: 4 }, loyalty: { drakon: 4 }, flags: { met_rhoswen: true }, schedule: [{ id: 'rhoswen_2', in: 4 }], xp: 10 }, reply: 'Rhoswen se anima e fala por meia hora sobre o Passo Cinzento. Ela sabe do que fala.' } },
        },
        choices: [
          { label: 'Admirar sua coragem', sub: 'Respeito mútuo', color: 'vermelho', icon: 'espadas', effects: { rel: { rhoswen: 8 }, loyalty: { drakon: 4 }, flags: { met_rhoswen: true } }, goto: 'coragem' },
          { label: 'Perguntar o que ela quer', sub: 'Não o que o pai quer', color: 'dourado', icon: 'balao', effects: { flags: { met_rhoswen: true } }, goto: 'quer' },
          { label: 'Duvidar dos Drakon', sub: 'Mostrar autoridade', color: 'azul', icon: 'coroa', effects: { rel: { rhoswen: -10, brandt: -10 }, loyalty: { drakon: -6 }, res: { prestigio: 3 }, flags: { met_rhoswen: true }, schedule: [{ id: 'rhoswen_2', in: 4 }], xp: 8 }, reply: 'Os olhos âmbar dela endurecem. "Os Drakon sangraram por reis que duvidavam deles. Estamos acostumados."' },
          { label: 'Desafiá-la para um duelo', sub: 'Arriscado e memorável', color: 'roxo', icon: 'mascara', effects: { flags: { met_rhoswen: true } }, goto: 'duelo' },
        ],
      },
      coragem: {
        text: 'Ela ergue o queixo. "Então o jovem rei não é feito de seda." Ela avalia você de cima a baixo. "Sabe segurar uma espada, pelo menos?"',
        choices: [
          { label: 'Mal. Me ensinaria?', sub: 'Humildade', color: 'verde', icon: 'aperto', effects: { rel: { rhoswen: 14 }, schedule: [{ id: 'rhoswen_2', in: 4 }], xp: 12 }, reply: 'Ela ri alto, um riso de caserna. "Amanhã, ao nascer do sol. Não se atrase."' },
          { label: 'O suficiente', sub: 'Blefe', color: 'vermelho', icon: 'espadas', effects: { rel: { rhoswen: 5 }, res: { prestigio: 1 }, schedule: [{ id: 'rhoswen_2', in: 4 }], xp: 8 }, reply: '"Veremos", ela diz, com um sorriso que promete um teste.' },
        ],
      },
      quer: {
        text: 'Silêncio. "Ninguém nunca me perguntou isso." Ela olha para as próprias mãos calejadas. "Quero comandar, não ser comandada. Uma rainha que só serve para ter herdeiros... prefiro a fronteira."',
        choices: [
          { label: 'Você comandaria a cavalaria', sub: 'Promessa real', color: 'vermelho', icon: 'espadas', effects: { rel: { rhoswen: 20 }, loyalty: { drakon: 5 }, flags: { promessaCavalaria: true }, schedule: [{ id: 'rhoswen_2', in: 4 }], xp: 15 }, reply: '"O senhor diz isso agora." Ela o encara. "Vou cobrar."' },
          { label: 'Rainhas também governam', sub: 'Visão', color: 'azul', icon: 'coroa', effects: { rel: { rhoswen: 12 }, schedule: [{ id: 'rhoswen_2', in: 4 }], xp: 12 }, reply: 'Ela pensa nisso por um longo tempo. "Talvez. Com o rei certo."' },
          { label: 'Isso não cabe a uma rainha', sub: 'Tradição', color: 'dourado', icon: 'escudo', effects: { rel: { rhoswen: -12, isabelle: 5 }, schedule: [{ id: 'rhoswen_2', in: 5 }], xp: 6 }, reply: '"Então talvez eu não caiba no seu reino, Majestade."' },
        ],
      },
      duelo: {
        text: 'No pátio, espadas de treino. Ela luta como um vendaval. Você cai duas vezes... e na terceira, ela hesita. De propósito?',
        choices: [
          { label: 'Aceitar a derrota', sub: 'Humildade', color: 'verde', icon: 'aperto', effects: { rel: { rhoswen: 12 }, res: { prestigio: -2, moral: 5 } }, goto: 'depois' },
          { label: 'Aproveitar a brecha', sub: 'Vencer a qualquer custo', color: 'vermelho', icon: 'espadas', effects: { rel: { rhoswen: 3 }, res: { prestigio: 4, moral: 3 }, schedule: [{ id: 'rhoswen_2', in: 4 }], xp: 12 }, reply: 'Você a derruba. Os soldados aplaudem. Ela se levanta sem sorrir: "Um rei que aceita vitórias dadas. Anotado."' },
        ],
      },
      depois: {
        text: 'Ela estende a mão para ajudá-lo a levantar. "Por que não aproveitou? Eu abri a guarda."',
        choices: [
          { label: 'Porque foi de propósito', sub: 'Você percebeu', color: 'dourado', icon: 'olho', effects: { rel: { rhoswen: 12 }, schedule: [{ id: 'rhoswen_2', in: 4 }], xp: 14 }, reply: 'Ela fica vermelha pela primeira vez. "Ninguém nunca percebeu."' },
          { label: 'Não quero vitórias falsas', sub: 'Honra', color: 'azul', icon: 'escudo', effects: { rel: { rhoswen: 10 }, loyalty: { drakon: 4 }, schedule: [{ id: 'rhoswen_2', in: 4 }], xp: 12 }, reply: '"Honra." Ela assente devagar. "Meu pai vai gostar de ouvir isso."' },
        ],
      },
    },
    ignored: { text: 'Lady Rhoswen voltou ao Vale Rubro dizendo que o rei tem medo de mulheres armadas.', rel: { rhoswen: -10, brandt: -10 }, loyalty: { drakon: -8 }, flags: { met_rhoswen: true }, schedule: [{ id: 'rhoswen_2', in: 5 }] },
  },
  {
    id: 'rhoswen_2', speaker: 'rhoswen', topic: 'Relatório da fronteira', kind: 'casamento', lasts: 3,
    nodes: {
      start: {
        text: 'Trouxe notícias do Vale Rubro. Batedores de Norhelm rondam o Passo Cinzento. Meu pai quer levar mil homens para a fronteira, mas precisa de ouro. Eu digo: dê-me cem cavaleiros e eu vigio o passo.',
        choices: [
          { label: 'Dar os cavaleiros a ela', sub: 'Confiança', color: 'vermelho', icon: 'espadas', effects: { rel: { rhoswen: 8 }, res: { exercito: -100 }, flags: { rhoswenPasso: true } }, goto: 'cavaleiros' },
          { label: 'Financiar Lorde Brandt', sub: '300 de ouro', color: 'dourado', icon: 'moedas', req: { ouro: 300 }, effects: { res: { ouro: -300 }, loyalty: { drakon: 12 }, rel: { brandt: 10, rhoswen: 5 }, schedule: [{ id: 'cortejo_rhoswen', in: 3 }], xp: 10 }, reply: '"Meu pai vai ficar feliz." Ela não parece tão feliz quanto ele ficará.' },
          { label: 'Estudar o passo com ela', sub: 'Exige A Arte da Muralha', color: 'roxo', icon: 'livro', req: { knowledge: 'tatica' }, effects: { rel: { rhoswen: 20 }, flags: { passoFortificado: true }, schedule: [{ id: 'cortejo_rhoswen', in: 3 }], xp: 20 }, reply: 'Vocês passam horas sobre o mapa. "Seu bisavô escreveu isso? Então o sangue dele ainda corre."' },
          { label: 'A fronteira pode esperar', sub: 'Poupar recursos', color: 'azul', icon: 'escudo', effects: { rel: { rhoswen: -6 }, loyalty: { drakon: -3 } }, goto: 'espera' },
        ],
      },
      cavaleiros: {
        text: '"Não vou decepcioná-lo." Ela para na porta. "Uma coisa, Majestade: se eu cair lá, não deixe meu pai usar minha morte como desculpa para nada."',
        choices: [
          { label: 'Você não vai cair', sub: 'Confiança', color: 'verde', icon: 'coracao', effects: { rel: { rhoswen: 10 }, schedule: [{ id: 'cortejo_rhoswen', in: 3 }], xp: 12 }, reply: 'Ela sorri de verdade pela primeira vez. "Não pretendo."' },
          { label: 'Eu prometo', sub: 'Juramento', color: 'azul', icon: 'escudo', effects: { rel: { rhoswen: 8 }, res: { prestigio: 2 }, schedule: [{ id: 'cortejo_rhoswen', in: 3 }], xp: 12 }, reply: '"Palavra de rei." Ela bate o punho no peito, como um soldado.' },
        ],
      },
      espera: {
        text: '"Esperar?" Ela bate a lança no chão. "Norhelm não espera. Quando eles descerem, vão perguntar onde estava o rei."',
        choices: [
          { label: 'Então vá com vinte homens', sub: 'Meio-termo', color: 'dourado', icon: 'aperto', effects: { rel: { rhoswen: 6 }, res: { exercito: -20 }, schedule: [{ id: 'cortejo_rhoswen', in: 4 }], xp: 8 }, reply: '"Vinte. Serão os vinte melhores do reino."' },
          { label: 'Não questione o rei', sub: 'Autoridade', color: 'vermelho', icon: 'coroa', effects: { rel: { rhoswen: -10, brandt: -6 }, res: { prestigio: 2 }, schedule: [{ id: 'cortejo_rhoswen', in: 4 }], xp: 5 }, reply: 'Ela faz uma reverência rígida e sai. No dia seguinte, duas espadas de madeira aparecem à sua porta.' },
        ],
      },
    },
    ignored: { text: 'Rhoswen partiu para a fronteira sem sua resposta.', rel: { rhoswen: -8 }, loyalty: { drakon: -4 }, schedule: [{ id: 'cortejo_rhoswen', in: 4 }] },
  },
  {
    id: 'pedido_rhoswen', speaker: 'rhoswen', topic: 'Uma pergunta direta', kind: 'casamento', lasts: 3, cond: (s) => !s.flags.noiva,
    nodes: {
      start: {
        text: (s) => s.flags.rhoswenIgual
          ? '"Você não me deixou no chão do pátio. Não me tratou como prêmio." Rhoswen aperta a própria luva. "Então vou perguntar sem armadura: quer construir este reino comigo?"'
          : '"Sou ruim com rodeios, Majestade. Você já sabe que posso vencer você num duelo. Agora quero saber se conseguiríamos ficar do mesmo lado quando a guerra acabar."',
        choices: [
          { label: 'Pedir sua mão', sub: 'Noivado com Rhoswen', color: 'vermelho', icon: 'coracao', goto: 'sim' },
          { label: 'Isso é uma ameaça?', sub: 'Testá-la', color: 'dourado', icon: 'olho', goto: 'ameaca' },
          { label: 'Recusar', sub: 'Encerrar o cortejo', color: 'azul', icon: 'selo', effects: { rel: { rhoswen: -20, brandt: -20 }, loyalty: { drakon: -15 } }, reply: '"Entendido." Uma palavra só. O Vale Rubro vai ouvir essa palavra por muito tempo.' },
        ],
      },
      ameaca: {
        text: '"Ameaça?" Ela ri, sem humor. "É a verdade. Meu pai é leal à coroa enquanto a coroa é leal a nós. Eu seria a prova disso."',
        choices: [
          { label: 'Então seja a prova', sub: 'Noivado', color: 'vermelho', icon: 'coracao', goto: 'sim' },
          { label: 'Preciso de tempo', sub: 'Arriscado', color: 'dourado', icon: 'ampulheta', effects: { rel: { rhoswen: -8 }, loyalty: { drakon: -4 } }, reply: '"Tempo." Ela diz a palavra como se fosse um palavrão.' },
        ],
      },
      sim: {
        text: (s) => s.flags.rhoswenBeijo
          ? '"Sim." Ela o puxa pelo colarinho e sorri perto do seu rosto. "Uma condição: no casamento entro de armadura. E se alguém protestar, você explica por que nunca conseguiu me desarmar de verdade."'
          : 'Ela ajoelha como um cavaleiro e depois ri do próprio gesto. "Força do hábito." Levanta-se. "Uma condição, Majestade: no casamento, eu entro de armadura."',
        choices: [
          { label: 'De armadura, então', sub: 'Escândalo na corte', color: 'vermelho', icon: 'espadas', effects: { flags: { noiva: 'rhoswen' }, rel: { rhoswen: 22, brandt: 20, isabelle: -10 }, loyalty: { drakon: 14 }, res: { moral: 6 }, xp: 20 }, reply: 'Os soldados comemoram nos quartéis. Na corte, as damas desmaiam de indignação.' },
          { label: 'De vestido, por favor', sub: 'Tradição', color: 'azul', icon: 'coroa', effects: { flags: { noiva: 'rhoswen' }, rel: { rhoswen: 10, brandt: 18, isabelle: 5 }, loyalty: { drakon: 12 }, xp: 20 }, reply: '"Por você", ela diz, fazendo careta. "Só por você."' },
        ],
      },
    },
  },

  // ================= ISOLDE VÉRIDIAN =================
  {
    id: 'isolde_1', speaker: 'isolde', topic: 'Uma aliança do sul', kind: 'casamento', day: 4, lasts: 2,
    nodes: {
      start: {
        text: 'Majestade, uma aliança entre nossos sangues não é apenas um matrimônio. É a chave para rotas, riquezas... e inimigos em comum. Juntos, podemos mudar o equilíbrio do reino.',
        advice: {
          isabelle: { text: 'Isabelle, entre dentes: "Uma estrangeira de outra fé. Os Seren nunca aceitarão. Nem eu."', choice: { label: 'Mostrar que a corte desconfia', sub: 'A mãe aprova', color: 'dourado', icon: 'escudo', effects: { rel: { isolde: -12, isabelle: 8, aveline: 4 }, loyalty: { seren: 4 }, flags: { met_isolde: true }, schedule: [{ id: 'isolde_2', in: 5 }], xp: 6 }, reply: 'Isolde sorri como quem já esperava por isso. "A rainha-mãe me odeia. Anotado."' } },
          aldric: { text: 'Aldric: "Véridian tem a maior frota do mar do sul. Pergunte o que eles querem em troca, Majestade."', choice: { label: 'Perguntar o preço', sub: 'Sugestão do Chanceler', color: 'azul', icon: 'olho', effects: { rel: { aldric: 4 }, flags: { met_isolde: true } }, goto: 'preco' } },
        },
        choices: [
          { label: 'Flertar', sub: 'Ver suas verdadeiras intenções', color: 'verde', icon: 'mascara', effects: { rel: { isolde: 8 }, flags: { met_isolde: true } }, goto: 'flerte' },
          { label: 'Aceitar', sub: 'Honrar a aliança', color: 'dourado', icon: 'aperto', effects: { rel: { isolde: 10 }, loyalty: { seren: -4 }, res: { ouro: 200 }, flags: { met_isolde: true }, schedule: [{ id: 'isolde_2', in: 4 }], xp: 10 }, reply: 'Um baú de presentes do sul chega ao tesouro. Os lordes murmuram.' },
          { label: 'Questionar', sub: 'Qual o preço oculto?', color: 'vermelho', icon: 'olho', effects: { flags: { met_isolde: true } }, goto: 'preco' },
          { label: 'Propor mais', sub: 'Exigir concessões', color: 'roxo', icon: 'coroa', effects: { flags: { met_isolde: true, isoldeConcessoes: true }, res: { prestigio: 2 } }, goto: 'mais' },
        ],
      },
      flerte: {
        text: 'Ela fecha o leque devagar. "Cuidado, Majestade. Eu também sei jogar." Um passo mais perto. "Diga-me: o senhor joga para ganhar ou para se divertir?"',
        choices: [
          { label: 'Para ganhar', sub: 'Ambição', color: 'vermelho', icon: 'coroa', effects: { rel: { isolde: 12 }, res: { prestigio: 1 }, schedule: [{ id: 'isolde_2', in: 4 }], xp: 10 }, reply: '"Então somos parecidos." Ela sorri como uma raposa.' },
          { label: 'Com você, para as duas coisas', sub: 'Charme', color: 'roxo', icon: 'coracao', effects: { rel: { isolde: 16 }, schedule: [{ id: 'isolde_2', in: 4 }], xp: 12 }, reply: 'Ela ri, pega de surpresa. Por um segundo o leque não esconde nada.' },
          { label: 'Não jogo com alianças', sub: 'Seriedade', color: 'azul', icon: 'escudo', effects: { rel: { isolde: 4 }, schedule: [{ id: 'isolde_2', in: 4 }], xp: 8 }, reply: '"Que tédio", ela diz. Mas guarda a informação.' },
        ],
      },
      preco: {
        text: '"Preço? Tudo tem um preço." Ela olha o mapa na parede. "Véridian quer direitos sobre o porto da Costa Serena. Nada que um rei apaixonado negaria."',
        choices: [
          { label: 'Negar o porto', sub: 'Proteger os Valmont', color: 'azul', icon: 'escudo', effects: { rel: { isolde: -4, gaspard: 10 }, loyalty: { valmont: 8 } }, goto: 'negou' },
          { label: 'Considerar o porto', sub: 'Irrita os Valmont', color: 'verde', icon: 'aperto', effects: { rel: { isolde: 15 }, loyalty: { valmont: -8 }, flags: { portoVeridian: true }, schedule: [{ id: 'isolde_2', in: 4 }], xp: 12 }, reply: '"Considerar." Ela saboreia a palavra. "Já é mais do que meu irmão esperava."' },
          { label: 'Falar dos costumes do sul', sub: 'Exige Rotas do Mar do Sul', color: 'dourado', icon: 'livro', req: { knowledge: 'veridian' }, effects: { rel: { isolde: 25 }, schedule: [{ id: 'isolde_2', in: 4 }], xp: 20 }, reply: 'Você a cumprimenta à moda de Véridian. "Você estudou... por mim?" Pela primeira vez, ela parece jovem.' },
        ],
      },
      negou: {
        text: '"Negar." Ela abre o leque de novo. "Corajoso. Tolo, talvez. E se eu dissesse que sem o porto meu irmão não mandará um só navio contra Norhelm?"',
        choices: [
          { label: 'Eu diria que é um blefe', sub: 'Pagar para ver', color: 'vermelho', icon: 'olho', effects: { rel: { isolde: 10 }, res: { prestigio: 2 }, schedule: [{ id: 'isolde_2', in: 4 }], xp: 12 }, reply: 'Um longo silêncio. Depois, um sorriso lento. "Talvez seja. O senhor aprende rápido."' },
          { label: 'Ofereço tarifas menores', sub: 'Contraproposta', color: 'dourado', icon: 'moedas', effects: { rel: { isolde: 8 }, loyalty: { valmont: -2 }, schedule: [{ id: 'isolde_2', in: 4 }], xp: 12 }, reply: '"Um comerciante no trono." Ela aceita discutir. Isso já é uma vitória.' },
        ],
      },
      mais: {
        text: '"Ambicioso. Gosto disso", ela diz, sem sorrir. "O que mais o senhor quer de Véridian?"',
        choices: [
          { label: 'Sua frota contra Norhelm', sub: 'Guerra', color: 'vermelho', icon: 'espadas', effects: { rel: { isolde: 6 }, flags: { frotaVeridian: true }, schedule: [{ id: 'isolde_2', in: 4 }], xp: 10 }, reply: '"Meu irmão ama uma guerra lucrativa. Verei o que posso fazer."' },
          { label: 'Um dote em prata', sub: '+300 ouro', color: 'dourado', icon: 'moedas', effects: { res: { ouro: 300 }, rel: { isolde: -4 }, schedule: [{ id: 'isolde_2', in: 4 }], xp: 10 }, reply: 'A prata chega no dia seguinte. Com ela, uma carta do irmão dela, polida e fria.' },
        ],
      },
    },
    ignored: { text: 'A princesa Isolde considerou a espera um insulto ao seu reino.', rel: { isolde: -15 }, flags: { met_isolde: true }, schedule: [{ id: 'isolde_2', in: 5 }] },
  },
  {
    id: 'isolde_2', speaker: 'isolde', topic: 'Segredos do sul', kind: 'casamento', lasts: 3,
    nodes: {
      start: {
        text: 'Meu irmão, o rei de Véridian, não quer apenas um casamento. Ele quer que Norhelm sangre. Se nos casarmos, nossa frota ataca o norte pelo mar. Mas já espalham na corte que sou herege.',
        choices: [
          { label: 'Quem espalha isso?', sub: 'Investigar', color: 'dourado', icon: 'olho', goto: 'quem' },
          { label: 'Defendê-la publicamente', sub: 'Irrita os Seren', color: 'verde', icon: 'escudo', effects: { rel: { isolde: 18, aveline: -10 }, loyalty: { seren: -8 }, schedule: [{ id: 'cortejo_isolde', in: 3 }], xp: 10 }, reply: '"Ninguém nunca me defendeu em terra estrangeira", ela diz, e parece ter menos armadura.' },
          { label: 'Pedir que respeite a fé local', sub: 'Meio-termo', color: 'azul', icon: 'aperto', effects: { rel: { isolde: 5, aveline: 5 }, loyalty: { seren: 4 }, schedule: [{ id: 'cortejo_isolde', in: 3 }], xp: 10 }, reply: 'Ela assente com um sorriso de diplomata. Nunca se sabe o que há por trás.' },
          { label: 'Duvidar da frota', sub: 'Promessas são baratas', color: 'vermelho', icon: 'olho', effects: { rel: { isolde: -8 }, schedule: [{ id: 'cortejo_isolde', in: 4 }], xp: 5 }, reply: '"Promessas são baratas", ela concorda. "Navios, não. Apareça no baile e me diga isso sem uma mesa entre nós."' },
        ],
      },
      quem: {
        text: '"A Senhora Aveline, dizem. Mas eu não acredito em tudo que dizem." Ela sorri. "Nem o senhor deveria."',
        choices: [
          { label: 'Descobrir a verdade', sub: 'Exige Sussurros da Corte', color: 'roxo', icon: 'livro', req: { knowledge: 'intriga' }, effects: { rel: { isolde: 15 }, flags: { difamadorOtho: true }, loyalty: { montclair: -5 }, schedule: [{ id: 'cortejo_isolde', in: 3 }], xp: 20 }, reply: 'Seus informantes revelam: foi Lorde Otho Montclair quem inventou os boatos, não Aveline.' },
          { label: 'Confrontar Aveline', sub: 'Irrita os Seren', color: 'vermelho', icon: 'espadas', effects: { rel: { isolde: 8, aveline: -12 }, loyalty: { seren: -10 }, schedule: [{ id: 'cortejo_isolde', in: 3 }], xp: 8 }, reply: 'Aveline nega, ofendida. Talvez fosse inocente. Agora não importa.' },
          { label: 'Deixar para lá', sub: 'Prudência', color: 'azul', icon: 'escudo', effects: { rel: { isolde: 2 }, schedule: [{ id: 'cortejo_isolde', in: 3 }], xp: 6 }, reply: 'Ela observa você com atenção. "Prudente. Ou indiferente."' },
        ],
      },
    },
    ignored: { text: 'Isolde escreveu ao irmão que o rei de Castelmar é indeciso.', rel: { isolde: -10 }, schedule: [{ id: 'cortejo_isolde', in: 4 }] },
  },
  {
    id: 'pedido_isolde', speaker: 'isolde', topic: 'O jogo final', kind: 'casamento', lasts: 3, cond: (s) => !s.flags.noiva,
    nodes: {
      start: {
        text: (s) => s.flags.isoldeSemMascara
          ? '"Meus navios partem em três dias." Isolde deixa o leque fechado. "Não vou falar por meu irmão. Falo por mim: ainda quero dançar com você quando ninguém estiver contando os passos. O que quer?"'
          : '"Meus navios partem em três dias, Majestade. Comigo a bordo, ou comigo no seu trono. Desta vez, quero uma resposta sua, não do seu chanceler."',
        choices: [
          { label: 'Pedir sua mão', sub: 'Noivado com Isolde', color: 'verde', icon: 'coracao', goto: 'sim' },
          { label: 'Pedir tempo', sub: 'Arriscado', color: 'dourado', icon: 'ampulheta', effects: { rel: { isolde: -10 } }, reply: '"Tempo é a única coisa que eu não vendo", ela diz, e sai.' },
          { label: 'Recusar', sub: 'Encerrar o cortejo', color: 'vermelho', icon: 'selo', effects: { rel: { isolde: -25 }, res: { prestigio: 2 } }, reply: 'Ela faz uma reverência impecável. "Meu irmão não esquece desfeitas. Eu também não."' },
        ],
      },
      sim: {
        text: (s) => s.flags.isoldeBeijo
          ? '"Xeque-mate", ela diz, mas fecha o leque e o põe de lado. "Meu irmão mandará o contrato. Leia cada linha. Depois me encontre sem máscara, como naquela noite."'
          : 'Ela abre o leque, escondendo um sorriso verdadeiro. "Xeque-mate. Para nós dois." Depois, mais baixo: "Meu irmão mandará o contrato de casamento. Leia cada linha. Eu leria."',
        choices: [
          { label: 'Ler cada linha', sub: 'Desconfiança sábia', color: 'azul', icon: 'pergaminho', effects: { flags: { noiva: 'isolde', contratoLido: true }, rel: { isolde: 18 }, res: { influencia: 3 }, xp: 20 }, reply: 'Você encontra três cláusulas escondidas sobre o porto. Isolde parece orgulhosa de você.' },
          { label: 'Confio em você', sub: 'Aposta', color: 'verde', icon: 'coracao', effects: { flags: { noiva: 'isolde', portoVeridian: true }, rel: { isolde: 25 }, loyalty: { valmont: -6 }, xp: 20 }, reply: '"Não deveria", ela diz, tocando seu rosto. "Mas gosto que confie."' },
        ],
      },
    },
  },

  // ================= SIGRID DE NORHELM =================
  {
    id: 'haakon_proposta', speaker: 'haakon', topic: 'Proposta do inimigo', kind: 'urgente', day: 5, lasts: 1,
    nodes: {
      start: {
        text: 'Rei-menino. Meu senhor, o Rei de Norhelm, oferece a mão de sua filha, a Princesa Sigrid. Case-se com ela e o inverno não descerá sobre Castelmar. Recuse... e contaremos os seus mortos na primavera.',
        advice: {
          aldric: { text: 'Aldric, muito baixo: "Não responda agora. Um emissário que ameaça está com pressa, e quem tem pressa está fraco."', choice: { label: 'Ganhar tempo e observar', sub: 'Conselho do Chanceler', color: 'azul', icon: 'olho', effects: { rel: { aldric: 5, haakon: -3 }, flags: { infoNorhelm: true }, schedule: [{ id: 'sigrid_1', in: 3 }], xp: 12 }, reply: 'Você deixa Haakon falar. Ele fala demais: Norhelm teve uma colheita terrível. Precisam dessa paz tanto quanto você.' } },
          isabelle: { text: 'Isabelle, pálida: "Seu pai morreu com uma flecha do norte no ombro. Nem pense nisso."', choice: { label: 'Recusar em nome do pai', sub: 'A mãe exige', color: 'vermelho', icon: 'espadas', effects: { rel: { haakon: -25, isabelle: 10 }, loyalty: { drakon: 10 }, res: { prestigio: 4 }, flags: { recusouNorhelm: true }, xp: 10 }, reply: '"Diga ao seu rei que o filho do homem que ele matou manda lembranças." O salão explode em vivas.' } },
        },
        choices: [
          { label: 'Receber a princesa', sub: 'Ouvir a proposta', color: 'azul', icon: 'aperto', goto: 'receber' },
          { label: 'Expulsar o emissário', sub: 'Orgulho do reino', color: 'vermelho', icon: 'espadas', effects: { rel: { haakon: -25 }, loyalty: { drakon: 10 }, res: { prestigio: 5, povo: 3 }, flags: { recusouNorhelm: true }, xp: 10 }, reply: '"Então nos veremos no campo de batalha." O salão explode em vivas.' },
          { label: 'Contar os mortos de quem?', sub: 'Provocar', color: 'dourado', icon: 'balao', goto: 'provocar' },
          { label: 'Citar a derrota de 3 invernos', sub: 'Exige Crônicas de Norhelm', color: 'roxo', icon: 'livro', req: { knowledge: 'norhelm' }, effects: { rel: { haakon: -5 }, res: { prestigio: 6 }, loyalty: { drakon: 5 }, flags: { norhelmHumilhado: true }, schedule: [{ id: 'sigrid_1', in: 2 }], xp: 20 }, reply: 'Você lembra que o último rei de Norhelm que cruzou o Passo Cinzento voltou sem a própria mão. Haakon fica vermelho. A oferta, porém, continua de pé.' },
        ],
      },
      receber: {
        text: '"Sábio." Haakon sorri com dentes demais. "Ela chegará em dois dias. Mas saiba: se ela for maltratada em sua corte, nem mil casamentos evitarão a guerra."',
        choices: [
          { label: 'Ela será tratada como rainha', sub: 'Garantia', color: 'azul', icon: 'coroa', effects: { rel: { haakon: 12 }, loyalty: { drakon: -8 }, schedule: [{ id: 'sigrid_1', in: 2 }], xp: 10 }, reply: 'Brandt Drakon deixa o salão furioso. Haakon parece satisfeito.' },
          { label: 'Como convidada. Nada mais', sub: 'Cautela', color: 'dourado', icon: 'escudo', effects: { rel: { haakon: 4 }, loyalty: { drakon: -3 }, schedule: [{ id: 'sigrid_1', in: 2 }], xp: 10 }, reply: '"Convidada." Haakon mastiga a palavra. "Por enquanto."' },
        ],
      },
      provocar: {
        text: 'Haakon ri alto. "Tem dentes, o rei-menino! Então diga: quantos homens Castelmar tem? Mil? Dois mil? Norhelm tem três mil lanças esperando o gelo derreter."',
        choices: [
          { label: 'Suficientes', sub: 'Blefar', color: 'vermelho', icon: 'espadas', effects: { res: { prestigio: 3 }, rel: { haakon: -8 }, schedule: [{ id: 'sigrid_1', in: 3 }], xp: 10 }, reply: 'Ele o estuda por um longo tempo. "Veremos." Mas deixa a oferta de pé.' },
          { label: 'E quantos têm comida?', sub: 'Tocar na ferida', color: 'dourado', icon: 'olho', effects: { flags: { infoNorhelm: true }, rel: { haakon: -4 }, schedule: [{ id: 'sigrid_1', in: 3 }], xp: 14 }, reply: 'O sorriso dele morre. Você acertou: Norhelm passa fome. Isso vale ouro na guerra, e na paz.' },
        ],
      },
    },
    ignored: { text: 'O emissário de Norhelm foi deixado esperando. Tomou isso como resposta.', rel: { haakon: -15 }, flags: { recusouNorhelm: true } },
  },
  {
    id: 'sigrid_1', speaker: 'sigrid', topic: 'A princesa do norte', kind: 'casamento', lasts: 3, cond: (s) => !s.flags.noiva,
    nodes: {
      start: {
        text: 'Não vim por amor, rei de Castelmar. Vim porque meu pai tem cinco filhos homens e só uma filha para trocar por paz. Se você me recusar, meus irmãos marcharão. Se me aceitar, seus lordes me odiarão. Escolha o seu inimigo.',
        advice: {
          isabelle: { text: 'Isabelle, sem esconder o desprezo: "A filha do assassino do seu pai. Nem um sorriso, meu filho."', choice: { label: 'Tratá-la com frieza', sub: 'A mãe exige', color: 'vermelho', icon: 'escudo', effects: { rel: { sigrid: -14, isabelle: 8 }, loyalty: { drakon: 3 }, flags: { met_sigrid: true }, schedule: [{ id: 'cortejo_sigrid', in: 5 }], xp: 6 }, reply: 'Sigrid encara Isabelle por um longo instante. "Entendo agora de onde vem o frio deste castelo."' } },
        },
        choices: [
          { label: 'Tratá-la como convidada', sub: 'Gentileza', color: 'azul', icon: 'aperto', effects: { rel: { sigrid: 8 }, flags: { met_sigrid: true } }, goto: 'gentil' },
          { label: 'Perguntar sobre os irmãos', sub: 'Informação', color: 'dourado', icon: 'olho', effects: { flags: { met_sigrid: true } }, goto: 'irmaos' },
          { label: 'Deixar claro quem manda', sub: 'Autoridade', color: 'vermelho', icon: 'coroa', effects: { rel: { sigrid: -10 }, res: { prestigio: 2 }, loyalty: { drakon: 3 }, flags: { met_sigrid: true }, schedule: [{ id: 'cortejo_sigrid', in: 4 }], xp: 8 }, reply: '"Claro, Majestade." Ela diz isso como quem guarda uma faca.' },
          { label: 'Falar em nórdico antigo', sub: 'Exige Crônicas de Norhelm', color: 'roxo', icon: 'livro', req: { knowledge: 'norhelm' }, effects: { rel: { sigrid: 28 }, flags: { met_sigrid: true }, schedule: [{ id: 'cortejo_sigrid', in: 4 }], xp: 20 }, reply: 'Os olhos dela se arregalam. Ela responde na mesma língua e, pela primeira vez, sorri.' },
        ],
      },
      gentil: {
        text: 'Ela parece desarmada pela cortesia. "Em Norhelm, reféns dormem em masmorras." Uma pausa. "Por que é gentil? Você deveria me odiar."',
        choices: [
          { label: 'Você não escolheu a guerra', sub: 'Empatia', color: 'verde', icon: 'coracao', effects: { rel: { sigrid: 16 }, schedule: [{ id: 'cortejo_sigrid', in: 4 }], xp: 12 }, reply: '"Nem você a coroa", ela responde. Algo muda no olhar dela.' },
          { label: 'Porque preciso dessa paz', sub: 'Franqueza', color: 'azul', icon: 'aperto', effects: { rel: { sigrid: 10 }, res: { influencia: 2 }, schedule: [{ id: 'cortejo_sigrid', in: 4 }], xp: 10 }, reply: '"Honesto." Ela quase sorri. "Meu pai também precisa. Não conte a ele que eu disse."' },
        ],
      },
      irmaos: {
        text: '"Ragnar, o mais velho, quer a guerra. Os outros o seguem por medo." Ela hesita. "Se eu casar com você, Ragnar perde a desculpa. Mas não a vontade."',
        choices: [
          { label: 'E o que você quer?', sub: 'Conhecê-la', color: 'verde', icon: 'coracao', effects: { rel: { sigrid: 14 }, flags: { infoNorhelm: true }, schedule: [{ id: 'cortejo_sigrid', in: 4 }], xp: 12 }, reply: '"Que as crianças do norte comam neste inverno." Ela diz isso sem hesitar. É a primeira coisa que ela diz sem medir.' },
          { label: 'Então Ragnar é o inimigo', sub: 'Estratégia', color: 'vermelho', icon: 'espadas', effects: { rel: { sigrid: 4 }, flags: { infoNorhelm: true }, schedule: [{ id: 'cortejo_sigrid', in: 4 }], xp: 12 }, reply: '"Ele é meu irmão", ela diz, fria. "Mas sim."' },
        ],
      },
    },
    ignored: { text: 'A princesa Sigrid passou o dia trancada nos aposentos de hóspedes.', rel: { sigrid: -10 }, flags: { met_sigrid: true }, schedule: [{ id: 'cortejo_sigrid', in: 4 }] },
  },
  {
    id: 'pedido_sigrid', speaker: 'sigrid', topic: 'Paz ou guerra', kind: 'casamento', lasts: 3, cond: (s) => !s.flags.noiva,
    nodes: {
      start: {
        text: (s) => s.flags.sigridEscolha
          ? '"Meu pai quer uma resposta. Ragnar quer uma guerra." Sigrid pousa a carta queimada no parapeito. "Eu quero escolher meu próprio futuro. Você ainda aceita essa escolha, diante dos seus lordes?"'
          : '"Um corvo chegou de Hjalmgard. Meu pai quer uma resposta. Eu também, embora não admita isso a ninguém. Não use a fome do meu povo para fingir que não ouviu a pergunta."',
        choices: [
          { label: 'Pedir sua mão', sub: 'Paz com Norhelm', color: 'roxo', icon: 'coracao', goto: 'sim' },
          { label: 'Pedir tempo', sub: 'Norhelm não espera', color: 'dourado', icon: 'ampulheta', effects: { rel: { sigrid: -8, haakon: -10 } }, reply: '"O inverno não espera, rei de Castelmar."' },
          { label: 'Recusar', sub: 'Assumir a guerra', color: 'vermelho', icon: 'espadas', effects: { rel: { sigrid: -15, haakon: -25 }, loyalty: { drakon: 10 }, flags: { recusouNorhelm: true } }, reply: 'Ela assente, sem surpresa. "Então nos veremos do outro lado de uma muralha."' },
        ],
      },
      sim: {
        text: (s) => s.flags.sigridBeijo
          ? '"Então o inverno esperará." Ela toca sua mão, lembrando o observatório. "Lá em cima estávamos sozinhos. Aqui estão todos os seus lordes. Você ainda vai ficar ao meu lado quando eles pronunciarem meu nome como insulto?"'
          : '"Então o inverno esperará." Ela toca sua mão com dedos frios. "Seus lordes vão cuspir no meu nome. Os Drakon vão afiar espadas. Você vai me defender quando isso acontecer?"',
        choices: [
          { label: 'Sempre', sub: 'Promessa', color: 'azul', icon: 'escudo', effects: { flags: { noiva: 'sigrid' }, rel: { sigrid: 22, haakon: 20 }, loyalty: { drakon: -10 }, xp: 20 }, reply: 'Ela não sorri, mas aperta sua mão com força. Em Norhelm, isso vale mais que um sorriso.' },
          { label: 'Você vai se defender sozinha', sub: 'Respeito pela força dela', color: 'roxo', icon: 'espadas', effects: { flags: { noiva: 'sigrid' }, rel: { sigrid: 16, haakon: 20 }, loyalty: { drakon: -8 }, xp: 20 }, reply: 'Pela primeira vez ela ri. "Finalmente, um sulista que entende."' },
        ],
      },
    },
  },

  // ================= CORTEJOS PRIVADOS =================
  {
    id: 'cortejo_elenora', speaker: 'elenora', topic: 'Um jantar sem etiqueta', kind: 'casamento', lasts: 3,
    cond: (s) => !s.flags.noiva,
    nodes: {
      start: {
        text: (s) => `Elenora o espera na cozinha, sem joias e com farinha na manga. "Roubei a última torta de pera. Meu pai compraria a cozinha inteira para impedir que alguém me visse aqui. ${s.flags.monopolioSal ? 'Depois do monopólio do sal, talvez ele compre mesmo.' : 'Esta é a única sala onde ninguém me oferece em troca de um porto.'} Quer uma fatia ou uma negociação?"`,
        choices: [
          { label: 'A torta. E a verdade.', sub: 'Ouvir Elenora', color: 'verde', icon: 'coracao', goto: 'verdade', tension: -8 },
          { label: 'Depende do dote da torta', sub: 'Provocação', color: 'roxo', icon: 'mascara', goto: 'provocacao', tension: 4 },
          { label: 'Seu pai não manda aqui', sub: 'Promessa arriscada', color: 'vermelho', icon: 'coroa', effects: { rel: { elenora: 4, gaspard: -5 }, loyalty: { valmont: -3 }, flags: { elenoraAutonomia: true }, schedule: [{ id: 'pedido_elenora', in: 2 }] }, reply: '"Nem você", ela responde, erguendo uma sobrancelha. Depois lhe entrega a fatia maior. É a primeira discussão entre vocês que parece uma parceria.' },
        ],
      },
      provocacao: {
        text: '"Duas peras e a dívida de um cozinheiro." Ela corta a torta com precisão militar. "Meu pai calculou meu valor em navios. Qual seria a sua conta, Majestade?" O sorriso desaparece antes que você responda.',
        choices: [
          { label: 'Não há preço para você', sub: 'Falar como pessoa, não rei', color: 'verde', icon: 'coracao', effects: { rel: { elenora: 18 }, flags: { elenoraAutonomia: true }, schedule: [{ id: 'pedido_elenora', in: 2 }], xp: 12 }, reply: 'Ela pousa a faca. "Era a única resposta que eu queria ouvir." A torta esfria enquanto a conversa, enfim, começa.' },
          { label: 'Metade do reino. Sem troco.', sub: 'Humor ácido', color: 'roxo', icon: 'mascara', effects: { rel: { elenora: 9 }, res: { influencia: 2 }, schedule: [{ id: 'pedido_elenora', in: 2 }], xp: 10 }, reply: 'Elenora ri alto. "Guarde o troco para subornar meu pai. Ele se ofende quando é de graça."' },
          { label: 'Uma frota seria útil', sub: 'Negócio acima do afeto', color: 'dourado', icon: 'moedas', effects: { rel: { elenora: -10, gaspard: 8 }, loyalty: { valmont: 5 }, schedule: [{ id: 'pedido_elenora', in: 3 }] }, reply: 'Ela lhe entrega a torta inteira. "Leve. Vejo que gosta de possuir coisas."' },
        ],
      },
      verdade: {
        text: '"A verdade é feia. Se eu disser sim ao casamento, meu pai dirá que me convenceu. Se eu disser não, dirá que o desobedeci. Tenho vinte e três anos e ainda sou uma cláusula no contrato dele." Ela encosta no balcão, perto o bastante para falar sem título.',
        choices: [
          { label: 'Você decide por si', sub: 'Dar espaço e escolha', color: 'azul', icon: 'aperto', effects: { rel: { elenora: 20 }, flags: { elenoraAutonomia: true }, schedule: [{ id: 'pedido_elenora', in: 2 }], xp: 15 }, reply: '"Então talvez eu decida ficar." Ela encosta a testa na sua por um instante, sem pressa. O cozinheiro finge não ver.' },
          { label: 'Posso beijar você?', sub: 'Intimidade consentida', color: 'verde', icon: 'coracao', effects: { rel: { elenora: 22 }, flags: { elenoraBeijo: true, elenoraAutonomia: true }, schedule: [{ id: 'pedido_elenora', in: 2 }], xp: 15 }, reply: '"Pode." O beijo tem gosto de pera e da liberdade rara de uma escolha sua. Quando se afastam, ela ri: "Agora meu pai pode negociar com a torta."' },
          { label: 'A coroa precisa da frota', sub: 'Sinceridade cruel', color: 'vermelho', icon: 'moedas', effects: { rel: { elenora: -12 }, loyalty: { valmont: 6 }, schedule: [{ id: 'pedido_elenora', in: 3 }] }, reply: '"Ao menos não mentiu." Ela volta a chamar você de Majestade. A distância cabe inteira nessa palavra.' },
        ],
      },
    },
    ignored: { text: 'Elenora comeu a torta sozinha e concluiu que o rei tem mais reuniões do que apetite.', rel: { elenora: -6 }, schedule: [{ id: 'pedido_elenora', in: 3 }] },
  },
  {
    id: 'cortejo_rhoswen', speaker: 'rhoswen', topic: 'Treino ao amanhecer', kind: 'casamento', lasts: 3,
    cond: (s) => !s.flags.noiva,
    nodes: {
      start: {
        text: (s) => `Rhoswen o espera no pátio antes do nascer do sol. "Trouxe duas espadas de madeira. Uma para você e outra para o seu ego. ${s.flags.rhoswenPasso ? 'Depois do Passo Cinzento, confio na sua palavra. Agora quero saber se confio nas suas mãos.' : 'Não quero saber quantos homens seu exército tem. Quero saber o que faz quando alguém o derruba.'}"`,
        choices: [
          { label: 'Aceitar o duelo', sub: 'Entrar no jogo dela', color: 'vermelho', icon: 'espadas', goto: 'duelo', tension: 10 },
          { label: 'Confessar que estou exausto', sub: 'Baixar a guarda', color: 'verde', icon: 'coracao', goto: 'exausto', tension: -10 },
          { label: 'Mandar chamar um mestre', sub: 'Esconder-se no protocolo', color: 'azul', icon: 'escudo', effects: { rel: { rhoswen: -8 }, schedule: [{ id: 'pedido_rhoswen', in: 3 }] }, reply: '"Claro. Não seria a primeira vez que um homem manda outro lutar por ele." Ela escolhe o mestre. Ele perde em três golpes.' },
        ],
      },
      duelo: {
        text: 'Ela o desarma em quatro movimentos. No quinto, tropeça de propósito. "Pode declarar vitória", diz, no chão. "A corte adora ver o rei triunfar sobre mulheres inconvenientes." A provocação esconde uma pergunta séria.',
        choices: [
          { label: 'Ajudá-la a levantar', sub: 'Recusar a vitória encenada', color: 'azul', icon: 'aperto', effects: { rel: { rhoswen: 19 }, flags: { rhoswenIgual: true }, schedule: [{ id: 'pedido_rhoswen', in: 2 }], xp: 14 }, reply: '"Ótimo. Odeio teatro." Ela segura sua mão um segundo a mais e puxa você para perto. "Talvez suporte um rei honesto."' },
          { label: 'Beijá-la após pedir licença', sub: 'Coragem fora do combate', color: 'verde', icon: 'coracao', effects: { rel: { rhoswen: 22 }, flags: { rhoswenBeijo: true, rhoswenIgual: true }, schedule: [{ id: 'pedido_rhoswen', in: 2 }], xp: 15 }, reply: 'Ela diz "sim" antes de você terminar a pergunta. O beijo é impetuoso; ao se afastar, ela devolve sua espada. "A revanche, depois."' },
          { label: 'Anunciar que venci', sub: 'A corte vai gostar', color: 'dourado', icon: 'coroa', effects: { res: { prestigio: 3 }, rel: { rhoswen: -14 }, schedule: [{ id: 'pedido_rhoswen', in: 3 }] }, reply: '"Então foi isso que aprendeu." Ela se levanta sem sua ajuda. O pátio inteiro ouve o silêncio.' },
        ],
      },
      exausto: {
        text: '"Também estou." Rhoswen baixa as duas espadas. "Toda noite conto quantos soldados posso perder antes de meu pai me chamar de fraca. Às vezes penso que, se eu parasse de lutar, ninguém saberia quem sou." A voz dela não tem armadura.',
        choices: [
          { label: 'Eu saberia', sub: 'Enxergar além da guerreira', color: 'verde', icon: 'coracao', effects: { rel: { rhoswen: 20 }, flags: { rhoswenIgual: true }, schedule: [{ id: 'pedido_rhoswen', in: 2 }], xp: 15 }, reply: 'Ela apoia a cabeça no seu ombro. "Não conte a ninguém que fiz isso." Pela primeira vez, ficar parado parece vitória.' },
          { label: 'Treinamos outro dia', sub: 'Respeitar o limite dela', color: 'azul', icon: 'ampulheta', effects: { rel: { rhoswen: 11 }, res: { moral: 2 }, schedule: [{ id: 'pedido_rhoswen', in: 2 }] }, reply: '"Amanhã." Ela sorri. "E da próxima vez traga o ego menor. Dá trabalho derrubar os dois."' },
          { label: 'Seu pai não pode vê-la assim', sub: 'Repetir a cobrança', color: 'vermelho', icon: 'escudo', effects: { rel: { rhoswen: -16 }, schedule: [{ id: 'pedido_rhoswen', in: 3 }] }, reply: 'Ela recolhe as espadas. "Então você é mais parecido com ele do que eu pensava."' },
        ],
      },
    },
    ignored: { text: 'Rhoswen treinou sozinha. Os soldados aprenderam que o rei não apareceu.', rel: { rhoswen: -6 }, schedule: [{ id: 'pedido_rhoswen', in: 3 }] },
  },
  {
    id: 'cortejo_isolde', speaker: 'isolde', topic: 'Baile de máscaras', kind: 'casamento', lasts: 3,
    cond: (s) => !s.flags.noiva,
    nodes: {
      start: {
        text: (s) => `No baile, Isolde usa uma máscara de raposa e rouba a sua taça. "Vamos brincar: por uma dança, você não é rei e eu não sou tratado." ${s.flags.difamadorOtho ? '"E Otho ainda não sabe que descobrimos a língua venenosa dele."' : '"Se alguém descobrir quem somos, diga que fui contratada para melhorar sua conversa."'}`,
        choices: [
          { label: 'Aceitar a dança', sub: 'Jogar sem o trono', color: 'roxo', icon: 'mascara', goto: 'danca', tension: 6 },
          { label: 'Perguntar por que ela mente', sub: 'Ir além do charme', color: 'azul', icon: 'olho', goto: 'verdade', tension: 8 },
          { label: 'Recusar a brincadeira', sub: 'Só negócios', color: 'dourado', icon: 'pergaminho', effects: { rel: { isolde: -9 }, res: { influencia: 2 }, schedule: [{ id: 'pedido_isolde', in: 3 }] }, reply: '"Como quiser. Sua Majestade pode ficar com a taça." Ela a devolve vazia. "Sua Majestade tinha vinho melhor antes."' },
        ],
      },
      danca: {
        text: '"Um segredo", ela sussurra ao seu ouvido enquanto giram. "Tenho pavor de voltar para casa tendo falhado. Meu irmão chama isso de fraqueza. Eu chamo de não querer ser descartada." A mão dela permanece firme na sua, embora a voz tenha vacilado.',
        choices: [
          { label: 'Não precisa vencer comigo', sub: 'Desarmar a competição', color: 'verde', icon: 'coracao', effects: { rel: { isolde: 20 }, flags: { isoldeSemMascara: true }, schedule: [{ id: 'pedido_isolde', in: 2 }], xp: 15 }, reply: 'Ela tira a máscara. "Isso é perigosamente gentil." Dançam mais uma música sem falar de frotas.' },
          { label: 'Pedir um beijo', sub: 'Os dois escolhem o risco', color: 'roxo', icon: 'coracao', effects: { rel: { isolde: 22 }, flags: { isoldeBeijo: true, isoldeSemMascara: true }, schedule: [{ id: 'pedido_isolde', in: 2 }], xp: 15 }, reply: '"Só se parar de calcular." Ela o beija atrás da coluna, longe da corte. Quando voltam, a máscara está torta e o sorriso, verdadeiro.' },
          { label: 'Usar o segredo contra o irmão', sub: 'Vantagem diplomática', color: 'vermelho', icon: 'mascara', effects: { rel: { isolde: -17 }, res: { influencia: 4 }, schedule: [{ id: 'pedido_isolde', in: 3 }] }, reply: 'Ela solta sua mão. "Pronto. O rei voltou." A raposa nunca mais tira a máscara naquela noite.' },
        ],
      },
      verdade: {
        text: '"Porque a verdade custa caro." Isolde prende o leque ao cinto. "Eu não temo os seus lordes. Temo me tornar a assinatura do meu irmão num contrato que eu não escrevi. Se ficarmos juntos, quem terá a última palavra: ele, você ou eu?"',
        choices: [
          { label: 'Você terá voz igual', sub: 'Parceria real', color: 'azul', icon: 'aperto', effects: { rel: { isolde: 19 }, flags: { isoldeSemMascara: true }, schedule: [{ id: 'pedido_isolde', in: 2 }], xp: 15 }, reply: '"Boa resposta. Vou cobrá-la." Ela toma seu braço e o leva de volta à dança, agora sem máscara.' },
          { label: 'Nós dois, e sem plateia', sub: 'Intimidade e política', color: 'verde', icon: 'coracao', effects: { rel: { isolde: 16 }, flags: { isoldeSemMascara: true }, schedule: [{ id: 'pedido_isolde', in: 2 }] }, reply: '"Melhor ainda." Ela encosta a testa na sua. A corte pensa que continuam negociando; pela primeira vez, não estão.' },
          { label: 'A coroa sempre decide', sub: 'Poder acima da confiança', color: 'vermelho', icon: 'coroa', effects: { rel: { isolde: -12 }, res: { prestigio: 2 }, schedule: [{ id: 'pedido_isolde', in: 3 }] }, reply: '"Então meu irmão e você têm a mesma resposta. Que decepção."' },
        ],
      },
    },
    ignored: { text: 'Isolde dançou com o embaixador de Véridian e chamou o rei de audiência vazia.', rel: { isolde: -7 }, schedule: [{ id: 'pedido_isolde', in: 3 }] },
  },
  {
    id: 'cortejo_sigrid', speaker: 'sigrid', topic: 'Neve no observatório', kind: 'casamento', lasts: 3,
    cond: (s) => !s.flags.noiva,
    nodes: {
      start: {
        text: (s) => `Sigrid o encontra no observatório com um mapa aberto e uma carta molhada de neve. "Meu irmão Ragnar escreveu. Diz que Castelmar me amoleceu." ${s.flags.infoNorhelm ? 'Você sabe que a colheita do norte falhou; ela sabe que você sabe.' : 'Ela fecha a carta antes que você leia.'} "O que é pior: ele ter razão ou eu desejar que tenha?"`,
        choices: [
          { label: 'O que você deseja?', sub: 'Perguntar sem negociar', color: 'verde', icon: 'coracao', goto: 'desejo', tension: -8 },
          { label: 'Mostrar o mapa da fome', sub: 'Paz exige verdade', color: 'azul', icon: 'livro', goto: 'mapa', tension: 8 },
          { label: 'Que Ragnar tema sua força', sub: 'Aço contra aço', color: 'vermelho', icon: 'espadas', effects: { rel: { sigrid: 2 }, loyalty: { drakon: 3 }, schedule: [{ id: 'pedido_sigrid', in: 3 }] }, reply: '"Ele já teme." Ela dobra a carta. "É por isso que escreve ameaças em vez de vir pessoalmente."' },
        ],
      },
      desejo: {
        text: '"Quero que meu povo sobreviva. E quero um lugar em que não precise pedir desculpas por ser filha do inimigo." Ela encara a neve que derrete no parapeito. "Também quero descobrir como é ser desejada por mim, não como preço da paz."',
        choices: [
          { label: 'Escolho você, se me escolher', sub: 'Sem reféns nem promessas falsas', color: 'verde', icon: 'coracao', effects: { rel: { sigrid: 22 }, flags: { sigridEscolha: true }, schedule: [{ id: 'pedido_sigrid', in: 2 }], xp: 15 }, reply: '"Então fico esta noite." Ela se aproxima e segura sua mão sob a mesa, onde ninguém verá. O silêncio entre vocês deixa de ser hostil.' },
          { label: 'Posso beijar você?', sub: 'Primeira escolha sem tratados', color: 'roxo', icon: 'coracao', effects: { rel: { sigrid: 24 }, flags: { sigridBeijo: true, sigridEscolha: true }, schedule: [{ id: 'pedido_sigrid', in: 2 }], xp: 15 }, reply: '"Pode." Ela beija você devagar, como quem confere se há gelo sob os pés. Depois sorri, breve e sem testemunhas.' },
          { label: 'A paz vem primeiro', sub: 'Dever acima dela', color: 'dourado', icon: 'aperto', effects: { rel: { sigrid: -8 }, flags: { infoNorhelm: true }, schedule: [{ id: 'pedido_sigrid', in: 3 }] }, reply: '"Sempre vem." Ela parece ter ouvido essa frase a vida inteira.' },
        ],
      },
      mapa: {
        text: '"As aldeias de Norhelm não têm grão para o inverno." Sigrid aponta os lugares, um por um. "Meu pai chama isso de estratégia. Ragnar chama de motivo para invadir. Eu chamo pelos nomes das pessoas que vão morrer."',
        choices: [
          { label: 'Enviar grão em segredo', sub: '−150 ouro, evita a fome', color: 'verde', icon: 'moedas', req: { ouro: 150 }, effects: { res: { ouro: -150, povo: 3 }, rel: { sigrid: 18 }, flags: { sigridGrao: true, infoNorhelm: true }, schedule: [{ id: 'pedido_sigrid', in: 2 }], xp: 16 }, reply: 'Ela demora a falar. "Ragnar vai odiar que tenha feito isso." Um sorriso pequeno. "Então foi uma boa ideia."' },
          { label: 'Abrir uma negociação', sub: 'Influência +2', color: 'azul', icon: 'aperto', effects: { res: { influencia: 2 }, rel: { sigrid: 10 }, flags: { infoNorhelm: true }, schedule: [{ id: 'pedido_sigrid', in: 2 }] }, reply: '"Vou escrever aos chefes das aldeias, não ao meu pai." Ela confia a você o nome de cada um.' },
          { label: 'Deixar Ragnar vir buscar', sub: 'Ameaça pública', color: 'vermelho', icon: 'espadas', effects: { res: { prestigio: 3 }, rel: { sigrid: -15 }, loyalty: { drakon: 5 }, schedule: [{ id: 'pedido_sigrid', in: 3 }] }, reply: '"É uma resposta fácil daqui, atrás da muralha." Ela fecha o mapa. "Para eles não será."' },
        ],
      },
    },
    ignored: { text: 'Sigrid queimou a carta de Ragnar sozinha e não disse a ninguém o que havia nela.', rel: { sigrid: -6 }, schedule: [{ id: 'pedido_sigrid', in: 3 }] },
  },

  // ================= PRESSÕES DA CORTE =================
  {
    id: 'gaspard_dote', speaker: 'gaspard', topic: 'Um dote generoso', kind: 'audiencia', day: 8, lasts: 2, cond: (s) => !!s.flags.met_elenora && !s.flags.noiva,
    nodes: {
      start: {
        text: 'Majestade, falemos como homens de negócios. Case-se com minha Elenora e mil moedas de ouro entrarão no seu tesouro no dia do casamento. Além disso, minha frota será sua.',
        choices: [
          { label: 'E o que o senhor quer?', sub: 'Ir direto ao ponto', color: 'dourado', icon: 'olho', goto: 'quer' },
          { label: 'Aceitar a promessa', sub: 'Compromisso informal', color: 'azul', icon: 'aperto', effects: { rel: { gaspard: 15, elenora: 5 }, loyalty: { valmont: 8, drakon: -5 }, xp: 8 }, reply: '"Um rei sensato!" Gaspard aperta sua mão com as duas dele.' },
          { label: 'A coroa não se vende', sub: 'Orgulho', color: 'vermelho', icon: 'coroa', effects: { rel: { gaspard: -10 }, res: { prestigio: 4 }, loyalty: { valmont: -5 }, xp: 8 }, reply: 'Gaspard sorri, mas os olhos não sorriem. "Tudo se vende, Majestade. Só muda o preço."' },
        ],
      },
      quer: {
        text: 'Ele ri, satisfeito. "Gosto de um rei que pergunta. Quero três coisas: o monopólio do sal, um assento no conselho e que os Drakon parem de cobrar pedágio nos meus comboios."',
        choices: [
          { label: 'Uma das três', sub: 'Negociar', color: 'dourado', icon: 'moedas', effects: { rel: { gaspard: 8 }, loyalty: { valmont: 5 }, res: { ouro: 200 }, xp: 12 }, reply: 'Vocês pechincham por uma hora. Ele sai com o monopólio do sal. Você, com duzentas moedas de adiantamento.' },
          { label: 'Nenhuma. Só o dote', sub: 'Firmeza', color: 'vermelho', icon: 'coroa', effects: { rel: { gaspard: -6 }, res: { prestigio: 3 }, xp: 10 }, reply: '"Firme como o pai", ele resmunga. "Pensarei no caso."' },
          { label: 'As três, pela mão dela', sub: 'Ceder tudo', color: 'azul', icon: 'aperto', effects: { rel: { gaspard: 20, elenora: 5 }, loyalty: { valmont: 15, drakon: -10 }, flags: { monopolioSal: true, gaspardConselho: true }, xp: 8 }, reply: 'Gaspard parece ter ganho na loteria. Brandt Drakon, quando souber, vai quebrar uma mesa.' },
        ],
      },
    },
  },
  {
    id: 'brandt_ameaca', speaker: 'brandt', topic: 'A voz da fronteira', kind: 'audiencia', day: 10, lasts: 2, cond: (s) => s.flags.noiva !== 'rhoswen',
    nodes: {
      start: {
        text: (s) => `Majestade. Meu sangue guarda a fronteira há trezentos anos. ${s.flags.noiva ? 'Ouvi rumores sobre seu noivado. ' : ''}Se o rei escolher uma rainha que não entende de guerra, os Drakon vão se perguntar para quem estão sangrando.`,
        advice: {
          aldric: { text: 'Aldric: "Brandt ladra, mas a guarnição dele depende do soldo da coroa. Lembre-o disso, com calma."', choice: { label: 'Lembrar quem paga o soldo', sub: 'Conselho do Chanceler', color: 'dourado', icon: 'moedas', effects: { loyalty: { drakon: -2 }, rel: { brandt: -4, aldric: 5 }, res: { prestigio: 3, influencia: 2 }, xp: 10 }, reply: 'Brandt fica vermelho, mas baixa o tom. Ninguém morde a mão que alimenta os seus soldados.' } },
        },
        choices: [
          { label: 'Isso é uma ameaça?', sub: 'Enfrentá-lo', color: 'vermelho', icon: 'espadas', goto: 'ameaca' },
          { label: 'O que os Drakon precisam?', sub: 'Ouvir', color: 'azul', icon: 'aperto', goto: 'precisa' },
          { label: 'Lembrar o juramento de 1204', sub: 'Exige Tratado das Casas', color: 'roxo', icon: 'livro', req: { knowledge: 'linhagens' }, effects: { loyalty: { drakon: 12 }, rel: { brandt: 5 }, res: { prestigio: 4 }, xp: 15 }, reply: 'Você cita o juramento que o avô dele fez de joelhos diante do seu. Brandt engole seco e se curva.' },
        ],
      },
      ameaca: {
        text: '"Um conselho, Majestade. Apenas um conselho." Ele cruza os braços enormes. "Mas conselhos de Drakon costumam vir com aço."',
        choices: [
          { label: 'E o meu vem com a forca', sub: 'Ameaçar de volta', color: 'vermelho', icon: 'coroa', effects: { loyalty: { drakon: -12 }, rel: { brandt: -12 }, res: { prestigio: 6 }, xp: 8 }, reply: 'Silêncio mortal. Brandt sai sem se curvar. Mas sai.' },
          { label: 'Rir e oferecer vinho', sub: 'Desarmar', color: 'verde', icon: 'aperto', effects: { loyalty: { drakon: 6 }, rel: { brandt: 8 }, xp: 10 }, reply: 'Brandt fica confuso, depois ri também. "Você é estranho, garoto. Gosto de estranhos."' },
        ],
      },
      precisa: {
        text: '"Precisamos?" Ele parece surpreso com a pergunta. "Soldo em dia, respeito no conselho e que ninguém esqueça que foram os Drakon que seguraram Norhelm da última vez."',
        choices: [
          { label: 'Dar-lhe um título', sub: 'Marechal do Norte', color: 'dourado', icon: 'coroa', effects: { loyalty: { drakon: 15, valmont: -5 }, rel: { brandt: 12 }, res: { influencia: -3 }, flags: { brandtMarechal: true }, xp: 10 }, reply: '"Marechal do Norte." Ele saboreia o título. Pela primeira vez, faz uma reverência completa.' },
          { label: 'Soldo em dia', sub: '−150 ouro', color: 'azul', icon: 'moedas', req: { ouro: 150 }, effects: { res: { ouro: -150 }, loyalty: { drakon: 10 }, rel: { brandt: 6 }, xp: 10 }, reply: '"Ouro fala mais alto que promessas." Ele guarda a bolsa e sorri.' },
          { label: 'Respeito se conquista', sub: 'Não ceder', color: 'vermelho', icon: 'escudo', effects: { loyalty: { drakon: -5 }, res: { prestigio: 2 }, xp: 6 }, reply: '"Então veremos quem conquista o quê", ele resmunga.' },
        ],
      },
    },
    ignored: { text: 'Lorde Brandt disse no salão que o rei não recebe quem sangra por ele.', loyalty: { drakon: -8 }, rel: { brandt: -8 } },
  },
  {
    id: 'aveline_fe', speaker: 'aveline', topic: 'A fé da rainha', kind: 'audiencia', day: 11, lasts: 2,
    nodes: {
      start: {
        text: 'Majestade, os carvalhos sagrados coroaram cada rei de Castelmar por mil anos. Uma rainha que não se ajoelha diante deles envenenará a fé do povo. Peço apenas que se lembre disso ao escolher.',
        choices: [
          { label: 'Prometer respeito à fé', sub: 'Agradar os Seren', color: 'verde', icon: 'arvore', effects: { loyalty: { seren: 6 }, rel: { aveline: 6 } }, goto: 'promessa' },
          { label: 'A fé não governa o rei', sub: 'Independência', color: 'vermelho', icon: 'coroa', effects: { loyalty: { seren: -6 }, rel: { aveline: -6 } }, goto: 'independente' },
          { label: 'Pedir a bênção dela', sub: 'Qualquer que seja a rainha', color: 'azul', icon: 'aperto', effects: { loyalty: { seren: 5 }, rel: { aveline: 8 }, res: { influencia: -2 }, flags: { bencaoSeren: true }, xp: 10 }, reply: '"Ninguém havia me pedido isso antes. Os bosques abençoarão sua escolha."' },
        ],
      },
      promessa: {
        text: 'Ela assente, grave. "Palavras são folhas, Majestade. O vento leva. Os Seren precisam de raízes: um gesto."',
        choices: [
          { label: 'Doar para os carvalhos sagrados', sub: '−150 ouro', color: 'dourado', icon: 'moedas', req: { ouro: 150 }, effects: { res: { ouro: -150, povo: 3 }, loyalty: { seren: 10 }, rel: { aveline: 8 }, xp: 10 }, reply: 'Os sinos dos bosques tocam em sua honra. Aveline parece, pela primeira vez, satisfeita.' },
          { label: 'Casar-me sob os carvalhos', sub: 'Promessa de cerimônia', color: 'verde', icon: 'arvore', effects: { loyalty: { seren: 8 }, rel: { aveline: 10 }, flags: { casamentoCarvalhos: true }, xp: 12 }, reply: '"Então o reino inteiro verá os bosques abençoarem o rei." Ela se curva, profundamente.' },
        ],
      },
      independente: {
        text: 'Os olhos dela se estreitam. "Seu bisavô disse o mesmo. Reinou três anos." Ela se levanta. "Não é uma ameaça, Majestade. É história."',
        choices: [
          { label: 'Pedir que ela explique', sub: 'Curiosidade', color: 'azul', icon: 'livro', effects: { rel: { aveline: 6 }, xp: 12 }, reply: 'Ela conta a história de Aldren II, que queimou um bosque sagrado e morreu numa revolta camponesa. Você aprende que a fé do povo é mais forte que qualquer lorde.' },
          { label: 'A história muda', sub: 'Desafio', color: 'vermelho', icon: 'espadas', effects: { rel: { aveline: -8 }, loyalty: { seren: -4 }, res: { prestigio: 3 }, xp: 8 }, reply: '"Muda", ela concorda. "Às vezes para pior."' },
        ],
      },
    },
    ignored: { text: 'A Senhora Aveline voltou aos Bosques Reais em silêncio. Silêncio Seren nunca é bom sinal.', loyalty: { seren: -6 } },
  },
  {
    id: 'aldric_prazo', speaker: 'aldric', topic: 'O prazo se aproxima', kind: 'conselho', day: 15, lasts: 3, cond: (s) => !s.flags.noiva,
    nodes: {
      start: {
        text: 'Majestade, faltam cinco dias. O reino não pode ficar sem uma rainha diante da ameaça de Norhelm. Se não escolher, o conselho escolherá por você, e isso o fará parecer fraco. Diga-me: quem será?',
        choices: [],
      },
    },
    ignored: { text: 'O chanceler Aldric foi embora balançando a cabeça.', rel: { aldric: -5 } },
  },
  {
    id: 'isabelle_ultimato', speaker: 'isabelle', topic: 'Conselho de mãe', kind: 'familia', day: 18, lasts: 2, cond: (s) => !s.flags.noiva,
    nodes: {
      start: {
        text: 'Meu filho, seu pai também hesitou. Casou-se comigo no último dia do prazo, e os lordes nunca o deixaram esquecer disso. Não repita o erro dele.',
        choices: [
          { label: 'Você amava meu pai?', sub: 'Pergunta pessoal', color: 'verde', icon: 'coracao', goto: 'amor' },
          { label: 'Quem você escolheria?', sub: 'Pedir conselho', color: 'azul', icon: 'balao', goto: 'escolha' },
          { label: 'A escolha é minha', sub: 'Independência', color: 'vermelho', icon: 'coroa', effects: { rel: { isabelle: -10 }, res: { prestigio: 2 }, xp: 8 }, reply: '"Sempre foi, meu filho. Só espero que você a faça."' },
        ],
      },
      amor: {
        text: 'Ela fica em silêncio por muito tempo. "No começo, não. Eu era uma aliança, como elas são agora. Com os anos... sim. Aprendi a amar o homem que ele tentava ser."',
        choices: [
          { label: 'Abraçá-la', sub: 'Momento de família', color: 'verde', icon: 'coracao', effects: { rel: { isabelle: 15 }, xp: 12 }, reply: 'Ela chora pela primeira vez desde o funeral. Depois enxuga os olhos e volta a ser rainha.' },
          { label: 'Então o amor pode esperar', sub: 'Pragmatismo', color: 'dourado', icon: 'escudo', effects: { rel: { isabelle: 6 }, res: { influencia: 2 }, xp: 10 }, reply: '"Pode", ela diz. "Mas não para sempre."' },
        ],
      },
      escolha: {
        text: '"Elenora", ela diz sem hesitar. "Família antiga, fortuna, boa educação. E me respeita." Ela sorri. "Mas eu não sou quem vai dormir ao lado dela."',
        choices: [
          { label: 'Ouvir a mãe', sub: 'Noivado com Elenora', color: 'azul', icon: 'coracao', req: { test: (s) => !!s.flags.met_elenora, label: 'Você ainda não conheceu Elenora' }, effects: { flags: { noiva: 'elenora' }, rel: { isabelle: 15, elenora: 10 }, xp: 10 }, reply: 'Isabelle beija sua testa. No dia seguinte, a corte inteira sabe quem escolheu a rainha.' },
          { label: 'Agradecer e decidir sozinho', sub: 'Maturidade', color: 'dourado', icon: 'coroa', effects: { rel: { isabelle: 6 }, xp: 10 }, reply: '"Seu pai teria dito o mesmo", ela sorri. "E teria feito o que eu mandei."' },
        ],
      },
    },
  },
  {
    id: 'casamento', speaker: 'aldric', topic: 'O casamento real', kind: 'casamento', day: 20, lasts: 1, cause: 'noiva',
    nodes: {
      start: {
        text: (s) => (s.flags.noiva ? `Chegou o dia, Majestade. A catedral dos carvalhos está pronta, e ${char(String(s.flags.noiva)).name} o aguarda no altar. Todo o reino assiste.` : 'Chegou o último dia, Majestade, e não há noiva. Os lordes estão reunidos. Escolha agora... ou o conselho escolherá.'),
        choices: [],
      },
    },
    ignored: {
      text: 'O rei não compareceu à própria decisão. O conselho escolheu a rainha por ele, e o reino inteiro notou.',
      run: (s) => {
        if (s.spouse) return;
        const pick = (s.flags.noiva as Suitor) || ([...SUITORS].filter((id) => met(s, id)).sort((a, b) => (s.rel[b] ?? 0) - (s.rel[a] ?? 0))[0] ?? 'elenora');
        marry(s, pick, !s.flags.noiva);
        if (!s.flags.noiva) s.res.prestigio = clamp(s.res.prestigio - 10, 0, 100);
      },
    },
  },
];

// Escolhas dinâmicas (dependem do estado): prazo do chanceler e cerimônia.
export function dynamicChoices(eventId: string, s: GameState): Choice[] | null {
  if (eventId === 'aldric_prazo') return proposeChoices(false);
  if (eventId === 'casamento') {
    if (s.flags.noiva) {
      const id = s.flags.noiva as Suitor;
      return [
        { label: 'Celebrar o casamento', sub: 'Que os sinos toquem', color: 'dourado', icon: 'coracao', effects: { run: (st: GameState) => marry(st, id), xp: 40 }, reply: 'Pétalas, trombetas e juramentos. O reino tem uma rainha. A partir de amanhã, ela pode sentar ao seu lado no trono.' },
        { label: 'Um banquete para o povo', sub: '−300 de ouro, +povo', color: 'verde', icon: 'povo', req: { ouro: 300 }, effects: { res: { ouro: -300, povo: 12 }, run: (st: GameState) => marry(st, id), xp: 40 }, reply: 'As mesas se estendem até a praça. O povo brinda ao rei e à rainha.' },
      ];
    }
    return proposeChoices(true);
  }
  return null;
}
