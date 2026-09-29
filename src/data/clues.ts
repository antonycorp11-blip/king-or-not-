// O PACTO DAS CINCO CHAVES
//
// Pela Lei das Cinco Chaves, escrita por Aldren I depois do reinado do Rei Louco,
// os cinco grandes oficiais do conselho guardam cada um uma chave: o Selo (Chanceler),
// o Tesouro (Tesoureiro), o Arsenal (Marechal), o Arquivo das Sombras (Mestre dos
// Sussurros) e os Portões (Guardião do Reino). Se as cinco chaves girarem juntas na
// Mesa das Chaves, o rei é declarado incapaz e o reino passa a um conselho de regência.
// Em duzentos anos, ninguém usou a lei.
//
// O antigo rei descobriu que alguns guardiões e casas se reuniam para usá-la, e
// quis abolir a lei. Morreu de uma "febre" três dias depois. O Pacto viu no filho
// de dezesseis anos a ocasião perfeita: um rei menino, que delega, que casa com a
// casa certa, que entrega as chaves sem perceber.
//
// Cada pista abaixo é escrita no Caderno do Rei, em primeira pessoa.

export interface ClueDef {
  title: string;
  text: string; // entrada do caderno
  weight: number; // quanto do plano ela revela
  points?: string[]; // quem ela aponta
}

export const CLUES: Record<string, ClueDef> = {
  cartas_lysandra: { title: 'O R inclinado', weight: 7, points: ['otho'], text: 'As cartas anônimas têm o mesmo R inclinado das cartas de Lady Lysandra Cinzel. Ela serve aos Montclair.' },
  otho_norte: { title: 'Cartas para o norte', weight: 6, points: ['otho'], text: 'Minha mãe diz que Otho Montclair troca cartas com alguém do norte. Meu pai sabia e nunca fez nada. Por quê?' },
  lei_chaves: { title: 'A Lei das Cinco Chaves', weight: 12, text: 'Se os cinco guardiões do conselho girarem juntos as suas chaves, o rei é declarado incapaz. A lei nunca foi usada. Alguém anda estudando o texto dela nos arquivos.' },
  morte_pai: { title: 'A febre do meu pai', weight: 12, text: 'Irmã Hedda disse que o quarto do meu pai cheirava a amêndoas na noite da febre. Febres não cheiram a amêndoas.' },
  mesa_chaves: { title: 'Arranhões na Mesa das Chaves', weight: 8, text: 'As fechaduras da Mesa das Chaves, na sala do conselho, têm arranhões novos. Alguém testou chaves ali. Recentemente.' },
  reuniao_noturna: { title: 'Luzes no arquivo', weight: 9, text: 'Vi luz no arquivo depois da meia-noite. Vozes baixas. Quando entrei, só havia velas ainda quentes e cinco cadeiras fora do lugar.' },
  moeda_cinzel: { title: 'A moeda de Cinzel', weight: 6, points: ['otho'], text: 'O assassino carregava uma moeda cunhada nas minas de Cinzel. Os Montclair pagam em ferro, e às vezes em sangue.' },
  contas_velas: { title: 'As velas que sumiam', weight: 4, points: ['corvin', 'gaspard'], text: 'Corvin desviava velas do castelo para um sobrinho de Gaspard no porto. Pouco dinheiro. Mas quem ensina um tesoureiro a desviar pouco quer que ele se acostume.' },
  selo_copiado: { title: 'Cera de selo', weight: 8, points: ['aldric'], text: 'Encontrei cera vermelha com a marca do Selo Real numa gaveta que não é a do Chanceler. Alguém sabe copiar minha assinatura.' },
  guarda_trocada: { title: 'Rostos novos nos portões', weight: 8, text: 'Os guardas dos portões não são mais os homens de Aurelian. São soldados de uma casa, pagos por ela. Quem assinou a troca?' },
  diario_pai: { title: 'O diário do meu pai', weight: 14, text: 'No fundo falso da escrivaninha do meu pai: "Três chaves já giram juntas. Se eu morrer de repente, não foi Deus." A data é de três dias antes da febre.' },
  emprestimo_valmont: { title: 'A dívida que não para de crescer', weight: 8, points: ['gaspard'], text: 'Cada empréstimo dos Valmont vem com uma cláusula: em caso de "incapacidade do monarca", a dívida vira posse do porto. Quem escreveu "incapacidade"?' },
  oficiais_drakon: { title: 'Capitães de uma casa só', weight: 8, points: ['brandt'], text: 'Metade dos capitães do exército real juraram primeiro aos Drakon. Se Brandt der uma ordem diferente da minha, a quem eles obedecem?' },
  banco_veridian: { title: 'Ouro do sul', weight: 8, text: 'O banco de Véridian compra as dívidas das casas do reino. Discretamente. Quem controla as dívidas controla os votos.' },
  emissarios_norte: { title: 'Emissários demais', weight: 8, text: 'Desde a paz, chegam emissários do norte toda semana. Nem todos voltam. Alguns alugaram casas perto dos portões.' },
  cinco_cadeiras: { title: 'Cinco cadeiras, cinco chaves', weight: 6, text: 'O Pacto não precisa de exército se tiver as cinco chaves. Precisa só de cinco pessoas que acreditem que eu sou um menino.' },
};

// Preparação para a queda: o que o rei pode salvar quando tudo desabar
export const PREP_NAMES: Record<string, string> = {
  reservas: 'Ouro escondido',
  rotaFuga: 'Rota de fuga',
  tropasOcultas: 'Tropas leais fora da capital',
  aliados: 'Aliados jurados',
  documentos: 'Documentos salvos',
  familia: 'Família protegida',
};
