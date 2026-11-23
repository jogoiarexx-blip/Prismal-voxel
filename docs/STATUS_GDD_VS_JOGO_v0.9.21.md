# Mundo Prisma — Auditoria do GDD e plano de qualidade para v1.0

**Documento base:** [GDD original v1.0](./GDD_MUNDO_PRISMA_VOXEL_SHADERS_v1.0.md), criado em 19/11/2026.  
**Código analisado:** versão 0.9.20; melhorias de instrumentação e testes preparadas para v0.9.21.

## Comparação com o GDD original

| Seção do GDD | O que exige | Estado verificado no código |
|---|---|---|
| §§1–3 | Construção livre, exploração, chunks de 16×160×16, terreno por seed | O mundo procedural, o streaming e a construção estão implementados. Foi acrescentado teste de reprodutibilidade para a mesma seed, coordenada e versão de gerador. |
| §§4–7 | Mineração, movimento, 36 slots, receitas e estações, vida e fome | Sistemas principais presentes; precisam de testes visuais e de duração em aparelho real. |
| §§8–9 | Criaturas, combate, fauna, agricultura e peças funcionais | Há código de fauna, zumbis, IA, baús, forno e agricultura. A qualidade visual e o balanceamento ainda dependem de playtest. |
| §§10–11 | Shaders escaláveis, iluminação, água, clima e vegetação | Há renderização WebGL com efeitos, porém não foi comprovada a conclusão de todos os efeitos Alto/Ultra previstos. |
| §12 | Persistência transacional, worker e malhas versionadas | Existem IndexedDB, checkpoints e revisões de chunks; faltam testes prolongados de armazenamento cheio e falhas reais. |
| §12.1 | TypeScript, Vite e Three.js/WebGL2 | **Divergência:** o jogo atual usa JavaScript e renderizador WebGL próprio. Uma migração completa antes da estabilização é desaconselhada. |
| §13 | Metas de 60 FPS desktop, 45–60 notebook e 30 celular | **Metas do GDD, não resultados medidos.** Falta benchmark de hardware real. |
| §13.1 | F3 com FPS, draw calls, triângulos, chunks, jobs e salvamento | F3 já existia; a v0.9.21 acrescenta FPS médio, 1% low e p95 de tempo do quadro, além de diagnóstico local copiável. |
| §14 | Acessibilidade, remapeamento e menus | Interface e menus existem; diversas opções de acessibilidade ainda estão pendentes. |
| §§17–19 | Critérios formais de teste de mundo, jogabilidade e persistência | Há suítes Node de regressão. A v0.9.21 adiciona métrica de quadros e teste determinístico de seed. |
| §18 | Multiplayer depois do MVP estável | O P2P foi adiantado e continua **experimental**; a versão 1.0 não deve ser certificada com base apenas em testes simulados. |

## Entrega da v0.9.21 baseada no GDD

- Publicação do GDD original **sem reescrever sua especificação**.
- Módulo local **js/performance.js**, limitado a 600 amostras de quadros ativos. Sem telemetria de rede.
- F3 ampliado com FPS médio, **1% low** (calculado pela média de tempo dos 1% quadros mais lentos) e p95 de tempo do quadro.
- **Pausa → Copiar diagnóstico de desempenho:** seed, região, posição, chunks, fila, renderização, FPS, estado de salvamento e condição do P2P. Não transmite dados automaticamente.
- Teste **tests/gdd-metrics.test.cjs** para estatísticas, pausas e geração determinística do terreno.
- Atualização do cache offline e manutenção de compatibilidade com saves (sem mudar schema, blocos, receitas ou gerador).

## Prioridades seguintes antes da v1.0

1. **P0:** jogar 60 minutos atravessando fronteiras de chunks, minerando e colocando blocos; reiniciar e conferir posições e construções salvas.
2. **P0:** medir FPS médio, 1% low, tempo p95, uso de memória e filas de geração em cinco cenários do GDD: campo, floresta, caverna, construção grande e deslocamento rápido.
3. **P0:** simular falta de espaço no IndexedDB, fechamento da aba durante gravação e restauração de backups sem perdas ou duplicações.
4. **P1:** revisar cavernas, progressão de ferramentas e guardião de ruínas conforme os requisitos originais.
5. **P1:** avançar em acessibilidade (remapeamento, redução de movimento, escala da interface).
6. **Experimental:** validar duas horas de P2P em dois dispositivos, queda de rede, reconexão e baús simultâneos; não prometer suporte completo a NAT restritivo sem TURN.

## Limites desta auditoria

As melhorias foram verificadas em código e por testes automatizados, mas **não representam FPS real**, teste WebGL completo, qualidade visual aprovada nem multiplayer entre dois aparelhos reais. Esses critérios dependem de medições e sessões de jogo que ainda faltam realizar.
