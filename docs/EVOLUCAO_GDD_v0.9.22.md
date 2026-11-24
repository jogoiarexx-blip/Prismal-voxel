# Mundo Prisma v0.9.22 — Acessibilidade e robustez de mundos

Esta atualização aplica os itens **§14.3 (acessibilidade)**, **§12.6 (persistência)** e **§19 (testes funcionais obrigatórios)** do GDD original, sem mudar a seed, a versão do gerador, IDs de blocos, receitas ou `schema:1` dos mundos.

## Entregas realizadas

- **Tamanho do texto do HUD (0,75× a 1,5×):** opção em Configurações → Leitura e acessibilidade; amplia texto da missão, informações vitais, legenda da bússola e bloco mirado sem aumentar canvas ou deslocar botões de construção e controles de toque.
- **Alto contraste:** opção persistente para a mira, a bússola e as caixas de informações, para ambientes claros e maior legibilidade.
- **Diagnóstico de mundo ampliado:** ao copiar o relatório, são exibidos o número de regiões editadas, de blocos editados e de baús persistidos. A contagem ocorre apenas quando o jogador pede o relatório, não a cada frame.
- **Regressão de mundo grande:** teste automatizado com 80 regiões e mais de 3.000 edições de voxels, teste de baús, inventário, casa marcada, recuperação de emergência, isolamento entre mundos e entrada corrompida no fallback local.

## Validação e limites

Executar `node tests/accessibility.test.cjs`, `node tests/gdd-world-stress.test.cjs` e os demais `tests/*.cjs`.

Os testes automatizados **não** substituem um playtest visual e medições reais de FPS em mobile/PC. O teste de milhares de alterações mede integridade e recuperação lógica, não uma sessão real de duas horas ou vazamento de memória da GPU. O modo P2P segue experimental.
