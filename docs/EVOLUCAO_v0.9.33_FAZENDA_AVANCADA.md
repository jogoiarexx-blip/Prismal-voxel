# Mundo Prisma 0.9.33 — Fazenda avançada

- Quatro objetos fabricáveis na bancada e disponíveis na categoria Fazenda: portão, ninho, cocho e bebedouro. IDs novos 167–175, sem renumerar os existentes; estados persistem nas edições do mundo.
- Portão abre/fecha e gira em duas orientações; não fecha sobre personagens/animais. Animais não usam cercas ou portões como degraus de navegação.
- Galinhas adultas depositam um ovo em ninho vazio próximo (até cerca de 2,6 blocos); sem ninho disponível, mantêm o drop normal. Interaja para recolher. Ninhos com ovos não podem ser removidos até a coleta.
- Cocho: interaja segurando trigo, frutas ou sementes para depositar uma unidade, até oito do mesmo tipo. Mão vazia devolve o estoque se couber na mochila. Animais domesticados próximos recebem alimento apropriado automaticamente, no máximo uma vez a cada 60 segundos por animal. Estoque salvo e limitado a 64 cochos abastecidos. Recolha antes de quebrar.
- Bebedouro: abastece com água adjacente ou chuva sem cobertura. Animais feridos próximos podem recuperar um ponto de vida por uso, com intervalo de 30 segundos; a água é consumida e pode ser reposta pela fonte. Não há sistema de sede nem fluidos dinâmicos.
- Objetos e automação administrados pelo anfitrião no P2P; estado visual dos blocos é sincronizado. Não implementa transações remotas de alimentação/coleta nesta versão.
- Ícones embutidos e geometria leve, sem modelos externos; 4 receitas acrescentadas ao fim da lista. Geradores 1–5 e IDs anteriores mantidos.
- Teste novo: farm-fixtures.test.cjs (geometria, movimento real de animais em mapa controlado, estoque/ovos, bebedouro, snapshot, proteção de convidados, malha). Testes de lógica não substituem partidas em WebGL e multiplayer real.
- Pendências: animações adicionais de animais, desafios regionais, galinheiro como construção automática. O jogador pode construir seu próprio galinheiro usando os novos ninhos e portões.
