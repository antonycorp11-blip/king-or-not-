import './style.css';
import { App } from './ui/app';
import { startWar } from './engine/war';
import { endDay } from './engine/day';
import { SceneView } from './ui/sceneView';

const host = document.getElementById('app')!;
if (new URLSearchParams(location.search).get('cenario') === 'trono') {
  // Visita visual independente: não inicia um reinado nem toca no save.
  host.innerHTML = `<main class="scenery-preview"><div class="scenery-stage"></div>
    <header class="scenery-heading"><span>CASTELO REAL</span><h1>Salão do Trono</h1></header>
    <nav class="scenery-controls" aria-label="Visualização do cenário">
      <button type="button" data-light="day" aria-pressed="true">Dia</button>
      <button type="button" data-light="night" aria-pressed="false">Noite</button>
      <button type="button" data-clean aria-pressed="false">Ocultar interface</button>
      <a href="./">Voltar ao jogo</a>
    </nav><p class="scenery-loading" role="status">Preparando o salão…</p></main>`;
  const preview = host.querySelector<HTMLElement>('.scenery-preview')!;
  const scene = new SceneView(host.querySelector<HTMLElement>('.scenery-stage')!);
  scene.setRoom('trono'); scene.setHour(11);
  const observer = new MutationObserver(() => {
    const status = host.querySelector<HTMLElement>('.scenery-loading');
    if (!status) return;
    if (scene.el.dataset.art === 'ready') { status.remove(); observer.disconnect(); }
    else if (scene.el.dataset.art === 'error') {
      status.textContent = 'Não foi possível carregar o cenário. Recarregue a página para tentar novamente.';
      observer.disconnect();
    }
  });
  observer.observe(scene.el, { attributes: true, attributeFilter: ['data-art'] });
  host.querySelectorAll<HTMLButtonElement>('[data-light]').forEach((button) => {
    button.addEventListener('click', () => {
      scene.setHour(button.dataset.light === 'night' ? 20 : 11);
      host.querySelectorAll('[data-light]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    });
  });
  const clean = host.querySelector<HTMLButtonElement>('[data-clean]')!;
  clean.addEventListener('click', () => {
    const hidden = preview.classList.toggle('clean');
    clean.textContent = hidden ? 'Mostrar interface' : 'Ocultar interface';
    clean.setAttribute('aria-pressed', String(hidden));
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && preview.classList.contains('clean')) clean.click();
  });
} else {
  const app = new App(host);
  // acesso pelo console para depuração: game.s (estado), debug.startWar(game.s, 'norhelm')
  Object.assign(window, { game: app, debug: { startWar, endDay } });
}
