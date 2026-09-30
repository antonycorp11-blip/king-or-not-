import type { GameState } from '../types';
import { migrate } from './migrate';

// Integração com o portal ATHG (SDK carregado no index.html).
// Dentro do portal, o save vai para a conta do jogador (nuvem); fora dele, o SDK usa o localStorage.
interface AthgSdk {
  ready(): void;
  gameStarted(): void;
  gameOver(score?: number): void;
  save(data: unknown): Promise<unknown>;
  load(): Promise<unknown>;
}

const sdk = (): AthgSdk | undefined => (typeof window === 'undefined' ? undefined : (window as unknown as { ATHG?: AthgSdk }).ATHG);

export function inPortal() {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function athgReady() {
  sdk()?.ready();
}

// Avisa o portal que o jogo tem o próprio botão de sair (o portal esconde o X que cobria o HUD)
function postPortal(type: string) {
  if (!inPortal()) return;
  try { window.parent.postMessage({ source: 'athg-game', version: 1, type }, '*'); } catch { /* sem portal */ }
}
export function athgOwnExit() {
  const A = sdk() as (AthgSdk & { ownExitButton?: () => void }) | undefined;
  if (A?.ownExitButton) A.ownExitButton(); else postPortal('OWN_EXIT_BUTTON');
}
export function athgExit() {
  const A = sdk() as (AthgSdk & { exit?: () => void }) | undefined;
  if (A?.exit) A.exit(); else postPortal('EXIT_REQUEST');
}

export function athgGameStarted() {
  sdk()?.gameStarted();
}

export function athgGameOver(score: number) {
  sdk()?.gameOver(score);
}

// Envia o save para a nuvem no máximo a cada 5 segundos (o jogo salva a cada ação).
let timer = 0;
let pending: GameState | null = null;
export function cloudSave(s: GameState) {
  const A = sdk();
  if (!A || !inPortal()) return;
  pending = s;
  if (timer) return;
  timer = window.setTimeout(() => {
    timer = 0;
    if (pending) void A.save(JSON.parse(JSON.stringify(pending))).catch(() => {});
    pending = null;
  }, 5000);
}

export async function cloudLoad(): Promise<GameState | null> {
  const A = sdk();
  if (!A || !inPortal()) return null;
  try {
    return migrate(await A.load());
  } catch {
    return null;
  }
}
