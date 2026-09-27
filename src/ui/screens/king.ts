import type { Attr } from '../../types';
import type { App } from '../app';
import { BOOKS, BRANCHES, SKILLS, XP_PER_POINT } from '../../data/progression';
import { attr, hasSkill, save } from '../../engine/core';
import { char } from '../../data/characters';
import { iconImg } from '../../render/pixel';
import { esc, portrait } from '../common';

const ATTRS: [Attr, string, string][] = [
  ['diplomacia', 'Diplomacia', 'aperto'],
  ['estrategia', 'Estratégia', 'espadas'],
  ['comercio', 'Comércio', 'moedas'],
  ['intriga', 'Intriga', 'mascara'],
];

export function render(app: App): string {
  const s = app.s;
  app.scene.setMode('dim');
  const branches = (Object.keys(BRANCHES) as (keyof typeof BRANCHES)[]).map((br) => {
    const B = BRANCHES[br];
    const nodes = SKILLS.filter((k) => k.branch === br).sort((a, b) => a.tier - b.tier);
    return `<div class="branch" style="--bc:${B.color}">
      <h3>${iconImg(B.icon, 'ico-lg')} ${B.name}</h3>
      ${nodes.map((k) => {
        const owned = hasSkill(s, k.id);
        const avail = !owned && (!k.requires || hasSkill(s, k.requires)) && s.skillPoints > 0;
        return `<button class="skill ${owned ? 'owned' : avail ? 'avail' : 'locked'}" data-act="learn" data-arg="${k.id}" ${avail ? '' : 'disabled'}>
          <b>${esc(k.name)}</b><small>${esc(k.desc)}</small>
        </button>`;
      }).join('<i class="link"></i>')}
    </div>`;
  }).join('');

  return `<div class="panel dark king-panel">
    <div class="king-head">
      ${portrait('rei', 'mid-portrait')}
      <div>
        <h2>Rei ${esc(s.kingName)}</h2>
        <p class="sub">16 anos · ${s.spouse ? `Casado com ${esc(char(s.spouse).name)}` : s.flags.noiva ? `Noivo de ${esc(char(String(s.flags.noiva)).name)}` : 'Solteiro'}</p>
        <div class="xp">Experiência <div class="bar gold"><i style="width:${(s.xp / XP_PER_POINT) * 100}%"></i></div><small>${s.xp}/${XP_PER_POINT} · <b>${s.skillPoints}</b> ponto(s) para gastar</small></div>
      </div>
      <div class="attrs">${ATTRS.map(([a, n, i]) => `<div class="attr">${iconImg(i, 'ico-lg')}<b>${attr(s, a)}</b><small>${n}</small></div>`).join('')}</div>
    </div>
    <p class="sub">A árvore de habilidades faz o rei crescer como pessoa. Os pontos vêm das decisões que você toma e dos livros que lê.</p>
    <div class="tree">${branches}</div>
    <div class="king-foot">
      <div><h3>${iconImg('livro')} Conhecimentos</h3>${BOOKS.filter((b) => s.knowledge.includes(b.knowledge)).map((b) => `<span class="pill">${esc(b.title)}</span>`).join('') || '<small>Nenhum livro concluído ainda.</small>'}</div>
      <div><h3>${iconImg('pergaminho')} Leis aprovadas</h3>${s.laws.map((l) => `<span class="pill law">${esc(l)}</span>`).join('') || '<small>Nenhuma lei aprovada ainda.</small>'}</div>
    </div>
  </div>`;
}

export function handle(app: App, act: string, arg: string) {
  if (act !== 'learn') return;
  const s = app.s;
  const k = SKILLS.find((x) => x.id === arg);
  if (!k || s.skillPoints <= 0 || hasSkill(s, k.id) || (k.requires && !hasSkill(s, k.requires))) return;
  s.skills.push(k.id);
  s.skillPoints--;
  save(s);
  app.toast(`Nova habilidade: ${k.name}`);
  app.render();
}
