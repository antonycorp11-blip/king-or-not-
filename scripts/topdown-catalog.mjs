import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
await mkdir('build', { recursive: true });
await build({ entryPoints: ['src/data/characters.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: 'build/character-catalog.cjs', logLevel: 'silent' });
const require = createRequire(import.meta.url);
const { CHARACTERS, ASSET_FILES } = require('../build/character-catalog.cjs');
await writeFile('build/topdown-catalog.json', JSON.stringify(Object.values(CHARACTERS).map(c => ({ ...c, reference: ASSET_FILES[c.id] || ASSET_FILES[c.base] })), null, 2));
