import type { GameEvent, GameState } from '../../types';
import { startWar, terr } from '../../engine/war';

function weakenNorhelm(s: GameState, n: number) {
  const w = s.war;
  if (!w) return;
  const p = terr(w, 'passo');
  if (p) p.units = Math.max(2, p.units - n);
}

function openWar(s: GameState) {
  startWar(s, 'norhelm');
  if (s.flags.infoNorhelm) weakenNorhelm(s, 2);
  if (s.flags.passoFortificado) terr(s.war!, 'vale')!.units += 3;
  if (s.flags.rhoswenPasso) terr(s.war!, 'vale')!.units += 1;
}

// Pós-casamento: a rainha, a guerra do norte ou a rebelião.
export const WAR_EVENTS: GameEvent[] = [
  {
    id: 'invasao', speaker: 'aurelian', topic: 'Notícias urgentes das fronteiras', kind: 'urgente', day: 22, cond: (s) => !s.flags.pazNorhelm,
    nodes: {
      start: {
        text: 'Majestade! Notícias urgentes das fronteiras! As forças de Norhelm cruzaram o Passo Cinzento durante a noite. Várias aldeias foram incendiadas e nossos postos avançados resistem! Eles avançam em direção ao Vale Rubro!',
        choices: [
          { label: 'Mobilizar imediatamente', sub: 'Erguer nossos estandartes e repelir o inimigo', color: 'vermelho', icon: 'espadas', effects: { res: { prestigio: 4, moral: 5 }, run: openWar, xp: 20 }, goto: 'vanguarda' },
          { label: 'Convocar o conselho', sub: 'Reunir os lordes agora para decidir juntos', color: 'azul', icon: 'povo', effects: { loyalty: { valmont: 5, drakon: 5, seren: 5, montclair: 5 }, run: openWar, xp: 20 } },
          { label: 'Enviar espiões', sub: 'Obter mais informações antes de agir', color: 'verde', icon: 'mascara', req: { influencia: 6 }, effects: { res: { influencia: -6 }, flags: { infoNorhelm: true }, run: openWar, xp: 20 }, reply: 'Os espiões voltam ao anoitecer: o Passo Cinzento está mal guarnecido.' },
          { label: 'Realizar uma finta', sub: 'Exige A Arte da Muralha', color: 'roxo', icon: 'livro', req: { knowledge: 'tatica' }, effects: { run: (s) => { openWar(s); weakenNorhelm(s, 5); }, xp: 30 }, reply: 'Você atrai a vanguarda deles para o desfiladeiro que seu bisavô descreveu. Centenas caem antes da primeira batalha.' },
        ],
      },
      vanguarda: {
        text: 'Os estandartes sobem nas torres. Aurelian bate continência: "As tropas estarão prontas ao amanhecer, Majestade. Resta uma pergunta: quem comanda a vanguarda?"',
        choices: [
          { label: 'Você, Capitão', sub: 'Experiência', color: 'azul', icon: 'escudo', effects: { res: { moral: 5 }, rel: { aurelian: 8 }, xp: 10 }, reply: '"Não vou decepcioná-lo." Ele sai sem perder um segundo.' },
          { label: 'Lorde Brandt Drakon', sub: 'A fronteira é dele', color: 'vermelho', icon: 'espadas', effects: { loyalty: { drakon: 10 }, rel: { brandt: 8, aurelian: -3 }, xp: 10 }, reply: 'Brandt recebe a ordem com um sorriso feroz. Os Drakon lutarão como leões.' },
          { label: 'Eu mesmo', sub: 'O rei à frente', color: 'dourado', icon: 'coroa', effects: { res: { prestigio: 6, moral: 10 }, rel: { isabelle: -8 }, xp: 14 }, reply: 'Quando os soldados sabem que o rei vai à frente, o grito deles sacode as muralhas. Sua mãe não dorme esta noite.' },
        ],
      },
    },
    ignored: { text: 'O rei hesitou enquanto aldeias queimavam. A guerra começou mesmo assim.', res: { prestigio: -8, moral: -10 }, run: openWar },
  },
  {
    id: 'rebeliao_drakon', speaker: 'brandt', topic: 'Os Drakon se levantam', kind: 'urgente', day: 22, cond: (s) => !!s.flags.pazNorhelm && s.loyalty.drakon < 15,
    nodes: {
      start: {
        text: 'Você deitou com a filha do lobo que matou meu pai, garoto. Os Drakon não servem a um rei vendido ao inverno. A partir de hoje, o Vale Rubro é livre.',
        choices: [
          { label: 'Esmagar a rebelião', sub: 'Guerra civil', color: 'vermelho', icon: 'espadas', effects: { res: { prestigio: 3 }, run: (s) => startWar(s, 'drakon'), xp: 20 } },
          { label: 'Oferecer autonomia', sub: 'Paz a um preço alto', color: 'dourado', icon: 'pergaminho', effects: { law: 'Autonomia do Vale Rubro', loyalty: { drakon: 30 }, res: { prestigio: -15 }, run: (s) => (s.taxes.drakon = 'baixo'), xp: 15 } },
          { label: 'Negociar pessoalmente', sub: 'Custa 25 de Influência', color: 'azul', icon: 'aperto', req: { influencia: 25 }, effects: { res: { influencia: -25 }, loyalty: { drakon: 35 }, rel: { brandt: 10 }, xp: 25 }, reply: 'Horas de conversa a portas fechadas. Brandt sai sem dizer nada, mas os estandartes rebeldes descem.' },
          { label: 'Lembrar o juramento', sub: 'Exige Tratado das Casas', color: 'roxo', icon: 'livro', req: { knowledge: 'linhagens' }, effects: { loyalty: { drakon: 25 }, res: { prestigio: 5 }, xp: 25 }, reply: 'Diante de todos os vassalos dele, você lê o juramento do avô de Brandt. Os cavaleiros de Ferrão e Rocha-Negra abaixam as armas. Brandt fica sozinho.' },
        ],
      },
    },
    ignored: { text: 'O rei ignorou a rebelião. Os Drakon marcham sobre Castelmar.', res: { prestigio: -10 }, run: (s) => startWar(s, 'drakon') },
  },
  {
    id: 'tributo_norte', speaker: 'haakon', topic: 'O tributo do norte', kind: 'audiencia', day: 22, cond: (s) => !!s.flags.pazNorhelm && s.loyalty.drakon >= 15,
    nodes: {
      start: {
        text: 'O Rei de Norhelm envia saudações ao genro. Peles, âmbar e prata, como prometido. E um pedido: nossos navios querem comerciar no seu porto.',
        choices: [
          { label: 'Aceitar e abrir o porto', sub: '+600 de ouro, −Drakon', color: 'azul', icon: 'aperto', effects: { res: { ouro: 600 }, loyalty: { drakon: -5, valmont: 5 }, xp: 10 } },
          { label: 'Aceitar só o tributo', sub: '+400 de ouro', color: 'dourado', icon: 'moedas', effects: { res: { ouro: 400 }, rel: { haakon: -5 }, xp: 10 } },
        ],
      },
    },
  },
  {
    id: 'lucas_frente', speaker: 'lucas', topic: 'Lucas quer ir à guerra', kind: 'familia', minDay: 23, weight: 5, cond: (s) => !!s.war && !s.war.result,
    nodes: {
      start: {
        text: (s) => `${s.flags.lucasSoldado ? 'Treinei com Aurelian todos esses dias. ' : ''}Deixe-me ir à frente, irmão! Os soldados precisam ver alguém da família real lá fora.`,
        choices: [
          { label: 'Deixá-lo ir', sub: '+moral, risco', color: 'vermelho', icon: 'espadas', effects: { res: { moral: 15 }, rel: { lucas: 15, isabelle: -15 }, flags: { lucasNaFrente: true }, xp: 10 } },
          { label: 'Mandá-lo como emissário', sub: 'Diplomacia', color: 'azul', icon: 'aperto', effects: { res: { influencia: 5 }, rel: { lucas: 8 }, xp: 10 } },
          { label: 'Você fica', sub: 'Proteger o herdeiro', color: 'dourado', icon: 'coroa', effects: { rel: { lucas: -10, isabelle: 10 }, xp: 5 } },
        ],
      },
    },
  },
  {
    id: 'milicia_povo', speaker: 'marta', topic: 'O povo quer lutar', kind: 'audiencia', minDay: 23, weight: 4, cond: (s) => !!s.war && !s.war.result && s.res.povo >= 45,
    nodes: {
      start: {
        text: 'Majestade, os homens da cidade baixa querem pegar em armas. Ferreiros, curtidores, filhos de pescadores. Não são soldados, mas amam este reino.',
        choices: [
          { label: 'Armar a milícia', sub: '+300 soldados, −100 de ouro', color: 'verde', icon: 'povo', req: { ouro: 100 }, effects: { res: { ouro: -100, exercito: 300, povo: 5 }, run: (s) => { const c = s.war && terr(s.war, 'castelmar'); if (c && c.owner === 'rei') c.units += 3; }, xp: 10 } },
          { label: 'Mandá-los para casa', sub: 'Guerra é para soldados', color: 'azul', icon: 'escudo', effects: { res: { povo: -2 }, xp: 5 } },
        ],
      },
    },
  },
  // ---------- A rainha ----------
  {
    id: 'rainha_elenora', speaker: 'elenora', topic: 'A rainha e o comércio', kind: 'familia', day: 24, cond: (s) => s.spouse === 'elenora',
    nodes: {
      start: {
        text: 'Meu rei, meu pai insiste no monopólio do sal. Eu digo não: faria da nossa casa a mais odiada do reino. Mas preciso que você diga não por mim, ou ele nunca me perdoará.',
        choices: [
          { label: 'Negar o monopólio', sub: 'Protegê-la', color: 'azul', icon: 'escudo', effects: { rel: { elenora: 15, gaspard: -10 }, loyalty: { valmont: -5, drakon: 4 }, res: { povo: 3 }, xp: 10 } },
          { label: 'Conceder a Gaspard', sub: 'Agradar os Valmont', color: 'dourado', icon: 'moedas', effects: { rel: { elenora: -10, gaspard: 15 }, loyalty: { valmont: 12 }, res: { povo: -5, ouro: 200 }, xp: 10 } },
        ],
      },
    },
  },
  {
    id: 'rainha_rhoswen', speaker: 'rhoswen', topic: 'A rainha guerreira', kind: 'familia', day: 24, cond: (s) => s.spouse === 'rhoswen',
    nodes: {
      start: {
        text: 'Deixe-me comandar a cavalaria, meu rei. Uma rainha no trono não vale um décimo de uma rainha na sela.',
        choices: [
          { label: 'A cavalaria é sua', sub: '+moral, +Drakon', color: 'vermelho', icon: 'espadas', effects: { res: { moral: 12 }, loyalty: { drakon: 6 }, rel: { rhoswen: 15 }, run: (s) => { const v = s.war && terr(s.war, 'vale'); if (v && v.owner === 'rei') v.units += 2; }, xp: 10 } },
          { label: 'Seu lugar é na corte', sub: 'Tradição', color: 'azul', icon: 'coroa', effects: { rel: { rhoswen: -15, isabelle: 5 }, xp: 5 } },
        ],
      },
    },
  },
  {
    id: 'rainha_isolde', speaker: 'isolde', topic: 'A frota de Véridian', kind: 'familia', day: 24, cond: (s) => s.spouse === 'isolde',
    nodes: {
      start: {
        text: 'Meu irmão cumpriu a promessa, meu rei. Nossa frota pode desembarcar no Fiorde Gelado. Mas quer em troca o porto da Costa Serena por dez anos.',
        choices: [
          { label: 'Aceitar o preço', sub: 'Ataque pelo mar', color: 'verde', icon: 'aperto', effects: { loyalty: { valmont: -15 }, rel: { isolde: 10 }, run: (s) => { const f = s.war && terr(s.war, 'fiorde'); if (f && f.owner === 'inimigo') f.units = Math.max(1, f.units - 5); }, xp: 10 } },
          { label: 'Recusar', sub: 'O porto é nosso', color: 'vermelho', icon: 'escudo', effects: { rel: { isolde: -10 }, loyalty: { valmont: 6 }, xp: 5 } },
        ],
      },
    },
  },
  {
    id: 'rainha_sigrid', speaker: 'sigrid', topic: 'Uma rainha estrangeira', kind: 'familia', day: 24, cond: (s) => s.spouse === 'sigrid',
    nodes: {
      start: {
        text: 'As damas da corte cospem no chão por onde eu passo, meu rei. Posso suportar ódio. Mas não posso suportar que você finja não ver.',
        choices: [
          { label: 'Punir as damas', sub: 'Defender a rainha', color: 'vermelho', icon: 'coroa', effects: { rel: { sigrid: 18, isabelle: -8 }, res: { prestigio: 2 }, xp: 10 } },
          { label: 'Apresentá-la ao povo', sub: 'Custa 8 de Influência', color: 'azul', icon: 'povo', req: { influencia: 8 }, effects: { res: { influencia: -8, povo: 10 }, rel: { sigrid: 12 }, xp: 12 }, reply: 'Sigrid distribui pão na cidade baixa com as próprias mãos. Começam a chamá-la de "Rainha da Neve", com carinho.' },
          { label: 'Pedir paciência', sub: 'O tempo resolve', color: 'dourado', icon: 'ampulheta', effects: { rel: { sigrid: -8 }, xp: 5 } },
        ],
      },
    },
  },
];
