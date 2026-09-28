import type { GameEvent } from '../../types';

// Decisões antigas voltam como conflitos concretos. O motor reserva espaço diário
// para estes eventos e mostra, na audiência, qual escolha os provocou.
export const ECHO_EVENTS: GameEvent[] = [
  {
    id: 'eco_cavalaria', speaker: 'rhoswen', topic: 'A cavalaria prometida', kind: 'conselho', minDay: 9, followup: true, cause: 'promessaCavalaria',
    cond: (s) => !!s.flags.promessaCavalaria,
    nodes: {
      start: {
        text: 'Rhoswen coloca sua promessa por escrito sobre a mesa. "Você me ofereceu o comando da cavalaria. Meu pai já disse aos homens que era só galanteio. Quero que diga na frente deles se a palavra do rei é aço ou fita de presente."',
        choices: [
          { label: 'Entregar o comando', sub: 'Honrar a promessa', color: 'azul', icon: 'espadas', goto: 'comando', tension: -8 },
          { label: 'Adiar até depois da guerra', sub: 'A confiança tem custo', color: 'dourado', icon: 'ampulheta', effects: { rel: { rhoswen: -14, brandt: 8 }, loyalty: { drakon: -4 }, flags: { cavalariaAdiada: true }, xp: 8 }, reply: '"Entendi. Eu era boa o bastante para uma promessa, não para uma ordem." Ela deixa o papel. Os cavaleiros ouvem uma versão menos gentil.' },
          { label: 'Dizer que era galanteio', sub: 'Quebrar sua palavra', color: 'vermelho', icon: 'mascara', effects: { rel: { rhoswen: -24 }, loyalty: { drakon: -9 }, res: { prestigio: -4 }, xp: 6 }, reply: '"Ótimo. Vou contar essa versão aos homens que morrerem esperando ordens." Brandt, pela primeira vez, não a contradiz.' },
        ],
      },
      comando: {
        text: '"Então preciso de mantimentos, ferraduras e licença para retirar dois capitães que meu pai protege." Ela não sorri. "Comando de verdade inclui escolhas que vão irritar alguém."',
        choices: [
          { label: 'Dar recursos e autonomia', sub: '−120 ouro, tropas motivadas', color: 'verde', icon: 'aperto', req: { ouro: 120 }, effects: { res: { ouro: -120, moral: 7 }, rel: { rhoswen: 17, brandt: -6 }, flags: { rhoswenComando: true }, xp: 16 }, reply: 'Rhoswen reorganiza a cavalaria em dois dias. Os capitães reclamam. Os soldados param de reclamar depois do primeiro treino.' },
          { label: 'Comando, mas sob Brandt', sub: 'Acordo com o pai', color: 'dourado', icon: 'escudo', effects: { loyalty: { drakon: 6 }, rel: { rhoswen: -7, brandt: 8 }, flags: { cavalariaLimitada: true }, xp: 10 }, reply: '"Uma espada com a mão dele no punho." Ela aceita o cargo. Não aceita esquecer a ressalva.' },
        ],
      },
    },
  },
  {
    id: 'eco_frota_veridian', speaker: 'isolde', topic: 'O preço da frota', kind: 'conselho', minDay: 9, followup: true, cause: 'frotaVeridian',
    cond: (s) => !!s.flags.frotaVeridian,
    nodes: {
      start: {
        text: '"Você pediu nossa frota contra Norhelm." Isolde abre a carta do irmão. "Ele aceita, se os navios dele puderem entrar em Costa Serena sem pagar tarifa por três anos. Gaspard Valmont mandou perguntar se seu rei enlouqueceu."',
        choices: [
          { label: 'Aceitar o acordo', sub: 'Aliança naval, Valmont furioso', color: 'azul', icon: 'aperto', effects: { flags: { frotaAcordada: true }, loyalty: { valmont: -12 }, rel: { isolde: 11, gaspard: -12 }, res: { prestigio: 3 }, xp: 14 }, reply: '"Meu irmão ficará satisfeito." Ela dobra a carta. "Eu preferiria que tivesse perguntado a mim primeiro, mas ao menos sustentou sua proposta."' },
          { label: 'Cobrar metade da tarifa', sub: 'Negociação dura', color: 'dourado', icon: 'moedas', effects: { flags: { frotaAcordada: true }, loyalty: { valmont: -5 }, rel: { isolde: 8 }, res: { ouro: 90 }, xp: 16 }, reply: 'Isolde ri. "Você acaba de cobrar pedágio de um rei que pensava estar comprando você. Gostei." A frota virá, menor e mais cara.' },
          { label: 'Retirar a promessa', sub: 'Norhelm lembrará', color: 'vermelho', icon: 'selo', effects: { flags: { frotaCancelada: true }, rel: { isolde: -18 }, res: { prestigio: -3 }, xp: 6 }, reply: '"Então mande uma carta a Norhelm explicando que sua coragem custava menos que uma tarifa." Isolde não oferece a caneta.' },
        ],
      },
    },
  },
  {
    id: 'eco_norhelm_humilhado', speaker: 'haakon', topic: 'A resposta ao insulto', kind: 'urgente', minDay: 8, followup: true, cause: 'norhelmHumilhado',
    cond: (s) => !!s.flags.norhelmHumilhado && !s.flags.pazNorhelm,
    nodes: {
      start: {
        text: 'Haakon mostra um mapa com três vilas marcadas. "Quando citou a mão perdida do nosso antigo rei diante da corte, os jovens jarls juraram provar que ainda sabem atravessar o passo. Já queimaram celeiros. Sua frase custou alimento a gente que nunca ouviu seu nome."',
        choices: [
          { label: 'Enviar reparações às vilas', sub: '−130 ouro, baixar tensão', color: 'verde', icon: 'trigo', req: { ouro: 130 }, effects: { res: { ouro: -130, povo: 3 }, rel: { haakon: 8, sigrid: 7 }, flags: { norteReparado: true }, xp: 14 }, reply: '"Não confunda isto com perdão", diz Haakon. Mesmo assim, ele pega o selo real e promete deter os jarls.' },
          { label: 'Exigir que Haakon os contenha', sub: 'Diplomacia firme', color: 'azul', icon: 'aperto', effects: { rel: { haakon: 3 }, res: { influencia: 2 }, flags: { jarlsContidos: true }, xp: 12 }, reply: '"Eu tentarei. Eles dizem que palavras não quebram ossos. Agora sabem que quebram tratados."' },
          { label: 'Ridicularizar os jarls também', sub: 'Escalada pública', color: 'vermelho', icon: 'coroa', effects: { rel: { haakon: -17, sigrid: -8 }, loyalty: { drakon: 7 }, res: { prestigio: 4, moral: -3 }, flags: { jarlsOfendidos: true }, xp: 8 }, reply: 'Haakon recolhe o mapa. "Excelente. Tenho mais três vilas para marcar." O salão ri menos desta vez.' },
        ],
      },
    },
  },
  {
    id: 'eco_divida_valmont', speaker: 'gaspard', topic: 'Os juros da amizade', kind: 'audiencia', minDay: 18, followup: true, cause: 'dividaValmont',
    cond: (s) => !!s.flags.dividaValmont,
    nodes: {
      start: {
        text: '"Lembra das quatrocentas moedas que emprestei quando o tesouro sangrava?" Gaspard põe uma conta enorme no braço do trono. "Com juros são quinhentas e vinte. As lágrimas não cobraram juros; eu cobro."',
        choices: [
          { label: 'Pagar a dívida inteira', sub: '−520 ouro, limpar o nome', color: 'dourado', icon: 'moedas', req: { ouro: 520 }, effects: { res: { ouro: -520, prestigio: 3 }, loyalty: { valmont: 4 }, flags: { dividaValmontPaga: true, dividaValmont: false }, xp: 14 }, reply: 'Gaspard conta duas vezes. "Detesto clientes que pagam cedo. Gosto de reis que pagam."' },
          { label: 'Quitar com tarifas por um ano', sub: 'Valmont ganha poder', color: 'azul', icon: 'pergaminho', effects: { loyalty: { valmont: 12, drakon: -4 }, rel: { gaspard: 10 }, flags: { dividaValmont: false, tarifaValmont: true }, xp: 10 }, reply: 'Gaspard aceita antes que Aldric termine de explicar quanto isso custará ao reino.' },
          { label: 'Questionar os juros', sub: 'Confrontar o credor', color: 'vermelho', icon: 'olho', effects: { loyalty: { valmont: -11 }, rel: { gaspard: -15 }, res: { prestigio: 2 }, flags: { dividaValmontContestada: true }, xp: 12 }, reply: '"Contestada não significa apagada, Majestade." Ele manda cópias da conta para todos os lordes. A matemática vira política.' },
        ],
      },
    },
  },
  {
    id: 'eco_auditoria_cinzel', speaker: 'corvin', topic: 'O livro-caixa de Cinzel', kind: 'conselho', minDay: 10, followup: true, cause: 'auditoriaCinzel',
    cond: (s) => !!s.flags.auditoriaCinzel,
    nodes: {
      start: {
        text: 'Corvin volta da auditoria que você ordenou nas minas de Cinzel. "Encontramos três livros-caixa. Um para Otho, outro para a coroa e o terceiro, curioso, para ninguém ver. Faltam duzentas moedas em tributos. Mais curioso: alguém pagou para que eu nunca voltasse."',
        choices: [
          { label: 'Publicar os três livros', sub: 'Expor Montclair', color: 'vermelho', icon: 'pergaminho', effects: { res: { ouro: 200, prestigio: 5 }, loyalty: { montclair: -16 }, rel: { otho: -15, corvin: 12 }, flags: { cinzelExposto: true }, xp: 18 }, reply: 'Otho chama de erro contábil. Corvin responde que o erro tinha assinatura, selo e três testemunhas. As minas entram em greve por uma tarde.' },
          { label: 'Cobrar em segredo', sub: '+250 ouro, guardar a prova', color: 'roxo', icon: 'mascara', effects: { res: { ouro: 250, influencia: 3 }, rel: { corvin: 4, otho: -7 }, flags: { cinzelChantagem: true }, xp: 14 }, reply: 'Otho paga antes do meio-dia. Corvin guarda o terceiro livro num cofre cujo número só você conhece.' },
          { label: 'Perdoar e reformar as contas', sub: 'Sem guerra com Otho', color: 'verde', icon: 'aperto', effects: { loyalty: { montclair: 7 }, rel: { otho: 8, corvin: -9 }, flags: { cinzelPerdoado: true }, xp: 11 }, reply: '"Perdão não fecha balanço", Corvin diz. Otho manda flores. Corvin as conta como tentativa de suborno.' },
        ],
      },
    },
  },
  {
    id: 'eco_calote_guilda', speaker: 'tobias', topic: 'A Guilda fecha as portas', kind: 'urgente', minDay: 19, followup: true, cause: 'caloteGuilda',
    cond: (s) => !!s.flags.caloteGuilda,
    nodes: {
      start: {
        text: 'Tobias traz chaves de seis armazéns. "Quando rasgou o contrato da Guilda, os mercadores rasgaram as ordens de entrega. A cidade acordou sem sal e sem farinha fina. Temos livros para isso, eu disse. Agora temos fechaduras também."',
        choices: [
          { label: 'Pagar e pedir desculpas', sub: '−350 ouro, reabrir comércio', color: 'azul', icon: 'moedas', req: { ouro: 350 }, effects: { res: { ouro: -350, povo: 4 }, rel: { tobias: 10 }, flags: { caloteResolvido: true, caloteGuilda: false }, xp: 14 }, reply: 'As portas abrem ao anoitecer. Tobias guarda os pedaços do contrato, mas deixa de exibi-los.' },
          { label: 'Abrir armazéns pela guarda', sub: 'Alimento agora, abuso depois', color: 'vermelho', icon: 'espadas', effects: { res: { povo: 5, prestigio: -4, moral: -3 }, rel: { tobias: -20 }, flags: { guildaConfiscada: true }, xp: 11 }, reply: 'O povo come. Os mercadores escondem as próximas entregas. Você venceu a manhã e piorou o inverno.' },
          { label: 'Negociar parcelas públicas', sub: '−120 ouro, dívida registrada', color: 'dourado', icon: 'pergaminho', req: { ouro: 120 }, effects: { res: { ouro: -120, influencia: -2 }, rel: { tobias: 4 }, flags: { caloteParcelado: true, caloteGuilda: false }, xp: 16 }, reply: 'Tobias dita cada parcela diante de Aldric. "Assim, quando esquecer, o reino inteiro poderá lembrar."' },
        ],
      },
    },
  },
  {
    id: 'eco_lucas_cavaleiro', speaker: 'lucas', topic: 'O preço da espada', kind: 'familia', minDay: 14, followup: true, cause: 'lucasCavaleiro',
    cond: (s) => !!s.flags.lucasCavaleiro,
    nodes: {
      start: {
        text: '"Você mandou que eu treinasse com Aurelian." Lucas mostra um braço enfaixado. "Treinei. Agora os cavaleiros querem que eu lidere uma patrulha de verdade. Mãe diz que um príncipe não deve arriscar o pescoço. Aurelian diz que não sou mais só um príncipe."',
        choices: [
          { label: 'Liderar com escolta discreta', sub: 'Coragem com proteção', color: 'azul', icon: 'escudo', effects: { rel: { lucas: 13, aurelian: 6, isabelle: -3 }, res: { moral: 4 }, flags: { lucasPatrulha: true }, xp: 14 }, reply: 'Lucas percebe a escolta no segundo quilômetro. Finge que não percebe. Volta com dois bandidos e uma história quase verdadeira.' },
          { label: 'Pedir que espere mais', sub: 'Proteger o irmão', color: 'verde', icon: 'coracao', effects: { rel: { lucas: -7, isabelle: 8 }, flags: { lucasFrustrado: true }, xp: 8 }, reply: '"Então a espada era decoração." Ele sai. Mais tarde, pede desculpas sem retirar a frase.' },
          { label: 'Mandá-lo sem escolta', sub: 'Provar valor', color: 'vermelho', icon: 'espadas', effects: { rel: { lucas: 8, isabelle: -11 }, res: { prestigio: 2, moral: -3 }, flags: { lucasRisco: true }, xp: 13 }, reply: 'Lucas volta vivo e com o rosto fechado. "Consegui. Não gostei de quem me pediu para conseguir."' },
        ],
      },
    },
  },
  {
    id: 'eco_lucas_diplomata', speaker: 'lucas', topic: 'A primeira negociação de Lucas', kind: 'familia', minDay: 13, followup: true, cause: 'lucasDiplomata',
    cond: (s) => !!s.flags.lucasDiplomata,
    nodes: {
      start: {
        text: 'Lucas volta de uma reunião que você o mandou acompanhar. "Convenci dois vassalos Seren a abrir uma rota de madeira. Só prometi que a coroa pagaria a ponte. Aldric ficou branco. Ele já era branco, mas conseguiu piorar."',
        choices: [
          { label: 'Honrar a promessa dele', sub: '−90 ouro, rota aberta', color: 'azul', icon: 'aperto', req: { ouro: 90 }, effects: { res: { ouro: -90, influencia: 2 }, loyalty: { seren: 7 }, rel: { lucas: 14, aldric: -3 }, flags: { lucasAcordo: true }, xp: 15 }, reply: '"Então minha palavra vale alguma coisa." Lucas sorri como no dia em que aprendeu a escrever o próprio nome.' },
          { label: 'Fazê-lo renegociar', sub: 'Aprender limites', color: 'dourado', icon: 'pergaminho', effects: { rel: { lucas: 5, aldric: 6 }, loyalty: { seren: -3 }, flags: { lucasRenegocia: true }, xp: 13 }, reply: 'Lucas volta com metade da ponte paga pelos Seren. "Desta vez perguntei o preço antes de sorrir."' },
          { label: 'Desautorizar em público', sub: 'Guardar a hierarquia', color: 'vermelho', icon: 'coroa', effects: { rel: { lucas: -18 }, loyalty: { seren: -5 }, res: { prestigio: 2 }, flags: { lucasHumilhado: true }, xp: 7 }, reply: 'Os lordes aprendem que o príncipe fala sem mandato. Lucas aprende que o irmão pode retirá-lo diante de todos.' },
        ],
      },
    },
  },
  {
    id: 'eco_portoes_abertos', speaker: 'marta', topic: 'O preço dos portões abertos', kind: 'audiencia', minDay: 5, followup: true, cause: 'portoesAbertos',
    cond: (s) => !!s.flags.portoesAbertos,
    nodes: {
      start: {
        text: '"O senhor mandou abrir os portões ao povo." Marta aponta a fila que dobra o pátio. "Agora o povo vem. Com fome, dívidas e histórias que não cabem numa hora. O guarda quer fechar. Eu quero saber se sua promessa vale quando a fila atrapalha o banquete."',
        choices: [
          { label: 'Criar mesa de petições', sub: '−80 ouro, acesso permanente', color: 'verde', icon: 'pergaminho', req: { ouro: 80 }, effects: { res: { ouro: -80, povo: 7 }, rel: { marta: 12, aldric: -5 }, flags: { mesaPeticões: true }, xp: 16 }, reply: 'Marta organiza senhas por urgência. Pimenta vende senhas falsas por uma manhã, é descoberto e passa a ajudar de graça.' },
          { label: 'Abrir só dois dias por semana', sub: 'Equilibrar agenda', color: 'azul', icon: 'ampulheta', effects: { res: { povo: 2 }, rel: { marta: 4, aldric: 6 }, flags: { portoesLimitados: true }, xp: 12 }, reply: 'A fila diminui. Marta diz que dois dias são melhores que nenhum, mas lembra que fome não usa calendário.' },
          { label: 'Fechar de novo', sub: 'Priorizar a corte', color: 'vermelho', icon: 'selo', effects: { res: { povo: -10, prestigio: 1 }, rel: { marta: -15 }, flags: { portoesAbertos: false }, xp: 7 }, reply: 'As dobradiças rangem. Do lado de fora, alguém grita que a coroa só abriu para parecer bonita.' },
        ],
      },
    },
  },
  {
    id: 'eco_galinha_ignorada', speaker: 'campones', topic: 'A revolta dos ovos', kind: 'audiencia', minDay: 5, followup: true, cause: 'ignored_galinha_julgamento',
    cond: (s) => !!s.flags.ignored_galinha_julgamento,
    nodes: {
      start: {
        text: '"O senhor não quis julgar minha galinha." Oswin pousa uma cesta de ovos no chão. "Então o vizinho julgou sozinho. Condenou a galinha por invasão de quintal. Agora metade da aldeia quer libertá-la, a outra metade quer cobrar aluguel dos ovos."',
        choices: [
          { label: 'Anular o julgamento', sub: 'Justiça tardia', color: 'azul', icon: 'martelo', effects: { res: { povo: 4 }, rel: { campones: 8 }, xp: 12 }, reply: 'A galinha sai livre. Pimenta propõe um feriado em sua homenagem. Aldric ameaça se aposentar.' },
          { label: 'Pagar pelo galinheiro novo', sub: '−25 ouro, encerrar a disputa', color: 'dourado', icon: 'moedas', req: { ouro: 25 }, effects: { res: { ouro: -25, povo: 2 }, rel: { campones: 7 }, xp: 10 }, reply: 'Oswin aceita. A galinha muda de casa. O vizinho processa o galinheiro, mas ninguém leva a sério.' },
          { label: 'Ignorar outra vez', sub: 'A aldeia não esquecerá', color: 'vermelho', icon: 'coroa', effects: { res: { povo: -5 }, rel: { campones: -10 }, xp: 4 }, reply: 'Oswin pega os ovos e vai embora. Na praça, a história vira a balada do Rei que Tinha Medo de Galinhas.' },
        ],
      },
    },
  },
  {
    id: 'eco_pao_ignorado', speaker: 'marta', topic: 'A fila da padaria', kind: 'urgente', minDay: 5, followup: true, cause: 'ignored_preco_pao',
    cond: (s) => !!s.flags.ignored_preco_pao,
    nodes: {
      start: {
        text: '"Eu pedi que ouvisse o preço do pão. O senhor não veio." Marta traz uma tábua rachada da padaria. "Hoje cinquenta pessoas brigaram por vinte pães. O padeiro não é ladrão; a farinha é que não chega. O que devo dizer a elas?"',
        choices: [
          { label: 'Comprar farinha para a cidade', sub: '−100 ouro, acalmar a praça', color: 'verde', icon: 'trigo', req: { ouro: 100 }, effects: { res: { ouro: -100, povo: 8 }, rel: { marta: 10 }, xp: 14 }, reply: 'A primeira fornada sai antes do anoitecer. Marta diz que não trouxe a tábua para decorar o salão.' },
          { label: 'Pedir investigação das rotas', sub: 'Olhar a causa, não o grito', color: 'azul', icon: 'olho', effects: { res: { povo: 2, influencia: 2 }, rel: { marta: 5, tobias: -5 }, flags: { paoInvestigado: true }, xp: 14 }, reply: 'Os carros da Guilda desviavam farinha para vender mais caro na fronteira. Tobias chama de engano logístico. Ninguém acredita.' },
          { label: 'Mandar dispersar a fila', sub: '−povo, +prestígio nobre', color: 'vermelho', icon: 'espadas', effects: { res: { povo: -12, prestigio: 2 }, rel: { marta: -15 }, xp: 6 }, reply: 'A fila se dispersa. A fome volta para casa com cada pessoa. À noite, uma janela do palácio quebra.' },
        ],
      },
    },
  },
  {
    id: 'eco_grao_norte', speaker: 'sigrid', topic: 'Os sacos de grão chegaram', kind: 'audiencia', minDay: 13, followup: true, cause: 'sigridGrao',
    cond: (s) => !!s.flags.sigridGrao,
    nodes: {
      start: {
        text: '"Aquelas sacas que você enviou chegaram ao norte. Trinta famílias comeram." Sigrid mostra uma carta com manchas de gordura. "Ragnar chamou de suborno e prendeu o carregador. Podemos dizer que foi um presente real e forçá-lo a soltá-lo, mas aí todos saberão que você me ouviu."',
        choices: [
          { label: 'Assumir o envio em público', sub: 'Salvar o carregador', color: 'verde', icon: 'coroa', effects: { rel: { sigrid: 13, haakon: 3 }, loyalty: { drakon: -7 }, res: { povo: 4, prestigio: 2 }, flags: { graoAssumido: true }, xp: 15 }, reply: 'Ragnar liberta o homem para não parecer que teme um saco de grão. Sigrid guarda a carta ao lado da cama.' },
          { label: 'Trocar o homem por informações', sub: 'Diplomacia secreta', color: 'roxo', icon: 'mascara', effects: { rel: { sigrid: 2 }, res: { influencia: 4 }, flags: { carregadorEspiao: true }, xp: 13 }, reply: 'O carregador volta com nomes de três jarls famintos. Sigrid pergunta se toda bondade precisa virar arma.' },
          { label: 'Não intervir', sub: 'Manter o segredo', color: 'dourado', icon: 'escudo', effects: { rel: { sigrid: -13 }, res: { prestigio: 1 }, xp: 6 }, reply: '"Entendi. O grão era secreto, o homem é descartável." Ela sai antes de você encontrar outra palavra.' },
        ],
      },
    },
  },
  {
    id: 'eco_rainha_elenora', speaker: 'elenora', topic: 'A primeira ordem da rainha', kind: 'familia', minDay: 22, followup: true, cause: 'noiva',
    cond: (s) => s.spouse === 'elenora',
    nodes: {
      start: {
        text: (s) => `"Meu pai quer que eu assine uma exclusividade para os portos." Elenora rasga uma cópia diante de você. "${s.flags.elenoraAutonomia ? 'Você prometeu que eu decidiria por mim. Vou começar agora.' : 'Ainda não sei se você me vê como aliada ou como selo dos Valmont.'} Quero abrir metade dos cais a navios menores. Gaspard me chamou de ingrata. Foi quase um elogio."`,
        choices: [
          { label: 'Apoiar a ordem dela', sub: 'Comércio livre, Valmont perde', color: 'verde', icon: 'aperto', effects: { rel: { elenora: 16, gaspard: -12 }, loyalty: { valmont: -9 }, res: { povo: 4 }, flags: { caisAbertos: true }, xp: 17 }, reply: '"Então somos dois ingratos." Ela o beija na face diante de Gaspard, que finge olhar para a janela.' },
          { label: 'Negociar com Gaspard', sub: 'Metade do ganho político', color: 'azul', icon: 'moedas', effects: { rel: { elenora: 4, gaspard: 6 }, loyalty: { valmont: 5 }, res: { ouro: 90 }, xp: 13 }, reply: 'Elenora concorda com a transição. Depois lembra, em privado, que pedir sua opinião antes seria mais rápido que convencer o pai dela.' },
          { label: 'Vetar a ordem', sub: 'Um contrato acima da rainha', color: 'vermelho', icon: 'selo', effects: { rel: { elenora: -20, gaspard: 13 }, loyalty: { valmont: 8 }, xp: 7 }, reply: '"Entendi." Ela dobra o decreto com cuidado. No jantar, dirige a você apenas títulos.' },
        ],
      },
    },
  },
  {
    id: 'eco_rainha_rhoswen', speaker: 'rhoswen', topic: 'Quem comanda a fronteira?', kind: 'conselho', minDay: 22, followup: true, cause: 'noiva',
    cond: (s) => s.spouse === 'rhoswen',
    nodes: {
      start: {
        text: (s) => `"Os capitães da fronteira aguardam minha ordem." Rhoswen pousa uma espada e a coroa dela lado a lado. "${s.flags.rhoswenIgual ? 'Você disse que ficaríamos do mesmo lado.' : 'No casamento você me deu um lugar ao seu lado.'} Agora metade do conselho insiste que uma rainha deve ficar longe do mapa. Eu quero ir inspecionar o Passo Cinzento."`,
        choices: [
          { label: 'Ir com ela', sub: 'Governar no terreno', color: 'verde', icon: 'espadas', effects: { rel: { rhoswen: 16, brandt: 6 }, res: { moral: 6 }, flags: { casalNoPasso: true }, xp: 17 }, reply: '"Leve botas decentes, rei." Os soldados veem os dois chegando juntos e endireitam a postura antes de receber qualquer ordem.' },
          { label: 'Mandá-la com escolta', sub: 'Confiar sem controlar', color: 'azul', icon: 'escudo', effects: { rel: { rhoswen: 10 }, loyalty: { drakon: 5 }, flags: { rainhaNoPasso: true }, xp: 14 }, reply: 'Ela dispensa metade da escolta e envia relatórios melhores que os de Brandt. Ele reclama do conteúdo. Não consegue contestá-lo.' },
          { label: 'Pedir que fique', sub: 'A corte vence', color: 'dourado', icon: 'coroa', effects: { rel: { rhoswen: -18 }, res: { prestigio: 2, moral: -4 }, xp: 7 }, reply: 'A espada fica sobre a mesa o dia todo. Ela não a pega, mas você entende que a conversa não acabou.' },
        ],
      },
    },
  },
  {
    id: 'eco_rainha_isolde', speaker: 'isolde', topic: 'A assinatura de Isolde', kind: 'conselho', minDay: 22, followup: true, cause: 'noiva',
    cond: (s) => s.spouse === 'isolde',
    nodes: {
      start: {
        text: (s) => `"Meu irmão enviou o contrato final. Incluiu uma cláusula que chama a frota de 'presente', mas cobra o uso do porto." Isolde bate o leque na linha. "${s.flags.contratoLido ? 'Você leu o primeiro contrato comigo. Encontre o truque neste.' : 'É o truque que avisei que ele tentaria.'} Vamos responder como marido e mulher ou como dois países assustados?"`,
        choices: [
          { label: 'Rasgar a cláusula juntos', sub: 'Parceiros contra Véridian', color: 'verde', icon: 'pergaminho', effects: { rel: { isolde: 17 }, loyalty: { valmont: 4 }, res: { prestigio: 3 }, flags: { contratoRefeito: true }, xp: 17 }, reply: '"Meu irmão vai odiar." Ela passa a pena para você. "É a primeira vez que isso me diverte."' },
          { label: 'Trocar acesso por navios', sub: 'Negócio difícil', color: 'azul', icon: 'aperto', effects: { rel: { isolde: 8 }, loyalty: { valmont: -6 }, res: { ouro: 140 }, flags: { portoAlugado: true }, xp: 14 }, reply: 'Isolde reescreve a cláusula em três línguas. O irmão dela aceita. Gaspard lê a tradução e xinga nas três.' },
          { label: 'Assinar sem ler', sub: 'Confiança ou descuido?', color: 'dourado', icon: 'selo', effects: { rel: { isolde: -12 }, loyalty: { valmont: -12 }, res: { prestigio: -3 }, xp: 6 }, reply: '"Não confunda confiança com ausência." Isolde toma a pena da sua mão e impede a assinatura. O casamento sobrevive; seu orgulho, menos.' },
        ],
      },
    },
  },
  {
    id: 'eco_rainha_sigrid', speaker: 'sigrid', topic: 'Refugiados do degelo', kind: 'urgente', minDay: 22, followup: true, cause: 'noiva',
    cond: (s) => s.spouse === 'sigrid',
    nodes: {
      start: {
        text: (s) => `"Cem famílias cruzaram o passo. Não vieram como soldados." Sigrid mostra o registro de crianças e idosos. "${s.flags.sigridGrao ? 'O grão que enviamos salvou algumas; outras ficaram para trás.' : 'A colheita do norte falhou.'} Brandt quer fechar a muralha. Meu pai quer fingir que ninguém saiu. E eu sou rainha dos dois lados desta neve."`,
        choices: [
          { label: 'Receber as famílias', sub: '−160 ouro, paz entre povos', color: 'verde', icon: 'povo', req: { ouro: 160 }, effects: { res: { ouro: -160, povo: 6 }, rel: { sigrid: 18, brandt: -9 }, loyalty: { drakon: -6 }, flags: { refugiadosAcolhidos: true }, xp: 17 }, reply: 'Sigrid acompanha a primeira carroça. Uma menina a reconhece pelas histórias do norte e a chama pelo nome, sem título.' },
          { label: 'Abrir acampamento vigiado', sub: '−80 ouro, acordo difícil', color: 'azul', icon: 'escudo', req: { ouro: 80 }, effects: { res: { ouro: -80, povo: 2 }, rel: { sigrid: 7, brandt: 4 }, flags: { refugiadosVigiados: true }, xp: 14 }, reply: 'Ninguém fica sem abrigo. Sigrid passa a noite verificando se os guardas entenderam a diferença entre vigiar e humilhar.' },
          { label: 'Fechar o passo', sub: 'Drakon agradece, Sigrid não', color: 'vermelho', icon: 'selo', effects: { loyalty: { drakon: 10 }, rel: { sigrid: -24 }, res: { prestigio: 2 }, flags: { refugiadosBarrados: true }, xp: 7 }, reply: '"No observatório você me perguntou o que eu queria. Hoje respondeu por mim." Ela deixa a sala antes que Brandt comemore.' },
        ],
      },
    },
  },
  {
    id: 'eco_guardas_cansados', speaker: 'aurelian', topic: 'O turno que não terminou', kind: 'urgente', minDay: 6, followup: true, cause: 'ignored_rotina_guardas',
    cond: (s) => !!s.flags.ignored_rotina_guardas,
    nodes: {
      start: {
        text: '"Quando pedi uma decisão sobre os turnos da guarda, ninguém veio." Aurelian tira o elmo. "Um sentinela dormiu em pé depois de duas noites. Dois ladrões passaram pelo portão. Não peço punição para o homem que caiu; peço homens que possam dormir."',
        choices: [
          { label: 'Reforçar a ronda', sub: '−90 ouro, recuperar a segurança', color: 'azul', icon: 'escudo', req: { ouro: 90 }, effects: { res: { ouro: -90, moral: 5, povo: 2 }, rel: { aurelian: 10 }, flags: { rondaReforcada: true }, xp: 14 }, reply: 'Os novos turnos entram em vigor ao anoitecer. Aurelian manda o sentinela para casa antes de mandar prendê-lo por cochilar.' },
          { label: 'Retirar homens das festas nobres', sub: 'Nobres protestam, guardas descansam', color: 'verde', icon: 'coroa', effects: { res: { moral: 4, prestigio: -3 }, loyalty: { montclair: -5 }, rel: { aurelian: 8 }, flags: { guardaDasFestas: true }, xp: 15 }, reply: 'Otho ameaça escrever ao conselho. Aurelian entrega papel e tinta. Nenhum guarda é desviado para levar a carta.' },
          { label: 'Punir o sentinela', sub: 'A causa permanece', color: 'vermelho', icon: 'selo', effects: { res: { moral: -8, prestigio: 2 }, rel: { aurelian: -14 }, flags: { sentinelaPunido: true }, xp: 6 }, reply: 'A punição é anunciada. Na noite seguinte, três homens escondem que mal conseguem ficar acordados.' },
        ],
      },
    },
  },
  {
    id: 'eco_enfermaria_vazia', speaker: 'irma', topic: 'A cama que faltou', kind: 'urgente', minDay: 7, followup: true, cause: 'ignored_rotina_ervas',
    cond: (s) => !!s.flags.ignored_rotina_ervas,
    nodes: {
      start: {
        text: '"Deixei a caixa vazia de remédios no salão quando não fui atendida." Irmã Hedda a traz de volta. "Agora há uma criança com febre e um guarda ferido esperando a mesma última atadura. Quero suprimentos, não uma explicação bonita."',
        choices: [
          { label: 'Comprar tudo de uma vez', sub: '−100 ouro, enfermaria abastecida', color: 'verde', icon: 'coracao', req: { ouro: 100 }, effects: { res: { ouro: -100, povo: 5, moral: 2 }, rel: { irma: 12 }, flags: { enfermariaAbastecida: true }, xp: 15 }, reply: 'Hedda atende os dois antes de olhar para você. "Era disso que eu precisava. Pode guardar a explicação para quem pedir."' },
          { label: 'Requisitar os tecidos da corte', sub: 'Prestígio −2, feridos atendidos', color: 'azul', icon: 'pergaminho', effects: { res: { povo: 3, prestigio: -2 }, rel: { irma: 8, isabelle: -3 }, flags: { linhoRequisitado: true }, xp: 13 }, reply: 'A mesa de Otho perde as toalhas. A enfermaria ganha ataduras. Ele protesta que linho fino não foi feito para sangue; Hedda discorda.' },
          { label: 'Priorizar o guarda', sub: 'A cidade vê quem ficou de fora', color: 'vermelho', icon: 'escudo', effects: { res: { moral: 2, povo: -8 }, rel: { irma: -15 }, flags: { criancaPreterida: true }, xp: 6 }, reply: 'Hedda faz o que pode pela criança com água e pano velho. Depois devolve a caixa vazia ao seu trono.' },
        ],
      },
    },
  },
  {
    id: 'eco_colheita_perdida', speaker: 'campones', topic: 'A terra sem semente', kind: 'audiencia', minDay: 12, followup: true, cause: 'ignored_rotina_sementes',
    cond: (s) => !!s.flags.ignored_rotina_sementes,
    nodes: {
      start: {
        text: '"Eu pedi sementes. O senhor tinha outras pessoas esperando; eu vi." Oswin abre a mão cheia de terra seca. "Quatro famílias não plantaram. O credor agora quer os campos delas. Ainda há tempo de salvar a próxima safra, mas não de fingir que esta nasceu."',
        choices: [
          { label: 'Comprar sementes e perdoar dívidas', sub: '−140 ouro, salvar famílias', color: 'verde', icon: 'trigo', req: { ouro: 140 }, effects: { res: { ouro: -140, povo: 6 }, loyalty: { seren: -5 }, rel: { campones: 13 }, flags: { familiasSalvas: true }, xp: 16 }, reply: 'Oswin conta os sacos antes de agradecer. "Desta vez não prometerei colheita. Só trabalho."' },
          { label: 'Negociar prazo com o credor', sub: 'Solução parcial', color: 'azul', icon: 'aperto', effects: { res: { povo: 2, influencia: -2 }, loyalty: { seren: 3 }, rel: { campones: 4 }, flags: { dividaCamponesaAdiada: true }, xp: 12 }, reply: 'O credor aceita esperar um inverno. Oswin chama isso de tempo emprestado, e pergunta a taxa.' },
          { label: 'Deixar o contrato valer', sub: 'Casa Seren aprova', color: 'dourado', icon: 'pergaminho', effects: { res: { povo: -8 }, loyalty: { seren: 7 }, rel: { campones: -15 }, flags: { camposPerdidos: true }, xp: 6 }, reply: 'As famílias entregam as terras. A lei é obedecida. Na praça, ninguém confunde isso com justiça.' },
        ],
      },
    },
  },
];
