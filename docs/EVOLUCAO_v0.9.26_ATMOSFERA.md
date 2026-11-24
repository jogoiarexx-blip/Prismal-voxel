# Mundo Prisma v0.9.26 — Luz e atmosfera

GDD §§ 10–11: luz e shaders escaláveis.

- Sombra aproximada por cobertura, calculada pelo worker e incorporada ao atributo de luz existente: interiores, pisos cobertos e móveis sob telhados ficam mais escuros; vidro deixa passar luz. Não é um shadow map solar nem propagação voxel completa.
- Luz de até oito fontes com atenuação quadrática, direção da face, soma limitada e oscilação discreta; paredes ainda não bloqueiam integralmente a iluminação pontual.
- Água com reflexo procedural do céu, transparência dependente do ângulo, ondas e brilho solar no médio/alto. Não reflete a geometria real.
- Céu com crepúsculo, lua texturizada proceduralmente, estrelas e nuvens; segunda camada no alto. Qualidade gráfica é independente da redução de movimento, que congela a animação.
- Fallback de software recebe iluminação pontual aproximada com cache por bloco visível, sem reproduzir todos os shaders.
- Nenhum ID, receita, gerador ou schema de save alterado. Sem texturas externas, novos passes ou buffers de iluminação na GPU.

Testes: `node tests/atmosphere.test.cjs` e demais suítes. Medir FPS em celulares reais e verificar WebGL antes de declarar estabilidade final.
