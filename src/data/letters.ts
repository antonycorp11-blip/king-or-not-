import type { LetterDef } from '../types';

// Correio real. Cartas chegam todo dia; algumas pedem resposta, outras só fofocam.
export const LETTERS: LetterDef[] = [
  // ---------- recusas de convocação ----------
  { id: 'recusa_gaspard', from: 'gaspard', subject: 'Sobre o seu chamado', text: 'Majestade, lamento profundamente não poder comparecer. Uma frota inteira de sardinhas depende da minha presença no porto. Tenho certeza de que Vossa Majestade compreende as prioridades de um homem de negócios. Com o respeito de sempre, Gaspard.', choices: [
    { label: 'Responder com ironia', sub: 'Nada de sardinhas', color: 'vermelho', icon: 'coroa', effects: { res: { prestigio: 2 }, loyalty: { valmont: -3 } }, reply: 'Você escreve: "Que as sardinhas lhe sejam leais, já que o senhor não é." Gaspard vai emoldurar a carta, de raiva.' },
    { label: 'Deixar para lá', sub: 'Paciência', color: 'azul', icon: 'aperto', effects: { res: { influencia: 1 } }, reply: 'Nenhuma resposta. Às vezes o silêncio do rei incomoda mais que uma bronca.' },
  ] },
  { id: 'recusa_brandt', from: 'brandt', subject: 'Não irei', text: 'Rei. Meus homens precisam de mim na fronteira mais do que o senhor precisa de mim no salão. Se quiser falar comigo, venha ao Vale. Traga um casaco. Brandt.', choices: [
    { label: 'Ir ao Vale pessoalmente (em breve)', sub: 'Humildade estratégica', color: 'verde', icon: 'aperto', effects: { loyalty: { drakon: 6 }, res: { prestigio: -2 } }, reply: 'Brandt recebe a resposta e ri alto no salão dele. "O garoto tem coragem." A lealdade dos Drakon sobe um pouco.' },
    { label: 'Exigir obediência', sub: 'Autoridade', color: 'vermelho', icon: 'coroa', effects: { loyalty: { drakon: -4 }, res: { prestigio: 3 } }, reply: 'Brandt lê a carta em voz alta para os soldados dele. Ninguém ri.' },
  ] },
  { id: 'recusa_aveline', from: 'aveline', subject: 'Os bosques chamam antes', text: 'Majestade, os carvalhos pedem minha presença na lua cheia. Os reis vão e vêm; a lua cheia vem sempre. Voltarei quando a lua minguar. Que os bosques o guardem.', choices: [
    { label: 'Mandar votos à lua', sub: 'Respeitar a fé', color: 'verde', icon: 'arvore', effects: { loyalty: { seren: 4 } }, reply: 'Aveline lê a carta sob a lua e, dizem, sorri.' },
    { label: 'A lua não governa o reino', sub: 'Firmeza', color: 'vermelho', icon: 'coroa', effects: { loyalty: { seren: -4 }, res: { prestigio: 2 } }, reply: 'Aveline guarda a carta junto com outras que nunca perdoou.' },
  ] },
  { id: 'recusa_otho', from: 'otho', subject: 'Um contratempo', text: 'Majestade, um desmoronamento terrível nas minas me prende aqui. Nenhum ferido, graças aos céus. Nem mesmo um arranhão. Na verdade, nem sei direito onde foi o desmoronamento. Mas é grave. Seu servo, Otho.', choices: [
    { label: 'Mandar Aurelian verificar o desmoronamento', sub: 'Pagar para ver', color: 'roxo', icon: 'olho', effects: { loyalty: { montclair: -4 }, res: { influencia: 3 }, flags: { segredoOtho: true } }, reply: 'Aurelian não encontra desmoronamento nenhum. Encontra, porém, carroças saindo de madrugada em direção ao norte.' },
    { label: 'Desejar melhoras às minas', sub: 'Ironia fina', color: 'dourado', icon: 'balao', effects: { res: { prestigio: 1 } }, reply: 'Você deseja pronta recuperação às pedras. Otho entende o recado.' },
  ] },
  { id: 'recusa_elenora', from: 'elenora', subject: 'Perdão, Majestade', text: 'Meu pai não me deixou sair hoje. Diz que uma dama não corre quando o rei chama, "senão ele acha que ela é barata". Eu queria ter ido. — E.', choices: [
    { label: 'Mandar flores para ela', sub: 'Romance', color: 'verde', icon: 'coracao', effects: { rel: { elenora: 8, gaspard: -2 } }, reply: 'As flores chegam à Costa Serena. O pai reclama do preço; ela as coloca na janela.' },
    { label: 'Mandar um recado ao pai dela', sub: 'Pressão', color: 'vermelho', icon: 'coroa', effects: { rel: { gaspard: -6, elenora: 4 }, loyalty: { valmont: -2 } }, reply: 'Gaspard recebe a mensagem real e passa a semana resmungando que ninguém respeita os pais.' },
  ] },
  { id: 'recusa_rhoswen', from: 'rhoswen', subject: 'Ocupada', text: 'Rei, estou caçando lobos no passo. Os lobos não esperam convocações. Se quiser me ver, sabe onde fica o norte. R.', choices: [
    { label: 'Pedir uma pele de lobo', sub: 'Flerte bruto', color: 'vermelho', icon: 'coracao', effects: { rel: { rhoswen: 10 } }, reply: 'Três dias depois chega uma pele de lobo enorme, com um bilhete: "Essa quase me pegou."' },
    { label: 'Ignorar', sub: 'Orgulho', color: 'azul', icon: 'escudo', effects: { rel: { rhoswen: -4 } }, reply: 'Rhoswen não nota o silêncio. Ela nota lobos.' },
  ] },
  { id: 'recusa_isolde', from: 'isolde', subject: 'Um convite recusado com carinho', text: 'Majestade, uma dama de Véridian nunca atende ao primeiro chamado. Nem ao segundo, na verdade. Tente de novo. — Isolde (que está, sim, livre hoje à tarde).', choices: [
    { label: 'Chamar de novo, imediatamente', sub: 'Entrar no jogo', color: 'roxo', icon: 'mascara', effects: { rel: { isolde: 10 } }, reply: 'Ela responde com uma única palavra: "Melhor." E um desenho de um leque.' },
    { label: 'Não jogo esse jogo', sub: 'Firmeza', color: 'azul', icon: 'coroa', effects: { rel: { isolde: -6 }, res: { prestigio: 1 } }, reply: 'Isolde guarda a carta. Ela coleciona recusas: diz que são raras.' },
  ] },
  { id: 'recusa_sigrid', from: 'sigrid', subject: 'Não hoje', text: 'Os cortesãos me olham como se eu fosse um lobo à mesa. Hoje não consigo. Amanhã, talvez. S.', choices: [
    { label: 'Prometer que ninguém a olhará assim', sub: 'Proteção', color: 'azul', icon: 'escudo', effects: { rel: { sigrid: 10 } }, reply: 'Ela responde com um bilhete: "Promessa de sulista. Veremos." Há um desenho de um floco de neve no canto.' },
    { label: 'Deixá-la em paz', sub: 'Respeito', color: 'verde', icon: 'coracao', effects: { rel: { sigrid: 4 } }, reply: 'Nenhuma resposta. Mas no dia seguinte ela cumprimenta você no corredor.' },
  ] },

  // ---------- admiradoras e fofocas ----------
  { id: 'carta_admiradora_1', from: 'clara', subject: 'Um bilhete perfumado', text: '"Vossa Majestade nem me nota quando passo com as toalhas. Eu noto Vossa Majestade o tempo todo. Especialmente de perfil." — Uma admiradora (não é a Clara da lavanderia, juro).', weight: 2, minDay: 3, repeat: 40, choices: [
    { label: 'Guardar o bilhete', sub: 'Curiosidade', color: 'roxo', icon: 'coracao', effects: { rel: { clara: 8 }, flags: { admiradoraClara: true } }, reply: 'Você guarda o bilhete na gaveta. Na manhã seguinte, suas toalhas aparecem dobradas em forma de coração.' },
    { label: 'Pedir discrição ao mordomo', sub: 'Prudência', color: 'azul', icon: 'escudo', effects: { rel: { clara: -4 }, res: { prestigio: 1 } }, reply: 'O mordomo tosse, constrangido. "Vou falar com... ninguém, Majestade." As toalhas voltam a ser só toalhas.' },
  ] },
  { id: 'carta_fofoca_corte', from: 'dama', subject: 'O que se diz nos corredores', text: 'Majestade, humildemente informo: Lorde Gaspard usa peruca. Lady Isolde tem três leques e um é de ouro verdadeiro. E o Chanceler Aldric ronca durante as reuniões do conselho. Achei que o senhor gostaria de saber. Sua devotada Lady Maren.', weight: 2, minDay: 2, repeat: 20, choices: [
    { label: 'Pedir mais fofocas', sub: 'Uma espiã de corredor', color: 'roxo', icon: 'mascara', effects: { res: { influencia: 2 }, rel: { dama: 6 }, flags: { fofoqueira: true } }, reply: 'Lady Maren fica radiante. A partir de hoje você saberá de tudo, inclusive do que não queria saber.' },
    { label: 'Fofoca não é assunto de rei', sub: 'Dignidade', color: 'azul', icon: 'coroa', effects: { rel: { dama: -4 }, res: { prestigio: 1 } }, reply: 'Lady Maren se sente ofendida. Mas continua sabendo da peruca.' },
  ] },
  { id: 'carta_pimenta_poema', from: 'pimenta', subject: 'Uma ode ao rei (sem rima)', text: '"Ó rei tão jovem, de coroa tão grande / que nem a cabeça sabe onde anda / o reino treme, o tesouro chora / e o conselho ronca a toda hora." — Pimenta, bobo oficial, poeta extraoficial.', weight: 2, minDay: 3, repeat: 15, choices: [
    { label: 'Rir e pagar uma moeda', sub: 'Bom humor', color: 'verde', icon: 'moedas', effects: { res: { ouro: -1, povo: 1 }, rel: { pimenta: 8 } }, reply: 'Pimenta recita o poema na praça. O povo ri do conselho, e um pouco do rei. Ninguém se ofende. Quase ninguém.' },
    { label: 'Proibir o poema', sub: 'Honra real', color: 'vermelho', icon: 'coroa', effects: { res: { prestigio: 1, povo: -2 }, rel: { pimenta: -8 } }, reply: 'Proibido, o poema vira o maior sucesso da cidade baixa em uma semana.' },
  ] },
  { id: 'carta_mae_cuidado', from: 'isabelle', subject: 'Para meu filho', text: 'Você não está comendo direito. A cozinha me contou. Um rei magro parece um rei doente, e um rei doente atrai abutres. Coma o pudim. Com amor, e ordem, sua mãe.', weight: 2, minDay: 2, repeat: 12, choices: [
    { label: 'Comer o pudim', sub: 'Obediência filial', color: 'verde', icon: 'coracao', effects: { rel: { isabelle: 6 } }, reply: 'O pudim estava excelente. Sua mãe sabe, porque mandou um criado vigiar.' },
    { label: 'Responder que o rei come quando quiser', sub: 'Independência', color: 'vermelho', icon: 'coroa', effects: { rel: { isabelle: -4 }, res: { prestigio: 1 } }, reply: 'Na manhã seguinte, há dois pudins no seu quarto. Ela não aceita derrotas.' },
  ] },
  { id: 'carta_lucas_segredo', from: 'lucas', subject: 'NÃO CONTA PRA MÃE', text: 'Irmão, eu troquei minha espada de treino por um falcão. É um falcão incrível. Chama Trovão. Ele mordeu o Aurelian. Por favor não conta pra mãe. Por favor. — L.', weight: 2, minDay: 4, repeat: 30, choices: [
    { label: 'Guardar o segredo', sub: 'Irmão leal', color: 'verde', icon: 'aperto', effects: { rel: { lucas: 10, aurelian: -2 } }, reply: 'Lucas manda um desenho do Trovão. O falcão, no desenho, parece um frango bravo.' },
    { label: 'Contar para a mãe', sub: 'Responsabilidade', color: 'azul', icon: 'escudo', effects: { rel: { lucas: -10, isabelle: 5 } }, reply: 'Isabelle confisca o falcão. Lucas não fala com você por dois dias. O falcão também não.' },
  ] },
  { id: 'carta_cobranca_alfaiate', from: 'tobias', subject: 'Uma cobrança constrangedora', text: 'Majestade, o alfaiate real, Mestre Albin, pede humildemente o pagamento pelo manto da coroação. Oitenta moedas. Ele diz que o manto de arminho do falecido rei também nunca foi pago.', weight: 2, minDay: 3, repeat: 25, choices: [
    { label: 'Pagar o alfaiate', sub: '−80 de ouro', color: 'dourado', icon: 'moedas', effects: { res: { ouro: -80, povo: 2 } }, reply: 'Mestre Albin chora de alegria. Nunca um rei tinha pago uma conta dele.' },
    { label: 'Pagar o manto do pai também', sub: '−160 de ouro, honra da família', color: 'verde', icon: 'coroa', effects: { res: { ouro: -160, povo: 4, prestigio: 2 } }, reply: 'A notícia de que o rei paga até as dívidas do pai corre a cidade. Os comerciantes passam a confiar na coroa.' },
    { label: 'O manto foi um presente', sub: 'Calote real', color: 'vermelho', icon: 'escudo', effects: { res: { povo: -3 } }, reply: 'O alfaiate conta para todo mundo. O manto real agora é conhecido como "o manto do calote".' },
  ] },
  { id: 'carta_anonima_ameaca', from: 'mensageiro', subject: 'Sem remetente', text: '"O rei menino dorme em cama macia enquanto o reino apodrece. Nem toda coroa chega ao inverno." Nenhuma assinatura. A letra é caprichada demais para um camponês.', weight: 1, minDay: 6, repeat: 30, cond: (s) => s.res.povo < 50 || Object.values(s.loyalty).some((v) => v < -25), choices: [
    { label: 'Dobrar a guarda do quarto', sub: '−50 de ouro', color: 'azul', icon: 'escudo', effects: { res: { ouro: -50, moral: 2 }, flags: { guardaQuarto: true } }, reply: 'Dois guardas a mais na porta do quarto. Você dorme melhor. Eles, pior.' },
    { label: 'Comparar a letra com as cartas dos lordes', sub: 'Exige Intriga 1', color: 'roxo', icon: 'olho', req: { attr: ['intriga', 1] }, effects: { flags: { conspiracaoRevelada: true }, loyalty: { montclair: -3 }, res: { influencia: 3 } }, reply: 'O mesmo R inclinado aparece nas cartas de Lady Lysandra Cinzel, dama dos Montclair. Um fio para puxar.' },
    { label: 'Queimar a carta', sub: 'Desprezo', color: 'vermelho', icon: 'coroa', effects: { res: { prestigio: 1 } }, reply: 'O papel vira cinza. A ameaça, não.' },
  ] },
  { id: 'carta_mercador_sul', from: 'kasim', subject: 'Uma oferta do sul', text: 'Grande Rei! Kasim de Véridian saúda Vossa Majestade. Tenho especiarias, sedas e um papagaio que fala três línguas, uma delas ofensiva. Tudo por um preço razoável e uma pequena licença para vender no mercado real.', weight: 2, minDay: 5, repeat: 25, choices: [
    { label: 'Conceder a licença', sub: '+60 de ouro, a Guilda reclama', color: 'dourado', icon: 'moedas', effects: { res: { ouro: 60 }, rel: { tobias: -6, kasim: 10 } }, reply: 'Kasim monta uma banca colorida no mercado. O papagaio xinga Tobias em três línguas.' },
    { label: 'Comprar o papagaio', sub: '−40 de ouro, para a corte', color: 'roxo', icon: 'mascara', effects: { res: { ouro: -40, prestigio: -1 }, flags: { papagaio: true }, rel: { kasim: 6, pimenta: 5 } }, reply: 'O papagaio agora mora na sala do trono. Na primeira audiência, chama Otho de "rato". Ninguém sabe quem ensinou.' },
    { label: 'Recusar', sub: 'A Guilda agradece', color: 'azul', icon: 'escudo', effects: { rel: { tobias: 4 } }, reply: 'Kasim parte, levando o papagaio e três xingamentos novos para a coleção.' },
  ] },
  { id: 'carta_convite_torneio', from: 'sir_osric', subject: 'Um torneio em sua honra', text: 'Majestade, os cavaleiros da Costa Serena querem organizar um torneio em sua honra. Justas, arquearia e um banquete. Só precisamos da bênção real e de um prêmio digno: 150 moedas.', weight: 2, minDay: 6, repeat: 30, choices: [
    { label: 'Patrocinar o torneio', sub: '−150 de ouro', color: 'dourado', icon: 'coroa', effects: { res: { ouro: -150, prestigio: 5, povo: 4, moral: 4 }, loyalty: { valmont: 4, drakon: 3 } }, reply: 'O torneio é um sucesso. Sir Gerald Ferrão derruba três cavaleiros Valmont, o que agrada muito aos Drakon e nada aos Valmont.' },
    { label: 'Abençoar, sem prêmio', sub: 'Economia', color: 'azul', icon: 'aperto', effects: { res: { prestigio: 1 } }, reply: 'O torneio acontece, menor. O prêmio é um bode. O bode vence a própria categoria.' },
  ] },
  { id: 'carta_viuva_greta', from: 'viuva', subject: 'Uma carta escrita por outra mão', text: '(Escrita pelo escrivão da praça.) "Majestade, sou a viúva Greta. Meu marido morreu na última guerra contra Norhelm e a pensão dele nunca chegou. Tenho três netos. Não peço muito. Peço o que é justo."', weight: 2, minDay: 4, repeat: 30, choices: [
    { label: 'Pagar a pensão atrasada', sub: '−40 de ouro', color: 'verde', icon: 'coracao', effects: { res: { ouro: -40, povo: 3 }, rel: { viuva: 12 } }, reply: 'A viúva Greta manda um pão caseiro para o castelo. O cozinheiro diz que é melhor que o dele. Está certo.' },
    { label: 'Pensão para todas as viúvas de guerra', sub: '−120 de ouro, lei', color: 'azul', icon: 'pergaminho', effects: { res: { ouro: -120, povo: 8, moral: 5 }, law: 'Pensão das Viúvas de Guerra' }, reply: 'Nos quartéis, os soldados comentam que o rei cuida das famílias. A moral sobe.' },
    { label: 'Mandar para o tesoureiro', sub: 'Burocracia', color: 'dourado', icon: 'ampulheta', effects: { res: { povo: -1 } }, reply: 'Corvin arquiva a carta. Na pilha "urgente", que ele nunca abre.' },
  ] },
  { id: 'carta_sombra', from: 'sombra', subject: 'Sem assinatura, só um desenho de corvo', text: '"Um rei precisa de olhos onde não pode ir. Eu tenho muitos olhos. Deixe uma bolsa com 100 moedas sob a terceira pedra do jardim e eu o servirei." Há um corvo desenhado no canto.', weight: 1, minDay: 7, repeat: 60, choices: [
    { label: 'Deixar a bolsa', sub: '−100 de ouro, uma rede de espiões', color: 'roxo', icon: 'mascara', effects: { res: { ouro: -100, influencia: 4 }, flags: { sombraContratada: true }, xp: 10 }, reply: 'Na manhã seguinte a bolsa sumiu. No lugar, um bilhete: "Lorde Otho janta com estranhos às quintas."' },
    { label: 'Pôr guardas escondidos no jardim', sub: 'Armadilha', color: 'vermelho', icon: 'escudo', effects: { res: { prestigio: 1 }, flags: { sombraInimiga: true } }, reply: 'Ninguém aparece. Mas os guardas acordam com os rostos pintados de corvo. Alguém tem senso de humor.' },
    { label: 'Ignorar', sub: 'Prudência', color: 'azul', icon: 'aperto', effects: {}, reply: 'O corvo desenhado fica na sua gaveta. Às vezes você tem a impressão de que ele observa.' },
  ] },
  { id: 'carta_brandt_bebado', from: 'brandt', subject: 'Uma carta... entusiasmada', text: '(Letra tremida.) "Majestade!!! Seu pai era um grande homem. GRANDE. Ele me devia um barril de hidromel. O senhor herdou a coroa, então herdou o barril. Cadê o meu barril." — Brandt (escrito às duas da manhã, certamente)', weight: 1, minDay: 5, repeat: 40, choices: [
    { label: 'Mandar o barril', sub: '−30 de ouro', color: 'verde', icon: 'aperto', effects: { res: { ouro: -30 }, loyalty: { drakon: 6 }, rel: { brandt: 8 } }, reply: 'O barril chega. Brandt manda outra carta, ainda mais tremida: "O SENHOR É O MELHOR REI."' },
    { label: 'Mandar um barril de água', sub: 'Humor ácido', color: 'roxo', icon: 'mascara', effects: { loyalty: { drakon: 2 }, rel: { brandt: 3 }, res: { prestigio: 1 } }, reply: 'Brandt, sóbrio, ri por dez minutos. "O garoto tem senso de humor. Maldito."' },
  ] },
  { id: 'carta_otho_presente', from: 'otho', subject: 'Um presente das montanhas', text: 'Majestade, envio junto a esta carta uma taça de prata das minas de Cinzel, como prova da lealdade dos Montclair. Não se preocupe com o gosto metálico do vinho: é só a prata.', weight: 1, minDay: 8, repeat: 60, choices: [
    { label: 'Mandar provar o vinho antes', sub: 'Desconfiança saudável', color: 'roxo', icon: 'olho', effects: { flags: { tacaTestada: true }, loyalty: { montclair: -2 } }, reply: 'O provador real passa mal a tarde inteira. Era só vinho estragado... ou não. Otho manda desculpas pela "safra ruim".' },
    { label: 'Agradecer e guardar a taça', sub: 'Cortesia', color: 'azul', icon: 'aperto', effects: { loyalty: { montclair: 4 }, res: { ouro: 20 } }, reply: 'A taça vai para a coleção real. Ninguém bebe nela. Por via das dúvidas.' },
  ] },
  { id: 'carta_aurelian_guarda', from: 'aurelian', subject: 'Relatório da guarda', text: 'Majestade, três guardas foram pegos jogando dados durante o turno. Um apostou a própria alabarda. Perdeu. O vencedor foi o gato da cozinha, que estava sentado sobre o dado errado. Aguardo instruções.', weight: 2, minDay: 3, repeat: 30, choices: [
    { label: 'Punir os guardas', sub: 'Disciplina', color: 'vermelho', icon: 'escudo', effects: { res: { moral: -2, prestigio: 1 } }, reply: 'Os três limpam os estábulos por uma semana. O gato fica com a alabarda.' },
    { label: 'Promover o gato', sub: 'Humor real', color: 'verde', icon: 'coroa', effects: { res: { moral: 5, povo: 1 }, rel: { aurelian: -2 } }, reply: 'O gato ganha o título de "Sargento Bigodes". A guarda nunca esteve tão animada. Aurelian não acha graça.' },
  ] },
  { id: 'carta_aldric_resumo', from: 'aldric', subject: 'Um conselho não pedido', text: 'Majestade, permita-me uma observação: o senhor tem tomado decisões rápidas demais. Um rei que decide rápido erra rápido. Sugiro que, antes de cada audiência, conte até dez. Ou até vinte, no caso de Lorde Brandt.', weight: 1, minDay: 6, repeat: 30, choices: [
    { label: 'Contar até dez daqui em diante', sub: 'Aceitar o conselho', color: 'azul', icon: 'aperto', effects: { rel: { aldric: 6 }, res: { influencia: 1 } }, reply: 'Aldric fica satisfeito. Você nota que ele também conta até dez antes de responder você.' },
    { label: 'Responder: "Um, dois, dez."', sub: 'Ironia', color: 'roxo', icon: 'mascara', effects: { rel: { aldric: -2, pimenta: 4 }, res: { prestigio: 1 } }, reply: 'Aldric não ri. Pimenta, que leu a carta por cima do ombro do mensageiro, ri por você.' },
  ] },
  { id: 'carta_amante_bianca', from: 'bianca', subject: 'Da cozinha', text: '"Fiz aquela torta de maçã que o senhor elogiou. Deixei na janela do corredor norte. Se o senhor passar lá depois da meia-noite, ainda estará quente. A torta, digo." — B.', weight: 1, minDay: 6, repeat: 30, cond: (s) => !!s.flags.bianca, choices: [
    { label: 'Passar no corredor norte', sub: 'Aventura perigosa', color: 'roxo', icon: 'coracao', effects: { rel: { bianca: 12 }, flags: { casoBianca: true } }, reply: 'A torta estava quente. Bianca também. Ninguém viu. Você acha.' },
    { label: 'Mandar a torta para a mãe', sub: 'Encerrar o assunto', color: 'azul', icon: 'escudo', effects: { rel: { bianca: -10, isabelle: 3 } }, reply: 'Isabelle elogia a torta durante três dias. Bianca não te olha nos olhos por uma semana.' },
  ] },
  { id: 'carta_rainha_ciumes', from: 'dama', subject: 'Um aviso discreto', text: 'Majestade, peço perdão pela ousadia: a rainha andou perguntando à criadagem por onde o senhor anda à noite. E perguntou especificamente sobre a cozinha. — Lady Maren', weight: 3, minDay: 21, repeat: 40, cond: (s) => !!s.spouse && !!s.flags.casoBianca, choices: [
    { label: 'Encerrar o caso com Bianca', sub: 'Salvar o casamento', color: 'azul', icon: 'escudo', effects: { flags: { casoBianca: false, bianca: false }, rel: { bianca: -15 } }, reply: 'Bianca é transferida para as cozinhas de verão. A rainha nunca pergunta de novo. Mas também nunca esquece.' },
    { label: 'Negar tudo', sub: 'Arriscar', color: 'vermelho', icon: 'mascara', effects: { res: { influencia: -2 }, schedule: [{ id: 'escandalo_cozinha', in: 3 }] }, reply: 'Por enquanto, a mentira se sustenta. Mentiras em castelos têm pernas curtas e ouvidos longos.' },
  ] },
  { id: 'carta_haakon_ameaca', from: 'haakon', subject: 'Do norte, com gelo', text: 'Rei-menino. Os lobos estão com fome e os rios estão congelando. Quando o gelo for firme o bastante para aguentar cavalos, conversaremos de outro jeito. — H.', weight: 2, minDay: 10, maxDay: 21, repeat: 40, cond: (s) => !s.flags.pazNorhelm, choices: [
    { label: 'Responder com uma pele de lobo', sub: 'Provocação', color: 'vermelho', icon: 'espadas', effects: { res: { moral: 4, prestigio: 2 }, rel: { haakon: -8 }, loyalty: { drakon: 3 } }, reply: 'A pele chega a Hjalmgard com um bilhete: "Os nossos também estão com fome." Os soldados de Castelmar adoram a história.' },
    { label: 'Propor conversa antes do gelo', sub: 'Diplomacia', color: 'azul', icon: 'aperto', effects: { rel: { haakon: 6 }, res: { influencia: 2 } }, reply: 'Haakon não responde. Mas o próximo espião de Norhelm que você captura traz ordens de "só observar".' },
  ] },
  { id: 'carta_gaspard_proposta', from: 'gaspard', subject: 'Negócio de ocasião', text: 'Majestade, tenho um carregamento de vinho de Véridian encalhado no porto por uma pequena disputa de tarifas. Se Vossa Majestade assinar a isenção, dividimos o lucro. Meio a meio. Entre amigos.', weight: 2, minDay: 5, repeat: 25, choices: [
    { label: 'Assinar e dividir', sub: '+120 de ouro, cheiro de corrupção', color: 'dourado', icon: 'moedas', effects: { res: { ouro: 120, prestigio: -2 }, loyalty: { valmont: 5 }, flags: { corrupcaoValmont: true } }, reply: 'O ouro chega discreto. O segredo, nem tanto: Lady Maren já sabe.' },
    { label: 'Taxar o vinho em dobro', sub: 'Lição de ética', color: 'vermelho', icon: 'coroa', effects: { res: { ouro: 80 }, loyalty: { valmont: -6 } }, reply: 'Gaspard paga, lívido. Você ganhou ouro e perdeu um amigo de negócios.' },
    { label: 'Recusar educadamente', sub: 'Mãos limpas', color: 'azul', icon: 'escudo', effects: { res: { prestigio: 1 } }, reply: '"Entre amigos, Majestade, recusas também são bem-vindas", ele responde. Mentindo.' },
  ] },
  { id: 'carta_aveline_erva', from: 'aveline', subject: 'Um presente dos bosques', text: 'Majestade, envio um ramo de erva-de-são-joão. Coloque sob o travesseiro. Afasta pesadelos, febres e, dizem, más decisões. Pelo que ouço, o senhor precisará das três.', weight: 2, minDay: 4, repeat: 30, choices: [
    { label: 'Usar a erva', sub: 'Respeitar a tradição', color: 'verde', icon: 'arvore', effects: { loyalty: { seren: 4 }, res: { moral: 1 } }, reply: 'Você dorme como um bebê. Pode ser a erva. Pode ser o cansaço. Os Seren acham que é a erva.' },
    { label: 'Agradecer com ironia', sub: '"Mande uma para Otho também"', color: 'roxo', icon: 'mascara', effects: { loyalty: { seren: 1, montclair: -2 }, rel: { aveline: 3 } }, reply: 'Aveline ri, coisa rara. Ela realmente manda um ramo para Otho. Otho acha que é uma ameaça.' },
  ] },
  { id: 'carta_marta_colheita', from: 'marta', subject: 'Notícias da vila', text: 'Majestade, aqui é Marta de novo (o escrivão escreve por mim). A vila mandou dizer que o trigo cresceu bonito este ano. E que as crianças brincam de "rei e conselho". O menor sempre quer ser o rei. O maior sempre quer ser o Brandt.', weight: 2, minDay: 6, repeat: 30, cond: (s) => (s.rel.marta ?? 0) >= 5, choices: [
    { label: 'Mandar uma coroa de brinquedo', sub: 'Carinho', color: 'verde', icon: 'coroa', effects: { res: { povo: 4, ouro: -5 }, rel: { marta: 8 } }, reply: 'A coroa de brinquedo passa de mão em mão na vila. Agora todas as crianças querem ser o rei.' },
    { label: 'Agradecer', sub: 'Simples', color: 'azul', icon: 'aperto', effects: { rel: { marta: 3 } }, reply: 'A vila guarda a carta real na igreja, ao lado do santo.' },
  ] },
  { id: 'carta_theodric_livro', from: 'theodric', subject: 'Um livro esquecido', text: 'Majestade, encontrei atrás de uma estante um volume que não constava no catálogo: "Diário de um Rei Menino", escrito pelo seu tataravô aos dezesseis anos. Na primeira página ele escreveu: "Ninguém me avisou que seria tão chato." Posso separar para o senhor?', weight: 2, minDay: 8, repeat: 60, choices: [
    { label: 'Ler o diário', sub: '+1 ponto de habilidade', color: 'azul', icon: 'livro', effects: { run: (s) => { s.skillPoints += 1; }, rel: { theodric: 6 } }, reply: 'O tataravô reclamava dos mesmos lordes, com outros nomes. Você aprende que os problemas do reino são mais velhos que você. Isso, estranhamente, conforta.' },
    { label: 'Guardar para quando tiver tempo', sub: 'Depois', color: 'dourado', icon: 'ampulheta', effects: { rel: { theodric: -2 } }, reply: 'Theodric suspira. "Reis nunca têm tempo, Majestade. Por isso escrevem diários."' },
  ] },
  { id: 'carta_cedric_rumor', from: 'dama', subject: 'Um nome sussurrado', text: 'Majestade, nas tavernas da capital se fala de um tal Cedric de Lys, que andaria dizendo ser filho do falecido rei. Os bêbados já brindam a ele. Os sóbrios, só em voz baixa. — Lady Maren', day: 14 },
  { id: 'carta_sigrid_norte', from: 'sigrid', subject: 'Uma carta em runas', text: 'Escrevi em runas para os cortesãos não lerem. Se você conseguir ler isto, é porque estudou nossa língua. Se não conseguir, peça ao velho Theodric. Diz apenas: "Sinto falta da neve, mas não tanto quanto achei que sentiria."', weight: 3, minDay: 21, repeat: 60, cond: (s) => s.spouse === 'sigrid', choices: [
    { label: 'Responder em runas', sub: 'Exige Crônicas de Norhelm', color: 'roxo', icon: 'livro', req: { knowledge: 'norhelm' }, effects: { rel: { sigrid: 16 } }, reply: 'Ela encontra sua resposta sob o travesseiro. No dia seguinte, sorri durante toda a audiência com Otho, o que deixa Otho nervoso.' },
    { label: 'Mandar neve do alto da torre', sub: 'Gesto romântico', color: 'verde', icon: 'coracao', effects: { rel: { sigrid: 12 } }, reply: 'É só gelo raspado de uma caixa-d\'água. Ela ri como uma criança.' },
  ] },
  { id: 'carta_isolde_intriga', from: 'isolde', subject: 'Para os seus olhos, apenas', text: 'Meu rei, uma informação que custou caro: Gaspard Valmont e Otho Montclair jantaram juntos na Costa Serena. Dois homens que se odeiam não jantam juntos por prazer. Quer que eu descubra o cardápio?', weight: 3, minDay: 21, repeat: 60, cond: (s) => s.spouse === 'isolde', choices: [
    { label: 'Sim, descubra', sub: 'O jogo de Isolde', color: 'roxo', icon: 'mascara', effects: { flags: { isoldeTrama: 3, conspiracaoRevelada: true }, res: { influencia: 4 }, rel: { isolde: 6 } }, reply: 'O "cardápio" era um plano para dividir a coroa em conselhos regentes. Isolde sorri: "De nada, meu rei."' },
    { label: 'Pare de espionar meus lordes', sub: 'Limites', color: 'azul', icon: 'escudo', effects: { rel: { isolde: -8 }, res: { prestigio: 1 } }, reply: '"Como quiser", ela responde. E continua espionando. Só não conta mais.' },
  ] },
  { id: 'carta_elenora_pai', from: 'elenora', subject: 'Sobre o meu pai', text: 'Meu rei, meu pai escreve todo dia pedindo favores em meu nome. Eu queimo as cartas antes de ler. Mas ele não vai parar. Às vezes acho que ele se casou com a coroa, não eu.', weight: 3, minDay: 21, repeat: 60, cond: (s) => s.spouse === 'elenora', choices: [
    { label: 'Proibir Gaspard de escrever à rainha', sub: 'Proteger a esposa', color: 'vermelho', icon: 'escudo', effects: { rel: { elenora: 12, gaspard: -10 }, loyalty: { valmont: -5 } }, reply: 'Gaspard fica furioso. Elenora dorme a noite inteira pela primeira vez em semanas.' },
    { label: 'Dar a Gaspard um cargo longe da corte', sub: 'Solução elegante', color: 'dourado', icon: 'coroa', effects: { rel: { elenora: 8, gaspard: 6 }, loyalty: { valmont: 4 }, res: { influencia: -3 } }, reply: '"Almirante das Frotas do Sul." Gaspard fica tão orgulhoso que esquece de escrever por um mês.' },
  ] },
  { id: 'carta_rhoswen_treino', from: 'rhoswen', subject: 'Relatório de treino', text: 'Meu rei, treinei a guarda hoje. Quatro desmaiaram, dois choraram e um pediu demissão. É o melhor treino que esta guarda já teve. Amanhã vou treinar o conselho.', weight: 3, minDay: 21, repeat: 60, cond: (s) => s.spouse === 'rhoswen', choices: [
    { label: 'Deixar ela treinar o conselho', sub: 'Caos divertido', color: 'vermelho', icon: 'espadas', effects: { rel: { rhoswen: 10, aldric: -8, corvin: -6 }, res: { moral: 6 } }, reply: 'Aldric corre duas voltas no pátio antes de desmaiar. Corvin se esconde no tesouro. A guarda nunca te amou tanto.' },
    { label: 'Proteger o pobre conselho', sub: 'Misericórdia', color: 'azul', icon: 'escudo', effects: { rel: { rhoswen: -3, aldric: 5 } }, reply: '"Vocês sulistas são moles", ela escreve de volta. Com um coração desenhado.' },
  ] },
];

export const LETTER_MAP: Record<string, LetterDef> = Object.fromEntries(LETTERS.map((l) => [l.id, l]));
