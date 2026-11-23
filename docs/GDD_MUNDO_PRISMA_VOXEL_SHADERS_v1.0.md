# GDD — MUNDO PRISMA: Sobrevivência Voxel

**Versão:** 1.0  
**Data:** 19/11/2026  
**Gênero:** Sandbox de blocos, sobrevivência, exploração e construção  
**Plataforma principal:** Navegador (desktop), com adaptação posterior para dispositivos móveis  
**Tecnologia proposta:** TypeScript, Three.js/WebGL2, Web Workers, IndexedDB  
**Modos iniciais:** Sobrevivência e Criativo (single-player offline-first)  
**Estado:** Pré-produção / especificação funcional

> **Visão:** Um mundo de blocos vivo e explorável, no qual cada construção e descoberta transforma a paisagem. A iluminação dinâmica, a água, as sombras e a atmosfera são parte essencial da identidade do jogo, sem comprometer a jogabilidade em máquinas modestas.

## 1. Identidade e princípios

**Nome de trabalho:** MUNDO PRISMA. O nome pode ser alterado sem afetar os requisitos técnicos.

### 1.1 Fantasia central

O jogador desperta em uma região inédita, recolhe recursos, fabrica ferramentas, constrói abrigo, explora cavernas, encontra ruínas e evolui de uma pequena base até um assentamento complexo. O mundo é totalmente baseado em voxels: terreno e construções são editáveis bloco a bloco.

### 1.2 Pilares de design

1. **Construir em qualquer lugar:** quebrar, colocar, combinar e reorganizar blocos com interações imediatas.
2. **Explorar um mundo diferente a cada partida:** biomas, cavernas e estruturas procedurais com semente reproduzível.
3. **Sobreviver com regras compreensíveis:** coleta, fabricação, fome, vida, iluminação e ameaça crescente à noite.
4. **Atmosfera visual com shaders escaláveis:** nascer do sol, sombras, água transparente, névoa, folhas em movimento e iluminação quente de fontes locais.
5. **Desempenho previsível:** qualidade gráfica adaptável, geração fora da thread principal e atualização seletiva de chunks.
6. **Identidade própria:** personagens, criaturas, biomas, sons, texturas, nomes, interface e progressão originais. Inspiração no gênero voxel, sem copiar ativos ou marcas de outros jogos.

### 1.3 Público e experiência

- Jogadores que gostam de sandbox de construção, exploração tranquila e sobrevivência acessível.
- Sessões rápidas de 15–30 minutos ou mundos persistentes de longa duração.
- Aprendizado inicial de 3 a 5 minutos, sem tutorial longo obrigatório.
- Primeiro objetivo tangível: construir abrigo, bancada e uma fonte de luz antes da primeira noite.

### 1.4 Escopo do primeiro lançamento

- **MVP:** mundo explorável + mineração + construção + inventário + crafting básico + ciclo dia/noite + 2 biomas + 1 tipo de criatura hostil + shaders básico/intermediário + salvar/carregar.
- **Alpha:** sobrevivência completa, 4 biomas, cavernas, mineração em profundidade, clima, 4 criaturas e combate.
- **Beta:** 6 biomas, ruínas, progressão de equipamento, melhorias de usabilidade, shaders avançados e otimização.
- **Após v1.0:** multiplayer, automação de máquinas, novos reinos e extensões/mods; **não** prometer no MVP.

## 2. Loop principal

**Explorar → coletar → fabricar → construir → proteger-se → explorar regiões mais difíceis → conquistar novos materiais → expandir a base.**

### 2.1 Ritmo sugerido

| Momento | Experiência desejada | Recompensa |
|---|---|---|
| 0–3 min | Aprender a mover, quebrar e colocar blocos | Primeira ferramenta rudimentar |
| 3–8 min | Recolher madeira, pedra e alimento | Bancada de fabricação |
| 8–15 min | Construir abrigo e iluminação | Segurança na primeira noite |
| 15–30 min | Entrar em caverna rasa | Minério básico e novas receitas |
| 30–60 min | Melhorar ferramentas, visitar outro bioma | Material raro e descoberta ambiental |
| Sessões seguintes | Explorar ruínas, construir máquinas e estruturas | Especialização, estética e domínio do mundo |

**Ciclo de tempo de referência:** um dia completo dura 24 minutos reais, configurável para fins de testes. A noite ocupa cerca de 35% do ciclo. Este valor é parâmetro de balanceamento, não requisito técnico rígido.

## 3. Mundo procedural

### 3.1 Estrutura

- Espaço de voxels inteiros, com coordenadas globais `(x, y, z)`.
- **Chunk inicial:** `16 × 160 × 16` blocos; largura e profundidade 16, altura vertical de `0` a `159`.
- Separar cada chunk em **seções verticais de 16³** para reconstruir somente a parte afetada por edição de blocos.
- **Nível do mar padrão:** `y = 60`, ajustável na configuração do gerador.
- Geração determinística por `worldSeed + coordenadas + versão do gerador`.
- Mundo logicamente expansível por streaming; limites práticos definidos por memória e armazenamento.
- Distância de visão variável: 3–5 chunks em dispositivos fracos; 6–8 no médio/alto; mais somente após medição.
- Chunks vazios e faces inteiramente ocultas não devem ocupar geometria renderizada.

### 3.2 Pipeline de geração

1. Determinar temperatura, umidade e continentalidade em baixa frequência.
2. Atribuir bioma a partir desses mapas, com transições suaves.
3. Calcular elevação e erosão aproximada por ruído fractal.
4. Preencher base rochosa, subsolo, solo, areia e superfície.
5. Escavar cavernas com ruído 3D e caminhos conectados.
6. Distribuir minerais por profundidade, bioma e raridade.
7. Posicionar vegetação e detalhes com regras que respeitem limites de chunks.
8. Gerar estruturas utilizando regiões de reserva para evitar sobreposição.
9. Aplicar **edits** persistidos do jogador e alterações de gameplay.
10. Construir malha e iluminação para envio ao renderizador.

**Regra crítica:** qualquer elemento que atravesse um limite de chunk precisa ser gerado em coordenadas globais, sem depender da ordem em que os chunks chegam.

### 3.3 Biomas

| Bioma | Geografia e visual | Recursos e diferencial | Fase |
|---|---|---|---|
| Campos de Âmbar | Gramíneas, árvores baixas, vales suaves | Madeira, sementes, animais passivos | MVP |
| Floresta de Névoa | Árvores altas, samambaias, névoa volumétrica aproximada | Fibra, cogumelos, madeira escura | MVP |
| Dunas de Vidro | Areia clara, rochas expostas e reflexos quentes | Cristais, argila, ruínas parcialmente enterradas | Alpha |
| Montanhas Azuis | Picos rochosos e gelo em altitude | Minérios, cavernas verticais | Alpha |
| Pântano Luminescente | Água rasa, plantas emissivas e bruma | Resinas, fungos raros | Beta |
| Planícies de Cinza | Solo escuro, formações minerais e tempestades | Materiais de equipamento avançado | Beta |

### 3.4 Cavernas e pontos de interesse

- Cavernas rasas, túneis, bolsões subterrâneos e cavernas profundas.
- Conexões plausíveis; evitar túneis sempre sem saída e salas que cortem a superfície indevidamente.
- Minérios não devem aparecer todos em qualquer profundidade.
- Ruínas originais com pistas ambientais, caixas de recompensa e risco controlado.
- Estruturas **não** destroem a topografia indiscriminadamente: usar máscaras de implantação e validação.

## 4. Catálogo inicial de blocos

| Família | Exemplos | Propriedades |
|---|---|---|
| Terreno | Grama, terra, pedra, areia, cascalho, argila | Resistência e ferramenta ideal |
| Madeira | Tronco, tábuas, folhas, escada, porta | Orientação, variantes e alguns blocos transparentes |
| Mineração | Carvão mineral, cobre, ferro, cristal prisma | Geração por camada e drops específicos |
| Construção | Pedra talhada, tijolo, vidro, telhado | Aparência, resistência e transparência |
| Funcionais | Bancada, forno, baú, luminária, cama | UI própria e interação contextual |
| Naturais | Água, plantas, cogumelos, flores | Renderização especializada e crescimento opcional |

### 4.1 Modelo de dados do bloco

Cada bloco possui: `id`, nome localizável, categoria, textura/material, opacidade, emissão de luz (0–15), resistência, ferramenta ideal, estado opcional (orientação, crescimento, abertura), colisão, item de drop, sons e tags. Estados (ex.: porta aberta) não devem criar novos IDs arbitrariamente.

### 4.2 Regras de interação

- Mira seleciona o primeiro bloco atingido por raycast; distância inicial de alcance: **5 blocos**.
- Clique esquerdo segurado quebra bloco após tempo dependente de ferramenta/material.
- Clique direito posiciona bloco na face adjacente ou usa objeto interativo.
- Contorno discreto do bloco-alvo; preview de colocação com verde/vermelho conforme validade.
- Impedir colocação que interseccione a cápsula do jogador ou uma entidade sólida.
- Em sobrevivência, quebrar gera drop coletável; em criativo, quebra instantânea e catálogo completo.
- Alterar bloco invalida somente a seção editada, seções vizinhas relevantes, colisão e iluminação local.

## 5. Personagem, câmera e movimento

### 5.1 Primeira pessoa

- Controle desktop: `WASD`, mouse, `Espaço` pular, `Shift` agachar, `Ctrl` correr (configurável), `E` inventário, `1–9` hotbar, `Esc` pausar.
- Campo de visão ajustável (padrão 75°).
- Caminhada, corrida, salto, gravidade, colisão em degraus baixos, nado e queda.
- Física com cápsula e resolução de colisão estável; passo fixo de simulação.
- Câmera sem atravessar bloco; feedback de dano sem tremor excessivo.

### 5.2 Terceira pessoa (Beta)

- Alternância opcional, câmera com teste de colisão contra cenário e recuo ajustável.
- Personagem voxel original com animações de movimento, mineração, uso de ferramenta e dano.

### 5.3 Parâmetros iniciais de balanceamento

| Parâmetro | Valor inicial de teste |
|---|---|
| Velocidade de caminhada | 4,3 blocos/s |
| Velocidade de corrida | 6,0 blocos/s |
| Altura de salto | ~1,15 bloco |
| Altura da cápsula | 1,8 bloco |
| Vida máxima | 100 pontos |
| Fome máxima | 100 pontos |
| Alcance de interação | 5 blocos |

Os valores são hipóteses de prototipagem; calibrar por playtests, não tratar como definitivos.

## 6. Sobrevivência

### 6.1 Recursos vitais

- **Vida:** sofre dano por criaturas, queda, fogo e afogamento; recupera lentamente quando alimentação está adequada.
- **Fome:** diminui ao longo do tempo e mais rapidamente em ações intensas; não criar punições agressivas nos primeiros minutos.
- **Fôlego:** recurso durante nado/mergulho; interface aparece somente quando relevante.
- **Temperatura:** sistema posterior de biomas extremos, fora do MVP.

### 6.2 Morte e retorno

- Reaparecer no ponto inicial ou numa cama válida.
- Regra padrão: inventário cai numa mochila recuperável no lugar da morte, com marcador opcional no mapa.
- Modo casual opcional preserva inventário; modo desafio deixa risco maior.
- Salvamento automático após morte e após recuperação de itens.

### 6.3 Alimentação

- Colheita de frutas, plantas e pequenas plantações.
- Forno prepara alimentos e transforma minério.
- Energia recuperada conforme qualidade do alimento, com feedback visual breve.

## 7. Inventário, crafting e ferramentas

### 7.1 Interface

- **Hotbar:** 9 espaços.
- **Mochila inicial:** 27 espaços adicionais.
- Cada pilha tem limite configurável por item, sugestão de 64 para blocos comuns.
- Ferramentas têm durabilidade; armas e armaduras têm progressão por material.
- Arrastar e soltar, divisão de pilha, transferência rápida e tooltip com controles.
- Cuidado para não perder itens quando a interface fecha ou ocorre autosave.

### 7.2 Crafting inicial

| Receita | Insumos de referência | Resultado | Estação |
|---|---|---|---|
| Tábuas | 1 tronco | 4 tábuas | Manual |
| Hastes | 2 tábuas | 4 hastes | Manual |
| Bancada | 4 tábuas | 1 bancada | Manual |
| Picareta simples | Tábuas + hastes | 1 picareta | Bancada |
| Tocha | Carvão + haste | 4 tochas | Manual |
| Forno | 8 pedras | 1 forno | Bancada |
| Baú | 8 tábuas | 1 baú | Bancada |
| Vidro | Areia + combustível | 1 vidro | Forno |
| Barra de cobre | Minério + combustível | 1 barra | Forno |
| Lâmpada prisma | Cristal + cobre | 1 luminária | Bancada |

As quantidades exatas de receitas exclusivas serão balanceadas. Receitas devem ser **orientadas a dados**, não codificadas individualmente na interface.

### 7.3 Progressão de materiais

**Madeira → Pedra → Cobre → Ferro → Cristal Prisma.** Cada categoria libera ferramentas mais duráveis, mineração de novos depósitos e opções estéticas/funcionais. Cristal Prisma é material fictício original vinculado às ruínas e à identidade visual do jogo.

## 8. Criaturas, fauna e combate

### 8.1 Criaturas originais

| Criatura | Tipo | Comportamento | Bioma / momento |
|---|---|---|---|
| Saltim | Passiva | Salta e foge; pode fornecer alimento | Campos; dia |
| Musgato | Neutra | Aproxima-se de jardins; foge quando atacado | Florestas |
| Raspejante | Hostil | Patrulha, percebe jogador, investe e recua | Superfície; noite |
| Vigia de Cascalho | Hostil | Protege depósitos e tem ataque telegráfico | Cavernas |
| Luzerrante | Neutra | Criatura luminosa; guia até áreas especiais | Pântano; noite |
| Guardião Prisma | Chefe de ruína | Três fases, ataques legíveis e arena destruível limitada | Beta |

### 8.2 IA

Máquina de estados inicial: **ocioso → patrulha → alerta → perseguição → ataque → recuperação → retorno**. A percepção considera distância, visão, ruído simples e iluminação de forma simplificada. Criaturas longe do jogador devem executar simulações baratas; fora do raio ativo, armazenar apenas estado persistente necessário.

### 8.3 Combate

- Ataque básico, tempo de recarga, alcance claro e reação de impacto.
- Inimigos têm animações/antecipação antes de ataques fortes.
- Armas iniciais: bastão, espada simples, arco; arco pós-MVP se necessário.
- Evitar picos injustos: spawn hostil não ocorre imediatamente junto ao jogador ou em área segura iluminada.
- Destruição do cenário por criaturas fica restrita a habilidades claramente sinalizadas.

## 9. Sistemas de construção e mundo vivo

- Portas, alçapões, escadas, placas, cercas e luminárias com orientação correta.
- Blocos translúcidos recebem ordenação apropriada ou tratamento especializado para evitar artefatos.
- Folhas, grama, flores e água respondem a vento e clima no shader.
- Agricultura simples: preparar solo, plantar, irrigar perto da água, crescer por estágios.
- Baús preservam conteúdo mesmo quando seus chunks são descarregados.
- Melhorias posteriores: circuitos energéticos **Fluxo Prisma**, peças mecânicas, elevadores e transporte.

## 10. Direção artística

### 10.1 Estilo

**Voxel estilizado de alta atmosfera**, não hiper-realista. Silhuetas legíveis, blocos simples com materiais ricos e uso deliberado de luz. Texturas autorais de 16×16 ou 32×32; detalhes visuais adicionais vêm de normal maps leves, ambient occlusion de vértices, clima e cor por bioma.

**Paleta e contraste:** dias quentes e vibrantes, noites azuladas com pontos de luz acolhedores; cavernas de contraste controlado para que o jogador consiga navegar.

### 10.2 Atmosfera

- Nascer e pôr do sol com transições graduais de cor e ângulo solar.
- Céu baseado em gradiente atmosférico e aproximação de espalhamento solar.
- Lua, estrelas e nuvens em camadas.
- Sombra de árvores e relevo; fachos de luz em floresta no modo alto/ultra.
- Sons ambientes por bioma, vento, chuva, passos diferentes por material e reverberação aproximada em cavernas.

## 11. Especificação de shaders e renderização

**Objetivo:** a mesma jogabilidade em todos os presets; recursos visuais de luxo nunca podem carregar lógica necessária de gameplay.

### 11.1 Recursos visuais

| Efeito | Implementação proposta | Observações |
|---|---|---|
| Céu atmosférico | Shader procedural com posição solar | Gradiente como fallback |
| Sombras solares | Directional Light + cascades aproximadas ou shadow camera ajustável | Evitar cobertura excessiva |
| Iluminação ambiente | AO por vértice no meshing; SSAO no alto | AO de vértices mesmo no baixo |
| Água | Fresnel, profundidade simplificada, normais animadas, transparência | Reflexo de ambiente ou planar opcional |
| Movimento da vegetação | Vertex shader usando tempo + posição global | Desligável no baixo |
| Névoa por bioma | Fog baseada em distância/altura | Ajuda a ocultar chunks distantes |
| Luz emissiva | Intensidade de material e iluminação voxel local | Bloom apenas em presets superiores |
| Brilho suave | Bloom de alta frequência com limite | Controlar halos exagerados |
| Correção de cor | Tone mapping + exposição e gama | Preservar leitura de UI |
| Anti-aliasing | FXAA/SMAA conforme custo; MSAA onde suportado | Evitar TAA com fantasmas sem testes |
| Reflexo avançado | SSR/planar experimental | Ultra, desligado por padrão |
| Volumetria | Raios solares aproximados em resolução reduzida | Ultra, com limites claros |
| Clima | Partículas reduzidas, nuvens e gotas na água | Escalável por preset |

### 11.2 Presets gráficos

| Recurso | Baixo | Médio | Alto | Ultra |
|---|---|---|---|---|
| Resolução interna | 65–75% | 85% | 100% | 100%+ |
| Distância de visão (raio) | 3 chunks | 5 chunks | 7 chunks | 8+ após testes |
| Sombras | Desligadas ou curtas | Curtas | Médias, suaves | Longas, suaves |
| AO | Por vértice | Por vértice | Vértice + SSAO | SSAO melhorado |
| Água | Opaca/translúcida simples | Fresnel básico | Fresnel + ondas | Reflexos opcionais |
| Vegetação animada | Desligada | Ligada limitada | Ligada | Ligada |
| Bloom | Não | Não | Opcional | Opcional |
| Volumetria | Não | Não | Não | Opcional |
| Partículas climáticas | Mínimas | Reduzidas | Normais | Densas |

**Implementação importante:** selecionar preset automaticamente por teste curto de desempenho, mas permitir substituição manual e mostrar o custo de cada opção. `devicePixelRatio` deve ter limite configurável.

### 11.3 Luz de blocos e sol

- Luz solar e luz artificial modeladas em grade voxel, níveis 0–15, atualizadas incrementalmente em mudanças locais.
- Malha interpola níveis entre faces/vértices para reduzir aspecto de iluminação abrupta.
- O sistema de luz do mundo **não** depende de dezenas de luzes dinâmicas Three.js por tocha.
- Ao colocar/remover lâmpada, atualizar propagação local e seções vizinhas em orçamento de tempo.
- Sombras de sol são independentes da iluminação voxel; os dois efeitos se complementam.

### 11.4 Regras de acessibilidade visual

- Slider de intensidade de bloom, vibração e brilho; opção para desativar flashes.
- Redução de movimento da câmera, folhas, efeitos de tela e partículas.
- Contorno de seleção de alto contraste, cursor ajustável e filtros de interface.
- Testar noite e cavernas sem depender de monitor HDR.

## 12. Arquitetura técnica

### 12.1 Stack sugerida

- **TypeScript + Vite** para projeto, módulos e build.
- **Three.js (WebGL2)** para cena, materiais e pós-processamento.
- **Web Workers** para gerar chunks e montar malhas sem bloquear o jogo.
- **IndexedDB** para mundos, configurações, inventário e alterações persistentes.
- **Áudio web** com banco de sons originais e controle de volume separado.
- Bibliotecas adicionais só quando necessárias; manter o motor voxel desacoplado do renderer.

### 12.2 Organização de projeto

```text
src/
  app/               # inicialização, estado, loop e serviços
  core/              # matemática, seed, eventos e configuração
  world/             # geração procedural, chunks, blocos, biomas
  workers/           # geração/meshing em paralelo
  rendering/         # shaders, materiais, céu, água, pós-processamento
  physics/           # colisão voxel e movimento
  entities/          # jogador, criaturas, itens, IA
  gameplay/          # mineração, construção, crafting, combate
  persistence/       # IndexedDB, migrações, snapshots
  ui/                # HUD, inventário, menus, controles
  audio/             # áudio espacial e música
  content/           # JSON de blocos, receitas, biomas, criaturas
  tests/             # testes unitários, integração, benchmarks
public/
  assets/            # texturas, sons, ícones e modelos originais
```

### 12.3 Sistemas e contratos mínimos

```ts
type BlockId = number;
type WorldSeed = string;
type ChunkCoord = { cx: number; cz: number };
type BlockPos = { x: number; y: number; z: number };

type WorldEdit = {
  pos: BlockPos;
  blockId: BlockId;
  state?: number;
};

interface WorldManager {
  getBlock(pos: BlockPos): BlockId;
  setBlock(edit: WorldEdit): boolean;
  requestChunks(center: ChunkCoord, radius: number): void;
  save(): Promise<void>;
}

interface ChunkMeshingJob {
  coord: ChunkCoord;
  sectionY: number;
  revision: number;
  blocks: ArrayBuffer;
  neighbors: ArrayBuffer[];
}
```

**Fluxo de atualização:** `input → física passo fixo → gameplay/IA → streaming de chunks → aplicar jobs concluídos → render → UI`. Cada job de meshing inclui revisão; resultados de revisão antiga são descartados para evitar que um chunk recém-editado volte ao estado visual anterior.

### 12.4 Geração e meshing

- Meshing por **greedy meshing** em faces opacas com mesmo material/iluminação; geometria separada para líquidos/vidro/folhagem.
- Atlas de texturas ou `texture array` conforme suporte e compatibilidade; textura por bloco nunca exige uma nova draw call.
- Gerar UV corretamente para faces mescladas; evitar estiramento indevido e vazamento entre tiles.
- Frustum culling por chunk/seção e descarte de recursos GPU com `geometry.dispose()` / `material.dispose()` conforme ciclo de vida.
- **Chunks em borda:** malhas devem conhecer blocos vizinhos; se vizinho ainda não existe, usar regra estável e remarcar borda quando ele carregar.
- Criar orçamento por frame para aplicar malhas, atualizações de luz e spawn/despawn.
- Separar geração de terreno da aplicação dos edits persistentes, que têm precedência.

### 12.5 Colisão e física

- Colisão AABB/cápsula vs voxels sólidos próximos, sem mesh collider para o terreno inteiro.
- Movimento por passo fixo (ex.: 60 Hz) com acumulação de delta limitada.
- Quebra e colocação de blocos atualizam colisão imediatamente no estado lógico, mesmo se a malha ainda estiver sendo refeita.
- Nunca permitir gravidade dependente do FPS visual.

### 12.6 Persistência robusta

- Mundo salvo como **seed + versão do gerador + metadados + alterações por chunk + entidades/baús + jogador**; não persistir cópia integral dos chunks inalterados.
- Auto-save após ações importantes e em intervalo configurável (referência: 60 s), com fila e coalescência de gravações.
- Escrita transacional no IndexedDB, controle de versão de schema e migrações.
- Exportar/importar mundos via arquivo local em formato próprio versionado (Beta).
- Verificar cotas de armazenamento e informar claramente erro de gravação; nunca afirmar que salvou se falhar.
- Persistir edição feita antes de descarregar chunk; proteger contra condição de corrida.

### 12.7 Segurança e qualidade

- Sanitizar nomes de mundos e dados importados; tratar uploads de saves como não confiáveis.
- Não executar scripts arbitrários em mapas e receitas.
- Reproduzir mesmo mundo com mesma seed e versão do gerador.
- Código modular e testes para blocos de borda, seeds e integridade dos saves.

## 13. Performance e critérios-alvo

**São metas de projeto, não desempenho medido.** Devem ser validadas em aparelhos reais e adaptadas aos resultados.

| Cenário | Meta de FPS | Preset inicial | Observação |
|---|---:|---|---|
| Desktop intermediário, 1080p | 60 | Médio/Alto | Sem travamentos perceptíveis na exploração |
| Notebook integrado, 720–900p | 45–60 | Baixo/Médio | Distância reduzida e resolução dinâmica |
| Celular intermediário moderno | 30 | Baixo | Controle por toque somente em fase dedicada |

### 13.1 Metas de estabilidade

- Frame de simulação lógico não pode escalar linearmente com o total de blocos existentes.
- Troca rápida de direção não deve provocar longas pausas por geração de chunk.
- Minimizar alocação por frame e picos de GC.
- Medir: FPS médio, 1% low, tempo de meshing, número de draw calls, triângulos, memória aproximada, chunks carregados, jobs pendentes e tempo de save.
- HUD de debug (`F3`): seed, coordenadas, bioma, chunk, FPS, draw calls, triângulos, versão e estado de persistência.
- Definir benchmarks padronizados: plano aberto, floresta densa, caverna iluminada, construção grande e deslocamento rápido.

### 13.2 Priorização de otimização

1. Eliminar faces ocultas e implementar greedy meshing.
2. Gerar e montar malhas em Workers.
3. Reutilizar materiais e draw calls por atlas.
4. Fazer culling de chunks/seções e limitar jobs por frame.
5. Ajustar distância de visão, resolução interna e sombras.
6. LOD/occlusion culling avançados apenas quando o profiler mostrar ganho.

## 14. HUD, menus e UX

### 14.1 Menu principal

**Continuar / Novo Mundo / Carregar Mundo / Configurações / Créditos.** Novo Mundo permite nome, seed opcional, modo Criativo/Sobrevivência, dificuldade e preset visual.

### 14.2 HUD in-game

- Mira central discreta e indicação do bloco selecionado.
- Vida, fome e fôlego contextuais no canto inferior.
- Hotbar sempre visível, slot ativo bem marcado.
- Mensagens pequenas para coleta, receita descoberta e falha de ação.
- `Tab` opcional para missões/guia; nunca deixar painel grande cobrindo a tela do jogo sem necessidade.
- Tela de pausa interrompe lógica local, oferece opções e confirmação para voltar ao menu.

### 14.3 Acessibilidade

- Remapeamento de teclado; inversão de mouse; sensibilidade separada para mouse e controle.
- Escala da interface de 75% a 150%.
- Legendas para eventos importantes e feedback sonoro redundante por ícone/texto.
- Modo daltônico na interface, indicação de ameaças além de cor e opção para desativar bob da câmera.

## 15. Áudio

- Trilha minimalista reativa a bioma, horário e ameaça; longos períodos ambientes sem música são válidos.
- Camadas: natureza, vento, água, cavernas, fauna, hostis, ferramentas, UI.
- Passos por família de material (terra, madeira, pedra, areia, água).
- Áudio espacial com atenuação apropriada; evitar tocar dezenas de fontes fora de alcance.
- Controles separados: master, música, efeitos, ambiente e interface.
- Todos os sons devem ser produzidos/licenciados adequadamente; não reutilizar sons de Minecraft.

## 16. Narrativa ambiental e motivação

O mundo mostra vestígios dos **Arquitetos do Prisma**, civilização original que manipulava luz mineral para energizar construções. Não há missões lineares obrigatórias: fragmentos, ruínas e objetos sugerem objetivos opcionais. A progressão não bloqueia o sandbox; o jogador pode dedicar-se somente a construir.

**Objetivo de médio prazo:** encontrar três sítios antigos e montar um **Farol Prisma** que ilumina uma região, altera a cor do céu por alguns minutos e libera novas receitas decorativas. Na Beta, um Guardião Prisma protege o núcleo final.

## 17. Progressão detalhada por fases

### Fase 0 — Protótipo técnico (P0)

**Entregáveis:** câmera FPS, colisão, 12 blocos, criar/quebrar/colocar, mundo em chunks, terreno com seed, céu e luz simples, debug.  
**Critério de saída:** explorar e editar terreno por 15 minutos sem crash, sem vazamento crescente aparente de geometria e sem perder colisão após edição.

### Fase 1 — Vertical slice do visual (P0)

**Entregáveis:** shaders de céu/água/folhas, ciclo dia/noite, presets Baixo/Médio/Alto, sombras, fog, AO de vértices; dois biomas.  
**Critério de saída:** alternar presets em tempo real sem reiniciar, sem quebrar seleção de blocos ou iluminação, e registrar métricas por cenário.

### Fase 2 — MVP jogável (P0)

**Entregáveis:** inventário, hotbar, crafting, ferramentas, durabilidade, bancada/forno/baú, recursos básicos, vida/fome, uma criatura hostil, save/load.  
**Critério de saída:** criar mundo, reunir recursos, construir abrigo, sobreviver à primeira noite, sair do navegador e retomar sem perda de progresso confirmada.

### Fase 3 — Alpha de exploração (P1)

**Entregáveis:** 4 biomas, cavernas, minérios, combate, fauna, agricultura simples, clima e ruínas.  
**Critério de saída:** partida de 60 minutos com progressão perceptível e nenhuma ruptura grave ao atravessar limites de chunks.

### Fase 4 — Beta de conteúdo/visual (P1)

**Entregáveis:** 6 biomas, chefe, materiais avançados, construções variadas, export/import de save, UX, áudio completo, shaders Alto/Ultra opcionais.  
**Critério de saída:** sessões de 2 horas com salvamento estável e performance documentada em 3 classes de dispositivo.

### Fase 5 — Lançamento v1.0 (P0 para qualidade)

**Entregáveis:** correções de bugs, acessibilidade essencial, balanceamento, tutorial opcional, tela de configurações completa e telemetria **local** de benchmark (sem coletar dados pessoais por padrão).  
**Critério de saída:** sem bugs bloqueadores de save/load, sem duplicação irrestrita de itens e sem travamentos graves em cenários de teste definidos.

## 18. Backlog prioritário e dependências

| Ordem | Tarefa | Prioridade | Depende de |
|---:|---|---|---|
| 1 | Repositório TS/Vite/Three.js, loop e tela inicial | P0 | — |
| 2 | Registro orientado a dados de blocos | P0 | 1 |
| 3 | Chunk e geração determinística | P0 | 2 |
| 4 | Greedy meshing + atlas + materiais | P0 | 3 |
| 5 | Controle FPS + raycast + colisão | P0 | 3 |
| 6 | Colocar/quebrar + atualização de seções | P0 | 4, 5 |
| 7 | Worker pipeline + streaming e descarte | P0 | 4 |
| 8 | Persistência de edits e jogador | P0 | 6 |
| 9 | Sky shader + ciclo dia/noite | P0 | 1 |
| 10 | Shaders de água/vegetação + presets | P0 | 4, 9 |
| 11 | Luz voxel + iluminação local | P0 | 6 |
| 12 | Inventário/hotbar e drops | P0 | 6 |
| 13 | Crafting e estações | P0 | 12 |
| 14 | Sobrevivência + IA/combate | P0 | 5, 12 |
| 15 | Biomas ampliados + cavernas + ruínas | P1 | 3, 7 |
| 16 | Boss, progressão e pós-processamento avançado | P1 | 14, 15 |
| 17 | Multiplayer com servidor autoritativo | P2 | MVP estável, protocolo e segurança |

## 19. Testes funcionais obrigatórios

### 19.1 Mundo/streaming

- Mesma seed e mesma versão geram os mesmos biomas e estruturas.
- Viajar cruzando chunks não cria buracos, sombras espúrias persistentes ou árvores cortadas.
- Editar bloco na borda atualiza corretamente o chunk adjacente.
- Quebrar bloco e descarregar/recarregar chunk mantém o estado correto.
- Trocar mundo não reaproveita erroneamente blocos, entidades ou luz do mundo anterior.

### 19.2 Gameplay

- Não é possível colocar bloco dentro da colisão do jogador.
- Ferramentas aplicam resistência/durabilidade corretamente.
- Inventário não duplica nem perde itens em drag/drop, morte ou fechamento.
- Criaturas não atacam através de paredes e não spawnam em zonas protegidas.
- Pausa realmente congela simulação local; menus não deixam pointer lock preso.

### 19.3 Render

- Água e vidro não produzem artefatos graves com blocos vizinhos.
- Shader de folhas não altera colisão, hitbox ou posição lógica.
- Céu e luz não piscam ao cruzar meio-dia/meia-noite.
- Desligar sombras/SSAO/bloom não desabilita luz necessária para sobreviver.
- Resizing, fullscreen e troca de presets não quebram framebuffers.

### 19.4 Persistência

- Salvar no meio de tempestade e carregar preserva jogador, baús e mudanças.
- Reload durante streaming de chunks não corrompe arquivos locais.
- Falta de espaço gera aviso e mantém último save válido.
- Mudança de versão detecta schema e migra ou oferece backup legível.

## 20. Riscos e decisões técnicas

| Risco | Impacto | Estratégia |
|---|---|---|
| Renderizar cubos individuais | Draw calls excessivas | Greedy meshing em seções |
| Múltiplas luzes dinâmicas por tocha | FPS instável | Iluminação voxel local |
| Geração síncrona de terreno | Travadas | Workers e fila com prioridade |
| Meshing de chunk inteiro após cada edição | Travadas e pico de GPU | Atualização seletiva por seção |
| Shaders pesados em hardware fraco | Jogo inacessível | Presets e resolução dinâmica |
| Saves grandes/corrompidos | Perda de progressão | Salvar somente edits, migrações, transações |
| Dependências acopladas | Difícil evoluir | Separar lógica do mundo e renderer |
| Escopo excessivo antes do protótipo | Sem jogo jogável | Vertical slice e MVP antes de multiplayer |
| Limites de WebGL2 | Efeitos inconsistentes | Fallbacks testados e recursos opcionais |

## 21. Definição de pronto — primeira versão demonstrável

A primeira demo será considerada **jogável**, não apenas uma cena bonita, quando permitir:

- [ ] Criar mundo procedural com seed definida.
- [ ] Caminhar, correr, pular e colidir com terreno estável.
- [ ] Minerar e colocar blocos com áudio, drops e feedback.
- [ ] Carregar novos chunks e descarregar antigos sem travamento grave.
- [ ] Ter dois biomas visualmente distintos.
- [ ] Ver o ciclo dia/noite com céu, sombras, água e vegetação por preset.
- [ ] Usar inventário, criar bancada e fabricar ferramenta.
- [ ] Construir um pequeno abrigo e acender uma luz.
- [ ] Encontrar uma ameaça noturna e sobreviver a ela.
- [ ] Salvar, fechar a aba e continuar com construções intactas.
- [ ] Alterar qualidade gráfica durante a partida.
- [ ] Inspecionar métricas e logs de debug reproduzíveis.

## 22. Melhor próxima tarefa prática

Implementar um **vertical slice em Three.js** com geração de terreno por seed, 16 tipos de bloco, chunks e greedy meshing, colisão FPS, mineração e construção, água e folhas com shaders, luz solar dinâmica e três presets. **Depois** introduzir crafting e criaturas. Assim os riscos técnicos mais difíceis são resolvidos antes de investir em dezenas de recursos de conteúdo.

---

**Observação de propriedade intelectual:** este GDD especifica um jogo original do gênero voxel sandbox. Não inclui código, nomes, texturas, modelos, sons ou marcas de terceiros. Parâmetros e cronograma são propostas iniciais a validar durante produção.
