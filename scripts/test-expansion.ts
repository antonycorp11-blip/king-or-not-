// Testes dos sistemas da expansão: política de audiências, investigação e praça.
import { newGame } from '../src/engine/core';
import { startDay, endDay, visibleAudiences } from '../src/engine/day';
import { pendingForwarded, pullBack } from '../src/engine/policy';
import { migrate } from '../src/engine/migrate';

const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };

let fails = 0;
const ok = (cond: unknown, msg: string) => { if (!cond) { fails++; console.error('FALHOU:', msg); } else console.log('ok:', msg); };

// ---------- 1. política de audiências ----------
{
  const s = newGame('Teste');
  s.audiencePolicy = { povo: 'guardiao', comercio: 'tesoureiro', nobres: 'chanceler', militar: 'marechal', religiao: 'guardiao', diplomacia: 'chanceler', financas: 'tesoureiro', justica: 'guardiao' };
  let forwarded = 0, pulled = false, resolvedDays = 0;
  for (let d = 0; d < 8; d++) {
    startDay(s);
    const pend = pendingForwarded(s);
    forwarded += pend.length;
    ok(pend.every((p) => !visibleAudiences(s).some((v) => v.uid === p.a.uid)), `dia ${s.day}: encaminhados não aparecem na fila do salão`);
    ok(!pend.some((p) => p.ev.kind === 'urgente'), `dia ${s.day}: urgências nunca são encaminhadas`);
    if (!pulled && pend.length) { pulled = pullBack(s, pend[0].a.uid); ok(visibleAudiences(s).some((v) => v.uid === pend[0].a.uid) || (pend[0].a.arrive ?? 8) > s.hour, 'puxar de volta coloca o pedido na fila'); }
    const before = (s.forwarded ?? []).length;
    endDay(s);
    if ((s.forwarded ?? []).length > before) resolvedDays++;
  }
  ok(forwarded > 5, `pedidos foram encaminhados (${forwarded})`);
  ok(resolvedDays > 2, `o conselho resolveu pedidos em vários dias (${resolvedDays})`);
  ok(Object.keys(s.tracks).some((k) => k.startsWith('dom_')), 'o domínio entregue é contabilizado');
  const back = migrate(JSON.parse(JSON.stringify(s)));
  ok(back?.audiencePolicy?.povo === 'guardiao', 'a política sobrevive ao save');
}

if (fails) { console.error(`${fails} falha(s)`); process.exit(1); }
console.log('Expansão OK');
