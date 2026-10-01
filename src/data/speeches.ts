import type { Effect, GameState, Txt } from '../types';

// PRONUNCIAMENTOS REAIS
// Um discurso tem cinco etapas. Cada resposta soma tons e mexe com grupos
// diferentes da multidão. A combinação é que decide o resultado: um discurso
// autoritário que termina prometendo pão soa falso; um honesto que manipula também.

export type Group = 'povo' | 'mercadores' | 'soldados' | 'religiosos' | 'nobres';
export const GROUPS: Group[] = ['povo', 'mercadores', 'soldados', 'religiosos', 'nobres'];
export const GROUP_INFO: Record<Group, { name: string; icon: string; color: string }> = {
  povo: { name: 'Povo comum', icon: 'povo', color: '#c8a060' },
  mercadores: { name: 'Mercadores', icon: 'moedas', color: '#d8b04a' },
  soldados: { name: 'Soldados', icon: 'espadas', color: '#b03a3a' },
  religiosos: { name: 'Religiosos', icon: 'estrela', color: '#e8e8f0' },
  nobres: { name: 'Nobres', icon: 'coroa', color: '#6a5ac8' },
};

export type Tone = 'conciliador' | 'inspirador' | 'autoritario' | 'populista' | 'religioso' | 'militarista' | 'honesto' | 'manipulador';
export const TONE_NAME: Record<Tone, string> = { conciliador: 'conciliador', inspirador: 'inspirador', autoritario: 'autoritário', populista: 'populista', religioso: 'religioso', militarista: 'militarista', honesto: 'honesto', manipulador: 'manipulador' };
// quem gosta de qual tom
export const TONE_AFFINITY: Record<Group, Partial<Record<Tone, number>>> = {
  povo: { populista: 3, inspirador: 2, honesto: 2, autoritario: -2, militarista: -1 },
  mercadores: { conciliador: 2, honesto: 2, populista: -2, militarista: -2 },
  soldados: { militarista: 3, autoritario: 2, inspirador: 1, conciliador: -1 },
  religiosos: { religioso: 3, honesto: 1, manipulador: -3, militarista: -1 },
  nobres: { autoritario: 2, conciliador: 2, populista: -3, honesto: -1 },
};
// tons que se contradizem (o discurso perde credibilidade)
export const CLASH: [Tone, Tone][] = [['autoritario', 'populista'], ['honesto', 'manipulador'], ['conciliador', 'militarista'], ['religioso', 'manipulador'], ['autoritario', 'conciliador']];

export type Reaction = 'aplausos' | 'vaias' | 'murmurios' | 'silencio' | 'gritos' | 'escudos' | 'objetos' | 'lenços';
export interface SpeechOption { label: string; say: Txt; tones: Tone[]; groups: Partial<Record<Group, number>>; react: Reaction; effects?: Effect }
export interface SpeechStage { id: string; title: string; prompt: Txt; options: SpeechOption[] }

export type SpeechKind = 'coroacao' | 'geral' | 'rainha' | 'guerra' | 'impostos' | 'caso' | 'multidao' | 'paz' | 'execucao' | 'reforma';
export const SPEECH_NAME: Record<SpeechKind, string> = {
  coroacao: 'O primeiro discurso do rei', geral: 'Discurso ao povo', rainha: 'A apresentação da rainha', guerra: 'Declaração de guerra', impostos: 'O anúncio dos impostos', caso: 'A morte do rei Odran',
  multidao: 'Diante da multidão', paz: 'O anúncio da paz', execucao: 'A justiça do rei', reforma: 'Uma nova lei',
};

const O = (label: string, say: Txt, tones: Tone[], groups: Partial<Record<Group, number>>, react: Reaction, effects?: Effect): SpeechOption => ({ label, say, tones, groups, react, effects });
const qn = (s: GameState) => ({ elenora: 'Elenora', rhoswen: 'Rhoswen', isolde: 'Isolde', sigrid: 'Sigrid' } as Record<string, string>)[s.spouse ?? ''] ?? 'a rainha';

// ---------- etapas comuns ----------
const ABERTURA: SpeechStage = { id: 'abertura', title: 'Abertura', prompt: 'A multidão silencia quando o rei aparece na varanda. Como começar?', options: [
  O('Saudar o povo como iguais', 'Povo de Castelmar! Não vim aqui como um rei fala a súditos. Vim como um homem fala à sua gente.', ['populista', 'honesto'], { povo: 6, nobres: -4 }, 'aplausos'),
  O('Invocar os antigos reis', 'Deste mesmo balcão, meu pai, meu avô e o pai dele falaram a vocês. Hoje falo eu, e a coroa pesa o mesmo.', ['inspirador', 'autoritario'], { nobres: 4, soldados: 3, povo: 2 }, 'murmurios'),
  O('Rezar antes de falar', 'Antes de qualquer palavra, peço à Senhora dos Carvalhos que ilumine o que vou dizer, e os ouvidos de quem vai ouvir.', ['religioso'], { religiosos: 8, povo: 2, mercadores: -1 }, 'silencio'),
  O('Ir direto ao ponto', 'Não vou tomar o tempo de vocês com floreios. Tenho uma coisa a dizer, e vou dizer.', ['honesto'], { mercadores: 4, povo: 2, nobres: -1 }, 'murmurios'),
] };

const JUSTIFICATIVA: SpeechStage = { id: 'justificativa', title: 'Justificativa', prompt: 'Alguém grita "Por quê?". Como justificar?', options: [
  O('Pela segurança de todos', 'Porque um reino sem segurança não tem pão, nem mercado, nem missa. Tudo começa com a muralha de pé.', ['militarista', 'autoritario'], { soldados: 6, nobres: 3, povo: -2 }, 'escudos'),
  O('Pelo futuro dos seus filhos', 'Porque os seus filhos vão herdar o que decidirmos hoje. Eu quero que herdem um reino, não uma ruína.', ['inspirador', 'populista'], { povo: 6, religiosos: 2 }, 'aplausos'),
  O('Porque é a lei', 'Porque é a lei de Castelmar, escrita por reis mais velhos e mais sábios que eu. Eu apenas a cumpro.', ['autoritario', 'conciliador'], { nobres: 6, mercadores: 2, povo: -3 }, 'murmurios'),
  O('Porque é a verdade, mesmo amarga', 'Porque é a verdade. Não é bonita, não é fácil, mas eu prefiro que ouçam de mim do que de um boato.', ['honesto'], { mercadores: 4, religiosos: 3, povo: 3, nobres: -2 }, 'silencio'),
  O('Culpar os inimigos do reino', 'Porque há gente, lá fora e aqui dentro, que quer ver Castelmar de joelhos. Não vou dar esse prazer a eles.', ['manipulador', 'militarista'], { soldados: 5, povo: 3, religiosos: -3, mercadores: -2 }, 'gritos'),
] };

const COMPROMISSO: SpeechStage = { id: 'compromisso', title: 'Promessa, pedido ou ameaça', prompt: 'É o momento de pedir algo, prometer algo, ou avisar.', options: [
  O('Prometer pão e trabalho', 'Prometo: enquanto eu for rei, o celeiro do castelo abre antes do celeiro dos ricos.', ['populista'], { povo: 9, mercadores: -3, nobres: -4 }, 'aplausos', { flags: { promessaCeleiro: true } }),
  O('Pedir paciência e confiança', 'Peço uma coisa só: paciência. O que é certo leva tempo. Confiem em mim um inverno, e me julguem na primavera.', ['conciliador', 'honesto'], { mercadores: 5, religiosos: 4, povo: 2 }, 'murmurios'),
  O('Avisar quem conspira', 'E aviso a quem conspira, nos castelos ou nos becos: a coroa vê. E a coroa lembra.', ['autoritario', 'militarista'], { soldados: 5, nobres: -3, povo: 2 }, 'escudos'),
  O('Pedir que rezem pelo reino', 'Peço que rezem. Pelo reino, pelos soldados, e por um rei que ainda está aprendendo.', ['religioso', 'honesto'], { religiosos: 8, povo: 3 }, 'lenços'),
  O('Prometer algo que não pode cumprir', 'Prometo que ninguém pagará mais imposto este ano! Ninguém!', ['populista', 'manipulador'], { povo: 12, mercadores: -4, nobres: -6 }, 'gritos', { flags: { promessaVazia: true } }),
] };

const ENCERRAMENTO: SpeechStage = { id: 'encerramento', title: 'Encerramento', prompt: 'A multidão espera a última frase. A que ela vai lembrar amanhã.', options: [
  O('"Viva Castelmar!"', 'Viva Castelmar! E que ninguém duvide: enquanto eu respirar, este reino não cai.', ['inspirador', 'militarista'], { soldados: 5, povo: 4, nobres: 2 }, 'gritos'),
  O('"Eu sou um de vocês"', 'Eu nasci neste castelo, mas cresci ouvindo o barulho desta praça. Eu sou um de vocês. Não me esqueçam, e eu não esqueço vocês.', ['populista', 'inspirador'], { povo: 8, nobres: -3 }, 'aplausos'),
  O('Um silêncio e uma reverência', '(O rei não diz mais nada. Faz uma reverência ao povo, coisa que nenhum rei fez daquele balcão.)', ['honesto', 'conciliador'], { povo: 5, religiosos: 4, mercadores: 3, nobres: -4 }, 'silencio'),
  O('Encerrar com uma ordem', 'Voltem para casa e para o trabalho. O rei cuida do resto.', ['autoritario'], { nobres: 5, soldados: 3, povo: -4 }, 'murmurios'),
] };

// ---------- a mensagem principal de cada tipo ----------
const MENSAGEM: Record<SpeechKind, SpeechStage> = {
  coroacao: { id: 'mensagem', title: 'O que o novo rei promete', prompt: 'A cidade inteira quer saber que tipo de rei você vai ser. O que dizer?', options: [
    O('Um reino justo para todos', 'Não prometo um reino fácil. Prometo um reino justo: a mesma lei para o lorde e para o padeiro.', ['inspirador', 'honesto'], { povo: 6, mercadores: 4, nobres: -2 }, 'aplausos'),
    O('Honrar a memória do meu pai', 'Meu pai governou trinta anos sem deixar Castelmar cair. Vou honrar cada um desses anos.', ['religioso', 'conciliador'], { religiosos: 7, nobres: 4, povo: 2 }, 'lenços'),
    O('Pulso firme contra os inimigos', 'Quem pensa que um rei jovem é um rei fraco vai descobrir o contrário. Castelmar não se ajoelha.', ['autoritario', 'militarista'], { soldados: 8, nobres: 3, povo: -2 }, 'escudos'),
    O('Pão, festa e portas abertas', 'Hoje à noite, a coroa paga o vinho da praça! E as portas do castelo ficam abertas para quem precisar do rei.', ['populista'], { povo: 9, nobres: -4, mercadores: -2 }, 'gritos'),
  ] },
  geral: { id: 'mensagem', title: 'Mensagem principal', prompt: 'O que o rei veio dizer?', options: [
    O('Falar do inverno que vem', 'O inverno vem cedo este ano. Os celeiros vão abrir, as obras vão continuar, e ninguém vai ficar sozinho.', ['inspirador', 'honesto'], { povo: 7, mercadores: 3 }, 'aplausos'),
    O('Falar da força do reino', 'Castelmar tem mil lanças, quatro casas e uma coroa. Quem olhar para nós do norte vai ver uma muralha.', ['militarista', 'autoritario'], { soldados: 8, nobres: 4, povo: -1 }, 'escudos'),
    O('Falar dos mercados e das rotas', 'As estradas estão seguras e os mercados cheios. Quem vende, compra e trabalha é o coração deste reino.', ['conciliador'], { mercadores: 9, povo: 2 }, 'aplausos'),
  ] },
  rainha: { id: 'mensagem', title: 'Apresentar a rainha', prompt: (s: GameState) => `${qn(s)} dá um passo à frente, ao seu lado. A multidão murmura. Como apresentá-la?`, options: [
    O('"Ela é Castelmar agora"', (s) => `Esta é ${qn(s)}, rainha de Castelmar. Não importa de onde ela veio. Importa que escolheu ficar, e que eu a escolhi.`, ['inspirador', 'honesto'], { povo: 5, nobres: 2, religiosos: 2 }, 'aplausos', { run: (s) => { s.flags.rainhaImagem = Number(s.flags.rainhaImagem ?? 0) + 15; } }),
    O('Falar da aliança que ela traz', (s) => `Com ${qn(s)}, Castelmar ganha ${({ elenora: 'a frota e o ouro da Costa Serena', rhoswen: 'a muralha dos Drakon', isolde: 'a frota de Véridian', sigrid: 'a paz com o norte' } as Record<string, string>)[s.spouse ?? ''] ?? 'uma aliança'}. É um casamento, e é uma promessa de segurança.`, ['conciliador', 'militarista'], { nobres: 6, mercadores: 4, soldados: 3 }, 'murmurios', { run: (s) => { s.flags.rainhaImagem = Number(s.flags.rainhaImagem ?? 0) + 5; } }),
    O('Deixar que ela fale', (s) => `Não vou falar por ela. ${qn(s)}, o povo quer ouvir a sua voz.`, ['honesto', 'populista'], { povo: 6, nobres: -2 }, 'silencio', { run: (s) => { s.flags.rainhaImagem = Number(s.flags.rainhaImagem ?? 0) + (s.spouse === 'sigrid' || s.spouse === 'isolde' ? 20 : 10); s.flags.rainhaFalou = true; } }),
    O('Pedir que a respeitem', (s) => `Quem cuspir no nome de ${qn(s)}, cospe no nome do rei. Lembrem-se disso.`, ['autoritario'], { soldados: 4, nobres: 3, povo: -5 }, 'murmurios', { run: (s) => { s.flags.rainhaImagem = Number(s.flags.rainhaImagem ?? 0) - 5; } }),
  ] },
  guerra: { id: 'mensagem', title: 'Declarar a guerra', prompt: 'A guerra começou. O povo precisa ouvir do rei.', options: [
    O('Uma guerra de defesa', 'Não escolhemos esta guerra. Ela bateu na nossa porta. Vamos defender cada aldeia, cada ponte, cada casa.', ['inspirador', 'honesto'], { povo: 6, soldados: 6, religiosos: 2 }, 'escudos', { res: { moral: 8 } }),
    O('Uma guerra de glória', 'Esta guerra vai lembrar ao mundo quem é Castelmar. Os bardos vão cantar os nomes de quem marchar!', ['militarista', 'populista'], { soldados: 10, povo: 3, mercadores: -4 }, 'escudos', { res: { moral: 12, exercito: 100 } }),
    O('Uma guerra justa, com Deus ao lado', 'Os carvalhos sagrados viram quem começou. A Senhora está do lado de quem se defende.', ['religioso'], { religiosos: 10, soldados: 3, povo: 3 }, 'lenços', { res: { moral: 6 } }),
    O('Pedir voluntários', 'Não vou arrancar ninguém de casa. Peço voluntários. Quem ama este reino, que venha até o quartel amanhã.', ['honesto', 'populista'], { povo: 7, soldados: 3 }, 'aplausos', { res: { exercito: 150, moral: 4 } }),
  ] },
  impostos: { id: 'mensagem', title: 'Anunciar os impostos', prompt: 'O imposto da capital subiu. É hora de explicar.', options: [
    O('Explicar para onde vai cada moeda', 'Cada moeda nova vai para três coisas: a muralha, o celeiro e o soldo. Vou publicar as contas na porta da capela, todo mês.', ['honesto'], { mercadores: 6, povo: 2, religiosos: 3 }, 'murmurios', { flags: { contasPublicas: true } }),
    O('É temporário', 'É um imposto de inverno. Na primavera ele cai. Têm a palavra do rei.', ['conciliador'], { povo: 3, mercadores: 3 }, 'murmurios', { flags: { impostoTemporario: true } }),
    O('Os ricos pagam mais', 'Quem tem mais, paga mais. Os armazéns da Guilda e os cofres dos nobres vão sentir antes do seu pão.', ['populista'], { povo: 9, mercadores: -7, nobres: -6 }, 'aplausos'),
    O('Não é negociável', 'O imposto está decidido. O reino precisa, e o reino vem antes de cada um de nós.', ['autoritario'], { nobres: 4, povo: -8, mercadores: -2 }, 'vaias'),
  ] },
  caso: { id: 'mensagem', title: 'A morte do rei Odran', prompt: 'A praça grita: "QUEM MATOU O REI?". O que o rei conta ao próprio povo?', options: [
    O('Admitir que há uma investigação', 'Vou dizer a verdade: não sei se meu pai morreu de febre. Estou investigando, e não vou parar até saber.', ['honesto'], { povo: 6, religiosos: 4, nobres: -4 }, 'silencio', { run: (s) => { if (s.investigation) for (const k of Object.keys(s.investigation.heat) as (keyof typeof s.investigation.heat)[]) s.investigation.heat[k] = Math.min(100, s.investigation.heat[k] + 10); } }),
    O('Negar tudo', 'Meu pai morreu de febre. Quem espalha outra coisa quer ver o reino em pânico. Não caiam nisso.', ['autoritario', 'manipulador'], { nobres: 5, povo: -4 }, 'murmurios', { flags: { casoNegado: true } }),
    O('Pedir confiança', 'Peço que confiem em mim. Se houver um culpado, ele não vai escapar da justiça do rei. Mas a justiça não se faz em praça.', ['conciliador'], { mercadores: 4, povo: 3, religiosos: 2 }, 'murmurios'),
    O('Apontar um culpado agora', (s) => `Eu sei quem foi. ${s.investigation && Object.entries(s.investigation.found).length > 6 ? 'As provas apontam para dentro deste castelo.' : 'É alguém que vocês conhecem.'} E essa pessoa vai pagar.`, ['populista', 'manipulador'], { povo: 10, nobres: -8, religiosos: -3 }, 'gritos', { flags: { acusacaoPublica: true } }),
  ] },
  multidao: { id: 'mensagem', title: 'Responder à multidão', prompt: 'A multidão está diante dos portões. Ela veio por um motivo. O rei responde a ele.', options: [
    O('"Eu ouço vocês"', 'Eu ouço vocês. Cada palavra. E não vou fingir que não ouvi quando voltar para dentro.', ['populista', 'honesto'], { povo: 8, nobres: -3 }, 'aplausos'),
    O('Anunciar uma medida agora', 'A partir de amanhã, o celeiro real abre uma vez por semana na praça. Pão para quem precisa, sem perguntas.', ['populista', 'inspirador'], { povo: 10, mercadores: -3 }, 'gritos', { res: { ouro: -80, povo: 4 } }),
    O('Mandar dispersar com calma', 'Entendo a raiva. Mas raiva não enche celeiro. Voltem para casa em paz, e amanhã a coroa responde por escrito.', ['conciliador', 'autoritario'], { mercadores: 4, nobres: 3, povo: -3 }, 'murmurios'),
    O('Culpar o conselho', 'Algumas decisões foram tomadas sem mim. Isso acaba hoje.', ['manipulador', 'populista'], { povo: 7, nobres: -5 }, 'gritos', { run: (s) => { for (const id of Object.values(s.council.seats)) if (id) s.council.power[id] = Math.max(0, (s.council.power[id] ?? 0) - 4); } }),
  ] },
  paz: { id: 'mensagem', title: 'Anunciar a paz', prompt: 'A guerra acabou. O que o rei diz sobre ela?', options: [
    O('Honrar os mortos', 'Antes da festa, os nomes. Cada soldado que não voltou vai ter o nome gravado na pedra desta praça.', ['honesto', 'religioso'], { soldados: 8, religiosos: 6, povo: 4 }, 'lenços'),
    O('Celebrar a vitória', 'Castelmar venceu! Três dias de festa, pão e vinho na praça, por conta da coroa!', ['populista', 'inspirador'], { povo: 9, soldados: 5, mercadores: 2 }, 'gritos', { res: { ouro: -100 } }),
    O('Explicar o preço da paz', 'A paz custou caro. Terra, ouro, orgulho. Mas os seus filhos vão voltar para casa. Isso vale o preço.', ['honesto', 'conciliador'], { mercadores: 5, povo: 4, soldados: -2 }, 'murmurios'),
  ] },
  execucao: { id: 'mensagem', title: 'A justiça do rei', prompt: 'Um grande nome foi condenado. A praça quer saber.', options: [
    O('Mostrar as provas', 'Não peço que acreditem no rei. Peço que olhem as provas. Elas estarão na porta da capela amanhã, para quem quiser ler.', ['honesto'], { mercadores: 5, religiosos: 5, povo: 4, nobres: -3 }, 'silencio'),
    O('Um aviso aos poderosos', 'Nenhum nome é grande demais para a justiça do rei. Que os castelos ouçam isso.', ['autoritario', 'populista'], { povo: 9, nobres: -8, soldados: 3 }, 'gritos'),
    O('Pedir clemência para a família', 'O culpado paga. A família dele, não. Ninguém toca nos filhos de um condenado.', ['conciliador', 'religioso'], { religiosos: 7, nobres: 4, povo: 2 }, 'murmurios'),
  ] },
  reforma: { id: 'mensagem', title: 'Anunciar a nova lei', prompt: 'Uma nova lei vai mudar a vida de todos. Como anunciá-la?', options: [
    O('Explicar o porquê', 'Esta lei existe porque o que havia antes não funcionava. Vou dizer exatamente o que muda para cada um de vocês.', ['honesto', 'conciliador'], { mercadores: 5, povo: 4, nobres: 1 }, 'murmurios'),
    O('Uma lei do povo', 'Esta lei não é dos nobres nem da Guilda. É de vocês.', ['populista'], { povo: 9, nobres: -6, mercadores: -2 }, 'aplausos'),
    O('Uma lei para durar', 'Esta lei vai sobreviver a mim. É assim que se governa: pensando em quem ainda não nasceu.', ['inspirador', 'autoritario'], { nobres: 4, religiosos: 3, povo: 3 }, 'aplausos'),
  ] },
};

export function stagesFor(kind: SpeechKind): SpeechStage[] {
  return [ABERTURA, MENSAGEM[kind], JUSTIFICATIVA, COMPROMISSO, ENCERRAMENTO];
}

// ---------- multidões espontâneas: por que o povo veio ----------
export type CrowdReason = 'fome' | 'impostos' | 'vitoria' | 'derrota' | 'boato' | 'casamento' | 'herdeiro' | 'escandalo' | 'execucao' | 'guerra';
export const REASONS: Record<CrowdReason, { title: string; text: string; mood: 'hostil' | 'insatisfeita' | 'celebrando' | 'preocupada' | 'curiosa' | 'furiosa' | 'emocionada'; signs: string[]; size: number }> = {
  fome: { title: 'Fome na cidade', text: 'O pão está caro e o celeiro fechado. Centenas de pessoas batem panelas diante dos portões.', mood: 'hostil', signs: ['PÃO!', 'FOME', 'ABRAM O CELEIRO'], size: 380 },
  impostos: { title: 'Contra o imposto', text: 'Comerciantes e artesãos fecharam as bancas e vieram até o castelo contra o imposto novo.', mood: 'insatisfeita', signs: ['IMPOSTO NÃO', 'CHEGA', 'E O NOSSO PÃO?'], size: 300 },
  vitoria: { title: 'Vitória!', text: 'A notícia da vitória chegou antes dos soldados. A cidade inteira veio comemorar diante do castelo.', mood: 'celebrando', signs: ['VIVA O REI!', 'VITÓRIA', 'CASTELMAR'], size: 480 },
  derrota: { title: 'A derrota', text: 'Os feridos voltaram primeiro. As mães querem saber dos filhos, e querem ouvir o rei.', mood: 'preocupada', signs: ['E OS NOSSOS FILHOS?', 'PAZ'], size: 320 },
  boato: { title: 'Quem matou o rei?', text: 'O boato vazou: dizem que o rei Odran não morreu de febre. A multidão quer uma resposta.', mood: 'furiosa', signs: ['QUEM MATOU O REI?', 'VERDADE', 'JUSTIÇA'], size: 420 },
  casamento: { title: 'O casamento real', text: 'A cidade veio ver o rei e a rainha. Flores, cantorias e alguns curiosos desconfiados.', mood: 'celebrando', signs: ['VIVA A RAINHA!', 'VIVA OS NOIVOS'], size: 500 },
  herdeiro: { title: 'Um herdeiro!', text: 'O sino da capela tocou doze vezes. Castelmar tem um herdeiro, e a praça transborda.', mood: 'emocionada', signs: ['VIVA O PRÍNCIPE!', 'HERDEIRO!'], size: 460 },
  escandalo: { title: 'O escândalo', text: 'O escândalo do castelo correu a cidade. Curiosos, fofoqueiros e indignados querem ver o rei.', mood: 'curiosa', signs: ['É VERDADE?', 'VERGONHA'], size: 260 },
  execucao: { title: 'A justiça do rei', text: 'Um grande nome foi condenado. A praça quer ver, e quer saber se foi justo.', mood: 'curiosa', signs: ['JUSTIÇA', 'MOSTREM AS PROVAS'], size: 360 },
  guerra: { title: 'Rumores de guerra', text: 'A guerra começou e o rei ainda não disse nada. A praça quer ouvir antes de mandar os filhos.', mood: 'preocupada', signs: ['QUAL GUERRA?', 'FALE, REI'], size: 340 },
};
