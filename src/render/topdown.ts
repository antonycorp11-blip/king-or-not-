import { CHARACTERS } from '../data/characters';
import type { Anim, Frame } from './actors';

export type TopDownDir = 'south' | 'west' | 'east' | 'north';
export const TOPDOWN_DIRS: TopDownDir[] = ['south', 'west', 'east', 'north'];
export const TOPDOWN_CELL_W = 128;
export const TOPDOWN_CELL_H = 160;
export const TOPDOWN_FOOT = 148;
const sheets = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<void>>();

async function loadSheet(id: string) {
  if (sheets.has(id)) return;
  if (pending.has(id)) return pending.get(id);
  const job = new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth !== TOPDOWN_CELL_W * 3 || img.naturalHeight !== TOPDOWN_CELL_H * 4) {
        reject(new Error(`Invalid top-down sheet: ${id}`)); return;
      }
      sheets.set(id, img); resolve();
    };
    img.onerror = () => reject(new Error(`Could not load top-down character: ${id}`));
    img.src = `assets/personagens/topdown/${id}.webp`;
  });
  pending.set(id, job);
  try { await job; } finally { pending.delete(id); }
}

// Limit decoding concurrency on phones. Each successful character appears
// immediately; one failed request never hides the rest of the court.
export async function loadTopDownAssets(onUpdate: () => void, ids = Object.keys(CHARACTERS)) {
  const queue = [...new Set(ids)];
  const failed: string[] = [];
  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
    while (queue.length) {
      const id = queue.shift()!;
      try { await loadSheet(id); onUpdate(); }
      catch (error) { failed.push(id); console.error(error); }
    }
  }));
  return failed;
}

export function getTopDownFrame(id: string, dir: TopDownDir, frame: number, anim: Anim = 'idle'): Frame | null {
  const img = sheets.get(id);
  if (!img) return null;
  // Column zero is the planted idle pose. Walking alternates both steps with
  // a neutral passing pose; stopped/talking characters never walk in place.
  const cycle = [0, 1, 1, 0, 2, 2];
  const col = anim === 'walk' ? cycle[frame % cycle.length] : 0;
  return { src: img, sx: col * TOPDOWN_CELL_W, sy: TOPDOWN_DIRS.indexOf(dir) * TOPDOWN_CELL_H,
    sw: TOPDOWN_CELL_W, sh: TOPDOWN_CELL_H };
}
