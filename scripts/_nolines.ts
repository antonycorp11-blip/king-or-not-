import { EVENTS } from '../src/data/events';
import { kingLineFor } from '../src/data/kingLines';
import type { GameState } from '../src/types';
const fake = { flags: {}, spouse: 'elenora', bonds: {}, rel: {}, tracks: {}, res: { ouro: 500, povo: 50, prestigio: 50, moral: 50, exercito: 800, influencia: 10 }, loyalty: { valmont: 0, drakon: 0, seren: 0, montclair: 0 }, day: 10, hour: 10, kingName: 'Edric', conspiracy: { clues: [] }, council: { seats: {}, power: {} }, war: { enemy: 'norhelm' }, seed: 1, mood: { joy: 0, anger: 0, stress: 0, fatigue: 0 } } as unknown as GameState;
const T = (t: any) => { try { return typeof t === 'function' ? t(fake) : t ?? ''; } catch { return '[?]'; } };
const [from, to] = [Number(process.argv[2]), Number(process.argv[3])];
let i = 0;
for (const ev of EVENTS) {
  const lines: string[] = [];
  for (const [k, n] of Object.entries(ev.nodes) as any) {
    const chs = [...n.choices, ...Object.values(n.advice ?? {}).map((a: any) => a.choice), ...(k === 'start' ? Object.values(ev.council?.positions ?? {}).map((p: any) => p.choice) : [])];
    const miss = chs.filter((c: any) => !c.say && !kingLineFor(ev.id, c.label));
    if (!miss.length) continue;
    lines.push(`  [${k}] ${String(T(n.text)).slice(0, 230)}`);
    for (const c of miss) lines.push(`    * ${c.label} | ${c.sub}${c.goto ? ' ->' + c.goto : ''} || ${String(T(c.reply)).slice(0, 110)}`);
  }
  if (!lines.length) continue;
  i++;
  if (i < from || i > to) continue;
  console.log(`## ${ev.id} (${ev.speaker}) ${ev.topic}`);
  console.log(lines.join('\n'));
}
console.error('eventos com falta:', i);
