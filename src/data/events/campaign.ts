import type { GameEvent, GameState } from '../../types';
import { enemyLabel } from '../../engine/war';
import { char } from '../characters';
import { HOUSES } from '../realm';

// O inimigo acuado pede paz. Aceitar encerra a guerra com ganhos; recusar é apostar tudo.
const envoy = (s: GameState) => (s.war?.enemy === 'norhelm' ? 'haakon' : HOUSES[s.war!.enemy as keyof typeof HOUSES]?.lord ?? 'haakon');

export const CAMPAIGN_EVENTS: GameEvent[] = [
  {
    id: 'paz_oferecida', speaker: 'haakon', topic: 'O inimigo pede paz', kind: 'urgente', domain: 'chanceler', repeat: 5,
    cond: (s) => !!s.war && !s.war.result,
    nodes: { start: {
      text: (s) => `${char(envoy(s)).name} entra sem armas, com a bandeira branca dobrada no braço. "Majestade. ${enemyLabel(s.war!.enemy)} está disposto a parar. Devolvemos o que tomamos, pagamos tributo e voltamos para casa antes que o inverno mate mais gente que as suas espadas."`,
      choices: [
        { label: 'Aceitar a paz e o tributo', sub: '+250 ouro, fim da guerra', color: 'verde', icon: 'aperto', effects: { res: { ouro: 250, prestigio: 8, povo: 6 }, run: (s) => { const w = s.war!; w.result = 'paz'; for (const t of w.territories) if (['castelmar', 'costa', 'vale', 'bosques', 'montanhas'].includes(t.id)) t.owner = 'rei'; if (w.enemy === 'norhelm') s.flags.pazNorhelm = true; else s.loyalty[w.enemy] = 0; }, xp: 20 }, reply: 'O tratado é assinado sobre a mesa de guerra. Os soldados voltam para casa cantando. Os que não voltam têm os nomes lidos na capela.' },
        { label: 'Exigir rendição total', sub: 'A guerra continua', color: 'vermelho', icon: 'espadas', effects: { res: { prestigio: 3, moral: 4 }, xp: 10 }, reply: '"Então vamos morrer de pé", diz o emissário, e sai. Nos acampamentos inimigos, ninguém dorme esta noite.' },
        { label: 'Paz, e um refém nobre como garantia', sub: 'Exige Diplomacia 2', color: 'azul', icon: 'coroa', req: { attr: ['diplomacia', 2] }, effects: { res: { ouro: 150, prestigio: 12, influencia: 6 }, flags: { refemNobre: true }, run: (s) => { const w = s.war!; w.result = 'paz'; for (const t of w.territories) if (['castelmar', 'costa', 'vale', 'bosques', 'montanhas'].includes(t.id)) t.owner = 'rei'; if (w.enemy === 'norhelm') s.flags.pazNorhelm = true; else s.loyalty[w.enemy] = 5; }, xp: 24 }, reply: 'Um jovem nobre do lado inimigo vem morar no castelo, como garantia. Come na sua mesa. Aprende seus costumes. Um dia, talvez, isso valha mais que o tributo.' },
      ],
    } },
    ignored: { text: 'O rei não recebeu o emissário da paz. O inimigo entendeu como resposta.', res: { prestigio: -2 } },
  },
];
