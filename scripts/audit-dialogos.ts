import { EVENTS, EVENT_MAP } from '../src/data/events';
import { LETTERS } from '../src/data/letters';
import * as fs from 'fs';
const set = new Map<string, string[]>();
const sched: [string,string][] = [];
const gotoBad: string[] = [];
let choices = 0, noEffect = 0, replyOnly = 0;
const walk = (evId: string, ch: any) => {
  choices++;
  const e = ch.effects;
  if (!e || Object.keys(e).length === 0) noEffect++;
  else if (Object.keys(e).every((k) => k === 'xp')) replyOnly++;
  for (const f of Object.keys(e?.flags ?? {})) { if (!set.has(f)) set.set(f, []); set.get(f)!.push(evId); }
  for (const sc of e?.schedule ?? []) sched.push([evId, sc.id]);
};
for (const ev of EVENTS) {
  for (const [k, n] of Object.entries(ev.nodes)) for (const ch of (n as any).choices) {
    walk(ev.id, ch);
    if (ch.goto && !(ev.nodes as any)[ch.goto]) gotoBad.push(ev.id + ':' + ch.goto);
  }
  for (const [, a] of Object.entries((ev.nodes as any).start.advice ?? {})) walk(ev.id, (a as any).choice);
  for (const [, p] of Object.entries(ev.council?.positions ?? {})) walk(ev.id, (p as any).choice);
  for (const f of Object.keys(ev.ignored?.flags ?? {})) { if (!set.has(f)) set.set(f, []); set.get(f)!.push(ev.id + '(ign)'); }
  for (const sc of ev.ignored?.schedule ?? []) sched.push([ev.id, sc.id]);
}
for (const l of LETTERS as any[]) for (const ch of l.choices ?? []) walk('carta:' + l.id, ch);
// fontes: leitura de flags
const src = (dir: string): string => fs.readdirSync(dir, { withFileTypes: true }).map((d) => d.isDirectory() ? src(dir + '/' + d.name) : d.name.endsWith('.ts') ? fs.readFileSync(dir + '/' + d.name, 'utf8') : '').join('\n');
const all = src('/Users/aquillesantony/Desktop/King or not ?/src');
const unread: string[] = [];
for (const [f, evs] of set) {
  const re = new RegExp(`flags\\.${f}\\b|flags\\[['"\`]${f}['"\`]\\]|flag\\(s, ['"]${f}['"]\\)|cause: ['"]${f}['"]|\\(['"]${f}['"]`);
  if (!re.test(all)) unread.push(`${f} <- ${evs.join(',')}`);
}
const missingSched = sched.filter(([, id]) => !EVENT_MAP[id]);
const unscheduledFollow = EVENTS.filter((e) => e.cause && !set.has(e.cause)).map((e) => e.id + ' cause=' + e.cause);
console.log({ events: EVENTS.length, choices, noEffect, xpOnly: replyOnly, flagsSet: set.size, flagsNeverRead: unread.length, schedules: sched.length, missingSched, gotoBad, unscheduledFollow });
console.log('FLAGS NUNCA LIDAS:\n' + unread.join('\n'));
