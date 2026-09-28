# King or Not?

Jogo 2D em pixel art sobre um rei de 16 anos que herda a coroa às pressas. O jogo avança por **demandas**: a cada dia, lordes, família, conselheiros e o povo pedem coisas ao rei, e o que ele não responde também tem consequência.

## Rodar

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # gera dist/
npm run sim        # joga 300 partidas automáticas e mostra estatísticas (balanceamento)
```

> O servidor de desenvolvimento usa **esbuild**. O Vite não funciona porque o nome da pasta tem `?`. Se a pasta for renomeada, dá para voltar ao Vite.

## Como o jogo funciona

| Sistema | Onde está |
|---|---|
| **Dia em horas** (8h às 20h). Audiência custa 1h, leitura 2h, decreto 1h, conselho de guerra 2h. O céu na janela muda com a hora (CSS). | `engine/day.ts`, `ui/sceneView.ts` |
| **Demandas** (eventos com diálogo e até 4 escolhas coloridas). Algumas duram vários dias; as ignoradas aplicam consequências no fim do dia. | `data/events/*.ts` |
| **Influência** é gasta para suavizar as penalidades políticas de uma escolha (botão "Usar Influência"). | `engine/core.ts` (`softenCost`) |
| **Povo e Governabilidade**: Governabilidade = apoio do povo + prestígio + lealdade das casas. Gera Influência todo dia. Abaixo de 25, há tumulto; com Povo em 0, revolta. | `engine/core.ts` (`governabilidade`), `data/events/people.ts` |
| **Casas e relações**: lealdade de cada casa (−100 a 100) e relação com cada personagem. | tela Corte |
| **Livros** destravam opções de diálogo. A leitura tem um minijogo de atenção. A **árvore de habilidades** (6 ramos) faz o rei crescer; os pontos vêm da experiência. | `data/progression.ts`, tela Biblioteca |
| **Comércio**: produção e necessidades por província, rotas (inclusive exportação para Véridian), impostos e investimento. A escassez derruba a lealdade. | `engine/economy.ts`, tela Províncias |
| **Guerra** estilo War: territórios, dados 3×2, reforços, turno do inimigo. Um turno por dia; se o rei não comandar, o inimigo age mesmo assim. Casas rebeldes também podem iniciar uma guerra civil. | `engine/war.ts`, `data/events/crisis.ts`, tela Guerra |
| **Corte**: convocar personagens com chance de comparecer, trocar cartas e responder a pedidos fora das audiências. Algumas noites trazem encontros inesperados antes do resumo do dia. | `engine/summon.ts`, `engine/letters.ts`, `data/events/night.ts`, tela Corte |
| **Resumo do dia** à noite: renda, casas satisfeitas ou descontentes, leis, demandas ignoradas e rumores. | `engine/day.ts` (`endDay`) |

### Atos I e II (45 dias)

- **Dias 1 a 20: o casamento.** Há quatro pretendentes, e todas têm bônus e ônus (`MARRIAGE_TERMS` em `data/events/marriage.ts`):
  - **Elenora Valmont**: ouro e comércio, mas irrita os Drakon.
  - **Rhoswen Drakon**: exército dobrado, mas irrita os Valmont e deixa os Drakon poderosos demais.
  - **Isolde de Véridian**: aliança estrangeira e exportações em dobro, mas todas as casas desconfiam e os Seren se opõem pela fé.
  - **Sigrid de Norhelm**: evita a guerra, mas os Drakon se revoltam.
- **Dia 22: a consequência.** Pode vir a invasão de Norhelm, a rebelião dos Drakon ou o tributo do norte, conforme as escolhas anteriores.
- **Após o casamento:** conspirações, disputas de herança, conflitos familiares e eventos do front continuam a história até o Dia 45.

## Arte

- **Mapa-diorama** (`src/render/worldmap.ts` + `src/ui/worldMap.ts`): terreno gerado em código (600×300) sobre uma mesa de guerra em perspectiva. Tem estandartes das casas em pé, filtros de cor (casas, lealdade, produção, escassez, rotas, impostos) e movimento: ondas, navios, caravanas nas rotas, fumaça e nuvens. A guerra usa o mesmo mapa, com escudos de exército e setas de ataque.
- **Cenários** (sala do trono, biblioteca, cidade): desenhados em código em `src/render/`. A sala é em vista lateral, 480×270, ampliada 4×. O céu é CSS e muda com a hora.
- **Personagens**: coloque os PNGs gerados em `assets/personagens/` (veja o `LEIA-ME.md` de lá) e recarregue a página. O jogo detecta os arquivos sozinho (`assets/manifest.json` é gerado pelo `npm run dev` e pelo `npm run build`).
  - `NN_id_corpo.png`: grade 6×2 em vista lateral. Linha 1 é a caminhada; linha 2 tem parado, respirando, falando ×2, reverência e ajoelhado. O rei tem as poses sentado na linha 1.
  - `NN_id_retrato.png`: grade 2×2 com as expressões neutro, feliz, irritado e preocupado. O retrato muda conforme a reação à sua escolha.
  - Personagens sem arte usam o boneco provisório desenhado em código (`src/render/actors.ts`), com as mesmas animações.

## Adicionar conteúdo

Um novo evento é só um objeto em `data/events/`. Ele pode ser:
- **fixo**: `day: 12`;
- **aleatório**: `weight`, com `minDay`/`repeat`/`cond`;
- **encadeado**: agendado por uma escolha com `schedule: [{ id, in: 3 }]`.

As escolhas podem exigir livro (`req.knowledge`), ouro, influência ou uma condição qualquer (`req.test`).
