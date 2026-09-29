import { CHARACTERS } from '../data/characters';
import { getTopDownFrame, loadTopDownAssets, TOPDOWN_DIRS, type TopDownDir } from '../render/topdown';
import { esc } from './common';

export function showCharacterGallery(host: HTMLElement) {
  document.documentElement.classList.add('character-gallery-page');
  document.body.classList.add('character-gallery-page');
  const characters = Object.values(CHARACTERS);
  host.innerHTML = `<main class="character-gallery">
    <header><div><small>CASTELMAR · PERSONAGENS</small><h1>A corte, vista de cima</h1>
      <p>${characters.length} personagens · quatro direções · poses de caminhada</p></div><a href="./">Voltar ao jogo</a></header>
    <nav aria-label="Prévia dos personagens">
      <label>Direção <select aria-label="Direção"><option value="south">Frente</option><option value="west">Esquerda</option><option value="east">Direita</option><option value="north">Costas</option></select></label>
      <button data-walk aria-pressed="true">Pausar caminhada</button>
      <label>Buscar <input type="search" placeholder="Nome do personagem" aria-label="Buscar personagem"></label>
      <span role="status">Carregando as folhas…</span>
    </nav><section class="character-grid" aria-label="Elenco">${characters.map(c => `<article data-character="${c.id}">
      <canvas width="160" height="176" aria-label="${esc(c.name)} em top-down"></canvas>
      <h2>${esc(c.name)}</h2><p>${esc(c.title)}</p><small>${esc(c.realm)}</small>
    </article>`).join('')}</section></main>`;
  let dir: TopDownDir = 'south', walk = true, last = 0;
  const cards = [...host.querySelectorAll<HTMLElement>('[data-character]')];
  const draw = (now = 0) => {
    const frame = walk ? Math.floor(now / 130) % 6 : 0;
    for (const card of cards) {
      if (card.hidden) continue;
      const canvas = card.querySelector('canvas')!;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const sprite = getTopDownFrame(card.dataset.character!, dir, frame, walk ? 'walk' : 'idle');
      if (!sprite) continue;
      ctx.fillStyle = '#0004'; ctx.beginPath(); ctx.ellipse(80, 153, 21, 5, 0, 0, Math.PI*2); ctx.fill();
      ctx.drawImage(sprite.src, sprite.sx, sprite.sy, sprite.sw, sprite.sh, 16, 5, 128, 160);
      card.dataset.loaded = 'true';
    }
  };
  host.querySelector('select')!.addEventListener('change', e => {
    const value = (e.target as HTMLSelectElement).value as TopDownDir;
    if (TOPDOWN_DIRS.includes(value)) { dir = value; draw(performance.now()); }
  });
  host.querySelector<HTMLButtonElement>('[data-walk]')!.addEventListener('click', e => {
    walk = !walk;
    const button = e.currentTarget as HTMLButtonElement;
    button.textContent = walk ? 'Pausar caminhada' : 'Animar caminhada';
    button.setAttribute('aria-pressed', String(walk)); draw(performance.now());
  });
  host.querySelector('input')!.addEventListener('input', e => {
    const term = (e.target as HTMLInputElement).value.toLocaleLowerCase('pt-BR');
    cards.forEach(card => { card.hidden = !card.textContent?.toLocaleLowerCase('pt-BR').includes(term); });
    draw(performance.now());
  });
  void loadTopDownAssets(() => draw(performance.now())).then(failed => {
    host.querySelector('[role="status"]')!.textContent = failed.length
      ? `Falha ao carregar: ${failed.join(', ')}. Recarregue para tentar novamente.`
      : `${characters.length}/${characters.length} personagens prontos`;
  });
  const animate = (now: number) => {
    if (walk && !document.hidden && now - last > 100) { draw(now); last = now; }
    requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}
