// Tutorial contextual: cada dica aparece uma vez, na primeira vez que a situação acontece.
export type TipId = 'castelo' | 'conselho' | 'inicio' | 'dialogo' | 'chegada' | 'influencia' | 'resumo' | 'provincias' | 'escassez' | 'biblioteca' | 'rei' | 'corte' | 'guerra';

export const TIPS: Record<TipId, { title: string; text: string; pos?: 'center' | 'top' | 'right' | 'left' }> = {
  castelo: {
    title: 'O seu castelo',
    text: '<b>Toque no chão</b> para andar pelo castelo. Toque nas <b>pessoas</b> para conversar e nos <b>móveis</b> (estante, escrivaninha, cama, trono) para usá-los. <b>Toque no rei</b> para ver as ações do lugar. A fila de audiências espera no <b>Salão do Trono</b>.',
    pos: 'right',
  },
  conselho: {
    title: 'O Conselho governa quando você não governa',
    text: 'Cinco cadeiras, cinco chaves. Se você não recebe alguém, o conselheiro responsável decide <b>por você</b>, do jeito dele, e ganha poder. Nas reuniões, cada cadeira defende uma saída: quem você contraria lembra. Em <b>As cinco cadeiras</b> você nomeia e demite.',
    pos: 'right',
  },
  inicio: {
    title: 'O salão do trono',
    text: 'Cada dia vai das <b>8h às 20h</b>. Quem pede audiência espera na fila do salão; você só descobre quem é quando a pessoa se aproxima. Cada audiência custa <b>1 hora</b>. <b>Dormir</b> encerra o dia.',
    pos: 'right',
  },
  dialogo: {
    title: 'Suas respostas',
    text: 'As cores mostram a postura: <b style="color:#3a5ad0">azul</b> diplomacia, <b style="color:#8a6a28">dourado</b> astúcia e ouro, <b style="color:#a02a2a">vermelho</b> autoridade, <b style="color:#6a3aa8">roxo</b> risco, <b style="color:#2a7a4a">verde</b> bondade. Opções com cadeado pedem um livro da biblioteca. Quem está ao seu lado no trono pode ser consultado em <b>Pedir conselho</b> e traz uma saída nova, sempre com os interesses dele.',
    pos: 'top',
  },
  influencia: {
    title: 'Influência',
    text: 'Antes de responder, ative <b>Usar Influência</b> no canto do diálogo. Você gasta Influência e a casa ou pessoa que ficaria contrariada sofre só um quarto da penalidade. A Influência nasce da <b>Governabilidade</b>: apoio do povo, prestígio e lealdade das casas.',
    pos: 'right',
  },
  chegada: {
    title: 'O dia não para',
    text: 'Novas pessoas chegam ao castelo ao longo do dia. Se você passar a manhã na biblioteca, pode voltar e encontrar gente esperando. Quem não for atendido até o fim do dia vai embora, e isso tem consequências.',
    pos: 'right',
  },
  resumo: {
    title: 'O fim do dia',
    text: 'À noite você vê o que mudou: renda, casas contentes ou furiosas, leis e demandas ignoradas. Rumores anunciam o que pode vir amanhã.',
    pos: 'left',
  },
  provincias: {
    title: 'Províncias e comércio',
    text: 'Cada província produz algo e precisa de algo. Toque numa província no mapa para abrir a ficha dela. Os filtros à esquerda mostram quem é leal, o que cada uma produz e <b>onde está faltando</b>. Mudar impostos ou rotas é um decreto e custa <b>1 hora</b>.',
    pos: 'center',
  },
  escassez: {
    title: 'Como ajudar uma cidade',
    text: 'Quando falta algo numa província, a lealdade dela cai todo dia (na capital, cai o Povo). Para resolver: na ficha, em <b>Necessidades</b>, toque em <b>Trazer de…</b>. Isso cria uma <b>rota comercial</b> de quem tem sobra para quem precisa, e a rota ainda rende tarifas para a coroa. Se ninguém tiver sobra, <b>invista</b> numa província que produz aquilo.',
    pos: 'center',
  },
  biblioteca: {
    title: 'A biblioteca',
    text: 'Ler custa <b>2 horas</b> por sessão. Cada livro terminado abre <b>novas opções nos diálogos</b>: argumentos, perguntas astutas e saídas que você não teria de outra forma.',
    pos: 'center',
  },
  rei: {
    title: 'O rei cresce',
    text: 'Cada decisão dá experiência. A cada 100 pontos você ganha um ponto de habilidade para gastar na árvore. <b>Olhos na Corte</b>, por exemplo, mostra os efeitos das escolhas antes de decidir.',
    pos: 'center',
  },
  corte: {
    title: 'A corte',
    text: 'Cada casa tem <b>exigências com prazo</b>, um <b>humor</b> (ressentida demais, ela sonega impostos), <b>homens próprios</b> que arma quando está descontente e uma <b>rival</b> que se irrita quando a outra é favorecida. Casas com lealdade abaixo de −20 não mandam tropas na guerra.',
    pos: 'center',
  },
  guerra: {
    title: 'Exército e guerra',
    text: 'O exército custa soldo todo dia. Com o tesouro negativo, a moral despenca. Em guerra, convoque o <b>Conselho de Guerra</b> (2h) uma vez por dia: posicione reforços, ataque territórios vizinhos com dados e encerre o turno.',
    pos: 'center',
  },
};

export const HOW_TO_PLAY = `<ul>
  <li>Cada dia vai das <b>8h às 20h</b>. Audiências (1h), leituras (2h), decretos (1h) e o conselho de guerra (2h) consomem horas.</li>
  <li>Pessoas chegam ao longo do dia, e você só descobre quem são e o que querem quando as recebe.</li>
  <li>O que você não responder até o fim do dia <b>também tem consequência</b>.</li>
  <li><b>Influência</b> suaviza decisões impopulares. Ela nasce da <b>Governabilidade</b>: povo, prestígio e lealdade das casas.</li>
  <li><b>Livros</b> destravam falas. A <b>árvore de habilidades</b> faz o rei crescer.</li>
  <li>O conselho espera que você escolha uma rainha em até <b>20 dias</b>. Nenhuma escolha é gratuita.</li>
  <li>Se o Povo, o Prestígio ou a Moral das tropas chegarem a zero, seu reinado acaba.</li>
</ul>`;
