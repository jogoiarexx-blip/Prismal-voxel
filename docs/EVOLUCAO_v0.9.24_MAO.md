# Mundo Prisma 0.9.24 — Mão em primeira pessoa

- Mão e manga voxel em primeira pessoa, inclusive com slot vazio.
- Picaretas de todos os materiais, machado, pá, espada, tocha e blocos com geometrias próprias. As peças especiais usam as formas do catálogo do mundo em miniatura; os itens diversos têm representação simplificada.
- Movimento baseado na velocidade e ciclo de caminhada reais, animação contínua ao minerar, impulso ao colocar blocos e golpear criaturas. A preferência de movimento reduzido é respeitada.
- Controles invertidos espelham a mão; ocultação em menus, pausa e câmera em terceira pessoa.
- Canvas local de 240 × 260 pixels redesenhado somente na troca do item. A animação usa transformações CSS; não altera o renderizador do terreno, o P2P, os IDs ou o formato dos mundos.
- Cache offline inclui o novo módulo. Teste `node tests/held.test.cjs`.

O overlay é um viewmodel projetado em Canvas 2D, não uma nova malha WebGL, e não emite iluminação no mundo. O visual e FPS em partida real devem ser verificados em aparelhos reais.
