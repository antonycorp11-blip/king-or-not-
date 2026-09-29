import type { Choice, GameEvent, GameState, Resources } from '../../types';

const IGNORE_COST: Record<string, Partial<Resources>> = {
  rotina_forno: { povo: -1 }, rotina_mercado: { ouro: -10 }, rotina_guardas: { moral: -2 },
  rotina_arquivo: { influencia: -1 }, rotina_contas: { ouro: -10 }, rotina_convites: { prestigio: -1 },
  rotina_boato: { prestigio: -1 }, rotina_cais: { ouro: -10 }, rotina_fronteira: { moral: -2 },
  rotina_carvalhos: { povo: -1 }, rotina_minas: { ouro: -10 }, rotina_sementes: { povo: -2 },
  rotina_corvos: { influencia: -1 }, rotina_ervas: { povo: -2 }, rotina_cozinha: { moral: -1 },
  rotina_forja: { moral: -1 }, rotina_roupas: { povo: -1 }, rotina_doces: { prestigio: -1 },
  rotina_juros: { influencia: -1 },
};

// Pedidos menores, mas insistentes. A corte nunca fica vazia enquanto o rei
// tem recursos limitados; cada tipo varia o texto conforme o dia.
function petition(
  id: string, speaker: string, topic: string, lines: [string, string],
  choices: Choice[], ignored: string, minDay = 2,
): GameEvent {
  return {
    id, speaker, topic, kind: 'audiencia', minDay, weight: 1, repeat: 1,
    nodes: { start: { text: (s: GameState) => lines[s.day % 2], choices } },
    ignored: { text: ignored, rel: { [speaker]: -3 }, res: IGNORE_COST[id] },
  };
}

export const ROUTINE_EVENTS: GameEvent[] = [
  petition('rotina_forno', 'marta', 'O forno da cidade baixa',
    ['Marta traz uma pá de padeiro quebrada. "O forno comunitário rachou. Hoje ninguém assou pão sem pagar pela lenha do nobre da esquina. Ele chama isso de eficiência."', '"A padaria da cidade baixa pede lenha. Os senhores dizem que o forno é assunto pequeno. Pequeno é o pão deles, Majestade."'],
    [
      { label: 'Pagar a lenha comum', sub: '−25 ouro, pão acessível', color: 'verde', icon: 'trigo', effects: { res: { ouro: -25, povo: 2 }, rel: { marta: 3 } }, reply: 'Marta leva a ordem antes de Aldric conseguir sugerir uma comissão. Amanhã o forno aquece outra vez.' },
      { label: 'Cobrar do dono do terreno', sub: 'Pequeno conflito nobre', color: 'azul', icon: 'pergaminho', effects: { res: { povo: 1, prestigio: -1 }, rel: { marta: 2 } }, reply: 'O dono reclama em três cartas. A cidade baixa responde com pão fresco, o que incomoda mais.' },
      { label: 'Pedir que dividam o custo', sub: 'Compromisso', color: 'dourado', icon: 'aperto', effects: { res: { ouro: -10, povo: 1 } }, reply: 'Cada vizinho leva um graveto. Não é elegante; funciona.' },
    ], 'O forno esfria. Marta diz que a ausência do rei também pesa no pão.'),
  petition('rotina_mercado', 'tobias', 'Licenças da feira',
    ['Tobias abre uma pasta cheia de selos. "Três mercadores receberam a mesma barraca na feira. Dois já pagaram. O terceiro trouxe o cunhado que é guarda."', '"A feira cresceu mais que a rua. Se não distribuirmos as bancas, os mercadores vão decidir com facas. A Guilda prefere tinta."'],
    [
      { label: 'Sortear as barracas', sub: 'Justo, lento e público', color: 'azul', icon: 'pergaminho', effects: { res: { povo: 1 }, rel: { tobias: 2 } }, reply: 'Tobias chama de solução infantil. Depois pede cópia do regulamento para todas as feiras.' },
      { label: 'Vender cada espaço', sub: '+25 ouro, povo irritado', color: 'dourado', icon: 'moedas', effects: { res: { ouro: 25, povo: -2 }, rel: { tobias: 3 } }, reply: 'Os ricos ocupam a rua. Os pobres vendem nos becos, onde a coroa não vê impostos nem brigas.' },
      { label: 'Dar lugar aos produtores', sub: 'Guilda perde vantagem', color: 'verde', icon: 'trigo', effects: { res: { povo: 2, ouro: -10 }, rel: { tobias: -4 } }, reply: 'Marta sorri. Tobias conta quanto deixou de cobrar e não sorri.' },
    ], 'A disputa da feira termina em empurrões. Tobias diz que o rei ignorou um problema que cabia numa mesa.'),
  petition('rotina_guardas', 'aurelian', 'Turnos da guarda',
    ['Aurelian mostra uma escala com nomes riscados. "Os guardas do portão dobraram turno porque os nobres insistem em sair para caçar depois do toque de recolher."', '"Faltam seis homens na ronda noturna. Há doze guardando uma festa privada dos Montclair. Tecnicamente, também estão de uniforme real."'],
    [
      { label: 'Retirar guardas das festas', sub: 'Segurança pública primeiro', color: 'verde', icon: 'escudo', effects: { res: { povo: 2, prestigio: -1 }, rel: { aurelian: 4 } }, reply: 'A ronda volta às ruas. Um lorde pergunta quem o protegerá da música ruim da festa. Aurelian sugere silêncio.' },
      { label: 'Pagar horas extras', sub: '−35 ouro, moral +2', color: 'dourado', icon: 'moedas', effects: { res: { ouro: -35, moral: 2 }, rel: { aurelian: 2 } }, reply: 'Os guardas aceitam. Aurelian lembra que moedas não dormem por eles, mas ajudam.' },
      { label: 'Manter a escala', sub: 'Evitar discussão hoje', color: 'azul', icon: 'ampulheta', effects: { res: { moral: -1 }, rel: { aurelian: -3 } }, reply: '"Hoje", repete Aurelian. A palavra soa como prazo e ameaça.' },
    ], 'A guarda cobre mais um turno com homens cansados. Aurelian registra a audiência não atendida.'),
  petition('rotina_arquivo', 'theodric', 'Arquivos molhados',
    ['Theodric segura páginas onduladas. "Goteja no arquivo das leis. Se a chuva continuar, nossos netos vão governar pelo cheiro de mofo."', '"Alguém abriu a janela do arquivo para secar uma tinta e esqueceu de fechá-la. A chuva leu documentos sigilosos antes de mim."'],
    [
      { label: 'Consertar o telhado', sub: '−30 ouro, salvar o arquivo', color: 'azul', icon: 'livro', effects: { res: { ouro: -30, influencia: 1 }, rel: { theodric: 4 } }, reply: 'Theodric protege os códices como se fossem filhos. Aldric pergunta se os filhos também têm índice.' },
      { label: 'Transferir tudo para a torre', sub: 'Trabalho imediato', color: 'dourado', icon: 'pergaminho', effects: { res: { prestigio: -1 }, rel: { theodric: 2 } }, reply: 'A torre vira depósito. Pimenta diz que é a primeira vez que uma torre prende só criminosos de papel.' },
      { label: 'Pedir cópias aos escribas', sub: '−15 ouro, preservar a lei', color: 'verde', icon: 'pergaminho', effects: { res: { ouro: -15 }, rel: { theodric: 3, aldric: 2 } }, reply: 'Os escribas trabalham até tarde. Um deles corrige discretamente um erro de ortografia num decreto do seu avô.' },
    ], 'Os livros secam tortos. Theodric culpa a chuva, depois a agenda do rei.'),
  petition('rotina_contas', 'corvin', 'A conta das velas',
    ['Corvin empilha notas de cera. "Compramos velas suficientes para iluminar três castelos. Temos um. Ou alguém está lendo muito ou vendendo luz."', '"A conta dos estábulos inclui cinquenta velas perfumadas. Cavalos não pediram nenhuma, verifiquei pessoalmente."'],
    [
      { label: 'Auditar o fornecedor', sub: 'Recuperar 25 ouro', color: 'azul', icon: 'olho', effects: { res: { ouro: 25, influencia: -1 }, rel: { corvin: 4 } }, reply: 'O fornecedor chama de erro. Corvin chama de roubo com caligrafia boa.' },
      { label: 'Reduzir o consumo', sub: '+12 ouro, corte protesta', color: 'dourado', icon: 'moedas', effects: { res: { ouro: 12, prestigio: -1 }, rel: { corvin: 3 } }, reply: 'A corte janta mais cedo. Pimenta diz que na escuridão todos os lordes parecem honestos.' },
      { label: 'Comprar velas locais', sub: '−12 ouro, povo ganha', color: 'verde', icon: 'povo', effects: { res: { ouro: -12, povo: 2 }, rel: { corvin: -1 } }, reply: 'As oficinas da cidade baixa recebem o pedido. Corvin continua querendo saber quem acendeu as outras cinquenta.' },
    ], 'Corvin anota as velas no livro de despesas e a resposta ausente no livro de irritações.'),
  petition('rotina_convites', 'isabelle', 'Convites da rainha-mãe',
    ['Isabelle chega com três cartões. "Os Valmont convidaram para jantar, os Seren para uma bênção e os Drakon para ver um cavalo. Todos no mesmo horário. Suponho que queira continuar vivo."', '"Sua agenda tem duas festas e um funeral de um homem que ainda não morreu. Lorde Otho diz que era só uma reserva de data."'],
    [
      { label: 'Receber todos no palácio', sub: '−25 ouro, neutralidade', color: 'azul', icon: 'coroa', effects: { res: { ouro: -25, prestigio: 1 }, rel: { isabelle: 3 } }, reply: 'Ninguém gosta de dividir a mesa. Todos aparecem para garantir que os outros não ganhem sobremesa melhor.' },
      { label: 'Deixar Isabelle escolher', sub: 'Ela ganhará influência', color: 'roxo', icon: 'mascara', effects: { rel: { isabelle: 5 }, res: { influencia: 1 } }, reply: '"Já escolhi", ela diz. "Queria apenas saber se você notaria."' },
      { label: 'Cancelar os três', sub: 'Tempo para governar', color: 'vermelho', icon: 'selo', effects: { res: { prestigio: -1 }, rel: { isabelle: -2 } }, reply: 'A corte chama de frieza. Isabelle chama de terça-feira.' },
    ], 'Isabelle responde aos convites por você. Cada casa acredita que foi preterida.'),
  petition('rotina_boato', 'pimenta', 'O boato da manhã',
    ['Pimenta traz um papel dobrado. "Hoje dizem que o rei fala dormindo e decreta impostos entre roncos. Corvin quer saber se pode cobrar."', '"A corte diz que o trono range quando um mentiroso se senta. Sugiro não testar na frente de Otho; o móvel é antigo."'],
    [
      { label: 'Rir do boato em público', sub: 'A corte relaxa', color: 'verde', icon: 'mascara', effects: { res: { povo: 1 }, rel: { pimenta: 4 } }, reply: 'Pimenta conta a versão completa. Era ainda pior. O povo gosta de um rei que consegue rir.' },
      { label: 'Investigar a origem', sub: 'Influência +1', color: 'roxo', icon: 'olho', effects: { res: { influencia: 1 }, rel: { pimenta: 1 } }, reply: 'Era Lady Maren, como de costume. Ela admite e oferece um boato melhor em troca do seu silêncio.' },
      { label: 'Proibir fofocas', sub: 'Prestígio +1, humor −1', color: 'vermelho', icon: 'selo', effects: { res: { prestigio: 1, povo: -1 }, rel: { pimenta: -4 } }, reply: 'A proibição vira a fofoca do almoço. Pimenta pede que o decreto seja lido em voz alta para garantir a pronúncia.' },
    ], 'Pimenta conta o boato sem correção real. A versão da tarde envolve um dragão.'),
  petition('rotina_cais', 'gaspard', 'Fila de navios',
    ['Gaspard aponta o porto num mapa. "Dois navios Valmont esperam no cais; três de Véridian chegaram depois e receberam prioridade. Isso cheira a suborno. Eu saberia."', '"O cais foi prometido a mim e a uma tripulação do sul. Um de nós terá de esperar. Gostaria que fosse o outro."'],
    [
      { label: 'Seguir a ordem de chegada', sub: 'Regra igual para todos', color: 'azul', icon: 'pergaminho', effects: { res: { prestigio: 1 }, rel: { gaspard: 1 } }, reply: 'Gaspard reclama da burocracia, mas gosta da própria posição na fila.' },
      { label: 'Priorizar Valmont', sub: 'Casa +3, comércio sul −', color: 'dourado', icon: 'navio', effects: { loyalty: { valmont: 3 }, rel: { gaspard: 3, isolde: -2 } }, reply: 'Os navios locais descarregam primeiro. Os capitães do sul anotam o atraso.' },
      { label: 'Leiloar a vaga', sub: '+20 ouro, todos ofendidos', color: 'roxo', icon: 'moedas', effects: { res: { ouro: 20, prestigio: -1 }, rel: { gaspard: -3 } }, reply: '"Um rei que cobra pela fila!" Gaspard parece escandalizado porque não pensou nisso antes.' },
    ], 'Os capitães resolvem a fila gritando. Gaspard culpa a falta de ordem real.'),
  petition('rotina_fronteira', 'brandt', 'Ferraduras do Vale',
    ['Brandt ergue uma ferradura partida. "Os cavalos da fronteira têm mais serviço que os ferreiros. Compre ferro ou vamos patrulhar a pé, que é uma humilhação para o cavalo."', '"A patrulha do Passo Cinzento precisa de ferraduras. Otho quer vender ferro caro. Eu quero que ele engula o próprio contrato."'],
    [
      { label: 'Comprar ferro agora', sub: '−35 ouro, moral +2', color: 'azul', icon: 'ferro', effects: { res: { ouro: -35, moral: 2 }, loyalty: { drakon: 2 }, rel: { brandt: 2 } }, reply: 'Brandt bate a ferradura na mesa em aprovação. Aldric pede que não repita o gesto.' },
      { label: 'Mandar Bruna fabricar', sub: '−20 ouro, gente local', color: 'verde', icon: 'martelo', effects: { res: { ouro: -20, povo: 1 }, rel: { brandt: 1, bruna: 3 } }, reply: 'Bruna promete ferraduras melhores que as de Otho. Brandt pede doze; ela entrega treze para irritá-lo.' },
      { label: 'Reaproveitar ferraduras', sub: 'Poupar ouro, moral −1', color: 'dourado', icon: 'escudo', effects: { res: { moral: -1 }, rel: { brandt: -3 } }, reply: '"Cavalos velhos usam sapatos velhos", Brandt rosna. "Reis também?"' },
    ], 'A patrulha volta cedo para poupar cavalos. Brandt não poupa palavras sobre a demora.'),
  petition('rotina_carvalhos', 'aveline', 'Raízes na estrada',
    ['Aveline traz um galho enorme. "A estrada nova corta as raízes de três carvalhos antigos. Aldric chama de atalho. Eu chamo de uma ofensa que demora séculos a crescer."', '"O marceneiro quer derrubar um carvalho sagrado para caber uma carroça. A carroça poderia dar uma volta, mas o marceneiro cobra por curva."'],
    [
      { label: 'Desviar a estrada', sub: '−20 ouro, Seren agradece', color: 'verde', icon: 'arvore', effects: { res: { ouro: -20 }, loyalty: { seren: 3 }, rel: { aveline: 4 } }, reply: 'A carroça contorna as árvores. Aveline chama a curva de pequena vitória sobre homens apressados.' },
      { label: 'Plantar novos carvalhos', sub: 'Acordo imperfeito', color: 'azul', icon: 'trigo', effects: { loyalty: { seren: 1 }, rel: { aveline: 1 } }, reply: '"A árvore derrubada tinha trezentos anos", diz Aveline. "Volte em trezentos para ver se aceitei."' },
      { label: 'Manter o atalho', sub: 'Comércio +, Seren −', color: 'dourado', icon: 'moedas', effects: { res: { ouro: 12 }, loyalty: { seren: -3 }, rel: { aveline: -3 } }, reply: 'A estrada fica curta. Os sermões de Aveline ficam compridos.' },
    ], 'Os trabalhadores seguem com o machado. Aveline guarda um pedaço da madeira como prova.'),
  petition('rotina_minas', 'otho', 'Ferramentas da mina',
    ['Otho mostra uma picareta rachada. "Os mineiros querem ferramentas novas. Parece razoável até perguntarem quem paga. Eu sugiro a coroa."', '"Cinzel produziu menos ferro. O capataz culpa as ferramentas, os mineiros culpam o capataz, e eu culpo a chuva. Alguém precisa escolher uma conta."'],
    [
      { label: 'Dividir o custo com Otho', sub: '−25 ouro, produção segura', color: 'azul', icon: 'aperto', effects: { res: { ouro: -25 }, loyalty: { montclair: 2 }, rel: { otho: 2 } }, reply: 'Otho aceita com um sorriso pequeno. Corvin exige recibos maiores que a picareta.' },
      { label: 'Exigir que Otho pague', sub: 'Prestígio +1, Montclair −', color: 'vermelho', icon: 'coroa', effects: { res: { prestigio: 1 }, loyalty: { montclair: -3 }, rel: { otho: -3 } }, reply: '"Claro, Majestade." Otho chama de investimento forçado quando volta para casa.' },
      { label: 'Ouvir os mineiros primeiro', sub: 'Povo +2', color: 'verde', icon: 'povo', effects: { res: { povo: 2 }, rel: { otho: -2 } }, reply: 'Os mineiros dizem que a picareta não é o maior problema. É a vigia na entrada. Otho muda de assunto.' },
    ], 'Otho informa que as ferramentas continuarão rachadas. Os mineiros também.'),
  petition('rotina_sementes', 'campones', 'Sementes emprestadas',
    ['Oswin segura um saco pequeno. "O senhor de Carvalhal empresta sementes e cobra o dobro depois da colheita. Se a colheita falhar, cobra a terra."', '"Tenho oito famílias e só quatro sacos de semente. O credor diz que é matemática. Eu digo que matemática não brota."'],
    [
      { label: 'Abrir celeiros reais', sub: '−30 ouro, povo +2', color: 'verde', icon: 'trigo', effects: { res: { ouro: -30, povo: 2 }, rel: { campones: 4 } }, reply: 'Oswin distribui as sementes por área de campo, não por sobrenome. O credor fica escandalizado.' },
      { label: 'Limitar os juros', sub: 'Seren −2, camponeses felizes', color: 'azul', icon: 'pergaminho', effects: { loyalty: { seren: -2 }, res: { povo: 2 }, rel: { campones: 3 } }, reply: 'O credor ameaça ir à corte. Oswin diz que já está na corte e saiu com a resposta.' },
      { label: 'Deixar o acordo privado', sub: 'Evitar atrito nobre', color: 'dourado', icon: 'escudo', effects: { loyalty: { seren: 2 }, rel: { campones: -3 } }, reply: '"Privado até eu perder a terra", Oswin diz. Não há raiva na voz; há cansaço.' },
    ], 'As famílias plantam menos. Oswin contará as ausências na colheita.'),
  petition('rotina_corvos', 'mensageiro', 'Correio atrasado',
    ['Pip entra com três cartas molhadas. "O telhado da estação de correio vazou. Uma carta de amor virou receita de sopa, e uma receita virou declaração de guerra."', '"A ponte atrasou os mensageiros. Otho jura que seu convite a Brandt chegou; Brandt jura que recebeu só uma multa."'],
    [
      { label: 'Reparar a estação', sub: '−20 ouro, cartas seguras', color: 'azul', icon: 'pergaminho', effects: { res: { ouro: -20, influencia: 1 }, rel: { mensageiro: 4 } }, reply: 'Pip cobre o teto antes de as primeiras telhas chegarem. Diz que cartas secas correm mais.' },
      { label: 'Usar cavaleiros da guarda', sub: 'Moral −1, urgências atendidas', color: 'vermelho', icon: 'espadas', effects: { res: { moral: -1, prestigio: 1 }, rel: { mensageiro: 2 } }, reply: 'Aurelian entrega as cartas. Lê os endereços em voz alta como ordens de batalha.' },
      { label: 'Pedir cópias aos remetentes', sub: 'Poupar tesouro', color: 'dourado', icon: 'livro', effects: { rel: { mensageiro: -2 } }, reply: 'Pip suspira. "Majestade, metade deles negará o que escreveu da primeira vez."' },
    ], 'O correio continua atrasado. Duas pessoas acreditam que foram insultadas; talvez tenham sido.'),
  petition('rotina_ervas', 'irma', 'Remédios da enfermaria',
    ['Irmã Hedda abre uma caixa quase vazia. "Faltam ataduras e ervas. Os nobres mandam frascos com perfume. Perfume não fecha feridas."', '"A enfermaria recebeu mais pacientes depois da chuva. Tenho pano para metade e boas palavras para todos. Preferia o contrário."'],
    [
      { label: 'Comprar suprimentos', sub: '−35 ouro, povo +2', color: 'verde', icon: 'coracao', effects: { res: { ouro: -35, povo: 2 }, rel: { irma: 4 } }, reply: 'Hedda recebe as ataduras e as distribui antes de agradecer. Depois agradece com um abraço rápido.' },
      { label: 'Requisitar linho do palácio', sub: 'Corte irritada, povo +1', color: 'azul', icon: 'escudo', effects: { res: { povo: 1, prestigio: -1 }, rel: { irma: 3 } }, reply: 'As mesas do jantar ficam sem toalhas. Hedda ganha pano bastante para uma semana.' },
      { label: 'Priorizar soldados', sub: 'Moral +2, povo −2', color: 'vermelho', icon: 'espadas', effects: { res: { moral: 2, povo: -2 }, rel: { irma: -3 } }, reply: '"Feridas não sabem usar uniforme", Hedda responde. Ela obedece, sem concordar.' },
    ], 'Hedda costura feridas com o que resta. A caixa vazia fica sobre a mesa como recado.'),
  petition('rotina_cozinha', 'salvio', 'A mesa do castelo',
    ['Sálvio ergue uma panela como escudo. "Os lordes querem faisão. Os guardas querem carne. O tesouro quer mingau. Eu quero uma cozinha que não me odeie."', '"O banquete pediu três molhos caros para a mesma ave. A ave não opina porque já está morta. Gostaria que o rei opinasse."'],
    [
      { label: 'Servir a mesma refeição', sub: 'Povo e guarda juntos', color: 'verde', icon: 'trigo', effects: { res: { povo: 1, moral: 1 }, rel: { salvio: 4 } }, reply: 'Sálvio faz um ensopado magnífico. Os lordes chamam de rústico enquanto repetem.' },
      { label: 'Manter o banquete', sub: '−30 ouro, prestígio +1', color: 'dourado', icon: 'moedas', effects: { res: { ouro: -30, prestigio: 1 }, rel: { salvio: 2 } }, reply: 'Três molhos chegam à mesa. Pimenta mistura os três. Sálvio finge não ver e pede a receita.' },
      { label: 'Cortar tudo pela metade', sub: 'Poupar 15 ouro', color: 'azul', icon: 'escudo', effects: { res: { ouro: 15, moral: -1 }, rel: { salvio: -2 } }, reply: 'Os lordes reclamam da porção. Os guardas reclamam do horário. Sálvio reclama de todos com justiça.' },
    ], 'Sálvio improvisa o jantar. A cozinha sobrevive; a reputação da coroa perde uma pitada de sal.'),
  petition('rotina_forja', 'bruna', 'A forja da capital',
    ['Bruna pousa um martelo gasto. "Se eu consertar as dobradiças do portão, atraso as lanças. Se fizer as lanças, o portão range a noite inteira. Escolha seu barulho."', '"Meus aprendizes querem carvão. Corvin quer desconto. Corvin nunca segurou ferro quente e fala em desperdício de calor."'],
    [
      { label: 'Priorizar o portão', sub: 'Cidade segura', color: 'azul', icon: 'escudo', effects: { res: { povo: 1 }, rel: { bruna: 3, aurelian: 2 } }, reply: 'O portão fecha sem ranger. Bruna diz que agora os lordes terão de inventar outro motivo para dormir mal.' },
      { label: 'Priorizar as lanças', sub: 'Moral +2', color: 'vermelho', icon: 'espadas', effects: { res: { moral: 2 }, rel: { bruna: 3 } }, reply: 'Bruna entrega lanças alinhadas. Aurelian pergunta como fez tão rápido. "Trabalhando", ela responde.' },
      { label: 'Comprar mais carvão', sub: '−25 ouro, fazer os dois', color: 'verde', icon: 'moedas', effects: { res: { ouro: -25, povo: 1, moral: 1 }, rel: { bruna: 4 } }, reply: '"Finalmente, um rei que entende que metal precisa de fogo." Bruna consegue fazer as duas encomendas.' },
    ], 'Bruna usa o último carvão e entrega só metade da encomenda.'),
  petition('rotina_roupas', 'clara', 'O enxoval dos criados',
    ['Clara mostra uma túnica remendada sete vezes. "Os criados aparecem limpos para que a corte não veja o trabalho. Agora nem o remendo esconde."', '"As lavanderias ficaram sem sabão. Os lordes mandaram os criados lavar melhor. Clara pergunta se ordens também removem manchas."'],
    [
      { label: 'Comprar tecido e sabão', sub: '−25 ouro, trabalho digno', color: 'verde', icon: 'povo', effects: { res: { ouro: -25, povo: 2 }, rel: { clara: 5 } }, reply: '"Obrigada. Agora talvez a corte nos veja por outros motivos." Clara leva o tecido sem fazer reverência desnecessária.' },
      { label: 'Cobrar dos lordes', sub: 'Prestígio −1, criados ganham', color: 'azul', icon: 'moedas', effects: { res: { povo: 1, prestigio: -1 }, rel: { clara: 3 } }, reply: 'Os lordes protestam contra a conta. Os criados protestam contra serem invisíveis. Pela primeira vez, os dois são ouvidos.' },
      { label: 'Aproveitar os panos antigos', sub: 'Poupar, Clara desaprova', color: 'dourado', icon: 'escudo', effects: { rel: { clara: -3 } }, reply: '"Já aproveitamos", Clara responde. "Sete vezes."' },
    ], 'Clara remenda mais uma túnica. A oitava costura não segura.'),
  petition('rotina_doces', 'bianca', 'Doces do banquete',
    ['Bianca traz uma torta pequena. "A corte pediu sobremesa para sessenta pessoas e aprovou farinha para vinte. Posso multiplicar a torta por decreto?"', '"A mãe do rei quer doces com mel. Corvin quer sem mel. O mel custa ouro, a opinião de Corvin é de graça e aparece em toda cozinha."'],
    [
      { label: 'Comprar mel da vila', sub: '−20 ouro, renda local', color: 'verde', icon: 'trigo', effects: { res: { ouro: -20, povo: 1 }, rel: { bianca: 4 } }, reply: 'Bianca faz tortas pequenas para todos. Corvin prova três antes de perguntar pelo preço.' },
      { label: 'Reduzir a lista de convidados', sub: 'Poupar ouro, prestígio −1', color: 'azul', icon: 'pergaminho', effects: { res: { ouro: 10, prestigio: -1 }, rel: { bianca: 2 } }, reply: 'Metade da corte não é convidada. A outra metade come em silêncio para não perder a vaga seguinte.' },
      { label: 'Servir apenas fruta', sub: 'Bianca ofendida', color: 'dourado', icon: 'povo', effects: { rel: { bianca: -3 }, res: { ouro: 15 } }, reply: '"Fruta. Para um banquete." Bianca fala como se você tivesse anunciado o fim do verão.' },
    ], 'Bianca divide a massa em pedaços impossíveis. Os últimos convidados recebem só a promessa de sobremesa.'),
  petition('rotina_juros', 'aldric', 'Petição de juristas',
    ['Aldric mostra uma fila de pergaminhos. "Os juristas discordam sobre uma vírgula no novo decreto. A vírgula muda quem paga. Estranhamente, todos notaram."', '"Um nobre chamou sua multa de taxa voluntária. A lei não conhece essa categoria. O nobre gostaria que conhecesse."'],
    [
      { label: 'Ler a vírgula com Aldric', sub: 'Influência +1, cuidado legal', color: 'azul', icon: 'livro', effects: { res: { influencia: 1 }, rel: { aldric: 4 } }, reply: 'A frase fica mais curta e a lei, mais clara. Aldric guarda a vírgula removida como se fosse um inimigo derrotado.' },
      { label: 'Decidir pelo povo', sub: 'Povo +2, lordes murmuram', color: 'verde', icon: 'povo', effects: { res: { povo: 2, prestigio: -1 }, rel: { aldric: 1 } }, reply: 'O nobre diz que foi mal compreendido. Aldric registra: "Foi compreendido com precisão."' },
      { label: 'Decidir pela coroa', sub: '+15 ouro, povo −1', color: 'dourado', icon: 'coroa', effects: { res: { ouro: 15, povo: -1 }, rel: { aldric: -1 } }, reply: '"Legal, sim", Aldric concorda. "Bom, conversaremos depois."' },
    ], 'Aldric deixa a petição sem assinatura. O jurista muda a vírgula sozinho.'),
];
