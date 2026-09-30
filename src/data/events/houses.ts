import type { GameEvent, HouseId } from '../../types';
import { HOUSES, HOUSE_IDS } from '../realm';
import { demandText, house } from '../../engine/houses';
import { isAbsent } from '../../engine/npcs';

// O lorde de cada casa vem ao salão trazer a exigência da casa (as escolhas são
// montadas na hora, a partir do que a casa pede; ver engine/houses.ts)
export const HOUSE_EVENTS: GameEvent[] = HOUSE_IDS.map((h: HouseId): GameEvent => ({
  id: `casa_pedido_${h}`, speaker: HOUSES[h].lord!, topic: `A ${HOUSES[h].name} exige`, kind: 'audiencia', domain: 'pessoal',
  followup: true, repeat: 3, lasts: 2,
  cond: (s) => { const d = house(s, h).demand; return !!d && !d.presented && !isAbsent(s, HOUSES[h].lord!); },
  nodes: { start: { text: (s) => demandText(s, h), choices: [] } },
  ignored: { text: `O enviado da ${HOUSES[h].name} esperou o dia inteiro. O prazo da casa continua correndo.`, rel: { [HOUSES[h].lord!]: -4 } },
}));
