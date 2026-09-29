import type { Choice, CouncilSeatId, GameEvent, GameState } from '../../types';
import type { App } from '../app';
import type { ActorSpec, SceneMarker } from '../sceneView';
import { char } from '../../data/characters';
import { HOUSES } from '../../data/realm';
import { dynamicChoices } from '../../data/events';
import { ROOMS } from '../../data/castle';
import { SEATS } from '../../data/council';
import { activitiesIn } from '../../data/activities';
import { DAY_END, applyEffect, hasSkill, save, softenCost } from '../../engine/core';
import { canSpend, eventOf, isQueued, spendHours, visibleAudiences } from '../../engine/day';
import { councilChoices, holder, recordVote } from '../../engine/council';
import { moodAdjust, moodAfterAudience, moodLabel, MOOD_LOOK } from '../../engine/mood';
import { presentIn, spotPos } from '../../engine/npcs';
import { LAYOUT } from '../../render/scenes';
import { iconImg } from '../../render/pixel';
import { effectTags, esc, portrait, reqCheck, shortName, txt } from '../common';
import { genericAdvice } from '../../data/companions';
import { BOOKS } from '../../data/progression';
import { readQuality } from './library';

const KIND_LABEL: Record<string, string> = {
  audiencia: 'Audiência', urgente: 'Urgente', familia: 'Família', conselho: 'Conselho', casamento: 'Casamento', noite: 'Noite',
  encontro: 'Encontro', reuniao: 'Reunião do Conselho', atividade: 'Momento', conversa: 'Conversa',
};
const WAIT_X = [26, 76];
const WAIT_FOOT = 176;

export function choicesFor(app: App, ev: GameEvent, node: string): Choice[] {
  const s = app.s;
  let list = dynamicChoices(ev.id, s, node) ?? ev.nodes[node].choices;
  if (ev.council && node === 'start') list = [...councilChoices(s, ev), ...list];
  return moodAdjust(s, ev, list);
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
    const [x, y] = ROOMS.conselho.spots.cabeceira;
    s.castle.x = x; s.castle.y = y; // o rei preside da cabeceira
    app.scene.setRoom('conselho');
    app.scene.sync([]);
  }
  app.ui.dialog = { uid, node: 'start', phase: inline ? 'talk' : 'entering', tension: initialTension, expr: ev.kind === 'urgente' ? 'preocupado' : 'neutro' };
  app.ui.dialogCollapsed = false;
  app.ui.useInfluence = false;
  if (inline) return app.render();
  // Audiência no salão: o rei senta no trono e a pessoa entra pela porta.
  s.castle.seated = true;
  const idx = waiting(app).slice(0, 2).findIndex((w) => w.uid === uid);
  const from = idx >= 0 ? WAIT_X[idx] : LAYOUT.doorX;
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
  if (app.scene.has('speaker')) app.scene.leave('speaker', LAYOUT.doorX - 20);
}

// Pessoas que vivem neste cômodo agora + quem está conversando com o rei
function roomPeople(app: App, inlineSpeaker?: string, ev?: GameEvent): ActorSpec[] {
  const s = app.s;
  const room = s.castle.room;
  const list: ActorSpec[] = [];
  const seen = new Set<string>(['rei']);
  const comp = room === 'salao' ? (s.flags.companion as string | undefined) : undefined;
  if (comp) seen.add(comp);
  presentIn(s, room).forEach(({ id, where }, i) => {
    if (seen.has(id)) return;
    seen.add(id);
    const [x, y] = spotPos(room, where.spot, i);
    // à mesa do conselho, quem senta do lado de baixo olha para a mesa
    const dir = room === 'conselho' && y > 460 ? 'north' : 'south';
    list.push({ key: `npc-${id}`, id, x, foot: y, facing: 1, anim: 'idle', dir });
  });
  const extra = [...(inlineSpeaker && inlineSpeaker !== 'rei' ? [inlineSpeaker] : []), ...(ev?.present ?? [])];
  const k = s.castle;
  extra.forEach((id, i) => {
    if (seen.has(id)) return;
    seen.add(id);
    const x = Math.min(ROOMS[room].walk[2], k.x + 90 + i * 60), y = k.y - 10 + i * 18;
    list.push({ key: `npc-${id}`, id, x, foot: y, facing: -1, anim: 'talk', dir: 'west' });
  });
  return list;
}

function sceneActors(app: App): ActorSpec[] {
  const s = app.s;
  const d = app.ui.dialog;
  const ev = d ? eventOf(s.audiences.find((a) => a.uid === d.uid)!) : undefined;
  const inlineSpeaker = ev && isInline(s, ev) ? speakerOf(s, ev) : undefined;
  if (s.castle.room !== 'salao') {
    return [{ key: 'rei', id: 'rei', x: s.castle.x, foot: s.castle.y, facing: 1, anim: 'idle', free: true, dir: ev?.kind === 'reuniao' ? 'west' : 'north' }, ...roomPeople(app, inlineSpeaker, ev)];
  }
  const queued = ev && !inlineSpeaker ? ev : undefined;
  const waitingIds = waiting(app).slice(0, 2).map((a) => eventOf(a).speaker);
  const list = app.throneActors([...(queued ? [queued.speaker] : []), ...waitingIds]);
  const rei = list.find((x) => x.key === 'rei')!;
  if (d?.phase === 'talk' && s.castle.seated) rei.anim = d.reply ? 'seated' : 'seatedThink';
  waiting(app)
    .slice(0, 2)
    .forEach((a, i) => {
      const id = eventOf(a).speaker;
      if (id !== queued?.speaker) list.push({ key: `wait-${a.uid}`, id, x: WAIT_X[i], foot: WAIT_FOOT, facing: 1, anim: 'idle' });
    });
  if (d && queued) list.push({ key: 'speaker', id: queued.speaker, x: LAYOUT.speakerX, foot: LAYOUT.floorY, facing: 1, anim: d.phase === 'entering' ? 'bow' : d.reply ? 'idle' : 'talk' });
  const skip = new Set([...waitingIds, ...(queued ? [queued.speaker] : [])]);
  return [...list, ...roomPeople(app, inlineSpeaker, ev).filter((a) => !skip.has(a.id))];
}

// Portas e pessoas clicáveis sobre o cenário
function markers(app: App, actors: ActorSpec[]): SceneMarker[] {
  const s = app.s;
  if (app.ui.dialog) return [];
  const R = ROOMS[s.castle.room];
  const out: SceneMarker[] = R.exits.filter((e) => ROOMS[e.to].ready).map((e) => ({ key: `exit-${e.to}`, x: e.x, y: e.y - 44, label: `${iconImg('seta')} ${e.label}`, act: 'exit', arg: e.to, kind: 'porta' as const }));
  for (const a of actors) if (a.key.startsWith('npc-')) out.push({ key: a.key, x: a.x, y: a.foot - 108, label: esc(shortName(a.id)), act: 'talk', arg: a.id, kind: 'pessoa' });
  // Anel de ações: tocar no rei abre o que dá para fazer ali mesmo
  const [kx, ky] = s.castle.room === 'salao' && s.castle.seated ? [640, 330] : [s.castle.x, s.castle.y];
  if (app.ui.ring) {
    const acts = activitiesIn(s, s.castle.room);
    const items = [...acts.map((a) => ({ label: `${iconImg(a.icon)} ${esc(a.label)}`, act: 'activity', arg: a.id })),
      { label: `${iconImg('pergaminho')} Agenda`, act: 'agenda', arg: '' }, { label: `${iconImg('castelo')} Ir a…`, act: 'castleMap', arg: '' }];
    const n = items.length;
    items.forEach((it, i) => {
      const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const x = Math.max(150, Math.min(1130, kx + Math.cos(ang) * 190));
      const y = Math.max(150, Math.min(640, ky - 50 + Math.sin(ang) * 120));
      out.push({ key: `ring-${i}`, x, y, label: it.label, act: it.act, arg: it.arg, kind: 'acao' });
    });
  } else out.push({ key: 'ring-hint', x: kx, y: ky - 118, label: `${iconImg('estrela')} Ações`, act: 'ring', arg: '', kind: 'acao' });
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
  return `<div class="room-plaque parchment">
      <b>${esc(R.name)}</b><small>${esc(R.desc)}</small>
      <em class="mood mood-${mood}">${esc(MOOD_LOOK[mood])}</em>
    </div>
    <div class="castle-dock">
      <button class="dock-btn" data-act="agenda">${iconImg('pergaminho', 'ico-lg')}<span>Agenda${next ? `<small>${fmt(next.hour)} ${esc(next.title)}</small>` : ''}</span></button>
      <button class="dock-btn" data-act="castleMap">${iconImg('castelo', 'ico-lg')}<span>Castelo<small>Ir a · Onde está?</small></span></button>
      ${s.hour < DAY_END ? `<button class="dock-btn" data-act="waitHour">${iconImg('ampulheta', 'ico-lg')}<span>${s.hour < 8 ? 'Esperar a corte abrir<small>As portas abrem às 8h</small>' : 'Esperar 1 hora'}</span></button>` : ''}
      ${s.castle.room !== 'quarto' ? `<button class="dock-btn end" data-act="endDay">${iconImg('selo', 'ico-lg')}<span>Encerrar o dia<small>Voltar ao quarto e dormir</small></span></button>` : ''}
    </div>
    ${away && vis.length ? `<button class="hall-call ${urgent ? 'urgent' : ''}" data-act="travel" data-arg="salao">${urgent ? `${portrait(eventOf(urgent).speaker, 'q-portrait')}<span><b>Urgente no salão</b><small>${esc(char(eventOf(urgent).speaker).name)} não pode esperar</small></span>` : `${iconImg('povo', 'ico-lg')}<span><b>${vis.length} aguardam no salão</b><small>Ir ao Salão do Trono</small></span>`}</button>` : ''}`;
}

const fmt = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

export function render(app: App): string {
  const s = app.s;
  const d = app.ui.dialog;
  const vis = visibleAudiences(s);
  const current = d ? s.audiences.find((a) => a.uid === d.uid) : undefined;
  const ev = current ? eventOf(current) : undefined;
  const inSalao = s.castle.room === 'salao';

  app.scene.setRoom(inSalao ? 'trono' : (s.castle.room as Exclude<typeof s.castle.room, 'salao'>));
  for (const e of ROOMS[s.castle.room].exits) if (e.to !== 'salao') app.scene.prefetch(e.to as Exclude<typeof e.to, 'salao'>);
  const actors = sceneActors(app);
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
        <p>${esc(text)}</p>
        ${table}
        ${d.advice && !d.reply ? `<div class="whisper">${portrait(d.advice.who, 'whisper-portrait')}<p>${esc(d.advice.text)}</p></div>` : ''}
        ${canConsult ? `<button class="consult ${eager ? 'eager' : ''}" data-act="consult" title="Quem está ao seu lado pode sugerir outra saída">${portrait(comp!, 'consult-portrait')}<span>${eager ? `${esc(char(comp!).name.split(' ')[0])} quer dizer algo` : `Pedir conselho`}</span></button>` : ''}
        ${d.reply ? '' : `<button class="infl-toggle ${app.ui.useInfluence ? 'on' : ''}" data-act="toggleInfl" title="Gaste Influência para reduzir as penalidades políticas da sua escolha">${iconImg('flor')} Usar Influência <b>${s.res.influencia}</b></button>`}
      </div>
      <div class="choices ${choices.length > 5 ? 'many' : ''}">
        ${d.reply ? `<button class="choice c-dourado wide" data-act="finish">${iconImg('seta', 'ico-xl')}<span class="choice-text"><b>Continuar</b><small>${ev.kind === 'reuniao' ? 'A reunião termina' : isInline(s, ev) ? 'Seguir pelo castelo' : 'A audiência termina'}</small></span></button>` : choiceHtml}
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
    const who = speakerOf(s, ev);
    const realm = char(who).realm;
    const mood = () => (s.rel[who] ?? 0) + (realm in s.loyalty ? s.loyalty[realm as keyof typeof s.loyalty] : 0);
    const before = mood();
    applyEffect(s, ch.effects, { soften, origin: { day: s.day, event: ev.topic, decision: ch.label } });
    if (ev.council && first) recordVote(s, ev, ch.seat ?? null);
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
  if (act === 'finish') {
    dismissSpeaker(app);
    app.ui.dialog = null;
    save(s);
    if (ev.kind === 'noite') return app.doEndDay(); // depois do encontro noturno, o dia acaba
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
