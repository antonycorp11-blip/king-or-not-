import type { App } from '../app';
import { BOOKS, type Book } from '../../data/progression';
import { addXp, knows, log, save } from '../../engine/core';
import { canSpend, spendHours } from '../../engine/day';
import { iconImg } from '../../render/pixel';
import { esc, portrait } from '../common';

const SESSION = 2; // horas do dia gastas por sessão
const ROUNDS = 3;

const LINES = [
  'Reis que leem vivem mais, Majestade. Reis que não leem são lembrados em canções... curtas.',
  'Seu pai preferia a espada ao livro. Talvez por isso a espada o tenha levado tão cedo.',
  'Cada página aqui foi escrita por alguém que errou antes do senhor. Aproveite os erros deles.',
  'O conhecimento não aparece nas audiências por mágica. Aparece porque o senhor lembra no momento certo.',
];

// Sessão do mini-game "Leitura atenta": 3 trechos com uma palavra faltando.
interface Reading {
  book: string;
  qs: { text: string; answer: string; options: string[] }[];
  i: number;
  correct: number;
  last: string | null; // opção escolhida no trecho atual (mostra certo/errado)
  done: boolean;
}

let reading: Reading | null = null;

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function startReading(b: Book): Reading {
  const qs = shuffle(b.facts).slice(0, ROUNDS).map(([text, answer, options]) => ({ text, answer, options: shuffle(options) }));
  return { book: b.id, qs, i: 0, correct: 0, last: null, done: false };
}

const gain = (correct: number) => 1 + correct; // horas de progresso no livro

function readingModal(app: App): string {
  if (!reading) return '';
  const b = BOOKS.find((x) => x.id === reading!.book)!;
  if (reading.done) {
    const g = gain(reading.correct);
    const prog = app.s.bookProgress[b.id] ?? 0;
    const verdict = reading.correct === ROUNDS ? 'Leitura perfeita. Theodric sorri: "Seu bisavô não leria melhor."' : reading.correct >= 2 ? 'Boa leitura. Algumas passagens ficaram nebulosas.' : reading.correct === 1 ? 'A mente vagou. Theodric pigarreia: "De novo, Majestade. Com atenção."' : 'O senhor dormiu sobre o livro. Theodric fecha a janela, desapontado.';
    return `<div class="modal-back"><div class="parchment modal reading">
      <h2>${esc(b.title)}</h2>
      <p class="verdict">${verdict}</p>
      <div class="read-score">${Array.from({ length: ROUNDS }, (_, k) => `<i class="${k < reading!.correct ? 'ok' : ''}"></i>`).join('')}</div>
      <p><b>+${g}h</b> de leitura · ${Math.min(prog, b.hours)}/${b.hours}h${prog >= b.hours ? ' · <b>livro concluído!</b>' : ''}</p>
      <div class="row"><button class="btn primary" data-act="readClose">Fechar o livro</button></div>
    </div></div>`;
  }
  const q = reading.qs[reading.i];
  const [before, after] = q.text.split('___');
  const blank = reading.last ? `<b class="${reading.last === q.answer ? 'right' : 'wrong'}">${esc(reading.last === q.answer ? q.answer : q.answer)}</b>` : '<span class="gap">______</span>';
  return `<div class="modal-back"><div class="parchment modal reading">
    <h2>${iconImg('livro', 'ico-lg')} ${esc(b.title)}</h2>
    <p class="sub">Leitura atenta · trecho ${reading.i + 1} de ${ROUNDS}. Escolha a palavra que completa a passagem. Cada acerto rende mais uma hora de leitura.</p>
    <p class="passage">${esc(before)}${blank}${esc(after ?? '')}</p>
    <div class="read-options">${q.options
      .map((o) => {
        const state = reading!.last ? (o === q.answer ? 'right' : o === reading!.last ? 'wrong' : 'off') : '';
        return `<button class="btn ${state}" data-act="readPick" data-arg="${esc(o)}" ${reading!.last ? 'disabled' : ''}>${esc(o)}</button>`;
      })
      .join('')}</div>
    ${reading.last ? `<div class="row"><button class="btn primary" data-act="readNext">${reading.i + 1 < ROUNDS ? 'Próximo trecho' : 'Ver resultado'}</button></div>` : ''}
  </div></div>`;
}

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
      <p class="sub">Cada sessão gasta ${SESSION}h do dia e rende de 1h a 4h de leitura, conforme sua atenção. Livros concluídos abrem novas opções nos diálogos.</p>
      <div class="books">
        ${BOOKS.map((b) => {
          const done = knows(s, b.knowledge);
          const prog = s.bookProgress[b.id] ?? 0;
          return `<div class="book ${done ? 'done' : ''}">
            <div class="spine" style="--bc:${b.color}"></div>
            <div class="book-info">
              <b>${esc(b.title)}</b><small>${esc(b.author)} · ${b.hours}h de leitura</small>
              <p>${esc(b.blurb)}</p>
              <p class="unlock">${iconImg('seta')} ${esc(b.unlocks)}</p>
              <div class="bar gold"><i style="width:${(Math.min(prog, b.hours) / b.hours) * 100}%"></i></div>
            </div>
            ${done ? `<span class="stamp">Lido</span>` : `<button class="btn" data-act="read" data-arg="${b.id}">Ler (${SESSION}h)<small>${Math.min(prog, b.hours)}/${b.hours}h</small></button>`}
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="librarian">
      ${portrait('theodric', 'mid-portrait')}
      <div class="parchment speech-small"><h3>Grão-Meistre Theodric</h3><p>${esc(line)}</p></div>
    </div>
    ${readingModal(app)}`;
}

export function handle(app: App, act: string, arg: string) {
  const s = app.s;
  if (act === 'read') {
    const b = BOOKS.find((x) => x.id === arg);
    if (!b || reading) return;
    if (!canSpend(s, SESSION)) return app.toast('Não há horas suficientes hoje para ler.');
    spendHours(s, SESSION); // as horas vão embora ao abrir o livro
    save(s);
    reading = startReading(b);
    return app.render();
  }
  if (!reading) return;
  if (act === 'readPick') {
    const q = reading.qs[reading.i];
    reading.last = arg;
    if (arg === q.answer) reading.correct++;
    return app.render();
  }
  if (act === 'readNext') {
    reading.i++;
    reading.last = null;
    if (reading.i >= ROUNDS) finishReading(app);
    return app.render();
  }
  if (act === 'readClose') {
    reading = null;
    return app.render();
  }
}

function finishReading(app: App) {
  const s = app.s;
  const r = reading!;
  const b = BOOKS.find((x) => x.id === r.book)!;
  r.done = true;
  s.bookProgress[b.id] = (s.bookProgress[b.id] ?? 0) + gain(r.correct);
  addXp(s, 6 + r.correct * 3);
  if (s.bookProgress[b.id] >= b.hours && !knows(s, b.knowledge)) {
    s.knowledge.push(b.knowledge);
    addXp(s, 25);
    log(s, { icon: 'livro', title: 'Conhecimento', text: `Você terminou "${b.title}". ${b.unlocks}`, tone: 'bom' });
  }
  save(s);
}
