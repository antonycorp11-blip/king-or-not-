# Arte pendente dos cômodos do castelo

O jogo já tem Quarto do Rei, Aposentos Reais, Sala do Conselho, Pátio e Quartel, e Capela
jogáveis, com móveis desenhados em código como placeholder. Cada cômodo troca os
placeholders pela arte gerada **automaticamente** quando o arquivo existir:

```
assets/cenarios/quarto/atlas.png
assets/cenarios/aposentos/atlas.png
assets/cenarios/conselho/atlas.png
assets/cenarios/patio/atlas.png
assets/cenarios/capela/atlas.png
```

Formato de cada arquivo, igual ao `trono/atlas.png`: **um PNG quadrado com fundo
transparente, grade 4 colunas × 4 linhas de células iguais**, um objeto isolado por
célula, na ordem abaixo (esquerda → direita, linha por linha). As células 1 e 2 são
texturas que preenchem a célula inteira (piso e parede). As demais são objetos soltos,
com margem transparente; o jogo recorta a margem sozinho. Não precisa ser exatamente
2048 px: qualquer tamanho quadrado serve.

Referência visual: `referencias/castelo_referencia_visual.png` (anexe junto com o
atlas do salão `assets/cenarios/trono/atlas.png`, para manter a mesma escala e acabamento).

## Prompt comum (use no começo de todos)

> Asset type: production 2D game SPRITE ATLAS, not a finished room. Style: match the
> attached references exactly: detailed crisp 32-bit pixel art, warm candlelit medieval
> castle interior, rich wood, crimson and navy velvet, gold trim, cozy lived-in props.
> Camera: orthographic RPG top-down three-quarter view (you see the top and the front
> face of every object), NOT isometric, no perspective vanishing point, same camera and
> pixel density as the attached throne-room atlas. ONE square transparent PNG with an
> EXACT 4 columns x 4 rows grid of equal cells, no visible grid lines, no text, no
> labels, no people. Each cell contains ONLY the listed isolated object, centered, fully
> inside its cell with generous transparent margin. Cells 1 and 2 are seamless textures
> that fill their cell edge to edge. Every other object has real alpha transparency,
> no background, no floor under it, no drop shadow baked in.

## 1. Quarto do Rei — `quarto/atlas.png`

1. piso: seamless dark polished oak plank floor, seen from above
2. parede: seamless wall texture, pale stone upper part with dark carved wood wainscot below
3. tapete: large crimson rug with gold lion border, seen from above
4. cama: huge royal four-poster bed, crimson velvet canopy and blanket, gold finials, white pillows
5. escrivaninha: carved oak writing desk covered with letters, a wax seal, inkwell and quill
6. cadeira: carved wooden armchair with crimson cushion
7. estante: tall bookshelf full of old leather books
8. armario: tall dark oak wardrobe with brass handles
9. lareira: stone fireplace with a lit fire, iron grate, mantel with candles
10. bau: iron-banded wooden chest with gold lock
11. janela: gothic window with navy curtains tied open, morning light
12. candelabro: tall standing brass candelabra with lit candles
13. criado: small bedside table with a candle and a book
14. manto: wooden stand holding the royal crimson cloak and a crown on a cushion
15. penteadeira: washstand with basin, pitcher and small mirror
16. planta: small green plant in a terracotta pot

## 2. Aposentos Reais (rainha, rainha-mãe, príncipe) — `aposentos/atlas.png`

1. piso: seamless light honey-colored wooden parquet floor
2. parede: seamless wall texture with soft rose patterned wallpaper and white wood trim
3. tapete: large round pink and cream floral rug
4. cama-rainha: elegant four-poster bed with pale pink curtains and embroidered blanket
5. penteadeira: vanity table with oval gold mirror, perfume bottles and jewelry box
6. biombo: folding wooden dressing screen with painted flowers
7. poltrona: cream upholstered armchair with carved gold wood
8. mesa: small round tea table with porcelain tea set and cakes
9. harpa: golden harp
10. estante: small white bookshelf with books and ornaments
11. janela: tall window with pink curtains and a flower box
12. cama-lucas: young prince's single bed with green blanket, a wooden toy sword on it
13. bau: painted wooden chest with flowers
14. candelabro: slender gold standing candelabra with lit candles
15. flores: large vase with pink roses
16. comoda: white chest of drawers with gold handles

## 3. Sala do Conselho — `conselho/atlas.png`

1. piso: seamless dark wooden floor with inlaid borders
2. parede: seamless wall texture, stone upper part with dark wood panels below
3. tapete: long navy blue rug with gold border
4. mesa-conselho: very long council table seen from above, crimson runner, and in its center FIVE round bronze locks arranged in a circle around a small gold crown emblem
5. cadeira: high-backed wooden council chair with navy cushion
6. trono-conselho: larger carved chair with crimson velvet and gold crown finial (the king's chair)
7. mapa: table with a large painted map of a medieval kingdom, small colored army tokens
8. globo: antique globe on a wooden stand
9. estante: bookshelf with scrolls and ledgers
10. lareira: stone fireplace with lit fire and the royal lion carved above
11. estandarte: navy banner with gold lion on a pole stand
12. candelabro: tall brass candelabra, lit
13. armadura: display suit of armor holding a halberd
14. arquivo: wooden cabinet full of rolled scrolls
15. janela: gothic window with heavy navy curtains
16. planta: tall potted palm

## 4. Pátio e Quartel — `patio/atlas.png` (exterior, luz do dia)

1. piso: seamless worn cobblestone courtyard ground with patches of packed dirt
2. muralha: seamless castle curtain-wall texture, large grey stone blocks
3. grama: seamless short green grass with tiny flowers
4. boneco: straw training dummy on a wooden post with a painted red target
5. armas: wooden weapon rack with spears, swords and shields
6. barril: wooden barrel with iron hoops
7. feno: stack of hay bales
8. poco: round stone well with wooden roof and bucket
9. carroca: wooden cart loaded with sacks
10. estabulo: small stable building front with wooden roof and a horse head at the door
11. quartel: barracks building front, stone walls, red roof, wooden door, royal banner
12. portao: city gate with raised iron portcullis between two small towers
13. braseiro: iron brazier on a tripod with fire
14. alvo: archery target on a wooden stand, arrows stuck in it
15. tenda: small canvas military tent, red and gold
16. mastro: tall flagpole with the navy royal banner

## 5. Capela Real — `capela/atlas.png`

1. piso: seamless pale marble floor with subtle grey veins
2. parede: seamless pale stone chapel wall with carved pilasters
3. tapete: long narrow crimson aisle runner with gold edges
4. altar: stone altar with white and gold altar cloth, gold candlesticks and an open book
5. estatua: marble statue of a robed woman holding an oak branch (the Lady of the Oaks) on a pedestal
6. banco: long wooden church pew
7. vitral: tall stained-glass window with warm colors and an oak tree motif
8. candelabro: very tall iron candelabra with many lit candles
9. confessionario: carved wooden confessional booth with a small curtain
10. pia: stone baptismal font with water
11. velas: cluster of votive candles on a stone shelf
12. pulpito: carved wooden pulpit
13. lapide: stone floor tomb slab with a carved knight effigy
14. estandarte: white and gold religious banner on a stand
15. planta: potted lilies
16. cripta: small iron grate door set in stone steps leading down

## Depois (Fases seguintes, sem pressa)

- Cômodos já previstos no mapa do castelo: Sala do Tesouro, Masmorras, Cozinhas,
  Arquivos Reais, Jardim Interno, Estábulos (mesmo formato de atlas).
- Folhas top-down de personagens novos que o conselho pode usar (mesmo formato de
  `assets/personagens/topdown/`): nenhum obrigatório agora; todos os cargos usam o elenco atual.
- Trilha sonora por clima (`castelo_calmo`, `tensao`, `guerra`, `noite`, `conspiracao`,
  `golpe`, `exilio`, `reconquista`): ainda não integrada, sem arquivos por enquanto.
