import type { App } from './app';
import type { Effect } from '../types';
import { applyEffect, save } from '../engine/core';
import { sound } from '../audio/sound';
import { esc } from './common';

// PRÓLOGO: o primeiro minuto
// O velório do rei Odran vira coroação. Em 15 segundos o jogador já decide
// (o primeiro decreto); em 30, Pimenta planta a dúvida e o jogador decide de
// novo; no fim, os cinco suspeitos aparecem marcados na própria cena.
// Tocar na legenda adianta; "Pular prólogo" encerra tudo.

interface Opt { label: string; sub: string; reply: string; effects: Effect; sfx?: 'good' | 'coin' | 'bad' | 'crown' }

const DECREE: Opt[] = [
  { label: 'Três dias de luto por meu pai', sub: '+Prestígio · a rainha-mãe aprova', reply: 'Os sinos tocam por três dias. Isabelle aperta sua mão, pela primeira vez em anos.', effects: { res: { prestigio: 4 }, rel: { isabelle: 6 }, flags: { decreto1: 'luto' } }, sfx: 'good' },
  { label: 'Pão na praça para todo o povo', sub: '+Povo · −60 de ouro', reply: 'Carroças de pão saem do castelo. Da varanda, você ouve a praça gritar o seu nome.', effects: { res: { povo: 7, ouro: -60 }, flags: { decreto1: 'pao' } }, sfx: 'coin' },
  { label: 'Dobrar a guarda do castelo', sub: '+Moral · −40 de ouro · alguém fica nervoso', reply: 'Aurelian dobra os turnos. Nos corredores, alguém que você ainda não conhece passa a andar mais depressa.', effects: { res: { moral: 6, ouro: -40 }, rel: { aurelian: 5 }, flags: { decreto1: 'guarda' } }, sfx: 'good' },
];

const PIMENTA: Opt[] = [
  { label: 'O que você quer dizer?', sub: 'Puxar o fio', reply: 'Pimenta sorri sem mostrar os dentes. "Aqui não, Majestade. Muitas orelhas. Me procure na galeria, ao entardecer."', effects: { rel: { pimenta: 5 }, flags: { prologoPimenta: 'perguntou' } } },
  { label: 'Hoje não, Pimenta', sub: 'Enterrar o pai em paz', reply: 'Pimenta faz uma reverência exagerada. "Hoje não. Amanhã talvez seja tarde." O guizo dele some pelo corredor.', effects: { flags: { prologoPimenta: 'calou' } } },
];

export function playPrologue(app: App): Promise<void> {
  return new Promise((finish) => {
    const s = app.s;
    const cin = app.cinema;
    app.ui.prologue = true;
    // o velório: os cinco que ganhariam com a morte do rei estão todos lá
    cin.stageScene({ room: 'capela', hour: 20, title: 'Capela Real de Castelmar', sub: 'Três dias depois da morte do rei Odran', focus: 'aldric' }, [
      { id: 'isabelle', x: 190, scale: 0.8, dim: 0.12 },
      { id: 'corvin', x: 400, scale: 0.8, dim: 0.12 },
      { id: 'frei_aske', x: 1330, flip: true, scale: 0.8, dim: 0.12 },
      { id: 'otho', x: 1560, flip: true, scale: 0.8, dim: 0.12 },
      { id: 'brandt', x: 1770, flip: true, scale: 0.8, dim: 0.12 },
      { id: 'aldric', x: 1110, flip: true },
      { id: 'rei', x: -120 },
      { id: 'pimenta', x: 2200, flip: true, scale: 0.92 },
    ]);
    app.render();
    sound.play('bell');

    const ov = document.createElement('div');
    ov.className = 'prologue';
    ov.innerHTML = `<button class="pro-skip" type="button">Pular prólogo ›</button><div class="pro-cap"></div><div class="pro-choices"></div><div class="pro-title"></div>`;
    app.stage.appendChild(ov);
    const cap = ov.querySelector<HTMLElement>('.pro-cap')!;
    const box = ov.querySelector<HTMLElement>('.pro-choices')!;
    const title = ov.querySelector<HTMLElement>('.pro-title')!;
    let skipped = false;
    let advance: (() => void) | null = null;
    let pick: ((i: number) => void) | null = null;
    ov.addEventListener('click', (e) => {
      const el = e.target as HTMLElement;
      if (el.closest('.pro-skip')) { skipped = true; sound.play('click'); advance?.(); pick?.(-1); return; }
      const b = el.closest<HTMLElement>('[data-pro]');
      if (b && pick) { pick(Number(b.dataset.pro)); return; }
      if (!pick) advance?.();
    });

    const wait = (ms: number) => new Promise<void>((res) => {
      if (skipped) return res();
      const done = () => { window.clearTimeout(tm); advance = null; res(); };
      const tm = window.setTimeout(done, ms);
      advance = done;
    });
    const say = async (who: string | null, text: string, ms: number) => {
      if (skipped) return;
      cap.innerHTML = `${who ? `<b>${esc(who)}</b>` : ''}<p>${esc(text)}</p><small>toque para continuar</small>`;
      cap.classList.remove('on'); void cap.offsetWidth; cap.classList.add('on');
      await wait(ms);
    };
    const choose = (q: string, opts: Opt[]) => new Promise<number>((res) => {
      if (skipped) return res(-1);
      cap.classList.remove('on');
      box.innerHTML = `<p class="pro-q">${esc(q)}</p>` + opts.map((o, i) => `<button type="button" data-pro="${i}"><b>${esc(o.label)}</b><small>${esc(o.sub)}</small></button>`).join('');
      box.classList.add('on');
      pick = (i) => {
        pick = null;
        box.classList.remove('on'); box.innerHTML = '';
        if (i >= 0) { sound.play('choose'); applyEffect(s, opts[i].effects); save(s); if (opts[i].sfx) window.setTimeout(() => sound.play(opts[i].sfx!), 300); }
        res(i);
      };
    });

    void (async () => {
      await wait(1400);
      await say(null, 'Os médicos disseram que foi febre. O reino inteiro veio se despedir do rei Odran.', 4200);
      cin.moveActor('rei', 760, 320);
      await say(null, 'Você tem vinte e um anos. E, a partir desta noite, a coroa é sua.', 4200);
      cin.faceActor('rei', false);
      cin.showCloseUp('aldric', 'neutro', 3200);
      cin.poseActor('aldric', 'talk', 2.6);
      await say('Chanceler Aldric', 'Diante dos deuses e das cinco casas... longa vida ao rei!', 3400);
      // a coroação: todos se ajoelham, o sino, o brilho
      for (const id of ['isabelle', 'corvin', 'frei_aske', 'otho', 'brandt', 'aldric']) cin.poseActor(id, 'kneel');
      cin.burst('rei', 'spark', 18);
      sound.play('crown');
      window.setTimeout(() => sound.crowd('gritos', 0.6), 500);
      await say(null, '"Longa vida ao rei!", responde a capela inteira. Lá fora, a cidade repete.', 3200);
      // PRIMEIRA DECISÃO
      const d = await choose('Seu primeiro decreto como rei:', DECREE);
      if (d >= 0) { cin.poseActor('rei', 'talk', 2); await say(null, DECREE[d].reply, 4200); }
      for (const id of ['isabelle', 'corvin', 'frei_aske', 'otho', 'brandt', 'aldric']) cin.poseActor(id, 'idle');
      // Pimenta chega por trás, sem guizos
      cin.moveActor('pimenta', 930, 220);
      await wait(1900);
      cin.faceActor('rei', false);
      sound.play('whisper');
      cin.showCloseUp('pimenta', 'preocupado', 5200);
      await say('Pimenta, o bobo', '(sussurrando) Majestade... seu pai odiava doce. Cuspia vinho doce na frente dos embaixadores.', 4600);
      await say('Pimenta, o bobo', 'E havia mel na última taça dele. Abelhas não sobem escadas.', 4200);
      // SEGUNDA DECISÃO
      const p = await choose('O que você faz?', PIMENTA);
      if (p >= 0) { cin.poseActor('pimenta', 'talk', 2.4); await say('Pimenta, o bobo', PIMENTA[p].reply, 4800); }
      cin.moveActor('pimenta', 2200, 260);
      // os cinco suspeitos, marcados na cena
      if (!skipped) {
        sound.play('sting');
        cin.tagActors({ isabelle: 'Isabelle', corvin: 'Corvin', otho: 'Otho', brandt: 'Brandt', aldric: 'Aldric' });
        for (const id of ['isabelle', 'corvin', 'otho', 'brandt', 'aldric']) cin.faceActor(id, id === 'otho' || id === 'brandt' || id === 'aldric');
      }
      await say(null, 'Cinco pessoas ganharam alguma coisa com a morte do rei. Todas estão nesta capela, olhando para você.', 5200);
      cin.tagActors({});
      cap.classList.remove('on');
      if (!skipped) {
        title.innerHTML = '<h1>King or Not?</h1><p>Governe. Case-se. Descubra quem matou seu pai, antes que seja tarde.</p>';
        title.classList.add('on');
        sound.play('bell');
        await wait(3600);
      }
      // entra o jogo
      s.flags.prologo = true;
      save(s);
      cin.fadeOut(() => {
        ov.remove();
        app.ui.prologue = false;
        app.render();
        finish();
      });
      if (skipped) { ov.classList.add('out'); }
    })();
  });
}
