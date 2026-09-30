import type { GameState } from '../../types';
import type { App } from '../app';
import { BOOKS, type Book } from '../../data/progression';
import { char } from '../../data/characters';
import { addXp, applyEffect, attr, knows, log, save } from '../../engine/core';
import { canSpend, spendHours } from '../../engine/day';
import { iconImg } from '../../render/pixel';
import { esc, portrait } from '../common';

// Biblioteca: sessões de leitura de 30 min, 1 h ou 2 h. Cada trecho é um desafio
// diferente e nenhum trecho se repete na mesma partida. O quanto você leu bem fica
// guardado e muda a força com que cita o livro nas audiências.

const SESSIONS: [number, string][] = [[0.5, '30 min'], [1, '1 hora'], [2, '2 horas']];
const ROUNDS: Record<string, number> = { '0.5': 1, '1': 2, '2': 3 };

const LINES = [
  'Reis que leem vivem mais, Majestade. Reis que não leem são lembrados em canções... curtas.',
  'Seu pai preferia a espada ao livro. Talvez por isso a espada o tenha levado tão cedo.',
  'Cada página aqui foi escrita por alguém que errou antes do senhor. Aproveite os erros deles.',
  'O conhecimento não aparece nas audiências por mágica. Aparece porque o senhor lembra no momento certo.',
];

type Kind = 'passagem' | 'argumento' | 'cifra' | 'ligar';
const KIND_NAME: Record<Kind, string> = { passagem: 'Completar a passagem', argumento: 'Desmentir um argumento', cifra: 'Decifrar a anotação na margem', ligar: 'Ligar os trechos' };

interface Round {
  kind: Kind;
  facts: number[]; // índices dos trechos usados
  options: string[];
  speaker?: string;
  shift?: number;
  // ligar: trecho escolhido e pares feitos
  pick?: number;
  pairs?: Record<number, string>;
  removed?: string; // resposta errada descartada por quem lê junto
}

interface Reading {
  book: string;
  hours: number;
  rounds: Round[];
  i: number;
  correct: number;
  last: string | null;
  done: boolean;
  withSpouse?: string;
}

let reading: Reading | null = null;
let picking: string | null = null; // livro cuja duração está sendo escolhida

const shuffle = <T,>(a: T[]): T[] => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
};

// Próximos trechos ainda não lidos deste livro (recomeça quando todos já foram)
function takeFacts(s: GameState, b: Book, n: number): number[] {
  s.readUsed ??= {};
  let used = s.readUsed[b.id] ?? [];
  let free = b.facts.map((_, i) => i).filter((i) => !used.includes(i));
  if (free.length < n) { used = []; free = b.facts.map((_, i) => i); }
  const pick = shuffle(free).slice(0, n);
  s.readUsed[b.id] = [...used, ...pick];
  return pick;
}

const LIARS = ['gaspard', 'otho', 'brandt', 'aveline', 'florian', 'tobias', 'kasim', 'dama'];

function makeRounds(s: GameState, b: Book, n: number): Round[] {
  const kinds: Kind[] = shuffle(['passagem', 'argumento', 'cifra', 'ligar'] as Kind[]);
  const out: Round[] = [];
  for (let r = 0; r < n; r++) {
    const kind = kinds[r % kinds.length];
    if (kind === 'ligar') {
      const facts = takeFacts(s, b, 3);
      out.push({ kind, facts, options: shuffle(facts.map((i) => b.facts[i][1])), pairs: {} });
    } else {
      const [f] = takeFacts(s, b, 1);
      out.push({ kind, facts: [f], options: shuffle(b.facts[f][2]), speaker: LIARS[Math.floor(Math.random() * LIARS.length)], shift: 1 + Math.floor(Math.random() * 3) });
    }
  }
  return out;
}

// Cifra de César simples: só as letras sem acento andam
function cipher(word: string, k: number) {
  return word.toLowerCase().replace(/[a-z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 97 + k) % 26) + 97)).toUpperCase();
}

const gain = (hours: number, correct: number, rounds: number) => (hours / 2) * (1 + (3 * correct) / rounds);

export function readQuality(s: GameState, bookId: string): number | null {
  const q = s.readScore?.[bookId];
  return q && q[1] ? q[0] / q[1] : null;
}
export function qualityLabel(q: number | null) {
  if (q === null) return '';
  return q >= 0.8 ? 'domina o livro' : q >= 0.5 ? 'sabe o essencial' : 'leu por cima';
}

function roundHtml(app: App, b: Book, r: Round): string {
  const s = app.s;
  const f = b.facts[r.facts[0]];
  const answered = !!reading!.last;
  const opts = r.options.filter((o) => o !== r.removed);
  const optBtns = (answer: string) => opts.map((o) => {
    const state = answered ? (o === answer ? 'right' : o === reading!.last ? 'wrong' : 'off') : '';
    return `<button class="btn ${state}" data-act="readPick" data-arg="${esc(o)}" ${answered ? 'disabled' : ''}>${esc(o)}</button>`;
  }).join('');
  const [before, after] = f[0].split('___');
  switch (r.kind) {
    case 'passagem': {
      const blank = answered ? `<b class="${reading!.last === f[1] ? 'right' : 'wrong'}">${esc(f[1])}</b>` : '<span class="gap">______</span>';
      return `<p class="passage">${esc(before)}${blank}${esc(after ?? '')}</p><div class="read-options">${optBtns(f[1])}</div>`;
    }
    case 'argumento': {
      const wrong = f[2].find((o) => o !== f[1]) ?? f[1];
      return `<div class="read-claim">${portrait(r.speaker!, 'whisper-portrait')}<p><b>${esc(char(r.speaker!).name)}</b> afirma diante da corte: "${esc(before)}<u>${esc(wrong)}</u>${esc(after ?? '')}"</p></div>
        <p class="sub">O livro diz outra coisa. Que palavra desmente ${esc(char(r.speaker!).name.split(' ').slice(-1)[0])}?</p><div class="read-options">${optBtns(f[1])}</div>`;
    }
    case 'cifra': {
      const sharp = attr(s, 'intriga') >= 1;
      return `<p class="passage">Na margem, alguém escreveu em código: <b class="cipher">${esc(cipher(f[1], r.shift!))}</b></p>
        <p class="sub">${sharp ? `Seu olho treinado percebe: cada letra avançou <b>${r.shift}</b> no alfabeto.` : 'Cada letra avançou uma, duas ou três casas no alfabeto. Acentos ficam no lugar.'} O trecho ao lado fala de: "${esc(before)}…"</p>
        <div class="read-options">${optBtns(f[1])}</div>`;
    }
    case 'ligar': {
      const rows = r.facts.map((fi, k) => {
        const fact = b.facts[fi];
        const made = r.pairs![k];
        const cls = answered ? (made === fact[1] ? 'right' : 'wrong') : r.pick === k ? 'sel' : made ? 'made' : '';
        return `<button class="link-left ${cls}" data-act="linkPick" data-arg="${k}" ${answered ? 'disabled' : ''}>${esc(fact[0].replace('___', made ? `[${made}]` : '______'))}</button>`;
      }).join('');
      const used = Object.values(r.pairs!);
      const right = r.options.map((o) => `<button class="btn ${used.includes(o) ? 'off' : ''}" data-act="linkWord" data-arg="${esc(o)}" ${answered || r.pick === undefined ? 'disabled' : ''}>${esc(o)}</button>`).join('');
      return `<p class="sub">Escolha um trecho e depois a palavra que falta nele.</p><div class="link-grid"><div>${rows}</div><div class="read-options col">${right}</div></div>
        ${!answered && used.length === 3 ? '<div class="row"><button class="btn primary" data-act="linkDone">Conferir</button></div>' : ''}`;
    }
  }
}

function readingModal(app: App): string {
  const s = app.s;
  if (picking) {
    const b = BOOKS.find((x) => x.id === picking)!;
    return `<div class="modal-back"><div class="parchment modal reading">
      <h2>${iconImg('livro', 'ico-lg')} ${esc(b.title)}</h2>
      <p class="sub">Quanto tempo você quer ler agora? Cada trecho lido com atenção rende mais.</p>
      <div class="read-options">${SESSIONS.map(([h, label]) => `<button class="btn" data-act="readStart" data-arg="${h}" ${canSpend(s, h) ? '' : 'disabled'}>${label}<small> · ${ROUNDS[String(h)]} trecho(s)</small></button>`).join('')}</div>
      ${app.ui.readWith ? `<p class="sub">${esc(char(app.ui.readWith).name)} lê com você: ela descarta uma resposta errada em cada trecho.</p>` : ''}
      <div class="row"><button class="btn" data-act="readCancel">Deixar para depois</button></div>
    </div></div>`;
  }
  if (!reading) return '';
  const b = BOOKS.find((x) => x.id === reading!.book)!;
  if (reading.done) {
    const n = reading.rounds.length;
    const g = gain(reading.hours, reading.correct, n);
    const prog = s.bookProgress[b.id] ?? 0;
    const verdict = reading.correct === n ? 'Leitura perfeita. Theodric sorri: "Seu bisavô não leria melhor."' : reading.correct >= n / 2 ? 'Boa leitura. Algumas passagens ficaram nebulosas.' : reading.correct > 0 ? 'A mente vagou. Theodric pigarreia: "De novo, Majestade. Com atenção."' : 'O senhor dormiu sobre o livro. Theodric fecha a janela, desapontado.';
    return `<div class="modal-back"><div class="parchment modal reading">
      <h2>${esc(b.title)}</h2>
      <p class="verdict">${verdict}</p>
      <div class="read-score">${reading.rounds.map((_, k) => `<i class="${k < reading!.correct ? 'ok' : ''}"></i>`).join('')}</div>
      <p><b>+${g.toFixed(1).replace('.0', '')}h</b> de leitura · ${Math.min(prog, b.hours).toFixed(1).replace('.0', '')}/${b.hours}h${prog >= b.hours ? ' · <b>livro concluído!</b>' : ''}</p>
      ${reading.withSpouse ? `<p class="sub">Ler juntos aproximou vocês dois.</p>` : ''}
      <div class="row"><button class="btn primary" data-act="readClose">Fechar o livro</button></div>
    </div></div>`;
  }
  const r = reading.rounds[reading.i];
  return `<div class="modal-back"><div class="parchment modal reading">
    <h2>${iconImg('livro', 'ico-lg')} ${esc(b.title)}</h2>
    <p class="sub">${KIND_NAME[r.kind]} · trecho ${reading.i + 1} de ${reading.rounds.length}</p>
    ${roundHtml(app, b, r)}
    ${reading.last ? `<div class="row"><button class="btn primary" data-act="readNext">${reading.i + 1 < reading.rounds.length ? 'Próximo trecho' : 'Ver resultado'}</button></div>` : ''}
  </div></div>`;
}

export function render(app: App): string {
  const s = app.s;
  app.scene.setMode('full');
  const line = LINES[s.day % LINES.length];
  const visible = BOOKS.filter((b) => !b.hidden || s.flags[b.hidden.flag] || knows(s, b.knowledge));
  const finished = BOOKS.filter((b) => knows(s, b.knowledge)).length;
  const active = BOOKS.filter((b) => !knows(s, b.knowledge) && (s.bookProgress[b.id] ?? 0) > 0).length;
  const missing = BOOKS.filter((b) => b.hidden && !visible.includes(b));
  return `
    <div class="panel dark library-panel">
      <header class="library-head">
        <div class="library-heading"><span class="library-kicker">O acervo da coroa</span><h2>${iconImg('livro', 'ico-lg')} Biblioteca Real</h2><p>Um segredo bem lido vale mais que um exército mal pago.</p></div>
        <div class="library-stats"><span><b>${finished}</b> concluídos</span><span><b>${active}</b> em leitura</span><span><b>${visible.length}</b> nas estantes</span></div>
      </header>
      <div class="library-guide">${portrait('theodric', 'library-portrait')}<p><b>Grão-Meistre Theodric</b><br>${esc(line)}</p><small>Leia 30 min, 1 h ou 2 h. Quanto melhor a leitura, com mais força você cita o livro nas audiências.${app.ui.readWith ? ` <b>${esc(char(app.ui.readWith).name)} lê com você hoje.</b>` : ''}</small></div>
      <div class="shelf-title"><h3>Estantes do reino</h3><span>Escolha um volume para estudar</span></div>
      <div class="books">
        ${visible.map((b) => {
          const index = BOOKS.indexOf(b);
          const done = knows(s, b.knowledge);
          const prog = s.bookProgress[b.id] ?? 0;
          const q = qualityLabel(readQuality(s, b.id));
          return `<div class="book ${done ? 'done' : ''}">
            <div class="book-cover" style="--bc:${b.color}"><span>${String(index + 1).padStart(2, '0')}</span>${iconImg('livro', 'ico-lg')}<i></i></div>
            <div class="book-info">
              <small class="book-eyebrow">Volume ${String(index + 1).padStart(2, '0')} · ${esc(b.author)}${b.hidden ? ' · fora das estantes' : ''}</small><b>${esc(b.title)}</b>
              <p>${esc(b.blurb)}</p>
              <p class="unlock">${iconImg('seta')} ${esc(b.unlocks)}</p>
              <div class="book-progress"><span>${done ? `Concluído${q ? ` · ${q}` : ''}` : `${Math.min(prog, b.hours).toFixed(1).replace('.0', '')}/${b.hours}h`}</span><div class="bar gold"><i style="width:${(Math.min(prog, b.hours) / b.hours) * 100}%"></i></div></div>
            </div>
            ${done ? `<button class="btn book-read" data-act="read" data-arg="${b.id}">Reler <small>praticar</small></button>` : `<button class="btn book-read" data-act="read" data-arg="${b.id}">Abrir livro</button>`}
          </div>`;
        }).join('')}
        ${missing.map((b) => `<div class="book missing"><div class="book-cover" style="--bc:#3a3040"><span>??</span>${iconImg('cadeado', 'ico-lg')}<i></i></div>
          <div class="book-info"><small class="book-eyebrow">Um volume que falta</small><b>${esc(b.title)}</b><p>${esc(b.hidden!.hint)}</p></div></div>`).join('')}
      </div>
    </div>
    ${readingModal(app)}`;
}

function score(r: Round, b: Book, answer: string): boolean {
  if (r.kind === 'ligar') {
    const ok = r.facts.filter((fi, k) => r.pairs![k] === b.facts[fi][1]).length;
    return ok >= 2;
  }
  return answer === b.facts[r.facts[0]][1];
}

export function handle(app: App, act: string, arg: string) {
  const s = app.s;
  if (act === 'read') {
    if (reading) return;
    picking = arg;
    return app.render();
  }
  if (act === 'readCancel') { picking = null; return app.render(); }
  if (act === 'readStart') {
    const b = BOOKS.find((x) => x.id === picking);
    const hours = Number(arg);
    if (!b) return;
    if (!canSpend(s, hours)) return app.toast('Não há horas suficientes hoje para ler.');
    spendHours(s, hours, 'descanso'); // ler descansa a cabeça do rei
    save(s);
    const rounds = makeRounds(s, b, ROUNDS[String(hours)]);
    if (app.ui.readWith) for (const rd of rounds) if (rd.kind !== 'ligar') rd.removed = rd.options.find((o) => o !== b.facts[rd.facts[0]][1]);
    reading = { book: b.id, hours, rounds, i: 0, correct: 0, last: null, done: false, withSpouse: app.ui.readWith ?? undefined };
    picking = null;
    return app.render();
  }
  if (!reading) return;
  const b = BOOKS.find((x) => x.id === reading!.book)!;
  const r = reading.rounds[reading.i];
  if (act === 'readPick' && !reading.last) {
    reading.last = arg;
    if (score(r, b, arg)) reading.correct++;
    return app.render();
  }
  if (act === 'linkPick') { r.pick = Number(arg); return app.render(); }
  if (act === 'linkWord' && r.pick !== undefined) {
    for (const k of Object.keys(r.pairs!)) if (r.pairs![Number(k)] === arg) delete r.pairs![Number(k)];
    r.pairs![r.pick] = arg;
    r.pick = [0, 1, 2].find((k) => !r.pairs![k]);
    return app.render();
  }
  if (act === 'linkDone') {
    reading.last = 'ligado';
    if (score(r, b, '')) reading.correct++;
    return app.render();
  }
  if (act === 'readNext') {
    reading.i++;
    reading.last = null;
    if (reading.i >= reading.rounds.length) finishReading(app);
    return app.render();
  }
  if (act === 'readClose') {
    reading = null;
    app.ui.readWith = null;
    return app.render();
  }
}

function finishReading(app: App) {
  const s = app.s;
  const r = reading!;
  const b = BOOKS.find((x) => x.id === r.book)!;
  r.done = true;
  s.readScore ??= {};
  const [ok, total] = s.readScore[b.id] ?? [0, 0];
  s.readScore[b.id] = [ok + r.correct, total + r.rounds.length];
  const done = knows(s, b.knowledge);
  s.bookProgress[b.id] = (s.bookProgress[b.id] ?? 0) + gain(r.hours, r.correct, r.rounds.length);
  addXp(s, Math.round((4 + r.correct * 3) * (done ? 0.5 : 1)));
  if (r.withSpouse) applyEffect(s, { bond: { [r.withSpouse]: { amor: 4, confianca: 3 } }, rel: { [r.withSpouse]: 3 }, mood: { joy: 8, stress: -8, why: `Leu com ${char(r.withSpouse).name}` } });
  if (s.bookProgress[b.id] >= b.hours && !done) {
    s.knowledge.push(b.knowledge);
    addXp(s, 25);
    log(s, { icon: 'livro', title: 'Conhecimento', text: `Você terminou "${b.title}". ${b.unlocks}`, tone: 'bom' });
  }
  save(s);
}
