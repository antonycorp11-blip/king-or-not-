import type { GameEvent } from '../../types';
import { COURT_EVENTS } from './court';
import { MARRIAGE_EVENTS } from './marriage';
import { PEOPLE_EVENTS } from './people';
import { WAR_EVENTS } from './war';
import { ARMY_EVENTS } from './army';
import { SUMMON_EVENTS, dynamicSummonChoices } from './summons';
import { CRISIS_EVENTS } from './crisis';
import { NIGHT_EVENTS } from './night';
import { ARC_EVENTS } from './arcs';
import { HUMOR_EVENTS } from './humor';
import { COUNCIL_EVENTS } from './council';
import { CASTLE_LIFE_EVENTS } from './castleLife';
import { ENCOUNTER_EVENTS } from './encounters';
import { TALK_EVENTS, talkChoices } from './talk';
import { COMMERCE_EVENTS } from './commerce';
import { CAMPAIGN_EVENTS } from './campaign';
import { ECHO_EVENTS } from './echoes';
import { ROUTINE_EVENTS } from './routines';
import { MEAL_EVENTS } from './meals';
import { CONSEQUENCE_EVENTS } from './consequences';

export const EVENTS: GameEvent[] = [...COURT_EVENTS, ...MARRIAGE_EVENTS, ...PEOPLE_EVENTS, ...WAR_EVENTS, ...ARMY_EVENTS, ...SUMMON_EVENTS, ...CRISIS_EVENTS, ...NIGHT_EVENTS, ...ARC_EVENTS, ...HUMOR_EVENTS, ...ECHO_EVENTS, ...ROUTINE_EVENTS, ...COUNCIL_EVENTS, ...CASTLE_LIFE_EVENTS, ...ENCOUNTER_EVENTS, ...TALK_EVENTS, ...COMMERCE_EVENTS, ...CAMPAIGN_EVENTS, ...MEAL_EVENTS, ...CONSEQUENCE_EVENTS, ...HOUSE_EVENTS, ...BIG_EVENTS, ...NIGHT_ALARMS];

export const EVENT_MAP: Record<string, GameEvent> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

export { MARRIAGE_TERMS } from './marriage';
import { dynamicChoices as marriageChoices } from './marriage';
import type { Choice, GameState, HouseId } from '../../types';
import { demandChoices } from '../../engine/houses';
import { HOUSE_EVENTS } from './houses';
import { BIG_EVENTS, bailChoices } from './bigEvents';
import { NIGHT_ALARMS } from './nightAlarms';

export function dynamicChoices(eventId: string, s: GameState, node = 'start'): Choice[] | null {
  if (eventId === 'baile_pretendentes' && node === 'start') return bailChoices(s);
  if (eventId.startsWith('casa_pedido_') && node === 'start') return demandChoices(s, eventId.slice(12) as HouseId);
  return (node === 'start' ? marriageChoices(eventId, s) ?? talkChoices(eventId, s) : null) ?? dynamicSummonChoices(eventId, node, s);
}

// Só estes tipos entram na fila do salão; os outros acontecem pelo castelo.
export const AUDIENCE_KINDS: GameEvent['kind'][] = ['audiencia', 'urgente', 'familia', 'conselho', 'casamento'];
