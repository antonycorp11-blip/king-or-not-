import type { App } from '../app';
import { BOOKS } from '../../data/progression';
import { addXp, knows, log, save } from '../../engine/core';
import { canSpend, spendHours } from '../../engine/day';
import { iconImg } from '../../render/pixel';
import { esc, portrait } from '../common';

const SESSION = 2;

const LINES = [
  'Reis que leem vivem mais, Majestade. Reis que não leem são lembrados em canções... curtas.',
  'Seu pai preferia a espada ao livro. Talvez por isso a espada o tenha levado tão cedo.',
  'Cada página aqui foi escrita por alguém que errou antes do senhor. Aproveite os erros deles.',
  'O conhecimento não aparece nas audiências por mágica. Aparece porque o senhor lembra no momento certo.',
];

export function render(app: App): string {
  const s = app.s;
  app.scene.setRoom('biblioteca');
  app.scene.sync([
    { key: 'rei', id: 'rei', x: 150, foot: 184, facing: 1, anim: 'idle' },
    { key: 'theodric', id: 'theodric', x: 250, foot: 184, facing: -1, anim: 'talk' },
  ]);
  app.scene.setMode('full');
  const line = LINES[s.day % LINES.length];
  return `
    <div class="panel dark library-panel">
      <h2>${iconImg('livro', 'ico-lg')} Biblioteca Real</h2>
      <p class="sub">Ler consome ${SESSION}h por sessão. Livros concluídos abrem novas opções nos diálogos.</p>
      <div class="books">
        ${BOOKS.map((b) => {
          const done = knows(s, b.knowledge);
          const prog = s.bookProgress[b.id] ?? 0;
          return `<div class="book ${done ? 'done' : ''}">
            <div class="spine" style="--bc:${b.color}"></div>
            <div class="book-info">
              <b>${esc(b.title)}</b><small>${esc(b.author)} · ${b.hours}h</small>
              <p>${esc(b.blurb)}</p>
              <p class="unlock">${iconImg('seta')} ${esc(b.unlocks)}</p>
              <div class="bar gold"><i style="width:${(Math.min(prog, b.hours) / b.hours) * 100}%"></i></div>
            </div>
            ${done ? `<span class="stamp">Lido</span>` : `<button class="btn" data-act="read" data-arg="${b.id}">Ler (${SESSION}h)<small>${prog}/${b.hours}h</small></button>`}
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="librarian">
      ${portrait('theodric', 'mid-portrait')}
      <div class="parchment speech-small"><h3>Grão-Meistre Theodric</h3><p>${esc(line)}</p></div>
    </div>`;
}

export function handle(app: App, act: string, arg: string) {
  if (act !== 'read') return;
  const s = app.s;
  const b = BOOKS.find((x) => x.id === arg);
  if (!b) return;
  if (!canSpend(s, SESSION)) return app.toast('Não há horas suficientes hoje para ler.');
  spendHours(s, SESSION);
  s.bookProgress[b.id] = (s.bookProgress[b.id] ?? 0) + SESSION;
  addXp(s, 8);
  if (s.bookProgress[b.id] >= b.hours && !knows(s, b.knowledge)) {
    s.knowledge.push(b.knowledge);
    addXp(s, 25);
    log(s, { icon: 'livro', title: 'Conhecimento', text: `Você terminou "${b.title}". ${b.unlocks}`, tone: 'bom' });
    app.toast(`Livro concluído: ${b.title}!`);
  } else app.toast(`Você leu por ${SESSION} horas.`);
  save(s);
  app.render();
}
