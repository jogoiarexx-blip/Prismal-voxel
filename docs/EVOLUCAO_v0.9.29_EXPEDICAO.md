# v0.9.29 — Expedição

Implementação incremental das seções 3.4 e 16 do GDD original. Na criação de mundo, selecione **Expedição (gerador 5)**. Os geradores 1–4 continuam disponíveis para seus respectivos mundos salvos; Clássico (3) permanece o padrão de novos mundos. O gerador 5 usa o terreno do 4 e altera apenas a área reservada dos três monumentos.

- Pórtico da Alvorada: mosaicos, arcada quebrada, depósito e baú com suprimentos.
- Jardim das Brumas: cabana abandonada com porta aberta, janela e telhado parcialmente danificado.
- Observatório do Céu: cripta com corredor de degraus de pedra (subida por saltos), câmara e baú. O Guardião e os três selos originais permanecem.
- H abre o navegador; os três tesouros podem ser selecionados como destinos, inclusive em altura subterrânea. O rumo é direto, não uma rota navegável.
- Os baús têm conteúdo definido na criação do mundo, usando os mesmos inventários persistentes e regras P2P existentes. Recarregar não repõe tesouros retirados ou destruídos. Os recursos variam por monumento, não por dificuldade.
- Não há novos IDs, texturas ou simulação de fluido. Não há estruturas adicionais espalhadas pelo mapa nesta etapa.

## Validação

`node --test tests/*.test.cjs`: 23 arquivos de teste aprovados, incluindo o novo `expedition.test.cjs`, que compara 12 amostras de ruínas antigas com hashes obtidos da v0.9.28, verifica geometria, acesso por degraus, navegação, conteúdo e persistência de baús, recuperação de emergência e meshing determinístico. Sintaxe JavaScript verificada. A execução visual WebGL, o percurso real na cripta, FPS móvel e P2P entre dois dispositivos não foram testados nesta etapa.
