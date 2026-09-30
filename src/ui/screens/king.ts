import type { Attr } from '../../types';
import type { App } from '../app';
import { BOOKS, BRANCHES, SKILLS, XP_PER_POINT } from '../../data/progression';
import { attr, hasSkill, save } from '../../engine/core';
import { char } from '../../data/characters';
import { iconImg } from '../../render/pixel';
import { esc, portrait } from '../common';

// O REI: árvore de habilidades
// O rei é a raiz; seis galhos sobem, um por atributo. Cada nó acende quando é
// aprendido. Tocar num nó mostra o que ele faz e o botão de aprender.

const ATTRS: [Attr, string, string][] = [
  ['diplomacia', 'Diplomacia', 'aperto'],
  ['estrategia', 'Estratégia', 'espadas'],
  ['comercio', 'Comércio', 'moedas'],
  ['intriga', 'Intriga', 'mascara'],
  ['carisma', 'Carisma', 'coracao'],
  ['justica', 'Justiça', 'pergaminho'],
];

const TW = 600, TH = 560; // coordenadas da árvore (o desenho escala com a tela)
const BR = Object.keys(BRANCHES) as (keyof typeof BRANCHES)[];
const colX = (i: number) => 50 + i * 100;
const tierY = (t: number) => TH - 110 - (t - 1) * 70;
const ROOT: [number, number] = [TW / 2, TH - 28];

let selected: string | null = null;

function state(app: App, id: string) {
  const s = app.s;
  const k = SKILLS.find((x) => x.id === id)!;
  if (hasSkill(s, id)) return 'owned';
  const open = !k.requires || hasSkill(s, k.requires);
  return open ? (s.skillPoints > 0 ? 'avail' : 'open') : 'locked';
}

export function render(app: App): string {
  const s = app.s;
  app.scene.setMode('dim');
  const avail = SKILLS.filter((k) => state(app, k.id) === 'avail');
  if (!selected || !SKILLS.some((k) => k.id === selected)) selected = avail[0]?.id ?? SKILLS[0].id;

  // galhos: linhas da raiz até o primeiro nó e de cada nó ao seguinte
  const lines: string[] = [];
  const nodes: string[] = [];
  BR.forEach((br, i) => {
    const B = BRANCHES[br];
    const list = SKILLS.filter((k) => k.branch === br).sort((a, b) => a.tier - b.tier);
    let prev: [number, number] = ROOT;
    let prevOwned = true;
    for (const k of list) {
      const x = colX(i), y = tierY(k.tier);
      const st = state(app, k.id);
      const lit = prevOwned && st === 'owned';
      const [px, py] = prev;
      const d = prev === ROOT ? `M${px},${py} C${px},${py - 40} ${x},${y + 60} ${x},${y}` : `M${px},${py} L${x},${y}`;
      lines.push(`<path d="${d}" class="${lit ? 'lit' : st === 'avail' ? 'next' : ''}" style="--bc:${B.color}"/>`);
      nodes.push(`<button class="st-node ${st} ${selected === k.id ? 'sel' : ''}" style="left:${(x / TW) * 100}%;top:${(y / TH) * 100}%;--bc:${B.color}" data-act="skillSel" data-arg="${k.id}" title="${esc(k.name)}">
        ${iconImg(B.icon, 'ico-lg')}<i>${k.tier}</i></button>`);
      prev = [x, y]; prevOwned = st === 'owned';
    }
    nodes.push(`<span class="st-branch" style="left:${(colX(i) / TW) * 100}%;--bc:${B.color}">${esc(B.name.replace(' do Rei', '').replace(' do Povo', ''))}</span>`);
  });

  const k = SKILLS.find((x) => x.id === selected)!;
  const B = BRANCHES[k.branch as keyof typeof BRANCHES];
  const st = state(app, k.id);
  const req = k.requires ? SKILLS.find((x) => x.id === k.requires) : null;
  const detail = `<aside class="st-detail" style="--bc:${B.color}">
    <small>${iconImg(B.icon)} ${esc(B.name)} · nível ${k.tier}</small>
    <h3>${esc(k.name)}</h3>
    <p>${esc(k.desc)}</p>
    ${req ? `<p class="req ${hasSkill(s, req.id) ? 'ok' : ''}">Requer: ${esc(req.name)}</p>` : '<p class="req ok">Primeiro nó do galho</p>'}
    ${st === 'owned' ? '<em class="st-owned">Aprendida</em>'
      : st === 'avail' ? `<button class="btn primary st-learn" data-act="learn" data-arg="${k.id}">Aprender (1 ponto)</button>`
      : st === 'open' ? '<em>Sem pontos. Decisões e livros dão experiência.</em>'
      : '<em>Aprenda o nó anterior primeiro.</em>'}
  </aside>`;

  return `<div class="panel dark king-panel skilltree">
    <div class="king-head">
      ${portrait('rei', 'mid-portrait')}
      <div class="kh-main">
        <h2>Rei ${esc(s.kingName)} <small>${s.spouse ? `casado com ${esc(char(s.spouse).name)}` : s.flags.noiva ? `noivo de ${esc(char(String(s.flags.noiva)).name)}` : 'solteiro'}</small></h2>
        <div class="xp"><div class="bar gold"><i style="width:${(s.xp / XP_PER_POINT) * 100}%"></i></div><small>${s.xp}/${XP_PER_POINT} de experiência</small></div>
      </div>
      <div class="kh-points ${s.skillPoints ? 'has' : ''}"><b>${s.skillPoints}</b><small>ponto(s) para gastar</small></div>
      <div class="attrs">${ATTRS.map(([a, n, i]) => `<div class="attr" title="${n}">${iconImg(i)}<b>${attr(s, a)}</b><small>${n}</small></div>`).join('')}</div>
    </div>
    <div class="st-body">
      <div class="st-tree">
        <svg viewBox="0 0 ${TW} ${TH}" preserveAspectRatio="none">${lines.join('')}</svg>
        ${nodes.join('')}
        <div class="st-root" style="left:${(ROOT[0] / TW) * 100}%;top:${(ROOT[1] / TH) * 100}%">${portrait('rei', 'st-root-portrait')}</div>
      </div>
      ${detail}
    </div>
    <details class="king-foot"><summary>${iconImg('livro')} Conhecimentos e leis</summary>
      <div><h3>Livros concluídos</h3>${BOOKS.filter((b) => s.knowledge.includes(b.knowledge)).map((b) => `<span class="pill">${esc(b.title)}</span>`).join('') || '<small>Nenhum livro concluído ainda.</small>'}</div>
      <div><h3>Leis aprovadas</h3>${s.laws.map((l) => `<span class="pill law">${esc(l)}</span>`).join('') || '<small>Nenhuma lei aprovada ainda.</small>'}</div>
    </details>
  </div>`;
}

export function handle(app: App, act: string, arg: string) {
  if (act === 'skillSel') { selected = arg; return app.render(); }
  if (act !== 'learn') return;
  const s = app.s;
  const k = SKILLS.find((x) => x.id === arg);
  if (!k || s.skillPoints <= 0 || hasSkill(s, k.id) || (k.requires && !hasSkill(s, k.requires))) return;
  s.skills.push(k.id);
  s.skillPoints--;
  save(s);
  app.toast(`Nova habilidade: ${k.name}`);
  // o próximo do galho fica selecionado
  const next = SKILLS.find((x) => x.requires === k.id);
  if (next) selected = next.id;
  app.render();
}
