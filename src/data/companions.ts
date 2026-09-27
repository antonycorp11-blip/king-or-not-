import type { Advice, Effect, GameEvent, GameState, HouseId } from '../types';
import { CHARACTERS } from './characters';
import { HOUSE_IDS } from './realm';

// Quem fica ao lado do trono durante o dia. Cada um tem intenções próprias:
// o conselho ajuda, mas sempre puxa a coroa um pouco para o lado de quem aconselha.
export interface CompanionDef {
  id: string;
  role: string;
  intent: string; // o que ele(a) quer de verdade
  bonus: string; // efeito passivo do dia
  daily: Effect;
}

const BASE: Record<string, CompanionDef> = {
  isabelle: { id: 'isabelle', role: 'Rainha-mãe', intent: 'Quer preservar a tradição, proteger a família e manter a própria voz na corte. Tem carinho pelos Valmont.', bonus: '+1 Prestígio no fim do dia', daily: { res: { prestigio: 1 } } },
  aldric: { id: 'aldric', role: 'Chanceler', intent: 'Busca equilíbrio e prudência, e que o conselho continue indispensável. Detesta decisões impulsivas.', bonus: '+1 Influência no fim do dia', daily: { res: { influencia: 1 } } },
  elenora: { id: 'elenora', role: 'Rainha', intent: 'Quer um reino próspero e em paz, mas sente o peso das ambições do pai.', bonus: '+40 de ouro no fim do dia', daily: { res: { ouro: 40 } } },
  rhoswen: { id: 'rhoswen', role: 'Rainha', intent: 'Quer um reino temido. Resolve com força o que outros resolveriam com palavras.', bonus: '+2 de Moral das tropas', daily: { res: { moral: 2 } } },
  isolde: { id: 'isolde', role: 'Rainha', intent: 'Joga um jogo próprio: ouro, segredos e o interesse de Véridian. Nunca diz tudo.', bonus: '+50 de ouro, mas os Seren desconfiam (−1)', daily: { res: { ouro: 50 }, loyalty: { seren: -1 } } },
  sigrid: { id: 'sigrid', role: 'Rainha', intent: 'Quer ser aceita pelo povo e manter a paz entre o norte e o sul.', bonus: '+1 de Apoio do Povo', daily: { res: { povo: 1 } } },
};

export function companionsFor(s: GameState): CompanionDef[] {
  const list = [BASE.isabelle, BASE.aldric];
  if (s.spouse && BASE[s.spouse]) list.unshift(BASE[s.spouse]);
  return list;
}

export function companion(s: GameState): CompanionDef | null {
  const id = s.flags.companion as string | undefined;
  return id && BASE[id] ? BASE[id] : null;
}

const realmOf = (id: string) => CHARACTERS[id]?.realm;
const isHouse = (r: string | undefined): r is HouseId => !!r && (HOUSE_IDS as string[]).includes(r);
const COMMON = ['marta', 'campones', 'camponesa', 'irma', 'mensageiro', 'tobias'];

// Conselho genérico quando o evento não tem uma fala escrita para aquele conselheiro.
export function genericAdvice(s: GameState, ev: GameEvent): Advice | null {
  const who = s.flags.companion as string | undefined;
  if (!who || who === ev.speaker) return null;
  const speaker = ev.speaker;
  const realm = realmOf(speaker);
  const commoner = COMMON.includes(speaker);
  const lord = isHouse(realm);
  const loy = (v: number): Effect['loyalty'] => (lord ? { [realm as HouseId]: v } : undefined);

  switch (who) {
    case 'isabelle':
      if (ev.kind === 'casamento')
        return speaker === 'elenora'
          ? { text: 'Isabelle se inclina: "Diga a ela que a família Valmont sempre terá lugar à nossa mesa. É a moça certa, meu filho."', choice: { label: 'Seguir o conselho da mãe', sub: 'Acolher os Valmont', color: 'azul', icon: 'coracao', effects: { rel: { elenora: 10, isabelle: 6 }, loyalty: { valmont: 5 }, xp: 8 }, reply: 'Elenora cora e faz uma reverência mais longa que o protocolo pede. Sua mãe sorri, satisfeita.' } }
          : { text: 'Isabelle franze a testa e sussurra: "Seja cortês e breve. Essa não é uma rainha para Castelmar."', choice: { label: 'Esfriar a conversa', sub: 'A mãe aprova', color: 'dourado', icon: 'escudo', effects: { rel: { [speaker]: -8, isabelle: 8 }, res: { prestigio: 1 }, xp: 6 }, reply: 'A conversa murcha. A pretendente percebe de onde veio o frio.' } };
      if (commoner)
        return { text: 'Isabelle toca seu braço: "Caridade é a joia de uma coroa. Uma esmola da casa real vale mais que cem promessas."', choice: { label: 'Esmola da rainha-mãe', sub: '−60 ouro, o povo agradece', color: 'verde', icon: 'coracao', req: { ouro: 60 }, effects: { res: { ouro: -60, povo: 5 }, rel: { [speaker]: 6, isabelle: 4 }, xp: 6 }, reply: 'A rainha-mãe entrega a bolsa pessoalmente. Na cidade baixa, falarão disso por semanas.' } };
      if (lord)
        return { text: 'Isabelle, baixinho: "Seu pai resolvia isso num banquete. Nobres honrados não se rebelam."', choice: { label: 'Honrar à moda antiga', sub: 'Banquete: −80 ouro', color: 'dourado', icon: 'coroa', req: { ouro: 80 }, effects: { res: { ouro: -80, prestigio: 2 }, loyalty: loy(8), rel: { [speaker]: 5, isabelle: 4 }, xp: 6 }, reply: 'Um lugar de honra no banquete desta noite. O orgulho ferido se cura com vinho e deferência.' } };
      return { text: 'Isabelle, com firmeza: "Deixe que eu cuide disso, meu filho. Conheço esta corte há trinta anos."', choice: { label: 'Deixar a mãe decidir', sub: 'Ela ganha voz na corte', color: 'roxo', icon: 'coroa', effects: { rel: { isabelle: 10 }, res: { prestigio: -2, influencia: 2 }, flags: { maeInfluencia: ((s.flags.maeInfluencia as number) ?? 0) + 1 }, xp: 5 }, reply: 'Sua mãe resolve a questão com uma elegância gelada. Todos notam quem decidiu.' } };

    case 'aldric':
      if (ev.kind === 'urgente')
        return { text: 'Aldric, em voz baixa: "Calma, Majestade. Um rei que corre tropeça. Ouça os capitães antes de decidir."', choice: { label: 'Ouvir o conselho de guerra', sub: 'Prudência', color: 'azul', icon: 'olho', effects: { res: { moral: 3, influencia: 2 }, rel: { aldric: 5 }, xp: 8 }, reply: 'Os capitães falam, o chanceler anota. A decisão final é sua, mas agora é informada.' } };
      if (ev.kind === 'casamento')
        return { text: 'Aldric murmura: "Pense no reino, não no coração. Pergunte pelo dote e pelas alianças, Majestade."', choice: { label: 'Negociar como estadista', sub: 'Frieza política', color: 'dourado', icon: 'pergaminho', effects: { rel: { [speaker]: -4, aldric: 6 }, res: { influencia: 3, ouro: 100 }, xp: 8 }, reply: 'A conversa vira uma negociação. Você ganha termos melhores e perde um pouco de encanto.' } };
      if (commoner)
        return { text: 'Aldric ajusta os óculos: "A lei antiga manda ouvir as duas partes. Um julgamento público acalmaria os ânimos."', choice: { label: 'Julgamento pela lei', sub: 'Justiça pública', color: 'azul', icon: 'pergaminho', effects: { res: { povo: 3, prestigio: 3 }, rel: { [speaker]: 2, aldric: 5 }, xp: 8 }, reply: 'O caso vai a julgamento na praça. O povo vê a lei funcionando, e isso vale muito.' } };
      return { text: 'Aldric pigarreia: "Há um caminho do meio, Majestade. Deixe o conselho examinar o caso e dê uma resposta parcial hoje."', choice: { label: 'A solução do Chanceler', sub: 'Meio-termo', color: 'azul', icon: 'aperto', effects: { loyalty: loy(3), rel: { [speaker]: -2, aldric: 6 }, res: { influencia: 2 }, xp: 8 }, reply: 'Ninguém sai totalmente satisfeito. Todos saem aceitando. O chanceler parece aliviado.' } };

    case 'elenora':
      return { text: 'Elenora sussurra: "Deixe que eu converse com eles. Na Costa Serena aprendi que tudo tem um preço justo."', choice: { label: 'A rainha negocia', sub: 'Acordo comercial', color: 'azul', icon: 'moedas', effects: { res: { ouro: 80 }, loyalty: { valmont: 3 }, rel: { [speaker]: 3, elenora: 5 }, xp: 6 }, reply: 'Elenora encontra um acordo em que todos ganham, principalmente o tesouro.' } };
    case 'rhoswen':
      return { text: 'Rhoswen, sem baixar a voz: "Mostre os dentes, meu rei. Quem pede ao trono precisa lembrar quem manda."', choice: { label: 'À maneira de Rhoswen', sub: 'Força', color: 'vermelho', icon: 'espadas', effects: { res: { prestigio: 4, moral: 3 }, rel: { [speaker]: -5, rhoswen: 6 }, loyalty: { drakon: 3, ...(lord && realm !== 'drakon' ? { [realm as HouseId]: -3 } : {}) }, xp: 6 }, reply: 'O salão fica em silêncio. Ninguém duvida de quem manda. Alguns saem com medo, e isso também é poder.' } };
    case 'isolde':
      return { text: 'Isolde fecha o leque: "Há sempre um preço oculto. Deixe-me descobri-lo... e cobrá-lo."', choice: { label: 'O jogo de Isolde', sub: 'Segredos e ouro', color: 'roxo', icon: 'mascara', effects: { res: { influencia: 4, ouro: 60 }, rel: { [speaker]: -3, isolde: 6 }, loyalty: { seren: -2 }, flags: { isoldeTrama: ((s.flags.isoldeTrama as number) ?? 0) + 1 }, xp: 6 }, reply: 'Isolde conduz a conversa como uma partida de xadrez. Você ganha, mas não sabe exatamente o que ela ganhou.' } };
    case 'sigrid':
      return { text: 'Sigrid, baixinho: "No norte, um jarl ouve os pequenos antes dos grandes. Ouça o que não estão dizendo."', choice: { label: 'O conselho da Rainha da Neve', sub: 'Empatia', color: 'verde', icon: 'coracao', effects: { res: { povo: 5, prestigio: -1 }, rel: { [speaker]: 5, sigrid: 5 }, xp: 6 }, reply: 'A pergunta simples de Sigrid desarma o visitante. Ele fala com o coração, e sai leal.' } };
  }
  return null;
}
