import type { GameEvent, GameState } from '../../types';
import { price } from '../../engine/economy';

// O comércio bate à porta: contratos, especuladores e estradas perigosas.
const mk = (s: GameState, g: Parameters<typeof price>[1]) => (s.market?.[g] ?? 1);

export const COMMERCE_EVENTS: GameEvent[] = [
  {
    id: 'venda_celeiro', speaker: 'tobias', topic: 'Um comprador para o celeiro', kind: 'audiencia', domain: 'tesoureiro', weight: 4, minDay: 12, repeat: 10,
    cond: (s) => (s.granary ?? 0) >= 12 && mk(s, 'graos') >= 1.25,
    nodes: { start: {
      text: (s) => `Mestre Tobias esfrega as mãos. "Majestade, o grão está pela hora da morte: ${price(s, 'graos').toFixed(1)} a saca. A Guilda compra metade do seu celeiro agora, à vista. No inverno, quem sabe o que valerá? Talvez mais. Talvez nada, se o celeiro pegar fogo." Ele sorri.`,
      choices: [
        { label: 'Vender metade', sub: 'Ouro agora, reserva menor', color: 'dourado', icon: 'moedas', effects: { run: (s) => { const q = Math.floor((s.granary ?? 0) / 2); s.granary = (s.granary ?? 0) - q; s.res.ouro += Math.round(q * price(s, 'graos') * 1.5); }, rel: { tobias: 6 }, xp: 8 }, reply: 'As carroças da Guilda saem cheias. O cofre engorda. O celeiro, nem tanto.' },
        { label: 'Vender tudo', sub: 'Aposta alta', color: 'vermelho', icon: 'moedas', effects: { run: (s) => { const q = s.granary ?? 0; s.granary = 0; s.res.ouro += Math.round(q * price(s, 'graos') * 1.5); }, rel: { tobias: 10 }, res: { povo: -3 }, xp: 6 }, reply: 'O celeiro fica vazio e ecoa. Na cidade baixa, alguém comenta que o rei vendeu o pão do inverno.' },
        { label: 'O grão é do povo', sub: 'Guardar para o inverno', color: 'verde', icon: 'trigo', effects: { res: { povo: 3 }, rel: { tobias: -4 }, xp: 8 }, reply: '"Um rei sentimental." Tobias guarda a bolsa. "Os sentimentais sempre compram caro depois."' },
      ],
    } },
  },
  {
    id: 'bandidos_estrada', speaker: 'mensageiro', topic: 'Bandidos nas estradas', kind: 'urgente', domain: 'marechal', weight: 6, minDay: 6, repeat: 6,
    cond: (s) => Object.values(s.routeBlock ?? {}).some((b) => b.until >= s.day && b.why.startsWith('bandidos')),
    nodes: { start: {
      text: 'Pip chega sem fôlego. "Majestade! Os bandidos da estrada velha atacaram outra caravana. Os mercadores dizem que não saem mais sem escolta. Um deles diz que os bandidos usavam botas boas demais para bandidos."',
      choices: [
        { label: 'Caçar os bandidos', sub: '−60 ouro, rotas livres', color: 'vermelho', icon: 'espadas', req: { ouro: 60 }, effects: { res: { ouro: -60, moral: 3, povo: 2 }, run: (s) => { for (const k of Object.keys(s.routeBlock ?? {})) if (s.routeBlock![Number(k)].why.startsWith('bandidos')) delete s.routeBlock![Number(k)]; }, xp: 12 }, reply: 'A guarda volta com seis presos e uma carroça de mercadorias roubadas. Dois dos presos têm botas de soldado. De qual casa, ninguém diz.' },
        { label: 'Escoltar todas as caravanas', sub: '−3 ouro por rota por dia', color: 'azul', icon: 'escudo', effects: { run: (s) => { for (const r of s.routes) r.escort = true; }, xp: 8 }, reply: 'Cada carroça sai com dois guardas. O comércio fica mais lento, mais caro e muito mais seguro.' },
        { label: 'Perguntar pelas botas', sub: 'Exige Intriga 1', color: 'roxo', icon: 'olho', req: { attr: ['intriga', 1] }, effects: { res: { influencia: 3 }, loyalty: { montclair: -3 }, flags: { banditosMontclair: true }, xp: 14 }, reply: 'As botas são de couro das montanhas, costura de Cinzel. Bandidos com uniforme de reserva. Alguém quer as estradas do rei inseguras.' },
      ],
    } },
    ignored: { text: 'As estradas continuaram perigosas. Os mercadores subiram os preços.', res: { povo: -2 } },
  },
  {
    id: 'especulador_ferro', speaker: 'otho', topic: 'Ferro para a guerra', kind: 'audiencia', domain: 'tesoureiro', weight: 5, minDay: 10, repeat: 8,
    cond: (s) => !!s.war && !s.war.result && mk(s, 'ferro') >= 1.2,
    nodes: { start: {
      text: (s) => `Lorde Otho abre os braços. "Majestade, a guerra come ferro, e as minas de Cinzel são generosas. ${price(s, 'ferro').toFixed(1)} a barra hoje. Mas para o rei faço um preço de amigo: só o dobro do normal." Ele parece sinceramente satisfeito consigo mesmo.`,
      choices: [
        { label: 'Comprar o ferro', sub: '−150 ouro, moral +6', color: 'dourado', icon: 'ferro', req: { ouro: 150 }, effects: { res: { ouro: -150, moral: 6 }, loyalty: { montclair: 5 }, xp: 8 }, reply: 'Espadas novas chegam ao front em três dias. Otho manda um bilhete de agradecimento. Com a fatura anexa.' },
        { label: 'Confiscar para a coroa', sub: 'Lei de guerra, Montclair furiosos', color: 'vermelho', icon: 'coroa', req: { knowledge: 'leis' }, effects: { res: { moral: 6 }, loyalty: { montclair: -14 }, rel: { otho: -12 }, xp: 14 }, reply: '"Em guerra, o ferro é do reino." Você cita a lei. Otho não discute. Ele só anota. Otho sempre anota.' },
        { label: 'Recusar', sub: 'Guerra com espadas velhas', color: 'azul', icon: 'escudo', effects: { res: { moral: -3 }, xp: 5 }, reply: '"Como quiser." Otho sorri. Na semana seguinte, o preço do ferro sobe de novo.' },
      ],
    } },
  },
  {
    id: 'mercador_sul_preco', speaker: 'kasim', topic: 'Vinho em alta no sul', kind: 'audiencia', domain: 'tesoureiro', weight: 3, minDay: 8, repeat: 10,
    cond: (s) => mk(s, 'vinho') >= 1.2 && !s.routes.some((r) => r.to === 'veridian' && r.good === 'vinho'),
    nodes: { start: {
      text: 'Kasim entra com um cálice vazio, que ele vira de cabeça para baixo. "Véridian está sem vinho, Grande Rei. Uma tragédia. Os cortesãos estão bebendo água, e água deixa as pessoas honestas. Mande o vinho da Costa Serena para o sul e eu pago o triplo da tarifa por uma semana."',
      choices: [
        { label: 'Abrir a rota do vinho', sub: 'Rota para Véridian + bônus', color: 'dourado', icon: 'uva', effects: { run: (s) => { const id = s.routes.reduce((m, r) => Math.max(m, r.id), 0) + 1; s.routes.push({ id, from: 'costa', to: 'veridian', good: 'vinho' }); s.res.ouro += 60; }, rel: { kasim: 8 }, loyalty: { valmont: 3 }, xp: 10 }, reply: 'Os navios de Valmont partem cheios de barris. Kasim paga o adiantamento e brinda com o primeiro cálice.' },
        { label: 'Não vendemos para estrangeiros', sub: 'A Guilda agradece', color: 'azul', icon: 'escudo', effects: { rel: { kasim: -6, tobias: 5 }, xp: 5 }, reply: 'Kasim vira o cálice de volta. "Então fico com a água. E com a honestidade. Que horror."' },
      ],
    } },
  },
];
