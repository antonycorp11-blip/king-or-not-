import type { App } from '../app';
import { EVIDENCE_MAP, KIND_INFO, MISSIONS, MISSION_MAP, PHASES, SUSPECTS, WITNESSES, type SuspectId } from '../../data/investigation';
import { ROOMS } from '../../data/castle';
import { char } from '../../data/characters';
import { canConfront, evidencePoints, has, inv, phase, pimentaFree, seenKind, startMission, suspicion, interrogate, type AskMode } from '../../engine/investigation';
import { save } from '../../engine/core';
import { spendHours, canSpend } from '../../engine/day';
import { iconImg } from '../../render/pixel';
import { esc, portrait } from '../common';

// A MESA DE INVESTIGAÇÃO
// Um mural medieval: o rei morto no centro, os cinco suspeitos em volta, as
// evidências pregadas por fase e fios ligando cada coisa a quem ela aponta.

type Tab = 'detalhe' | 'missoes' | 'interrogar' | 'confrontar';
let tab: Tab = 'detalhe';
let sel: string | null = null; // 'ev:<id>' ou 'sus:<id>'
let answer: { who: string; text: string; ev?: string } | null = null;
let askWho: string | null = null;

const heatLabel = (h: number) => (h >= 60 ? 'alerta' : h >= 35 ? 'desconfiado' : h >= 15 ? 'atento' : 'tranquilo');

export function render(app: App): string {
  const s = app.s;
  const I = inv(s);
  app.scene.setMode('dim');
  if (!I.open) return `<div class="panel dark inv-panel"><p class="sub">Nada a investigar. Por enquanto.</p></div>`;
  const sus = suspicion(s);
  const ph = phase(s);
  const found = I.found.map((f) => ({ f, d: EVIDENCE_MAP[f.id] })).filter((x) => x.d);

  const suspects = SUSPECTS.map((id) => {
    const secret = found.some(({ d }) => d.secretOf === id);
    const flags = [I.accused?.id === id ? (I.accused.correct ? 'acusado' : 'acusado?') : '', I.fled === id ? 'fugiu' : '', I.informant === id ? 'informante' : '', secret ? 'segredo' : ''].filter(Boolean);
    return `<button class="inv-sus ${sel === `sus:${id}` ? 'sel' : ''}" data-act="invSel" data-arg="sus:${id}" data-sus="${id}">
      ${portrait(id, 'inv-sus-portrait')}
      <b>${esc(char(id).name.replace(/^(Mestre|Lorde|Chanceler) /, ''))}</b>
      <div class="inv-bar"><i style="width:${sus[id]}%"></i></div><em>${sus[id]}%</em>
      <small class="heat h-${heatLabel(I.heat[id])}">${iconImg('olho')} ${heatLabel(I.heat[id])}</small>
      ${flags.length ? `<span class="inv-tags">${flags.map((t) => `<i>${t}</i>`).join('')}</span>` : ''}
    </button>`;
  }).join('');

  const cols = [1, 2, 3, 4, 5, 6].map((p) => `<div class="inv-col ${p <= ph ? 'open' : ''}"><h4>${p}. ${PHASES[p - 1]}</h4>${found.filter(({ d }) => d.phase === p).map(({ f, d }) => {
    const k = seenKind(s, d);
    const debunked = d.kind === 'falsa' && has(s, `desmascara_${d.planted}`);
    return `<button class="inv-ev ${sel === `ev:${d.id}` ? 'sel' : ''} ${debunked ? 'debunked' : ''}" data-act="invSel" data-arg="ev:${d.id}" data-ev="${d.id}" style="--kc:${KIND_INFO[k].color}">
      <i class="pin"></i><small>${KIND_INFO[k].name}</small><b>${esc(d.title)}</b><span>${esc(f.source)} · dia ${f.day}</span>
    </button>`;
  }).join('') || '<p class="inv-empty">…</p>'}</div>`).join('');

  const track = PHASES.map((n, i) => `<span class="${i + 1 < ph ? 'done' : i + 1 === ph ? 'now' : ''}" title="${esc(n)}">${i + 1}</span>`).join('');
  const pim = I.pimenta.status !== 'ok' ? `Pimenta está ${I.pimenta.status === 'ferido' ? 'ferido' : 'escondido'} até o dia ${I.pimenta.until}`
    : I.report ? `Pimenta voltou e espera o rei (veja a agenda)`
    : I.mission ? `Pimenta: ${MISSION_MAP[I.mission.id].name.toLowerCase()} · volta em ~${Math.max(1, Math.round(I.mission.doneAt - (s.day * 24 + s.hour)))}h`
    : I.eyes ? 'Pimenta está livre para uma missão' : 'Pimenta ainda não se ofereceu';

  return `<div class="panel dark inv-panel">
    <header class="inv-head">
      <div><h2>${iconImg('olho', 'ico-lg')} A Morte do Rei Odran</h2><small>Fase ${ph}: ${esc(PHASES[ph - 1])}</small></div>
      <div class="inv-track">${track}</div>
      <div class="inv-pim">${portrait('pimenta', 'inv-pim-portrait')}<span>${esc(pim)}<small>Perigo para Pimenta: ${I.pimenta.danger >= 60 ? 'alto' : I.pimenta.danger >= 30 ? 'médio' : 'baixo'}</small></span></div>
    </header>
    <div class="inv-body">
      <div class="inv-board" id="inv-board">
        <svg class="inv-lines" id="inv-lines"></svg>
        <div class="inv-sus-row">${suspects.slice(0, suspects.length)}</div>
        <div class="inv-center"><b>† Rei Odran</b><small>"Febre", diz o atestado.</small></div>
        <div class="inv-cols">${cols}</div>
      </div>
      <aside class="inv-side">
        <nav class="inv-tabs">${(['detalhe', 'missoes', 'interrogar', 'confrontar'] as Tab[]).map((t) => `<button class="${tab === t ? 'on' : ''}" data-act="invTab" data-arg="${t}">${({ detalhe: 'Detalhe', missoes: 'Pimenta', interrogar: 'Interrogar', confrontar: 'Confrontar' } as Record<Tab, string>)[t]}</button>`).join('')}</nav>
        <div class="inv-pane">${pane(app)}</div>
      </aside>
    </div>
    <p class="inv-hint">O índice mostra quanto as evidências <b>encontradas</b> apontam para cada um. Não é a verdade: provas podem ser falsas, e o culpado pode ter escondido as dele.</p>
  </div>`;
}

function pane(app: App): string {
  const s = app.s;
  const I = inv(s);
  if (tab === 'missoes') {
    if (!I.eyes) return '<p class="sub">Pimenta ainda não se ofereceu para ser seus olhos. Ele vai procurar o rei.</p>';
    if (!pimentaFree(s)) return `<p class="sub">${I.mission ? `Pimenta está em missão: <b>${esc(MISSION_MAP[I.mission.id].name)}</b>. Uma de cada vez.` : I.report ? 'Pimenta voltou e espera o rei para contar o que achou. Veja a agenda.' : 'Pimenta não pode sair agora.'}</p>`;
    return `<ul class="inv-missions">${MISSIONS.map((m) => {
      const done = I.missionsDone[m.id] ?? 0;
      const dur = m.hours >= 20 ? `${Math.round(m.hours / 24 * 10) / 10} dia(s)` : `${m.hours}h`;
      return `<li><span><b>${esc(m.name)}</b><small>${esc(m.desc)}</small><small>${dur} · risco ${m.risk >= 0.18 ? 'alto' : m.risk >= 0.1 ? 'médio' : 'baixo'}${m.target ? ` · ${esc(char(m.target).name.split(' ').slice(-1)[0])} pode perceber` : ''}${done ? ` · feita ${done}x` : ''}</small></span><button class="btn sm" data-act="invMission" data-arg="${m.id}">Enviar</button></li>`;
    }).join('')}</ul>`;
  }
  if (tab === 'interrogar') {
    const list = WITNESSES.map((w) => `<button class="inv-wit ${askWho === w.id ? 'on' : ''}" data-act="invWho" data-arg="${w.id}">${portrait(w.id, 'inv-wit-portrait')}<span><b>${esc(w.name)}</b><small>${esc(w.role)}${I.interrogated[w.id] ? ` · ${I.interrogated[w.id]}x` : ''}</small></span></button>`).join('');
    const ask = askWho ? `<div class="inv-ask"><p>Como perguntar a ${esc(WITNESSES.find((w) => w.id === askWho)!.name)}? <small>30 min</small></p>
      <div class="row"><button class="btn sm" data-act="invAsk" data-arg="calmo">Com calma</button><button class="btn sm" data-act="invAsk" data-arg="pressionar">Pressionar</button><button class="btn sm" data-act="invAsk" data-arg="moedas">Oferecer 20 moedas</button></div></div>` : '';
    const ans = answer ? `<div class="inv-answer"><b>${esc(answer.who)}</b><p>${esc(answer.text)}</p>${answer.ev ? `<button class="btn sm" data-act="invSel" data-arg="ev:${answer.ev}">Ver na mesa</button>` : ''}</div>` : '';
    return `${ask}${ans}<div class="inv-wits">${list}</div>`;
  }
  if (tab === 'confrontar') {
    const sus = suspicion(s);
    return `<p class="sub">Confronte quando houver ao menos duas evidências contra alguém. Acusar formalmente não tem volta.</p><ul class="inv-conf">${SUSPECTS.map((id) => {
      const can = canConfront(s, id) && I.fled !== id;
      return `<li>${portrait(id, 'inv-wit-portrait')}<span><b>${esc(char(id).name)}</b><small>${sus[id]}% · ${(I.confronted[id] ?? []).length} conversa(s)</small></span>
        <button class="btn sm" data-act="invConfront" data-arg="${id}" ${can ? '' : 'disabled'}>Conversar a sós</button>
        <button class="btn sm danger" data-act="invAccuse" data-arg="${id}" ${I.accused || I.fled === id || sus[id] < 20 ? 'disabled' : ''}>Acusar</button></li>`;
    }).join('')}</ul>${I.accused ? `<p class="inv-verdict">${esc(char(I.accused.id).name)} foi acusado no dia ${I.accused.day}.</p>` : ''}`;
  }
  // detalhe
  if (sel?.startsWith('ev:')) {
    const d = EVIDENCE_MAP[sel.slice(3)];
    const f = I.found.find((x) => x.id === d.id);
    const k = seenKind(s, d);
    const pts = evidencePoints(d);
    const links = (d.links ?? []).map((l) => I.found.map((x) => EVIDENCE_MAP[x.id]).find((e) => e.slot === l || e.id === l)).filter(Boolean);
    return `<div class="inv-detail" style="--kc:${KIND_INFO[k].color}">
      <small class="kind">${KIND_INFO[k].name}</small><h3>${esc(d.title)}</h3><p>${esc(d.text)}</p>
      <small>Origem: ${esc(f?.source ?? d.source)} · dia ${f?.day}</small>
      ${pts.length ? `<div class="inv-pts">${pts.map(([id, v]) => `<span class="${v > 0 ? 'up' : 'down'}">${portrait(id, 'inv-pt-portrait')}${v > 0 ? 'aponta para' : 'afasta'} ${esc(char(id).name.split(' ').slice(-1)[0])}</span>`).join('')}</div>` : '<small>Não aponta para ninguém. Ainda.</small>'}
      ${links.length ? `<small>Conecta com: ${links.map((e) => esc(e!.title)).join(' · ')}</small>` : ''}
      ${d.secretOf ? `<p class="inv-secret">Um segredo de ${esc(char(d.secretOf).name)}. Verdade, mas não necessariamente o crime.</p>` : ''}
      ${d.kind === 'falsa' && k === 'falsa' ? '<p class="inv-secret">Desmascarada: alguém plantou esta prova.</p>' : ''}
    </div>`;
  }
  if (sel?.startsWith('sus:')) {
    const id = sel.slice(4) as SuspectId;
    const sus = suspicion(s)[id];
    const pro = I.found.map((f) => EVIDENCE_MAP[f.id]).filter((d) => (d.points[id] ?? 0) > 0);
    const con = I.found.map((f) => EVIDENCE_MAP[f.id]).filter((d) => (d.points[id] ?? 0) < 0);
    return `<div class="inv-detail">
      <div class="inv-sus-head">${portrait(id, 'inv-sus-portrait')}<span><h3>${esc(char(id).name)}</h3><small>Índice de suspeita: <b>${sus}%</b> · atenção: ${heatLabel(I.heat[id])}</small></span></div>
      <h4>Contra</h4>${pro.length ? `<ul>${pro.map((d) => `<li><button class="linkish" data-act="invSel" data-arg="ev:${d.id}">${esc(d.title)}</button></li>`).join('')}</ul>` : '<small>Nada ainda.</small>'}
      <h4>A favor</h4>${con.length ? `<ul>${con.map((d) => `<li><button class="linkish" data-act="invSel" data-arg="ev:${d.id}">${esc(d.title)}</button></li>`).join('')}</ul>` : '<small>Nada ainda.</small>'}
      <div class="row"><button class="btn sm" data-act="invTab" data-arg="confrontar">Confrontar ou acusar</button></div>
    </div>`;
  }
  return `<p class="sub">Toque num suspeito ou numa evidência para ver os detalhes. Pimenta traz pistas em missões; a criadagem sabe horários e corredores; os suspeitos se contradizem.</p>`;
}

export function handle(app: App, act: string, arg: string) {
  const s = app.s;
  switch (act) {
    case 'invSel': sel = arg; tab = 'detalhe'; return app.render();
    case 'invTab': tab = arg as Tab; return app.render();
    case 'invMission': {
      const q = startMission(s, arg);
      if (q) { save(s); app.toast(`Pimenta sai: ${q}`); }
      return app.render();
    }
    case 'invWho': askWho = arg; answer = null; return app.render();
    case 'invAsk': {
      if (!askWho) return;
      if (!canSpend(s, 0.5)) { app.toast('Não há mais horas hoje.'); return; }
      spendHours(s, 0.5, 'trabalho');
      const r = interrogate(s, askWho, arg as AskMode);
      const w = WITNESSES.find((x) => x.id === askWho)!;
      answer = { who: w.name, text: r.ev ? `${r.line} "${r.ev.text}"` : r.line, ev: r.ev?.id };
      save(s);
      return app.render();
    }
    case 'invConfront': app.go('trono'); app.openInline(`confronto_${arg}`); return;
    case 'invAccuse': {
      if (!window.confirm(`Acusar ${char(arg).name} formalmente pela morte do rei Odran? Não há volta.`)) return;
      app.go('trono'); app.openInline(`acusacao_${arg}`); return;
    }
  }
}

// Depois de montar: desenha os fios entre evidências e suspeitos
export function after(app: App) {
  const board = app.stage.querySelector<HTMLElement>('#inv-board');
  const svg = app.stage.querySelector<SVGSVGElement>('#inv-lines');
  if (!board || !svg) return;
  const k = app.stage.getBoundingClientRect().width / app.stage.offsetWidth || 1;
  const br = board.getBoundingClientRect();
  const pos = (el: Element) => { const r = el.getBoundingClientRect(); return [(r.left - br.left + r.width / 2) / k, (r.top - br.top + r.height / 2) / k] as const; };
  svg.setAttribute('width', String(board.scrollWidth)); svg.setAttribute('height', String(board.scrollHeight));
  const lines: string[] = [];
  for (const el of board.querySelectorAll<HTMLElement>('.inv-ev')) {
    const d = EVIDENCE_MAP[el.dataset.ev!];
    const [x1, y1] = pos(el);
    const hot = sel === `ev:${d.id}`;
    for (const [id, v] of evidencePoints(d)) {
      const t = board.querySelector(`.inv-sus[data-sus="${id}"]`);
      if (!t) continue;
      const [x2, y2] = pos(t);
      lines.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${v > 0 ? 'pro' : 'con'} ${hot ? 'hot' : ''}" style="stroke-width:${Math.min(5, 1 + Math.abs(v) / 5)}"/>`);
    }
    for (const l of d.links ?? []) {
      const other = [...board.querySelectorAll<HTMLElement>('.inv-ev')].find((o) => { const od = EVIDENCE_MAP[o.dataset.ev!]; return od.slot === l || od.id === l; });
      if (!other) continue;
      const [x2, y2] = pos(other);
      lines.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="link ${hot ? 'hot' : ''}"/>`);
    }
  }
  svg.innerHTML = lines.join('');
}

export const roomName = (r: keyof typeof ROOMS) => ROOMS[r].name;
