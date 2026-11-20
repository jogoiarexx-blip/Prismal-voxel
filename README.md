# Mundo Prisma 0.6.0

Explore seis biomas, descubra as ruínas e construa o Farol Prisma. Nos mundos novos, as Dunas de Vidro têm obeliscos com cristal no topo.

## Publicar no GitHub Pages

1. Extraia o ZIP e envie seu conteúdo à raiz do repositório, na branch main. O index.html deve ficar ao lado das pastas js e art.
2. Em Settings → Pages, escolha Deploy from a branch. Selecione main e /(root) e clique em Save.
3. Após a publicação, abra Visit site na mesma página.

## Executar no computador

Com Python instalado, abra um terminal na pasta do index.html e execute:

    python -m http.server 8000

Abra http://localhost:8000 no navegador. O projeto usa JavaScript e CSS locais, sem instalação de pacotes ou compilação.

## Controles

WASD move o personagem. Mova o mouse para olhar e clique no cenário para capturar o cursor. Espaço pula ou nada. Avance em direção a uma margem baixa para sair da água. Segure o botão esquerdo para minerar e use o direito para colocar ou interagir. E abre a mochila, J abre o diário, V alterna a câmera e Esc pausa. No celular, mova com o joystick à esquerda e olhe deslizando o dedo no cenário à direita. Toque no cenário para usar ou colocar; mantenha o dedo parado para minerar. Os botões maiores de Quebrar, Colocar e Pular também funcionam enquanto o joystick está pressionado. Use ⚡ Correr ou Agachar como alternâncias, e toque na barra rápida para trocar de item. O salto automático sobre degraus de um bloco é ativado nos controles móveis.

## Organização

- index.html e style.css contêm a página e sua apresentação.
- js/world.js e js/worker.js geram os biomas e a geometria em segundo plano.
- js/game.js controla física, inventário, criaturas e progressão.
- js/render.js desenha a cena em WebGL ou pelo renderizador de compatibilidade.
- js/ui.js, js/icons.js e js/store.js cuidam dos controles, menus, ícones, áudio e salvamento.
- art/ contém as imagens e a fonte. offline.js mantém os recursos para uso offline após a primeira carga completa por HTTPS ou localhost.

O progresso é salvo neste navegador e endereço. Uma publicação no GitHub Pages tem armazenamento separado de um HTML baixado ou de outro site. Mundos antigos da edição Ecos dos Arquitetos preservam o terreno quando reabertos na mesma origem.

## Conteúdo do GDD nesta edição

Crie um mundo para explorar as Montanhas Azuis, o Pântano Luminescente e as Planícies de Cinza além da região inicial. Partidas anteriores conservam seu gerador. O ferro se encontra dez ou mais blocos abaixo da superfície e exige uma picareta de pedra ou melhor.

Fabrique canteiros com terra e haste. Plante sementes obtidas da grama, com água a até dois blocos. Enquanto a região está carregada, o trigo amadurece após cerca de 45 segundos de irrigação. Use o trigo maduro para colher e reutilizar o canteiro. Asse o trigo no forno com carvão para obter pão.

Nos campos, encontre o Saltim. O Musgato procura canteiros, o Vigia aparece no subsolo e o Luzerrante aponta o caminho da próxima ruína nas noites do pântano. Em mundos novos de Sobrevivência fora do modo Pacífico, o núcleo do Observatório desperta o Guardião Prisma. Seus ataques ganham força à medida que perde vida.

Use uma cama para definir o ponto de retorno. Na mochila, clique com o botão direito para dividir uma pilha quando houver espaço. Em Opções, ajuste a distância da câmera externa e o flash de dano.

## Itens do GDD ainda em aberto

Persistência entre dispositivos por exportação/importação, remapeamento de teclas, equipamentos de proteção, portas orientáveis, luz voxel propagada, reconstrução por seção e shaders Ultra seguem pendentes. As metas de desempenho em três classes de hardware e os testes longos de Alpha e Beta ainda precisam de medição. Multiplayer e automação pertencem à etapa posterior ao lançamento.

## Atualização 0.5.0 — jogabilidade no celular

Novo joystick analógico com zona morta, câmera por deslize independente, controles multitouch, botões grandes de ação, corrida/agachamento em modo alternável, salto automático em obstáculos de um bloco, barra rápida dimensionada para telas pequenas e suporte a áreas seguras (notch). O uso/toque curto e a mineração/toque longo no cenário funcionam sem afetar o teclado e mouse.

## Atualização 0.6.0 — ações e configurações móveis

Indicador circular de progresso ao quebrar blocos, efeito curto ao acertar inimigos/colocar/quebrar blocos e vibração opcional (se disponível no dispositivo). Controles com sensibilidade da câmera por toque independente, tamanho do joystick ajustável, opção de inverter os lados para preferências de mão, salto automático configurável e corrida ao tocar duas vezes na parte frontal do joystick. A barra rápida também aceita deslize lateral para alternar o item selecionado. Preferências salvas localmente, sem mudar o formato dos mundos antigos. O uso de teclado e mouse permanece inalterado.
