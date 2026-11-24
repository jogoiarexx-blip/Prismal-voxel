'use strict';
const Voxel = (() => {
  const S = 16,
    H = 160,
    SEA = 60,
    version = 1;
  const data = [
    ['Ar', '91afc3', 0],
    ['Grama de âmbar', '85a94f', 0.4],
    ['Terra', '93663e', 0.42],
    ['Pedra', '93918b', 1.65],
    ['Areia', 'd9c58f', 0.35],
    ['Tronco', '845d37', 0.82],
    ['Folhas', '4e874c', 0.18],
    ['Água', '4699a4', 0],
    ['Tábuas', 'b88e57', 0.52],
    ['Carvão mineral', '68635a', 1.45],
    ['Minério de cobre', 'af826b', 1.75],
    ['Cristal prisma', 'aa80d0', 1.95],
    ['Bancada', 'a57546', 0.9],
    ['Lâmpada prisma', 'eab557', 0.55],
    ['Forno', '827d73', 1.25],
    ['Baú', 'b79559', 0.8],
    ['Vidro', 'a2d4cd', 0.3],
    ['Grama da névoa', '608971', 0.4],
    ['Folhas da névoa', '447869', 0.18],
    ['Musgo', '6a915f', 0.35],
    ['Pedra talhada', 'a49383', 1.4],
    ['Haste', 'b99461', 0],
    ['Picareta simples', 'ad9c80', 0],
    ['Frutas silvestres', 'd77665', 0],
    ['Barra de cobre', 'd69b66', 0],
    ['Tocha', 'ffbe55', 0.15],
    ['Mosaico prisma', 'a89fbf', 0.7],
    ['Tronco escuro', '70503a', 0.88],
    ['Núcleo adormecido', '51919c', 2],
    ['Núcleo desperto', '6df0d0', 2],
    ['Farol Prisma', '91f0df', 1.6],
    ['Pedra rúnica', '637671', 1.3],
    ['Gelo azul', 'addfe7', 0.7],
    ['Cinza mineral', '5e6168', 0.6],
    ['Minério de ferro', '987c67', 2.1],
    ['Barra de ferro', 'bdc4c2', 0],
    ['Fungo luminescente', '7ee8bb', 0.2],
    ['Sementes', 'dfa84e', 0],
    ['Canteiro', '795336', 0.45],
    ['Brotos', '85a64b', 0.35],
    ['Trigo maduro', 'e3bb59', 0.35],
    ['Pão de campo', 'dcaa68', 0],
    ['Picareta de pedra', '9ca59a', 0],
    ['Picareta de cobre', 'cb895e', 0],
    ['Picareta de ferro', 'd5dddd', 0],
    ['Picareta prisma', 'aa8ada', 0],
    ['Cama de campo', '986857', 0.65],
    ['Espada de ferro', 'cbd9da', 0],
    ['Tijolos de pedra', '8e9897', 1.6],            // 48
    ['Escada de madeira', 'b88e57', 0.65],          // 49
    ['Escada de madeira', 'b88e57', 0.65],          // 50
    ['Escada de madeira', 'b88e57', 0.65],          // 51
    ['Escada de madeira', 'b88e57', 0.65],          // 52
    ['Laje de madeira', 'b58b58', 0.52],            // 53
    ['Laje de pedra', '93918b', 1.1],              // 54
    ['Cerca de madeira', '966c40', 0.7],           // 55
    ['Painel de vidro', 'b0e6e2', 0.24],           // 56
    ['Porta de madeira', 'aa794c', 0.75],          // 57
    ['Porta de madeira', 'aa794c', 0.75],          // 58
    ['Porta de madeira', 'aa794c', 0.75],          // 59
    ['Porta de madeira', 'aa794c', 0.75],          // 60
    ['Porta aberta', 'aa794c', 0.75],              // 61
    ['Porta aberta', 'aa794c', 0.75],              // 62
    ['Porta aberta', 'aa794c', 0.75],              // 63
    ['Porta aberta', 'aa794c', 0.75],              // 64
    ['Telha de argila', 'a75b49', 0.8],            // 65
    ['Tijolos vermelhos', 'ac6851', 1.3],         // 66
    ['Lanterna artesanal', 'f9c96d', 0.3],         // 67
    ['Tábuas escuras', '765139', 0.55],           // 68
    ['Escada de pedra', '93918b', 1.5],           // 69
    ['Escada de pedra', '93918b', 1.5],           // 70
    ['Escada de pedra', '93918b', 1.5],           // 71
    ['Escada de pedra', '93918b', 1.5],           // 72
    ['Pilar de cobre', 'bb8260', 1.25],           // 73
    ['Piso de pedra', '9a9c8f', 1.25],             // 74
    ['Reboco claro', 'e2d9be', 0.6],               // 75
    ['Grade de ferro', '8e9a9e', 1.2],            // 76
    ['Estante de madeira', '856544', 0.65],       // 77
    ['Mesa de madeira', 'a07850', 0.55],          // 78
    ['Cadeira de madeira', 'a07850', 0.45],       // 79
    // IDs 80–82 are reserved for the procedural grass shaders, not blocks.
    ['Decoração de campo', '6d9b53', 0], // 80
    ['Flor âmbar', 'e2b64f', 0],         // 81
    ['Flor da névoa', '90dfd2', 0],      // 82
    ['Armário de madeira', '866344', 0.65], // 83
    ['Barril de armazenamento', '92714b', 0.7], // 84
    ['Alçapão de madeira', 'ad8455', 0.5], // 85
    ['Alçapão aberto', 'ad8455', 0.5], // 86
    ['Sofá de campo', '9c5e57', 0.65], // 87
    ['Tapete vermelho', 'b8645d', 0.12], // 88
    ['Machado de ferro', 'bccad1', 0], // 89
    ['Pá de pedra', 'a2a69b', 0], // 90
    ['Viga de madeira', '89623c', 0.85], // 91
    ['Janela emoldurada', '95c7c7', 0.36], // 92
    ['Tocha de parede (oeste)', 'ffbe55', 0.15], // 93
    ['Tocha de parede (leste)', 'ffbe55', 0.15], // 94
    ['Tocha de parede (norte)', 'ffbe55', 0.15], // 95
    ['Tocha de parede (sul)', 'ffbe55', 0.15], // 96
    ['Porta alta superior', 'aa794c', 0.75], // 97-100: fechada
    ['Porta alta superior', 'aa794c', 0.75],
    ['Porta alta superior', 'aa794c', 0.75],
    ['Porta alta superior', 'aa794c', 0.75],
    ['Porta alta aberta superior', 'aa794c', 0.75], // 101-104
    ['Porta alta aberta superior', 'aa794c', 0.75],
    ['Porta alta aberta superior', 'aa794c', 0.75],
    ['Porta alta aberta superior', 'aa794c', 0.75],
    // Lightweight creature palette (render materials; never terrain blocks)
    ['Pele de âmbar', 'd5a05c', 0], // 105
    ['Barriga creme', 'f1d69e', 0], // 106
    ['Pelo de musgo', '4e845d', 0], // 107
    ['Pelo de sombra', '2b5448', 0], // 108
    ['Pele de rocha', '667178', 0], // 109
    ['Olhos de âmbar', 'ffe174', 0], // 110
    ['Núcleo bioluminescente', '50efd4', 0], // 111
    ['Runa escura', '25344b', 0], // 112
    ['Carapaça dourada', 'cf9c59', 0], // 113
    ['Cristal violeta', 'b49fe7', 0], // 114
    // Voxel livestock: colors are generated in WebGL; no meshes or large textures.
    ['Lã clara', 'eee9d9', 0],        // 115
    ['Rosto de ovelha', '867b73', 0], // 116
    ['Cascos', '484646', 0],          // 117
    ['Pele de porco', 'e7a6ab', 0],   // 118
    ['Focinho rosado', 'f1c1c0', 0],  // 119
    ['Pelo de vaca', '755a4a', 0],    // 120
    ['Manchas de vaca', 'f4e2c3', 0], // 121
    ['Focinho de vaca', 'b8a08c', 0], // 122
    ['Lã', 'e7e2d5', 0],              // 123 item
    ['Carne suína crua', 'd78584', 0], // 124 item
    ['Carne bovina crua', 'b96560', 0], // 125 item
    // Two-block bed halves; one inventory item (46) places both halves.
    ['Cama de campo (pés N)', '986857', .65], // 126-129: feet
    ['Cama de campo (pés L)', '986857', .65],
    ['Cama de campo (pés S)', '986857', .65],
    ['Cama de campo (pés O)', '986857', .65],
    ['Cama de campo (cabeceira N)', '986857', .65], // 130-133: head
    ['Cama de campo (cabeceira L)', '986857', .65],
    ['Cama de campo (cabeceira S)', '986857', .65],
    ['Cama de campo (cabeceira O)', '986857', .65],
    ['Muda de âmbar', '80b84a', .12], // 134: planta de árvore clara
    ['Muda da névoa', '4ca488', .12], // 135: planta de árvore escura
    ['Forno aceso', 'db8f54', 1.25], // 136: block visual, item is still 14
    ['Pele de zumbi', '83a783', 0], // 137: creature-only material
    ['Roupa gasta', '536c66', 0], // 138
    ['Olhos de zumbi', 'f3bb69', 0], // 139
  ];
  const blocks = data.map(([name, hex, hard], id) => ({
    id,
    name,
    hex,
    hard,
    solid: (!!id && ![7, 21, 22, 23, 24, 25, 35, 36, 37, 41, 42, 43, 44, 45, 47, 80, 81, 82, 88, 89, 90].includes(id) && !(id >= 93 && id <= 96) && id < 105) || (id >= 126 && id <= 133) || id === 136,
    placeable:
      (id === 134 || id === 135 || (id > 0 && id < 93 && ![7, 21, 22, 23, 24, 28, 29, 35, 37, 39, 40, 41, 42, 43, 44, 45, 47, 50, 51, 52, 58, 59, 60, 61, 62, 63, 64, 70, 71, 72, 80, 81, 82, 86, 89, 90].includes(id))),
  }));
  // A few detailed architectural pieces are built from tiny boxes only when placed.
  // Regular terrain still uses greedy meshing, without textures or new draw calls.
  const shapes = new Map();
  const box = (x, y, z, w, h, d, material) => material == null ? [x,y,z,w,h,d] : [x,y,z,w,h,d,material];
  // Architectural stairs: two walkable steps with shaped nosings and visible
  // riser joints. Reuse the existing rotated IDs (49–52 and 69–72), so old
  // worlds keep their orientations and crafting costs.
  for (const base of [49, 69]) {
    const stone = base === 69;
    const trim = stone ? 74 : 8, joint = stone ? 20 : 68;
    const parts = [
      box(0,0,0,1,.49,1,base),
      box(0,.50,.5,1,.485,.5,base),
      box(.035,.47,.03,.93,.03,.16,trim),       // first tread nosing
      box(.035,.985,.53,.93,.015,.16,trim),      // high tread nosing
      box(.04,.54,.483,.085,.38,.022,joint),   // riser side joinery
      box(.875,.54,.483,.085,.38,.022,joint),
      box(.26,.62,.481,.48,.055,.021,trim),     // centre inset
    ];
    for (let facing=0;facing<4;facing++)
      shapes.set(base+facing,parts.map(p=>rotateShapeBox(p,facing)));
  }
  // A better torch silhouette: pedestal on the floor, small bracket on walls,
  // and a compact flame so the light looks attached instead of floating.
  shapes.set(25, [
    box(.34, .00, .34, .32, .05, .32, 8),
    box(.46, .05, .46, .08, .45, .08, 21),
    box(.41, .50, .41, .18, .07, .18, 8),
    box(.39, .57, .39, .22, .16, .22, 25),
    box(.43, .73, .43, .14, .10, .14, 25),
  ]);
  // 93 / 94 support on the x- / x+ face; 95 / 96 support on z- / z+ face.
  // Each one gets a wall plate, a small arm and a flame close to the wall.
  for (const [id, axis, side] of [[93,'x',0],[94,'x',1],[95,'z',0],[96,'z',1]]) {
    const alongX = axis === 'x';
    const pieces = alongX
      ? (side === 0
          ? [
              box(.00,.30,.34,.10,.24,.32,8),
              box(.09,.37,.45,.23,.10,.10,21),
              box(.28,.44,.40,.12,.12,.20,8),
              box(.24,.56,.38,.20,.16,.24,25),
              box(.28,.72,.42,.12,.08,.16,25),
            ]
          : [
              box(.90,.30,.34,.10,.24,.32,8),
              box(.68,.37,.45,.23,.10,.10,21),
              box(.60,.44,.40,.12,.12,.20,8),
              box(.56,.56,.38,.20,.16,.24,25),
              box(.60,.72,.42,.12,.08,.16,25),
            ])
      : (side === 0
          ? [
              box(.34,.30,.00,.32,.24,.10,8),
              box(.45,.37,.09,.10,.10,.23,21),
              box(.40,.44,.28,.20,.12,.12,8),
              box(.38,.56,.24,.24,.16,.20,25),
              box(.42,.72,.28,.16,.08,.12,25),
            ]
          : [
              box(.34,.30,.90,.32,.24,.10,8),
              box(.45,.37,.68,.10,.10,.23,21),
              box(.40,.44,.60,.20,.12,.12,8),
              box(.38,.56,.56,.24,.16,.20,25),
              box(.42,.72,.60,.16,.08,.12,25),
            ]);
    shapes.set(id, pieces);
  }
  // Workbench: not another solid cube. Bench top, four square legs,
  // tool shelf, drawer, brass handle and a small blade/ruler silhouette.
  // Materials are from the existing palette, so no new textures or requests.
  shapes.set(12, [
    box(.04,.77,.04,.92,.16,.92,8),
    box(.045,.93,.045,.91,.035,.91,12),
    box(.08,0,.08,.16,.77,.16,68), box(.76,0,.08,.16,.77,.16,68),
    box(.08,0,.76,.16,.77,.16,68), box(.76,0,.76,.16,.77,.16,68),
    box(.10,.32,.10,.80,.09,.80,8),
    box(.24,.47,.035,.52,.22,.065,68), // front drawer
    box(.43,.56,.012,.14,.07,.035,35),
    box(.16,.973,.24,.45,.022,.045,35),
    box(.58,.972,.18,.13,.025,.36,21),
    box(.66,.976,.18,.12,.018,.16,24),
  ]);
  // Half slabs have visible edge bands, instead of featureless solid halves.
  shapes.set(53, [box(0,0,0,1,.46,1),box(.03,.46,.03,.94,.04,.94,8)]);
  shapes.set(54, [box(0,0,0,1,.46,1),box(.03,.46,.03,.94,.04,.94,74)]);
  // Fence post with a cut top and paired rails. The original shape envelope
  // and block ID remain unchanged for walls and saved farms.
  shapes.set(55, [
    box(.36,0,.36,.28,.94,.28,68),
    box(.29,.90,.29,.42,.10,.42,8),
    box(0,.28,.43,1,.12,.14,8),box(.43,.28,0,.14,.12,1,8),
    box(0,.68,.43,1,.11,.14,8),box(.43,.68,0,.14,.11,1,8),
  ]);
  shapes.set(56, [box(.455, 0, .02, .09, 1, .96)]);
  // Architectural doors: preserve the original orientation and collision envelope.
  // Render the two faces with recessed panels, rails, hinges and metal hardware.
  const doorCollisions = new Map();
  for (let facing = 0; facing < 4; facing++) {
    doorCollisions.set(57 + facing, [facing % 2 ? box(.4, 0, 0, .2, 1, 1) : box(0, 0, .4, 1, 1, .2)]);
    doorCollisions.set(61 + facing, [facing % 2 ? box(0, 0, facing === 1 ? .08 : .75, 1, 1, .17) : box(facing === 0 ? .08 : .75, 0, 0, .17, 1, 1)]);
  }
  for (let facing = 0; facing < 8; facing++) {
    const lower=57+facing, upper=97+facing;
    const [x,,z,w,,d]=doorCollisions.get(lower)[0];
    const alongX=w>d, thickness=alongX?d:w;
    // u is distance along the door and v is distance through its thickness.
    const panel=(u,y,v,span,h,t,mat)=>alongX
      ? box(x+u,y,z+v,span,h,t,mat)
      : box(x+v,y,z+u,t,h,span,mat);
    const rim=.045, core=thickness-2*rim;
    const parts=[panel(0,0,rim,1,1,core,8),
      panel(0,0,0,.13,1,thickness,68),
      panel(.87,0,0,.13,1,thickness,68),
      panel(.13,0,0,.74,.13,thickness,68),
      panel(.13,.87,0,.74,.13,thickness,68),
      panel(.13,.46,0,.74,.08,thickness,68)];
    for(const v of [.014, thickness-.034]) {
      // Inlaid panel borders and a handle on each face, without extending into
      // the neighboring block or adding invisible collision to the doorway.
      parts.push(panel(.18,.19,v,.64,.035,.02,57),panel(.18,.405,v,.64,.035,.02,57),
        panel(.18,.225,v,.035,.18,.02,57),panel(.785,.225,v,.035,.18,.02,57),
        panel(.18,.59,v,.64,.035,.02,57),panel(.18,.815,v,.64,.035,.02,57),
        panel(.18,.625,v,.035,.19,.02,57),panel(.785,.625,v,.035,.19,.02,57));
    }
    for(const v of [0,thickness-.028]) {
      parts.push(panel(.79,.65,v,.07,.10,.028,35),
        panel(.73,.68,v,.12,.035,.028,24));
    }
    shapes.set(lower,parts);
    // Upper half: two-by-two glazing, wooden mullions and continuous frame.
    const top=[panel(0,0,0,1,.19,thickness,68),panel(0,.83,0,1,.17,thickness,68),
      panel(0,.19,0,.18,.64,thickness,68),panel(.82,.19,0,.18,.64,thickness,68),
      panel(.47,.19,.025,.06,.64,thickness-.05,8),
      panel(.18,.48,.025,.29,.06,thickness-.05,8),
      panel(.53,.48,.025,.29,.06,thickness-.05,8)];
    for(const [u,y,span,h] of [[.18,.19,.29,.29],[.53,.19,.29,.29],[.18,.54,.29,.29],[.53,.54,.29,.29]])
      top.push(panel(u,y,(thickness-.045)/2,span,h,.045,56));
    shapes.set(upper,top);
    // Keep the v0.9.24 upper collision (including the existing pane) unchanged.
    doorCollisions.set(upper,alongX ? [box(x,0,z,w,.19,d),box(x,.83,z,w,.17,d),
      box(x,0,z,.18,1,d),box(x+w-.18,0,z,.18,1,d),
      box(x+.17,.18,z+.03,w-.34,.67,Math.max(.04,d-.06),56)] : [
      box(x,0,z,w,.19,d),box(x,.83,z,w,.17,d),box(x,0,z,w,1,.18),
      box(x,0,z+d-.18,w,1,.18),box(x+.03,.18,z+.17,Math.max(.04,w-.06),.67,d-.34,56)]);
  }
  // Lantern: open metal frame around a visible warm-light core.
  shapes.set(67, [
    box(.27,.05,.27,.46,.12,.46,35),
    box(.36,.18,.36,.28,.48,.28,25),
    box(.26,.65,.26,.48,.12,.48,35),
    box(.28,.16,.28,.07,.50,.07,35),box(.65,.16,.28,.07,.50,.07,35),
    box(.28,.16,.65,.07,.50,.07,35),box(.65,.16,.65,.07,.50,.07,35),
    box(.43,.77,.43,.14,.15,.14,35),
    box(.39,.90,.43,.22,.065,.14,35),
  ]);
  shapes.set(76, [box(.42, 0, .02, .16, 1, .96), box(.43, .25, 0, .14, .09, 1), box(.43, .73, 0, .14, .09, 1)]);
  // Dining table: framed planks and apron, rather than one flat prism.
  shapes.set(78, [
    box(.045,.77,.045,.91,.13,.91,8),
    box(.05,.90,.05,.90,.04,.90,78),
    box(.12,0,.12,.15,.77,.15,68),box(.73,0,.12,.15,.77,.15,68),
    box(.12,0,.73,.15,.77,.15,68),box(.73,0,.73,.15,.77,.15,68),
    box(.11,.62,.09,.78,.13,.10,68), box(.11,.62,.81,.78,.13,.10,68),
    box(.11,.62,.11,.10,.13,.78,68), box(.79,.62,.11,.10,.13,.78,68),
    box(.05,.937,.24,.90,.015,.035,68),box(.05,.937,.64,.90,.015,.035,68),
  ]);
  // Wooden chair: legs, padded seat, side supports and a slatted backrest.
  shapes.set(79, [
    box(.13,.45,.13,.74,.12,.74,8),
    box(.17,.57,.17,.66,.06,.59,88),
    box(.15,0,.15,.14,.45,.14,68),box(.72,0,.15,.14,.45,.14,68),
    box(.15,0,.72,.14,.45,.14,68),box(.72,0,.72,.14,.45,.14,68),
    box(.13,.55,.77,.14,.43,.15,68),box(.73,.55,.77,.14,.43,.15,68),
    box(.23,.84,.78,.54,.11,.13,8),box(.23,.66,.78,.54,.09,.13,8),
  ]);
  // Cama de campo: base de madeira, colchão mais baixo, coberta e travesseiro.
  shapes.set(46, [
    box(.05,.00,.05,.90,.12,.90,8),
    box(.08,.12,.08,.12,.18,.12,8), box(.80,.12,.08,.12,.18,.12,8),
    box(.08,.12,.80,.12,.18,.12,8), box(.80,.12,.80,.12,.18,.12,8),
    box(.08,.24,.08,.84,.18,.84,115),
    box(.08,.30,.08,.84,.16,.58,88),
    box(.08,.30,.66,.84,.12,.18,123),
    box(.03,.24,.84,.94,.26,.09,8),
  ]);
  // Lightweight furniture shapes: all faces are packed in the existing chunk mesh.
  // Baú clássico: pés, corpo de madeira, tampa separada, dobradiças e fecho de metal.
  shapes.set(15, [
    box(.10,.06,.10,.80,.57,.80,8),
    box(.07,.59,.07,.86,.24,.86,68),
    box(.08,.58,.06,.84,.06,.06,35),
    box(.10,.12,.04,.80,.07,.07,68),
    box(.10,.46,.04,.80,.06,.07,68),
    box(.39,.42,.025,.22,.24,.10,35),
    box(.46,.48,.00,.08,.08,.05,24),
    box(.16,.01,.15,.15,.07,.15,8), box(.69,.01,.15,.15,.07,.15,8),
    box(.16,.01,.69,.15,.07,.15,8), box(.69,.01,.69,.15,.07,.15,8),
    box(.10,.65,.055,.10,.15,.07,35),box(.80,.65,.055,.10,.15,.07,35),
    box(.18,.80,.15,.64,.022,.70,8),
  ]);
  // Double-door cabinet: wooden frame, inset door leaves, hinges and handles.
  shapes.set(83, [
    box(.07,.09,.10,.86,.81,.81,68),
    box(.055,.08,.045,.89,.10,.88,8),box(.055,.87,.045,.89,.11,.88,8),
    box(.055,.12,.045,.11,.76,.89,8),box(.835,.12,.045,.11,.76,.89,8),
    box(.19,.21,.03,.29,.59,.060,83),box(.52,.21,.03,.29,.59,.06,83),
    box(.45,.42,.006,.035,.13,.035,35),box(.515,.42,.006,.035,.13,.035,35),
    box(.07,0,.12,.12,.09,.14,68),box(.81,0,.12,.12,.09,.14,68),
    box(.07,0,.74,.12,.09,.14,68),box(.81,0,.74,.12,.09,.14,68),
    box(.26,.18,.919,.06,.61,.022,8),box(.68,.18,.919,.06,.61,.022,8),
  ]);
  // Open bookcase: three shelves with visible books of varying heights.
  // Book colors reuse the clay/metal/prisma materials already in the game.
  const shelves = [
    box(.06,.00,.07,.88,.10,.87,68),
    box(.06,.29,.07,.88,.085,.87,8),
    box(.06,.59,.07,.88,.085,.87,8),
    box(.06,.90,.07,.88,.10,.87,8),
    box(.06,.00,.07,.12,1,.87,68),
    box(.82,.00,.07,.12,1,.87,68),
    // Open from either side; thin rear uprights avoid hiding all the books.
    box(.19,.10,.82,.085,.80,.11,68),box(.725,.10,.82,.085,.80,.11,68),
  ];
  for (let row=0;row<3;row++) {
    const bottom=[.10,.375,.685][row], colors=[65,73,20,114];
    for (let i=0;i<4;i++) {
      const height=.155+((i+row)%3)*.023;
      shelves.push(box(.22+i*.145,bottom,.17,.105,height,.57,colors[(i+row)%4]));
    }
  }
  shapes.set(77,shelves);
  // Furnace with dark mouth. A fuelled furnace uses the same model plus a flame mesh.
  const furnaceShell = [
    box(.03,.03,.03,.94,.15,.94,3), // foundation
    box(.03,.18,.03,.17,.61,.94,20), box(.80,.18,.03,.17,.61,.94,20),
    box(.20,.18,.68,.60,.61,.29,20), // back wall
    box(.03,.79,.03,.94,.18,.94,20), // top
    box(.20,.18,.03,.60,.17,.17,20), // lip
    box(.20,.68,.03,.60,.11,.17,20), // upper front edge
    box(.20,.35,.18,.60,.33,.12,9), // dark inset
    box(.22,.39,.005,.10,.25,.065,35),box(.68,.39,.005,.10,.25,.065,35),
    box(.35,.72,.005,.30,.055,.065,3), // lintel & grate
    box(.25,.08,.78,.14,.18,.14,3), box(.61,.08,.78,.14,.18,.14,3),
    // Two shallow rear air vents keep the oven legible from any direction.
    box(.29,.48,.975,.42,.035,.017,35),box(.29,.59,.975,.42,.035,.017,35),
  ];
  shapes.set(14, furnaceShell);
  shapes.set(136, [...furnaceShell,
    box(.28,.37,.12,.44,.18,.16,25),
    box(.37,.55,.12,.26,.15,.16,25),
    box(.47,.69,.12,.12,.08,.16,25),
  ]);
  // Miniature trees stay cheap: five tiny voxels instead of a full transparent cube.
  for (const [id,foliage] of [[134,6],[135,18]]) shapes.set(id,[
    box(.45,.00,.45,.10,.40,.10,21),
    box(.27,.25,.28,.46,.22,.44,foliage),
    box(.33,.44,.33,.34,.26,.34,foliage),
    box(.43,.66,.43,.14,.12,.14,foliage),
  ]);
  // Barrel: iron hoops, staves and wooden lid with reinforced rim.
  shapes.set(84, [
    box(.18,.07,.18,.64,.78,.64,68),
    box(.14,.15,.15,.72,.11,.70,35),box(.14,.68,.15,.72,.11,.70,35),
    box(.15,.15,.14,.70,.11,.72,35),box(.15,.68,.14,.70,.11,.72,35),
    box(.24,.26,.13,.10,.41,.045,8),box(.45,.26,.13,.10,.41,.045,8),box(.66,.26,.13,.10,.41,.045,8),
    box(.23,.82,.23,.54,.10,.54,8),
    box(.18,.91,.18,.64,.05,.64,68),
    box(.39,.956,.39,.22,.015,.22,35),
  ]);
  // Hatch: thick wood panel and hinged metal strips, horizontal and open.
  shapes.set(85, [
    box(.04,.04,.04,.92,.13,.92,8),
    box(.09,.17,.10,.82,.025,.16,68),box(.09,.17,.74,.82,.025,.16,68),
    box(.09,.17,.13,.12,.025,.73,68),box(.79,.17,.13,.12,.025,.73,68),
    box(.17,.18,.05,.18,.04,.10,35),box(.65,.18,.05,.18,.04,.10,35),
  ]);
  shapes.set(86, [
    box(.04,0,.05,.92,.94,.13,8),
    box(.09,.08,.19,.82,.10,.045,68),box(.09,.79,.19,.82,.10,.045,68),
    box(.15,.18,.19,.12,.64,.04,68),box(.73,.18,.19,.12,.64,.04,68),
  ]);
  // The modern bed occupies two adjacent ground cells, but is still crafted as item 46.
  // Rotate every tiny box in place: no imported mesh, atlas, or extra draw calls.
  function rotateShapeBox(p, facing) {
    const [x,y,z,width,height,depth,...material] = p;
    if (facing === 0) return p;
    if (facing === 1) return box(1-z-depth,y,x,depth,height,width,...material);
    if (facing === 2) return box(1-x-width,y,1-z-depth,width,height,depth,...material);
    return box(z,y,1-x-width,depth,height,width,...material);
  }
  const bedFeetParts = [
    box(.08,.00,.08,.15,.23,.15,8), box(.77,.00,.08,.15,.23,.15,8),
    box(.08,.00,.77,.15,.23,.15,8), box(.77,.00,.77,.15,.23,.15,8),
    box(.03,.21,.03,.94,.13,.94,8), // timber support and frame
    box(.065,.34,.02,.87,.15,.93,115), // compact mattress
    box(.045,.48,.02,.91,.12,.85,88), // red wool blanket
    box(.03,.35,.87,.94,.23,.10,8), // footboard, one coherent piece
  ];
  const bedHeadParts = [
    box(.08,.00,.08,.15,.23,.15,8), box(.77,.00,.08,.15,.23,.15,8),
    box(.08,.00,.77,.15,.23,.15,8), box(.77,.00,.77,.15,.23,.15,8),
    box(.03,.21,.03,.94,.13,.94,8),
    box(.065,.34,.02,.87,.15,.93,115),
    box(.12,.49,.18,.76,.13,.32,123), // soft pale pillow
    box(.045,.48,.52,.91,.12,.46,88), // blanket touches the foot section
    box(.03,.35,.02,.94,.35,.10,8), // tall wooden headboard
  ];
  for (let facing = 0; facing < 4; facing++) {
    shapes.set(126+facing, bedFeetParts.map(p=>rotateShapeBox(p,facing)));
    shapes.set(130+facing, bedHeadParts.map(p=>rotateShapeBox(p,facing)));
  }
  // Upholstered sofa: timber feet, two cushions, padded back and armrests.
  shapes.set(87, [
    box(.05,.13,.09,.90,.36,.82,87),
    box(.08,.46,.13,.40,.12,.61,88),box(.52,.46,.13,.40,.12,.61,88),
    box(.05,.45,.76,.90,.43,.18,87),
    box(.05,.38,.08,.17,.32,.78,87),box(.78,.38,.08,.17,.32,.78,87),
    box(.11,.00,.15,.14,.14,.16,68),box(.75,.00,.15,.14,.14,.16,68),
    box(.11,.00,.72,.14,.14,.16,68),box(.75,.00,.72,.14,.14,.16,68),
  ]);
  shapes.set(88, [box(.02, 0, .02, .96, .045, .96)]);
  // Framed window: actual transparent panes, timber surround and a sill.
  // The glass is solid for collision; daylight and visibility remain available.
  shapes.set(92,[
    box(.02,0,.37,.96,.11,.26,68),box(.04,.89,.43,.92,.11,.14,68),
    box(.04,.11,.43,.10,.78,.14,68),box(.86,.11,.43,.10,.78,.14,68),
    box(.47,.11,.445,.06,.78,.11,8),
    box(.14,.47,.445,.33,.06,.11,8),box(.53,.47,.445,.33,.06,.11,8),
    box(.14,.11,.479,.33,.36,.042,56),box(.53,.11,.479,.33,.36,.042,56),
    box(.14,.53,.479,.33,.36,.042,56),box(.53,.53,.479,.33,.36,.042,56),
  ]);
  const shapeParts = (id) => shapes.get(id) || null;
  const specialShape = (id) => shapes.has(id);
  const doorLower = (id) => id >= 57 && id <= 64;
  const doorUpper = (id) => id >= 97 && id <= 104;
  const torchWall = (id) => id >= 93 && id <= 96;
  const bedFoot = (id) => id >= 126 && id <= 129;
  const bedHead = (id) => id >= 130 && id <= 133;
  const bedOffset = (id) => [[0,0,-1],[1,0,0],[0,0,1],[-1,0,0]][(id-126)%4];
  const torchIdForNormal = (normal) => normal[0] === 1 ? 93 : normal[0] === -1 ? 94 : normal[2] === 1 ? 95 : normal[2] === -1 ? 96 : 25;
  const torchSupport = (id) => id === 93 ? [-1,0,0] : id === 94 ? [1,0,0] : id === 95 ? [0,0,-1] : id === 96 ? [0,0,1] : id === 25 ? [0,-1,0] : null;
  const itemId = (id) => id === 136 ? 14 : bedFoot(id) || bedHead(id) ? 46 : id >= 49 && id <= 52 ? 49 : id >= 57 && id <= 64 || doorUpper(id) ? 57 : id >= 69 && id <= 72 ? 69 : torchWall(id) ? 25 : id === 86 ? 85 : id;
  const orientBlock = (id, yaw) => {
    const dir = ((Math.round(yaw / (Math.PI / 2)) % 4) + 4) % 4;
    return id === 46 ? 126 + dir : id === 49 || id === 57 || id === 69 ? id + dir : id;
  };
  const buildCategories = [
    ['Madeira', [8, 68, 49, 53, 55, 57, 77, 78, 79, 83, 84, 85, 87, 91, 134, 135]],
    ['Pedra', [3, 20, 48, 54, 69, 74]],
    ['Telhados e paredes', [65, 66, 75, 16, 56, 92]],
    ['Detalhes', [67, 73, 76, 13, 25, 88]],
    ['Ferramentas', [22, 42, 43, 44, 45, 47, 89, 90]],
  ];
  function intersects(id, bx, by, bz, x0, y0, z0, x1, y1, z1) {
    if (!blocks[id]?.solid) return false;
    if (x1 <= bx || x0 >= bx + 1 || y1 <= by || y0 >= by + 1 || z1 <= bz || z0 >= bz + 1) return false;
    const parts = doorCollisions.get(id) || shapeParts(id);
    return !parts || parts.some(([x,y,z,w,h,d]) => x0 < bx+x+w && x1 > bx+x && y0 < by+y+h && y1 > by+y && z0 < bz+z+d && z1 > bz+z);
  }
  const recipes = [
    [8, 4, [[5, 1]], 0],
    [8, 4, [[27, 1]], 0],
    [21, 4, [[8, 2]], 0],
    [12, 1, [[8, 4]], 0],
    [
      22,
      1,
      [
        [8, 3],
        [21, 2],
      ],
      12,
    ],
    [
      25,
      4,
      [
        [9, 1],
        [21, 1],
      ],
      0,
    ],
    [14, 1, [[3, 8]], 12],
    [15, 1, [[8, 8]], 12],
    [
      16,
      2,
      [
        [4, 2],
        [9, 1],
      ],
      14,
    ],
    [
      24,
      1,
      [
        [10, 1],
        [9, 1],
      ],
      14,
    ],
    [
      13,
      1,
      [
        [11, 1],
        [24, 1],
      ],
      12,
    ],
    [20, 4, [[3, 4]], 12],
    [
      26,
      4,
      [
        [11, 1],
        [3, 3],
      ],
      12,
    ],
    [9, 2, [[5, 1]], 14],
  ];
  recipes.push(
    [
      31,
      6,
      [
        [3, 4],
        [11, 1],
      ],
      12,
      1,
    ],
    [
      30,
      1,
      [
        [11, 1],
        [24, 1],
        [16, 2],
      ],
      12,
      3,
    ],
  );
  const durability = { 22: 48, 42: 80, 43: 120, 44: 180, 45: 260, 47: 100, 89: 160, 90: 80 };
  recipes.push(
    [
      38,
      2,
      [
        [2, 2],
        [21, 1],
      ],
      0,
    ],
    [
      35,
      1,
      [
        [34, 1],
        [9, 1],
      ],
      14,
    ],
    [
      41,
      2,
      [
        [40, 1],
        [9, 1],
      ],
      14,
    ],
    [
      42,
      1,
      [
        [3, 3],
        [21, 2],
      ],
      12,
    ],
    [
      43,
      1,
      [
        [24, 3],
        [21, 2],
      ],
      12,
    ],
    [
      44,
      1,
      [
        [35, 3],
        [21, 2],
      ],
      12,
    ],
    [
      45,
      1,
      [
        [11, 3],
        [35, 1],
        [21, 2],
      ],
      12,
      1,
    ],
    [
      46,
      1,
      [
        [8, 4],
        [6, 3],
      ],
      12,
    ],
    [
      47,
      1,
      [
        [35, 2],
        [21, 1],
      ],
      12,
    ],
  );
  recipes.push(
    [48, 4, [[3, 4]], 12],
    [49, 4, [[8, 6]], 12],
    [53, 6, [[8, 3]], 0],
    [54, 6, [[48, 3]], 12],
    [55, 3, [[8, 4], [21, 2]], 12],
    [56, 6, [[16, 3]], 12],
    [57, 3, [[8, 6]], 12],
    [65, 6, [[4, 3], [3, 2], [9, 1]], 14],
    [66, 4, [[4, 4], [9, 1]], 14],
    [67, 2, [[25, 2], [24, 1]], 12],
    [68, 4, [[27, 1]], 0],
    [69, 4, [[48, 6]], 12],
    [73, 4, [[24, 3]], 12],
    [74, 4, [[48, 4]], 12],
    [75, 4, [[4, 3], [2, 1]], 0],
    [76, 8, [[35, 2]], 12],
    [77, 1, [[8, 6], [5, 1]], 12],
    [78, 1, [[8, 4], [21, 2]], 12],
    [79, 2, [[8, 4], [21, 2]], 12],
    [83, 1, [[8, 6], [21, 2]], 12],
    [84, 1, [[8, 5], [21, 1]], 12],
    [85, 2, [[8, 4], [21, 1]], 12],
    [87, 1, [[8, 5], [6, 2]], 12],
    [88, 3, [[6, 3], [23, 1]], 12],
    [89, 1, [[35, 3], [21, 2]], 12],
    [90, 1, [[3, 2], [21, 2]], 12],
    [91, 4, [[5, 2]], 0],
    [92, 4, [[16, 2], [8, 2]], 12],
  );
  // The original bed recipe remains compatible with older worlds.
  recipes.push([46, 1, [[123, 3], [8, 3]], 12]);
  // A recipe belongs to exactly one station: 0 (backpack), 12 (workbench),
  // or 14 (furnace). Keep recipe indexes stable for saves and UI events.
  const recipeStation = (recipe) => recipe?.[3] || 0;
  const recipesAtStation = (station = 0) => recipes
    .map((recipe, index) => ({ recipe, index }))
    .filter(({ recipe }) => recipeStation(recipe) === station);
  const farmAnimals = Object.freeze(['Ovelha', 'Porco', 'Vaca']);
  const farmFood = Object.freeze({ Ovelha: 40, Porco: 23, Vaca: 40 });
  const farmHealth = Object.freeze({ Ovelha: 5, Porco: 6, Vaca: 9 });
  const ruins = [
    { name: 'Pórtico da Alvorada', seal: 'Aurora' },
    { name: 'Jardim das Brumas', seal: 'Bruma' },
    { name: 'Observatório do Céu', seal: 'Zênite' },
  ];
  function planRuins(seed, edits = {}, player = null, generator = 1) {
    // On the first visit, reserve untouched chunks so a returning player's build
    // or position can never intersect a newly introduced monument.
    return ruins.map((_, id) => {
      for (let n = 0; ; n++) {
        const arc = id * 2.09 - 0.5 + (hash(id, n, seed ^ 923) - 0.5) * 1.15;
        const radius = 37 + id * 27 + Math.floor(n / 20) * 15 + hash(id, n, seed ^ 724) * 13;
        const x = Math.round(Math.sin(arc) * radius),
          z = -Math.round(Math.cos(arc) * radius),
          h = land(x, z, seed, generator).h;
        if (h < SEA + 2 || (player && Math.hypot(player.x - x, player.z - z) < 12)) continue;
        let free = true;
        for (let dz = -4; dz <= 4 && free; dz++)
          for (let dx = -4; dx <= 4 && free; dx++) {
            if (
              edits[key((x + dx) >> 4, (z + dz) >> 4)] ||
              Math.abs(land(x + dx, z + dz, seed, generator).h - h) > 3
            )
              free = false;
          }
        if (free) return { id, x, z, y: h + 1 };
      }
    });
  }
  function buildRuin({ x, y, z, id }, set) {
    for (let dz = -4; dz <= 4; dz++)
      for (let dx = -4; dx <= 4; dx++) {
        if (Math.abs(dx) + Math.abs(dz) > 6) continue;
        for (let j = -4; j < 0; j++)
          set(x + dx, y + j, z + dz, j === -1 && (dx + dz) % 3 === 0 ? 19 : 20);
        for (let j = 0; j <= 10; j++) set(x + dx, y + j, z + dz, 0);
      }
    function pillar(dx, dz, h) {
      for (let j = 0; j < h; j++) set(x + dx, y + j, z + dz, j === 1 || j === h - 1 ? 31 : 20);
    }
    if (id === 0) {
      pillar(-2, -1, 5);
      pillar(2, -1, 5);
      for (let dx = -2; dx <= 2; dx++) set(x + dx, y + 5, z - 1, 31);
      for (let dx = -1; dx <= 1; dx++) set(x + dx, y + 6, z - 1, 20);
      pillar(-3, 2, 2);
      pillar(3, 2, 2);
    } else if (id === 1) {
      for (let [dx, dz, h] of [
        [-3, -2, 4],
        [3, -2, 3],
        [-2, 2, 2],
        [2, 2, 4],
      ]) {
        pillar(dx, dz, h);
        set(x + dx, y + h, z + dz, 18);
      }
      for (let dx = -2; dx <= 2; dx++) set(x + dx, y, z - 2, 19);
    } else {
      for (let [dx, dz] of [
        [-3, 0],
        [3, 0],
        [0, -3],
      ]) {
        pillar(dx, dz, 5);
        set(x + dx, y + 5, z + dz, 11);
      }
      for (let [dx, dz] of [
        [-2, -1],
        [-1, -2],
        [1, -2],
        [2, -1],
      ])
        set(x + dx, y + 5, z + dz, 31);
    }
    set(x, y, z, 31);
    set(x, y + 1, z, 28);
  }
  function seedHash(str) {
    let h = 2166136261;
    for (const c of String(str)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return h >>> 0;
  }
  function hash(x, z, s) {
    let a = Math.imul(x, 0x1f123bb5) ^ Math.imul(z, 0x5f356495) ^ s;
    a = Math.imul(a ^ (a >>> 16), 0x45d9f3b);
    a = Math.imul(a ^ (a >>> 16), 0x45d9f3b);
    return ((a ^ (a >>> 16)) >>> 0) / 4294967296;
  }
  const mix = (a, b, k) => a + (b - a) * k,
    smooth = (t) => t * t * (3 - 2 * t),
    clip = (n, a, b) => Math.max(a, Math.min(b, n));
  function noise(x, z, s) {
    let a = Math.floor(x),
      b = Math.floor(z),
      u = smooth(x - a),
      v = smooth(z - b);
    return mix(
      mix(hash(a, b, s), hash(a + 1, b, s), u),
      mix(hash(a, b + 1, s), hash(a + 1, b + 1, s), u),
      v,
    );
  }
  function land(x, z, s, generator = 1) {
    const zone =
      Math.sin(x * 0.035 + z * 0.011 + (s % 27) * 0.018) +
      0.67 * (noise(x * 0.027, z * 0.027, s ^ 357) - 0.5);
    const mist = zone < -0.23;
    const r = 16 + 10 * Math.sin(z * 0.032 + (s % 20) * 0.023) + 4 * Math.sin(z * 0.087);
    const shore = Math.abs(x - r);
    const flat = smooth(clip(Math.hypot(x, z) / 23, 0, 1));
    const hills =
      3 +
      12 * noise(x * 0.029, z * 0.029, s) +
      10 * noise(x * 0.011, z * 0.011, s ^ 473) +
      4 * noise(x * 0.078, z * 0.078, s ^ 733);
    const h = Math.floor(
      SEA -
        3.5 +
        Math.min(7, shore * 0.65) +
        flat * hills * smooth(clip((shore - 4) / 22, 0, 1)) +
        (1 - flat) * 1.4,
    );
    const dunes = !mist && Math.hypot(x, z) > 48 && noise(x * 0.014, z * 0.014, s ^ 231) > 0.53;
    if (generator >= 3) {
      const distance = Math.hypot(x, z),
        band = noise(x * 0.009, z * 0.009, s ^ 1384);
      const blend = smooth(clip((distance - 92) / 36, 0, 1));
      if (blend && band > 0.62)
        return { h: h + Math.round(blend * (band - 0.62) * 125), region: 'Montanhas Azuis' };
      if (blend && band < 0.36)
        return {
          h: Math.round(h + (SEA - 1 + 2 * Math.sin(x * 0.17) * Math.cos(z * 0.13) - h) * blend),
          region: 'Pântano Luminescente',
        };
      if (blend && noise(x * 0.012, z * 0.012, s ^ 632) > 0.64)
        return { h, region: 'Planícies de Cinza' };
    }
    return { h, mist, dunes };
  }
  const idx = (x, y, z) => (y * 16 + z) * 16 + x;
  const key = (x, z) => x + ',' + z;
  function generate(cx, cz, s, sites = [], generator = 1) {
    const a = new Uint8Array(16 * 16 * H),
      ox = cx * 16,
      oz = cz * 16;
    let top = SEA;
    function set(x, y, z, b) {
      if (x >= ox && z >= oz && x < ox + 16 && z < oz + 16 && y >= 0 && y < H) {
        a[idx(x - ox, y, z - oz)] = b;
        top = Math.max(y, top);
      }
    }
    for (let z = 0; z < 16; z++)
      for (let x = 0; x < 16; x++) {
        const wx = ox + x,
          wz = oz + z,
          { h, mist, dunes, region } = land(wx, wz, s, generator);
        top = Math.max(top, h);
        const cv = noise(wx * 0.081, wz * 0.081, s ^ 871),
          path = SEA - 8 + 5 * Math.sin(wx * 0.079) + 3 * Math.cos(wz * 0.095);
        for (let y = 0; y <= Math.max(SEA, h); y++) {
          let b = 3;
          if (y > h) b = 7;
          else if (y === h && region)
            b =
              region === 'Montanhas Azuis'
                ? h > 87
                  ? 32
                  : 3
                : region === 'Planícies de Cinza'
                  ? 33
                  : 19;
          else if (y === h) b = h <= SEA + 1 || (generator >= 2 && dunes) ? 4 : mist ? 17 : 1;
          else if (y >= h - 3) b = h < SEA + 1 || (generator >= 2 && dunes) ? 4 : 2;
          else if (y > 8 && cv > 0.54 && Math.abs(y - path) < (cv - 0.51) * 11) b = 0;
          else if (y > 0) {
            const ore = hash(wx + y * 3, wz - y * 2, s ^ 717);
            if (generator >= 3 && y < h - 10 && ore < 0.033) b = 34;
            else if (ore > 0.958) b = y < h - 12 && ore > 0.988 ? 11 : y < h - 6 && ore > 0.978 ? 10 : 9;
          }
          a[idx(x, y, z)] = b;
        }
      }
    function tree(tx, tz, starter = false) {
      const { h, mist } = land(tx, tz, s, generator);
      if (h <= SEA + 1) return;
      const n = hash(tx, tz, s ^ 139);
      const trunk = mist ? 27 : 5,
        leaf = mist ? 18 : 6,
        ht = starter ? 6 : mist ? 6 + Math.floor(n * 3) : 4 + Math.floor(n * 2);
      for (let y = 1; y <= ht; y++) set(tx, h + y, tz, trunk);
      for (let j = -2; j <= (mist ? 3 : 1); j++) {
        const r = mist ? Math.max(0, Math.ceil((3 - j) / 2)) : j === 1 ? 1 : 2;
        for (let dz = -r; dz <= r; dz++)
          for (let dx = -r; dx <= r; dx++) {
            if (!dx && !dz && j <= 0) continue;
            if (
              Math.abs(dx) + Math.abs(dz) > r + 1 ||
              (Math.abs(dx) === r && Math.abs(dz) === r && hash(tx + dx + j, tz + dz, s) < 0.52)
            )
              continue;
            set(tx + dx, h + ht + j, tz + dz, leaf);
          }
      }
    }
    for (let gz = Math.floor((oz - 4) / 7); gz <= Math.floor((oz + 19) / 7); gz++)
      for (let gx = Math.floor((ox - 4) / 7); gx <= Math.floor((ox + 19) / 7); gx++) {
        const tx = gx * 7 + Math.floor(hash(gx, gz, s ^ 51) * 5) + 1,
          tz = gz * 7 + Math.floor(hash(gx, gz, s ^ 52) * 5) + 1;
        if (Math.hypot(tx, tz - 3) < 8) continue;
        const terrain = land(tx, tz, s, generator);
        const { mist, dunes, h } = terrain;
        if (terrain.region) {
          if (terrain.region === 'Pântano Luminescente' && h >= SEA && hash(gx, gz, s) > 0.35)
            set(tx, h + 1, tz, 36);
          continue;
        }
        if (generator >= 2 && dunes) {
          if (h > SEA + 1 && hash(gx, gz, s ^ 197) > 0.88) {
            for (let dy = 1; dy <= 5; dy++) set(tx, h + dy, tz, dy === 5 ? 11 : dy === 2 ? 31 : 20);
          }
          continue;
        }
        if (hash(gx, gz, s ^ 53) < (mist ? 0.63 : 0.31)) tree(tx, tz);
      }
    tree(2, 0, true);
    for (const site of sites)
      if (site.x + 4 >= ox && site.z + 4 >= oz && site.x - 4 < ox + 16 && site.z - 4 < oz + 16)
        buildRuin(site, set);
    return { a, top };
  }
  const directions = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  const transparent = (id) => id === 7 || id === 16 || id === 56 || id === 92;
  function makeJob(job, cache) {
    const { cx, cz, seed, edits } = job;
    const neighborhood = new Map();
    let highest = SEA;
    for (const [dx, dz] of [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [-1, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
    ]) {
      const k = key(cx + dx, cz + dz);
      let raw = cache.get(k);
      if (!raw) {
        raw = generate(cx + dx, cz + dz, seed, job.sites, job.generator);
        cache.set(k, raw);
        if (cache.size > 175) cache.delete(cache.keys().next().value);
      }
      let a = raw.a,
        top = raw.top;
      const changes = edits[k];
      if (changes) {
        a = a.slice();
        for (const i in changes) {
          a[i] = changes[i];
          top = Math.max(top, Number(i) >> 8);
        }
      }
      const ht = new Int16Array(256), roof = new Int16Array(256);
      for (let z = 0; z < 16; z++)
        for (let x = 0; x < 16; x++) {
          const column = z * 16 + x;
          for (let y = top; y > 0; y--) {
            const b = a[idx(x, y, z)];
            if (!b || !blocks[b]?.solid || transparent(b)) continue;
            if (!ht[column]) ht[column] = y;
            // Furniture and door panels must not turn a whole column into a roof.
            // Full blocks and full-width slabs provide approximate skylight cover.
            if (!specialShape(b) || b === 53 || b === 54) {
              roof[column] = y;
              break;
            }
          }
        }
      neighborhood.set(dx + ',' + dz, { a, ht, roof });
      if (!dx && !dz) highest = top;
    }
    const center = neighborhood.get('0,0').a,
      ox = cx * 16,
      oz = cz * 16,
      solid = [],
      alpha = [];
    function at(x, y, z) {
      if (y < 0) return 3;
      if (y >= H) return 0;
      if (x >= 0 && x < 16 && z >= 0 && z < 16) return center[idx(x, y, z)];
      const n = neighborhood.get((x >> 4) + ',' + (z >> 4));
      return n ? n.a[idx(x & 15, y, z & 15)] : 0;
    }
    function height(x, z) {
      let n = neighborhood.get((x >> 4) + ',' + (z >> 4));
      return n ? n.ht[(z & 15) * 16 + (x & 15)] : 0;
    }
    function roofHeight(x,z) {
      const n=neighborhood.get((x >> 4)+','+(z >> 4));
      return n ? n.roof[(z & 15)*16+(x & 15)] : 0;
    }
    // Three stable light levels encoded in the existing AO attribute.
    // Sample the air side of each face so exterior walls stay bright.
    function shadeLevel(x,y,z,f) {
      const [dx,dy,dz]=directions[f];
      if (roofHeight(x+dx,z+dz) > y+dy ||
          (f===2 && roofHeight(x,z)>y)) return 2;
      return height(x+1,z-1)>y+1 || height(x+2,z-2)>y+3 ? 1 : 0;
    }
    const ambient = level => level===2 ? .46 : level===1 ? .74 : 1;
    for (let f = 0; f < 6; f++) {
      const dir = directions[f],
        axis = f >> 1,
        u = axis === 0 ? 2 : 0,
        v = axis === 1 ? 2 : 1;
      let sizes = [16, highest + 1, 16],
        W = sizes[u],
        V = sizes[v],
        L = sizes[axis];
      const mask = new Uint16Array(W * V);
      for (let l = 0; l < L; l++) {
        mask.fill(0);
        const p = [0, 0, 0];
        p[axis] = l;
        for (let j = 0; j < V; j++) {
          p[v] = j;
          for (let i = 0; i < W; i++) {
            p[u] = i;
            const [x, y, z] = p,
              b = center[idx(x, y, z)];
            if (!b || specialShape(b)) continue;
            let other = at(x + dir[0], y + dir[1], z + dir[2]);
            if (other && other !== 25 && !specialShape(other) && (!transparent(other) || other === b)) continue;
            const shade = shadeLevel(x,y,z,f);
            // Shade must not overlap material ID. The old 32-stride corrupted block IDs >= 32.
            mask[j * W + i] = b | (shade << 8);
          }
        }
        for (let j = 0; j < V; j++)
          for (let i = 0; i < W; i++) {
            const n = mask[j * W + i];
            if (!n) continue;
            let w = 1,
              h = 1,
              b = n & 255;
            if (b !== 25) {
              while (i + w < W && mask[j * W + i + w] === n) w++;
              outer: while (j + h < V) {
                for (let k = 0; k < w; k++) if (mask[(j + h) * W + i + k] !== n) break outer;
                h++;
              }
            }
            for (let jj = 0; jj < h; jj++) mask.fill(0, (j + jj) * W + i, (j + jj) * W + i + w);
            const buf = transparent(b) ? alpha : solid;
            const origin = [0, 0, 0];
            origin[axis] = l + (f % 2 === 0 ? 1 : 0);
            origin[u] = i;
            origin[v] = j;
            for (const [du, dv] of [
              [0, 0],
              [w, 0],
              [w, h],
              [0, 0],
              [w, h],
              [0, h],
            ]) {
              let t = origin.slice();
              t[u] += du;
              t[v] += dv;
              buf.push(
                t[0] + ox,
                t[1] - (b === 7 && f === 2 ? 0.1 : 0),
                t[2] + oz,
                b,
                f,
                ambient(n >> 8),
              );
            }
          }
      }
    }
    // Detailed construction pieces are batched into the same two chunk buffers.
    // A few boxes per *placed* piece; no extra draw call, model import, or texture.
    function emitSmallBox(x, y, z, shape, id) {
      const dims = shape.slice(3);
      for (let f = 0; f < 6; f++) {
        const axis = f >> 1, u = axis === 0 ? 2 : 0, v = axis === 1 ? 2 : 1;
        const boundary = f % 2 === 0 ? shape[axis] + dims[axis] : shape[axis];
        if ((f % 2 ? boundary === 0 : boundary === 1)) {
          const n = directions[f], other = at(x + n[0], y + n[1], z + n[2]);
          if (other && !specialShape(other) && !transparent(other)) continue;
        }
        const material = shape[6] ?? id;
        const out = transparent(material) ? alpha : solid;
        const shade=roofHeight(x,z)>y ? 2 : shadeLevel(x,y,z,f);
        for (const [a,b] of [[0,0],[1,0],[1,1],[0,0],[1,1],[0,1]]) {
          const q = [shape[0], shape[1], shape[2]];
          q[axis] = boundary;
          q[u] += a * dims[u];
          q[v] += b * dims[v];
          out.push(x + q[0] + ox, y + q[1], z + q[2] + oz, material, f, ambient(shade));
        }
      }
    }
    for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++)
      for (let y = 1; y <= highest && y < H; y++) {
        const id = center[idx(x, y, z)];
        if (!specialShape(id)) continue;
        // Legacy torches placed beside a wall before v0.9.3 are reattached visually
        // when they lack floor support, preserving their saved block ID.
        let shapeId = id;
        if (id === 25 && !blocks[at(x,y-1,z)]?.solid) {
          for (const [dx,dz,variant] of [[-1,0,93],[1,0,94],[0,-1,95],[0,1,96]]) {
            const support = at(x+dx,y,z+dz);
            if (blocks[support]?.solid && !specialShape(support)) { shapeId = variant; break; }
          }
        }
        for (const shape of shapeParts(shapeId)) emitSmallBox(x, y, z, shape, id);
      }
    // Small crossed quads follow the edited surface without adding collision objects.
    function blade(x, y, z, angle, width, h, id, shade) {
      const dx = Math.cos(angle) * width,
        dz = Math.sin(angle) * width;
      for (const [u, v] of [
        [-1, 0],
        [1, 0],
        [1, 1],
        [-1, 0],
        [1, 1],
        [-1, 1],
      ])
        solid.push(
          x + u * dx * (1 - 0.65 * v) + v * 0.06,
          y + h * v,
          z + u * dz * (1 - 0.65 * v),
          id,
          2,
          shade,
        );
    }
    for (let z = 0; z < 16; z++)
      for (let x = 0; x < 16; x++) {
        const y = height(x, z),
          b = center[idx(x, y, z)],
          roll = hash(ox + x, oz + z, seed ^ 291);
        if ((b !== 1 && b !== 17) || at(x, y + 1, z) || roll > 0.27) continue;
        const gx = ox + x + 0.22 + hash(ox + x, oz + z, seed ^ 119) * 0.56,
          gz = oz + z + 0.22 + hash(ox + x, oz + z, seed ^ 122) * 0.56;
        const h = 0.23 + hash(ox + x, oz + z, seed ^ 127) * 0.36,
          a = roll * 31,
          shade = height(x + 1, z - 1) > y + 1 ? 0.78 : 1;
        blade(gx, y + 1, gz, a, 0.13, h, 80, shade);
        blade(gx, y + 1, gz, a + 1.57, 0.115, h * 0.85, 80, shade);
        if (roll < 0.065) {
          const id = b === 17 ? 82 : 81;
          blade(gx + 0.03, y + 1 + h * 0.73, gz, a, 0.14, 0.16, id, shade);
          blade(gx + 0.03, y + 1 + h * 0.73, gz, a + 1.57, 0.14, 0.16, id, shade);
        }
      }
    return {
      cx,
      cz,
      rev: job.rev,
      a: center.slice(),
      solid: new Float32Array(solid),
      alpha: new Float32Array(alpha),
    };
  }
  function ray(get, o, d, max = 5, solidOnly = false) {
    let p = o.map(Math.floor),
      step = d.map((n) => (n < 0 ? -1 : 1)),
      delta = d.map((n) => (n ? Math.abs(1 / n) : Infinity)),
      t = d.map((n, i) => (n === 0 ? Infinity : ((n < 0 ? p[i] : p[i] + 1) - o[i]) / n));
    let normal = [0, 0, 0],
      dist = 0;
    while (dist <= max) {
      const b = get(...p);
      if (b && b !== 7 && (!solidOnly || blocks[b]?.solid)) return { p: p.slice(), normal, b, dist };
      let k = t[0] < t[1] ? (t[0] < t[2] ? 0 : 2) : t[1] < t[2] ? 1 : 2;
      dist = t[k];
      t[k] += delta[k];
      p[k] += step[k];
      normal = [0, 0, 0];
      normal[k] = -step[k];
    }
    return null;
  }
  return {
    S,
    H,
    SEA,
    version,
    blocks,
    recipes,
    recipeStation,
    recipesAtStation,
    durability,
    farmAnimals,
    farmFood,
    farmHealth,
    shapeParts,
    specialShape,
    itemId,
    doorLower,
    doorUpper,
    torchWall,
    bedFoot,
    bedHead,
    bedOffset,
    torchIdForNormal,
    torchSupport,
    orientBlock,
    buildCategories,
    intersects,
    seedHash,
    ruins,
    planRuins,
    hash,
    land,
    generate,
    idx,
    key,
    clip,
    makeJob,
    ray,
    directions,
  };
})();
if (typeof module !== 'undefined') module.exports = Voxel;
