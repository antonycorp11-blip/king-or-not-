import { inPortal } from '../engine/cloud';
import type { Resources, ScreenId } from '../types';
import type { App } from './app';
import type { Expr } from '../render/actors';
import { MARRIAGE_DEADLINE, governabilidade, govLabel, influenceGain } from '../engine/core';
import { computeEconomy } from '../engine/economy';
import { currentObjective, upcomingBig, visibleAudiences } from '../engine/day';
import { unreadCount } from '../engine/letters';
import { moodLabel, MOOD_LOOK, MOOD_NAMES } from '../engine/mood';
import { iconImg } from '../render/pixel';
import { esc, portrait } from './common';

// HUD do reino: o relógio de vela com o rosto do rei, só três números sempre à vista,
// o resto num pergaminho. Mudanças aparecem como números que sobem e somem.

export interface FeedItem { day: number; hour: number; text: string }

const MOOD_EXPR: Record<string, Expr> = {
  satisfeito: 'feliz', esperancoso: 'feliz', sereno: 'neutro', cansado: 'preocupado', preocupado: 'preocupado',
  triste: 'preocupado', abalado: 'preocupado', irritado: 'irritado', furioso: 'irritado',
};

const fmtHour = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

export function renderHud(app: App): string {
  const s = app.s;
  const night = !!s.flags.nightPending;
  const gov = governabilidade(s);
  const eco = computeEconomy(s);
  const mood = moodLabel(s);
  // vela: queima das 8h às 20h
  const left = night ? 0 : Math.max(0, Math.min(1, (20 - s.hour) / 12));
  const nav: [ScreenId, string, string][] = [
    // livros e cartas são lugares do castelo (estantes da biblioteca, escrivaninha do quarto)
    ['trono', 'coroa', 'Castelo'], ['provincias', 'castelo', 'Províncias'],
    ['rei', 'estrela', 'O Rei'], ['corte', 'povo', 'Casas'], ['guerra', 'espadas', 'Guerra'],
  ];
  const badge = (id: ScreenId) => {
    if (id === 'rei' && s.skillPoints > 0) return `<em>${s.skillPoints}</em>`;
    if (id === 'guerra' && s.war && !s.war.result) return '<em>!</em>';
    if (id === 'trono') { const n = visibleAudiences(s).length; return n ? `<em>${n}</em>` : ''; }
    if (id === 'corte') { const n = unreadCount(s); return n ? `<em class="mail-badge">${n}</em>` : ''; }
    return '';
  };
  const unseen = app.feed.length - app.feedSeen;
  const chip = (key: string, icon: string, val: string, label: string, tip: string, bad = false) =>
    `<button class="hud-chip ${bad ? 'bad' : ''}" data-act="estado" data-res="${key}" title="${esc(tip)}">${iconImg(icon, 'ico-lg')}<span><b>${val}</b><small>${label}</small></span></button>`;
  return `<div class="topbar hud">
    <button class="hud-king" data-act="estado" title="${esc(MOOD_LOOK[mood])}">
      ${portrait('rei', 'hud-portrait', MOOD_EXPR[mood])}
      <span class="hud-time"><b>Dia ${s.day}</b><em>${night ? '21:00' : fmtHour(s.hour)}</em><small>${MOOD_NAMES[mood]}</small></span>
      <span class="candle" aria-label="Horas restantes"><i style="height:${Math.round(left * 100)}%"></i><u></u></span>
    </button>
    ${countdown(app)}
    <div class="hud-res">
      ${chip('ouro', 'moedas', String(s.res.ouro), `${eco.net >= 0 ? '+' : ''}${eco.net}/dia`, 'Tesouro real e saldo diário', s.res.ouro < 0)}
      ${chip('influencia', 'flor', String(s.res.influencia), `+${influenceGain(s)}/dia`, 'Influência: moeda política')}
      ${chip('gov', 'escudo', String(gov), govLabel(gov), 'Governabilidade: povo, prestígio e casas', gov < 35)}
      <button class="hud-more" data-act="estado">${iconImg('pergaminho')}<span>Estado do reino</span></button>
    </div>
    <div class="hud-right">
      <button class="bell ${unseen > 0 ? 'ring' : ''}" data-act="feed" title="Avisos e mensagens">${iconImg('selo', 'ico-lg')}${unseen > 0 ? `<em>${Math.min(unseen, 9)}</em>` : ''}</button>
      <button class="nav-toggle" data-act="navToggle" aria-expanded="${app.ui.navOpen}">${iconImg('estrela', 'ico-lg')}</button>
      <nav class="nav ${app.ui.navOpen ? 'open' : ''}">${nav.map(([id, icon, label]) => `<button class="medal ${app.ui.screen === id ? 'on' : ''} ${id === 'corte' && unreadCount(s) ? 'blink' : ''}" data-act="go" data-arg="${id}" title="${label}" ${night ? 'disabled' : ''}>${iconImg(icon, 'ico-lg')}${badge(id)}<span>${label}</span></button>`).join('')}
        <button class="medal help-btn" data-act="ajustes" title="Ajustes, ajuda e sair">${iconImg('engrenagem', 'ico-lg')}<span>Ajustes</span></button></nav>
    </div>
  </div>`;
}

// O que vem por aí: o próximo grande dia e o prazo do casamento
function countdown(app: App): string {
  const s = app.s;
  const items: string[] = [];
  const big = upcomingBig(s, 4)[0];
  if (big) { const d = big.day - s.day; items.push(`<span class="cd-big">${iconImg('estrela')} ${esc(big.ev.big!.title)} · ${d === 1 ? 'amanhã' : `em ${d} dias`}</span>`); }
  if (!s.spouse && s.day < MARRIAGE_DEADLINE) { const d = MARRIAGE_DEADLINE - s.day; items.push(`<span class="cd-wed ${d <= 5 ? 'hot' : ''}">${iconImg('coroa')} Casamento ${s.flags.noiva ? 'marcado' : 'sem noiva'} · ${d} dia${d > 1 ? 's' : ''}</span>`); }
  return items.length ? `<div class="hud-countdown">${items.join('')}</div>` : '';
}

// Ajustes: ajuda, dicas e sair do jogo (dentro do portal, o jogo tem o próprio botão de sair)
export function renderAjustes(app: App): string {
  return `<div class="modal-back castle-modal-back"><div class="parchment modal castle-modal ajustes-modal">
    <button class="modal-x" data-act="closeFeed" aria-label="Fechar">×</button>
    <h2>Ajustes</h2>
    <div class="ajustes-list">
      <button class="btn" data-act="help">${iconImg('balao')} Como jogar</button>
      <button class="btn" data-act="tipsToggle">${iconImg('pergaminho')} Dicas: ${app.tipsOff() ? 'desligadas' : 'ligadas'}</button>
      <button class="btn" data-act="guideReset">${iconImg('estrela')} Refazer os tutoriais guiados</button>
      <button class="btn" data-act="toTitle">${iconImg('coroa')} Voltar ao menu inicial</button>
      ${inPortal() ? `<button class="btn primary" data-act="exitGame">${iconImg('seta')} Sair do jogo</button>` : ''}
    </div>
    <p class="sub">O jogo salva sozinho a cada ação.</p>
  </div></div>`;
}

// Pergaminho "Estado do Reino": todos os números, com o que cada um significa
export function renderEstado(app: App): string {
  const s = app.s;
  const gov = governabilidade(s);
  const eco = computeEconomy(s);
  const obj = currentObjective(s);
  const mood = moodLabel(s);
  const row = (icon: string, name: string, val: string, text: string, bad = false) => `<li class="${bad ? 'bad' : ''}">${iconImg(icon, 'ico-lg')}<span><b>${name}</b><small>${text}</small></span><em>${val}</em></li>`;
  return `<div class="modal-back castle-modal-back"><div class="parchment modal castle-modal estado-modal">
    <button class="modal-x" data-act="closeEstado" aria-label="Fechar">×</button>
    <h2>Estado do Reino</h2>
    <p class="sub"><b>${esc(obj.title)}</b>: ${esc(obj.text)}</p>
    <p class="sub">${esc(MOOD_LOOK[mood])}</p>
    <ul class="estado-list">
      ${row('moedas', 'Tesouro', String(s.res.ouro), `Impostos ${eco.taxTotal} + comércio ${eco.tradeTotal} − soldo ${eco.upkeep} = ${eco.net >= 0 ? '+' : ''}${eco.net} por dia.`, s.res.ouro < 0)}
      ${row('flor', 'Influência', String(s.res.influencia), `Moeda política: suaviza decisões, paga nomeações. +${influenceGain(s)} por dia.`)}
      ${row('escudo', 'Governabilidade', `${gov} · ${govLabel(gov)}`, 'O quanto o reino aceita ser governado. Nasce do povo, do prestígio e das casas.', gov < 35)}
      ${row('coroa', 'Prestígio', String(s.res.prestigio), 'Respeito dos nobres. Em zero, o conselho depõe o rei.', s.res.prestigio < 25)}
      ${row('povo', 'Povo', String(s.res.povo), 'Apoio das pessoas comuns. Em zero, revolta.', s.res.povo < 25)}
      ${row('espadas', 'Exército', String(s.res.exercito), `Soldados do rei. Soldo de ${eco.upkeep} por dia.`)}
      ${row('escudo', 'Moral', String(s.res.moral), 'Ânimo das tropas. Em zero, a guarda se volta contra o rei.', s.res.moral < 35)}
    </ul>
  </div></div>`;
}

export function renderFeed(app: App): string {
  const items = [...app.feed].reverse().slice(0, 40);
  return `<div class="modal-back castle-modal-back"><div class="parchment modal castle-modal feed-modal">
    <button class="modal-x" data-act="closeFeed" aria-label="Fechar">×</button>
    <h2>Avisos do dia</h2>
    ${items.length ? `<ul class="feed-list">${items.map((f) => `<li><time>Dia ${f.day} · ${fmtHour(f.hour)}</time>${esc(f.text)}</li>`).join('')}</ul>` : '<p class="sub">Nada por enquanto. O castelo está quieto.</p>'}
    <div class="row"><button class="btn" data-act="go" data-arg="corte">Abrir o correio</button><button class="btn primary" data-act="closeFeed">Fechar</button></div>
  </div></div>`;
}

// Números que sobem quando algo muda (comparando com a última renderização)
const WATCH: [keyof Resources | 'gov', string, string][] = [
  ['ouro', 'ouro', 'moedas'], ['influencia', 'influência', 'flor'], ['gov', 'governabilidade', 'escudo'],
  ['prestigio', 'prestígio', 'coroa'], ['povo', 'povo', 'povo'], ['moral', 'moral', 'escudo'], ['exercito', 'soldados', 'espadas'],
];

export function floatDeltas(app: App, prev: Record<string, number> | null): Record<string, number> {
  const s = app.s;
  const now: Record<string, number> = { ...s.res, gov: governabilidade(s) };
  if (!prev) return now;
  let i = 0;
  for (const [key, label] of WATCH) {
    const d = Math.round(now[key] - (prev[key] ?? now[key]));
    if (!d) continue;
    const anchor = app.stage.querySelector<HTMLElement>(`.hud-chip[data-res="${key}"]`) ?? app.stage.querySelector<HTMLElement>('.hud-more');
    if (!anchor) continue;
    const st = app.stage.getBoundingClientRect();
    const r = anchor.getBoundingClientRect();
    const k = app.stage.offsetWidth / st.width;
    const el = document.createElement('div');
    el.className = `float-delta ${d > 0 ? 'up' : 'down'}`;
    el.textContent = `${d > 0 ? '+' : ''}${d} ${key === 'ouro' || key === 'influencia' || key === 'gov' ? '' : label}`;
    el.style.left = `${(r.left - st.left) * k + 20}px`;
    el.style.top = `${(r.bottom - st.top) * k + 4 + i * 30}px`;
    el.style.animationDelay = `${i * 120}ms`;
    app.stage.appendChild(el);
    window.setTimeout(() => el.remove(), 2400 + i * 120);
    i++;
  }
  return now;
}
