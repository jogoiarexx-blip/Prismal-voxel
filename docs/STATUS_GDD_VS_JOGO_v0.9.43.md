# Auditoria GDD × implementação — v0.9.43
Data: 24/11/2026. Escopo: branch evolucao/voxel-0940; main pública não alterada.
Base: [GDD original](GDD_MUNDO_PRISMA_VOXEL_SHADERS_v1.0.md), [auditoria 0.9.21](STATUS_GDD_VS_JOGO_v0.9.21.md) e módulos atuais js/world.js, js/game.js, js/render.js, js/store.js, js/ui.js, offline.js.

## Matriz de cobertura
| GDD | Implementação encontrada | Lacunas |
|---|---|---|
| 1–3 Mundo e exploração | Seed, 6 biomas, chunks 16×160×16, worker, greedy meshing, rios, cavernas e ruínas; gerador opcional 6 com vilarejos | Seções verticais 16³, cavernas mais conectadas e verticais, geração climática e distribuição regional de recursos, medição de streaming |
| 4 Blocos | Cadastro por ID, formas especiais, resistência, seleção, drops, orientação | Metadados unificados de ferramenta ideal, som, emissão e estados; colisão de colocação contra todas as entidades; testes |
| 5 Movimento | Primeira/terceira pessoa, corrida, agachar, nado, câmera com colisão, controles de toque | Remapeamento, calibração e teste em hardware |
| 6 Sobrevivência | Vida, fome, fôlego, respawn, cama, mochila recuperável, forno e agricultura; opção casual nesta versão | Fogo como dano, desafio mais difícil, balanceamento e testes de morte |
| 7 Inventário e ferramentas | 36 slots, crafting por estação, forno com fila e combustível, durabilidade; armaduras cobre/ferro | Progressão completa de armas, arco, armadura prisma, balanceamento de mineração, equipamento com slots dedicados |
| 8 Criaturas | Seis criaturas originais, zumbis, fauna doméstica, guardião com 3 estágios; aldeões | Percepção por ruído, navegação mais robusta, arco, verificação do chefe e arenas |
| 9 Construção e mundo vivo | Portas, telhas, escadas, vidro, baús, plantações, pecuária; aldeões com 3 profissões e 12 trocas | Aldeões trabalhando e dormindo, caminhos, guardas, mercados físicos; Fluxo Prisma e transporte são extensões posteriores |
| 10–11 Visual | Água Fresnel, céu, sol, AO por vértice, neblina, luz local e materiais procedurais | Sombras solares projetadas, propagação de luz em grade, SSAO/bloom/FXAA opcionais, sombras e clima testados; não confundir AO com sombra projetada |
| 12 Arquitetura | JS/WebGL próprio, Workers, IndexedDB, fallback software, módulos | Diverge de TS/Vite/Three.js propostos; preservar engine funcional antes de migrar. Seções verticais e cache coerente |
| 13 Performance | F3, 1% low, p95, qualidade variável, redução de resolução e raio mobile | Benchmarks reais em 3 classes de aparelho e 5 cenários, métricas de meshing/save/memória, sessões longas |
| 14 UX | Menu, HUD, guia, navegação, contraste, escala, sensibilidade e opções mobile | Tutorial inicial interativo, remapeamento, mais acessibilidade, créditos/revisão de UX |
| 15 Áudio | Síntese de efeitos; passos por superfície e volumes independentes de efeitos/UI nesta versão | Ambiente por bioma, música dinâmica, espacialização, volumes ambiente/música, validação auditiva |
| 16 Narrativa | Expedição, selos, ruínas, Farol Prisma e Guardião | Teste ponta a ponta de progressão e desbloqueios |
| 17–22 Testes e lançamento | Testes unitários existentes, backups, recuperação, diagnóstico | Playtests de 60–120 min, estabilidade WebGL/mobile, falhas de armazenamento, teste de redes reais; critérios de saída ainda não comprovados |

## Plano prioritário
- P0: executar a suíte completa em Node/CI, validar WebGL e mobile, preservar backups e salvar durante edição/morte; testar atualização offline; medir FPS em campo, floresta, caverna, construção grande e corrida.
- P1: tutorial inicial, armas e ferramentas avançadas, slots de equipamento, novos pontos de exploração e melhorias na navegação dos aldeões.
- P1: propagação de luz voxel e reconstrução seletiva de seções verticais; medir custos antes de mudar estrutura de chunks.
- P1: áudio ambiental, acessibilidade e remapeamento. Sombras projetadas opcionais, depois efeitos pós-processados se houver orçamento.
- P2: guardas, invasões, economia cooperativa, Fluxo Prisma e transporte. Multiplayer P2P segue experimental e requer testes de rede; não é requisito original do MVP.

## Entrega 0.9.43
- Opção de manter inventário ao morrer em mundos novos solo; padrão antigo preservado. Cama e mochila anterior mantêm o comportamento existente. Respawn consulta a versão de geração do mundo.
- Efeitos de passos distintos para madeira, pedra, areia e terra; volumes geral, efeitos e interface separados, sem novos downloads de áudio.
- Atualizado cache offline da 0.9.33 para 0.9.43.
- Verificações isoladas: sintaxe JS, política de inventário na morte e seleção de sons. Nenhuma aprovação de FPS, reprodução auditiva, browser real ou P2P real.
- A atualização continua na PR 1 em rascunho. Não declarar v1.0 concluída.
