# Mundo Prisma v0.9.9 — Auditoria, backups e estabilidade

## Melhorias desta atualização

- **Backup e importação:** em *Meus mundos*, exporte qualquer mundo para JSON e restaure o arquivo como um **novo** mundo, preservando o original. Arquivos incompatíveis são rejeitados e há limite de 10 MB para importação.
- **Retorno à cama dupla:** validação das duas metades e do espaço de renascimento, mesmo quando o quarto está fora dos chunks carregados. Geração do terreno reutilizada em vez de recriar um chunk várias vezes ao morrer.
- **Salvamento:** alterações feitas durante uma gravação pendente continuam marcadas como não salvas até que sejam gravadas; mundos locais corrompidos não escondem todos os demais no fallback sem IndexedDB.
- **P2P experimental:** erro explícito quando a transmissão é interrompida e mensagem recomendando backup antes de abrir um mundo compartilhado.
- **Otimização:** alterações inteiramente em JavaScript/HTML, sem texturas, bibliotecas ou modelos 3D adicionais.

### Limitações conhecidas

Multiplayer ainda é uma demonstração experimental de dois participantes por códigos WebRTC manuais. Inventários/animais não são autoritativamente sincronizados e pode ser necessário TURN em algumas redes. O anfitrião guarda o mundo. Desempenho real em celulares requer medição.

---

# Mundo Prisma v0.9.9 — Multiplayer experimental, cama dupla e localização

## Novidades desta edição

- **Ovelha, porco e vaca**: aparecem em áreas gramadas durante o dia e coexistem com as criaturas de fantasia, inclusive na dificuldade Pacífico e no modo Criativo.
- **Modelos voxel distintos**: ovelha com lã, focinho escuro e cascos; porco rosado com focinho e orelhas; vaca marrom e creme, manchas, chifres e úbere. Cores e pequenas texturas procedurais; sem GLB e sem imagens de textura grandes.
- **Comportamento pacífico**: passeiam, pastam, evitam obstáculos, respeitam a colisão com o jogador, não atacam, e fogem temporariamente quando agredidos. Aproximam-se de quem segura sua comida favorita.
- **Alimentação**: equipe trigo para ovelha e vaca, ou frutas silvestres para porco, e use/toque no animal. Alimentar recupera parte da vida do animal, produz uma reação e consome um alimento na Sobrevivência.
- **Recursos**: ovelhas deixam lã, porcos deixam carne suína crua e vacas deixam carne bovina crua. A carne crua pode ser consumida para recuperar fome (não equivale a carne cozida). A lã permite receita alternativa de cama na bancada.
- **Performance**: até quatro animais de fazenda e quatro outras criaturas simultâneos em um raio local; os animais utilizam o buffer compartilhado e os materiais procedurais já usados no jogo. Não há pathfinding caro nem modelos externos.
- **Compatibilidade**: esquema de salvamento e mundos existentes permanecem compatíveis; animais antigos continuam funcionando.

## Controles

WASD para mover, mouse para câmera, botão esquerdo para minerar/atacar, botão direito para usar/alimentar/colocar. No celular use joystick e botões na tela. Para alimentar, selecione a comida, mire no animal próximo e toque para interagir (não use o botão de colocação forçada).

## Publicação

Envie todos os arquivos do ZIP à raiz do repositório em `main`. O `index.html` deve ficar junto das pastas `art` e `js`. O site GitHub Pages deve estar publicado a partir de `main` / `root`.

## Histórico

Edições anteriores continuam presentes: mochila premium, menus premium, construção livre, portas de dois blocos, tochas presas à parede e criaturas animadas.

---

# Histórico — Mundo Prisma v0.9.4 — Animações e IA das criaturas

## v0.9.4 — Animação e inteligência das criaturas

- Saltim salta quando anda e foge do jogador; Musgato caminha com patas alternadas e procura canteiros; Luzerrante flutua e move as asas; Raspejante ganha marcha articulada; Vigia e Guardião movem pernas e braços, preparando ataques com movimento visível.
- As animações usam deslocamento realmente percorrido, evitando que criaturas paradas patinem. Golpes produzem reação curta, recuo respeitando obstáculos e uma transição rápida antes de desaparecerem.
- A IA respeita colisões com terreno, portas e peças de construção, o corpo do personagem e outros bichos, usando desvio local de obstáculos sem pathfinding pesado.
- As luzes são consultadas uma vez por atualização de IA, e as animações continuam integradas ao mesmo buffer dinâmico de entidades WebGL. Sem arquivos de textura externos, novos modelos GLB ou chamadas de desenho extras.
- Compatibilidade: saves schema 1 continuam funcionando; mobs antigos sem atributos de animação são inicializados com padrões neutros. Modos de jogo e construção anteriores mantidos.

Mochila reorganizada em painéis de inventário e livro de receitas com filtros por categorias, preservando a fabricação, a transferência de itens e o catálogo criativo. Interface inicial e criação de mundos redesenhadas para combinar com a identidade voxel-fantasia dos conceitos aprovados: dourado, pedra escura, bordas ornamentadas, navegação superior funcional, cartões de modo e campos mais legíveis.

**Base preservada:** construção livre, salvamento, menus premium e controles da versão 0.9.2 continuam disponíveis; a v0.9.3 acrescenta as melhorias descritas abaixo. O menu "Informações do mundo" é explicativo; não inventa opções não suportadas. O botão ao lado da semente gera um código aleatório. A navegação superior abre as telas existentes do jogo.

**Otimização:** o visual usa a arte WebP já incluída e efeitos CSS; nenhuma biblioteca externa, fonte adicional ou imagem pesada foi acrescentada. O CSS inclui redução de efeitos em telas pequenas e respeita a preferência por movimento reduzido.

**Instalação:** extraia os arquivos na raiz de um servidor estático ou repositório GitHub Pages, mantendo `index.html` ao lado de `style.css`, `art/`, `js/` e `offline.js`. Faça recarregamento completo para obter a versão nova do cache offline.

---

# Mundo Prisma 0.9.0

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

Persistência entre dispositivos por exportação/importação, remapeamento de teclas, equipamentos de proteção, portas orientáveis, luz voxel propagada, reconstrução por seção e shaders Ultra seguem pendentes. As metas de desempenho em três classes de hardware e os testes longos de Alpha e Beta ainda precisam de medição. Automação pertence a uma etapa futura. O multiplayer experimental P2P está descrito acima.

## Atualização 0.5.0 — jogabilidade no celular

Novo joystick analógico com zona morta, câmera por deslize independente, controles multitouch, botões grandes de ação, corrida/agachamento em modo alternável, salto automático em obstáculos de um bloco, barra rápida dimensionada para telas pequenas e suporte a áreas seguras (notch). O uso/toque curto e a mineração/toque longo no cenário funcionam sem afetar o teclado e mouse.

## Atualização 0.6.0 — ações e configurações móveis

Indicador circular de progresso ao quebrar blocos, efeito curto ao acertar inimigos/colocar/quebrar blocos e vibração opcional (se disponível no dispositivo). Controles com sensibilidade da câmera por toque independente, tamanho do joystick ajustável, opção de inverter os lados para preferências de mão, salto automático configurável e corrida ao tocar duas vezes na parte frontal do joystick. A barra rápida também aceita deslize lateral para alternar o item selecionado. Preferências salvas localmente, sem mudar o formato dos mundos antigos. O uso de teclado e mouse permanece inalterado.

## Oficina de construção (v0.7.0)

No PC, pressione **B**. No celular, toque em **Construir**. A oficina organiza peças por Madeira, Pedra, Telhados e paredes e Detalhes. No modo Criativo, selecione qualquer peça e receba uma pilha de 64 blocos na barra rápida. Na Sobrevivência, os materiais precisam ser coletados e algumas receitas exigem bancada ou forno próximo. Também é possível abrir a oficina pela mochila.

Peças adicionadas: tijolos de pedra e vermelhos, escadas de madeira/pedra com orientação, lajes de madeira/pedra, cerca, painel de vidro, porta interativa, telha, lanterna, tábuas escuras, coluna de cobre, piso, reboco, grades de ferro, estante, mesa e cadeira. A direção de escadas e portas depende da câmera na hora de colocar. Para abrir ou fechar uma porta, use o comando de interação; para colocar um bloco encostado nela, agache.

Segurar **Colocar** no celular aplica colocação contínua com cadência limitada de aproximadamente quatro blocos por segundo. O destino aparece contornado em amarelo. Lajes e escadas usam colisão por partes; peças detalhadas são agrupadas na malha da região, sem modelos 3D externos.

## Otimizações e compatibilidade

- Corrigida a codificação da máscara de meshing para IDs a partir de 32.
- Malha greedy preservada para blocos cúbicos, usando pequenas caixas somente para peças não cúbicas.
- Texturas não foram adicionadas: os materiais são feitos por cores e padrões no shader; os ícones novos são pixel-art comprimida num único JS (sem solicitações HTTP extras).
- Salvamento schema 1 e geradores anteriores permanecem, com novos IDs anexados à tabela de blocos; mundos antigos continuam com o mesmo terreno e inventário.
- Cache offline atualizado para 0.7.0.

Limites conhecidos: não é um clone completo de Minecraft. Não há montagem por receitas em mesa 3×3, telhados inclinados contínuos, mobília funcional completa ou multiplayer; o renderizador CPU de compatibilidade ainda mostra peças pequenas como cubos.


## Atualização 0.8.0 — projetos, móveis funcionais e ferramentas

**Projetos rápidos**: na oficina de construção, escolha Fundação 5×5 ou Cabana 5×5. O projeto usa uma área plana a sete blocos à sua frente. A operação só aparece disponível com região carregada, espaço livre e todos os materiais na mochila (ou no modo Criativo). O jogo não substitui árvores ou estruturas existentes. No Criativo é possível desfazer o último projeto, se ainda estiver intacto. Os blocos são inseridos em lote, com uma única fila de reconstrução por região afetada.

**Novas peças**: armário e barril de armazenamento (18 espaços cada), alçapão interativo, sofá, tapete, viga de madeira, janela emoldurada. **Novas ferramentas**: machado de ferro para madeira e pá de pedra para terra/areia, ambas com durabilidade. A oficina apresenta receitas para a Sobrevivência. Blocos novos usam pequenas caixas e a mesma malha voxel; os ícones são incorporados no JS, sem requisições adicionais.

**Atenção**: a fundação e a cabana exigem solo plano, sem construções, e material já disponível na mochila. As casas são protótipos 5×5, não uma ferramenta de edição arquitetônica. Testes automatizados verificam custo, área, orientações e malha, mas os FPS ainda devem ser medidos em aparelhos reais.

## Atualização 0.9.0 — construção livre (estilo sandbox voxel)

A construção bloco a bloco é o modo principal: qualquer terreno, casa de qualquer forma ou tamanho dentro dos limites do mundo e do alcance do personagem, sem obrigação de usar projetos 5×5. Os projetos rápidos permanecem recolhidos, opcionais. A oficina agora começa explicando os controles e permite selecionar materiais para a barra rápida; o Criativo fornece peças ilimitadas e a Sobrevivência requer materiais.

No celular, selecione **Blocos**, escolha o material e volte ao mundo. Toque para posicionar na face apontada, segure Colocar para construir em sequência, segure Quebrar para remover, e arraste para olhar. O botão **Girar** altera orientação de portas e escadas de 90 em 90 graus sem girar o personagem. No PC, pressione **G** para girar, **P** para copiar o bloco mirado (no Criativo, copia para a barra; na Sobrevivência, equipa se possuir) e **Z** para desfazer a última colocação individual no Criativo, desde que não tenha sido alterada ou preenchida com itens.

Sem novos modelos, texturas ou bibliotecas: mantém malha voxel compartilhada e limite de colocação contínua para dispositivos móveis. A compatibilidade dos mundos salvos (schema 1) é mantida.


## v0.9.3 — criaturas e construção

- Modelos voxel distintos para Saltim, Musgato, Luzerrante, Vigia de Cascalho, Raspejante e Guardião Prisma, com pequenas cores e padrões procedurais (sem novos downloads de texturas ou modelos).
- Tochas de chão pequenas; quando colocadas na parede ficam presas à face e emitem luz. As antigas tochas sem piso também tentam usar paredes vizinhas visualmente.
- Novas portas passam a ocupar dois blocos verticais; exigem espaço livre, abrem juntas, quebram juntas e gastam apenas uma unidade. Portas antigas de um bloco nos mundos salvos continuam funcionando.
- Projetos de cabana passam a usar portas duplas, sem cobrar o topo como uma segunda porta.
- Ao quebrar um bloco de suporte, tochas novas anexadas a ele se soltam.


## Multiplayer P2P (experimental) — v0.9.9

O botão **Multiplayer P2P** no menu inicial abre duas opções: **Criar sala** e **Entrar na sala**. O anfitrião escolhe um mundo existente ou cria um mundo novo e compartilha o convite copiado. O convidado cola o convite, gera uma resposta e a devolve. O anfitrião cola a resposta. Quando o canal WebRTC abre, o mundo é transferido, com sincronização de **posições dos dois jogadores, blocos construídos/destruídos e conversa**. Apenas o anfitrião salva a partida no navegador dele; o convidado joga sem salvar cópias no próprio navegador. As alterações remotas são incorporadas ao mundo do anfitrião.

### Escopo e limitações

- **2 jogadores** por partida, um anfitrião e um convidado; sem matchmaking, persistência em nuvem ou contas.
- Conexão WebRTC criptografada por padrão, sem biblioteca ou backend próprios. Convite e resposta são **códigos longos**, porque o projeto é estático e não usa servidor de sinalização. Não é um código curto de 6 dígitos.
- Servidores STUN públicos auxiliam a conexão; em redes com NAT restritivo, CGNAT ou políticas corporativas, a conexão pode falhar sem um servidor TURN. Os participantes trocam dados diretamente quando a rota é encontrada.
- Sincronização nesta etapa: terreno editado, posição e chat. Criaturas, inventários pessoais e progresso de missões **não** estão sincronizados integralmente. Recursos podem divergir no modo Sobrevivência. Para construção conjunta, o modo **Criativo** é recomendado.
- O canal não é um servidor antitrapaça. Compartilhe convites apenas com alguém de confiança, pois os blocos que o convidado altera ficam no mundo salvo do anfitrião. Para mundos importantes, crie backup.
- O convidado recebe o estado inicial do mundo, sem acesso ao armazenamento local do anfitrião.
- Por ser uma partida temporária, em caso de queda não há reconexão automática. Voltem ao menu e criem novo convite.

### Desempenho

Nenhum GLB ou textura foi adicionado. O avatar remoto usa a geometria voxel existente e o mesmo buffer de entidades; atualizações de posição são limitadas a cerca de 9 por segundo. Edições são enviadas individualmente, com transferência da cena inicial fragmentada em mensagens pequenas. O modo offline não estabelece P2P sem rede.


## v0.9.9 — Cama dupla e localização da casa

- A cama de campo **nova** ocupa dois blocos horizontais, orientados com a câmera e com a rotação de construção (tecla G), incluindo pés visíveis, estrado, cabeceira, travesseiro e coberta. A colocação exige chão, espaço livre e nenhuma criatura/jogador obstruindo os dois blocos. Colocar consome apenas **uma cama** da mochila.
- Quebrar qualquer metade remove as duas e devolve um único item no modo Sobrevivência. Em Criativo, desfazer restaura os dois blocos.
- Camas antigas de um bloco continuam utilizáveis; ao usar qualquer cama, o ponto de renascimento e o marcador da casa são definidos.
- Botão **Minha casa** na HUD ou tecla **H** abre o menu para marcar a posição atual, visualizar coordenadas X/Y/Z, ligar ou desligar a bússola e remover o marcador. A seta e a distância até a casa atualizam em tempo real.
- Marcadores são salvos no próprio mundo, sem GPS real, serviços externos ou mapas pesados.
- Camas duplas também sincronizam por lotes no P2P experimental; o anfitrião salva o mundo compartilhado.
