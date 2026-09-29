// Garante que um save da versão 1 (antes do castelo vivo) carrega, joga e salva na versão 2.
import { newGame } from '../src/engine/core';
import { migrate, SAVE_VERSION } from '../src/engine/migrate';
import { startDay, endDay } from '../src/engine/day';

const fail = (m: string) => { console.error('FALHOU:', m); process.exit(1); };

// Monta um save v1 real: o estado atual sem nenhum campo da v2
const v2 = newGame('Antigo');
startDay(v2);
const v1: Record<string, unknown> = JSON.parse(JSON.stringify(v2));
for (const k of ['phase', 'castle', 'agenda', 'council', 'bonds', 'mood', 'conspiracy', 'dynasty', 'tracks', 'activitiesToday']) delete v1[k];
v1.version = 1;
(v1.flags as Record<string, unknown>).conspiracaoRevelada = true;
(v1.flags as Record<string, unknown>).herdeiro = true;
v1.spouse = 'elenora';

const s = migrate(JSON.parse(JSON.stringify(v1)));
if (!s) fail('save v1 não migrou');
if (s!.version !== SAVE_VERSION) fail('versão não atualizada');
if (s!.castle.room !== 'salao' || !s!.castle.seated) fail('save antigo deveria continuar no salão, sentado');
if (!s!.council.seats.chanceler) fail('conselho vazio');
if (!s!.conspiracy.clues.includes('cartas_lysandra')) fail('decisão antiga não virou pista');
if (!s!.dynasty.length) fail('herdeiro antigo não entrou na dinastia');
if (s!.kingName !== 'Antigo' || s!.day !== 1) fail('dados do reinado perdidos');

// joga três dias com o save migrado
for (let i = 0; i < 3; i++) endDay(s!);
const round = migrate(JSON.parse(JSON.stringify(s)));
if (!round || round.day !== 4) fail('save v2 não sobrevive a ida e volta');
if (migrate({ version: 99 }) !== null) fail('versão futura deveria ser recusada');
if (migrate(null) !== null) fail('lixo deveria ser recusado');
console.log('Save OK: v1 → v2 migrado, jogado por 3 dias e salvo de novo.');
