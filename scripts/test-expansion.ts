// Testes dos sistemas da expansão: política de audiências, investigação e praça.
import { newGame } from '../src/engine/core';
import { startDay, endDay, visibleAudiences } from '../src/engine/day';
import { pendingForwarded, pullBack } from '../src/engine/policy';
import { migrate } from '../src/engine/migrate';
import { accuse, checkMission, discover, interrogate, inv, investigationDaily, openCase, phase, suspicion, takeReport } from '../src/engine/investigation';
import { EVIDENCE_MAP, MISSIONS, SUSPECTS, WITNESSES, type SuspectId } from '../src/data/investigation';

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

// ---------- 2. investigação: cada culpado tem uma cadeia coerente ----------
{
  const wins: Record<string, number> = {};
  for (const m of SUSPECTS) {
    let top = 0, runs = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const s = newGame('Teste');
      s.seed = seed * 7919;
      startDay(s);
      const I = inv(s);
      I.murderer = m;
      openCase(s);
      I.eyes = true;
      // o jogador manda Pimenta em todas as missões, duas vezes, e interroga todo mundo
      for (let round = 0; round < 3; round++) {
        for (const ms of MISSIONS) {
          I.mission = { id: ms.id, started: 0, doneAt: 0 };
          checkMission(s);
          takeReport(s);
        }
        for (const w of WITNESSES) interrogate(s, w.id, 'calmo');
      }
      const sus = suspicion(s);
      const best = (Object.keys(sus) as SuspectId[]).sort((a, b) => sus[b] - sus[a])[0];
      if (best === m) top++;
      runs++;
      if (seed === 1) {
        ok(phase(s) >= 5, `${m}: a investigação completa passa da fase 5 (fase ${phase(s)})`);
        ok(SUSPECTS.filter((x) => x !== m).every((x) => I.found.some((f) => EVIDENCE_MAP[f.id].secretOf === x)), `${m}: todo inocente revela um segredo`);
        ok(I.found.some((f) => EVIDENCE_MAP[f.id].slot === 'metodo'), `${m}: o método aparece`);
        ok(!I.found.some((f) => { const d = EVIDENCE_MAP[f.id]; return d.only && !d.only.includes(m); }), `${m}: nenhuma pista de outra cadeia aparece`);
      }
    }
    wins[m] = top / runs;
    ok(top / runs >= 0.75, `${m}: investigação completa aponta o culpado na maioria das vezes (${Math.round((top / runs) * 100)}%)`);
  }
  // pistas soltas não resolvem o caso: com só a fase 1-2, ninguém passa de 40%
  const s = newGame('Teste'); startDay(s); const I = inv(s); I.murderer = 'aldric'; openCase(s);
  for (const id of ['odiava_doce', 'amendoas', 'tres_horas', 'portaria', 'taca_cinzel']) discover(s, id);
  ok(Math.max(...Object.values(suspicion(s))) < 40, 'poucas pistas não bastam para ter certeza');
  // acusar um inocente com força tem consequência grave e agenda a verdade
  const s2 = newGame('Teste'); startDay(s2); const I2 = inv(s2); I2.murderer = 'corvin'; openCase(s2);
  for (const id of ['taca_cinzel', 'motivo_otho', 'seg_otho', 'metodo_otho']) { const d = EVIDENCE_MAP[id]; if (d) I2.found.push({ id, day: 1, source: 't' }); }
  const r = accuse(s2, 'otho');
  ok(r.tone === 'ruim' && s2.scheduled.some((x) => x.id === 'verdade_vem_a_tona') === (I2.accused!.outcome === 'inocente_condenado'), 'acusar inocente: consequência e verdade agendada quando condenado');
  // acusar o culpado com provas: cai, e o Pacto perde uma peça
  const s3 = newGame('Teste'); startDay(s3); const I3 = inv(s3); I3.murderer = 'aldric'; openCase(s3); I3.eyes = true;
  for (let round = 0; round < 3; round++) for (const ms of MISSIONS) { I3.mission = { id: ms.id, started: 0, doneAt: 0 }; checkMission(s3); takeReport(s3); }
  for (const w of WITNESSES) interrogate(s3, w.id, 'pressionar');
  const fall = s3.conspiracy.fallDay;
  const r3 = accuse(s3, 'aldric');
  ok(I3.accused?.outcome === 'preso' && s3.flags.queda_aldric === 'preso' && s3.flags.conselhoEmCrise, `acusar o culpado com provas o derruba e muda a queda (${r3.tone}, ${suspicion(s3).aldric}%)`);
  ok(!fall || (s3.conspiracy.fallDay ?? 0) >= fall, 'desmascarar o assassino atrasa o golpe');
  ok(s3.conspiracy.exposed.includes('aldric'), 'o assassino membro do Pacto é exposto');
  // reações: culpado muito atento destrói ou planta provas ao longo dos dias
  const s4 = newGame('Teste'); startDay(s4); const I4 = inv(s4); I4.murderer = 'brandt'; openCase(s4);
  let reacted = false;
  for (let d = 0; d < 20 && !reacted; d++) { I4.heat.brandt = 90; investigationDaily(s4, []); reacted = I4.destroyed.length > 0 || !!I4.plantedAgainst || I4.pimenta.danger > 0; }
  ok(reacted, 'o culpado alerta reage (destrói, planta ou ameaça Pimenta)');
  const back = migrate(JSON.parse(JSON.stringify(s4)));
  ok(back?.investigation?.murderer === 'brandt', 'o caso sobrevive ao save');
}

if (fails) { console.error(`${fails} falha(s)`); process.exit(1); }
console.log('Expansão OK');
