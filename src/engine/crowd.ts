import type { GameState, HouseId, LogEntry } from '../types';
import { GROUPS, REASONS, CLASH, TONE_AFFINITY, stagesFor, type CrowdReason, type Group, type Reaction, type SpeechKind, type SpeechOption, type Tone } from '../data/speeches';
import { applyEffect, clamp, rand } from './core';

// A PRAÇA DA COROA
// A opinião pública não é um número só: são cinco grupos, cada um com o seu
// humor. O que o rei faz no castelo mexe com a base; o que ele diz na varanda
// mexe com o "viés" (que esfria com os dias). Anúncios importantes ficam
// pendentes até o rei falar, e custam caro se ele se calar.

export type CrowdMood = 'celebrando' | 'satisfeita' | 'curiosa' | 'preocupada' | 'insatisfeita' | 'hostil' | 'furiosa' | 'emocionada';
export interface Pending { kind: SpeechKind; since: number }
export interface Spontaneous { reason: CrowdReason; day: number; size: number; handled?: string }
export interface LiveSpeech { kind: SpeechKind; stage: number; picks: number[]; spont?: boolean; day: number }
export interface CrowdState {
  bias: Record<Group, number>; // o que os discursos somaram (−30..30), esfria 15% ao dia
  cred: number; // credibilidade do rei na varanda (0..100)
  pending: Pending[];
  spont?: Spontaneous;
  live?: LiveSpeech;
  done: CrowdReason[]; // multidões únicas que já aconteceram
  lawsSeen: number;
  taxSeen: string;
  lastSpont?: number;
}
export interface SpeechRecord { day: number; kind: SpeechKind; score: number; verdict: Verdict; tones: Tone[]; spont?: boolean }
export type Verdict = 'triunfo' | 'bom' | 'morno' | 'fracasso' | 'desastre';

// Tamanho relativo de cada grupo na praça
export const GROUP_SHARE: Record<Group, number> = { povo: 0.6, mercadores: 0.12, soldados: 0.1, religiosos: 0.08, nobres: 0.1 };

export function crowd(s: GameState): CrowdState {
  const c = (s.crowd ??= {} as CrowdState);
  c.bias ??= { povo: 0, mercadores: 0, soldados: 0, religiosos: 0, nobres: 0 };
  c.cred ??= 60;
  c.pending ??= [];
  c.done ??= [];
  c.lawsSeen ??= s.laws.length;
  c.taxSeen ??= s.taxes.coroa;
  s.speeches ??= [];
  return c;
}

const avgLoyalty = (s: GameState) => (Object.values(s.loyalty) as number[]).reduce((a, b) => a + b, 0) / 4;

// O que cada grupo pensa do rei agora (0..100)
export function opinion(s: GameState): Record<Group, number> {
  const c = crowd(s);
  const tax = s.taxes.coroa === 'alto' ? -10 : s.taxes.coroa === 'baixo' ? 4 : 0;
  const base: Record<Group, number> = {
    povo: s.res.povo,
    mercadores: 50 + s.loyalty.valmont / 4 + tax + (s.flags.contasPublicas ? 6 : 0),
    soldados: s.res.moral + (s.war && !s.war.result && !s.flags.guerraDeclarada ? -10 : 0),
    religiosos: 50 + s.loyalty.seren / 2 + (s.flags.sangueNaPraca ? -12 : 0),
    nobres: 50 + avgLoyalty(s) / 2,
  };
  const out = {} as Record<Group, number>;
  for (const g of GROUPS) out[g] = Math.round(clamp(base[g] + c.bias[g], 0, 100));
  return out;
}

export function average(op: Record<Group, number>) {
  return GROUPS.reduce((a, g) => a + op[g] * GROUP_SHARE[g], 0);
}

export function moodOf(s: GameState): CrowdMood {
  const c = crowd(s);
  if (c.spont && !c.spont.handled) return REASONS[c.spont.reason].mood;
  const a = average(opinion(s));
  if (a >= 75) return 'celebrando';
  if (a >= 60) return 'satisfeita';
  if (a >= 48) return 'curiosa';
  if (a >= 38) return 'preocupada';
  if (a >= 25) return 'insatisfeita';
  return 'hostil';
}
export const MOOD_NAME: Record<CrowdMood, string> = { celebrando: 'em festa', satisfeita: 'satisfeita', curiosa: 'curiosa', preocupada: 'preocupada', insatisfeita: 'insatisfeita', hostil: 'hostil', furiosa: 'furiosa', emocionada: 'emocionada' };

// Quanta gente vem ouvir o rei
export function crowdSize(s: GameState): number {
  const c = crowd(s);
  if (c.live?.spont && c.spont) return c.spont.size;
  const pend = c.pending.length ? 60 : 0;
  return Math.round(clamp(60 + s.res.povo * 2 + s.res.prestigio * 2 + pend, 50, 500));
}

// ---------- o discurso ----------
// O que uma resposta faz com cada grupo (o conteúdo + o tom)
export function optionImpact(o: SpeechOption): Record<Group, number> {
  const out = {} as Record<Group, number>;
  for (const g of GROUPS) {
    let v = o.groups[g] ?? 0;
    for (const t of o.tones) v += (TONE_AFFINITY[g][t] ?? 0) * 1.5;
    out[g] = v;
  }
  return out;
}

// Como cada grupo reage, na hora, a uma resposta
export function groupReaction(g: Group, delta: number, mood: CrowdMood, base: Reaction): Reaction {
  if (delta >= 5) return g === 'soldados' ? 'escudos' : base === 'lenços' && g === 'religiosos' ? 'lenços' : delta >= 9 ? 'gritos' : 'aplausos';
  if (delta <= -5) return (mood === 'hostil' || mood === 'furiosa') && g === 'povo' ? 'objetos' : 'vaias';
  if (delta <= -2) return 'murmurios';
  return base === 'silencio' ? 'silencio' : 'murmurios';
}

export interface SpeechResult { groups: Record<Group, number>; score: number; verdict: Verdict; clashes: [Tone, Tone][]; tones: Tone[] }

export function evaluate(s: GameState, kind: SpeechKind, picks: number[]): SpeechResult {
  const c = crowd(s);
  const stages = stagesFor(kind);
  const opts = picks.map((p, i) => stages[i]?.options[p]).filter(Boolean) as SpeechOption[];
  const groups = { povo: 0, mercadores: 0, soldados: 0, religiosos: 0, nobres: 0 } as Record<Group, number>;
  const tones = new Set<Tone>();
  for (const o of opts) {
    const im = optionImpact(o);
    for (const g of GROUPS) groups[g] += im[g];
    o.tones.forEach((t) => tones.add(t));
  }
  // tons contraditórios: o povo percebe
  const clashes = CLASH.filter(([a, b]) => tones.has(a) && tones.has(b));
  for (const g of GROUPS) groups[g] -= clashes.length * 6;
  // coerência: um discurso que insiste num tom convence mais
  const counts: Partial<Record<Tone, number>> = {};
  for (const o of opts) for (const t of o.tones) counts[t] = (counts[t] ?? 0) + 1;
  const main = Math.max(0, ...Object.values(counts).map(Number));
  const coherence = main >= 3 ? 1.15 : 1;
  const credMul = 0.6 + c.cred / 125;
  const mood = moodOf(s);
  const hard = mood === 'hostil' || mood === 'furiosa' ? 0.8 : 1;
  for (const g of GROUPS) groups[g] = Math.round(groups[g] * (groups[g] > 0 ? credMul * coherence * hard : 1));
  const score = Math.round(GROUPS.reduce((a, g) => a + groups[g] * GROUP_SHARE[g], 0) * 2);
  const verdict: Verdict = score >= 55 ? 'triunfo' : score >= 28 ? 'bom' : score >= 8 ? 'morno' : score >= -8 ? 'fracasso' : 'desastre';
  return { groups, score, verdict, clashes, tones: [...tones] };
}

export const VERDICT_TEXT: Record<Verdict, string> = {
  triunfo: 'A praça inteira grita o nome do rei. Vão contar esse discurso aos netos.',
  bom: 'Aplausos longos. A maioria volta para casa do lado do rei.',
  morno: 'Aplausos educados, murmúrios. Ninguém saiu convencido, ninguém saiu com raiva.',
  fracasso: 'A multidão se dispersa resmungando. O discurso não chegou onde devia.',
  desastre: 'Vaias, gritos, alguém atira um repolho. Os guardas fecham os portões mais cedo.',
};

// Conta os passos de um discurso ao vivo (tela da praça)
export function startSpeech(s: GameState, kind: SpeechKind, spont = false) {
  crowd(s).live = { kind, stage: 0, picks: [], spont, day: s.day };
}

export function availableKinds(s: GameState): SpeechKind[] {
  const c = crowd(s);
  const kinds = new Set<SpeechKind>(c.pending.map((p) => p.kind));
  kinds.add('geral');
  return [...kinds];
}

export function spokeToday(s: GameState) {
  return (s.speeches ?? []).some((r) => r.day === s.day);
}

export function finishSpeech(s: GameState): SpeechResult & { lines: string[] } {
  const c = crowd(s);
  const live = c.live!;
  const r = evaluate(s, live.kind, live.picks);
  const stages = stagesFor(live.kind);
  const lines: string[] = [];
  // os efeitos de cada frase (promessas, flags)
  live.picks.forEach((p, i) => { const o = stages[i]?.options[p]; if (o?.effects) applyEffect(s, o.effects); });
  // o viés da praça
  for (const g of GROUPS) c.bias[g] = clamp(c.bias[g] + Math.round(r.groups[g] * 0.6), -30, 30);
  const add = (h: HouseId, v: number) => (s.loyalty[h] = clamp(s.loyalty[h] + Math.round(v), -100, 100));
  s.res.povo = clamp(s.res.povo + Math.round(r.groups.povo / 6), 0, 100);
  s.res.moral = clamp(s.res.moral + Math.round(r.groups.soldados / 5), 0, 100);
  s.res.prestigio = clamp(s.res.prestigio + Math.round(r.score / 10), 0, 100);
  add('seren', r.groups.religiosos / 5);
  add('valmont', r.groups.mercadores / 6);
  for (const h of ['valmont', 'drakon', 'seren', 'montclair'] as HouseId[]) add(h, r.groups.nobres / 10);
  // credibilidade
  if (r.clashes.length) { c.cred = clamp(c.cred - 6 * r.clashes.length, 0, 100); lines.push('Os tons do discurso brigaram entre si. Quem prestou atenção percebeu.'); }
  if (r.tones.includes('honesto') && !r.clashes.length) c.cred = clamp(c.cred + 4, 0, 100);
  if (s.flags.promessaVazia && !s.flags.promessaVaziaVista) { s.flags.promessaVaziaVista = true; s.flags.promessaVaziaDia = s.day; }
  // o que este anúncio resolve
  const k = live.kind;
  if (k === 'guerra') { s.flags.guerraDeclarada = s.day; lines.push('A guerra agora tem a voz do rei. O recrutamento volta ao normal.'); }
  if (k === 'rainha') { s.flags.rainhaApresentada = s.day; s.flags.rainhaImagem = Number(s.flags.rainhaImagem ?? 0) + (r.verdict === 'triunfo' ? 15 : r.verdict === 'bom' ? 8 : r.verdict === 'desastre' ? -10 : 0); if (s.spouse) s.rel[s.spouse] = clamp((s.rel[s.spouse] ?? 0) + (r.score > 0 ? 6 : -4), -100, 100); }
  if (k === 'impostos') s.flags.impostoAnunciado = s.day;
  if (k === 'caso') s.flags.casoFalado = s.day;
  if (k === 'paz') s.flags.pazAnunciada = s.day;
  if (k === 'execucao') s.flags.execucaoAnunciada = s.day;
  c.pending = c.pending.filter((p) => p.kind !== k);
  // o Pacto e a queda: a praça é a última muralha do rei
  const cons = s.conspiracy;
  if (r.verdict === 'triunfo') {
    s.flags.povoComORei = Number(s.flags.povoComORei ?? 0) + 1;
    if (cons.fallDay) { cons.fallDay += 1; lines.push('Nos salões, alguém do Pacto comenta que o povo gosta demais deste rei.'); }
  }
  if (r.verdict === 'desastre') {
    s.flags.pracaPerdida = Number(s.flags.pracaPerdida ?? 0) + 1;
    if (cons.fallDay) cons.fallDay -= 2;
    for (const m of cons.members) cons.prep[m] = (cons.prep[m] ?? 0) + 2;
    lines.push('O Pacto viu o rei ser vaiado. Para quem conspira, isso é um convite.');
  }
  // um discurso populista contra os nobres empurra os nobres do Pacto
  if (r.groups.nobres <= -10) for (const m of cons.members) cons.prep[m] = (cons.prep[m] ?? 0) + 1;
  if (c.spont && !c.spont.handled && (live.spont || speechForReason(s, c.spont.reason) === k)) { c.spont.handled = 'falou'; if (!c.done.includes(c.spont.reason)) c.done.push(c.spont.reason); }
  s.speeches!.push({ day: s.day, kind: k, score: r.score, verdict: r.verdict, tones: r.tones, spont: live.spont });
  if (s.speeches!.length > 30) s.speeches!.splice(0, s.speeches!.length - 30);
  s.log.push({ icon: 'povo', title: `Pronunciamento: ${r.verdict}`, text: VERDICT_TEXT[r.verdict], tone: r.score >= 4 ? 'bom' : 'ruim' });
  c.live = undefined;
  return { ...r, lines };
}

// ---------- multidões espontâneas: as seis respostas ----------
export type CrowdResponse = 'falar' | 'conselho' | 'representante' | 'soldados' | 'portoes' | 'ignorar';
const FESTIVE = new Set(['celebrando', 'emocionada']);

export function speechForReason(s: GameState, r: CrowdReason): SpeechKind {
  switch (r) {
    case 'boato': return 'caso';
    case 'impostos': return 'impostos';
    case 'guerra': return 'guerra';
    case 'vitoria': case 'derrota': return s.war?.result ? 'paz' : 'geral';
    case 'casamento': return s.spouse && !s.flags.rainhaApresentada ? 'rainha' : 'geral';
    case 'execucao': return 'execucao';
    case 'herdeiro': return 'geral';
    default: return 'multidao';
  }
}

export function respondCrowd(s: GameState, mode: CrowdResponse): string {
  const c = crowd(s);
  const sp = c.spont;
  if (!sp) return 'A praça já está vazia.';
  const R = REASONS[sp.reason];
  const festive = FESTIVE.has(R.mood);
  const angry = R.mood === 'hostil' || R.mood === 'furiosa';
  const done = (tag: string) => { sp.handled = tag; if (!c.done.includes(sp.reason)) c.done.push(sp.reason); };
  const povo = (v: number) => { s.res.povo = clamp(s.res.povo + v, 0, 100); c.bias.povo = clamp(c.bias.povo + v, -30, 30); };
  switch (mode) {
    case 'falar':
      startSpeech(s, speechForReason(s, sp.reason), true);
      return 'O rei sobe à varanda. A multidão se vira, e o barulho muda de tom.';
    case 'conselho': {
      done('conselho');
      const id = s.council.seats.chanceler;
      if (id) s.council.power[id] = clamp((s.council.power[id] ?? 0) + 3, 0, 100);
      povo(festive ? 1 : angry ? -3 : -1);
      return festive ? 'O Chanceler lê uma saudação do rei. Aplausos educados; queriam ver o rei.' : 'O Chanceler fala em nome do rei. A multidão escuta, mas alguém grita: "E o rei, tem medo da gente?"';
    }
    case 'representante': {
      done('representante');
      const queen = s.spouse;
      if (queen) {
        s.flags.rainhaImagem = Number(s.flags.rainhaImagem ?? 0) + (angry ? 2 : 8);
        povo(festive ? 4 : angry ? -1 : 2);
        return festive ? 'A rainha desce à praça sem guarda. Uma menina lhe dá flores. O povo adora.' : 'A rainha fala pelo rei. Ouvem com respeito, mas a pergunta continua no ar.';
      }
      povo(festive ? 2 : -2);
      return 'A rainha-mãe Isabelle aparece na varanda, fria como sempre. A multidão se acalma, por medo mais que por amor.';
    }
    case 'soldados': {
      done('soldados');
      if (festive) { povo(-6); s.res.prestigio = clamp(s.res.prestigio - 2, 0, 100); return 'Soldados empurram uma multidão em festa. Ninguém entende por quê. A festa vira mágoa.'; }
      povo(angry ? -10 : -6);
      s.res.moral = clamp(s.res.moral - 3, 0, 100);
      s.res.prestigio = clamp(s.res.prestigio + 2, 0, 100);
      s.flags.sangueNaPraca = s.day;
      c.cred = clamp(c.cred - 8, 0, 100);
      if (sp.reason === 'boato' && s.conspiracy.fallDay) s.conspiracy.fallDay -= 2;
      return sp.reason === 'boato' ? 'Os soldados limpam a praça. À noite, a pergunta está pichada em três muros: "QUEM MATOU O REI?". Agora com uma segunda linha: "E POR QUE O FILHO ESCONDE?"' : 'Escudos, empurrões, gente pisoteada. A praça esvazia. Fica o sangue nas pedras, e a memória.';
    }
    case 'portoes': {
      done('portoes');
      povo(angry ? -6 : -3);
      s.res.prestigio = clamp(s.res.prestigio - 2, 0, 100);
      return 'Os portões se fecham com um estrondo. Do lado de fora, a multidão grita por horas. Do lado de dentro, ninguém dorme.';
    }
    case 'ignorar': default: {
      done('ignorar');
      povo(festive ? -3 : angry ? -8 : -5);
      s.res.prestigio = clamp(s.res.prestigio - (festive ? 3 : 2), 0, 100);
      if (sp.reason === 'boato' && s.conspiracy.fallDay) s.conspiracy.fallDay -= 1;
      return festive ? 'A praça esperou o rei o dia inteiro. Ele não apareceu. As flores murcham nas pedras.' : 'O rei não aparece. A multidão vai embora sozinha, e leva a raiva para casa.';
    }
  }
}

// ---------- o dia a dia da opinião pública ----------
export function crowdDaily(s: GameState, entries: LogEntry[]) {
  const c = crowd(s);
  for (const g of GROUPS) c.bias[g] = Math.trunc(c.bias[g] * 0.85);
  // discurso começado e abandonado
  if (c.live) c.live = undefined;
  // multidão espontânea que ficou sem resposta
  if (c.spont && !c.spont.handled && c.spont.day <= s.day) respondCrowd(s, 'ignorar');
  if (c.spont && c.spont.handled && c.spont.day < s.day) c.spont = undefined;

  // --- anúncios que o reino espera ouvir ---
  const want = (kind: SpeechKind, cond: boolean) => {
    const has = c.pending.some((p) => p.kind === kind);
    if (cond && !has) c.pending.push({ kind, since: s.day });
    if (!cond && has) c.pending = c.pending.filter((p) => p.kind !== kind);
  };
  const war = s.war && !s.war.result;
  want('guerra', !!war && !s.flags.guerraDeclarada);
  want('paz', !!s.war?.result && !s.flags.pazAnunciada);
  want('rainha', !!s.spouse && !s.flags.rainhaApresentada);
  if (s.taxes.coroa === 'alto' && c.taxSeen !== 'alto') s.flags.impostoAnunciado = false;
  c.taxSeen = s.taxes.coroa;
  want('impostos', s.taxes.coroa === 'alto' && !s.flags.impostoAnunciado);
  if (s.laws.length > c.lawsSeen) want('reforma', true);
  c.lawsSeen = s.laws.length;
  const acc = s.investigation?.accused;
  want('execucao', !!acc && !s.flags.execucaoAnunciada);
  want('caso', !!s.flags.boatoAssassinato && !s.flags.casoFalado);

  // --- o preço do silêncio ---
  for (const p of c.pending) {
    const late = s.day - p.since;
    if (p.kind === 'guerra') {
      // guerra sem declaração: moral cai e o recrutamento emperra
      s.res.moral = clamp(s.res.moral - 1, 0, 100);
      if (late === 2) entries.push({ icon: 'escudo', title: 'Uma guerra sem voz', text: 'Os soldados marcham sem que o rei tenha dito uma palavra ao povo. O recrutamento emperra e a moral cai. Vá à portaria do pátio e fale na Praça da Coroa.', tone: 'ruim' });
    } else if (late >= 3) {
      if (p.kind === 'impostos') s.res.povo = clamp(s.res.povo - 1, 0, 100);
      if (p.kind === 'rainha') s.flags.rainhaImagem = Number(s.flags.rainhaImagem ?? 0) - 2;
      if (p.kind === 'caso') s.res.povo = clamp(s.res.povo - 1, 0, 100);
    }
    if (late === 3 && p.kind !== 'guerra') entries.push({ icon: 'povo', title: 'O povo espera ouvir o rei', text: PENDING_TEXT[p.kind], tone: 'rumor' });
  }
  // promessa vazia: o povo cobra
  if (s.flags.promessaVazia && s.flags.promessaVaziaDia && s.day - Number(s.flags.promessaVaziaDia) === 6 && s.taxes.coroa !== 'baixo') {
    c.cred = clamp(c.cred - 12, 0, 100);
    s.res.povo = clamp(s.res.povo - 6, 0, 100);
    entries.push({ icon: 'povo', title: 'A promessa cobrada', text: 'O rei prometeu na praça que ninguém pagaria mais imposto. Os coletores passaram mesmo assim. A palavra do rei vale menos agora.', tone: 'ruim' });
  }

  // --- multidões espontâneas ---
  if (c.spont || s.scheduled.some((x) => x.id === 'multidao_praca')) return;
  const reason = pickReason(s);
  if (!reason) return;
  const R = REASONS[reason];
  c.spont = { reason, day: s.day + 1, size: Math.round(clamp(R.size * (0.8 + rand(s) * 0.3), 50, 520)) };
  c.lastSpont = s.day;
  s.scheduled.push({ id: 'multidao_praca', day: s.day + 1 });
  entries.push({ icon: 'povo', title: 'A cidade se agita', text: RUMOR_TEXT[reason], tone: 'rumor' });
}

const PENDING_TEXT: Record<SpeechKind, string> = {
  geral: 'A praça quer ver o rei.',
  rainha: 'A cidade ainda não viu a rainha na varanda. Já dizem que ela se esconde, ou que o rei a esconde.',
  guerra: 'A guerra continua sem uma palavra do rei.',
  impostos: 'O imposto subiu e ninguém explicou por quê. Nos mercados, a raiva cresce.',
  caso: 'O boato sobre a morte de Odran corre a cidade, e o rei não disse nada.',
  multidao: 'A praça quer respostas.',
  paz: 'A guerra acabou, mas ninguém anunciou a paz. As mães ainda não sabem se os filhos voltam.',
  execucao: 'Um grande nome foi acusado, e a cidade quer ouvir do rei o porquê.',
  reforma: 'Uma lei nova foi assinada e o povo ainda não sabe o que muda.',
};
const RUMOR_TEXT: Record<CrowdReason, string> = {
  fome: 'Nas padarias, o pão acabou antes do meio-dia. Amanhã, dizem, vão bater panelas diante do castelo.',
  impostos: 'Os mercadores combinam fechar as bancas amanhã e marchar até o castelo.',
  vitoria: 'A notícia da vitória corre as ruas. Amanhã a cidade inteira vem à praça.',
  derrota: 'As mães dos soldados combinam ir ao castelo amanhã.',
  boato: 'Nas tavernas só se fala numa coisa: o rei Odran foi assassinado? Amanhã, dizem, a praça vai perguntar.',
  casamento: 'A cidade se enfeita. Amanhã todos querem ver o rei e a rainha.',
  herdeiro: 'O sino da capela ainda ecoa. Amanhã a praça vai transbordar.',
  escandalo: 'O escândalo do castelo virou conversa de feira. Amanhã, curiosos vão à praça.',
  execucao: 'A acusação correu a cidade. Amanhã a praça quer ver o rei.',
  guerra: 'A guerra começou e o rei não disse nada. Amanhã a praça vai pedir que ele fale.',
};

function pickReason(s: GameState): CrowdReason | null {
  const c = crowd(s);
  const once = (r: CrowdReason) => !c.done.includes(r);
  const cool = c.lastSpont === undefined || s.day - c.lastSpont >= 4;
  // os grandes momentos não esperam
  if (s.flags.boatoAssassinato && once('boato') && !s.flags.casoFalado) return 'boato';
  if (s.war?.result && once('vitoria') && once('derrota')) return s.war.result === 'derrota' ? 'derrota' : 'vitoria';
  if (s.spouse && once('casamento') && s.day - Number(s.flags.casamentoDia ?? s.day) <= 2) return 'casamento';
  if (s.flags.herdeiro && once('herdeiro')) return 'herdeiro';
  if (s.investigation?.accused && once('execucao')) return 'execucao';
  if (!cool) return null;
  const pend = (k: SpeechKind) => c.pending.find((p) => p.kind === k);
  const g = pend('guerra');
  if (g && s.day - g.since >= 2 && once('guerra')) return 'guerra';
  const t = pend('impostos');
  if (t && s.day - t.since >= 2 && rand(s) < 0.45) return 'impostos';
  if (s.res.povo < 30 && (s.granary ?? 0) < 10 && rand(s) < 0.35) return 'fome';
  if (s.flags.escandalo && once('escandalo') && rand(s) < 0.5) return 'escandalo';
  return null;
}

// A tela da praça precisa das etapas do discurso ao vivo
export function liveStage(s: GameState) {
  const live = crowd(s).live;
  if (!live) return null;
  const stages = stagesFor(live.kind);
  return { live, stages, stage: stages[live.stage] ?? null };
}

export function pickStage(s: GameState, idx: number): { option: SpeechOption; impact: Record<Group, number> } | null {
  const L = liveStage(s);
  if (!L || !L.stage) return null;
  const option = L.stage.options[idx];
  if (!option) return null;
  L.live.picks.push(idx);
  L.live.stage++;
  return { option, impact: optionImpact(option) };
}
