import type { GameEvent } from '../../types';
import { COURT_EVENTS } from './court';
import { MARRIAGE_EVENTS } from './marriage';
import { PEOPLE_EVENTS } from './people';
import { WAR_EVENTS } from './war';
import { ARMY_EVENTS } from './army';

export const EVENTS: GameEvent[] = [...COURT_EVENTS, ...MARRIAGE_EVENTS, ...PEOPLE_EVENTS, ...WAR_EVENTS, ...ARMY_EVENTS];

export const EVENT_MAP: Record<string, GameEvent> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

export { dynamicChoices, MARRIAGE_TERMS } from './marriage';
