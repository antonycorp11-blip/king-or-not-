import type { App } from './app';
import type { GameState } from '../types';
import { MARRIAGE_DEADLINE, ACT_END } from '../engine/core';
import { upcomingBig, visibleAudiences } from '../engine/day';
import { computeEconomy } from '../engine/economy';
import { inv, phase } from '../engine/investigation';
import { GOODS, PROVINCES } from '../data/realm';
import { char } from '../data/characters';
import { EVENT_MAP } from '../data/events';
import { iconImg } from '../render/pixel';
import { esc } from './common';

// OBJETIVOS SEMPRE À VISTA
// Três metas no máximo, na ordem: a grande história (casamento, guerra, o fim
// da Parte 1), o caso de Odran (qual o próximo passo), e o que pede o rei agora.
// Cada uma é um atalho: tocar leva aonde se resolve.

interface Goal { icon: string; text: string; hot?: boolean; act?: string; arg?: string; kind: 'main' | 'caso' | 'agora' }

const SUITOR = (id: string) => char(id).name.replace(/^(Lady|Princesa) /, '');

export function objectives(s: GameState): Goal[] {
  const out: Goal[] = [];
  // 1. a grande história
  const big = upcomingBig(s, 4)[0];
  if (s.war && !s.war.result) out.push({ kind: 'main', icon: 'espadas', text: 'Vencer a guerra', hot: true, act: 'go', arg: 'guerra' });
  else if (!s.spouse && s.day <= MARRIAGE_DEADLINE) {
    const d = MARRIAGE_DEADLINE - s.day;
    const when = d <= 0 ? 'hoje' : d === 1 ? 'amanhã' : `em ${d} dias`;
    out.push(s.flags.noiva
      ? { kind: 'main', icon: 'coroa', text: `Casamento com ${SUITOR(String(s.flags.noiva))} · ${when}`, hot: d <= 2 }
      : { kind: 'main', icon: 'coroa', text: `Escolher uma noiva · prazo ${when}`, hot: d <= 5, act: 'go', arg: 'corte' });
  } else if (big) {
    const d = big.day - s.day;
    out.push({ kind: 'main', icon: 'estrela', text: `${big.ev.big!.title} · ${d <= 1 ? 'amanhã' : `em ${d} dias`}` });
  } else out.push({ kind: 'main', icon: 'castelo', text: `Manter o reino de pé · faltam ${Math.max(0, ACT_END - s.day + 1)} dias` });

  // 2. o caso de Odran
  const I = s.investigation ? inv(s) : null;
  if (I && !I.accused) {
    if (!I.open) out.push({ kind: 'caso', icon: 'olho', text: 'Procurar Pimenta na galeria ao entardecer', act: 'travel', arg: 'galeria' });
    else if (I.report) out.push({ kind: 'caso', icon: 'olho', text: 'Pimenta voltou: ouvir o relatório', hot: true, act: 'go', arg: 'investigacao' });
    else if (!I.eyes) out.push({ kind: 'caso', icon: 'olho', text: 'Falar com Pimenta nos arquivos', act: 'travel', arg: 'arquivos' });
    else if (phase(s) >= 5) out.push({ kind: 'caso', icon: 'olho', text: 'Confrontar ou acusar o culpado', hot: true, act: 'go', arg: 'investigacao' });
    else if (I.mission) out.push({ kind: 'caso', icon: 'olho', text: 'Pimenta está investigando…', act: 'go', arg: 'investigacao' });
    else out.push({ kind: 'caso', icon: 'olho', text: `Descobrir quem matou Odran · fase ${phase(s)} de 7`, act: 'go', arg: 'investigacao' });
  }

  // 3. o que pede o rei agora
  const vis = visibleAudiences(s);
  const urgent = vis.find((a) => EVENT_MAP[a.eventId]?.kind === 'urgente');
  const eco = computeEconomy(s);
  if (urgent) out.push({ kind: 'agora', icon: 'selo', text: 'Urgente no salão do trono', hot: true, act: 'travel', arg: 'salao' });
  else if (s.crowd?.spont && !s.crowd.spont.handled) out.push({ kind: 'agora', icon: 'povo', text: 'Uma multidão espera o rei', hot: true, act: 'go', arg: 'praca' });
  else if (s.skillPoints > 0) out.push({ kind: 'agora', icon: 'estrela', text: `Gastar ${s.skillPoints} ponto${s.skillPoints > 1 ? 's' : ''} de habilidade`, act: 'go', arg: 'rei' });
  else if (s.crowd?.pending?.length) out.push({ kind: 'agora', icon: 'povo', text: 'O povo espera ouvir o rei', act: 'go', arg: 'praca' });
  else if (eco.shortages.length) {
    const sh = eco.shortages[0];
    out.push({ kind: 'agora', icon: 'trigo', text: `Falta ${GOODS[sh.good].name.toLowerCase()} em ${PROVINCES[sh.province].name}`, act: 'go', arg: 'provincias' });
  } else if (vis.length && s.castle.room !== 'salao') out.push({ kind: 'agora', icon: 'povo', text: `${vis.length} esperam no salão`, act: 'travel', arg: 'salao' });
  return out.slice(0, 3);
}


export function renderObjectives(app: App): string {
  const s = app.s;
  if (s.flags.nightPending || app.ui.dialog) return '';
  const goals = objectives(s);
  if (!goals.length) return '';
  const collapsed = !!app.ui.objCollapsed;
  return `<div class="objectives ${collapsed ? 'collapsed' : ''}">
    <button class="obj-head" data-act="objToggle" title="${collapsed ? 'Mostrar objetivos' : 'Recolher'}">${iconImg('pergaminho')}<span>Objetivos</span><i>${collapsed ? '▸' : '▾'}</i></button>
    ${collapsed ? '' : goals.map((g) => `<button class="obj obj-${g.kind} ${g.hot ? 'hot' : ''}" ${g.act ? `data-act="${g.act}" data-arg="${esc(g.arg ?? '')}"` : 'disabled'}>${iconImg(g.icon)}<span>${esc(g.text)}</span></button>`).join('')}
  </div>`;
}
