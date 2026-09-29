# Elenco top-down

46 folhas individuais geradas com a ferramenta integrada `image_gen`, usando os
retratos existentes como referência. Não há substituição de visitantes por um
personagem genérico no salão.

- Originais transparentes: `assets/raw/topdown/<id>.png`.
- Prompts completos: `assets/raw/topdown/prompts.json` (prompt comum + descrição por ID).
- Arquivos servidos pelo jogo: `<id>.webp`, compressão sem perdas, 384 × 640.
- Células: 128 × 160; âncora dos pés (64, 148).
- Linhas: sul, oeste, leste, norte.
- Colunas: parado, passo esquerdo, passo direito.
- Caminhada: sequência 0, 1, 1, 0, 2, 2. Ao parar ou conversar, usa a pose parada.
  Estas folhas não incluem poses dedicadas de sentar, ajoelhar ou falar;
  esses estados narrativos usam a pose parada no salão top-down.

`src/render/topdown.ts` carrega cada ID separadamente, com até quatro decodificações
simultâneas. Uma falha não impede o restante do elenco de aparecer. Não se espelha
a folha pelo antigo campo `facing`: a direção seleciona a linha correspondente.
Visitantes entram voltados ao trono, saem voltados à porta; patrulhas usam leste/oeste.
A biblioteca ainda usa os sprites laterais, pois seu cenário continua lateral.

## Preparação e validação

Requer Python com Pillow e NumPy para preparar; Pillow para validar.

```sh
npm run topdown:prepare
npm run topdown:check
npm run topdown:test
npm run build
```

O preparador detecta as margens transparentes, recorta as figuras completas,
mantém uma escala comum entre os passos de cada direção e alinha os pés. As correções de orientação
observadas na revisão estão registradas no preparador: um passo do rei e do
mensageiro, a linha leste de Morgana e as linhas laterais de Bruna.

Abra `?personagens=topdown` para conferir o elenco, trocar direção, pausar a
caminhada e buscar pelo nome. A galeria usa o mesmo carregador e os mesmos
recortes do jogo e não altera o save.
