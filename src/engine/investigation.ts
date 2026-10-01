import type { GameState, HouseId, LogEntry, RoomId } from '../types';
import { CONFESSION, EVIDENCE, EVIDENCE_MAP, KIND_INFO, MISSION_MAP, SUSPECTS, WITNESSES, type EvidenceDef, type EvKind, type SuspectId } from '../data/investigation';
import { char } from '../data/characters';
import { SEAT_IDS } from '../data/council';
import { addClue } from './conspiracy';
import { addBond } from './bonds';
import { clamp, rand } from './core';

// A INVESTIGAÇÃO DA MORTE DO REI ODRAN
// O culpado é sorteado no começo da partida e fica escondido no save. As evidências
// vêm de missões de Pimenta, interrogatórios e confrontos. O índice de suspeita mede
// quanto as evidências ENCONTRADAS apontam para alguém, não a verdade.

export interface FoundEvidence { id: string; day: number; source: string }
export interface InvestigationState {
  open: boolean; // Pimenta plantou a dúvida
  openedDay?: number;
  eyes?: boolean; // "Os Olhos do Bobo" aceito: missões liberadas
  murderer: SuspectId; // segredo da partida
  found: FoundEvidence[];
  destroyed: string[]; // o culpado se livrou disso antes de alguém achar
  plantedAgainst?: SuspectId; // o culpado plantou provas contra este inocente
  heat: Record<SuspectId, number>; // atenção de cada suspeito (0..100)
  mission?: { id: string; doneAt: number; started: number };
  report?: { missionId: string; evId?: string; noticed?: boolean };
  missionsDone: Record<string, number>;
  interrogated: Record<string, number>;
  pimenta: { danger: number; status: 'ok' | 'ferido' | 'escondido'; until?: number; offered?: boolean };
  confronted: Partial<Record<SuspectId, string[]>>;
  informant?: SuspectId;
  fled?: SuspectId;
  accused?: { id: SuspectId; day: number; correct: boolean; confidence: number; outcome: 'preso' | 'fugiu' | 'duvida' | 'inocente_condenado' | 'inocente_solto' };
  leaked?: number; // dia em que o boato vazou para a cidade
  selected?: string; // item selecionado na mesa (interface)
  meet?: { room: RoomId; where: string }; // onde Pimenta espera o rei hoje à noite
  offer?: import('./nightOps').NightOp | { day: number; none: true }; // a operação noturna proposta
}

const abs = (s: GameState) => s.day * 24 + s.hour;

export function newInvestigation(s: GameState): InvestigationState {
  const murderer = SUSPECTS[Math.floor(rand(s) * SUSPECTS.length)];
  // o assassino tem um laço com o Pacto (membro, financiado, manipulado ou encoberto)
  if (CONFESSION[murderer].pact === 'membro' && !s.conspiracy.members.includes(murderer)) s.conspiracy.members.push(murderer);
  return {
    open: false, murderer, found: [], destroyed: [], heat: { corvin: 0, brandt: 0, isabelle: 0, otho: 0, aldric: 0 },
    missionsDone: {}, interrogated: {}, pimenta: { danger: 0, status: 'ok' }, confronted: {},
  };
}

export function inv(s: GameState): InvestigationState {
  return (s.investigation ??= newInvestigation(s));
}

export const has = (s: GameState, id: string) => inv(s).found.some((f) => f.id === id);

// Esta evidência existe nesta partida e ainda pode ser encontrada?
export function available(s: GameState, d: EvidenceDef) {
  const I = inv(s);
  if (d.only && !d.only.includes(I.murderer)) return false;
  if (d.unless && d.unless.includes(I.murderer)) return false;
  if (d.planted && I.plantedAgainst !== d.planted) return false;
  if (d.debunks && !has(s, d.debunks)) return false;
  return !has(s, d.id) && !I.destroyed.includes(d.id);
}

// Fase atual: cada fase se completa com duas evidências dela
export function phase(s: GameState) {
  const I = inv(s);
  let p = 1;
  for (; p <= 6; p++) {
    const n = I.found.filter((f) => EVIDENCE_MAP[f.id]?.phase === p).length;
    if (n < 2) break;
  }
  return Math.min(7, p);
}

// A próxima coisa que alguém pode encontrar nesta lista de encaixes
export function nextFor(s: GameState, slots: string[], ahead = 1): EvidenceDef | null {
  const p = phase(s);
  for (const slot of slots) {
    const d = EVIDENCE.find((e) => e.slot === slot && available(s, e));
    if (d && d.phase <= p + ahead) return d;
  }
  return null;
}

// Como a evidência aparece para o jogador (a plantada parece verdadeira até ser desmascarada)
export function seenKind(s: GameState, d: EvidenceDef): EvKind {
  if (d.kind === 'falsa') return has(s, `desmascara_${d.planted}`) ? 'falsa' : d.looks ?? 'documento';
  return d.kind;
}

// Índice de suspeita: quanto as evidências encontradas apontam para cada um
export function suspicion(s: GameState): Record<SuspectId, number> {
  const I = inv(s);
  const out = { corvin: 6, brandt: 6, isabelle: 6, otho: 10, aldric: 4 } as Record<SuspectId, number>; // Otho já parece suspeito
  for (const f of I.found) {
    const d = EVIDENCE_MAP[f.id];
    if (!d) continue;
    if (d.kind === 'falsa' && has(s, `desmascara_${d.planted}`)) continue; // desmascarada: não conta mais
    const w = KIND_INFO[seenKind(s, d)].weight;
    for (const [k, v] of Object.entries(d.points) as [SuspectId, number][]) out[k] += v * w;
  }
  for (const k of SUSPECTS) out[k] = Math.round(clamp(out[k], 0, 100));
  return out;
}

export function discover(s: GameState, id: string, source?: string): EvidenceDef | null {
  const I = inv(s);
  const d = EVIDENCE_MAP[id];
  if (!d || has(s, id)) return null;
  I.found.push({ id, day: s.day, source: source ?? d.source });
  if (d.clue) addClue(s, d.clue);
  s.log.push({ icon: 'olho', title: `Investigação: ${d.title}`, text: `${KIND_INFO[seenKind(s, d)].name}. Está na mesa de investigação.`, tone: 'rumor' });
  return d;
}

export function openCase(s: GameState) {
  const I = inv(s);
  if (I.open) return;
  I.open = true;
  I.openedDay = s.day;
  discover(s, 'mel', 'Pimenta');
  s.log.push({ icon: 'olho', title: 'Investigação aberta: a morte do rei Odran', text: 'Uma frase de Pimenta não sai da sua cabeça. A mesa de investigação está no seu quarto e no menu O Caso.', tone: 'rumor' });
}

// ---------- Os Olhos do Bobo: uma missão por vez ----------
export function pimentaFree(s: GameState) {
  const I = inv(s);
  return I.eyes && !I.mission && !I.report && I.pimenta.status === 'ok';
}

export function startMission(s: GameState, id: string): string | null {
  const I = inv(s);
  const m = MISSION_MAP[id];
  if (!m || !pimentaFree(s)) return null;
  I.mission = { id, started: abs(s), doneAt: abs(s) + m.hours };
  return m.quip;
}

// O tempo passou: Pimenta voltou?
export function checkMission(s: GameState): RoomId | null {
  const I = inv(s);
  if (!I.mission || abs(s) < I.mission.doneAt) return null;
  const m = MISSION_MAP[I.mission.id];
  I.mission = undefined;
  I.missionsDone[m.id] = (I.missionsDone[m.id] ?? 0) + 1;
  for (const [k, v] of Object.entries(m.heat) as [SuspectId, number][]) I.heat[k] = clamp(I.heat[k] + v, 0, 100);
  // o que ele achou (se não achou o que procurava, sempre volta com algum segredo ou rumor)
  let d = nextFor(s, m.slots);
  if (!d && m.target) d = nextFor(s, [`seg_${m.target}`], 6);
  if (!d) d = nextFor(s, ['rumor_cidade', 'rumor_norte', 'seg_corvin', 'seg_otho', 'seg_brandt'], 6);
  // alguém notou Pimenta?
  const t = m.target;
  const noticed = rand(s) < m.risk + (t ? I.heat[t] / 400 : 0);
  if (noticed) {
    if (t) I.heat[t] = clamp(I.heat[t] + 15, 0, 100);
    I.pimenta.danger = clamp(I.pimenta.danger + (t === I.murderer ? 20 : 8), 0, 100);
  }
  I.report = { missionId: m.id, evId: d?.id, noticed };
  return m.room;
}

// O rei ouve o relatório
export function takeReport(s: GameState): EvidenceDef | null {
  const I = inv(s);
  const r = I.report;
  if (!r) return null;
  I.report = undefined;
  return r.evId ? discover(s, r.evId, 'Pimenta') : null;
}

// ---------- Interrogatórios ----------
export type AskMode = 'calmo' | 'pressionar' | 'moedas';
export function interrogate(s: GameState, witness: string, mode: AskMode): { ev: EvidenceDef | null; line: string } {
  const I = inv(s);
  const w = WITNESSES.find((x) => x.id === witness);
  if (!w) return { ev: null, line: '' };
  I.interrogated[witness] = (I.interrogated[witness] ?? 0) + 1;
  const ahead = mode === 'pressionar' ? 3 : mode === 'moedas' ? 2 : 1;
  if (mode === 'moedas') s.res.ouro -= 20;
  if (mode === 'pressionar') { addBond(s, witness, { medo: 10, ressentimento: 6 }); I.heat[I.murderer] = clamp(I.heat[I.murderer] + 6, 0, 100); }
  const d = nextFor(s, w.slots, ahead);
  if (d) { discover(s, d.id, w.name); return { ev: d, line: `${w.name} pensa um pouco antes de falar.` }; }
  const nothing = mode === 'pressionar' ? `${w.name} começa a chorar e jura que já contou tudo. Talvez tenha contado.` : `${w.name} não lembra de mais nada por agora. "Se eu lembrar, Majestade, eu mando chamar."`;
  return { ev: null, line: nothing };
}

// ---------- Confrontos ----------
export type ConfrontMode = 'suave' | 'blefe' | 'prova' | 'ameaca' | 'informante';
export function canConfront(s: GameState, id: SuspectId) {
  return suspicion(s)[id] >= 25 && inv(s).found.filter((f) => (EVIDENCE_MAP[f.id]?.points[id] ?? 0) > 0).length >= 2;
}

export function confront(s: GameState, id: SuspectId, mode: ConfrontMode): string {
  const I = inv(s);
  const guilty = I.murderer === id;
  const sus = suspicion(s)[id];
  (I.confronted[id] ??= []).push(mode);
  const name = char(id).name;
  switch (mode) {
    case 'suave': {
      addBond(s, id, { confianca: 2 });
      const a = nextFor(s, [`alibi_${id}`], 6);
      if (a) { discover(s, a.id, name); return `${name} responde com calma. Calma demais? Anotado: ${a.title}.`; }
      return `${name} repete a mesma história, palavra por palavra. Como quem ensaiou.`;
    }
    case 'blefe': {
      I.heat[id] = clamp(I.heat[id] + 15, 0, 100);
      if (guilty && sus >= 35) {
        const slip = nextFor(s, ['metodo', 'boticario', 'jarra', 'melpedido', `contra_${id}`], 6);
        if (slip) { discover(s, slip.id, `${name} (deslize)`); return `Você finge saber mais do que sabe. ${name} empalidece e, para se defender, diz uma coisa que não devia saber. ${slip.title}.`; }
      }
      addBond(s, id, { ressentimento: 5 });
      return guilty ? `${name} não cai no blefe. Mas agora sabe que você está procurando.` : `${name} não entende do que você fala, e fica ofendido por ter sido testado.`;
    }
    case 'prova': {
      I.heat[id] = clamp(I.heat[id] + 30, 0, 100);
      if (guilty) {
        if (sus >= 70) { const d = nextFor(s, ['pagamento', 'chaves'], 6); if (d) discover(s, d.id, name); return `Diante das provas, ${name} não nega. Não confessa. Só diz: "Não fui o único." ${d ? `E deixa escapar: ${d.title}.` : ''}`; }
        destroyOne(s, [], true);
        return `${name} ouve tudo em silêncio e sai. Na mesma noite, alguém queima papéis na lareira. Uma prova a menos.`;
      }
      const sec = nextFor(s, [`seg_${id}`], 6);
      addBond(s, id, { ressentimento: 12, confianca: -8 });
      if (sec) { discover(s, sec.id, name); return `${name} jura inocência, furioso, e para provar que não matou ninguém confessa outra coisa: ${sec.title}.`; }
      return `${name} jura inocência, e pela primeira vez você acredita. Mas ${name.split(' ')[0]} não vai esquecer a acusação.`;
    }
    case 'ameaca': {
      addBond(s, id, { medo: 20, ressentimento: 15, lealdade: -8 });
      I.heat[id] = clamp(I.heat[id] + 25, 0, 100);
      if (guilty && sus >= 55 && rand(s) < 0.4) { I.fled = id; s.flags[`fugiu_${id}`] = true; return `${name} não responde. Ao amanhecer, os aposentos estão vazios. Fugiu. Quem foge confessa, mas agora não há quem julgar.`; }
      return `${name} abaixa os olhos. Medo não é confissão. Mas é alguma coisa.`;
    }
    case 'informante': {
      if (guilty) { I.heat[id] = clamp(I.heat[id] + 20, 0, 100); return `${name} aceita "ajudar" rápido demais. As informações que traz depois apontam para todos, menos para si mesmo.`; }
      I.informant = id;
      addBond(s, id, { confianca: 8, lealdade: 6 });
      if (s.conspiracy.members.includes(id) && !s.conspiracy.turned.includes(id)) s.conspiracy.turned.push(id);
      const d = nextFor(s, ['contra_' + I.murderer, 'pagamento', 'chaves', 'jarra'], 6);
      if (d) discover(s, d.id, `${name} (informante)`);
      return `${name} aceita ajudar, para limpar o próprio nome. ${d ? `A primeira coisa que traz: ${d.title}.` : 'Por enquanto, promete olhos e ouvidos.'}`;
    }
  }
}

// ---------- Acusação formal ----------
export function accuse(s: GameState, id: SuspectId): { title: string; text: string; tone: 'bom' | 'ruim' | 'neutro' } {
  const I = inv(s);
  const conf = suspicion(s)[id];
  const correct = I.murderer === id;
  const name = char(id).name;
  const c = CONFESSION[id];
  let outcome: NonNullable<InvestigationState['accused']>['outcome'];
  let text: string, tone: 'bom' | 'ruim' | 'neutro';
  if (correct && conf >= 60) {
    outcome = 'preso';
    s.res.prestigio = clamp(s.res.prestigio + 12, 0, 100); s.res.povo = clamp(s.res.povo + 6, 0, 100);
    fall(s, id);
    text = `As provas são lidas diante da corte. ${name} não consegue responder. ${c.why} ${c.link}`;
    tone = 'bom';
  } else if (correct) {
    outcome = rand(s) < 0.5 ? 'fugiu' : 'duvida';
    s.res.povo = clamp(s.res.povo - 5, 0, 100);
    if (outcome === 'fugiu') { I.fled = id; s.flags[`fugiu_${id}`] = true; fall(s, id, true); }
    text = outcome === 'fugiu'
      ? `A acusação acerta, mas as provas são poucas. Enquanto a corte discute, ${name} foge pela estrada do norte. Culpado, e livre.`
      : `A acusação acerta, mas as provas são poucas. A corte ri, o povo desconfia do rei e ${name} sai do salão ofendido e intocado. Agora sabe que você sabe.`;
    tone = 'neutro';
  } else {
    outcome = conf >= 60 ? 'inocente_condenado' : 'inocente_solto';
    // a casa (ou a família) do inocente não perdoa
    const house = HOUSE_OF[id];
    if (house) s.loyalty[house] = clamp(s.loyalty[house] - 25, -100, 100);
    if (id === 'isabelle') s.rel.lucas = clamp((s.rel.lucas ?? 0) - 30, -100, 100);
    addBond(s, id, { ressentimento: 40, lealdade: -30 });
    if (outcome === 'inocente_condenado') {
      s.res.prestigio = clamp(s.res.prestigio + 4, 0, 100);
      s.flags[`condenado_${id}`] = true;
      s.scheduled.push({ id: 'verdade_vem_a_tona', day: s.day + 8 + Math.floor(rand(s) * 5) });
      text = `A corte acredita. ${name} é condenado diante de todos, jurando inocência até o fim. O verdadeiro culpado respira aliviado, e o Pacto também.`;
    } else {
      s.res.prestigio = clamp(s.res.prestigio - 10, 0, 100); s.res.povo = clamp(s.res.povo - 6, 0, 100);
      text = `Ninguém acredita. As provas não sustentam a acusação, e ${name} sai do salão como vítima. A cidade fala de um rei que vê assassinos em todo lugar.`;
    }
    // o Pacto aproveita o erro: a queda chega mais cedo
    if (s.conspiracy.fallDay) s.conspiracy.fallDay -= 3;
    tone = 'ruim';
  }
  I.accused = { id, day: s.day, correct, confidence: conf, outcome };
  s.flags.casoEncerrado = outcome === 'preso' || outcome === 'inocente_condenado';
  return { title: `Acusação: ${name}`, text, tone };
}

const HOUSE_OF: Partial<Record<SuspectId, HouseId>> = { brandt: 'drakon', otho: 'montclair' };

// O culpado cai (ou foge): muda a forma da queda do reino
function fall(s: GameState, id: SuspectId, fled = false) {
  const c = s.conspiracy;
  s.flags[`queda_${id}`] = fled ? 'fugiu' : 'preso';
  // sai do conselho
  for (const k of SEAT_IDS) if (s.council.seats[k] === id) s.council.seats[k] = null;
  // o assassino ligado ao Pacto como membro é exposto; os outros revelam quem os usou
  if (s.investigation?.murderer === id && CONFESSION[id].pact === 'membro' && !c.members.includes(id)) c.members.push(id);
  if (c.members.includes(id) && !c.exposed.includes(id)) c.exposed.push(id);
  addClue(s, 'cinco_cadeiras');
  // cada culpado muda a queda de um jeito
  const effects: Record<SuspectId, () => void> = {
    corvin: () => { s.flags.tesouroFiel = true; c.prep.reservas = (c.prep.reservas ?? 0) + 1; },
    brandt: () => { s.flags.exercitoDividido = true; s.loyalty.drakon = clamp(s.loyalty.drakon - 20, -100, 100); },
    isabelle: () => { s.flags.legitimidadeAbalada = true; s.res.prestigio = clamp(s.res.prestigio - 10, 0, 100); s.flags[`ausente_isabelle`] = true; },
    otho: () => { s.flags.pactoSemNorte = true; s.flags.othoDeposto = true; },
    aldric: () => { s.flags.conselhoEmCrise = true; for (const k of SEAT_IDS) { const w = s.council.seats[k]; if (w) s.council.power[w] = clamp((s.council.power[w] ?? 0) - 10, 0, 100); } },
  };
  effects[id]();
  // desmascarar o assassino atrasa o golpe: o Pacto perde uma peça
  if (c.fallDay && !fled) c.fallDay += 5;
}

// Destruir uma prova ainda não encontrada da cadeia do culpado
function destroyOne(s: GameState, entries: LogEntry[], silent = false) {
  const I = inv(s);
  const pool = EVIDENCE.filter((d) => available(s, d) && (d.points[I.murderer] ?? 0) >= 10 && d.phase >= 3 && !d.planted);
  if (!pool.length) return;
  const d = pool[Math.floor(rand(s) * pool.length)];
  I.destroyed.push(d.id);
  if (!silent) entries.push({ icon: 'olho', title: 'Alguém chegou antes', text: 'Pimenta avisa: alguma coisa sumiu antes que ele pudesse ver. Uma gaveta limpa demais, uma lareira ainda quente. Alguém está apagando rastros.', tone: 'ruim' });
}

// ---------- o caso vive sozinho: reações, perigo e vazamento ----------
export function investigationDaily(s: GameState, entries: LogEntry[]) {
  const I = inv(s);
  if (!I.open) return;
  const m = I.murderer;
  for (const k of SUSPECTS) {
    const h = I.heat[k];
    if (h >= 35 && rand(s) < h / 220) {
      if (k === m) {
        const r = rand(s);
        if (r < 0.4) destroyOne(s, entries);
        else if (r < 0.7 && !I.plantedAgainst) {
          const innocent = SUSPECTS.filter((x) => x !== m);
          I.plantedAgainst = innocent[Math.floor(rand(s) * innocent.length)];
          entries.push({ icon: 'olho', title: 'Um boato conveniente', text: `Pela cidade corre um boato novo sobre ${char(I.plantedAgainst).name}. Chegou rápido demais para ser espontâneo.`, tone: 'rumor' });
        } else {
          I.pimenta.danger = clamp(I.pimenta.danger + 20, 0, 100);
          if (!I.pimenta.offered) { I.pimenta.offered = true; s.scheduled.push({ id: 'pimenta_comprado', day: s.day + 1 }); }
          else s.scheduled.push({ id: 'pimenta_ameacado', day: s.day + 1 });
        }
      } else {
        // o inocente percebe e se ofende (ou fica com medo)
        addBond(s, k, { confianca: -3, ressentimento: 2 });
        if (rand(s) < 0.5) entries.push({ icon: 'olho', title: `${char(k).name} desconfia`, text: `${char(k).name} anda olhando para trás nos corredores. Mudou os horários. Alguém contou que o bobo fazia perguntas.`, tone: 'rumor' });
      }
    }
    I.heat[k] = clamp(h - 4, 0, 100); // a atenção esfria
  }
  // Pimenta em perigo
  if (I.pimenta.status !== 'ok' && I.pimenta.until && s.day >= I.pimenta.until) { I.pimenta.status = 'ok'; I.pimenta.until = undefined; entries.push({ icon: 'mascara', title: 'Pimenta voltou', text: 'Pimenta reaparece no salão, com um curativo novo e piadas velhas. "Senti falta do senhor. Da comida, principalmente."', tone: 'bom' }); }
  if (I.pimenta.status === 'ok' && I.pimenta.danger >= 70 && rand(s) < 0.35) {
    I.pimenta.status = 'ferido'; I.pimenta.until = s.day + 4; I.pimenta.danger = 40; I.mission = undefined;
    s.scheduled.push({ id: 'pimenta_ferido', day: s.day + 1 });
  }
  I.pimenta.danger = clamp(I.pimenta.danger - 2, 0, 100);
  // o boato vaza para a cidade
  const noise = I.found.length + Object.values(I.interrogated).reduce((a, b) => a + b, 0);
  if (!I.leaked && s.day >= 10 && noise >= 8 && rand(s) < 0.18) {
    I.leaked = s.day;
    s.flags.boatoAssassinato = true;
    entries.push({ icon: 'povo', title: 'O boato vazou', text: 'Na cidade baixa, alguém escreveu num muro: "QUEM MATOU O REI?". Amanhã haverá gente diante dos portões.', tone: 'ruim' });
  }
}

// Para a interface: o que cada evidência aponta
export function evidencePoints(d: EvidenceDef) {
  return Object.entries(d.points).filter(([, v]) => v !== 0) as [SuspectId, number][];
}
