// Testes dos sistemas da expansão: política de audiências, investigação e praça.
import { newGame } from '../src/engine/core';
import { startDay, endDay, visibleAudiences } from '../src/engine/day';
import { pendingForwarded, pullBack } from '../src/engine/policy';
import { migrate } from '../src/engine/migrate';
import { accuse, checkMission, discover, interrogate, inv, investigationDaily, openCase, phase, suspicion, takeReport } from '../src/engine/investigation';
import { crowd, crowdDaily, evaluate, finishSpeech, pickStage, respondCrowd, spokeToday, startSpeech } from '../src/engine/crowd';
import { layoutCrowd } from '../src/render/square';
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

// ---------- 3. praça da coroa: multidão, discursos e multidões espontâneas ----------
{
  const L = layoutCrowd(500, 3, 3);
  ok(L.n === 500 && L.order.length === 500, 'a multidão monta 500 figurantes sem 500 personagens');
  let sorted = true; for (let k = 1; k < L.n; k++) if (L.y[L.order[k]] < L.y[L.order[k - 1]]) sorted = false;
  ok(sorted, 'figurantes desenhados de trás para a frente');
  const byG = [0, 0, 0, 0, 0]; for (let k = 0; k < L.n; k++) byG[L.g[k]]++;
  ok(byG[0] > byG[1] && byG.every((n) => n > 0), `todos os grupos presentes, povo em maioria (${byG.join('/')})`);
  ok(layoutCrowd(50).n === 50 && layoutCrowd(9999).n <= 640, 'tamanho da multidão limitado');

  // um discurso coerente convence mais que um discurso contraditório
  const s = newGame('Teste'); startDay(s);
  const coerente = evaluate(s, 'geral', [0, 0, 1, 1, 1]); // populista/inspirador
  const contraditorio = evaluate(s, 'geral', [1, 1, 2, 4, 3]); // autoritário + populista + manipulador
  ok(coerente.score > contraditorio.score && contraditorio.clashes.length > 0, `coerência vence contradição (${coerente.score} × ${contraditorio.score})`);
  ok(evaluate(s, 'impostos', [3, 3, 2, 2, 3]).verdict !== 'triunfo', 'anunciar imposto sem negociar não é triunfo');

  // guerra sem declaração: pendente, drena moral; declarar resolve
  s.war = { enemy: 'norhelm', turn: 0, lastTurnDay: s.day, territories: [], reinforcements: 0, moveUsed: false, log: [] } as unknown as typeof s.war;
  const moral0 = s.res.moral;
  crowdDaily(s, []);
  ok(crowd(s).pending.some((p) => p.kind === 'guerra'), 'guerra sem pronunciamento vira anúncio pendente');
  ok(s.res.moral < moral0, 'guerra sem voz derruba a moral');
  startSpeech(s, 'guerra');
  for (let k = 0; k < 5; k++) pickStage(s, 0);
  const res = finishSpeech(s);
  ok(!!s.flags.guerraDeclarada && !crowd(s).pending.some((p) => p.kind === 'guerra'), `declarar a guerra resolve o pendente (${res.verdict})`);
  ok((s.speeches ?? []).length === 1 && spokeToday(s), 'o pronunciamento fica registrado');

  // o boato da investigação vira multidão "QUEM MATOU O REI?"
  const s2 = newGame('Teste'); startDay(s2);
  s2.flags.boatoAssassinato = true;
  crowdDaily(s2, []);
  ok(crowd(s2).spont?.reason === 'boato' && s2.scheduled.some((x) => x.id === 'multidao_praca'), 'o vazamento do caso leva a multidão aos portões');
  ok(crowd(s2).pending.some((p) => p.kind === 'caso'), 'o caso vira anúncio pendente');
  const fall0 = s2.conspiracy.fallDay = 60;
  const txt = respondCrowd(s2, 'soldados');
  ok(txt.includes('QUEM MATOU O REI') && (s2.conspiracy.fallDay ?? 0) < fall0 && !!s2.flags.sangueNaPraca, 'mandar soldados contra o boato ajuda o Pacto');
  // as seis respostas funcionam
  for (const m of ['falar', 'conselho', 'representante', 'soldados', 'portoes', 'ignorar'] as const) {
    const s3 = newGame('Teste'); startDay(s3); s3.flags.boatoAssassinato = true; crowdDaily(s3, []);
    const t = respondCrowd(s3, m);
    ok(t.length > 10 && (m === 'falar' ? crowd(s3).live?.kind === 'caso' : !!crowd(s3).spont?.handled), `resposta à multidão: ${m}`);
  }
  // falar ao vivo depois do evento: a multidão é atendida
  const s4 = newGame('Teste'); startDay(s4); s4.flags.boatoAssassinato = true; crowdDaily(s4, []);
  respondCrowd(s4, 'falar');
  for (let k = 0; k < 5; k++) pickStage(s4, 0);
  finishSpeech(s4);
  ok(crowd(s4).spont?.handled === 'falou' && !!s4.flags.casoFalado, 'o rei falou na varanda e respondeu à praça');

  // a rainha: casamento gera apresentação pendente; silêncio desgasta a imagem dela
  const s5 = newGame('Teste'); startDay(s5); s5.spouse = 'isolde'; s5.flags.casamentoDia = s5.day;
  for (let d = 0; d < 5; d++) { crowdDaily(s5, []); s5.day++; }
  ok(crowd(s5).pending.some((p) => p.kind === 'rainha') && Number(s5.flags.rainhaImagem ?? 0) < 0, 'rainha não apresentada: pendente e imagem caindo');
  startSpeech(s5, 'rainha'); for (let k = 0; k < 5; k++) pickStage(s5, k === 1 ? 2 : 0); finishSpeech(s5);
  ok(!!s5.flags.rainhaApresentada && !!s5.flags.rainhaFalou, 'a rainha foi apresentada (e falou)');

  // um desastre na praça aproxima a queda
  const s6 = newGame('Teste'); startDay(s6); s6.conspiracy.fallDay = 60; crowd(s6).cred = 0;
  startSpeech(s6, 'impostos'); for (const p of [1, 3, 4, 4, 3]) pickStage(s6, p);
  const r6 = finishSpeech(s6);
  ok(r6.verdict === 'desastre' ? (s6.conspiracy.fallDay ?? 99) < 60 : true, `desastre na praça ajuda o Pacto (${r6.verdict}, ${r6.score})`);

  // multidão e discursos sobrevivem ao save, e saves antigos ganham a praça sozinhos
  const back = migrate(JSON.parse(JSON.stringify(s4)));
  ok(back?.speeches?.length === 1 && back?.crowd?.cred !== undefined, 'a praça sobrevive ao save');
  const old = JSON.parse(JSON.stringify(newGame('Velho'))); delete old.crowd; delete old.speeches;
  const up = migrate(old)!; startDay(up); endDay(up);
  ok(!!up.crowd && Array.isArray(up.speeches), 'save antigo sem praça continua jogável');

  // 30 dias de jogo automático com a praça ligada não quebram nada
  const s7 = newGame('Teste'); startDay(s7);
  let spont = 0;
  for (let d = 0; d < 30 && !s7.ended; d++) { if (crowd(s7).spont) spont++; endDay(s7); }
  ok(s7.day > 5 && spont > 0, `dias seguidos com a praça ligada, sem erro (dia ${s7.day}${s7.ended ? ', ' + s7.ended.title : ''}; multidões: ${spont})`);
}

if (fails) { console.error(`${fails} falha(s)`); process.exit(1); }
console.log('Expansão OK');
