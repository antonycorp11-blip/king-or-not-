# Assets pendentes: expansão (Praça da Coroa, Investigação, Pronunciamentos)

Tudo abaixo já funciona no jogo com placeholder desenhado em código. Quando a arte chegar, é só trocar.

## Praça da Coroa (`src/render/square.ts`)
Hoje a fachada, a varanda, os estandartes e o chão são desenhados em canvas.

1. **Fachada do castelo vista da praça**: 960×280, pixel art, com a muralha, duas torres e o portão central. Três versões: manhã, entardecer e noite.
2. **Varanda / palanque real**: balaústre de pedra com um pano azul e dourado da coroa, em PNG transparente, cerca de 180×40.
3. **Chão da praça**: textura de calçamento com fileiras em perspectiva, 960×330.
4. **Estandartes**: coroa, Valmont, Drakon, Seren e Montclair, cada um com 2 quadros de vento.
5. **Elementos da praça**: fonte, poste com tocha (animado, 3 quadros), carroça, barracas de feira e forca (para a execução).
6. **Guardas cerimoniais**: sprite top-down de frente, com lança e capa azul (hoje o jogo usa `guarda`).
7. **Figurantes de costas**: variações extras de cidadão vistas de trás, 128×160 no formato das folhas top-down.
   - Povo: 8 variações, homens e mulheres.
   - Mercadores: 3 variações.
   - Religiosos: 2 variações.
   - Nobres: 3 variações.
8. **Poses de reação dos figurantes**, 2–3 quadros cada:
   - braços para cima (vibrando);
   - punho erguido (vaia/raiva);
   - aplaudindo;
   - atirando objeto;
   - acenando lenço;
   - soldado batendo no escudo.
9. **Faixas e cartazes em branco**: tábua e pano em PNG transparente; o texto é escrito pelo jogo.
10. **Objetos atirados**: tomate, repolho e flor, cada um em 16×16, com um splat.
11. **Bandeirinhas de festa e pétalas**: sprites pequenos.
12. **O rei de frente na varanda**: pose de discurso com o braço erguido, 2 quadros.
13. **A rainha de frente na varanda**: cada uma das 4 esposas, acenando.

## Investigação (`src/ui/screens/investigation.ts`)
14. **Mesa de investigação**: fundo de cortiça ou madeira com mapa do castelo, 1280×720.
15. **Cartões**:
    - cartão de suspeito com moldura e alfinete;
    - papel de evidência nos tipos documento, físico, testemunho e rumor.
16. **Fio vermelho e alfinetes**: textura de linha e cabeça de alfinete.
17. **Retratos de investigação**: versão "sombria" dos 5 suspeitos (Corvin, Brandt, Isabelle, Otho e Aldric), com expressões neutro, nervoso e culpado.
18. **Evidências físicas**, ícones de 64×64:
    - a taça com mel;
    - o frasco de raiz;
    - o livro da portaria;
    - a chave;
    - a bolsa de moedas;
    - o bilhete de Odran;
    - a página raspada;
    - a pedra de Cinzel.
19. **Pimenta**: retrato com expressões séria, chorando e escondido (sem guizos), além de um sprite lateral "tropeçando".

## Pronunciamentos
20. **Ícones de tom**: conciliador, inspirador, autoritário, populista, religioso, militarista, honesto e manipulador.
21. **Ícones de grupo**: povo, mercadores, soldados, religiosos e nobres. Hoje o jogo usa os ícones gerais.
22. **Sons**, se entrarem no jogo: aplauso, vaia, murmúrio, grito de "viva", escudos batendo e sino.
