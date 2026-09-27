import type { GameState } from '../types';
import { governabilidade } from '../engine/core';

// Comentários soltos que dão vida ao salão. Reagem ao estado do reino.
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export function guardLine(s: GameState): string {
  const lines = [
    'Fique firme, novato. O rei está olhando.',
    'A cerveja da cantina aumentou de novo...',
    'Minhas botas estão furadas desde o funeral do velho rei.',
    'Dizem que o Capitão Aurelian não dorme há três dias.',
    'Esse salão é frio até no verão.',
    'Você viu o tamanho do Lorde Brandt? Parece um urso de armadura.',
    'Três horas parado aqui e minha perna já dormiu.',
  ];
  if (s.war && !s.war.result) lines.push('Meu irmão está no Vale Rubro... tomara que volte.', 'Se Norhelm chegar aqui, a gente segura essa porta.', 'Dizem que os lobos do norte comem os mortos.');
  if (s.war?.result === 'vitoria') lines.push('Vencemos Norhelm! Ainda não acredito.', 'Esse reizinho é mais duro do que parecia.');
  if (s.res.moral < 40) lines.push('Sem soldo de novo... até quando?', 'Se o ouro não vier, eu volto pra fazenda.');
  if (s.res.povo < 35 || governabilidade(s) < 30) lines.push('A cidade baixa tá fervendo. Cuidado na ronda hoje.', 'Jogaram um repolho em mim no mercado.');
  if (!s.spouse && !s.flags.noiva) lines.push('Aposto duas moedas na moça Valmont.', 'Eu aposto na ruiva dos Drakon. Aquela sabe lutar.', 'A estrangeira de leque me dá arrepios.');
  if (s.flags.noiva && !s.spouse) lines.push('Casamento real! Será que tem banquete pros guardas?');
  if (s.spouse === 'sigrid') lines.push('A rainha da neve... dizem que ela fala com lobos.');
  if (s.spouse === 'rhoswen') lines.push('A rainha treinou com a gente hoje. Derrubou o sargento!');
  if (s.spouse === 'isolde') lines.push('A rainha pagou nosso vinho. Com ela, tudo tem preço... mas pagou.');
  if (s.spouse === 'elenora') lines.push('A rainha sorriu pra mim hoje. Juro!');
  if (s.hour >= 17) lines.push('Falta pouco pro fim do turno.', 'Já tô sentindo o cheiro da sopa da cozinha.');
  if (s.hour <= 9) lines.push('Cedo demais pra tanta gente pedindo coisa ao rei.');
  return pick(lines);
}

export function waitingLine(): string {
  return pick([
    'Será que o rei vai me receber hoje?',
    'Estou esperando desde o amanhecer...',
    'Dizem que o rei é justo. Veremos.',
    'Tão jovem para uma coroa tão pesada.',
    'Espero não ter vindo à toa.',
  ]);
}

export function companionLine(s: GameState, who: string): string {
  const by: Record<string, string[]> = {
    isabelle: ['Endireite a coroa, filho. Estão olhando.', 'Seu pai sentava exatamente assim.', 'Nunca confie num lorde que sorri demais.', 'A família vem primeiro. Sempre.'],
    aldric: ['Lembre-se: ninguém aqui diz tudo o que pensa.', 'Cada decisão de hoje será cobrada amanhã.', 'Um rei paciente enterra reis apressados.', 'Leia antes de assinar, Majestade. Sempre.'],
    elenora: ['Meu pai mandou outra carta. Não vou abrir hoje.', 'O porto está cheio de navios. Bom sinal.', 'Você está indo bem. Sério.'],
    rhoswen: ['Os guardas estão moles. Vou treiná-los amanhã.', 'Se alguém te ameaçar hoje, me avise.', 'Odeio esse vestido.'],
    isolde: ['Aquele lorde mentiu duas vezes. Eu contei.', 'Todos querem algo. O truque é saber o quê.', 'Meu irmão mandou lembranças. E exigências.'],
    sigrid: ['No norte, o povo olha nos olhos do jarl. Aqui olham o chão.', 'Sinto falta da neve.', 'As crianças da cidade baixa me chamam de Rainha da Neve.'],
  };
  const lines = by[who] ?? [];
  if (s.war && !s.war.result && who !== 'isolde') lines.push('A guerra está em todos os rostos hoje.');
  return pick(lines.length ? lines : ['...']);
}
