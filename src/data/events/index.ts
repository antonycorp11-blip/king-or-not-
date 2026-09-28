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

export const EVENTS: GameEvent[] = [...COURT_EVENTS, ...MARRIAGE_EVENTS, ...PEOPLE_EVENTS, ...WAR_EVENTS, ...ARMY_EVENTS, ...SUMMON_EVENTS, ...CRISIS_EVENTS, ...NIGHT_EVENTS, ...ARC_EVENTS, ...HUMOR_EVENTS];

export const EVENT_MAP: Record<string, GameEvent> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

export { MARRIAGE_TERMS } from './marriage';
import { dynamicChoices as marriageChoices } from './marriage';
import type { Choice, GameState } from '../../types';

export function dynamicChoices(eventId: string, s: GameState, node = 'start'): Choice[] | null {
  return (node === 'start' ? marriageChoices(eventId, s) : null) ?? dynamicSummonChoices(eventId, node, s);
}
