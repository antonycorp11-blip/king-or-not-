import type { Effect, GameState, RealmId, Req, Txt } from '../types';
import { BOOKS } from '../data/progression';
import { HOUSES } from '../data/realm';
import { CHARACTERS } from '../data/characters';
import { attr, hasSkill, knows } from '../engine/core';
import { iconUrl } from '../render/pixel';
import { portraitUrl } from '../render/portraits';
import { isCrowned, portraitFromSheet, type Expr } from '../render/actors';

export function txt(t: Txt | undefined, s: GameState): string {
  if (!t) return '';
  return typeof t === 'function' ? t(s) : t;
}

export function esc(str: string) {
  return str.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

const ATTR_NAMES = { diplomacia: 'Diplomacia', estrategia: 'Estratégia', comercio: 'Comércio', intriga: 'Intriga', carisma: 'Carisma', justica: 'Justiça' };

export function reqCheck(s: GameState, r: Req | undefined): { ok: boolean; why: string } {
  if (!r) return { ok: true, why: '' };
  if (r.knowledge && !knows(s, r.knowledge) && !(r.knowledge === 'leis' && hasSkill(s, 'leiantiga'))) {
    const b = BOOKS.find((x) => x.knowledge === r.knowledge);
    return { ok: false, why: `Leia "${b?.title ?? r.knowledge}"` };
  }
  if (r.attr && attr(s, r.attr[0]) < r.attr[1]) return { ok: false, why: `${ATTR_NAMES[r.attr[0]]} ${r.attr[1]}` };
  if (r.ouro && s.res.ouro < r.ouro) return { ok: false, why: `Precisa de ${r.ouro} de ouro` };
  if (r.influencia && s.res.influencia < r.influencia) return { ok: false, why: `Precisa de ${r.influencia} de Influência` };
  if (r.test && !r.test(s)) return { ok: false, why: r.label ?? 'Indisponível' };
  return { ok: true, why: '' };
}

const RES_LABEL: Record<string, string> = { ouro: 'Ouro', influencia: 'Influência', prestigio: 'Prestígio', povo: 'Povo', exercito: 'Soldados', moral: 'Moral' };

export function effectTags(e: Effect | undefined): string {
  if (!e) return '';
  const tags: string[] = [];
  const t = (label: string, v: number) => tags.push(`<span class="tag ${v >= 0 ? 'pos' : 'neg'}">${label} ${v > 0 ? '+' : ''}${v}</span>`);
  for (const [k, v] of Object.entries(e.res ?? {})) t(RES_LABEL[k] ?? k, v as number);
  for (const [h, v] of Object.entries(e.loyalty ?? {})) t(HOUSES[h as RealmId].name.replace('Casa ', ''), v as number);
  for (const [c, v] of Object.entries(e.rel ?? {})) t(shortName(c), v);
  if (e.law) tags.push(`<span class="tag law">Lei</span>`);
  if (e.schedule?.length) tags.push(`<span class="tag">Consequências futuras</span>`);
  if (e.run) tags.push(`<span class="tag">Efeito especial</span>`);
  return tags.join('');
}

export function shortName(id: string) {
  const c = CHARACTERS[id];
  if (!c) return id;
  return c.name.replace(/^(Lady|Lorde|Senhora|Princesa|Príncipe|Mestre|Capitão|Chanceler|Grão-Meistre|Jarl) /, '').split(' ')[0];
}

const sheetUrls = new Map<string, string>();

// Retrato gerado (com expressão) quando existir; senão, o provisório desenhado em código.
export function portrait(id: string, cls = 'portrait', expr: Expr = 'neutro') {
  const key = `${id}|${expr}|${isCrowned(id) ? 'c' : ''}`;
  let url = sheetUrls.get(key);
  if (!url) {
    const c = portraitFromSheet(id, expr);
    if (c) sheetUrls.set(key, (url = c.toDataURL()));
  }
  return `<img class="pix ${cls} ${url ? 'art' : 'placeholder'}" src="${url ?? portraitUrl(id)}" alt="">`;
}

export function shield(realm: RealmId, cls = 'shield') {
  const H = HOUSES[realm];
  return `<span class="${cls}" style="--hc:${H.color};--hd:${H.dark}"><img class="pix" src="${iconUrl(H.sigil)}" alt=""></span>`;
}

export function bar(v: number, min = -100, max = 100, cls = '') {
  const pct = ((v - min) / (max - min)) * 100;
  const tone = v >= (max + min) / 2 + (max - min) * 0.12 ? 'good' : v <= (max + min) / 2 - (max - min) * 0.12 ? 'bad' : 'mid';
  return `<div class="bar ${cls} ${tone}"><i style="width:${Math.max(2, Math.min(100, pct))}%"></i>${min < 0 ? '<b class="zero"></b>' : ''}</div>`;
}
