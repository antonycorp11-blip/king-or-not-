import type { Choice, GameEvent } from '../../types';
import type { App } from '../app';
import type { ActorSpec } from '../sceneView';
import { char } from '../../data/characters';
import { HOUSES } from '../../data/realm';
import { dynamicChoices } from '../../data/events';
import { DAY_END, applyEffect, hasSkill, save, softenCost } from '../../engine/core';
import { canSpend, eventOf, spendHours, visibleAudiences } from '../../engine/day';
import { LAYOUT } from '../../render/scenes';
import { iconImg } from '../../render/pixel';
import { effectTags, esc, portrait, reqCheck, txt } from '../common';
import { genericAdvice } from '../../data/companions';

const KIND_LABEL: Record<string, string> = { audiencia: 'Audiência', urgente: 'Urgente', familia: 'Família', conselho: 'Conselho', casamento: 'Casamento' };
const WAIT_X = [26, 76];
const WAIT_FOOT = 176;

export function choicesFor(app: App, ev: GameEvent, node: string): Choice[] {
  if (node === 'start') {
    const dyn = dynamicChoices(ev.id, app.s);
    if (dyn) return dyn as Choice[];
  }
  return ev.nodes[node].choices;
}

function waiting(app: App) {
  const d = app.ui.dialog;
  return visibleAudiences(app.s).filter((a) => a.uid !== d?.uid);
}

export function openAudience(app: App, uid: number) {
  const s = app.s;
  if (app.ui.dialog) return;
  const a = s.audiences.find((x) => x.uid === uid);
  if (!a || a.done) return;
  const ev = eventOf(a);
  if (!canSpend(s, ev.hours ?? 1)) {
    app.toast('Não há horas suficientes hoje. Encerre o dia.');
    return;
  }
  const idx = waiting(app).slice(0, 2).findIndex((w) => w.uid === uid);
  const from = idx >= 0 ? WAIT_X[idx] : LAYOUT.doorX;
  app.ui.screen = 'trono';
  app.ui.dialog = { uid, node: 'start', phase: 'entering', expr: ev.kind === 'urgente' ? 'preocupado' : 'neutro' };
  app.ui.useInfluence = false;
  app.scene.setRoom('trono');
  app.scene.walk('speaker', ev.speaker, from, LAYOUT.speakerX, LAYOUT.floorY, 'bow', () => {
    window.setTimeout(() => {
      const d = app.ui.dialog;
      if (!d || d.uid !== uid || d.phase !== 'entering') return;
      d.phase = 'talk';
      app.render();
    }, 650);
  });
  app.render();
}

export function dismissSpeaker(app: App) {
  app.scene.leave('speaker', LAYOUT.doorX - 20);
}

function sceneActors(app: App): ActorSpec[] {
  const s = app.s;
  const d = app.ui.dialog;
  const ev = d ? eventOf(s.audiences.find((a) => a.uid === d.uid)!) : undefined;
  const waitingIds = waiting(app).slice(0, 2).map((a) => eventOf(a).speaker);
  const list = app.throneActors([...(ev ? [ev.speaker] : []), ...waitingIds]);
  const rei = list.find((x) => x.key === 'rei')!;
  if (d?.phase === 'talk') rei.anim = d.reply ? 'seated' : 'seatedThink';
  waiting(app)
    .slice(0, 2)
    .forEach((a, i) => {
      const id = eventOf(a).speaker;
      if (id !== ev?.speaker) list.push({ key: `wait-${a.uid}`, id, x: WAIT_X[i], foot: WAIT_FOOT, facing: 1, anim: 'idle' });
    });
  if (d && ev) list.push({ key: 'speaker', id: ev.speaker, x: LAYOUT.speakerX, foot: LAYOUT.floorY, facing: 1, anim: d.phase === 'entering' ? 'bow' : d.reply ? 'idle' : 'talk' });
  return list;
}

export function render(app: App): string {
  const s = app.s;
  const d = app.ui.dialog;
  const vis = visibleAudiences(s);
  const current = d ? s.audiences.find((a) => a.uid === d.uid) : undefined;
  const ev = current ? eventOf(current) : undefined;

  app.scene.setRoom('trono');
  app.scene.sync(sceneActors(app));
  app.scene.setMode('full');

  // fila: só o rosto de quem espera, sem nome nem assunto
  const queue = `<div class="queue">
    <div class="queue-title">${iconImg('ampulheta')} Aguardando audiência</div>
    <div class="queue-cards">
      ${vis.length ? '' : '<p class="empty">Ninguém espera no momento.</p>'}
      ${vis
        .map((a) => {
          const e = eventOf(a);
          const leaves = a.expires === s.day;
          return `<button class="q-card ${e.kind === 'urgente' ? 'urgent' : ''} ${a.uid === d?.uid ? 'on' : ''}" data-act="open" data-arg="${a.uid}" title="Receber esta pessoa (${e.hours ?? 1}h)" ${d ? 'disabled' : ''}>
            ${portrait(e.speaker, 'q-portrait')}
            <span class="q-meta"><b>${e.hours ?? 1}h</b>${e.kind === 'urgente' ? '<em class="hot">Urgente</em>' : leaves ? '<em class="hot">parte hoje</em>' : '<em>espera</em>'}</span>
          </button>`;
        })
        .join('')}
    </div>
  </div>`;

  if (!ev || !d) {
    return `${queue}
      <div class="idle-bar">
        <div class="parchment idle-hint">
          <p>${s.hour >= DAY_END ? 'O sol se pôs. Não há mais tempo para audiências hoje.' : vis.length ? 'Clique em um rosto na fila para mandar a pessoa entrar. Você só saberá o que ela quer quando estiver diante do trono.' : 'O salão está vazio por enquanto. Visite a biblioteca ou as províncias: novas pessoas podem chegar ao longo do dia.'}</p>
        </div>
        <button class="end-day" data-act="endDay">${iconImg('selo', 'ico-lg')}<span><b>Encerrar o Dia</b><small>Ver o resumo e avançar</small></span></button>
      </div>`;
  }

  if (d.phase === 'entering') {
    return `${queue}
      <div class="entering parchment"><p>Os guardas abrem as portas. Alguém entra no salão...</p><button class="btn sm" data-act="skipWalk">Pular</button></div>`;
  }

  const c = char(ev.speaker);
  const H = HOUSES[c.realm];
  const node = ev.nodes[d.node];
  const text = d.reply ?? txt(node.text, s);
  const see = hasSkill(s, 'olhos');
  const base = d.reply ? [] : choicesFor(app, ev, d.node);
  const choices = d.advice && !d.reply ? [...base, d.advice.choice] : base;
  const comp = s.flags.companion as string | undefined;
  const canConsult = !!comp && comp !== ev.speaker && !d.reply && !d.advice;
  const eager = canConsult && !!node.advice?.[comp!];

  const choiceHtml = choices
    .map((ch, i) => {
      const isAdv = !!d.advice && i === base.length;
      const r = reqCheck(s, ch.req);
      const cost = app.ui.useInfluence ? softenCost(s, ch.effects) : 0;
      const costTag = cost ? `<span class="tag infl">−${cost} Influência · suaviza</span>` : '';
      // O botão mostra só o TOM e o significado da resposta; a fala exata do rei aparece depois.
      const tone = isAdv ? `Conselho de ${char(d.advice!.who).name.split(' ').pop()}` : toneOf(ch);
      return `<button class="choice tone c-${ch.color} ${r.ok ? '' : 'locked'} ${isAdv ? 'advice' : ''}" data-act="choose" data-arg="${isAdv ? 'adv' : i}" ${r.ok ? '' : 'disabled'} title="${esc(tone)}">
        <span class="orb">${isAdv ? portrait(d.advice!.who, 'orb-portrait') : iconImg(r.ok ? toneIcon(ch) : 'cadeado', 'ico-xl')}</span>
        <span class="tone-name">${esc(tone)}</span>
        <span class="meaning">${r.ok ? esc(ch.sub) : 'Requer: ' + esc(r.why)}</span>
        ${see && r.ok && !ch.goto ? `<span class="tags">${effectTags(ch.effects)}</span>` : ''}${costTag}
      </button>`;
    })
    .join('');

  return `${queue}
    <div class="dialog ${ev.kind === 'urgente' ? 'urgent' : ''}">
      <div class="d-portrait" style="--hc:${H.color};--hd:${H.dark}">
        ${portrait(ev.speaker, 'big-portrait', d.expr)}
        <div class="d-house">${iconImg(H.sigil, 'ico-lg', '#f2c14e')}<span><b>${esc(H.name)}</b><small>${(c.traits ?? []).map(esc).join(' · ')}</small></span></div>
      </div>
      <div class="speech parchment">
        ${ev.kind === 'urgente' ? `<span class="alert">${iconImg('selo', 'ico-lg')}</span>` : ''}
        <h3>${esc(c.name)} <small>${esc(c.title)} · ${KIND_LABEL[ev.kind]}</small></h3>
        ${d.said ? `<p class="said">${esc(char('rei').name)} ${esc(app.s.kingName)}: “${esc(d.said)}”</p>` : ''}
        <p>${esc(text)}</p>
        ${d.advice && !d.reply ? `<div class="whisper">${portrait(d.advice.who, 'whisper-portrait')}<p>${esc(d.advice.text)}</p></div>` : ''}
        ${canConsult ? `<button class="consult ${eager ? 'eager' : ''}" data-act="consult" title="Quem está ao seu lado pode sugerir outra saída">${portrait(comp!, 'consult-portrait')}<span>${eager ? `${esc(char(comp!).name.split(' ')[0])} quer dizer algo` : `Pedir conselho`}</span></button>` : ''}
        ${d.reply ? '' : `<button class="infl-toggle ${app.ui.useInfluence ? 'on' : ''}" data-act="toggleInfl" title="Gaste Influência para reduzir as penalidades políticas da sua escolha">${iconImg('flor')} Usar Influência <b>${s.res.influencia}</b></button>`}
      </div>
      <div class="choices">
        ${d.reply ? `<button class="choice c-dourado wide" data-act="finish">${iconImg('seta', 'ico-xl')}<span class="choice-text"><b>Continuar</b><small>A audiência termina</small></span></button>` : choiceHtml}
      </div>
    </div>`;
}

export function handle(app: App, act: string, arg: string) {
  const s = app.s;
  if (act === 'open') return openAudience(app, Number(arg));
  if (act === 'skipWalk') {
    app.scene.finishWalks();
    const d = app.ui.dialog;
    if (d) {
      d.phase = 'talk';
      app.render();
    }
    return;
  }
  if (act === 'toggleInfl') {
    app.ui.useInfluence = !app.ui.useInfluence;
    return app.render();
  }
  const d = app.ui.dialog;
  if (!d) return;
  const a = s.audiences.find((x) => x.uid === d.uid)!;
  const ev = eventOf(a);
  if (act === 'consult') {
    const who = s.flags.companion as string | undefined;
    if (!who || d.advice) return;
    const authored = ev.nodes[d.node].advice?.[who];
    const adv = authored ?? genericAdvice(s, ev);
    if (!adv) return app.toast('Nenhum conselho a acrescentar.');
    d.advice = { who, text: txt(adv.text, s), choice: adv.choice };
    d.consulted = true;
    return app.render();
  }
  if (act === 'choose') {
    const isAdv = arg === 'adv';
    const ch = isAdv ? d.advice?.choice : choicesFor(app, ev, d.node)[Number(arg)];
    if (!ch || !reqCheck(s, ch.req).ok) return;
    let soften = false;
    if (app.ui.useInfluence) {
      const cost = softenCost(s, ch.effects);
      if (cost > 0) {
        if (s.res.influencia < cost) {
          app.toast(`Influência insuficiente (precisa de ${cost}).`);
          return;
        }
        s.res.influencia -= cost;
        soften = true;
      }
    }
    // a audiência conta como atendida na primeira escolha (evita repetir efeitos ao recarregar)
    if (!a.done) {
      a.done = true;
      spendHours(s, ev.hours ?? 1);
    }
    const realm = char(ev.speaker).realm;
    const mood = () => (s.rel[ev.speaker] ?? 0) + (realm in s.loyalty ? s.loyalty[realm as keyof typeof s.loyalty] : 0);
    const before = mood();
    applyEffect(s, ch.effects, { soften });
    // seguir (ou ignorar) o conselho mexe com quem aconselhou
    if (d.advice) applyEffect(s, { rel: { [d.advice.who]: isAdv ? 3 : -2 } });
    d.advice = null;
    const after = mood();
    d.expr = after > before ? 'feliz' : after < before ? 'irritado' : d.expr;
    save(s);
    app.ui.useInfluence = false;
    d.said = ch.label; // agora o jogador descobre o que o rei disse
    if (ch.goto) {
      d.node = ch.goto;
      return app.render();
    }
    d.reply = txt(ch.reply, s) || defaultReply(ch);
    return app.render();
  }
  if (act === 'finish') {
    dismissSpeaker(app);
    app.ui.dialog = null;
    save(s);
    app.render();
    if (s.war && ev.id === 'invasao') app.toast('A guerra começou! Abra a tela de Guerra para comandar.');
    app.autoOpenUrgent();
  }
}

const TONES: Record<string, [string, string]> = {
  azul: ['Diplomático', 'aperto'],
  dourado: ['Astuto', 'olho'],
  vermelho: ['Autoritário', 'coroa'],
  roxo: ['Desconfiado', 'mascara'],
  verde: ['Gentil', 'coracao'],
};

function toneOf(ch: Choice) {
  if (ch.req?.knowledge) return 'Erudito';
  return TONES[ch.color][0];
}

function toneIcon(ch: Choice) {
  if (ch.req?.knowledge) return 'livro';
  return TONES[ch.color][1];
}

function defaultReply(ch: Choice) {
  const map: Record<string, string> = {
    azul: 'Uma reverência. "Como Vossa Majestade desejar."',
    dourado: 'Um aceno respeitoso. A decisão será registrada pelos escribas.',
    vermelho: 'Um silêncio pesado toma o salão. Ninguém ousa contestar.',
    roxo: 'Um olhar surpreso, e depois um sorriso cauteloso.',
    verde: 'O rosto se ilumina. "Obrigado, Majestade."',
  };
  return map[ch.color];
}
