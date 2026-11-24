# Mundo Prisma v0.9.32 — Forno e produção

Base: v0.9.31 (Horta). GDD, seção de fabricação: forno prepara alimentos e transforma minérios.

- Cada forno identificado por coordenadas possui fila persistente de até três lotes. Limite de 64 filas por mundo.
- Receitas mantêm seus índices e ingredientes. Receitas com carvão já incluído não pagam carvão duas vezes; as demais reservam um carvão ou duas tábuas, além dos ingredientes.
- Alimentos: 8 segundos por lote; vidro, barras, telhas, tijolos e carvão: 12 segundos. Preparo sequencial enquanto a região estiver carregada, inclusive com a interface do forno aberta. Não há progresso offline, em pausa comum ou em regiões descarregadas.
- A chama acende durante o preparo e apaga após o último lote. Fornos antigos podem manter o estado visual salvo até serem utilizados.
- Retirada manual dos lotes prontos, com verificação integral de espaço na mochila; sem perda parcial ou retirada repetida. Mineração normal impede remover forno com fila. Caso o bloco desapareça por edição externa, a fila fica preservada até recolocar um forno nas mesmas coordenadas.
- `furnaces` é um campo opcional no save existente; mundos anteriores começam com fila vazia. A restauração verifica coordenadas, receitas, limite de filas e tempos.
- P2P: preparo, retirada e mineração de forno restritos ao anfitrião; não há protocolo de transação remota para a fila nesta versão.
- Testes Node: 26 arquivos passaram, incluindo novo teste de combustível, fila, tempo, recuperação, regiões descarregadas, inventário cheio, isolamento de fornos e visitantes. O teste de estações foi ajustado para a nova regra de visitantes. Ainda não houve validação visual completa no navegador ou P2P real em dois dispositivos.
- Galinheiros, portões, cochos, bebedouros e desafios adicionais em ruínas permanecem no backlog.
