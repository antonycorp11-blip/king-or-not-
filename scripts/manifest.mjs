// Lista os PNGs de assets/personagens em assets/manifest.json (o jogo lê isso para achar a arte gerada).
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';

export function writeManifest(root = '.') {
  const dir = `${root}/assets/personagens`;
  mkdirSync(dir, { recursive: true });
  const personagens = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.png')).sort();
  writeFileSync(`${root}/assets/manifest.json`, JSON.stringify({ personagens }, null, 2));
  return personagens.length;
}
