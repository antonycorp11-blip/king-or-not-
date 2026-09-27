// Build de produção: gera dist/ com index.html, main.js e main.css.
import * as esbuild from 'esbuild';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { writeManifest } from './manifest.mjs';

writeManifest();

await esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  minify: true,
  outdir: 'dist/build',
  format: 'esm',
  target: 'es2022',
});
await mkdir('dist', { recursive: true });
await writeFile('dist/index.html', await readFile('index.html', 'utf8'));
// só a arte pronta para o jogo; os originais (assets/raw) ficam fora do site
await cp('assets/personagens', 'dist/assets/personagens', { recursive: true });
await cp('assets/manifest.json', 'dist/assets/manifest.json');
console.log('Build pronto em dist/');
