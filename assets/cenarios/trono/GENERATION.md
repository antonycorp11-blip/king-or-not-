# Arte do salão do trono

Gerada com a ferramenta integrada `image_gen`, em uma única chamada. O arquivo original com transparência é `atlas.png` (1254 × 1254). O gerador não entregou os 2048 × 2048 solicitados; os recortes no renderizador usam as dimensões efetivamente recebidas.

O atlas contém 16 regiões. Piso, paredes, tapete e degraus são montados separadamente. Colunas, trono, velas, armaduras, plantas e estátuas têm instâncias com posição e profundidade em `src/render/throneHall.ts`. Os limites sólidos são metadados para a futura etapa de navegação; ainda não são um sistema de colisão.

## Prompt utilizado

Use case: stylized-concept. Asset type: production 2D game TILESET / sprite atlas, NOT a finished room illustration.
Input image: visual STYLE reference for the medieval castle, specifically the central throne room. Match its detailed crisp pixel-art materials, cool gray stone, crimson velvet, gold filigree, warm candlelight, blue heraldry. Camera is orthographic RPG top-down three-quarter view (see top surfaces and front faces), NOT isometric, no vanishing point.
Create ONE square 2048x2048 transparent PNG sprite atlas with an EXACT 4 COLUMN x 4 ROW regular grid of equal 512x512 cells, no visible grid and no text. Each cell contains ONLY the specified isolated asset. Keep objects entirely inside their cell, generous transparent margin, no overlapping neighbors. Tiles in row 1 may be opaque square textures; every other sprite has genuine alpha transparency.
ROW 1 left to right:
1. seamless square warm-gray limestone flagstone FLOOR TILE seen from directly above, small staggered rectangular slabs, softly mottled detailed stone, subtle grout, no border, fills cell edge to edge.
2. seamless gray castle masonry WALL FRONT texture, horizontal staggered stone blocks, fills cell edge to edge, no objects.
3. vertical crimson velvet CARPET RUNNER TILE seen from above, parallel narrow ornate gold borders on left and right, continuous plain red center, square fills cell; ends connect vertically, NO fringe.
4. wide short frontal THREE STONE STEPS isolated, warm gray stone, visible horizontal treads and front risers, transparent surroundings, occupies lower-middle of cell.
ROW 2:
1. majestic EMPTY front-facing golden royal THRONE, red velvet seat and tall back, lion finials, intricate gold carvings, viewed slightly from above, no platform no carpet.
2. tall square-section gray stone COLUMN with decorated capital and wide plinth, visible top cap, matching reference architecture.
3. hanging crimson royal BANNER with gold lion rampant heraldry, gold hanging rod and pointed bottom.
4. hanging navy-blue BANNER with golden lion rampant heraldry, gold rod and pointed bottom.
ROW 3:
1. tall narrow gothic arched WINDOW with thick carved pale stone surround, blue glass panes, warm light along sill, transparent outside surround.
2. ornate tall brass five-arm CANDELABRUM with five lit ivory candles, weighted base, slight overhead view.
3. standing EMPTY suit of silver medieval ARMOR with closed helmet holding a vertical spear, small stone base; decorative armor NOT living character.
4. pale marble STATUE of medieval robed figure on square stone pedestal, top-down three-quarter view.
ROW 4:
1. lush small leafy green ornamental shrub in a round terracotta POT, visible soil and pot rim.
2. low round brass BRAZIER with glowing embers and small orange flame, three short feet, viewed from above.
3. closed heavy medieval oak DOUBLE DOOR with gray stone arched frame, brass fittings, front-facing slightly overhead.
4. square crimson CARPET MEDALLION floor tile: elaborate golden lion rampant in center, fine red textile, left/right gold borders identical to row1 col3, seamless top/bottom, no fringe, fills cell.
All sprites finely detailed at useful game scale, consistent pixel density, no labels, no captions, no people, no scenery background, no complete room, no checkerboard painted into image. Perfect regular grid required for programmatic source rectangles.
