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
  ];
  const blocks = data.map(([name, hex, hard], id) => ({
    id,
    name,
    hex,
    hard,
    solid: !!id && ![7, 21, 22, 23, 24, 25, 35, 36, 37, 41, 42, 43, 44, 45, 47].includes(id),
    placeable:
      id > 0 && ![7, 21, 22, 23, 24, 28, 29, 35, 37, 39, 40, 41, 42, 43, 44, 45, 47].includes(id),
  }));
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
  const durability = { 22: 48, 42: 80, 43: 120, 44: 180, 45: 260, 47: 100 };
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
  const transparent = (id) => id === 7 || id === 16;
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
      const ht = new Int16Array(256);
      for (let z = 0; z < 16; z++)
        for (let x = 0; x < 16; x++) {
          for (let y = top; y > 0; y--) {
            let b = a[idx(x, y, z)];
            if (b && !transparent(b) && b !== 25) {
              ht[z * 16 + x] = y;
              break;
            }
          }
        }
      neighborhood.set(dx + ',' + dz, { a, ht });
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
            if (!b) continue;
            let other = at(x + dir[0], y + dir[1], z + dir[2]);
            if (other && other !== 25 && (!transparent(other) || other === b)) continue;
            const shade = height(x + 1, z - 1) > y + 1 || height(x + 2, z - 2) > y + 3 ? 1 : 0;
            mask[j * W + i] = b + shade * 32;
          }
        }
        for (let j = 0; j < V; j++)
          for (let i = 0; i < W; i++) {
            const n = mask[j * W + i];
            if (!n) continue;
            let w = 1,
              h = 1,
              b = n % 32;
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
              if (b === 25) {
                t[0] = pTorch(t[0], axis === 0 ? l : i);
                const bz = axis === 2 ? l : axis === 1 ? j : i;
                t[2] = pTorch(t[2], bz);
                const by = axis === 1 ? l : j;
                t[1] = by + (t[1] - by) * 0.74;
              }
              buf.push(
                t[0] + ox,
                t[1] - (b === 7 && f === 2 ? 0.1 : 0),
                t[2] + oz,
                b,
                f,
                n >= 32 ? 0.74 : 1,
              );
            }
          }
      }
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
  function pTorch(value, base) {
    return base + 0.39 + (value - base) * 0.22;
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
    durability,
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
