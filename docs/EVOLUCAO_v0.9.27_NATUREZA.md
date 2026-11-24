# v0.9.27 — Natureza e materiais procedurais

Referência: GDD §§3.3, 3.4, 9, 10 e 11.

- Campos: gramíneas com alturas variadas e flores âmbar; florestas: folhagem em tons distintos e silhuetas de samambaia; pântanos: vegetação curta em musgo exposto e flores claras. A cobertura é somente visual, determinística e limitada a cinco quads por coluna. Não nasce dentro de água ou de blocos. A malha reutiliza os materiais e buffers existentes.
- Troncos com veios de casca e anéis, copas com grupos de folhas, musgo, areia, gelo e cinzas com padrões próprios. Carvão, cobre, ferro e cristal apresentam depósitos localizados e facetas. Fungos ganham luminosidade visual discreta sem alterar o sistema de luz de jogo.
- O renderizador de software recebe padrões de minério simplificados. Não foram incluídos novos assets externos.
- Nenhuma mudança de seed, versão de gerador, receitas, blocos salvos, colisões ou protocolo P2P. 24 amostras de regiões (3 versões de gerador, 2 seeds, 4 coordenadas) comparadas byte a byte por SHA-256 com a v0.9.26. 21 suítes automatizadas aprovadas, incluindo determinismo, limites geométricos e exclusão de vegetação na água.
- Ainda pendentes: captura visual WebGL e FPS em dispositivos reais; nova geração de árvores, cavernas, rios/cachoeiras e ruínas como opção para novos mundos, sem reescrever mundos antigos.
