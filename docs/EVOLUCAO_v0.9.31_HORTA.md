# Mundo Prisma v0.9.31 — Horta e companhia

Evolução dos sistemas de agricultura e fauna previstos nas seções 6, 8 e 9 do GDD. Nenhum ID anterior ou gerador foi alterado.

- Cenoura, batata e milho são encontrados ao quebrar grama natural; plante o próprio produto em canteiro vazio. Água a até dois blocos ou chuva sem cobertura permite o crescimento (45, 60 e 75 segundos de simulação irrigada, respectivamente). Cada cultura tem três estágios visuais; trigo mantém seu ciclo anterior.
- Colha usando a interação normal no estágio maduro; devolve o canteiro e três produtos (em sobrevivência). O estado é salvo como edição de terreno e tempo de crescimento. Plantio e colheita são operações do anfitrião no P2P.
- Batata assada, milho assado e sopa de legumes disponíveis nas receitas existentes do forno com carvão; fabricação ainda instantânea. Ícones incorporados, nenhuma dependência externa.
- Interaja com um animal domesticado com a mão vazia para alternar seguir/parar. O estado é persistido e transmitido ao visitante. O animal respeita os limites da navegação local e as colisões existentes; não teletransporta, e segue o anfitrião apenas quando próximo (25 blocos).

## Validação
25 arquivos de teste executados sem falhas, incluindo testes específicos de plantio, irrigação, estágios, recuperação, colheita, duplicação, restrições de visitante, comando de seguir/parar, receitas e meshing. Validação de sintaxe de todos os JS. WebGL real, FPS mobile e P2P em dois dispositivos continuam pendentes. Forno temporizado, galinheiro dedicado e novos desafios regionais ficam para etapa posterior.
