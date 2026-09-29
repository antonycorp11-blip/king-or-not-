import type { Choice, GameEvent, GameState, MoodDelta, MoodLabel } from '../types';

// O humor do rei não é escolhido: ele se acumula com o que acontece. Quatro
// dimensões internas (alegria, raiva, estresse, cansaço) produzem um estado
// legível, que muda posturas, falas dos outros e as respostas disponíveis.
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const MOOD_NAMES: Record<MoodLabel, string> = {
  sereno: 'sereno', satisfeito: 'satisfeito', esperancoso: 'esperançoso', cansado: 'cansado',
  preocupado: 'preocupado', triste: 'triste', irritado: 'irritado', furioso: 'furioso', abalado: 'abalado',
};

// Como a corte percebe o rei (texto diegético, nunca uma barra)
export const MOOD_LOOK: Record<MoodLabel, string> = {
  sereno: 'O rei parece em paz consigo mesmo.',
  satisfeito: 'O rei está de bom humor. Os criados notam.',
  esperancoso: 'Há um brilho nos olhos do rei hoje.',
  cansado: 'O rei boceja entre uma frase e outra.',
  preocupado: 'O rei tamborila os dedos no braço do trono.',
  triste: 'O rei mal toca na comida.',
  irritado: 'O rei responde mais curto que o normal.',
  furioso: 'Ninguém ousa olhar o rei nos olhos.',
  abalado: 'As mãos do rei ainda tremem.',
};

export function moodLabel(s: GameState): MoodLabel {
  const m = s.mood;
  if (m.stress >= 75 && m.joy < -10) return 'abalado';
  if (m.anger >= 70) return 'furioso';
  if (m.anger >= 40) return 'irritado';
  if (m.fatigue >= 70) return 'cansado';
  if (m.joy <= -40) return 'triste';
  if (m.stress >= 55) return 'preocupado';
  if (m.joy >= 45 && m.stress < 40) return 'esperancoso';
  if (m.joy >= 18) return 'satisfeito';
  return 'sereno';
}

export function applyMood(s: GameState, d: MoodDelta | undefined) {
  if (!d) return;
  const m = s.mood;
  if (d.joy) m.joy = clamp(m.joy + d.joy, -100, 100);
  if (d.anger) m.anger = clamp(m.anger + d.anger, 0, 100);
  if (d.stress) m.stress = clamp(m.stress + d.stress, 0, 100);
  if (d.fatigue) m.fatigue = clamp(m.fatigue + d.fatigue, 0, 100);
  if (d.why) {
    m.memo.push({ day: s.day, text: d.why });
    if (m.memo.length > 12) m.memo.splice(0, m.memo.length - 12);
  }
}

// O tempo passa: a raiva esfria, o corpo cansa.
export function moodHours(s: GameState, hours: number, activity: 'trabalho' | 'andar' | 'descanso' = 'trabalho') {
  const m = s.mood;
  m.anger = clamp(m.anger - 4 * hours, 0, 100);
  m.stress = clamp(m.stress - (activity === 'descanso' ? 6 : 0.5) * hours, 0, 100);
  m.fatigue = clamp(m.fatigue + (activity === 'trabalho' ? 4.5 : activity === 'andar' ? 1.5 : -12) * hours, 0, 100);
}

// A noite de sono: cansaço some (em parte), a alegria volta devagar ao "normal" do reino.
export function moodSleep(s: GameState, baseline: number, restless: boolean) {
  const m = s.mood;
  m.fatigue = restless ? 40 : s.war && !s.war.result ? 25 : 8;
  m.anger = clamp(m.anger * 0.35, 0, 100);
  m.stress = clamp(m.stress * 0.85 + (restless ? 8 : 0), 0, 100);
  m.joy = Math.round(m.joy + (baseline - m.joy) * 0.35);
}

// Reação ao fim de uma audiência: conversas tensas deixam marca.
export function moodAfterAudience(s: GameState, tension: number, choice: Choice | undefined) {
  if (tension >= 60) applyMood(s, { anger: Math.round((tension - 50) / 3), stress: 3 });
  if (choice?.color === 'vermelho') applyMood(s, { anger: -8 }); // descarregar alivia (e custa)
  if (choice?.color === 'verde') applyMood(s, { joy: 3 });
}

// ---------- efeito nas respostas ----------
// Cada humor fecha algumas portas e abre outras. O jogador vê a porta fechada e o porquê.
const LOCKS: Partial<Record<MoodLabel, { colors: Choice['color'][]; why: string }>> = {
  furioso: { colors: ['azul', 'verde'], why: 'Furioso demais para isso' },
  abalado: { colors: ['vermelho'], why: 'Abalado demais para impor autoridade' },
  cansado: { colors: ['roxo'], why: 'Cansado demais para sutilezas' },
};

export function moodAdjust(s: GameState, ev: GameEvent, choices: Choice[]): Choice[] {
  const label = moodLabel(s);
  const lock = LOCKS[label];
  const out = choices.map((ch) => {
    if (ch.req?.mood && !ch.req.mood.includes(label)) return ch;
    if (!lock || !lock.colors.includes(ch.color) || ch.goto || ch.who) return ch;
    // Só trava quando ainda sobra outra saída viável.
    return { ...ch, req: { ...(ch.req ?? {}), test: () => false, label: lock.why } };
  });
  // Nunca deixar o jogador sem nenhuma saída aberta
  const open = out.filter((c) => !(c.req?.test && c.req.label === lock?.why));
  const extra = outburstFor(s, ev, label);
  if (!open.length) return extra ? [...choices, extra] : choices;
  return extra ? [...out, extra] : out;
}

// Respostas que só existem por causa do humor
function outburstFor(s: GameState, ev: GameEvent, label: MoodLabel): Choice | null {
  if (ev.kind === 'reuniao' || ev.kind === 'noite') return null;
  const personal = ev.domain === 'pessoal' || ev.kind === 'familia' || ev.speaker === s.spouse;
  const who = ev.speaker;
  if (label === 'furioso') {
    return personal
      ? { label: 'Gritar', sub: 'A raiva fala mais alto', color: 'vermelho', icon: 'balao', outburst: true, tension: 25,
          effects: { rel: { [who]: -12 }, bond: { [who]: { ressentimento: 12, medo: 8 } }, mood: { anger: -30, joy: -8, why: `Gritou com ${who}` }, xp: 4 },
          reply: 'As palavras saem antes de você pensar. O silêncio depois delas é pior que qualquer resposta.' }
      : { label: 'Prendam-no!', sub: 'Fúria real', color: 'vermelho', icon: 'cadeado', outburst: true, tension: 30,
          effects: { res: { prestigio: 2, povo: -2 }, rel: { [who]: -18 }, bond: { [who]: { medo: 20, ressentimento: 15 } }, mood: { anger: -35, why: 'Mandou prender alguém num acesso de fúria' }, xp: 4 },
          reply: 'Os guardas hesitam um instante, e então obedecem. A corte inteira aprende hoje o que acontece quando o rei perde a paciência.' };
  }
  if (label === 'irritado' && !personal) {
    return { label: 'Resumir: seja breve', sub: 'Impaciência', color: 'vermelho', icon: 'ampulheta', outburst: true, tension: 10,
      effects: { rel: { [who]: -5 }, mood: { anger: -10 }, xp: 3 },
      reply: 'Você corta a conversa pela metade. O assunto fica resolvido pela metade também.' };
  }
  if (label === 'abalado') {
    return { label: 'Pedir um momento', sub: 'Adiar para amanhã', color: 'azul', icon: 'ampulheta', outburst: true,
      effects: { mood: { stress: -10, why: 'Precisou de um momento sozinho' }, schedule: [{ id: ev.id, in: 1 }], xp: 2 },
      reply: '"Amanhã", você diz, e a voz quase falha. A pessoa se curva e sai. Alguns entendem. Outros espalham.' };
  }
  return null;
}

// Bônus pequenos que o bom humor traz
export function moodXpMul(s: GameState) {
  const l = moodLabel(s);
  return l === 'esperancoso' ? 1.2 : l === 'satisfeito' ? 1.1 : 1;
}

// Linhas que os outros dizem sobre o humor do rei (dão vida ao castelo)
export function moodRemark(s: GameState): string | null {
  switch (moodLabel(s)) {
    case 'furioso': return 'Melhor não chamar a atenção dele hoje.';
    case 'irritado': return 'O rei acordou com o pé esquerdo.';
    case 'cansado': return 'Ele não dorme direito, dá pra ver.';
    case 'triste': return 'Coitado do rei. Tão novo e tão sozinho.';
    case 'abalado': return 'Ainda falam do que aconteceu. Ele ficou branco.';
    case 'esperancoso': return 'O rei sorriu pra mim! Hoje é um bom dia.';
    case 'preocupado': return 'Ele anda de um lado pro outro. Coisa boa não é.';
    default: return null;
  }
}
