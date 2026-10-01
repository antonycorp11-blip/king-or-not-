import { sound } from '../../audio/sound';
import type { App } from '../app';
import { GROUPS, GROUP_INFO, REASONS, SPEECH_NAME, TONE_NAME, type Group, type Reaction, type SpeechKind } from '../../data/speeches';
import { availableKinds, crowd, crowdSize, finishSpeech, groupReaction, liveStage, moodOf, MOOD_NAME, opinion, optionImpact, pickStage, spokeToday, startSpeech, type SpeechResult } from '../../engine/crowd';
import { squareView, REACTION_NAME } from '../../render/square';
import { save } from '../../engine/core';
import { canSpend, spendHours } from '../../engine/day';
import { iconImg } from '../../render/pixel';
import { esc, txt } from '../common';

// A PRAÇA DA COROA
// O rei na varanda, a multidão lá embaixo. Cada frase do discurso é escolhida
// ao vivo, e cada grupo reage na hora, do seu jeito.

let said = '';
let reacts: { g: Group; r: Reaction }[] = [];
let result: (SpeechResult & { lines: string[]; kind: SpeechKind }) | null = null;

const KIND_WHY: Record<SpeechKind, string> = {
  coroacao: 'A cidade quer conhecer o novo rei. A primeira impressão é a que fica.',
  geral: 'Falar ao povo sem motivo especial. Bom para ganhar apoio quando a praça está calma.',
  rainha: 'A cidade ainda não viu a rainha na varanda. A primeira impressão dela depende do rei.',
  guerra: 'A guerra começou sem uma palavra do rei. Enquanto ele não falar, a moral cai e o recrutamento emperra.',
  impostos: 'O imposto da capital subiu. Explicar agora dói menos do que o boato depois.',
  caso: 'A cidade pergunta quem matou o rei Odran. O que o rei disser muda o caso, e o Pacto está ouvindo.',
  multidao: 'A multidão está diante dos portões esperando uma resposta.',
  paz: 'A guerra acabou. O povo quer ouvir do rei o que foi ganho, e o que foi perdido.',
  execucao: 'Um grande nome foi acusado. A praça quer saber se a justiça foi justa.',
  reforma: 'Uma lei nova foi assinada. O povo ainda não sabe o que muda.',
};

function bars(app: App, impact?: Record<Group, number>) {
  const op = opinion(app.s);
  return `<div class="sq-groups">${GROUPS.map((g) => {
    const d = impact?.[g] ?? 0;
    const v = Math.max(0, Math.min(100, op[g] + d));
    return `<div class="sq-g"><span>${iconImg(GROUP_INFO[g].icon)} ${GROUP_INFO[g].name}</span>
      <div class="sq-bar"><i style="width:${v}%;background:${GROUP_INFO[g].color}"></i>${d ? `<b class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${d}</b>` : ''}</div></div>`;
  }).join('')}</div>`;
}

// o que o discurso já fez, somado (para as barras mudarem ao vivo)
function running(app: App): Record<Group, number> | undefined {
  const L = liveStage(app.s);
  if (!L) return undefined;
  const sum = { povo: 0, mercadores: 0, soldados: 0, religiosos: 0, nobres: 0 } as Record<Group, number>;
  L.live.picks.forEach((p, i) => { const o = L.stages[i]?.options[p]; if (o) { const im = optionImpact(o); for (const g of GROUPS) sum[g] += Math.round(im[g]); } });
  return sum;
}

export function render(app: App): string {
  const s = app.s;
  app.scene.setMode('dim');
  const c = crowd(s);
  const mood = moodOf(s);
  const L = liveStage(s);
  const size = crowdSize(s);
  const sp = c.spont && !c.spont.handled ? REASONS[c.spont.reason] : null;
  let side = '';
  if (result) {
    side = `<h2>${SPEECH_NAME[result.kind]}</h2>
      <div class="sq-verdict v-${result.verdict}"><b>${result.verdict.toUpperCase()}</b><p>${esc(({ triunfo: 'A praça inteira grita o nome do rei.', bom: 'Aplausos longos. A maioria está com o rei.', morno: 'Aplausos educados. Ninguém saiu convencido.', fracasso: 'A multidão se dispersa resmungando.', desastre: 'Vaias, gritos, um repolho voando.' })[result.verdict])}</p></div>
      ${bars(app)}
      ${result.clashes.length ? `<p class="sq-warn">Tons em conflito: ${result.clashes.map(([a, b]) => `${TONE_NAME[a]} × ${TONE_NAME[b]}`).join(', ')}. A credibilidade do rei caiu.</p>` : ''}
      ${result.lines.map((l) => `<p class="sub">${esc(l)}</p>`).join('')}
      <button class="btn primary" data-act="sqDone">Voltar ao castelo</button>`;
  } else if (L && L.stage) {
    const st = L.stage;
    side = `<div class="sq-step">Etapa ${L.live.stage + 1} de ${L.stages.length} · ${esc(st.title)}</div>
      <h2>${SPEECH_NAME[L.live.kind]}</h2>
      <p class="sq-prompt">${esc(txt(st.prompt, s))}</p>
      ${reacts.length ? `<p class="sq-react">${reacts.filter((x) => x.r !== 'silencio' || x.g === 'povo').map((x) => `<span>${GROUP_INFO[x.g].name} ${REACTION_NAME[x.r]}</span>`).join(' · ')}</p>` : ''}
      <div class="sq-opts">${st.options.map((o, i) => `<button class="sq-opt" data-act="sqPick" data-arg="${i}">
        <b>${esc(o.label)}</b><small>${o.tones.map((t) => `<i class="tone t-${t}">${TONE_NAME[t]}</i>`).join('')}</small></button>`).join('')}</div>
      ${bars(app, running(app))}`;
  } else {
    const kinds = availableKinds(s);
    const pend = new Set(c.pending.map((p) => p.kind));
    const done = spokeToday(s);
    side = `<h2>A Praça da Coroa</h2>
      <p class="sub">A multidão está <b>${MOOD_NAME[mood]}</b>. Cerca de ${size} pessoas. Credibilidade do rei: ${Math.round(c.cred)}.</p>
      ${bars(app)}
      ${done ? '<p class="sq-warn">O rei já falou ao povo hoje. Uma segunda vez no mesmo dia soaria desesperada.</p>' : `<div class="sq-kinds">${kinds.sort((a, b) => Number(pend.has(b)) - Number(pend.has(a))).map((k) => `<button class="sq-kind ${pend.has(k) ? 'due' : ''}" data-act="sqStart" data-arg="${k}" ${canSpend(s, 1) ? '' : 'disabled'}>
          <b>${pend.has(k) ? iconImg('ampulheta') + ' ' : ''}${SPEECH_NAME[k]}</b><small>${esc(KIND_WHY[k])}</small></button>`).join('')}</div>
        <p class="sub">Um pronunciamento leva 1 hora. Cada etapa soma tons: o povo gosta de uns, os nobres de outros, e tons que se contradizem custam credibilidade.</p>`}`;
  }
  const said2 = said ? `<div class="sq-said">${esc(said)}</div>` : '';
  return `<div class="sq">
    <div class="sq-stage"><canvas class="sq-canvas"></canvas>
      <div class="sq-hud"><span class="chip m-${mood}">${iconImg('povo')} ${MOOD_NAME[mood]}</span><span class="chip">~${size}</span>${sp ? `<span class="chip warn">${esc(sp.title)}</span>` : ''}</div>
      ${said2}
    </div>
    <aside class="panel dark sq-panel">${side}</aside>
  </div>`;
}

export function after(app: App) {
  const s = app.s;
  const cv = app.stage.querySelector<HTMLCanvasElement>('.sq-canvas');
  if (!cv) return;
  const c = crowd(s);
  const live = c.live;
  const sp = c.spont && !c.spont.handled ? REASONS[c.spont.reason] : null;
  const mood = moodOf(s);
  const signs = sp ? sp.signs : mood === 'hostil' || mood === 'insatisfeita' ? ['PÃO', 'CHEGA', 'ESCUTE-NOS'] : mood === 'celebrando' ? ['VIVA O REI'] : [];
  squareView.attach(cv, {
    size: crowdSize(s), seed: s.seed + s.day, mood, signs, hour: s.hour,
    queen: live?.kind === 'rainha' || result?.kind === 'rainha' ? s.spouse ?? null : null,
  });
}

export function handle(app: App, act: string, arg: string) {
  const s = app.s;
  switch (act) {
    case 'sqStart': {
      if (spokeToday(s) || !canSpend(s, 1)) return;
      startSpeech(s, arg as SpeechKind);
      spendHours(s, 1);
      said = ''; reacts = []; result = null;
      save(s);
      return app.render();
    }
    case 'sqPick': {
      const L = liveStage(s);
      if (!L) return;
      // o primeiro passo de um discurso espontâneo também custa a hora
      if (!L.live.picks.length && L.live.spont) spendHours(s, 1);
      const mood = moodOf(s);
      const r = pickStage(s, Number(arg));
      if (!r) return;
      said = txt(r.option.say, s);
      reacts = GROUPS.map((g) => ({ g, r: groupReaction(g, r.impact[g], mood, r.option.react) }));
      squareView.speak();
      for (const x of reacts) if (x.r !== 'silencio') squareView.reactGroup(x.g, x.r);
      // o som vem do povo (a maioria); os soldados batem nos escudos por cima
      const size = Math.min(1, crowdSize(s) / 500);
      sound.crowd(reacts.find((x) => x.g === 'povo')!.r, size);
      if (reacts.some((x) => x.g === 'soldados' && x.r === 'escudos')) window.setTimeout(() => sound.crowd('escudos', size), 400);
      const after2 = liveStage(s);
      if (after2 && !after2.stage) {
        const kind = after2.live.kind;
        result = { ...finishSpeech(s), kind };
        window.setTimeout(() => { sound.crowd(result!.score >= 8 ? 'gritos' : result!.score < -8 ? 'vaias' : 'murmurios', 1); if (result!.verdict === 'triunfo') sound.play('crown'); }, 900);
      }
      save(s);
      return app.render();
    }
    case 'sqDone': {
      result = null; said = ''; reacts = [];
      return app.go('trono');
    }
  }
}
