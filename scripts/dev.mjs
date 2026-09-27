// Servidor de desenvolvimento com esbuild (o Vite não aceita "?" no caminho da pasta).
import * as esbuild from 'esbuild';
import { watch } from 'node:fs';
import { writeManifest } from './manifest.mjs';

console.log(`Arte de personagens encontrada: ${writeManifest()} arquivo(s)`);
watch('assets/personagens', () => writeManifest());

const port = Number(process.env.PORT ?? 5173);
const ctx = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  outdir: 'build',
  sourcemap: true,
  format: 'esm',
  target: 'es2022',
  logLevel: 'info',
});
await ctx.watch();
// se a porta estiver ocupada, tenta as próximas
let p;
for (let i = 0; i < 10 && !p; i++) {
  try {
    ({ port: p } = await ctx.serve({ servedir: '.', port: port + i }));
  } catch (e) {
    if (!String(e.message).includes('address already in use')) throw e;
    console.log(`Porta ${port + i} ocupada, tentando ${port + i + 1}...`);
  }
}
console.log(`King or Not? rodando em http://localhost:${p}`);
