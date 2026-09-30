import type { GameEvent, GameState } from '../../types';

// ENCONTROS SECRETOS
// Quando a química aparece (um olhar sustentado, um primeiro beijo), a pretendente
// marca um encontro às escondidas, no fim da tarde, num canto do castelo. Se o rei
// não for, ela espera. E lembra.
const after = (flags: string[], days: number) => (s: GameState) =>
  !s.flags.noiva && !s.spouse && s.day < 20 && flags.some((f) => !!s.flags[f] && (s.flagOrigins?.[f]?.day ?? 0) + days <= s.day);
const R = (e: GameEvent): GameEvent => ({ followup: true, domain: 'pessoal', talk: false, ...e });

export const ROMANCE_EVENTS: GameEvent[] = [
  R({
    id: 'segredo_elenora', speaker: 'elenora', topic: 'Lanternas no jardim', kind: 'casamento', cond: after(['elenoraChama', 'elenoraBeijo'], 2),
    place: { room: 'jardim', hour: 19, spot: 'fonte', title: 'Um bilhete de Elenora: "Na fonte, às sete. Venha sozinho."' },
    nodes: { start: {
      text: 'Elenora está sentada na borda da fonte, descalça, com os sapatos ao lado e uma garrafa de vinho da Costa entre os joelhos. As lanternas do jardim tremem na água. "Roubei do meu pai", ela diz, erguendo a garrafa. "Ele guarda para quando fechar o negócio da vida dele. Achei que este era um bom motivo." Ela bate no lugar ao lado dela, na pedra fria. "Senta. Hoje o senhor não é rei. É só o homem de quem eu não consigo parar de falar nas minhas cartas."',
      choices: [
        { label: 'Sentar e dividir o vinho', sub: 'Sem pressa', color: 'verde', icon: 'coracao', say: 'Então hoje eu sou só um homem, sentado numa fonte, bebendo o vinho roubado de Gaspard Valmont. Nunca fui tão feliz sendo cúmplice de um crime.', effects: { rel: { elenora: 12 }, bond: { elenora: { amor: 10 } }, mood: { joy: 12, stress: -12 }, xp: 12 }, reply: 'Vocês bebem direto do gargalo, revezando. Ela conta da primeira vez que viu o mar sozinha, aos oito anos, fugida. Você conta do dia em que a coroa caiu na sua cabeça. Quando a garrafa acaba, ela está com a cabeça no seu ombro e os pés na água.' },
        { label: 'Tirar as botas e entrar na fonte', sub: 'Loucura boa', color: 'roxo', icon: 'coracao', say: 'Você me ensinou que o mar escolhe quem afoga. Esta fonte é pequena, mas serve. Vem.', effects: { rel: { elenora: 16 }, flags: { elenoraFonte: true }, bond: { elenora: { amor: 14 } }, mood: { joy: 16 }, xp: 14 }, reply: 'Ela grita, ri, e entra atrás de você de vestido e tudo. A água bate no joelho. Os cisnes protestam. Ela te beija com o cabelo pingando, e o mundo inteiro cheira a laranja e a água fria. O jardineiro vai encontrar os sapatos dela de manhã e nunca vai contar a ninguém.' },
        { label: 'Perguntar o que ela quer de verdade', sub: 'Sério', color: 'azul', icon: 'olho', say: 'Antes do vinho, me diga uma coisa, Elenora, sem o seu pai na frase: se eu pedir sua mão, é você que diz sim? Ou é a Casa Valmont?', effects: { rel: { elenora: 10 }, flags: { elenoraAutonomia: true }, bond: { elenora: { confianca: 12 } }, xp: 12 }, reply: 'Ela fica séria. Pousa a garrafa. "Sou eu. Pela primeira vez na vida, sou eu." Depois bebe um gole longo. "E isso me assusta muito mais do que o meu pai."' },
      ],
    } },
    ignored: { text: 'Elenora esperou na fonte até a última lanterna apagar. Voltou com os sapatos na mão e o vinho do pai intacto.', rel: { elenora: -10 }, bond: { elenora: { ressentimento: 8 } } },
  }),
  R({
    id: 'segredo_rhoswen', speaker: 'rhoswen', topic: 'Um cavalo selado ao entardecer', kind: 'casamento', cond: after(['rhoswenChama', 'rhoswenBeijo'], 2),
    place: { room: 'estabulos', hour: 18, spot: 'cavalos', title: 'Rhoswen deixou recado: "Estábulos, às seis. Traga botas."' },
    nodes: { start: {
      text: 'Rhoswen escova um garanhão preto, de mangas arregaçadas, o cabelo solto pela primeira vez. Ela não se vira quando você entra. "Ele se chama Temporal. Não deixa ninguém montar, só eu." Ela passa a escova devagar no pescoço do cavalo. "Pensei em cavalgar até a colina antes do sol sumir. Na garupa dele cabe mais um." Agora ela se vira. "Se o rei tiver coragem de segurar na minha cintura."',
      choices: [
        { label: 'Subir na garupa', sub: 'Segurar firme', color: 'roxo', icon: 'coracao', say: 'Coragem eu tenho. Juízo, talvez não. Suba primeiro, milady. Eu seguro onde você mandar.', effects: { rel: { rhoswen: 16 }, flags: { rhoswenColina: true }, bond: { rhoswen: { amor: 14 } }, mood: { joy: 16, stress: -10 }, xp: 14 }, reply: 'Temporal dispara pelo portão como se estivesse esperando por isso a vida inteira. Você segura na cintura dela e ela ri, alto, o vento levando o riso. No alto da colina, ela desmonta, vira o rosto para você ainda na sela, e diz: "Agora eu mando." E beija você antes que o sol termine de cair.' },
        { label: 'Escovar o cavalo com ela', sub: 'Perto, em silêncio', color: 'verde', icon: 'coracao', say: 'Não quero correr hoje. Me passa a outra escova. Quero ver se o Temporal me aceita, se a dona dele aceitar.', effects: { rel: { rhoswen: 12 }, bond: { rhoswen: { amor: 8, confianca: 10 } }, mood: { stress: -10 }, xp: 12 }, reply: 'Vocês escovam o cavalo em silêncio, um de cada lado, até as mãos se encontrarem no meio do dorso dele. Ninguém tira a mão. Temporal bufa, impaciente com os dois.' },
      ],
    } },
    ignored: { text: 'Rhoswen cavalgou sozinha até a colina e voltou depois do escuro, sem falar com ninguém.', rel: { rhoswen: -10 }, bond: { rhoswen: { ressentimento: 8 } } },
  }),
  R({
    id: 'segredo_isolde', speaker: 'isolde', topic: 'Um livro que não devia existir', kind: 'casamento', cond: after(['isoldeBeijo', 'noiteIsolde'], 1),
    place: { room: 'biblioteca', hour: 19, spot: 'leitura', title: 'Um leque esquecido na sua mesa, com um bilhete: "Biblioteca. Sete. Traga uma vela."' },
    nodes: { start: {
      text: 'A biblioteca está escura, exceto por uma vela na mesa de leitura. Isolde está sentada em cima da mesa, não na cadeira, com um livro fino no colo. "Poemas de Véridian. Proibidos lá, porque são bons demais." Ela passa o dedo pela página. "Este aqui fala de uma rainha que se apaixona pelo rei inimigo e o trai, e depois se arrepende a vida inteira." Ela fecha o livro. "Eu não quero ser essa rainha. Leia comigo e me prove que não sou."',
      choices: [
        { label: 'Ler o poema em voz alta, para ela', sub: 'Olhando nos olhos', color: 'roxo', icon: 'coracao', say: '(Você pega o livro e lê, devagar, os olhos nos dela e não na página.) "...e a rainha do sul deixou o punhal na mesa, porque o rei dormia com as mãos abertas." Não há punhal aqui, Isolde. Só as minhas mãos.', effects: { rel: { isolde: 16 }, bond: { isolde: { amor: 14 } }, mood: { joy: 12 }, xp: 14 }, reply: 'Ela tira o livro das suas mãos, põe na mesa e segura as suas mãos abertas entre as dela. "Então não vou trair", sussurra. A vela acaba antes do poema. Nenhum dos dois repara.' },
        { label: 'Perguntar sobre o irmão dela', sub: 'O que ela está escondendo?', color: 'azul', icon: 'olho', say: 'Você escolheu logo esse poema. Por quê, Isolde? O que o seu irmão te mandou fazer que você não quer fazer?', effects: { rel: { isolde: 8 }, clue: 'banco_veridian', bond: { isolde: { confianca: 14 } }, xp: 14 }, reply: 'Ela fica muito tempo em silêncio. "Ele quer que eu seja os olhos dele no seu conselho. Eu disse que sim." Uma pausa. "Estou dizendo a você agora porque decidi que não vou ser."' },
      ],
    } },
    ignored: { text: 'Isolde esperou na biblioteca com o livro fechado até a vela acabar. De manhã, o livro tinha sumido.', rel: { isolde: -10 }, bond: { isolde: { ressentimento: 8 } } },
  }),
  R({
    id: 'segredo_sigrid', speaker: 'sigrid', topic: 'Uma canção do norte', kind: 'casamento', cond: after(['sigridChama'], 2),
    place: { room: 'capela', hour: 19, spot: 'nicho', title: 'Sigrid pediu que a encontrasse na capela, às sete, "quando o frei já tiver ido dormir".' },
    nodes: { start: {
      text: 'A capela está vazia. Sigrid acendeu todas as velas do nicho e está sentada no chão, de pernas cruzadas, cantando baixo numa língua que parece feita de vento. Ela para quando você entra. "É uma canção para os mortos. Minha mãe cantava." Os olhos dela brilham à luz das velas. "No norte, a gente só canta para os mortos na frente de quem vai ficar com a gente até o fim." Ela não termina a frase. Não precisa.',
      choices: [
        { label: 'Sentar no chão e pedir que continue', sub: 'Ouvir até o fim', color: 'verde', icon: 'coracao', say: 'Continua. Não entendo uma palavra, mas quero ouvir até o fim. E quero ficar até o fim, se você deixar.', effects: { rel: { sigrid: 16 }, bond: { sigrid: { amor: 14 } }, mood: { stress: -14, joy: 8 }, xp: 14 }, reply: 'Ela canta até o fim. Na última estrofe, a voz falha, e ela encosta a cabeça no seu ombro. "Agora você conhece a minha mãe", diz. Depois te beija, devagar, como quem sela um juramento antigo.' },
        { label: 'Beijá-la antes da canção acabar', sub: 'Impulso', color: 'roxo', icon: 'coracao', say: '(Você se ajoelha diante dela, e a canção para no meio.) Desculpe. Eu não sei esperar como os nortistas.', effects: { rel: { sigrid: 12 }, bond: { sigrid: { amor: 10 } }, mood: { joy: 12 }, xp: 12 }, reply: 'Ela segura o seu rosto com as duas mãos frias e te beija de volta, com força, como se estivesse brava com você. Talvez esteja. Depois ri, pela primeira vez sem ironia: "Sulista impaciente. Vou ter que te ensinar tudo."' },
      ],
    } },
    ignored: { text: 'Sigrid cantou sozinha na capela. O frei a encontrou de madrugada, dormindo ao pé do nicho, com as velas apagadas.', rel: { sigrid: -10 }, bond: { sigrid: { ressentimento: 8 } } },
  }),
];
