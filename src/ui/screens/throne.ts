import type { Choice, CouncilSeatId, GameEvent, GameState } from '../../types';
import type { App } from '../app';
import type { ActorSpec, SceneMarker } from '../sceneView';
import { char } from '../../data/characters';
import { HOUSES } from '../../data/realm';
import { dynamicChoices } from '../../data/events';
import { ROOMS, worldPoint } from '../../data/castle';
import { ROUTINES } from '../../data/routines';
import { SEATS } from '../../data/council';
import { ACTIVITIES, activitiesIn } from '../../data/activities';
import { DAY_END, applyEffect, hasSkill, save, softenCost } from '../../engine/core';
import { canSpend, eventOf, isQueued, placeDue, spendHours, visibleAudiences } from '../../engine/day';
import { councilChoices, holder, recordVote } from '../../engine/council';
import { moodAdjust, moodAfterAudience, moodLabel, MOOD_LOOK } from '../../engine/mood';
import { whereIs } from '../../engine/npcs';
import { iconImg } from '../../render/pixel';
import { effectTags, esc, portrait, reqCheck, shortName, txt } from '../common';
import { genericAdvice } from '../../data/companions';
import { BOOKS } from '../../data/progression';
import { readQuality } from './library';
import { kingLineFor } from '../../data/kingLines';

const KIND_LABEL: Record<string, string> = {
  audiencia: 'Audiência', urgente: 'Urgente', familia: 'Família', conselho: 'Conselho', casamento: 'Casamento', noite: 'Noite',
  encontro: 'Encontro', reuniao: 'Reunião do Conselho', atividade: 'Momento', conversa: 'Conversa',
};
export function choicesFor(app: App, ev: GameEvent, node: string): Choice[] {
  const s = app.s;
  let list = dynamicChoices(ev.id, s, node) ?? ev.nodes[node].choices;
  if (ev.council && node === 'start') list = [...councilChoices(s, ev), ...list];
  // ao voltar à conversa, os assuntos já tratados saem da lista
  const taken = app.ui.dialog?.taken;
  if (node === 'start' && taken?.length) list = list.filter((c) => !taken.includes(c.label));
  return moodAdjust(s, ev, list);
}

// Conversas abertas: com a tensão baixa, dá para voltar e tratar de outro assunto
const TALK_KINDS = ['casamento', 'conversa', 'encontro'];
function canReturn(app: App, ev: GameEvent): boolean {
  const d = app.ui.dialog;
  if (!d || !d.reply || d.final || ev.council || ev.id.startsWith('pedido_')) return false;
  if (!(ev.talk ?? TALK_KINDS.includes(ev.kind))) return false;
  if (d.tension >= 55 || (d.rounds ?? 0) >= 2) return false;
  // só conversas que se ramificam (há perguntas que levam a outros assuntos)
  if (!ev.talk && !ev.nodes.start.choices.some((c) => c.goto)) return false;
  const taken = [...(d.taken ?? []), ...(d.root ? [d.root] : [])];
  return (dynamicChoices(ev.id, app.s, 'start') ?? ev.nodes.start.choices).some((c) => !taken.includes(c.label) && reqCheck(app.s, c.req).ok);
}

// O que o rei diz ao escolher: a fala escrita, ou a intenção, quando ainda não há fala
function kingLine(s: GameState, ev: GameEvent, ch: Choice): string {
  const line = txt(ch.say, s) || kingLineFor(ev.id, ch.label);
  // gestos entre parênteses ficam sem aspas; a fala que vem depois deles, com aspas
  if (line) { const m = /^(\([^)]*\))\s*(.*)$/.exec(line); return m ? (m[2] ? `${m[1]} “${m[2]}”` : m[1]) : `“${line}”`; }
  return `(${ch.label}. ${ch.sub}.)`;
}

// Quem conduz a conversa (numa reunião, quem ocupa a cadeira que lidera o assunto)
export function speakerOf(s: GameState, ev: GameEvent): string {
  if (!ev.council) return ev.speaker;
  const seats = Object.keys(ev.council.positions) as CouncilSeatId[];
  return holder(s, ev.council.lead) ?? seats.map((k) => holder(s, k)).find(Boolean) ?? ev.speaker;
}

// Acontecimentos pelo castelo abrem ali mesmo; a fila do salão entra pela porta.
const isInline = (s: GameState, ev: GameEvent) => !isQueued(ev) || s.castle.room !== 'salao';

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
  const cost = ev.kind === 'atividade' || ev.kind === 'noite' ? 0 : ev.hours ?? 1;
  if (cost && !canSpend(s, cost)) {
    app.toast('Não há horas suficientes hoje. Encerre o dia.');
    return;
  }
  app.ui.screen = 'trono';
  const who = speakerOf(s, ev);
  const relation = s.rel[who] ?? 0;
  const initialTension = Math.max(8, Math.min(88, 28 + (ev.kind === 'urgente' ? 25 : ev.kind === 'casamento' ? 14 : ev.kind === 'reuniao' ? 10 : 0) - Math.round(relation / 4)));
  const inline = isInline(s, ev);
  if (ev.kind === 'reuniao' && s.castle.room === 'conselho') {
    const [x, y] = worldPoint('conselho', 'cabeceira');
    s.castle.x = x; s.castle.y = y; // o rei preside da cabeceira
  }
  app.ui.dialog = { uid, node: 'start', phase: inline ? 'talk' : 'entering', tension: initialTension, expr: ev.kind === 'urgente' ? 'preocupado' : 'neutro' };
  app.ui.dialogCollapsed = false;
  app.ui.useInfluence = false;
  app.ui.ring = false;
  if (inline) return app.render();
  // Audiência no salão: o rei caminha até o trono, senta, e a pessoa atravessa o salão até ele.
  const callIn = () => {
    const d0 = app.ui.dialog;
    if (!d0 || d0.uid !== uid) return;
    s.castle.seated = true;
    const from = app.scene.pos(`wait-${uid}`) ?? worldPoint('salao', 'porta');
    app.scene.walkIn('speaker', ev.speaker, from, worldPoint('salao', 'fala'), () => {
      window.setTimeout(() => {
        const d = app.ui.dialog;
        if (!d || d.uid !== uid || d.phase !== 'entering') return;
        d.phase = 'talk';
        app.render();
      }, 350);
    });
    app.render();
  };
  if (s.castle.seated) return callIn();
  const [tx, ty] = worldPoint('salao', 'trono');
  app.scene.moveTo('rei', tx, ty + 40, callIn, 260);
  app.render();
}

export function dismissSpeaker(app: App) {
  if (app.scene.has('speaker')) app.scene.leave('speaker');
}

// Todo mundo no castelo, onde a rotina (ou a agenda) manda estar agora
export function worldActors(app: App): ActorSpec[] {
  const s = app.s;
  const d = app.ui.dialog;
  const ev = d ? eventOf(s.audiences.find((a) => a.uid === d.uid)!) : undefined;
  const inlineSpeaker = ev && isInline(s, ev) ? speakerOf(s, ev) : undefined;
  const queued = ev && !inlineSpeaker ? ev : undefined;
  const list: ActorSpec[] = [];
  const seen = new Set<string>(['rei']);
  // o rei
  if (s.castle.room === 'salao' && s.castle.seated) {
    const [x, y] = worldPoint('salao', 'trono');
    list.push({ key: 'rei', id: 'rei', x, foot: y, anim: 'seated', dir: 'south' });
  } else list.push({ key: 'rei', id: 'rei', x: s.castle.x, foot: s.castle.y, anim: 'idle', dir: ev?.kind === 'reuniao' ? 'west' : undefined });
  // guardas fixos e de ronda
  const [sx, sy] = ROOMS.salao.rect, [gx, gy] = ROOMS.galeria.rect, [ex, ey] = ROOMS.entrada.rect, [px, py] = ROOMS.patio.rect;
  list.push({ key: 'guard1', id: 'guarda', x: sx + 330, foot: sy + 345, anim: 'idle', dir: 'south' });
  list.push({ key: 'guard2', id: 'guarda', x: sx + 710, foot: sy + 345, anim: 'idle', dir: 'south' });
  list.push({ key: 'guard3', id: 'sentinela', x: gx + 700, foot: gy + 230, anim: 'idle', roam: [gx + 300, gx + 2900], dir: 'east' });
  list.push({ key: 'guard4', id: 'guarda', x: ex + 110, foot: ey + 640, anim: 'idle', dir: 'south' });
  list.push({ key: 'guard5', id: 'guarda', x: ex + 330, foot: ey + 640, anim: 'idle', dir: 'south' });
  list.push({ key: 'guard6', id: 'guarda', x: px + 460, foot: py + 700, anim: 'idle', roam: [px + 380, px + 760], dir: 'west' });
  // quem acompanha o rei no trono
  const comp = s.flags.companion as string | undefined;
  if (comp && s.castle.room === 'salao' && s.castle.seated && comp !== inlineSpeaker) {
    const [cx, cy] = worldPoint('salao', 'companheiro');
    list.push({ key: `comp-${comp}`, id: comp, x: cx, foot: cy, anim: 'idle', dir: 'west' });
    seen.add(comp);
  }
  // fila do salão (visitantes esperam perto da porta)
  const fila = waiting(app);
  fila.slice(0, 6).forEach((a, i) => {
    const id = eventOf(a).speaker;
    if (id === queued?.speaker || id === inlineSpeaker) return;
    const [x, y] = worldPoint('salao', i % 2 ? 'fila2' : 'fila1');
    list.push({ key: `wait-${a.uid}`, id, x: x + (i > 1 ? (i % 2 ? 50 : -50) * Math.floor(i / 2) : 0), foot: y - Math.floor(i / 2) * 20, anim: 'idle', dir: 'north' });
    seen.add(id);
  });
  if (queued && d) { const [x, y] = worldPoint('salao', 'fala'); list.push({ key: 'speaker', id: queued.speaker, x, foot: y, anim: d.reply ? 'idle' : 'talk', dir: 'north' }); seen.add(queued.speaker); }
  // gente com rotina, em todo o castelo
  const perRoom = new Map<string, number>();
  for (const r of ROUTINES) {
    if (seen.has(r.id)) continue;
    const w = whereIs(s, r.id);
    if (!w || w.why === 'audiencia') continue;
    const n = perRoom.get(w.room) ?? 0; perRoom.set(w.room, n + 1);
    const [x, y] = worldPoint(w.room, w.spot, n);
    seen.add(r.id);
    list.push({ key: `npc-${r.id}`, id: r.id, x, foot: y, anim: 'idle', dir: w.room === 'conselho' && y > ROOMS.conselho.rect[1] + 520 ? 'north' : 'south', speed: 70 });
  }
  // conselheiros numa reunião sem rotina (ex.: Otho) e quem fala com o rei agora
  for (const a of s.agenda) for (const id of a.who) {
    if (seen.has(id)) continue;
    const w = whereIs(s, id);
    if (!w || w.why !== 'compromisso') continue;
    const n = perRoom.get(w.room) ?? 0; perRoom.set(w.room, n + 1);
    const [x, y] = worldPoint(w.room, w.spot, n);
    seen.add(id);
    list.push({ key: `npc-${id}`, id, x, foot: y, anim: 'idle', dir: 'south', speed: 70 });
  }
  for (const [i, id] of [...(inlineSpeaker && inlineSpeaker !== 'rei' ? [inlineSpeaker] : []), ...(ev?.present ?? [])].entries()) {
    if (seen.has(id)) continue;
    seen.add(id);
    list.push({ key: `npc-${id}`, id, x: s.castle.x + 80 + i * 56, foot: s.castle.y - 6 + i * 16, anim: 'talk', dir: 'west' });
  }
  return list;
}

// Nomes de quem está perto, ícones dos lugares do cômodo e o menu de ações do rei
function markers(app: App, actors: ActorSpec[]): SceneMarker[] {
  const s = app.s;
  if (app.ui.dialog) return [];
  const out: SceneMarker[] = [];
  const [kx, ky] = s.castle.room === 'salao' && s.castle.seated ? worldPoint('salao', 'trono') : [s.castle.x, s.castle.y];
  for (const a of actors) if (a.key.startsWith('npc-') && Math.hypot(a.x - kx, a.foot - ky) < 520) out.push({ key: a.key, x: a.x, y: a.foot - 104, label: esc(shortName(a.id)), act: 'talk', arg: a.id, kind: 'pessoa' });
  // menu compacto: lista pequena em cima do rei
  if (app.ui.ring) {
    const acts = activitiesIn(s, s.castle.room).filter((a) => !a.special || a.special === 'dormir' || a.special === 'lerJuntos');
    const items = [...acts.slice(0, 5).map((a) => ({ label: `${iconImg(a.icon)} ${esc(a.label)}`, act: 'activity', arg: a.id })), { label: '× Fechar', act: 'ring', arg: '' }];
    items.forEach((it, i) => out.push({ key: `menu-${i}`, x: kx, y: ky - 130 - (items.length - 1 - i) * 34, label: it.label, act: it.act, arg: it.arg, kind: 'acao' }));
  }
  if (app.ui.hotMenu) {
    const [x, y, ids] = app.ui.hotMenu;
    ids.map((id) => ACTIVITIES.find((a) => a.id === id)).filter(Boolean).forEach((a, i, arr) => out.push({ key: `hot-${i}`, x, y: y - (arr.length - 1 - i) * 34, label: `${iconImg(a!.icon)} ${esc(a!.label)}`, act: 'activity', arg: a!.id, kind: 'acao' }));
    out.push({ key: 'hot-x', x, y: y + 34, label: '× Fechar', act: 'hotClose', arg: '', kind: 'acao' });
  }
  return out;
}

// ---------- HUD do castelo ----------
function roomHud(app: App): string {
  const s = app.s;
  const R = ROOMS[s.castle.room];
  const mood = moodLabel(s);
  const vis = visibleAudiences(s);
  const urgent = vis.find((a) => eventOf(a).kind === 'urgente');
  const away = s.castle.room !== 'salao';
  const next = s.agenda.find((a) => a.state === 'pendente' && a.hour + a.duration > s.hour);
  return `<div class="room-plaque"><b>${esc(R.name)}</b><em class="mood mood-${mood}">${esc(MOOD_LOOK[mood])}</em></div>
    <div class="castle-dock">
      <button class="dock-btn" data-act="agenda" title="Agenda do dia">${iconImg('pergaminho', 'ico-lg')}<span>Agenda${next ? `<small>${fmt(next.hour)} ${esc(next.title)}</small>` : ''}</span></button>
      <button class="dock-btn" data-act="castleMap" title="Ir a um lugar · Onde está alguém">${iconImg('castelo', 'ico-lg')}<span>Castelo</span></button>
      <button class="dock-btn" data-act="ring" title="O que dá para fazer aqui">${iconImg('estrela', 'ico-lg')}<span>Ações</span></button>
      ${s.hour < DAY_END ? `<button class="dock-btn" data-act="waitHour">${iconImg('ampulheta', 'ico-lg')}<span>${s.hour < 8 ? 'Esperar as 8h' : 'Esperar 1h'}</span></button>` : ''}
      <button class="dock-btn end ${s.hour >= 19 ? 'late' : ''}" data-act="endDay" title="O rei vai até a cama e dorme">${iconImg('selo', 'ico-lg')}<span>Ir dormir</span></button>
    </div>
    <div class="zoom-ctl"><button data-act="zoom" data-arg="in" title="Aproximar">+</button><button data-act="zoom" data-arg="out" title="Afastar">−</button></div>
    ${away && vis.length ? `<button class="hall-call ${urgent ? 'urgent' : ''}" data-act="travel" data-arg="salao">${urgent ? `${portrait(eventOf(urgent).speaker, 'q-portrait')}<span><b>Urgente no salão</b><small>${esc(char(eventOf(urgent).speaker).name)}</small></span>` : `${iconImg('povo', 'ico-lg')}<span><b>${vis.length} no salão</b><small>Ir até lá</small></span>`}</button>` : ''}`;
}

const fmt = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

export function render(app: App): string {
  const s = app.s;
  const d = app.ui.dialog;
  const vis = visibleAudiences(s);
  const current = d ? s.audiences.find((a) => a.uid === d.uid) : undefined;
  const ev = current ? eventOf(current) : undefined;
  const inSalao = s.castle.room === 'salao';

  const actors = worldActors(app);
  app.scene.sync(actors);
  app.scene.setMarkers(markers(app, actors));
  app.scene.setMode('full');
  if (ev?.kind === 'noite') app.scene.setHour(20.6);

  // fila: só o rosto de quem espera, sem nome nem assunto (apenas no salão)
  const queue = inSalao ? `<div class="queue ${app.ui.queueCollapsed ? 'collapsed' : ''}">
    <div class="queue-title">${iconImg('ampulheta')} Aguardando audiência <button class="queue-toggle" data-act="toggleQueue" aria-expanded="${!app.ui.queueCollapsed}">${app.ui.queueCollapsed ? 'Mostrar fila' : 'Ocultar fila'}</button></div>
    <div class="queue-cards" aria-hidden="${app.ui.queueCollapsed}">
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
  </div>` : '';

  if (!ev || !d) return `${queue}${roomHud(app)}`;

  if (d.phase === 'entering') {
    return `${queue}
      <div class="entering parchment"><p>Os guardas abrem as portas. Alguém entra no salão...</p><button class="btn sm" data-act="skipWalk">Pular</button></div>`;
  }

  const who = speakerOf(s, ev);
  if (app.ui.dialogCollapsed) {
    return `${queue}<div class="dialog-mini"><span><b>${esc(char(who).name)}</b><small> ${KIND_LABEL[ev.kind]} em andamento</small></span><button class="btn sm" data-act="toggleDialog">Abrir diálogo</button></div>`;
  }

  const c = char(who);
  const H = HOUSES[c.realm];
  const node = ev.nodes[d.node];
  const text = d.reply ?? txt(node.text, s);
  const see = hasSkill(s, 'olhos');
  const base = d.reply ? [] : choicesFor(app, ev, d.node);
  const choices = d.advice && !d.reply ? [...base, d.advice.choice] : base;
  const comp = s.flags.companion as string | undefined;
  const canConsult = inSalao && !ev.council && !!comp && comp !== who && !d.reply && !d.advice;
  const eager = canConsult && !!node.advice?.[comp!];

  const choiceHtml = choices
    .map((ch, i) => {
      const isAdv = !!d.advice && i === base.length;
      const r = reqCheck(s, ch.req);
      const cost = app.ui.useInfluence ? softenCost(s, ch.effects) : 0;
      const costTag = cost ? `<span class="tag infl">−${cost} Influência · suaviza</span>` : '';
      const badge = isAdv ? d.advice!.who : ch.who;
      return `<button class="choice c-${ch.color} ${r.ok ? '' : 'locked'} ${isAdv || ch.who ? 'advice' : ''} ${ch.outburst ? 'outburst' : ''}" data-act="choose" data-arg="${isAdv ? 'adv' : i}" ${r.ok ? '' : 'disabled'}>
        ${badge ? `${portrait(badge, 'adv-badge')}` : ''}
        <span class="choice-ico">${iconImg(r.ok ? ch.icon : 'cadeado', 'ico-xl')}</span>
        <span class="choice-text"><b>${esc(ch.label)}</b><small>${r.ok ? esc(ch.sub) : 'Requer: ' + esc(r.why)}</small>
        ${see && r.ok && !ch.goto ? `<span class="tags">${effectTags(ch.effects)}</span>` : ''}${costTag}</span>
      </button>`;
    })
    .join('');

  // Numa reunião, cada cadeira diz o que defende antes de o rei decidir
  const table = ev.council && d.node === 'start' && !d.reply
    ? `<div class="council-args">${(Object.keys(ev.council.positions) as CouncilSeatId[]).filter((k) => holder(s, k)).map((k) => `<p>${portrait(holder(s, k)!, 'whisper-portrait')}<span><b>${esc(shortName(holder(s, k)!))}</b> <small>${SEATS[k].name}</small> ${esc(txt(ev.council!.positions[k]!.argument, s))}</span></p>`).join('')}</div>`
    : '';

  const tensionLabel = d.tension >= 70 ? 'À beira do confronto' : d.tension >= 40 ? 'Clima carregado' : 'Conversa sob controle';
  const origin = current?.origin;
  return `${queue}
    <div class="dialog ${ev.kind === 'urgente' ? 'urgent' : ''} ${ev.council ? 'council' : ''}">
      <div class="d-portrait" style="--hc:${H.color};--hd:${H.dark}">
        ${portrait(who, 'big-portrait', d.expr)}
        <div class="d-house">${iconImg(H.sigil, 'ico-lg', '#f2c14e')}<span><b>${esc(H.name)}</b><small>${(c.traits ?? []).map(esc).join(' · ')}</small></span></div>
      </div>
      <div class="speech parchment">
        <button class="dialog-toggle" data-act="toggleDialog" aria-label="Minimizar diálogo">−</button>
        ${origin ? `<div class="consequence-origin">Consequência do Dia ${origin.day}: ${esc(origin.decision)} · ${esc(origin.event)}</div>` : ''}
        ${ev.kind === 'conversa' || ev.kind === 'atividade' ? '' : `<div class="tension-meter" role="meter" aria-label="Tensão da conversa" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${d.tension}">
          <span>Tensão <b>${d.tension}%</b></span><div class="tension-track"><i style="width:${d.tension}%"></i></div><em>${tensionLabel}</em>
        </div>`}
        ${ev.kind === 'urgente' ? `<span class="alert">${iconImg('selo', 'ico-lg')}</span>` : ''}
        <h3>${esc(ev.kind === 'reuniao' ? ev.topic : c.name)} <small>${esc(ev.kind === 'reuniao' ? `Conduzida por ${c.name}` : c.title)}${c.ageYears && ev.kind !== 'reuniao' ? ` · ${c.ageYears} anos` : ''} · ${KIND_LABEL[ev.kind]}</small></h3>
        ${d.said ? `<div class="king-said">${portrait('rei', 'said-portrait')}<p>${esc(d.said)}</p></div>` : ''}
        ${d.prefix && !d.reply ? `<p class="d-prefix">${esc(d.prefix)}</p>` : ''}
        <p>${esc(text)}</p>
        ${table}
        ${d.advice && !d.reply ? `<div class="whisper">${portrait(d.advice.who, 'whisper-portrait')}<p>${esc(d.advice.text)}</p></div>` : ''}
        ${canConsult ? `<button class="consult ${eager ? 'eager' : ''}" data-act="consult" title="Quem está ao seu lado pode sugerir outra saída">${portrait(comp!, 'consult-portrait')}<span>${eager ? `${esc(char(comp!).name.split(' ')[0])} quer dizer algo` : `Pedir conselho`}</span></button>` : ''}
        ${d.reply ? '' : `<button class="infl-toggle ${app.ui.useInfluence ? 'on' : ''}" data-act="toggleInfl" title="Gaste Influência para reduzir as penalidades políticas da sua escolha">${iconImg('flor')} Usar Influência <b>${s.res.influencia}</b></button>`}
      </div>
      <div class="choices ${choices.length > 5 ? 'many' : ''}">
        ${d.reply && canReturn(app, ev) ? `<button class="choice c-azul" data-act="talkMore">${iconImg('balao', 'ico-xl')}<span class="choice-text"><b>Falar de outra coisa</b><small>Voltar à conversa (15 min)</small></span></button>` : ''}
        ${d.reply ? `<button class="choice c-dourado ${canReturn(app, ev) ? '' : 'wide'}" data-act="finish">${iconImg('seta', 'ico-xl')}<span class="choice-text"><b>Continuar</b><small>${ev.kind === 'reuniao' ? 'A reunião termina' : isInline(s, ev) ? 'Seguir pelo castelo' : 'A audiência termina'}</small></span></button>` : choiceHtml}
      </div>
    </div>`;
}

export function handle(app: App, act: string, arg: string) {
  const s = app.s;
  if (act === 'open') {
    if (s.castle.room !== 'salao') return app.travelTo('salao');
    return openAudience(app, Number(arg));
  }
  if (act === 'waitHour') {
    if (s.hour >= DAY_END) return;
    spendHours(s, s.hour < 8 ? 8 - s.hour : 1, 'descanso');
    save(s);
    app.render();
    if (!visibleAudiences(s).length && s.castle.room === 'salao') app.toast(s.hour >= DAY_END ? 'O sol se pôs.' : 'Uma hora passa. O salão continua em silêncio.');
    return app.autoOpenUrgent();
  }
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
    const first = !a.done;
    if (first) {
      a.done = true;
      const cost = ev.kind === 'noite' || ev.kind === 'atividade' ? 0 : ev.hours ?? 1;
      if (cost) spendHours(s, cost, 'trabalho');
    }
    if (d.node === 'start') d.root = ch.label;
    d.prefix = undefined;
    d.said = kingLine(s, ev, ch);
    d.final = !!(ch.effects?.flags && ('noiva' in ch.effects.flags || 'spouse' in ch.effects.flags)) || !!ch.effects?.law;
    const who = speakerOf(s, ev);
    const realm = char(who).realm;
    const mood = () => (s.rel[who] ?? 0) + (realm in s.loyalty ? s.loyalty[realm as keyof typeof s.loyalty] : 0);
    const before = mood();
    applyEffect(s, ch.effects, { soften, origin: { day: s.day, event: ev.topic, decision: ch.label } });
    if (ev.council && first) recordVote(s, ev, ch.seat ?? null);
    placeDue(s); // "às 17h no jardim": o encontro entra na agenda de hoje
    // seguir (ou ignorar) o conselho mexe com quem aconselhou
    if (d.advice) applyEffect(s, { rel: { [d.advice.who]: isAdv ? (hasSkill(s, 'confidente') ? 6 : 3) : -2 } });
    d.advice = null;
    const after = mood();
    const dramatic = ch.tension ?? (ch.color === 'vermelho' ? 12 : ch.color === 'verde' ? -8 : ch.color === 'roxo' ? 4 : 0);
    d.tension = Math.max(0, Math.min(100, d.tension + dramatic - Math.round((after - before) / 3)));
    d.expr = after > before ? 'feliz' : after < before ? 'irritado' : d.expr;
    app.ui.useInfluence = false;
    if (ch.goto) {
      save(s);
      d.prefix = txt(ch.reply, s) || undefined;
      d.node = ch.goto;
      return app.render();
    }
    moodAfterAudience(s, d.tension, ch);
    // Citar um livro: quem leu bem impressiona; quem leu por cima tropeça
    let cite = '';
    const book = ch.req?.knowledge ? BOOKS.find((b) => b.knowledge === ch.req!.knowledge) : undefined;
    if (book) {
      const q = readQuality(s, book.id) ?? 0.6;
      if (q >= 0.8) { applyEffect(s, { res: { prestigio: 2 }, xp: 5 }); cite = ` (Você cita "${book.title}" palavra por palavra. A corte nota.)`; }
      else if (q < 0.45 && Math.random() < 0.35) { applyEffect(s, { res: { prestigio: -1 } }); cite = ` (Você erra um detalhe de "${book.title}", e alguém corrige em voz alta.)`; }
    }
    save(s);
    d.reply = (txt(ch.reply, s) || defaultReply(ch)) + cite;
    return app.render();
  }
  if (act === 'talkMore') {
    if (!canReturn(app, ev)) return;
    d.taken = [...(d.taken ?? []), ...(d.root ? [d.root] : [])];
    d.rounds = (d.rounds ?? 0) + 1;
    d.node = 'start'; d.reply = undefined; d.said = undefined; d.root = undefined;
    d.tension = Math.min(100, d.tension + 6);
    spendHours(s, 0.25, 'trabalho');
    save(s);
    return app.render();
  }
  if (act === 'finish') {
    dismissSpeaker(app);
    app.ui.dialog = null;
    save(s);
    if (ev.kind === 'noite' && s.flags.nightPending) return app.doEndDay(); // acordou na cama: volta a dormir
    app.render();
    if (s.war && ev.id === 'invasao') app.toast('A guerra começou! Abra a tela de Guerra para comandar.');
    app.autoOpenUrgent();
  }
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
