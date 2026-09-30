import type { Choice, GameEvent, GameState } from '../../types';
import { REASONS } from '../speeches';
import { crowd, respondCrowd, type CrowdResponse } from '../../engine/crowd';

// MULTIDÕES ESPONTÂNEAS: o povo vem até o castelo, e o rei decide como responder
const spont = (s: GameState) => crowd(s).spont;

function crowdText(s: GameState): string {
  const sp = spont(s);
  if (!sp) return 'A praça está calma.';
  const R = REASONS[sp.reason];
  const n = sp.size >= 400 ? 'Centenas' : sp.size >= 200 ? 'Duzentas pessoas, talvez mais,' : 'Umas cem pessoas';
  const signs = R.signs.map((x) => `"${x}"`).join(', ');
  return `Aurelian entra sem bater. "Majestade, a Praça da Coroa está cheia. ${n} diante dos portões." ${R.text} Nas faixas, se lê: ${signs}. "Eles querem o rei na varanda. O que eu faço?"`;
}

const opt = (mode: CrowdResponse, label: string, sub: string, color: Choice['color'], icon: string, say: string): Choice => ({
  label, sub, color, icon, say,
  effects: { run: (s) => { s.flags._multidao = respondCrowd(s, mode); }, xp: mode === 'falar' ? 12 : 6 },
  reply: (s) => String(s.flags._multidao ?? ''),
});

export const CROWD_EVENTS: GameEvent[] = [
  {
    id: 'multidao_praca', speaker: 'aurelian', topic: 'Multidão diante do castelo', kind: 'urgente', domain: 'chanceler', repeat: 1,
    cond: (s) => !!spont(s) && !spont(s)!.handled,
    nodes: { start: {
      text: (s) => crowdText(s),
      choices: [
        opt('falar', 'Sair à varanda e falar', 'Pronunciamento ao vivo', 'verde', 'povo', 'Abram a varanda. Se o povo veio até o rei, o rei vai até o povo.'),
        opt('conselho', 'Mandar o Conselho', 'O Chanceler fala por mim', 'azul', 'pergaminho', 'Mande o Chanceler. Ele sabe falar com multidões, e eu tenho um reino para governar.'),
        opt('representante', 'Mandar um representante', 'A rainha, ou a rainha-mãe', 'roxo', 'coroa', 'Peça à rainha que desça. O povo vai ouvi-la.'),
        opt('soldados', 'Mandar os soldados', 'Dispersar a praça', 'vermelho', 'espadas', 'Dispersem a praça. Com firmeza. Ninguém cerca o castelo do rei.'),
        opt('portoes', 'Fechar os portões', 'Esperar passar', 'dourado', 'cadeado', 'Fechem os portões e dobrem a guarda. Eles cansam antes de nós.'),
        opt('ignorar', 'Ignorar', 'O rei tem mais o que fazer', 'dourado', 'selo', 'Deixe gritarem. Não vou governar pela vontade de uma praça.'),
      ],
    } },
    ignored: { text: 'A multidão esperou o rei o dia inteiro diante dos portões.', run: (s) => { respondCrowd(s, 'ignorar'); } },
  },
];
