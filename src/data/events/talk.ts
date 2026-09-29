import type { Choice, GameEvent, GameState } from '../../types';
import { bond, bondReading } from '../../engine/bonds';
import { holder, powerLabel, seatOf } from '../../engine/council';
import { addClue } from '../../engine/conspiracy';
import { SEATS } from '../council';
import { EVENT_MAP } from './index';
import { char } from '../characters';

// Conversas: tocar em alguém pelo castelo. Curtas (15 min), uma por pessoa por dia.
// Cada pessoa sabe coisas diferentes: é assim que o rei procura o mundo.
const pick = <T,>(s: GameState, a: T[]) => a[s.day % a.length];
// nome sem título ("Capitão Aurelian" → "Aurelian")
const name = (id: string) => char(id).name.replace(/^(Lady|Lorde|Senhora|Princesa|Príncipe|Mestre|Capitão|Chanceler|Grão-Meistre|Jarl|Irmã|Frei|Sir) /, '').split(' ')[0];

const GREET: Record<string, string[]> = {
  aldric: ['"Majestade. Veio me poupar de ler mais uma petição sobre cabras?"', '"Ah. O senhor anda pelo castelo agora. Seu pai só andava do quarto ao trono."', '"Se veio perguntar se estou cansado: sim. Há quarenta anos."'],
  corvin: ['"Majestade! Eu estava... contando. Sempre estou contando."', '"Se é sobre as velas, posso explicar. Se não é, melhor ainda."', '"O cofre está bem, Majestade. Pergunte-me amanhã e ele estará menos bem."'],
  aurelian: ['"Majestade." Uma continência seca. "Tudo em ordem. Quase tudo."', '"Os recrutas melhoram. Devagar. Como o vinho barato."', '"Anda sem escolta de novo, Majestade. Eu vou fingir que não vi. De novo."'],
  isabelle: ['"Meu filho. Comeu hoje? Não minta, eu sei quando você mente."', '"Venha, sente-se. A corte pode esperar dez minutos. Esperou vinte anos pelo seu pai."', '"Você está com a cara do seu pai quando perdia no xadrez."'],
  lucas: ['"Irmão! Você fugiu do trono? Posso ir junto?"', '"Adivinha quem acertou uma flecha no alvo hoje. Não fui eu. Mas quase."', '"Se veio me dar sermão, eu já estou arrependido. De tudo. Preventivamente."'],
  theodric: ['"Majestade. Um livro sumiu. Não, dois. Não, três. Os ratos estão lendo mais que a corte."', '"Leu algo hoje? Nem uma página? Um parágrafo? Uma vírgula?"'],
  pimenta: ['"Majestade! Tenho uma piada nova. É sobre um rei que andava pelo castelo procurando graça."', '"Beto está de folga. Pimenta atende."', '"Se o senhor rir hoje, eu ganho uma aposta com a cozinha."'],
  clara: ['"M-Majestade! Eu só estava... limpando. Este canto. Que já estava limpo."', '"Trouxe toalhas. Ninguém pediu. Mas trouxe."'],
  frei_aske: ['"Filho! Veio se confessar? Tenho a tarde livre e muita curiosidade."', '"Deus vê tudo, Majestade. Eu vejo quase tudo. Juntos formamos uma boa equipe."'],
  irma: ['"Majestade. Dormiu? Não. Dá para ver. Tome, chá de valeriana."', '"Os soldados feridos perguntam do senhor. Os saudáveis, não."'],
  sombra: ['"Você me achou. Então eu deixei você me achar."', '"Tenho algo a vender. Sempre tenho."'],
  elenora: ['"Meu rei! Olhe esta coluna: sobram duzentas moedas. Não, espere. Faltam."', '"Você veio me ver no meio do dia? Vou fingir que é normal."'],
  rhoswen: ['"Veio treinar? Não? Então veio apanhar em outra coisa."', '"Meu rei. Afiei sua espada. Você não usa, mas afiei."'],
  isolde: ['"Meu rei, que surpresa agradável. Ou calculada. Nunca sei com você."', '"Sente-se. Estou lendo mentiras de Véridian. São ótimas."'],
  sigrid: ['"Aqui está mais quieto que o salão. Gosto disso. E de você, às vezes."', '"No norte já nevou. Aqui ainda faz sol. Estranho reino."'],
};

// O que cada um sabe: pistas reais quando as condições permitem, fofoca útil quando não.
function gossip(s: GameState, id: string): { text: string; clue?: string } {
  const c = s.conspiracy.clues;
  switch (id) {
    case 'irma': if (s.day >= 10 && !c.includes('morte_pai')) return { text: '"Majestade, na noite em que seu pai morreu, o quarto cheirava a amêndoas. Eu nunca contei. Febre não cheira a amêndoas."', clue: 'morte_pai' }; break;
    case 'theodric': if (s.day >= 18 && !c.includes('lei_chaves')) return { text: '"Alguém pediu a Lei das Cinco Chaves nos arquivos. Uma lei que ninguém lê há duzentos anos. Se cinco guardiões girarem suas chaves, o rei é declarado incapaz."', clue: 'lei_chaves' }; break;
    case 'aurelian': if (s.flags.portoesCasa && !c.includes('guarda_trocada')) return { text: '"Os homens dos portões não são mais meus, Majestade. Não comem conosco, não treinam conosco. Recebem ordens de um capitão com anel de casa."', clue: 'guarda_trocada' }; break;
    case 'corvin': if ((bond(s, 'corvin').medo >= 30 || s.flags.corrupcaoValmont) && !c.includes('contas_velas')) return { text: 'Corvin engole seco. "As velas... iam para o porto. Para o sobrinho de Lorde Gaspard. Era pouco, Majestade. Ele disse que pouco não se nota."', clue: 'contas_velas' }; break;
    case 'isabelle': if (!c.includes('otho_norte')) return { text: '"Otho Montclair troca cartas com alguém do norte. Seu pai sabia. Eu nunca entendi por que ele não fez nada. Agora acho que ele estava esperando provas."', clue: 'otho_norte' }; break;
    case 'aldric': if (s.day >= 30 && !c.includes('selo_copiado') && bond(s, 'aldric').lealdade >= 55) return { text: 'Aldric fecha a porta. "Achei cera vermelha com a marca do Selo numa gaveta que não é a minha. Alguém sabe copiar a sua assinatura, Majestade. E eu não sei quem."', clue: 'selo_copiado' }; break;
    case 'pimenta': if (s.day >= 20 && !c.includes('reuniao_noturna')) return { text: '"Uma adivinha: o que tem cinco cadeiras, zero reis e só acontece depois da meia-noite?" Ele não ri. "Não é piada, Majestade. Olhe a sala do conselho à noite."', clue: 'reuniao_noturna' }; break;
    case 'sombra': if (!c.includes('cinco_cadeiras') && s.day >= 25) return { text: '"De graça, só hoje: o Pacto não precisa de exército. Precisa de cinco pessoas que achem que você é um menino. Conte quantas você tem à mesa."', clue: 'cinco_cadeiras' }; break;
  }
  // Nada de pista: algo verdadeiro sobre o dia de amanhã ou sobre a corte
  const next = s.scheduled.find((x) => x.day === s.day + 1 && EVENT_MAP[x.id]);
  if (next && ['aldric', 'isabelle', 'pimenta', 'clara', 'aurelian'].includes(id))
    return { text: `"Ouvi dizer que amanhã ${name(EVENT_MAP[next.id].speaker)} vem tratar de ${EVENT_MAP[next.id].topic.toLowerCase()}. Não ouvi de mim."` };
  const powerful = Object.entries(s.council.power).sort((a, b) => b[1] - a[1])[0];
  if (powerful && powerful[1] >= 45 && powerful[0] !== id)
    return { text: `"As pessoas agora procuram ${name(powerful[0])} antes de procurar o senhor. Dizem que é mais rápido."` };
  return { text: pick(s, ['"Nada de novo, Majestade. O que me preocupa."', '"A cozinha diz que vai chover. A cozinha nunca erra."', '"Os lordes estão quietos. Lordes quietos estão contando alguma coisa."']) };
}

function talk(id: string): GameEvent {
  return {
    id: `talk_${id}`, speaker: id, topic: 'Uma conversa', kind: 'conversa', domain: 'pessoal', hours: 0.25, repeat: 1,
    nodes: { start: { text: (s) => pick(s, GREET[id] ?? ['"Majestade."']), choices: [] } },
  };
}

export const TALKERS = Object.keys(GREET);
export const TALK_EVENTS: GameEvent[] = TALKERS.map(talk);

// Escolhas geradas na hora (dependem do cargo e do vínculo de cada pessoa)
export function talkChoices(eventId: string, s: GameState): Choice[] | null {
  if (!eventId.startsWith('talk_')) return null;
  const id = eventId.slice(5);
  const seat = seatOf(s, id);
  const close = s.spouse === id || ['isabelle', 'lucas'].includes(id);
  const list: Choice[] = [
    { label: 'Conversar um pouco', sub: '15 minutos', color: 'verde', icon: 'balao', effects: { rel: { [id]: 2 }, bond: { [id]: { confianca: 1 } }, mood: { joy: 3, stress: -3 }, xp: 3 }, reply: (st) => bondReading(st, id) },
    { label: 'O que você tem ouvido?', sub: 'Notícias do castelo', color: 'roxo', icon: 'olho', effects: { run: (st) => { const g = gossip(st, id); if (g.clue) addClue(st, g.clue); st.flags[`gossip_${id}`] = g.text; }, xp: 4 }, reply: (st) => String(st.flags[`gossip_${id}`] ?? '"Nada, Majestade."') },
  ];
  if (seat) list.push({ label: 'Como vai o seu cargo?', sub: SEATS[seat].name, color: 'azul', icon: SEATS[seat].icon, effects: { xp: 2 }, reply: (st) => `"${SEATS[seat].domain}: tudo sob controle." Na corte, dizem que ${name(id)} é ${powerLabel(st.council.power[id] ?? 0)}.${(st.council.delegated[id] ?? 0) > 2 ? ` Já decidiu ${st.council.delegated[id]} assuntos no seu lugar.` : ''}` });
  else if (holder(s, 'sussurros') === null && id === 'sombra') list.push({ label: 'Ocupe a cadeira dos Sussurros', sub: 'A Sombra no conselho', color: 'dourado', icon: 'mascara', effects: { run: (st) => { st.council.seats.sussurros = 'sombra'; }, xp: 10 }, reply: '"Uma cadeira à mesa." A Sombra ri baixinho. "Todos vão se sentar mais longe de mim."' });
  if (id === 'aldric' && !s.flags.livroSangue) list.push({ label: 'Pedir um livro emprestado', sub: 'O exemplar dele de Direito de Sangue', color: 'azul', icon: 'livro', effects: { flags: { livroSangue: true }, bond: { aldric: { confianca: 4 } }, xp: 4 }, reply: '"Meu exemplar anotado." Ele hesita antes de soltar o livro. "As anotações na margem são minhas. Não as leia como lei, leia como aviso."' });
  if (id === 'theodric' && !s.flags.livroVenenos && s.day >= 6) list.push({ label: 'Perguntar pela seção proibida', sub: 'Livros que a corte esconde', color: 'roxo', icon: 'cadeado', effects: { flags: { livroVenenos: true }, rel: { theodric: -2 }, xp: 4 }, reply: 'Theodric suspira e tira uma chave do pescoço. "Venenos da Corte. Seu pai me pediu que ninguém lesse. Talvez ele devesse ter lido." O livro agora está na sua estante.' });
  if (close) list.push({ label: 'Passar um tempo juntos', sub: '1 hora, alivia o peso', color: 'dourado', icon: 'coracao', effects: { rel: { [id]: 4 }, bond: { [id]: { amor: 4, confianca: 2 } }, mood: { joy: 10, stress: -14, anger: -10, why: `Passou um tempo com ${name(id)}` }, run: (st) => { st.hour = Math.min(20, st.hour + 0.75); }, xp: 6 }, reply: (st) => (st.spouse === id ? 'Vocês falam de nada por uma hora. É a melhor hora do dia.' : 'O tempo passa rápido. O reino espera. Pela primeira vez, você deixa.') });
  return list;
}
