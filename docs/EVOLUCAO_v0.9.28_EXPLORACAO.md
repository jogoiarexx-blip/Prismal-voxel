# Mundo Prisma v0.9.28 — Exploração (gerador 4)

GDD §§3, 12 e 19: terreno determinístico, cavernas conectadas, água e compatibilidade de mundos.

- Novo Mundo e Multiplayer → Criar sala oferecem **Clássico** (padrão, gerador 3) e **Exploração** (gerador 4, opcional).
- Dois conjuntos de túneis ondulantes em profundidades diferentes, alargados por ruído para formar câmaras. Preservam fundo rochoso e pelo menos quatro blocos acima; não adicionam entradas de superfície dedicadas.
- Riacho sinuoso com margens inclinadas, leito arenoso e superfície de água em degraus (até nove blocos acima do nível do mar). São desníveis estáticos, não simulação de fluxo, nem cachoeiras animadas.
- A mesma seed com o mesmo gerador produz o mesmo terreno. Geradores 1–3 e IDs de bloco continuam disponíveis. Ruínas evitam o novo curso de água. A zona inicial é protegida.
- Gerador 4 aceito no carregamento, importação, recuperação e recepção P2P; salvar mantém a versão original. Clientes anteriores precisam atualizar para entrar em novos mundos do tipo Exploração.

## Validação

22 arquivos de testes aprovados, incluindo 24 amostras de terreno legado byte a byte. Semente PRISMA-EXPLORA: 999 colunas de riacho na área amostrada, 794 elevadas, 56 diferenças de altura entre colunas adjacentes, 61 cruzamentos de chunk e 7.763 novos voxels de ar profundo na amostra subterrânea. Verificações de malha e persistência local. Ainda não foram medidos FPS real, renderização WebGL, sessão P2P entre dispositivos ou acessibilidade natural das cavernas em jogo. Cachoeiras animadas e hidrologia física ficam para etapa posterior.
