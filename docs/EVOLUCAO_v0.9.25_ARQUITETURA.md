# Mundo Prisma v0.9.25 — Arquitetura e acabamento

Alinhado ao GDD, seções 4, 9 e 10: peças reconhecíveis, orientação correta e visual voxel leve.

- Portas abertas e fechadas (incluindo as duas metades) receberam painéis, molduras, puxadores metálicos e vidraças divididas; colisões antigas foram preservadas.
- Janelas emolduradas têm quatro painéis transparentes, travessas e peitoril; os vidros bloqueiam fisicamente a passagem. A orientação existente da janela foi mantida.
- Telhas, tijolos, pisos, reboco e vigas receberam acabamento procedural no shader, sem novas texturas, modelos ou malhas por bloco comum.
- IDs, receitas, gerador e schema dos mundos não mudaram. O visual da mão v0.9.24 foi preservado.
- A aparência completa em WebGL e o FPS em dispositivos reais exigem validação. O renderizador de software não replica todos os shaders.

Teste: `node tests/architecture.test.cjs`.
