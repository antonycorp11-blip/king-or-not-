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
