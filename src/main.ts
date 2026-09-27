import './style.css';
import { App } from './ui/app';
import { startWar } from './engine/war';
import { endDay } from './engine/day';

const app = new App(document.getElementById('app')!);
// acesso pelo console para depuração: game.s (estado), debug.startWar(game.s, 'norhelm')
Object.assign(window, { game: app, debug: { startWar, endDay } });
