import type { App } from '../app';
import { HOUSES } from '../../data/realm';
import { iconImg } from '../../render/pixel';
import { esc } from '../common';

export function renderTitle(app: App): string {
  const saved = app.hasSave();
  return `<div class="title-screen">
    <div class="title-card parchment">
      ${iconImg('coroa', 'ico-xxl')}
      <h1>King or Not?</h1>
      <p class="tagline">Aos vinte e um anos, a coroa caiu na sua cabeça.<br>Agora o reino inteiro quer algo de você.</p>
      <label>Nome do rei <input id="king-name" maxlength="16" value="Edric" autocomplete="off"></label>
      <div class="row">
        <button class="btn primary" data-act="newGame">Novo reinado</button>
        ${saved ? '<button class="btn" data-act="continue">Continuar</button>' : ''}
      </div>
      <a class="hall-preview-link" href="?cenario=trono">Conhecer o novo salão do trono ↗</a>
      <a class="hall-preview-link" href="?personagens=topdown">Ver os 46 personagens top-down ↗</a>
      <details>
        <summary>Como jogar</summary>
        <ul>
          <li>Cada dia vai das <b>8h às 20h</b>. Audiências, leituras e decretos consomem horas.</li>
          <li>O que você não responder até o fim do dia <b>também tem consequência</b>.</li>
          <li><b>Influência</b> suaviza decisões impopulares. Ela nasce da <b>Governabilidade</b>: apoio do povo, prestígio e lealdade das casas.</li>
          <li><b>Livros</b> destravam opções de diálogo. A <b>árvore de habilidades</b> faz o rei crescer.</li>
          <li>Você tem <b>20 dias</b> para escolher uma rainha. Nenhuma escolha é gratuita.</li>
        </ul>
      </details>
    </div>
  </div>`;
}

export function renderSummary(app: App): string {
  const entries = app.ui.summary ?? [];
  const rows = entries
    .map((e) => {
      const house = Object.values(HOUSES).find((h) => h.sigil === e.icon);
      const color = house ? house.color : e.tone === 'rumor' ? '#5a2a7a' : e.tone === 'lei' ? '#3b2f5e' : e.tone === 'ruim' ? '#8a1c24' : e.tone === 'bom' ? '#23346e' : '#6a4a1a';
      return `<div class="sum-row tone-${e.tone}" style="--rc:${color}">
        <span class="ribbon"></span>
        <span class="medallion">${iconImg(e.icon, 'ico-xl')}</span>
        <div><b>${esc(e.title)}</b><p>${esc(e.text)}</p></div>
        ${e.delta ? `<span class="delta ${e.delta.startsWith('−') || e.delta.startsWith('-') ? 'neg' : 'pos'}">${esc(e.delta)}</span>` : ''}
      </div>`;
    })
    .join('');
  return `<div class="summary parchment">
    <div class="sum-crest">${iconImg('flor', 'ico-xl')}</div>
    <h1>Resumo do Dia ${app.ui.summaryDay}</h1>
    <div class="sum-list">${rows || '<p>Um dia tranquilo no reino.</p>'}</div>
    <button class="end-day" data-act="closeSummary">${iconImg('seta', 'ico-lg')}<span><b>Encerrar o Dia</b><small>Avançar para a próxima manhã</small></span></button>
  </div>`;
}

export function renderEnd(app: App): string {
  const e = app.s.ended!;
  return `<div class="title-screen">
    <div class="title-card parchment ${e.kind}">
      ${iconImg(e.kind === 'derrota' ? 'selo' : 'coroa', 'ico-xxl')}
      <h1>${esc(e.title)}</h1>
      <p class="tagline">${esc(e.text)}</p>
      <p class="sub">Dia ${app.s.day - (e.kind === 'fimAto' ? 1 : 0)} do reinado de ${esc(app.s.kingName)}.</p>
      <div class="row"><button class="btn primary" data-act="toTitle">Voltar ao início</button></div>
    </div>
  </div>`;
}
