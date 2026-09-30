import type { RoomId } from '../types';

// A MORTE DO REI ODRAN
// Dados do caso: suspeitos, evidências, testemunhas e missões de Pimenta.
// O culpado é sorteado a cada partida (InvestigationState.murderer). Cada evidência
// tem um "encaixe" (slot): o mesmo encaixe tem versões diferentes conforme quem é o
// culpado. Assim a partida monta uma cadeia coerente, e não pistas soltas.
//
// Regras de escrita:
// - Ninguém diz "o rei foi assassinado". Tudo começa como estranheza.
// - Todo suspeito esconde alguma coisa, mesmo inocente (segredos).
// - Algumas pistas apontam para o inocente por coincidência; outras são plantadas.

export type SuspectId = 'corvin' | 'brandt' | 'isabelle' | 'otho' | 'aldric';
export const SUSPECTS: SuspectId[] = ['corvin', 'brandt', 'isabelle', 'otho', 'aldric'];

export type EvKind = 'fato' | 'fisica' | 'documento' | 'depoimento' | 'contradicao' | 'rumor' | 'duvidosa' | 'falsa';
export const KIND_INFO: Record<EvKind, { name: string; weight: number; color: string }> = {
  fato: { name: 'Fato confirmado', weight: 1, color: '#2a6a3a' },
  fisica: { name: 'Evidência física', weight: 0.9, color: '#6a4a1a' },
  documento: { name: 'Documento', weight: 0.8, color: '#2a3f8f' },
  contradicao: { name: 'Contradição', weight: 0.85, color: '#8a1c24' },
  depoimento: { name: 'Depoimento', weight: 0.6, color: '#4a2470' },
  rumor: { name: 'Rumor', weight: 0.3, color: '#6a6a6a' },
  duvidosa: { name: 'Informação duvidosa', weight: 0.25, color: '#8a7a5a' },
  falsa: { name: 'Evidência possivelmente falsa', weight: 0.8, color: '#a0602a' },
};

export const PHASES = ['A morte não parece natural', 'Quem tinha acesso', 'Quem tinha motivo', 'As últimas horas', 'O método', 'Os cúmplices', 'Confrontar e acusar'];

export interface EvidenceDef {
  id: string;
  slot: string; // encaixe: versões do mesmo achado conforme o culpado
  phase: number; // 1..6
  kind: EvKind;
  looks?: EvKind; // prova plantada: como ela parece até ser desmascarada
  title: string;
  text: string;
  source: string; // de onde veio (preenchido na descoberta, mas há um padrão)
  points: Partial<Record<SuspectId, number>>;
  only?: SuspectId[]; // só existe se o culpado for um destes
  unless?: SuspectId[]; // não existe se o culpado for um destes
  planted?: SuspectId; // prova falsa plantada contra este inocente
  debunks?: string; // desmascara esta prova plantada
  secretOf?: SuspectId; // segredo (não é o crime, mas é verdade)
  clue?: string; // pista do Pacto (Caderno do Rei)
  links?: string[]; // encaixes que esta evidência conecta na mesa
}

const E = (d: EvidenceDef) => d;

export const EVIDENCE: EvidenceDef[] = [
  // ======================= FASE 1: a morte não parece natural =======================
  E({ id: 'mel', slot: 'mel', phase: 1, kind: 'depoimento', title: 'Mel na última taça', source: 'Pimenta', points: {},
    text: 'Pimenta: "Seu pai odiava vinho doce. Cuspia. Estranho terem encontrado mel na última taça dele." Depois fez uma piada sobre abelhas e mudou de assunto.' }),
  E({ id: 'odiava_doce', slot: 'odiava_doce', phase: 1, kind: 'fato', title: 'O rei odiava doce', source: 'Cozinheira', points: {}, links: ['mel'],
    text: 'A cozinheira confirma: em trinta anos, o rei Odran nunca aceitou mel, açúcar ou vinho doce. "Mandava de volta até a torta de maçã."' }),
  E({ id: 'amendoas', slot: 'amendoas', phase: 1, kind: 'depoimento', title: 'Cheiro de amêndoas', source: 'Irmã Hedda', points: {}, clue: 'morte_pai',
    text: 'Irmã Hedda: "O quarto cheirava a amêndoas amargas. Não havia amêndoas no castelo naquela semana."' }),
  E({ id: 'tres_horas', slot: 'tres_horas', phase: 1, kind: 'fato', title: 'Uma febre de três horas', source: 'Irmã Hedda', points: {}, links: ['amendoas'],
    text: 'O rei jantou bem, subiu às 22h e estava morto antes das 2h. Nenhuma febre que Hedda conheça mata em três horas um homem que caçava na véspera.' }),
  E({ id: 'atestado', slot: 'atestado', phase: 1, kind: 'documento', title: 'O atestado adiantado', source: 'Arquivos', points: { aldric: 6 },
    text: 'O atestado de "febre" tem a hora da morte escrita com outra tinta, e foi selado com o Selo do Chanceler antes de o médico chegar ao quarto.' }),

  // ======================= FASE 2: quem tinha acesso =======================
  E({ id: 'portaria', slot: 'portaria', phase: 2, kind: 'documento', title: 'O livro da portaria', source: 'Portaria', points: { aldric: 4, corvin: 4, otho: 4 },
    text: 'Depois das 20h entraram na ala real: o Chanceler (audiência tardia), o Tesoureiro (contas), um mensageiro de Cinzel com um presente de Lorde Otho. Uma quarta linha foi raspada com faca.' }),
  E({ id: 'raspada', slot: 'raspada', phase: 2, kind: 'fisica', title: 'A linha raspada', source: 'Portaria', points: { brandt: 10 }, links: ['portaria'],
    text: 'Contra a luz, a linha raspada ainda mostra metade de uma letra: um D grande, do jeito que os escribas escrevem "Drakon".' }),
  E({ id: 'taca_cinzel', slot: 'taca', phase: 2, kind: 'fisica', title: 'A taça de prata de Cinzel', source: 'Aposentos do rei', points: { otho: 12 },
    text: 'A última taça do rei não era a de sempre. Era a de prata trabalhada que Lorde Otho mandou de presente naquela mesma noite. Alguém a lavou; ninguém lavou o pé.' }),
  // quem segurou a jarra (a versão depende do culpado)
  E({ id: 'jarra_corvin', slot: 'jarra', phase: 2, kind: 'depoimento', title: 'Quem segurou a jarra', source: 'Pajem', points: { corvin: 10 }, only: ['corvin'],
    text: 'O pajem levava a jarra quando alguém o parou no corredor e segurou a jarra "um instante" enquanto ele amarrava o sapato. Mãos manchadas de tinta de livro-caixa e cheiro de cera.' }),
  E({ id: 'jarra_brandt', slot: 'jarra', phase: 2, kind: 'depoimento', title: 'Quem segurou a jarra', source: 'Pajem', points: { brandt: 10 }, only: ['brandt'],
    text: 'Alguém muito grande, de capa, parou o pajem no escuro e disse "deixa que eu levo, garoto". Cheirava a cavalo e a hidromel.' }),
  E({ id: 'jarra_isabelle', slot: 'jarra', phase: 2, kind: 'depoimento', title: 'Quem segurou a jarra', source: 'Pajem', points: { isabelle: 10 }, only: ['isabelle'],
    text: 'A jarra ficou um minuto sozinha na mesinha do corredor, porque a rainha-mãe mandou o pajem buscar uma manta. Quando voltou, o corredor cheirava a violetas.' }),
  E({ id: 'jarra_otho', slot: 'jarra', phase: 2, kind: 'depoimento', title: 'Quem segurou a jarra', source: 'Pajem', points: { otho: 10 }, only: ['otho'],
    text: 'O mensageiro de Cinzel insistiu em servir o vinho ele mesmo, "por ordem de Lorde Otho". Botas de montanha, rangendo no assoalho.' }),
  E({ id: 'jarra_aldric', slot: 'jarra', phase: 2, kind: 'depoimento', title: 'Quem segurou a jarra', source: 'Pajem', points: { aldric: 10 }, only: ['aldric'],
    text: 'O Chanceler pegou a jarra da mão do pajem na porta: "Eu sirvo o rei. Vá dormir." O pajem lembra do anel com o selo batendo no gargalo.' }),
  // quem pediu mel
  E({ id: 'melpedido_corvin', slot: 'melpedido', phase: 2, kind: 'depoimento', title: 'Quem pediu mel', source: 'Cozinha', points: { corvin: 9 }, only: ['corvin'], links: ['mel'],
    text: 'O Tesoureiro mandou comprar dois potes de mel naquela semana, "para as contas da despensa". A cozinha nunca viu o mel.' }),
  E({ id: 'melpedido_brandt', slot: 'melpedido', phase: 2, kind: 'depoimento', title: 'Quem pediu mel', source: 'Cozinha', points: { brandt: 9 }, only: ['brandt'], links: ['mel'],
    text: 'Ninguém pediu mel à cozinha. Mas os Drakon trouxeram um barril de hidromel do Vale naquela semana. Hidromel é mel fermentado.' }),
  E({ id: 'melpedido_isabelle', slot: 'melpedido', phase: 2, kind: 'depoimento', title: 'Quem pediu mel', source: 'Cozinha', points: { isabelle: 9 }, only: ['isabelle'], links: ['mel'],
    text: 'A rainha-mãe pediu o mel das noites de inverno, "como sempre". A cozinheira estranhou: nunca era para o rei. Era para ela.' }),
  E({ id: 'melpedido_otho', slot: 'melpedido', phase: 2, kind: 'depoimento', title: 'Quem pediu mel', source: 'Cozinha', points: { otho: 9 }, only: ['otho'], links: ['mel'],
    text: 'Junto com o vinho de Cinzel veio um pote de mel escuro, "de pinheiro". Não é mel das montanhas. Pinheiro assim só cresce no norte.' }),
  E({ id: 'melpedido_aldric', slot: 'melpedido', phase: 2, kind: 'depoimento', title: 'Quem pediu mel', source: 'Cozinha', points: { aldric: 9 }, only: ['aldric'], links: ['mel'],
    text: 'O Chanceler pediu mel "para o remédio do coração do rei, que é amargo demais". O rei tomava o remédio havia um mês. Nunca tinha pedido mel antes.' }),

  // ======================= FASE 3: motivos (todos são verdade; só um matou) =======================
  E({ id: 'motivo_corvin', slot: 'motivo_corvin', phase: 3, kind: 'documento', title: 'A auditoria que não aconteceu', source: 'Livro do Tesouro', points: { corvin: 13 },
    text: 'Uma ordem assinada por Odran: auditoria completa do Tesouro, marcada para o dia seguinte à morte dele. Ninguém a cumpriu. Corvin nunca a mencionou.' }),
  E({ id: 'motivo_brandt', slot: 'motivo_brandt', phase: 3, kind: 'documento', title: '"Sei de tudo"', source: 'Carta interceptada', points: { brandt: 12, isabelle: 5 },
    text: 'Rascunho de Odran para Brandt: "Sei de tudo. Deixe o castelo antes da lua nova e não volte, e ninguém saberá por mim." Datado de três dias antes da morte.' }),
  E({ id: 'motivo_isabelle', slot: 'motivo_isabelle', phase: 3, kind: 'documento', title: 'O tratado com o nome de Lucas', source: 'Arquivos', points: { isabelle: 13 },
    text: 'Rascunho de paz com Norhelm, na letra de Odran: o príncipe Lucas iria viver em Hjalmgard "como garantia", por dez anos. Isabelle sabia? A margem tem uma mancha de lágrima, ou de vinho.' }),
  E({ id: 'motivo_otho', slot: 'motivo_otho', phase: 3, kind: 'documento', title: 'Cartas para Hjalmgard', source: 'Correio de Otho', points: { otho: 13 }, clue: 'otho_norte',
    text: 'Cartas de Otho a um jarl de Norhelm: "quando a coroa mudar de cabeça, as minas de Cinzel serão neutras." Odran sabia delas. Estava juntando provas.' }),
  E({ id: 'motivo_aldric', slot: 'motivo_aldric', phase: 3, kind: 'documento', title: 'A decisão que o rei não anunciou', source: 'Arquivos', points: { aldric: 11 }, clue: 'lei_chaves',
    text: 'Anotações de Odran: abolir a Lei das Cinco Chaves e marchar contra o norte no inverno. Na margem, com a letra fina de Aldric: "Isso destrói o reino em um ano."' }),

  // ======================= FASE 4: últimas horas (álibis e contradições) =======================
  E({ id: 'alibi_brandt', slot: 'alibi_brandt', phase: 4, kind: 'depoimento', title: 'O álibi de Brandt', source: 'Lorde Brandt', points: { brandt: -6 },
    text: 'Brandt jura que estava no Vale Rubro naquela noite, "a quatro dias de cavalo daqui".' }),
  E({ id: 'contra_brandt', slot: 'contra_brandt', phase: 4, kind: 'contradicao', title: 'Brandt estava no castelo', source: 'Jardineiro', points: { brandt: 14, isabelle: 6 }, links: ['alibi_brandt', 'raspada'],
    text: 'O jardineiro viu Lorde Brandt no corredor dos aposentos da rainha-mãe às 23h daquela noite, sem armadura, com as botas na mão. Brandt mentiu.' }),
  E({ id: 'alibi_isabelle', slot: 'alibi_isabelle', phase: 4, kind: 'depoimento', title: 'O álibi da rainha-mãe', source: 'Isabelle', points: { isabelle: -5 },
    text: 'Isabelle diz que dormiu cedo, "com dor de cabeça", e só soube da morte ao amanhecer.' }),
  E({ id: 'contra_isabelle_g', slot: 'contra_isabelle', phase: 4, kind: 'contradicao', title: 'Isabelle não dormia', source: 'Criada', points: { isabelle: 14 }, only: ['isabelle'], links: ['alibi_isabelle'],
    text: 'A criada viu a rainha-mãe sair do quarto do rei à meia-noite, com a bandeja de prata e a manta. Ela disse à criada: "Você não me viu." A criada obedeceu até hoje.' }),
  E({ id: 'contra_isabelle_i', slot: 'contra_isabelle', phase: 4, kind: 'contradicao', title: 'Isabelle não dormia', source: 'Criada', points: { isabelle: 7, brandt: 7 }, unless: ['isabelle'], links: ['alibi_isabelle', 'contra_brandt'],
    text: 'A criada viu a rainha-mãe descer para o jardim à meia-noite, de capa, e um homem grande esperando junto à fonte. Ela disse à criada: "Você não me viu."' }),
  E({ id: 'alibi_corvin', slot: 'alibi_corvin', phase: 4, kind: 'depoimento', title: 'O álibi de Corvin', source: 'Mestre Corvin', points: { corvin: -5 },
    text: 'Corvin diz que passou a noite contando moedas no tesouro, sozinho, "como toda terça".' }),
  E({ id: 'contra_corvin_g', slot: 'contra_corvin', phase: 4, kind: 'contradicao', title: 'O tesouro estava trancado', source: 'Sentinela', points: { corvin: 14 }, only: ['corvin'], links: ['alibi_corvin'],
    text: 'A sentinela trancou o tesouro às 20h, com Corvin do lado de fora. Às 22h ela o viu descendo a escada de serviço para a cozinha, com um pote embrulhado no manto.' }),
  E({ id: 'contra_corvin_i', slot: 'contra_corvin', phase: 4, kind: 'contradicao', title: 'O tesouro estava trancado', source: 'Sentinela', points: { corvin: 6 }, unless: ['corvin'], links: ['alibi_corvin'],
    text: 'A sentinela trancou o tesouro às 20h, com Corvin do lado de fora. Às 22h ele saiu pelo portão de serviço rumo ao porto. Voltou ao amanhecer, com os bolsos pesados.' }),
  E({ id: 'alibi_aldric', slot: 'alibi_aldric', phase: 4, kind: 'depoimento', title: 'O álibi de Aldric', source: 'Chanceler Aldric', points: { aldric: -5 },
    text: 'Aldric diz que a audiência com o rei terminou às 22h e que ele foi direto para os arquivos, "onde sempre durmo, dizem as más línguas".' }),
  E({ id: 'contra_aldric_g', slot: 'contra_aldric', phase: 4, kind: 'contradicao', title: 'A audiência que acabou tarde', source: 'Escriba', points: { aldric: 14 }, only: ['aldric'], links: ['alibi_aldric', 'jarra'],
    text: 'O escriba esperou na antessala: a audiência só acabou às 23h. O Chanceler saiu com a taça vazia na mão e a entregou ao escriba: "Lave isto. Agora."' }),
  E({ id: 'contra_aldric_i', slot: 'contra_aldric', phase: 4, kind: 'contradicao', title: 'Aldric não foi para os arquivos', source: 'Escriba', points: { aldric: 6 }, unless: ['aldric'], links: ['alibi_aldric'],
    text: 'Aldric não dormiu nos arquivos. Foi para a Sala do Conselho, onde quatro pessoas encapuzadas o esperavam. As cadeiras foram viradas para a Mesa das Chaves.', clue: 'reuniao_noturna' }),
  E({ id: 'alibi_otho_i', slot: 'alibi_otho', phase: 4, kind: 'fato', title: 'Otho estava nas montanhas', source: 'Registros de Cinzel', points: { otho: -10 }, unless: ['otho'],
    text: 'Três testemunhas e um registro de mina confirmam: Otho passou aquela noite em Cinzel, a dois dias da capital. Mandou o presente, mas não veio.' }),
  E({ id: 'alibi_otho_g', slot: 'alibi_otho', phase: 4, kind: 'contradicao', title: 'O mensageiro que não voltou', source: 'Guarda da portaria', points: { otho: 14 }, only: ['otho'], links: ['portaria', 'jarra'],
    text: 'O "mensageiro" de Cinzel não voltou a Cinzel. Saiu da capital antes do amanhecer pela estrada do norte, e ninguém em Cinzel conhece o rosto dele. Um homem de Otho, não um mensageiro.' }),

  // ======================= FASE 5: o método =======================
  E({ id: 'raiz', slot: 'raiz', phase: 5, kind: 'fato', title: 'Raiz-de-amêndoa amarga', source: 'Irmã Hedda', points: {}, links: ['amendoas', 'mel'],
    text: 'Hedda identifica o veneno pelos sintomas: raiz-de-amêndoa amarga, que tem gosto horrível. Só um xarope doce disfarça. Quem pôs mel sabia que o rei beberia mesmo assim.' }),
  E({ id: 'metodo_corvin', slot: 'metodo', phase: 5, kind: 'documento', title: 'Um recibo chamado "velas"', source: 'Livro do Tesouro', points: { corvin: 18 }, only: ['corvin'], links: ['melpedido', 'motivo_corvin'],
    text: 'No livro do Tesouro, uma compra de "velas" ao boticário da cidade baixa, paga em prata. O boticário não vende velas. Vende raiz-de-amêndoa.' }),
  E({ id: 'metodo_brandt', slot: 'metodo', phase: 5, kind: 'fisica', title: 'O cantil de hidromel', source: 'Aposentos do rei', points: { brandt: 18 }, only: ['brandt'], links: ['melpedido', 'contra_brandt'],
    text: 'Atrás da cabeceira da cama do rei, um cantil de couro com o leão dos Drakon. Hidromel no fundo. E, no gargalo, o cheiro inconfundível de amêndoa amarga.' }),
  E({ id: 'metodo_isabelle', slot: 'metodo', phase: 5, kind: 'fisica', title: 'O xarope das noites de inverno', source: 'Aposentos da rainha-mãe', points: { isabelle: 18 }, only: ['isabelle'], links: ['melpedido', 'contra_isabelle'],
    text: 'Na penteadeira de Isabelle, o frasco do xarope que ela prepara todo inverno para dormir. A receita dela está anotada à mão. A última linha foi acrescentada depois, com outra tinta: "raiz, três gotas".' }),
  E({ id: 'metodo_otho', slot: 'metodo', phase: 5, kind: 'fisica', title: 'O pote de mel de pinheiro', source: 'Despensa', points: { otho: 18 }, only: ['otho'], links: ['melpedido', 'taca'], clue: 'moeda_cinzel',
    text: 'No fundo da despensa, o pote de mel escuro do "presente" de Cinzel. O mel foi misturado com raiz-de-amêndoa. A tampa tem o selo de uma casa de Norhelm.' }),
  E({ id: 'metodo_aldric', slot: 'metodo', phase: 5, kind: 'documento', title: 'A receita do remédio', source: 'Arquivos', points: { aldric: 18 }, only: ['aldric'], links: ['melpedido', 'contra_aldric'],
    text: 'A receita do remédio do coração de Odran, guardada por Aldric: "cinco gotas". Na última folha, a dose foi corrigida para "cinquenta", na letra do Chanceler, e o mel receitado "para disfarçar o amargor".' }),
  E({ id: 'boticario_corvin', slot: 'boticario', phase: 5, kind: 'depoimento', title: 'O boticário da cidade baixa', source: 'Boticário', points: { corvin: 10 }, only: ['corvin'],
    text: '"Raiz-de-amêndoa? Vendi uma vez só este ano. Um homem magro, óculos, contava as moedas duas vezes antes de pagar."' }),
  E({ id: 'boticario_brandt', slot: 'boticario', phase: 5, kind: 'depoimento', title: 'O boticário da cidade baixa', source: 'Boticário', points: { brandt: 10 }, only: ['brandt'],
    text: '"Vendi a um soldado do Vale, grandão, que disse que era para lobos. No Vale ninguém envenena lobo. Mata com a mão."' }),
  E({ id: 'boticario_isabelle', slot: 'boticario', phase: 5, kind: 'depoimento', title: 'O boticário da cidade baixa', source: 'Boticário', points: { isabelle: 10 }, only: ['isabelle'],
    text: '"Uma dama de véu. Pagou com um anel, não com moedas. O anel tinha um brasão que eu não ousei olhar." Ele ainda tem o anel.' }),
  E({ id: 'boticario_otho', slot: 'boticario', phase: 5, kind: 'depoimento', title: 'O boticário da cidade baixa', source: 'Boticário', points: { otho: 6 }, only: ['otho'],
    text: '"Não vendi raiz a ninguém. Isso veio de fora. No norte eles fervem a raiz com mel de pinheiro. É uma receita velha dos jarls."' }),
  E({ id: 'boticario_aldric', slot: 'boticario', phase: 5, kind: 'depoimento', title: 'O boticário da cidade baixa', source: 'Boticário', points: { aldric: 8 }, only: ['aldric'],
    text: '"Raiz, não. Mas o Chanceler encomendou o remédio do coração do rei em dose dobrada, duas vezes naquele mês. Pagou com o selo real."' }),

  // ======================= FASE 6: os cúmplices e as Cinco Chaves =======================
  E({ id: 'chaves', slot: 'chaves', phase: 6, kind: 'documento', title: '"Quando o menino herdar"', source: 'Arquivo das Sombras', points: { otho: 4 }, clue: 'cinco_cadeiras',
    text: 'Um bilhete sem assinatura, com as dobras gastas de quem o releu muitas vezes: "Quando o menino herdar, as chaves giram. Até lá, ninguém se mexe." O assassino não agiu sozinho.' }),
  E({ id: 'pago_corvin', slot: 'pagamento', phase: 6, kind: 'documento', title: 'Dívidas perdoadas', source: 'Livro do Tesouro', points: { corvin: 12 }, only: ['corvin'], clue: 'emprestimo_valmont', links: ['motivo_corvin'],
    text: 'Um mês depois da morte, todas as dívidas pessoais de Corvin com os bancos Valmont foram quitadas "por um amigo da coroa". O amigo usa a mesma cláusula: "em caso de incapacidade do monarca".' }),
  E({ id: 'pago_brandt', slot: 'pagamento', phase: 6, kind: 'depoimento', title: 'Quem soprou no ouvido de Brandt', source: 'Soldado Drakon', points: { brandt: 10, otho: 6 }, only: ['brandt'], links: ['motivo_brandt'],
    text: 'Um soldado de Brandt conta: na véspera, um enviado de Montclair ofereceu ferro barato "se o Vale ficar neutro quando o rei cair", e contou a Brandt que Odran ia expor o caso na corte. Alguém quis que Brandt tivesse pressa.' }),
  E({ id: 'pago_isabelle', slot: 'pagamento', phase: 6, kind: 'documento', title: 'O silêncio comprado', source: 'Arquivo das Sombras', points: { isabelle: 10, aldric: 8 }, only: ['isabelle'], links: ['atestado', 'motivo_isabelle'],
    text: 'Uma nota do Chanceler: "O atestado diz febre. Ela nos deve isso. Quando precisarmos da voz dela no conselho, ela vai lembrar." Alguém sabe, e usa.' }),
  E({ id: 'pago_otho', slot: 'pagamento', phase: 6, kind: 'documento', title: 'Ouro do norte', source: 'Correio de Otho', points: { otho: 12 }, only: ['otho'], clue: 'emissarios_norte', links: ['motivo_otho'],
    text: 'Recibos de prata de Norhelm pagos a Cinzel "pelo serviço do outono". Datados da semana da morte. Otho não era o único a saber: há um visto de mais três mãos.' }),
  E({ id: 'pago_aldric', slot: 'pagamento', phase: 6, kind: 'documento', title: 'A ata da noite', source: 'Sala do Conselho', points: { aldric: 12 }, only: ['aldric'], clue: 'reuniao_noturna', links: ['motivo_aldric', 'contra_aldric'],
    text: 'Uma ata sem data, na letra de Aldric: "Quatro chaves de acordo. O rei não verá o inverno. O herdeiro será um rei melhor, e mais fácil de guiar."' }),
  E({ id: 'encobriu', slot: 'encobriu', phase: 6, kind: 'depoimento', title: 'O médico se confessou', source: 'Frei Aske', points: { aldric: 6 }, unless: ['aldric'], links: ['atestado'],
    text: 'O frei quebra o sigilo pela metade: o médico da corte confessou ter escrito "febre" porque o Chanceler mandou, "para evitar pânico". Aldric encobriu, mesmo sem ter matado.' }),

  // ======================= SEGREDOS (verdade, mas não são o crime) =======================
  E({ id: 'seg_corvin', slot: 'seg_corvin', phase: 2, kind: 'documento', title: 'As velas que viram prata', source: 'Livro do Tesouro', points: { corvin: 4 }, secretOf: 'corvin', clue: 'contas_velas',
    text: 'Corvin desvia velas do castelo para um sobrinho de Gaspard no porto. Pouco dinheiro, há anos. Não é assassinato. Mas é um homem que aprendeu a esconder coisas.' }),
  E({ id: 'seg_brandt', slot: 'seg_brandt', phase: 3, kind: 'fato', title: 'Brandt e Isabelle', source: 'Criadagem', points: { brandt: 6, isabelle: 6 }, secretOf: 'brandt',
    text: 'Não começou depois da morte do rei. Brandt e Isabelle se encontram há anos, no jardim, nas noites em que Odran viajava. A criadagem inteira sabe. Ninguém nunca contou.' }),
  E({ id: 'seg_isabelle', slot: 'seg_isabelle', phase: 3, kind: 'depoimento', title: 'Isabelle mentiu sobre a noite', source: 'Aposentos', points: { isabelle: 6 }, secretOf: 'isabelle', links: ['alibi_isabelle'],
    text: 'A cama da rainha-mãe não foi desfeita naquela noite. Onde quer que Isabelle tenha estado, não foi dormindo com dor de cabeça.' }),
  E({ id: 'seg_otho', slot: 'seg_otho', phase: 3, kind: 'documento', title: 'Um agente de Norhelm em Cinzel', source: 'Correio de Otho', points: { otho: 8 }, secretOf: 'otho', clue: 'emissarios_norte',
    text: 'Otho abriga um agente de Norhelm nas minas há dois anos, pago em prata. Traição, sem dúvida. Assassinato, não necessariamente.' }),
  E({ id: 'seg_aldric', slot: 'seg_aldric', phase: 3, kind: 'depoimento', title: 'A reunião das cinco cadeiras', source: 'Pimenta', points: { aldric: 6 }, secretOf: 'aldric', clue: 'reuniao_noturna',
    text: 'Aldric esteve numa reunião secreta na Sala do Conselho com outros guardiões das chaves, na semana da morte. Pimenta viu os sapatos por baixo da mesa. Aldric nunca falou disso.' }),

  // ======================= RUMORES =======================
  E({ id: 'rumor_mae', slot: 'rumor_cidade', phase: 2, kind: 'rumor', title: 'Dizem na taverna', source: 'Cidade baixa', points: { isabelle: 5 },
    text: 'Na taverna do Javali Cego dizem que foi a rainha-mãe: "Viúva que chora bonito assim já treinou em casa."' }),
  E({ id: 'rumor_norte', slot: 'rumor_norte', phase: 2, kind: 'rumor', title: 'Dizem no quartel', source: 'Quartel', points: { otho: 5 },
    text: 'No quartel dizem que foi feitiço do norte. Os soldados de Brandt dizem que foi Otho. Os de Otho dizem que foi Brandt.' }),

  // ======================= PROVAS PLANTADAS (quando o culpado se sente caçado) =======================
  ...(['corvin', 'brandt', 'isabelle', 'otho', 'aldric'] as SuspectId[]).map((v) => E({ id: `plantada_${v}`, slot: `plantada_${v}`, phase: 3, kind: 'falsa', looks: v === 'isabelle' ? 'fisica' : 'documento', planted: v, unless: [v], points: { [v]: 16 },
    title: ({ corvin: 'Um recibo com a letra de Corvin', brandt: 'A luva de Brandt', isabelle: 'O lenço da rainha-mãe', otho: 'Uma carta com o selo de Otho', aldric: 'Um bilhete com o selo do Chanceler' } as Record<SuspectId, string>)[v],
    source: 'Achado',
    text: ({ corvin: 'Um recibo de raiz-de-amêndoa com a letra de Corvin, dentro de um livro que ele nunca abre.', brandt: 'Uma luva com o leão dos Drakon, esquecida atrás da cama do rei morto. Nova demais para estar ali há meses.', isabelle: 'Um lenço bordado com o I da rainha-mãe, manchado de algo escuro, dentro da taça guardada.', otho: 'Uma carta com o selo de Otho: "Está feito. O leão velho não acorda."', aldric: 'Um bilhete com o selo do Chanceler: "Cinquenta gotas, como combinamos."' } as Record<SuspectId, string>)[v] })),
  ...(['corvin', 'brandt', 'isabelle', 'otho', 'aldric'] as SuspectId[]).map((v) => E({ id: `desmascara_${v}`, slot: `desmascara_${v}`, phase: 4, kind: 'fato', debunks: `plantada_${v}`, unless: [v], points: { [v]: -16 },
    title: 'Uma prova plantada', source: 'Theodric',
    text: ({ corvin: 'Theodric compara a letra: o recibo "de Corvin" copia a letra dele, mas os números estão inclinados para o lado errado. Alguém quis que Corvin parecesse culpado.', brandt: 'A luva "de Brandt" é de couro novo, costurada semana passada. Brandt não usa luvas desde o Rio Frio. Alguém a plantou.', isabelle: 'O "lenço de Isabelle" é bordado em ponto do sul; Isabelle só borda em ponto de Castelmar. Alguém quis a rainha-mãe no cadafalso.', otho: 'A carta "de Otho" foi selada com cera da chancelaria, não com a cera cinza de Cinzel. Alguém quis Otho como bode expiatório.', aldric: 'O bilhete "do Chanceler" usa o selo antigo, que Aldric devolveu há dois anos. Alguém guardou o selo velho para isto.' } as Record<SuspectId, string>)[v] })),

  // ======================= O SEGREDO DE PIMENTA =======================
  E({ id: 'pimenta_segredo', slot: 'pimenta_segredo', phase: 5, kind: 'fato', title: 'A última instrução de Odran', source: 'Pimenta', points: {}, clue: 'diario_pai', links: ['chaves'],
    text: 'Pimenta confessa: Odran o usava como olhos havia anos. Na noite em que morreu, o rei lhe deu um bilhete: "Se eu cair, olhe para quem mais ganha com o menino no trono." Pimenta guardou o bilhete. E o medo.' }),
];
export const EVIDENCE_MAP: Record<string, EvidenceDef> = Object.fromEntries(EVIDENCE.map((e) => [e.id, e]));

// ======================= MISSÕES DE PIMENTA ("Os Olhos do Bobo") =======================
export interface MissionDef {
  id: string;
  name: string;
  desc: string;
  target?: SuspectId; // quem é vigiado (aumenta a atenção dele)
  heat: Partial<Record<SuspectId, number>>;
  hours: number; // quanto demora
  risk: number; // 0..1: chance de alguém notar Pimenta
  room: RoomId; // onde Pimenta espera o rei com o relatório
  slots: string[]; // o que pode encontrar, em ordem
  quip: string; // o que Pimenta diz ao sair
}

export const MISSIONS: MissionDef[] = [
  { id: 'criadagem', name: 'Conversar com a criadagem', desc: 'Criadas, pajens e cozinheiras sabem horários, corredores e bandejas.', heat: {}, hours: 4, risk: 0.03, room: 'cozinha', slots: ['odiava_doce', 'melpedido', 'seg_brandt', 'contra_isabelle', 'rumor_mae'], quip: '"Vou fofocar em nome da coroa. Finalmente um trabalho à minha altura."' },
  { id: 'quarto_odran', name: 'Vasculhar os aposentos do rei morto', desc: 'Ninguém entra lá desde o enterro. Quase ninguém.', heat: {}, hours: 6, risk: 0.08, room: 'quarto', slots: ['taca', 'metodo', 'plantada_brandt', 'plantada_isabelle'], quip: '"Os mortos são os únicos nobres que não reclamam quando mexo nas coisas deles."' },
  { id: 'portaria', name: 'Copiar o livro da portaria', desc: 'Quem entrou e saiu da ala real naquela noite.', heat: {}, hours: 5, risk: 0.06, room: 'entrada', slots: ['portaria', 'raspada', 'alibi_otho'], quip: '"Guardas de portaria sabem ler? Vamos descobrir. Eu apostaria que não."' },
  { id: 'arquivos', name: 'Vasculhar os arquivos', desc: 'Atestados, tratados, rascunhos e o que alguém esqueceu de queimar.', heat: { aldric: 10 }, hours: 8, risk: 0.1, room: 'arquivos', slots: ['atestado', 'motivo_isabelle', 'motivo_aldric', 'chaves', 'plantada_otho', 'plantada_aldric'], quip: '"Papel velho. Meu cheiro favorito depois de torta."' },
  { id: 'livro_tesouro', name: 'Verificar o livro do Tesouro', desc: 'As contas de Corvin, linha por linha.', target: 'corvin', heat: { corvin: 16 }, hours: 12, risk: 0.15, room: 'tesouro', slots: ['seg_corvin', 'motivo_corvin', 'metodo', 'pagamento', 'plantada_corvin'], quip: '"Números. Os números nunca mentem. Os tesoureiros, sim."' },
  { id: 'seguir_corvin', name: 'Seguir Corvin', desc: 'Aonde o Tesoureiro vai quando ninguém conta as moedas dele.', target: 'corvin', heat: { corvin: 22 }, hours: 20, risk: 0.2, room: 'galeria', slots: ['alibi_corvin', 'contra_corvin', 'seg_corvin', 'boticario'], quip: '"Seguir Corvin é fácil. Ele anda como quem pede desculpas ao chão."' },
  { id: 'observar_brandt', name: 'Observar Brandt', desc: 'O urso do Vale e as noites dele no castelo.', target: 'brandt', heat: { brandt: 22 }, hours: 20, risk: 0.22, room: 'patio', slots: ['alibi_brandt', 'seg_brandt', 'contra_brandt', 'motivo_brandt', 'pagamento'], quip: '"Se eu não voltar, digam que morri de rir. Não de Brandt."' },
  { id: 'investigar_isabelle', name: 'Investigar a rainha-mãe', desc: 'Sua própria mãe. Pimenta hesita antes de aceitar.', target: 'isabelle', heat: { isabelle: 20 }, hours: 18, risk: 0.18, room: 'aposentos', slots: ['alibi_isabelle', 'seg_isabelle', 'contra_isabelle', 'motivo_isabelle', 'metodo', 'pagamento'], quip: '"Investigar a mãe do rei. Minha carreira sempre teve pouca expectativa de vida."' },
  { id: 'investigar_otho', name: 'Investigar Otho', desc: 'As cartas, os mensageiros e os presentes de Montclair.', target: 'otho', heat: { otho: 20 }, hours: 30, risk: 0.2, room: 'arquivos', slots: ['seg_otho', 'motivo_otho', 'alibi_otho', 'pagamento', 'metodo'], quip: '"Otho é tão óbvio que me dá preguiça. Quase como se alguém quisesse que ele fosse."' },
  { id: 'aldric_noite', name: 'Descobrir aonde Aldric vai à noite', desc: 'O Chanceler diz que dorme nos arquivos. Será?', target: 'aldric', heat: { aldric: 22 }, hours: 20, risk: 0.2, room: 'biblioteca', slots: ['alibi_aldric', 'seg_aldric', 'contra_aldric', 'motivo_aldric', 'pagamento', 'metodo'], quip: '"Boas notícias, Majestade: o Chanceler não conspira contra o senhor. Pelo menos não às quartas. Vou ver as outras noites."' },
  { id: 'cozinha', name: 'Investigar a cozinha', desc: 'Quem pediu o quê, e quem levou a jarra.', heat: {}, hours: 5, risk: 0.05, room: 'cozinha', slots: ['melpedido', 'jarra', 'metodo'], quip: '"Vou investigar a cozinha. Se eu voltar gordo, foi pelo reino."' },
  { id: 'interceptar', name: 'Interceptar uma carta', desc: 'O pombal, o correio e os mensageiros que saem de madrugada.', heat: { otho: 8, brandt: 8, corvin: 6 }, hours: 30, risk: 0.25, room: 'estabulos', slots: ['motivo_brandt', 'motivo_otho', 'pagamento', 'chaves'], quip: '"Pombos são os piores guardas do reino. Comem qualquer migalha. Eu também."' },
  { id: 'boticario', name: 'Falar com o boticário da cidade', desc: 'Quem vende raiz-de-amêndoa em Castelmar?', heat: {}, hours: 16, risk: 0.1, room: 'entrada', slots: ['boticario', 'raiz'], quip: '"Vou comprar um remédio para o mau humor do conselho. Aproveito e faço perguntas."' },
];
export const MISSION_MAP: Record<string, MissionDef> = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));

// ======================= TESTEMUNHAS (interrogatórios) =======================
export interface WitnessDef { id: string; name: string; role: string; slots: string[]; pressure?: string }
export const WITNESSES: WitnessDef[] = [
  { id: 'cozinheira', name: 'Dona Ilda', role: 'Cozinheira', slots: ['odiava_doce', 'melpedido'] },
  { id: 'cozinheiro', name: 'Mestre Sálvio', role: 'Cozinheiro-chefe', slots: ['melpedido', 'raiz'] },
  { id: 'criada', name: 'Rosa', role: 'Criada', slots: ['contra_isabelle', 'seg_brandt'] },
  { id: 'clara', name: 'Clara', role: 'Camareira', slots: ['seg_isabelle', 'seg_brandt'] },
  { id: 'pajem', name: 'Theo', role: 'Pajem', slots: ['jarra', 'portaria'] },
  { id: 'sentinela', name: 'Sentinela', role: 'Guarda das masmorras e do tesouro', slots: ['contra_corvin', 'portaria'] },
  { id: 'jardineiro', name: 'Mestre Gil', role: 'Jardineiro', slots: ['contra_brandt', 'seg_brandt'] },
  { id: 'escriba', name: 'Escriba Mateus', role: 'Escriba dos arquivos', slots: ['atestado', 'contra_aldric'] },
  { id: 'irma', name: 'Irmã Hedda', role: 'Curandeira', slots: ['amendoas', 'tres_horas', 'raiz'] },
  { id: 'frei_aske', name: 'Frei Aske', role: 'Capelão', slots: ['encobriu'] },
  { id: 'aurelian', name: 'Capitão Aurelian', role: 'Comandante da guarda', slots: ['portaria', 'alibi_otho'] },
  { id: 'theodric', name: 'Theodric', role: 'Grão-Meistre', slots: ['desmascara_corvin', 'desmascara_brandt', 'desmascara_isabelle', 'desmascara_otho', 'desmascara_aldric', 'raiz'] },
  // os próprios suspeitos dão seus álibis
  { id: 'corvin', name: 'Mestre Corvin', role: 'Suspeito', slots: ['alibi_corvin'] },
  { id: 'brandt', name: 'Lorde Brandt', role: 'Suspeito', slots: ['alibi_brandt'] },
  { id: 'isabelle', name: 'Isabelle', role: 'Suspeita', slots: ['alibi_isabelle'] },
  { id: 'aldric', name: 'Chanceler Aldric', role: 'Suspeito', slots: ['alibi_aldric'] },
];

// O que o culpado diz quando é desmascarado (e por que o Pacto o queria)
export const CONFESSION: Record<SuspectId, { why: string; link: string; pact: 'membro' | 'financiado' | 'manipulado' | 'encoberto' }> = {
  corvin: { pact: 'financiado', why: '"Ele ia me enforcar por umas velas. Umas velas! Trinta anos contando as moedas dele, e ele ia me mandar à forca na frente do conselho."', link: 'Os Valmont pagaram as dívidas dele depois. A cláusula de "incapacidade do monarca" é do Pacto.' },
  brandt: { pact: 'manipulado', why: '"Ele ia tirar tudo de mim. O Vale, a honra, a sua mãe. Eu estava bêbado de raiva e alguém me deu o empurrão que faltava."', link: 'Um enviado de Montclair contou a Brandt, na véspera, o que Odran ia fazer. O Pacto quis que ele tivesse pressa.' },
  isabelle: { pact: 'encoberto', why: '"Ele ia mandar Lucas para o norte, como um cavalo num tratado. Eu protegi meus filhos. Protegeria de novo."', link: 'O Chanceler descobriu e escreveu "febre" no atestado. Desde então, o Pacto tem a voz dela no conselho quando quiser.' },
  otho: { pact: 'membro', why: '"Eu? Eu só mandei um presente. Os presentes do norte é que são perigosos." Ele sorri até o fim.', link: 'Otho não agiu por conta própria: o ouro de Norhelm tinha outras três mãos. Ele é um dos guardiões do Pacto.' },
  aldric: { pact: 'membro', why: '"Não matei seu pai porque o odiava. Matei porque acreditava que você seria melhor. Ainda acredito. É por isso que dói."', link: 'Aldric presidiu a reunião das cinco cadeiras. Ele é o coração do Pacto: a ideia, não o dinheiro.' },
};
