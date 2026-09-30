import type { Choice, GameState, HouseId, LogEntry } from '../types';
import { HOUSES, HOUSE_IDS } from '../data/realm';
import { char } from '../data/characters';
import { clamp, rand } from './core';
import { nextRouteId } from './economy';

// AS CASAS VIVEM SOZINHAS
// Cada grande casa tem um ressentimento que cresce e diminui, um exército próprio que
// ela arma quando está descontente, uma rival que se irrita quando a outra é favorecida
// e exigências com prazo. Atender, prometer ou recusar muda o reino de verdade:
// casas ressentidas sonegam impostos, casas armadas se rebelam com mais força.

export interface HouseDemand { id: string; until: number; since: number; presented?: boolean; promised?: boolean }
export interface HouseState { grievance: number; troops: number; demand?: HouseDemand; nextDemand: number; withholding?: boolean }

export const RIVAL: Record<HouseId, HouseId> = { valmont: 'drakon', drakon: 'valmont', seren: 'montclair', montclair: 'seren' };

interface DemandDef {
  id: string;
  house: HouseId;
  title: string; // o que a casa exige (curto)
  ask: string; // o que o lorde diz
  cond?: (s: GameState) => boolean; // quando faz sentido pedir
  done: (s: GameState, d: HouseDemand) => boolean; // já foi atendido?
  grant?: { label: string; cost?: { ouro?: number; influencia?: number }; say: string; apply: (s: GameState) => void };
}

const hasRoute = (s: GameState, from: string, good?: string) => s.routes.some((r) => r.from === from && (!good || r.good === good));
const addRoute = (s: GameState, from: 'costa' | 'bosques' | 'montanhas', good: 'vinho' | 'madeira' | 'prata') => { if (!hasRoute(s, from, good)) s.routes.push({ id: nextRouteId(s), from, to: 'castelmar', good }); };

const DEMANDS: DemandDef[] = [
  // Valmont: dinheiro, portos e impostos
  { id: 'v_vinho', house: 'valmont', title: 'Rota de vinho da Costa Serena até a capital', ask: 'Os vinhedos da Costa apodrecem nos barris enquanto a capital bebe vinho de Véridian. Uma rota de vinho, Majestade. É só assinar.', cond: (s) => !hasRoute(s, 'costa', 'vinho'), done: (s) => hasRoute(s, 'costa', 'vinho'),
    grant: { label: 'Abrir a rota agora', say: 'Assino a rota agora mesmo. O vinho da Costa Serena vai chegar à capital antes do fim da semana.', apply: (s) => addRoute(s, 'costa', 'vinho') } },
  { id: 'v_imposto', house: 'valmont', title: 'Tirar o imposto alto da Costa Serena', ask: 'Os mercadores da Costa pagam mais que qualquer outra província. Peço que o imposto da Costa volte ao normal. Um porto feliz paga de outros jeitos.', cond: (s) => s.taxes.valmont === 'alto', done: (s) => s.taxes.valmont !== 'alto',
    grant: { label: 'Voltar ao imposto normal', say: 'O imposto da Costa Serena volta ao normal a partir de hoje. Espero ver essa felicidade nos contratos da coroa.', apply: (s) => { s.taxes.valmont = 'normal'; } } },
  { id: 'v_divida', house: 'valmont', title: 'Pagar 100 moedas da dívida da coroa', ask: 'A coroa deve aos bancos Valmont desde o seu avô. Meus sócios pedem um sinal de boa-fé: cem moedas. Um sinal, só.', done: () => false,
    grant: { label: 'Pagar 100 moedas', cost: { ouro: 100 }, say: 'Cem moedas, contadas. Diga aos seus sócios que a coroa paga o que deve, mesmo o que o meu avô deveu.', apply: () => {} } },
  // Drakon: muralha, soldados e respeito
  { id: 'd_muralha', house: 'drakon', title: '120 moedas para a muralha do Vale', ask: 'A muralha do Vale Rubro tem buracos que um bode atravessa. Cento e vinte moedas, Majestade, ou o norte entra por onde o bode entra.', done: () => false,
    grant: { label: 'Mandar 120 moedas', cost: { ouro: 120 }, say: 'Cento e vinte moedas para a muralha. E diga aos seus pedreiros que o rei vai conferir cada pedra quando for ao Vale.', apply: () => {} } },
  { id: 'd_exercito', house: 'drakon', title: 'O exército real acampado no Vale Rubro', ask: 'O exército do rei passa o inverno na capital, bebendo. Mande-o acampar no Vale, onde o perigo mora. Meus homens estão cansados de vigiar sozinhos.', cond: (s) => s.flags.armyAt !== 'vale', done: (s) => s.flags.armyAt === 'vale',
    grant: { label: 'Mandar o exército ao Vale', say: 'O exército real marcha para o Vale Rubro. Seus homens não vão mais vigiar sozinhos, Lorde Brandt.', apply: (s) => { s.flags.armyAt = 'vale'; } } },
  { id: 'd_imposto', house: 'drakon', title: 'Tirar o imposto alto do Vale Rubro', ask: 'O Vale sangra pela coroa e ainda paga imposto cheio. Tire esse imposto alto do Vale, ou deixe de chamar isso de lealdade.', cond: (s) => s.taxes.drakon === 'alto', done: (s) => s.taxes.drakon !== 'alto',
    grant: { label: 'Voltar ao imposto normal', say: 'O Vale Rubro volta ao imposto normal a partir de hoje. É o preço justo de quem guarda a porta do reino.', apply: (s) => { s.taxes.drakon = 'normal'; } } },
  // Seren: fé, bosques e respeito aos costumes
  { id: 's_capela', house: 'seren', title: 'O rei rezando na capela', ask: 'Os Seren perguntam se o rei ainda reza. Não peço ouro, Majestade. Peço que o vejam na capela, uma vez, antes da lua nova.', done: (s, d) => (Number(s.flags.ultimaReza) || 0) >= d.since },
  { id: 's_madeira', house: 'seren', title: 'Rota de madeira dos Bosques Reais', ask: 'Os carpinteiros da capital compram madeira do sul, e os Bosques apodrecem de tanta árvore caída. Uma rota, Majestade, e os bosques respiram.', cond: (s) => !hasRoute(s, 'bosques', 'madeira'), done: (s) => hasRoute(s, 'bosques', 'madeira'),
    grant: { label: 'Abrir a rota agora', say: 'A madeira dos Bosques vai à capital a partir de amanhã. Que os carpinteiros agradeçam aos carvalhos.', apply: (s) => addRoute(s, 'bosques', 'madeira') } },
  { id: 's_imposto', house: 'seren', title: 'Tirar o imposto alto dos Bosques', ask: 'O inverno vem cedo nos Bosques. Peço que o imposto alto acabe antes da primavera, pelas famílias que vivem da colheita.', cond: (s) => s.taxes.seren === 'alto', done: (s) => s.taxes.seren !== 'alto',
    grant: { label: 'Voltar ao imposto normal', say: 'Os Bosques voltam ao imposto normal. Que as famílias da colheita passem o inverno sem medo.', apply: (s) => { s.taxes.seren = 'normal'; } } },
  // Montclair: prata, minas e orgulho
  { id: 'm_prata', house: 'montclair', title: 'Rota de prata das Montanhas até a capital', ask: 'A prata das minas de Cinzel sai pelo norte porque a coroa não abre caminho pelo sul. Uma rota até a capital, Majestade, e a prata fica no reino.', cond: (s) => !hasRoute(s, 'montanhas', 'prata'), done: (s) => hasRoute(s, 'montanhas', 'prata'),
    grant: { label: 'Abrir a rota agora', say: 'A prata das montanhas vai descer pela estrada real. Se ela ficar no reino, a coroa fica contente. Se for para o norte, a coroa fica sabendo.', apply: (s) => addRoute(s, 'montanhas', 'prata') } },
  { id: 'm_mina', house: 'montclair', title: '80 moedas para escorar a mina de Cinzel', ask: 'Uma galeria desabou em Cinzel. Nenhum morto, graças aos céus. Mas escorar custa oitenta moedas, e as montanhas pagam impostos há gerações.', done: () => false,
    grant: { label: 'Mandar 80 moedas', cost: { ouro: 80 }, say: 'Oitenta moedas para escorar a mina. E um engenheiro do rei para ver onde elas foram usadas.', apply: () => {} } },
  { id: 'm_imposto', house: 'montclair', title: 'Tirar o imposto alto das Montanhas', ask: 'A pedra está mais dura este ano, e o ferro, mais barato. Peço que o imposto das Montanhas volte ao normal. A pedra lembra quem ajudou.', cond: (s) => s.taxes.montclair === 'alto', done: (s) => s.taxes.montclair !== 'alto',
    grant: { label: 'Voltar ao imposto normal', say: 'As Montanhas voltam ao imposto normal. Que a pedra lembre, Lorde Otho, e que o senhor também.', apply: (s) => { s.taxes.montclair = 'normal'; } } },
];
const DEMAND = Object.fromEntries(DEMANDS.map((d) => [d.id, d]));

export function house(s: GameState, h: HouseId): HouseState {
  s.houses ??= {} as Record<HouseId, HouseState>;
  return (s.houses[h] ??= { grievance: 0, troops: HOUSES[h].levy / 100, nextDemand: 3 + HOUSE_IDS.indexOf(h) });
}

export const demandOf = (s: GameState, h: HouseId) => { const d = house(s, h).demand; return d ? { ...d, def: DEMAND[d.id] } : null; };
export const houseTroops = (s: GameState, h: HouseId) => Math.round(house(s, h).troops);

function resolve(s: GameState, h: HouseId, ok: boolean, out: LogEntry[], why?: string) {
  const st = house(s, h), d = st.demand;
  if (!d) return;
  const def = DEMAND[d.id];
  st.demand = undefined;
  if (ok) {
    s.loyalty[h] = clamp(s.loyalty[h] + 6, -100, 100);
    st.grievance = Math.max(0, st.grievance - 20);
    out.push({ icon: HOUSES[h].sigil, title: `${HOUSES[h].name} atendida`, text: `${def.title}: feito. A casa lembra quem cumpre.`, delta: '+6', tone: 'bom' });
  } else {
    s.loyalty[h] = clamp(s.loyalty[h] - (d.promised ? 9 : 6), -100, 100);
    st.grievance = Math.min(100, st.grievance + (d.promised ? 30 : 20));
    out.push({ icon: HOUSES[h].sigil, title: `${HOUSES[h].name} ignorada`, text: why ?? `${def.title}: o prazo venceu${d.promised ? ', e o rei tinha prometido' : ''}. O ressentimento cresce.`, delta: d.promised ? '−9' : '−6', tone: 'ruim' });
  }
}

// Fim do dia: as casas reagem ao que o rei fez (e ao que não fez)
export function housesDaily(s: GameState, out: LogEntry[]) {
  for (const h of HOUSE_IDS) {
    const st = house(s, h);
    // 1. exigência em aberto
    if (st.demand) {
      const def = DEMAND[st.demand.id];
      if (def.done(s, st.demand)) resolve(s, h, true, out);
      else if (s.day >= st.demand.until) resolve(s, h, false, out);
    } else if (s.day >= st.nextDemand && s.day >= 3) {
      const pool = DEMANDS.filter((d) => d.house === h && (!d.cond || d.cond(s)));
      const def = pool[Math.floor(rand(s) * pool.length)];
      if (def) {
        st.demand = { id: def.id, since: s.day + 1, until: s.day + 6 };
        out.push({ icon: HOUSES[h].sigil, title: `${HOUSES[h].name} exige`, text: `${def.title}. ${char(HOUSES[h].lord!).name} virá ao salão pedir, e a casa dá cinco dias.`, tone: 'rumor' });
      }
      st.nextDemand = s.day + 8 + Math.floor(rand(s) * 5);
    }
    // 2. o ressentimento esfria devagar; com lealdade alta, esfria depressa
    st.grievance = Math.max(0, st.grievance - (s.loyalty[h] > 30 ? 5 : 3));
    if (s.loyalty[h] < -40) st.grievance = Math.min(100, st.grievance + 3);
    // 3. casas descontentes armam os próprios homens
    const base = HOUSES[h].levy / 100;
    const target = s.loyalty[h] < -20 || st.grievance >= 70 ? base * 1.6 : s.loyalty[h] > 40 ? base * 1.15 : base;
    const before = Math.round(st.troops);
    st.troops += Math.sign(target - st.troops) * Math.min(0.5, Math.abs(target - st.troops));
    if (Math.round(st.troops) > before && target > base) out.push({ icon: 'espadas', title: `${HOUSES[h].name} se arma`, text: `Ferreiros trabalham dia e noite. A casa já tem ${Math.round(st.troops) * 100} homens próprios.`, tone: 'ruim' });
    // 4. casa muito ressentida sonega impostos
    const withhold = st.grievance >= 70;
    if (withhold && !st.withholding) out.push({ icon: 'moedas', title: `${HOUSES[h].name} sonega`, text: 'Os coletores voltam de mãos vazias. "O rei não nos ouve; que não nos cobre."', tone: 'ruim' });
    st.withholding = withhold;
  }
  // 5. rivalidade: favorecer uma casa irrita a rival
  if (s.dayStart) for (const h of HOUSE_IDS) {
    const gain = s.loyalty[h] - s.dayStart.loyalty[h];
    if (gain >= 7) {
      const r = RIVAL[h], loss = Math.min(2, Math.ceil(gain / 6));
      s.loyalty[r] = clamp(s.loyalty[r] - loss, -100, 100);
      house(s, r).grievance = Math.min(100, house(s, r).grievance + 3);
      out.push({ icon: HOUSES[r].sigil, title: `${HOUSES[r].name} com ciúmes`, text: `A ${HOUSES[r].name} viu a ${HOUSES[h].name} ganhar favores hoje. Rivais contam tudo.`, delta: `−${loss}`, tone: 'ruim' });
    }
  }
}

// Quem traz a exigência ao salão
export function demandSpeaker(s: GameState): HouseId | null {
  return HOUSE_IDS.find((h) => { const d = house(s, h).demand; return d && !d.presented; }) ?? null;
}

// Texto da audiência do lorde
export function demandText(s: GameState, h: HouseId): string {
  const d = demandOf(s, h);
  if (!d) return 'O lorde faz uma reverência e diz que veio só ver o rei.';
  const st = house(s, h);
  const mood = st.grievance >= 70 ? ' Ele não se curva.' : st.grievance >= 30 ? ' A reverência é curta.' : '';
  return `${d.def.ask}${mood} (Prazo: ${Math.max(0, d.until - s.day)} dias.)`;
}

// Escolhas da audiência, montadas a partir da exigência do momento
export function demandChoices(s: GameState, h: HouseId): Choice[] {
  const d = demandOf(s, h);
  const lord = HOUSES[h].lord!;
  const mark = () => { const x = house(s, h).demand; if (x) x.presented = true; };
  if (!d) return [{ label: 'Agradecer a visita', sub: 'Nada a tratar', color: 'azul', icon: 'aperto', say: 'Obrigado pela visita. A coroa tem as portas abertas para a sua casa.', reply: 'O lorde se retira com uma reverência.' }];
  const g = d.def.grant;
  const list: Choice[] = [];
  if (g) list.push({ label: g.label, sub: g.cost?.ouro ? `−${g.cost.ouro} ouro · ${HOUSES[h].name} +6` : `${HOUSES[h].name} +6`, color: 'verde', icon: 'aperto', say: g.say,
    req: g.cost?.ouro ? { ouro: g.cost.ouro } : undefined,
    effects: { res: g.cost?.ouro ? { ouro: -g.cost.ouro } : undefined, rel: { [lord]: 5 }, run: (st) => { g.apply(st); const out: LogEntry[] = []; resolve(st, h, true, out); st.log.push(...out); }, xp: 8 },
    reply: `${char(lord).name} se curva mais do que precisava. "A ${HOUSES[h].name} não esquece, Majestade."` });
  list.push({ label: 'Prometer para os próximos dias', sub: 'Se não cumprir, a raiva dobra', color: 'azul', icon: 'ampulheta', say: `Tem a minha palavra: ${d.def.title.toLowerCase()} vai acontecer antes do prazo. Diga à sua casa que o rei ouviu.`,
    effects: { rel: { [lord]: 2 }, run: (st) => { mark(); const x = house(st, h).demand; if (x) x.promised = true; }, xp: 4 },
    reply: `"Palavra de rei." ${char(lord).name} repete a frase devagar, como quem guarda um recibo.` });
  list.push({ label: 'Recusar', sub: `${HOUSES[h].name} −4 · ressentimento`, color: 'vermelho', icon: 'coroa', say: `Não, milorde. A coroa tem outras prioridades, e a ${HOUSES[h].name} vai ter que esperar como as outras casas.`,
    effects: { loyalty: { [h]: -4 }, rel: { [lord]: -5 }, run: (st) => { const x = house(st, h); x.demand = undefined; x.grievance = Math.min(100, x.grievance + 15); x.nextDemand = st.day + 5; }, res: { prestigio: 1 }, xp: 5 },
    reply: `${char(lord).name} endurece o rosto. "Entendido." Do outro lado do salão, um enviado da ${HOUSES[RIVAL[h]].name} sorri.` });
  return list;
}
