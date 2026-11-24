'use strict';
const Game = (() => {
  const { idx, key, land, blocks, clip } = Voxel,
    BAG = 36,
    farmAnimals = Voxel.farmAnimals;
  const isFarm = (kind) => farmAnimals.includes(kind);
  const slot = (b, n = 1) => ({ b, n, ...(Voxel.durability[b] ? { dur: Voxel.durability[b] } : {}) }),
    empty = () => Array(BAG).fill(null);
  const solid = (id) => id < 0 || !!blocks[id]?.solid;
  function fill(bag, b, n, dur) {
    if (!Voxel.durability[b])
      for (let t of bag)
        if (t && t.b === b && t.n < 64) {
          let a = Math.min(n, 64 - t.n);
          t.n += a;
          n -= a;
          if (!n) return 0;
        }
    for (let j = 0; j < bag.length && n; j++)
      if (!bag[j]) {
        let a = Math.min(n, Voxel.durability[b] ? 1 : 64);
        bag[j] = slot(b, a);
        if (Voxel.durability[b] && dur != null) bag[j].dur = dur;
        n -= a;
      }
    return n;
  }
  function cost(bag, b, n) {
    for (let i = 0; i < bag.length && n; i++)
      if (bag[i]?.b === b) {
        let a = Math.min(n, bag[i].n);
        n -= a;
        bag[i].n -= a;
        if (!bag[i].n) bag[i] = null;
      }
  }
  function count(bag, b) {
    return bag.reduce((a, t) => a + (t?.b === b ? t.n : 0), 0);
  }
  function fresh(name, seed, mode, difficulty, generator = 3) {
    generator = [4,5].includes(generator) ? generator : 3;
    let h = land(0, 3, Voxel.seedHash(seed), generator).h;
    let inv = empty();
    if (mode === 'creative') [8, 49, 53, 57, 55, 16, 83, 85, 87].forEach((v, i) => (inv[i] = slot(v, 64)));
    else {
      inv[0] = slot(23, 3);
    }
    const sites = generator===5 ? Voxel.planRuins(Voxel.seedHash(seed),{}, {x:.5,z:3.5},5) : null;
    return {
      schema: 1,
      generator,
      ...(sites ? {sites} : {}),
      id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2),
      name,
      seed,
      mode,
      difficulty,
      saved: Date.now(),
      p: { x: 0.5, y: h + 1.02, z: 3.5, yaw: 0.59, pitch: -0.025, life: 100, food: 100, air: 100 },
      inv,
      selected: 0,
      time: 0.36,
      day: 1,
      elapsed: 0,
      edits: {},
      chests: sites ? Voxel.expeditionChests(sites) : {},
      drops: [],
      mobs: [],
      bag: null,
      goals: {},
    };
  }
  class Session {
    constructor(rec, renderer, settings, notify, signal) {
      this.meta = {
        id: rec.id,
        name: rec.name,
        seed: rec.seed,
        mode: rec.mode,
        difficulty: rec.difficulty,
      };
      if (![1, 2, 3, 4, 5].includes(rec.generator) || rec.schema !== 1)
        throw Error('Versão de mundo incompatível');
      this.generator = rec.generator;
      this.fragments = [];
      this.plots = rec.plots || {};
      this.bed = rec.bed || null;
      this.house = rec.house && Number.isFinite(rec.house.x) && Number.isFinite(rec.house.z) ? rec.house : null;
      this.trackHouse = rec.trackHouse !== false; // legacy preference
      // Navigation is saved in each world; older worlds default to their house.
      this.navMode = Navigation.normalize(rec.navMode || (this.house && this.trackHouse ? 'home' : 'objective'));
      this.navPin = rec.navPin && ['x','y','z'].every(k=>Number.isFinite(rec.navPin[k])) ? rec.navPin : null;
      this.seed = Voxel.seedHash(rec.seed);
      this.p = { ...rec.p };
      this.inv = rec.inv;
      this.selected = rec.selected || 0;
      this.time = rec.time;
      this.day = rec.day || 1;
      this.elapsed = rec.elapsed;
      this.edits = rec.edits || {};
      this.sites = rec.sites || Voxel.planRuins(this.seed, this.edits, this.p, this.generator);
      this.seals = rec.seals || [false, false, false];
      this.eyeHeight = 1.62;
      this.previousEye = null;
      this.chests = rec.chests || {};
      this.saplings = rec.saplings || {};
      this.chestRevisions = rec.chestRevisions || Object.create(null);
      this.guestProfiles = rec.guestProfiles || Object.create(null);
      this.mobs = rec.mobs || [];
      // IDs survive saves and let the host address creatures without ambiguity.
      this.nextMobId = Math.max(1, ...this.mobs.map(m => Number.isSafeInteger(m.id) ? m.id + 1 : 1));
      this.mobs.forEach(m => { if (!Number.isSafeInteger(m.id) || m.id <= 0) m.id = this.nextMobId++; });
      this.drops = rec.drops || [];
      this.nextDropId = Math.max(1, ...this.drops.map(d => Number.isSafeInteger(d.id) ? d.id + 1 : 1));
      this.drops.forEach(d => { if (!Number.isSafeInteger(d.id) || d.id <= 0) d.id = this.nextDropId++; });
      this.networkGuest = false;
      this.networkHost = false;
      this.lastNetworkMobSeq = -1;
      this.guestPickupPending = new Map();
      this.bag = rec.bag;
      this.goals = rec.goals || {};
      this.renderer = renderer;
      this.settings = settings;
      this.notify = notify;
      this.signal = signal;
      this.chunks = new Map();
      this.revs = new Map();
      this.lit = new Map();
      this.keys = new Set();
      this.touchMove = { forward: 0, side: 0 };
      this.moveSpeed = 0;
      this.walkCycle = 0;
      this.touchSprint = false;
      this.touchCrouch = false;
      this.touchAutoJump = false;
      this.autoJumpCool = 0;
      this.cache = new Map();
      this.saveState = 'Em dia';
      this.spawnTick = 3;
      this.animalSeed = 0;
      this.hudTick = 0;
      this.vy = 0;
      this.grounded = false;
      this.stepTick = 0;
      this.damageCool = 0;
      this.paused = true;
      this.pending = new Set();
      this.busy = false;
      this.alive = true;
      this.saveChain = Promise.resolve();
      this.dirtySave = false;
      this.saveFailures = 0;
      this.saveRetry = null;
      this.changeVersion = 0;
      this.creative = this.meta.mode === 'creative';
      this.resetMining();
      this.lastBlueprint = null;
      // Free building is independent of optional 5x5 blueprints.
      this.buildRotation = 0;
      this.lastFreeBlock = null;
      this.startWorker();
      this.stream(true);
    }
    startWorker() {
      if (location.protocol === 'file:' && !globalThis.PRISMA_WORKER) return;
      try {
        this.worker = new Worker(globalThis.PRISMA_WORKER || 'js/worker.js');
        this.worker.onmessage = (e) => this.received(e.data);
        this.worker.onerror = () => {
          this.worker.terminate();
          this.worker = null;
          if (this.job) this.pending.add(key(this.job.cx, this.job.cz));
          this.busy = false;
          this.pump();
        };
      } catch {
        this.worker = null;
      }
    }
    stream(force = false) {
      const cx = Math.floor(this.p.x / 16),
        cz = Math.floor(this.p.z / 16),
        r = (typeof document !== 'undefined' && document.body?.classList.contains('touchgame') ? [2,3,4] : [3,4,5])[this.settings.quality];
      if (!force && this.cx === cx && this.cz === cz && this.radius === r) return;
      this.cx = cx;
      this.cz = cz;
      this.radius = r;
      for (let k of this.pending) {
        let [x, z] = k.split(',').map(Number);
        if (Math.abs(x - cx) > r || Math.abs(z - cz) > r) this.pending.delete(k);
      }
      for (let k of this.chunks.keys()) {
        let [x, z] = k.split(',').map(Number);
        if (Math.abs(x - cx) > r + 1 || Math.abs(z - cz) > r + 1) {
          this.chunks.delete(k);
          this.lit.delete(k);
          this.renderer.remove(k);
        }
      }
      for (let z = -r; z <= r; z++)
        for (let x = -r; x <= r; x++) {
          if (x * x + z * z > (r + 0.4) ** 2) continue;
          const k = key(cx + x, cz + z);
          if (!this.chunks.has(k)) this.pending.add(k);
        }
      this.pump();
    }
    pump() {
      if (this.busy || !this.pending.size || !this.alive) return;
      let best,
        dist = Infinity;
      for (let k of this.pending) {
        let [x, z] = k.split(',').map(Number),
          d = (x - this.cx) ** 2 + (z - this.cz) ** 2 - (this.chunks.has(k) ? 100 : 0);
        if (d < dist) {
          best = k;
          dist = d;
        }
      }
      this.pending.delete(best);
      const [cx, cz] = best.split(',').map(Number),
        edits = {};
      for (let z = cz - 1; z <= cz + 1; z++)
        for (let x = cx - 1; x <= cx + 1; x++) {
          let k = key(x, z);
          if (this.edits[k]) edits[k] = this.edits[k];
        }
      const job = {
        cx,
        cz,
        rev: this.revs.get(best) || 0,
        seed: this.seed,
        edits,
        generator: this.generator,
        sites: this.sites,
      };
      this.job = job;
      this.busy = true;
      if (this.worker) this.worker.postMessage(job);
      else
        setTimeout(() => {
          if (this.alive) this.received(Voxel.makeJob(job, this.cache));
        }, 8);
    }
    received(r) {
      if (!this.alive) return;
      this.busy = false;
      const k = key(r.cx, r.cz);
      if (Math.abs(r.cx - this.cx) <= this.radius + 1 && Math.abs(r.cz - this.cz) <= this.radius + 1) {
        if (r.rev === (this.revs.get(k) || 0)) {
          this.chunks.set(k, { a: r.a });
          this.renderer.install(k, r);
          this.relight(k);
          if (!this.ready && this.chunks.has(key(this.cx, this.cz))) {
            this.ready = true;
            this.signal('ready');
          }
        } else this.pending.add(k);
      }
      this.pump();
    }
    relight(k) {
      let [cx, cz] = k.split(',').map(Number),
        arr = [];
      for (const [i, b] of Object.entries(this.edits[k] || {}))
        if (b === 13 || b === 25 || Voxel.torchWall(b) || b === 29 || b === 30 || b === 67 || b === 136) {
          let n = Number(i);
          const position = [cx * 16 + (n & 15) + 0.5, (n >> 8) + 0.6, cz * 16 + ((n >> 4) & 15) + 0.5];
          position.block = b;
          arr.push(position);
        }
      this.lit.set(k, arr);
    }
    lights(block = null) {
      let found = [];
      for (let arr of this.lit.values())
        for (let v of arr) {
          if (block !== null && v.block !== block) continue;
          const d = (v[0] - this.p.x) ** 2 + (v[1] - this.p.y) ** 2 + (v[2] - this.p.z) ** 2;
          if (d < 42 ** 2) found.push([d, v]);
        }
      return found
        .sort((a, b) => a[0] - b[0])
        .slice(0, 8)
        .map((i) => i[1]);
    }
    get(x, y, z, barrier = false) {
      if (y < 0) return 3;
      if (y >= Voxel.H) return 0;
      const chunk = this.chunks.get(key(x >> 4, z >> 4));
      return chunk ? chunk.a[idx(x & 15, y, z & 15)] : barrier ? -1 : 0;
    }
    set(x, y, z, b) {
      if (y <= 0 || y >= Voxel.H) return false;
      const cx = x >> 4,
        cz = z >> 4,
        k = key(cx, cz),
        chunk = this.chunks.get(k);
      if (!chunk) return false;
      let i = idx(x & 15, y, z & 15);
      (this.edits[k] ||= {})[i] = b;
      chunk.a[i] = b;
      const dirty = new Set([k]);
      const xs = [0],
        zs = [0];
      if ((x & 15) < 3) xs.push(-1);
      if ((x & 15) > 12) xs.push(1);
      if ((z & 15) < 3) zs.push(-1);
      if ((z & 15) > 12) zs.push(1);
      for (const dx of xs) for (const dz of zs) dirty.add(key(cx + dx, cz + dz));
      for (const id of dirty) {
        this.revs.set(id, (this.revs.get(id) || 0) + 1);
        if (this.chunks.has(id) || id === k) this.pending.add(id);
      }
      this.relight(k);
      this.pump();
      this.changed();
      if (!this.applyingRemoteEdit) this.signal('worldEdit', {x, y, z, b});
      return true;
    }
    applyRemoteEdit(x, y, z, b) {
      x=Math.floor(x);y=Math.floor(y);z=Math.floor(z);b=Math.floor(b);
      if(!Number.isFinite(x+z+y+b)||y<=0||y>=Voxel.H||b<0||!(b<105||Voxel.bedFoot(b)||Voxel.bedHead(b)||b===134||b===135||b===136))return false;
      const chunkKey=key(x>>4,z>>4), loaded=this.chunks.has(chunkKey);
      this.applyingRemoteEdit=true;
      try {
        if(loaded) {
          const previous=this.get(x,y,z,true);
          const ok=this.set(x,y,z,b);
          if(ok && [15,83,84].includes(b) && !this.chests[x+','+y+','+z])this.chests[x+','+y+','+z]=Array(18).fill(null);
          if(ok && [134,135].includes(b))this.saplings[x+','+y+','+z]={start:this.elapsed};
          if(ok && [134,135].includes(previous) && b===0)delete this.saplings[x+','+y+','+z];
          if(ok && b===0 && [5,27].includes(previous) && !this.networkGuest)this.finishTree(x,y,z,previous);
          return ok;
        }
        // Use the same revision-aware path as the batch editor. Otherwise a
        // worker job started before this edit could overwrite the visible block.
        this.applyBlockBatch([[x,y,z,b]]);
        if([134,135].includes(b))this.saplings[x+','+y+','+z]={start:this.elapsed};
        return true;
      } finally { this.applyingRemoteEdit=false; }
    }
    // Apply a checked project atomically: no destructive overwrites or partial inventory charges.
    blueprintPlan(kind) {
      if (!['base', 'cabin'].includes(kind)) return { ok: false, reason: 'Projeto desconhecido' };
      if (!this.ready) return { ok: false, reason: 'Aguarde o cenário carregar' };
      const forwardX = Math.sin(this.p.yaw), forwardZ = -Math.cos(this.p.yaw);
      const cx = Math.floor(this.p.x + forwardX * 7);
      const cz = Math.floor(this.p.z + forwardZ * 7);
      const floor = this.floorAt(cx, cz, this.p.y + 3);
      if (floor == null || floor < 3 || floor > Voxel.H - 7 || Math.abs(floor - this.p.y) > .65) return { ok: false, reason: 'Procure terreno plano e livre na mesma altura do jogador' };
      const dxEntrance = Math.abs(forwardX) >= Math.abs(forwardZ);
      const entranceX = dxEntrance ? (forwardX > 0 ? cx - 2 : cx + 2) : cx;
      const entranceZ = dxEntrance ? cz : (forwardZ > 0 ? cz - 2 : cz + 2);
      const ops = [];
      const add = (x, y, z, id) => ops.push([x, y, z, id]);
      for (let z = cz - 2; z <= cz + 2; z++) for (let x = cx - 2; x <= cx + 2; x++) {
        if (this.floorAt(x, z, floor + 1) !== floor || this.get(x, floor, z, true) !== 0)
          return { ok: false, reason: 'Terreno irregular ou ocupado. Tente em uma planície livre' };
        add(x, floor, z, kind === 'cabin' ? 8 : 48);
        if (kind === 'cabin') {
          const edge = x === cx-2 || x === cx+2 || z === cz-2 || z === cz+2;
          if (edge) for (let h = 1; h <= 3; h++) {
            const id = x === entranceX && z === entranceZ && h <= 2
              ? Voxel.orientBlock(57, this.p.yaw) + (h === 2 ? 40 : 0)
              : h === 2 && ((x === cx && Math.abs(z-cz) === 2) || (z === cz && Math.abs(x-cx) === 2))
                ? 56 : 8;
            add(x, floor + h, z, id);
          }
          add(x, floor + 4, z, 65);
        }
      }
      const costs = {};
      for (const [, , , id] of ops) {
        if (Voxel.doorUpper(id)) continue; // two-block door costs one crafted door
        const item = Voxel.itemId(id);
        costs[item] = (costs[item] || 0) + 1;
      }
      for (let z = cz - 2; z <= cz + 2; z++) for (let x = cx - 2; x <= cx + 2; x++) {
        const top = kind === 'cabin' ? floor + 4 : floor;
        for (let y = floor; y <= top; y++) {
          // Check all space, including two-high doorway. Do not destroy existing builds.
          if (this.get(x, y, z, true) !== 0)
            return { ok: false, reason: 'Área ocupada por árvores, blocos ou outras construções' };
        }
        if (this.bounds(x + .5, floor, z + .5, 1.8) &&
            Math.abs(this.p.x-(x+.5)) < .6 && Math.abs(this.p.z-(z+.5)) < .6)
          return { ok: false, reason: 'Afaste-se da área da construção' };
      }
      const missing = Object.entries(costs).filter(([id, n]) => !this.creative && count(this.inv, +id) < n);
      return { ok: !missing.length, reason: missing.length ? 'Faltam materiais na mochila' : '',
        ops, costs, center: [cx, floor, cz], missing: missing.map(([id,n]) => [+id, n - count(this.inv, +id)]) };
    }
    // Batch all writes and queue at most one mesh rebuild per affected chunk.
    applyBlockBatch(ops) {
      const dirty = new Set();
      for (const [x,y,z,id] of ops) {
        const cx = x >> 4, cz = z >> 4, k = key(cx,cz);
        const index = idx(x & 15,y,z & 15);
        // Save edits even if the chunk was unloaded while a blueprint, tree
        // collapse or network update was in progress. Rebuild on next load.
        (this.edits[k] ||= {})[index] = id;
        const chunk = this.chunks.get(k);
        if (chunk) chunk.a[index] = id;
        const xs = [0], zs = [0];
        if ((x & 15) < 3) xs.push(-1);
        if ((x & 15) > 12) xs.push(1);
        if ((z & 15) < 3) zs.push(-1);
        if ((z & 15) > 12) zs.push(1);
        for (const a of xs) for (const b of zs) dirty.add(key(cx+a,cz+b));
      }
      for (const k of dirty) {
        // The worker may already be meshing this chunk from an older snapshot.
        // Bump the revision even when unloaded, so received() rejects stale work.
        this.revs.set(k, (this.revs.get(k) || 0) + 1);
        const [px,pz] = k.split(',').map(Number);
        const inStream = Number.isFinite(this.radius) &&
          Math.abs(px - this.cx) <= this.radius + 1 &&
          Math.abs(pz - this.cz) <= this.radius + 1;
        if (this.chunks.has(k) || inStream) this.pending.add(k);
      }
      for (const k of dirty) if (this.chunks.has(k)) this.relight(k);
      this.pump();
      this.changed();
      if (!this.applyingRemoteEdit) this.signal('worldBatch', ops);
    }
    applyRemoteBatch(ops) {
      if (!Array.isArray(ops) || ops.length > 300) return false;
      const valid=ops.every(v=>Array.isArray(v)&&v.length===4&&v.every(Number.isInteger)&&
        Math.abs(v[0])<100000&&Math.abs(v[2])<100000&&v[1]>0&&v[1]<Voxel.H&&v[3]>=0&&(v[3]<105||Voxel.bedFoot(v[3])||Voxel.bedHead(v[3])||v[3]===134||v[3]===135||v[3]===136));
      if (!valid) return false;
      this.applyingRemoteEdit=true;
      try {
        // One atomic revision pass also invalidates worker jobs for offscreen
        // edits. Neighbouring visible meshes are refreshed at chunk borders.
        this.applyBlockBatch(ops);
      } finally {this.applyingRemoteEdit=false;}
      return true;
    }
    placeBlueprint(kind) {
      const plan = this.blueprintPlan(kind);
      if (!plan.ok) { this.notify(plan.reason); return false; }
      const copied = this.inv.map(t => t && { ...t });
      if (!this.creative) for (const [id, n] of Object.entries(plan.costs)) cost(copied, +id, n);
      this.inv = copied;
      this.applyBlockBatch(plan.ops);
      this.lastBlueprint = this.creative ? plan.ops : null;
      this.lastFreeBlock = null;
      this.goals.built = (this.goals.built || 0) + plan.ops.length;
      Sound.play('craft', this.settings);
      this.notify((kind === 'base' ? 'Fundação' : 'Cabana') + ' construída: ' + plan.ops.length + ' blocos');
      return true;
    }
    undoBlueprint() {
      if (!this.creative || !this.lastBlueprint?.length) return false;
      const ops = this.lastBlueprint;
      // Revert only if every cell still contains its auto-placed block.
      if (ops.some(([x,y,z,id]) => this.get(x,y,z,true) !== id)) {
        this.notify('Projeto foi alterado; desfazer indisponível'); return false;
      }
      this.lastBlueprint = null;
      this.applyBlockBatch(ops.map(([x,y,z]) => [x,y,z,0]));
      this.notify('Último projeto desfeito');
      return true;
    }
    eye() {
      return [this.p.x, this.p.y + this.eyeHeight, this.p.z];
    }
    look(dx, dy) {
      if (this.paused || !Number.isFinite(dx) || !Number.isFinite(dy)) return;
      const turn = dx * 0.0024 * this.settings.sensitivity;
      this.p.yaw = Math.atan2(Math.sin(this.p.yaw + turn), Math.cos(this.p.yaw + turn));
      this.p.pitch = clip(
        this.p.pitch - dy * 0.0024 * this.settings.sensitivity * (this.settings.invert ? -1 : 1),
        -1.52,
        1.52,
      );
    }
    bounds(x, y, z, height = 1.79) {
      const x0 = x - .27, x1 = x + .27, y0 = y + .00001, y1 = y + height - .00001;
      const z0 = z - .27, z1 = z + .27;
      for (let yy = Math.floor(y0); yy <= Math.floor(y1); yy++)
        for (let zz = Math.floor(z0); zz <= Math.floor(z1); zz++)
          for (let xx = Math.floor(x0); xx <= Math.floor(x1); xx++) {
            const b = this.get(xx, yy, zz, true);
            if (b === -1 || Voxel.intersects(b, xx, yy, zz, x0, y0, z0, x1, y1, z1)) return true;
          }
      return false;
    }
    // Land precisely on half-height slabs and on steps, without hovering 0.5m in the air.
    landingY(x, z, fromY, toY, height) {
      let best = -Infinity;
      for (let yy = Math.max(0, Math.floor(toY) - 1); yy <= Math.floor(fromY) + 1; yy++)
        for (let zz = Math.floor(z - .27); zz <= Math.floor(z + .27); zz++)
          for (let xx = Math.floor(x - .27); xx <= Math.floor(x + .27); xx++) {
            const b = this.get(xx, yy, zz), parts = Voxel.shapeParts(b);
            if (!solid(b)) continue;
            for (const t of parts || [[0, 0, 0, 1, 1, 1]]) {
              const top = yy + t[1] + t[4];
              if (top > fromY + .035 || top < toY - .035 || top <= best) continue;
              if (x + .27 <= xx + t[0] || x - .27 >= xx + t[0] + t[3] ||
                  z + .27 <= zz + t[2] || z - .27 >= zz + t[2] + t[5]) continue;
              if (!this.bounds(x, top, z, height)) best = top;
            }
          }
      return best;
    }
    floorAt(x, z, y) {
      x = Math.floor(x);
      z = Math.floor(z);
      if (!this.chunks.has(key(x >> 4, z >> 4))) return null;
      for (let h = Math.min(Voxel.H - 2, Math.floor(y)); h >= 0; h--)
        if (solid(this.get(x, h, z)) && this.get(x, h + 1, z) !== 7) return h + 1;
      return null;
    }
    physics(dt) {
      const xBefore=this.p.x, zBefore=this.p.z;
      const p = this.p,
        keys = this.keys;
      let forward = clip(+keys.has('KeyW') - +keys.has('KeyS') + this.touchMove.forward, -1, 1),
        side = clip(+keys.has('KeyD') - +keys.has('KeyA') + this.touchMove.side, -1, 1);
      if (keys.has('ArrowLeft')) this.look(-dt * 560, 0);
      if (keys.has('ArrowRight')) this.look(dt * 560, 0);
      if (keys.has('ArrowUp')) this.look(0, -dt * 420);
      if (keys.has('ArrowDown')) this.look(0, dt * 420);
      this.crouch =
        keys.has('ShiftLeft') ||
        keys.has('ShiftRight') ||
        this.touchCrouch ||
        (this.crouch && this.bounds(p.x, p.y, p.z, 1.79));
      const body = this.crouch ? 1.37 : 1.79;
      const targetHeight = this.crouch ? 1.22 : 1.62;
      this.eyeHeight += (targetHeight - this.eyeHeight) * (1 - Math.exp(-dt * 16));
      if (this.crouch && this.bounds(p.x, p.y, p.z, this.eyeHeight + 0.1)) this.eyeHeight = targetHeight;
      const px = Math.floor(p.x),
        pz = Math.floor(p.z);
      this.submerged = this.get(...this.eye().map(Math.floor)) === 7;
      const wet = this.submerged || this.get(px, Math.floor(p.y + 0.2), pz) === 7;
      this.swimming = wet && !this.fly;
      const nearSurface = wet && this.get(px, Math.floor(p.y + 1.1), pz) !== 7;
      let sprint = keys.has('ControlLeft') || keys.has('ControlRight') || this.touchSprint;
      let speed =
        ((this.fly ? 7 : wet ? 2.9 : this.crouch ? 2 : sprint ? 6 : 4.3) * dt) /
        (Math.hypot(forward, side) || 1);
      const dx = (forward * Math.sin(p.yaw) + side * Math.cos(p.yaw)) * speed,
        dz = (-forward * Math.cos(p.yaw) + side * Math.sin(p.yaw)) * speed;
      let atBank = false;
      let blocked = false;
      this.autoJumpCool = Math.max(0, this.autoJumpCool - dt);
      for (const [axis, d] of [
        ['x', dx],
        ['z', dz],
      ]) {
        const x = p.x + (axis === 'x' ? d : 0),
          z = p.z + (axis === 'z' ? d : 0);
        if (!d) continue;
        if (!this.bounds(x, p.y, z, body)) p[axis] += d;
        else {
          if (nearSurface) atBank = true;
          // Half slabs and the lower half of stairs can be stepped over smoothly.
          if (this.grounded && !this.crouch && !wet && !this.fly &&
              !this.bounds(x, p.y + .51, z, body)) {
            const floor = this.landingY(x, z, p.y + .51, p.y, body);
            if (floor > p.y && floor <= p.y + .51) {
              p.y = floor; p[axis] += d; this.vy = 0;
              continue;
            }
          }
          if (!this.bounds(x, p.y + 1.05, z, body)) blocked = true;
        }
      }
      // Autojump is a mobile-only accessibility feature: climb a one-block ledge,
      // never jump against a wall taller than one block or while crouching.
      if (this.touchAutoJump && blocked && this.grounded && !wet && !this.fly &&
          !this.crouch && !this.autoJumpCool && (forward || side)) {
        this.vy = 7.15;
        this.grounded = false;
        this.autoJumpCool = 0.46;
      }
      if (this.fly) {
        this.vy = keys.has('Space') ? 6 : keys.has('ShiftLeft') || keys.has('ShiftRight') ? -6 : 0;
      } else if (wet) {
        this.vy = Math.max(-2.5, this.vy - 5.5 * dt);
        if (keys.has('Space')) this.vy = nearSurface && atBank ? 7.95 : 3.8;
      } else {
        if (keys.has('Space') && this.grounded) {
          this.vy = 7.15;
          this.grounded = false;
        }
        this.vy = Math.max(-30, this.vy - 21.5 * dt);
      }
      let ny = p.y + this.vy * dt;
      this.grounded = false;
      if (!this.bounds(p.x, ny, p.z, body)) p.y = ny;
      else {
        if (this.vy < 0) {
          const top = this.landingY(p.x, p.z, p.y, ny, body);
          if (Number.isFinite(top)) { p.y = top; this.grounded = true; }
          if (this.vy < -13 && !wet) this.damage(Math.round((-this.vy - 12) * 3), 'Queda');
        }
        this.vy = 0;
      }
      if (p.y < 0.2) this.respawn();
      if ((forward || side) && (this.grounded || this.swimming)) {
        this.stepTick -= dt;
        if (this.stepTick <= 0) {
          Sound.play(this.swimming ? 'swim' : 'step', this.settings);
          this.stepTick = this.swimming ? 2.1 / 2.9 : sprint ? 0.34 : 0.48;
        }
      }
      const moved=Math.hypot(p.x-xBefore,p.z-zBefore);
      const actualSpeed=dt>0?moved/dt:0;
      this.moveSpeed+=(actualSpeed-this.moveSpeed)*(1-Math.exp(-dt*12));
      if(moved>0.001)this.walkCycle+=moved*10.5;
      if (!this.creative) {
        p.food = Math.max(0, p.food - dt * (sprint && (forward || side) ? 0.038 : 0.009));
        p.air = clip(p.air + dt * (this.submerged ? -11 : 35), 0, 100);
        if (p.air <= 0) this.damage(7, 'Sem fôlego');
        if (p.food <= 0) this.damage(2, 'Fome');
        else if (p.food > 72) p.life = Math.min(100, p.life + dt * 0.085);
      }
    }
    tick(dt) {
      if (this.paused || !this.ready) return;
      this.elapsed += dt;
      this.time += dt / (this.meta.difficulty === 'short' ? 240 : 1440);
      if (this.time >= 1) {
        this.day++;
        this.time--;
      }
      this.damageCool = Math.max(0, this.damageCool - dt);
      this.attackCool = Math.max(0, (this.attackCool || 0) - dt);
      this.previousEye = this.eye();
      this.physics(dt);
      this.stream();
      const terrain = land(this.p.x, this.p.z, this.seed, this.generator);
      this.region = terrain.region;
      this.misty = terrain.mist;
      this.dunes = this.generator >= 2 && terrain.dunes;
      this.fragments = this.fragments.filter((p) => p.life > 0);
      for (const p of this.fragments) {
        p.life -= dt;
        p.vy -= 14 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
      }
      const d = View.basis(this.p).f,
        eye = this.eye();
      this.hit = Voxel.ray((x, y, z) => this.get(x, y, z), eye, d);
      if (this.holding) this.mine(dt);
      if (Math.floor(this.elapsed) !== Math.floor(this.elapsed - dt)) {
        const period = Math.floor(this.elapsed / 85);
        this.raining = Voxel.hash(period, 0, this.seed ^ 612) > 0.53;
        this.exposed = this.raining && !this.submerged;
        if (this.exposed)
          for (let y = Math.ceil(this.eye()[1]); y < Voxel.H; y++) {
            if (solid(this.get(Math.floor(this.p.x), y, Math.floor(this.p.z)))) {
              this.exposed = false;
              break;
            }
          }
        for (const k of Object.keys(this.plots)) {
          const [x, y, z] = k.split(',').map(Number);
          if (!this.chunks.has(key(x >> 4, z >> 4))) continue;
          if (this.get(x, y, z) !== 39) {
            delete this.plots[k];
            continue;
          }
          let wet = false;
          for (let dx = -2; dx <= 2 && !wet; dx++)
            for (let dz = -2; dz <= 2 && !wet; dz++)
              wet = this.get(x + dx, y, z + dz) === 7 || this.get(x + dx, y - 1, z + dz) === 7;
          if (wet && ++this.plots[k] >= 45) {
            this.set(x, y, z, 40);
            delete this.plots[k];
          }
        }
      }
      if (!this.networkGuest) {
        this.growSaplings(dt);
        this.ai(dt);
        this.loot(dt);
      } else {
        this.interpolateNetworkMobs(dt);
        this.requestNearbyLoot();
      }
      this.hudTick -= dt;
      if (this.hudTick <= 0) {
        this.hudTick = 0.14;
        this.signal('hud');
      }
      this.auto = (this.auto || 0) + dt;
      if (this.auto > 30) {
        this.auto = 0;
        this.save();
      }
    }
    strikeMob(mob, damage, fromX, fromZ) {
      if (!mob || mob.hp <= 0 || mob.dying) return false;
      mob.hp -= Math.max(1, Math.min(5, damage));
      mob.stun = mob.hurt = .36;
      mob.knockback = .34;
      if (isFarm(mob.kind)) { mob.flee = 4.5; mob.graze = 0; }
      const dx = mob.x - fromX, dz = mob.z - fromZ;
      const dist = Math.hypot(dx, dz) || 1;
      mob.pushX = dx / dist; mob.pushZ = dz / dist;
      Sound.play('mine', this.settings);
      this.signal('hitEnemy');
      if (mob.hp <= 0 && !mob.dying) {
        mob.dying = .55; mob.wind = 0;
        if (mob.kind === 'Guardião Prisma') this.goals.guardian = true;
        const farmDrop = { Ovelha: 123, Porco: 124, Vaca: 125 }[mob.kind];
        this.addDrop(mob.x, mob.y + .15, mob.z,
          farmDrop || (mob.kind === 'Saltim' ? 23 : mob.kind === 'Musgato' ? 36 : 11),
          farmDrop ? (mob.kind === 'Vaca' ? 2 : 1) : 1);
        this.changed();
      }
      return true;
    }
    // Host produces the authoritative creature state; guests only interpolate it.
    networkMobState() {
      return this.mobs.slice(0,24).map(m => ({
        id:m.id, kind:m.kind,
        x:+m.x.toFixed(2), y:+m.y.toFixed(2), z:+m.z.toFixed(2),
        hp:Math.max(0,m.hp), face:+(m.face || 0).toFixed(2),
        motion:+(m.motion || 0).toFixed(2), gait:+(m.gait || 0).toFixed(2),
        hurt:+(m.hurt || 0).toFixed(2), attack:+(m.attack || 0).toFixed(2),
        dying:+(m.dying || 0).toFixed(2), wind:+(m.wind || 0).toFixed(2),
      }));
    }
    networkDropState() {
      return this.drops.slice(0,32).map(d => ({id:d.id, x:+d.x.toFixed(2),
        y:+d.y.toFixed(2), z:+d.z.toFixed(2), b:d.b, n:d.n, dur:d.dur}));
    }
    applyNetworkEntities(msg) {
      if (!this.networkGuest || !Array.isArray(msg?.mobs) || msg.mobs.length > 24 ||
          !Number.isSafeInteger(msg.seq) || msg.seq <= this.lastNetworkMobSeq) return false;
      const allowed = new Set(['Saltim','Musgato','Luzerrante','Raspejante','Zumbi','Vigia de Cascalho',
        'Guardião Prisma','Ovelha','Porco','Vaca']);
      const old = new Map(this.mobs.map(m => [m.id,m]));
      const out=[];
      for (const row of msg.mobs) {
        if (!Number.isSafeInteger(row.id) || row.id<1 || !allowed.has(row.kind) ||
            ![row.x,row.y,row.z,row.hp,row.face,row.motion,row.gait,row.hurt,row.attack,row.dying].every(Number.isFinite) ||
            Math.max(Math.abs(row.x),Math.abs(row.z))>100000 || row.y<0 || row.y>Voxel.H ||
            row.hp<-5 || row.hp>100 || out.some(v => v.id===row.id)) continue;
        const m=old.get(row.id) || {...row};
        const dist=Math.hypot(row.x-m.x,row.y-m.y,row.z-m.z);
        if (dist>9) Object.assign(m,{x:row.x,y:row.y,z:row.z});
        m.netX=row.x;m.netY=row.y;m.netZ=row.z;
        Object.assign(m,{id:row.id,kind:row.kind,hp:row.hp,face:row.face,
          motion:Math.max(0,Math.min(1,row.motion)),gait:row.gait%628.318,
          hurt:Math.max(0,Math.min(.36,row.hurt)),attack:Math.max(0,Math.min(.36,row.attack)),
          dying:Math.max(0,Math.min(.55,row.dying)),
          wind:Number.isFinite(row.wind)?row.wind:0});
        out.push(m);
      }
      this.mobs=out;
      this.lastNetworkMobSeq=msg.seq;
      if (Array.isArray(msg.drops) && msg.drops.length<=32) {
        this.drops=msg.drops.filter(d=>Number.isSafeInteger(d.id) && d.id>0 &&
          [d.x,d.y,d.z,d.b,d.n].every(Number.isFinite) && Math.abs(d.x)<100000 &&
          Math.abs(d.z)<100000 && d.y>=0 && d.y<Voxel.H &&
          Number.isInteger(d.b) && d.b>0 && d.b<Voxel.blocks.length &&
          Number.isInteger(d.n) && d.n>0 && d.n<=64);
        const visible=new Set(this.drops.map(d=>d.id));
        for(const id of this.guestPickupPending.keys()) if(!visible.has(id)) this.guestPickupPending.delete(id);
      }
      return true;
    }
    interpolateNetworkMobs(dt) {
      const t=1-Math.exp(-dt*12);
      for(const m of this.mobs)
        for(const [p,d] of [['x','netX'],['y','netY'],['z','netZ']])
          if(Number.isFinite(m[d]))m[p]+=(m[d]-m[p])*t;
    }
    requestNearbyLoot() {
      if (!this.networkGuest || this.creative) return;
      const now=this.elapsed;
      for (const d of this.drops) {
        if (this.guestPickupPending.get(d.id)>now ||
            Math.hypot(d.x-this.p.x,d.z-this.p.z)>2 || Math.abs(d.y-this.p.y)>2.3)continue;
        const capacity=this.inv.reduce((n,v)=> n + (!v ? (Voxel.durability[d.b]?1:64) :
          v.b===d.b && !Voxel.durability[d.b] ? Math.max(0,64-v.n):0),0);
        if (!capacity)continue;
        this.guestPickupPending.set(d.id,now+1.3);
        this.signal('p2pPickup',{id:d.id,cap:Math.min(64,capacity)});
      }
    }
    receiveNetworkLoot(item) {
      if (!this.networkGuest || !Number.isInteger(item?.b) ||
          item.b<=0 || item.b>=Voxel.blocks.length || !Number.isInteger(item.n) ||
          item.n<1 || item.n>64) return false;
      const remaining=fill(this.inv,item.b,item.n,item.dur);
      if(remaining) this.notify('Mochila cheia: parte da coleta não coube');
      if(remaining!==item.n) { this.notify('+'+(item.n-remaining)+' '+blocks[item.b].name);this.changed(); }
      this.guestPickupPending.delete(item.id);
      return remaining===0;
    }
    resetMining() {
      this.mineKey = '';
      this.progress = 0;
      this.holding = false;
    }
    mine(dt) {
      const mob = this.aimMob();
      if (mob) {
        this.progress = 0;
        if (!this.attackCool) {
          this.attackCool = .45;
          const item = this.inv[this.selected];
          if (this.networkGuest) {
            this.signal('p2pHitMob', {id:mob.id, weapon:item?.b || 0});
            this.signal('hitEnemy');
          } else {
            const damage = item?.b === 47 ? 5 : Voxel.durability[item?.b] ? 2 : 1;
            this.strikeMob(mob, damage, this.p.x, this.p.z);
            if (item?.b === 47 && --item.dur <= 0) this.inv[this.selected] = null;
          }
        }
        return;
      }
      const hit = this.hit;
      if (this.networkGuest && hit && [15,83,84].includes(hit.b)) {
        if(this.progress===0)this.notify('Baú compartilhado: peça ao anfitrião para removê-lo');
        this.progress=-1;return;
      }
      if (!hit || hit.p[1] === 0) {
        this.progress = 0;
        return;
      }
      if (hit.b === 28 || hit.b === 29) {
        this.progress = 0;
        return;
      }
      let k = hit.p.join(',');
      if (this.mineKey !== k) {
        this.progress = 0;
        this.mineKey = k;
      }
      const tool = this.inv[this.selected],
        rock = [3, 9, 10, 11, 14, 20, 32, 34].includes(hit.b);
      const speed = { 22: 3.2, 42: 4, 43: 5, 44: 6, 45: 8 }[tool?.b] || 1;
      const wood = [5, 8, 12, 15, 27, 46, 49, 50, 51, 52, 53, 55, 57, 58, 59, 60, 61, 62, 63, 64, 68, 77, 78, 79, 83, 84, 85, 86, 91].includes(hit.b) || Voxel.bedFoot(hit.b) || Voxel.bedHead(hit.b);
      const soil = [1, 2, 4, 17, 19, 38, 39, 40].includes(hit.b);
      const toolSpeed = tool?.b === 89 && wood ? 5.4 : tool?.b === 90 && soil ? 4 : rock ? speed : 1;
      if (hit.b === 34 && !this.creative && speed < 4) {
        if (this.progress === 0) this.notify('O ferro exige picareta de pedra ou superior');
        this.progress = -1;
        return;
      }
      if (this.creative && this.attackCool) return;
      this.progress += this.creative ? 1 : (dt * toolSpeed) / Math.max(.12, blocks[hit.b].hard);
      if (this.progress < 1) return;
      const [x, y, z] = hit.p,
        b = hit.b;
      const doorUpper = Voxel.doorUpper(b);
      const lowerY = doorUpper ? y - 1 : y;
      const doorBase = this.get(x,lowerY,z,true);
      const linkedDoor = Voxel.doorLower(doorBase) && this.get(x,lowerY+1,z,true) === doorBase+40;
      const bedPair=this.bedPair(x,y,z,b);
      const removed = linkedDoor
        ? [[x,lowerY,z,0],[x,lowerY+1,z,0]]
        : bedPair?.valid ? [[x,y,z,0],[...bedPair.other,0]]
        : [[x,y,z,0]];
      // Keep mounted torches attached to solid supports; drop them when the wall/floor disappears.
      if (!linkedDoor && !bedPair?.valid) for (const [dx,dy,dz] of [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,1,0]]) {
        const tx=x+dx, ty=y+dy, tz=z+dz, id=this.get(tx,ty,tz,true);
        const support=Voxel.torchSupport(id);
        const wallLegacy = id === 25 && dy === 0 && !blocks[this.get(tx,ty-1,tz,true)]?.solid &&
          ![[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]].some(([ax,ay,az]) =>
            (tx+ax!==x || ty+ay!==y || tz+az!==z) &&
            blocks[this.get(tx+ax,ty+ay,tz+az,true)]?.solid &&
            !Voxel.specialShape(this.get(tx+ax,ty+ay,tz+az,true)));
        if ((support && tx+support[0]===x && ty+support[1]===y && tz+support[2]===z) || wallLegacy) {
          removed.push([tx,ty,tz,0]);
          if (!this.creative) this.addDrop(tx+.5,ty+.1,tz+.5,25,1);
        }
      }
      delete this.plots[k];
      this.applyBlockBatch(removed);
      if (b===5 || b===27) this.finishTree(x,y,z,b);
      if (b===134 || b===135) delete this.saplings[k];
      // Keep the house waypoint (the house still exists), but never respawn at a missing bed.
      if (this.bed && removed.some(([bx,by,bz])=>bx===this.bed[0]&&by===this.bed[1]&&bz===this.bed[2])) {
        this.bed=null; this.changed();
      }
      if (this.settings.motion) {
        for (let i = 0; i < 6; i++) {
          this.fragments.push({
            x: x + 0.5,
            y: y + 0.5,
            z: z + 0.5,
            b,
            life: 0.45 + Math.random() * 0.25,
            vx: (Math.random() - 0.5) * 3.5,
            vy: 2 + Math.random() * 2.5,
            vz: (Math.random() - 0.5) * 3.5,
          });
        }
      }
      Sound.play('mine', this.settings);
      this.signal('blockBroken');
      this.progress = 0;
      this.attackCool = this.creative ? 0.16 : 0.1;
      this.hit = null;
      if ([15, 83, 84].includes(b) && this.chests[k]) {
        for (const t of this.chests[k]) if (t) this.addDrop(x + 0.5, y + 0.2, z + 0.5, t.b, t.n, t.dur);
        delete this.chests[k];
        this.signal('chestBreak',k);
      }
      if (!this.creative) {
        this.addDrop(x + 0.5, y + 0.12, z + 0.5, b === 39 ? 38 : b === 1 || b === 17 ? 2 : Voxel.itemId(b), 1);
        if (b === 6 || b === 18) {
          if (Voxel.hash(x+this.day,y,z+this.seed)>.78)this.addDrop(x+.5,y+.2,z+.5,b===6?134:135,1);
          else this.addDrop(x + 0.5, y + 0.2, z + 0.5, 23, 1);
        }
        if ([1, 17, 39, 40].includes(b)) this.addDrop(x + 0.5, y + 0.2, z + 0.5, 37, b === 40 ? 2 : 1);
        if (b === 5 || b === 27) this.goals.wood = true;
        if (((speed > 1 && rock) || (tool?.b === 89 && wood) || (tool?.b === 90 && soil)) && --tool.dur <= 0) {
          this.inv[this.selected] = null;
          this.notify('Sua ferramenta se desgastou.');
        }
      }
      this.signal('hud');
    }
    // A tree collapses only after its final vertical log is removed. A bounded
    // leaf scan avoids collecting neighbouring forests or unloaded chunks.
    finishTree(x,y,z,logId) {
      if (logId !== 5 && logId !== 27) return 0;
      for(let yy=Math.max(1,y-14);yy<Math.min(Voxel.H,y+15);yy++)
        if(this.get(x,yy,z,true)===logId)return 0;
      const leaf=logId===5?6:18;
      const changes=[];
      const bottom=Math.max(1,y-14),top=Math.min(Voxel.H-1,y+15);
      // Only detach this canopy if there is no neighbouring trunk rooted nearby.
      for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++) {
        if(dx===0&&dz===0)continue;
        for(let yy=bottom;yy<=top;yy++)
          if(this.get(x+dx,yy,z+dz,true)===logId)return 0;
      }
      for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++)
        for(let yy=bottom;yy<=top;yy++) {
          if(Math.abs(dx)+Math.abs(dz)>5)continue;
          if(this.get(x+dx,yy,z+dz,true)===leaf)
            changes.push([x+dx,yy,z+dz,0]);
        }
      if(changes.length<3 || changes.length>210)return 0;
      this.applyBlockBatch(changes);
      if(!this.creative && !this.networkGuest)this.addDrop(x+.5,y+.35,z+.5,logId===5?134:135,1);
      this.notify('Árvore derrubada! Uma muda caiu para replantar.');
      return changes.length;
    }
    growSaplings(dt) {
      this.saplingTimer=(this.saplingTimer||0)+dt;
      if(this.saplingTimer<1)return;
      this.saplingTimer-=1;
      // A maximum of a handful of loaded saplings are checked each second.
      let seen=0;
      for(const [position,info] of Object.entries(this.saplings)) {
        if(++seen>32)break;
        const [x,y,z]=position.split(',').map(Number);
        const id=this.get(x,y,z,true);
        if(id!==134&&id!==135) { if(id!==-1)delete this.saplings[position];continue; }
        if(this.elapsed-(Number.isFinite(info?.start)?info.start:this.elapsed)<100)continue;
        if(![1,2,17,19].includes(this.get(x,y-1,z,true)))continue;
        const dark=id===135,ht=dark?6:5,log=dark?27:5,leaf=dark?18:6;
        const changes=[];
        for(let i=0;i<ht;i++)changes.push([x,y+i,z,log]);
        for(let dy=-2;dy<=2;dy++) {
          const yy=y+ht-1+dy,r=dy===2?1:dy===-2?1:2;
          for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++) {
            if(!dx&&!dz)continue;
            if(Math.abs(dx)+Math.abs(dz)>r+1)continue;
            changes.push([x+dx,yy,z+dz,leaf]);
          }
        }
        // No overwriting constructions, water or neighbouring trees.
        if(changes.some(([cx,cy,cz])=>cy>=Voxel.H || ![0,6,18].includes(this.get(cx,cy,cz,true)) && !(cx===x&&cy===y&&cz===z)))continue;
        const occupied=new Map();
        for(const [cx,cy,cz,b] of changes)occupied.set(cx+','+cy+','+cz,[cx,cy,cz,b]);
        occupied.set(position,[x,y,z,log]);
        this.applyBlockBatch([...occupied.values()]);
        delete this.saplings[position];
        this.notify('Uma muda cresceu e virou árvore!');
      }
    }
    // One atomic, host-authoritative chest operation shared by both peers.
    static chestMove(inventory,chest,from,index,to,target,quick=false,split=false) {
      if(!['inv','chest'].includes(from) || !['inv','chest'].includes(to))return false;
      const src=from==='inv'?inventory:chest,dst=to==='inv'?inventory:chest;
      if(!Number.isInteger(index)||index<0||index>=src.length)return false;
      const stack=src[index];if(!stack)return false;
      if(split){
        if(stack.n<2 || src!==dst)return false;
        const empty=src.findIndex(v=>!v);if(empty<0)return false;
        const n=Math.floor(stack.n/2);src[empty]={...stack,n};stack.n-=n;return true;
      }
      if(quick) {
        if(src===dst)return false;
        const left=fill(dst,stack.b,stack.n,stack.dur);
        if(left===stack.n)return false;
        src[index]=left?{...stack,n:left}:null;return true;
      }
      if(!Number.isInteger(target)||target<0||target>=dst.length)return false;
      if(src===dst && index===target)return false;
      const other=dst[target];
      if(other?.b===stack.b && !Voxel.durability[stack.b]) {
        const moved=Math.min(64-other.n,stack.n);if(moved<=0)return false;
        other.n+=moved;stack.n-=moved;if(stack.n===0)src[index]=null;
      } else {dst[target]=stack;src[index]=other||null;}
      return true;
    }
    addDrop(x, y, z, b, n, dur) {
      this.drops.push({ id:this.nextDropId++, x, y, z, b, n, dur });
    }
    loot(dt) {
      const p = this.p;
      for (const d of this.drops) {
        if (!this.chunks.has(key(Math.floor(d.x) >> 4, Math.floor(d.z) >> 4))) continue;
        if (!solid(this.get(Math.floor(d.x), Math.floor(d.y - 0.03), Math.floor(d.z)))) d.y -= 3 * dt;
        else d.y = Math.floor(d.y - 0.03) + 1.03;
        if (Math.hypot(d.x - p.x, d.z - p.z) < 2.25 && Math.abs(d.y - p.y) < 2.4) {
          let n = fill(this.inv, d.b, d.n, d.dur);
          if (n < d.n) {
            Sound.play('pickup', this.settings);
            this.notify('+' + (d.n - n) + ' ' + blocks[d.b].name);
            d.n = n;
            this.changed();
          }
        }
      }
      this.drops = this.drops.filter((d) => d.n > 0);
      if (
        this.bag &&
        Math.hypot(this.bag.x - p.x, this.bag.z - p.z) < 1.8 &&
        Math.abs(this.bag.y - p.y) < 2
      ) {
        for (let t of this.bag.inv) {
          if (t) t.n = fill(this.inv, t.b, t.n, t.dur);
        }
        if (!this.bag.inv.some((t) => t?.n)) {
          this.bag = null;
          this.notify('Mochila recuperada');
          this.changed();
        }
      }
    }
    nearStation(b) {
      let [x, y, z] = this.eye().map(Math.floor);
      for (let k = -3; k <= 3; k++)
        for (let j = -3; j <= 2; j++)
          for (let i = -3; i <= 3; i++)
            if (i * i + j * j + k * k <= 12 && (this.get(x + i, y + j, z + k) === b || (b===14 && this.get(x+i,y+j,z+k)===136))) return true;
      return false;
    }
    get sealCount() {
      return this.seals.filter(Boolean).length;
    }
    get destination() {
      return this.sites.find((site) => !this.seals[site.id]);
    }
    activateRuin(hit) {
      const [x, y, z] = hit.p;
      const site = this.sites.find((s) => s.x === x && s.y + 1 === y && s.z === z);
      if (!site) return;
      if (this.seals[site.id]) {
        this.notify('Selo já registrado no guia');
        return;
      }
      if (
        site.id === 2 &&
        this.generator >= 3 &&
        !this.creative &&
        this.meta.difficulty !== 'peaceful' &&
        !this.goals.guardian
      ) {
        if (!this.mobs.some((m) => m.kind === 'Guardião Prisma')) {
          this.mobs.push({
            id:this.nextMobId++, kind: 'Guardião Prisma',
            x: x + 2.5,
            y: site.y,
            z: z + 1.5,
            hp: 24,
            cool: 2,
            wind: 0,
          });
          this.save();
        }
        this.notify('O Guardião protege o último núcleo');
        return;
      }
      this.seals[site.id] = true;
      this.set(x, y, z, 29);
      this.p.life = Math.min(100, this.p.life + 12);
      Sound.play('discovery', this.settings);
      this.notify('Selo ' + Voxel.ruins[site.id].seal + ' descoberto · ' + this.sealCount + '/3');
      this.save();
    }
    canCraft(rec, station = 0) {
      return (
        Voxel.recipeStation(rec) === station &&
        this.sealCount >= (rec[4] || 0) &&
        (station === 0 || this.nearStation(station)) &&
        rec[2].every(([b, n]) => count(this.inv, b) >= n)
      );
    }
    craft(i, station = 0) {
      const r = Voxel.recipes[i];
      // Validate at the game layer, not just by hiding recipes in the panel.
      // Workbench/furnace recipes cannot be forged from the backpack or build menu.
      if (!r || !this.canCraft(r, station)) return false;
      let copy = this.inv.map((t) => t && { ...t });
      for (let [b, n] of r[2]) cost(copy, b, n);
      if (fill(copy, r[0], r[1])) {
        this.notify('Mochila cheia');
        return false;
      }
      this.inv = copy;
      this.goals['craft' + r[0]] = true;
      if (r[3]===14 && !this.networkGuest) this.lightNearbyFurnace();
      this.changed();
      Sound.play('craft', this.settings);
      this.notify('Fabricado · ' + blocks[r[0]].name + ' ×' + r[1]);
      return true;
    }
    lightNearbyFurnace() {
      const [x,y,z]=this.eye().map(Math.floor);
      for(let dy=-3;dy<=2;dy++)for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++){
        if(dx*dx+dy*dy+dz*dz>12)continue;
        if(this.get(x+dx,y+dy,z+dz,true)===14){this.set(x+dx,y+dy,z+dz,136);return true;}
      }
      return false;
    }
    equip(b) {
      // Equip a crafted block directly: hotbar if present, otherwise swap from backpack.
      let found = this.inv.findIndex((t) => t?.b === b);
      if (found < 0) return false;
      if (found >= 9) [this.inv[found], this.inv[this.selected]] = [this.inv[this.selected], this.inv[found]];
      else this.selected = found;
      this.changed();
      return true;
    }
    rotateBuild() {
      this.buildRotation = (this.buildRotation + 1) % 4;
      this.signal('hud');
      return this.buildRotation * 90;
    }
    pickBuildBlock() {
      const id = Voxel.itemId(this.hit?.b ?? 0);
      if (!blocks[id]?.placeable) { this.notify('Aponte para um bloco de construção'); return false; }
      if (this.creative) {
        this.inv[this.selected] = slot(id, 64);
        this.changed();
        this.signal('hud');
        return true;
      }
      if (this.equip(id)) { this.signal('hud'); return true; }
      this.notify('Você precisa ter esse bloco na mochila');
      return false;
    }
    undoFreeBlock() {
      if (!this.creative || !this.lastFreeBlock) return false;
      const { pos, b, twoHigh, partnerPos, partnerB } = this.lastFreeBlock;
      const [x, y, z] = pos;
      const storage = this.chests[pos.join(',')];
      if (this.get(x, y, z, true) !== b ||
          (twoHigh && this.get(x,y+1,z,true) !== b+40) ||
          (partnerPos && this.get(...partnerPos,true)!==partnerB) || storage?.some(Boolean)) {
        this.notify('O bloco foi alterado ou contém itens');
        this.lastFreeBlock = null;
        return false;
      }
      if (twoHigh) this.applyBlockBatch([[x,y,z,0],[x,y+1,z,0]]);
      else if (partnerPos) this.applyBlockBatch([[x,y,z,0],[...partnerPos,0]]);
      else if (!this.set(x,y,z,0)) return false;
      if (storage) delete this.chests[pos.join(',')];
      this.lastFreeBlock = null;
      this.signal('hud');
      return true;
    }
    markHouse(x = this.p.x, y = this.p.y, z = this.p.z, label = 'Minha casa') {
      if (![x,y,z].every(Number.isFinite)) return false;
      this.house = {x:Math.floor(x),y:Math.floor(y),z:Math.floor(z),label:String(label).slice(0,40)};
      this.trackHouse = true;
      // Marking a house immediately selects it as the active waypoint.
      this.navMode = 'home';
      this.changed();
      return true;
    }
    setNavMode(mode) {
      const selected=Navigation.normalize(mode);
      this.navMode=selected;
      this.changed();
      return Navigation.target(this);
    }
    markNavPin(label='Meu ponto') {
      const p=this.p;
      this.navPin={x:Math.floor(p.x),y:Math.floor(p.y),z:Math.floor(p.z),label:String(label).slice(0,36)};
      this.navMode='pin';
      this.changed();
      return this.navPin;
    }
    clearNavPin() {
      this.navPin=null;
      if (this.navMode==='pin') this.navMode=this.house?'home':'objective';
      this.changed();
    }
    clearHouse() {
      this.house = null;
      this.trackHouse = true;
      if (this.navMode==='home') this.navMode='objective';
      this.changed();
    }
    bedPair(x,y,z,b) {
      if (!Voxel.bedFoot(b) && !Voxel.bedHead(b)) return null;
      const head = Voxel.bedHead(b), footId = head ? b-4 : b;
      const offset=Voxel.bedOffset(footId);
      const foot=head ? [x-offset[0],y,z-offset[2]] : [x,y,z];
      const other=head ? [x-offset[0],y,z-offset[2]] : [x+offset[0],y,z+offset[2]];
      const otherId=head ? footId : footId+4;
      return {foot,other,otherId,valid:this.get(...other,true)===otherId};
    }
    preview() {
      const t = this.inv[this.selected], h = this.hit;
      if (!t || !blocks[t.b]?.placeable || !h) return null;
      const pos = h.p.map((n, i) => n + h.normal[i]);
      const [x, y, z] = pos, p = this.p;
      let b = Voxel.orientBlock(t.b, p.yaw + this.buildRotation * Math.PI / 2);
      if (t.b === 25) {
        if (h.normal[1] < 0 || !blocks[h.b]?.solid || Voxel.specialShape(h.b)) return null;
        b = Voxel.torchIdForNormal(h.normal);
      }
      if (y <= 0 || y >= Voxel.H || (this.get(x,y,z,true) !== 0 && this.get(x,y,z) !== 7)) return null;
      const isDoor = Voxel.doorLower(b), isBed = Voxel.bedFoot(b);
      const offset=isBed ? Voxel.bedOffset(b) : null;
      const partnerPos=isBed ? [x+offset[0],y,z+offset[2]] : null;
      const partnerB=isBed ? b+4 : null;
      const headFree = !isDoor || (y < Voxel.H - 1 && this.get(x,y+1,z,true) === 0);
      const seedlingOk = (b!==134&&b!==135) || (h.normal[1]===1 && [1,2,17,19].includes(this.get(x,y-1,z,true)));
      const otherFree = !isBed || (h.normal[1]===1 && this.get(...partnerPos,true)===0 &&
        blocks[this.get(x,y-1,z,true)]?.solid &&
        blocks[this.get(partnerPos[0],y-1,partnerPos[2],true)]?.solid);
      const occupiedAt = (block,xx,yy,zz) => Voxel.intersects(block,xx,yy,zz,p.x-.28,p.y,p.z-.28,p.x+.28,p.y+1.8,p.z+.28) ||
        this.mobs.some(m=>Math.abs(m.x-xx-.5)<.85&&Math.abs(m.z-zz-.5)<.85&&Math.abs(m.y-yy)<2);
      const occupied = occupiedAt(b,x,y,z) ||
        (isDoor && occupiedAt(b+40,x,y+1,z)) ||
        (isBed && occupiedAt(partnerB,...partnerPos));
      return { pos, b, partnerPos, partnerB, valid: headFree && otherFree && seedlingOk && !occupied };
    }
    use(forcePlace = false) {
      const t = this.inv[this.selected],
        h = this.hit;
      // Feed farm animals with their preferred food, including in peaceful mode.
      // The same right-click/tap works with the existing inventory and touch UI.
      const animal = !forcePlace && this.aimMob();
      if (animal && isFarm(animal.kind) && t?.b === Voxel.farmFood[animal.kind]) {
        if (this.networkGuest) {
          this.signal('p2pFeedMob',{id:animal.id,food:t.b});
          return true;
        }
        if ((animal.fed || 0) > 0) {
          this.notify(animal.kind + ' já está alimentado(a)');
          return true;
        }
        animal.hp = Math.min(Voxel.farmHealth[animal.kind], animal.hp + 2);
        animal.fed = 5;
        animal.flee = 0;
        animal.graze = 0;
        if (!this.creative && !--t.n) this.inv[this.selected] = null;
        Sound.play('eat', this.settings);
        this.notify(animal.kind + ' alimentado(a)');
        this.changed();
        return true;
      }
      // The explicit Colocar touch button should place beside doors/chests,
      // while normal tapping/right-clicking still interacts with them.
      const placing = forcePlace && !!blocks[t?.b]?.placeable;
      const sneaking = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.touchCrouch;
      if (h && (h.b===14 || h.b===136) && !sneaking && !placing && t?.b===9 && h.b===14) {
        if(this.set(...h.p,136)) {
          if(!this.creative && !--t.n)this.inv[this.selected]=null;
          this.notify('Forno aceso! A fornalha ilumina seu abrigo.');
          Sound.play('craft',this.settings);
        }
        return true;
      }
      if (h && (h.b === 85 || h.b === 86) && !sneaking && !placing) {
        if (this.set(...h.p, h.b === 85 ? 86 : 85)) Sound.play('place', this.settings);
        return;
      }
      if (h && (Voxel.doorLower(h.b) || Voxel.doorUpper(h.b)) && !sneaking && !placing) {
        const upper = Voxel.doorUpper(h.b);
        const bottom = [h.p[0], h.p[1] - (upper ? 1 : 0), h.p[2]];
        const bottomId = this.get(...bottom, true);
        const top = [bottom[0], bottom[1] + 1, bottom[2]];
        const topId = this.get(...top, true);
        if (!Voxel.doorLower(bottomId) || (upper && topId !== bottomId + 40)) return;
        const opened = bottomId <= 60 ? bottomId + 4 : bottomId - 4;
        if (topId === bottomId + 40) {
          this.applyBlockBatch([[...bottom,opened],[...top,opened+40]]);
        } else if (!upper) this.set(...bottom,opened); // legacy one-block doors remain usable
        Sound.play('place', this.settings);
        this.signal('hud');
        return;
      }
      if (h && (h.b === 28 || h.b === 29) && !placing) {
        this.activateRuin(h);
        return;
      }
      if (
        h &&
        !sneaking && !placing &&
        [12, 14, 136, 15, 83, 84].includes(h.b)
      ) {
        this.signal('station', h);
        return;
      }
      if (h && (h.b === 46 || Voxel.bedFoot(h.b) || Voxel.bedHead(h.b)) && !sneaking && !placing) {
        const pair=this.bedPair(...h.p,h.b);
        if (pair && !pair.valid) {this.notify('Cama incompleta');return;}
        const foot=pair?.foot || h.p;
        this.bed = foot.slice();
        this.markHouse(foot[0],foot[1],foot[2]);
        this.notify('Cama definida! Casa marcada na bússola.');
        this.save();
        return;
      }
      if (h?.b === 40 && !sneaking && !placing) {
        this.set(...h.p, 38);
        this.addDrop(h.p[0] + 0.5, h.p[1] + 1, h.p[2] + 0.5, 40, 1);
        this.addDrop(h.p[0] + 0.5, h.p[1] + 1, h.p[2] + 0.5, 37, 2);
        this.notify('Trigo colhido · canteiro pronto para replantar');
        this.changed();
        return;
      }
      if (h?.b === 38 && t?.b === 37) {
        this.set(...h.p, 39);
        this.plots[h.p.join(',')] = 0;
        if (!this.creative && !--t.n) this.inv[this.selected] = null;
        this.changed();
        this.notify('Plantado · irrigue com água a até dois blocos');
        return;
      }
      if ([23, 36, 41, 124, 125].includes(t?.b) && !this.creative) {
        if (this.p.food >= 99.9 && this.p.life >= 99.9) {
          this.notify('Você já está alimentado');
          return;
        }
        this.p.food = Math.min(100, this.p.food + (t.b === 41 ? 36 : t.b === 36 ? 10 : t.b === 124 ? 13 : t.b === 125 ? 16 : 18));
        this.p.life = Math.min(100, this.p.life + 3);
        if (!--t.n) this.inv[this.selected] = null;
        Sound.play('eat', this.settings);
        this.changed();
        this.signal('hud');
        return;
      }
      if (!t || !blocks[t.b].placeable) {
        this.notify('Selecione um bloco na barra');
        return;
      }
      if (!h) return;
      const place = this.preview();
      if (!place) return;
      if (!place.valid) { this.notify('Espaço ocupado'); return; }
      const { pos, b, partnerPos, partnerB } = place;
      const [x, y, z] = pos;
      if (Voxel.doorLower(b)) this.applyBlockBatch([[x,y,z,b],[x,y+1,z,b+40]]);
      else if (Voxel.bedFoot(b)) this.applyBlockBatch([[x,y,z,b],[...partnerPos,partnerB]]);
      else if (!this.set(x, y, z, b)) return;
      this.lastFreeBlock = this.creative ? { pos: pos.slice(), b, twoHigh: Voxel.doorLower(b),
        partnerPos: partnerPos?.slice() || null, partnerB } : null;
      this.goals['place' + t.b] = true;
      if (t.b === 30) {
        this.notify('Farol Prisma aceso · aurora ativada');
        Sound.play('discovery', this.settings);
      }
      this.goals.built = (this.goals.built || 0) + 1;
      if ([15, 83, 84].includes(t.b)) this.chests[pos.join(',')] = Array(18).fill(null);
      if ([134,135].includes(t.b)) this.saplings[pos.join(',')]={start:this.elapsed};
      if (!this.creative && !--t.n) this.inv[this.selected] = null;
      Sound.play('place', this.settings);
      this.signal('blockPlaced');
      this.signal('hud');
      return true;
    }
    aimMob() {
      let eye = this.eye(),
        d = View.basis(this.p).f;
      return this.mobs.find((m) => {
        if (m.dying || m.hp <= 0) return false;
        let a = [m.x - eye[0], m.y + 0.6 - eye[1], m.z - eye[2]],
          dist = a.reduce((s, v, i) => s + v * d[i], 0);
        return (
          dist > 0 &&
          dist < 3.7 &&
          dist < (this.hit?.dist ?? 99) + 0.25 &&
          a.reduce((s, v, i) => s + (v - d[i] * dist) ** 2, 0) < (m.kind === 'Vaca' ? .64 : .48)
        );
      });
    }
    // Small voxel actor collider. Respect non-cube block shapes and unloaded chunks;
    // never permit movement through a closed door, fence, wall or the player.
    mobMove(m, nx, nz, radius = 0.26, height = 1.05) {
      const floor = this.floorAt(nx, nz, m.y + 1.1);
      if (floor === null || floor > m.y + 1.01 || floor < m.y - 1.15) return false;
      const x0 = nx - radius, x1 = nx + radius;
      const z0 = nz - radius, z1 = nz + radius;
      for (let y = Math.floor(floor); y <= Math.floor(floor + height - .015); y++)
        for (let z = Math.floor(z0); z <= Math.floor(z1); z++)
          for (let x = Math.floor(x0); x <= Math.floor(x1); x++) {
            const b = this.get(x, y, z, true);
            if (b < 0 || Voxel.intersects(b, x, y, z, x0, floor + .015, z0, x1, floor + height - .015, z1)) return false;
          }
      // Prevent creatures from clipping into the player, without trapping them on spawn.
      if (Math.hypot(nx - this.p.x, nz - this.p.z) < radius + .26 && Math.abs(floor - this.p.y) < 1.6) return false;
      const otherPlayer = this.networkHost && this.remotePlayer?.active ? this.remotePlayer : null;
      if (otherPlayer && Math.hypot(nx-otherPlayer.x,nz-otherPlayer.z)<radius+.26 &&
          Math.abs(floor-otherPlayer.y)<1.6) return false;
      // Small, local separation keeps actors from forming a single overlapping blob.
      for (const other of this.mobs)
        if (other !== m && !other.dying && Math.abs(other.y - floor) < 1.2 &&
            (other.x - nx) ** 2 + (other.z - nz) ** 2 < (radius + (
              other.kind === 'Guardião Prisma' ? .39 : other.kind === 'Vaca' ? .42 :
              other.kind === 'Ovelha' ? .32 : other.kind === 'Porco' ? .31 : .25)) ** 2) return false;
      m.x = nx;
      m.z = nz;
      m.y = floor;
      return true;
    }
    ai(dt) {
      const peaceful = this.creative || this.meta.difficulty === 'peaceful';
      const p = this.p,
        night = this.time < 0.215 || this.time > 0.81;
      // All creatures reuse one small light list; never re-sort nearby lights for every mob.
      const lights = this.lights();
      const nearLight = (x, y, z, rad) => lights.some(l =>
        (l[0] - x) ** 2 + (l[1] - y) ** 2 + (l[2] - z) ** 2 < rad * rad);
      this.spawnTick -= dt;
      if (this.spawnTick <= 0) {
        this.spawnTick = 6;
        const living = this.mobs.filter(m => m.hp > 0 && !m.dying);
        const animals = living.filter(m => isFarm(m.kind)).length;
        const otherMobs = living.length - animals;
        if (living.length < 8 && (animals < 4 || otherMobs < 4)) {
          // Short, deterministic local sampling. Grassy areas spawn livestock,
          // even when the difficulty is Pacífico. No new meshes or assets loaded.
          const tick = ++this.animalSeed;
          const a = Voxel.hash(this.day, tick, this.seed ^ 718) * Math.PI * 2;
          const rad = 10 + Voxel.hash(this.day, tick, this.seed ^ 43) * 8;
          const remote = this.networkHost && this.remotePlayer?.active &&
            Math.hypot(p.x-this.remotePlayer.x,p.z-this.remotePlayer.z)<42 ? this.remotePlayer : null;
          const spawnAround = remote && (tick % 2 === 0) ? remote : p;
          const x = spawnAround.x + Math.cos(a) * rad, z = spawnAround.z + Math.sin(a) * rad;
          const cave = p.y < land(p.x, p.z, this.seed, this.generator).h - 5;
          const wantsAnimal = !night && !cave && animals < 4 &&
            (otherMobs >= 3 || Voxel.hash(tick, this.day, this.seed ^ 529) < .78);
          const farm = farmAnimals[Math.floor(Voxel.hash(tick, this.day, this.seed ^ 83) * farmAnimals.length)];
          const kind = wantsAnimal ? farm : cave ? 'Vigia de Cascalho'
            : night ? this.region === 'Pântano Luminescente' ? 'Luzerrante' :
              Voxel.hash(tick,this.day,this.seed^992)<.48 ? 'Zumbi' : 'Raspejante'
            : this.misty ? 'Musgato' : 'Saltim';
          const animal = isFarm(kind);
          const hostile = kind === 'Raspejante' || kind === 'Vigia de Cascalho' || kind === 'Zumbi';
          const y = this.floorAt(x, z, cave ? p.y + 2 : 145);
          const ground = y == null ? 0 : this.get(Math.floor(x), Math.floor(y) - 1, Math.floor(z));
          if ((animal ? animals < 4 && (ground === 1 || ground === 17) : otherMobs < 4) &&
              (!hostile || !peaceful) && y !== null &&
              (animal || !nearLight(x, y, z, 8)) &&
              this.get(Math.floor(x), Math.floor(y), Math.floor(z)) === 0 &&
              this.get(Math.floor(x), Math.floor(y) + 1, Math.floor(z)) === 0 &&
              !living.some(m => Math.hypot(m.x - x, m.z - z) < (animal ? 2.1 : 1.1))) {
            this.mobs.push({
              id:this.nextMobId++, kind, x, y, z,
              hp: Voxel.farmHealth[kind] || (kind === 'Vigia de Cascalho' ? 9 : kind==='Zumbi'?8:4),
              wind: 0, cool: 1, gait: 0, motion: 0, roamTimer: 0,
              face: a + Math.PI,
            });
          }
        }
      }
      // Shared single-target navigation with cheap wall slide / sidestep. No pathfinder,
      // extra workers, navmesh or per-creature meshes are required.
      const walk = (m, vx, vz, speed, radius, height) => {
        const len = Math.hypot(vx, vz);
        if (len < .001 || speed <= 0) return false;
        const dx = vx / len * dt * speed, dz = vz / len * dt * speed;
        const sx = m.x, sz = m.z;
        if (!this.mobMove(m, sx + dx, sz + dz, radius, height)) {
          if (!this.mobMove(m, sx + dx, sz, radius, height) &&
              !this.mobMove(m, sx, sz + dz, radius, height)) {
            // Alternate sides every few seconds; avoids hugging corners forever.
            const turn = (Math.floor(this.elapsed / 2 + sx + sz) % 2 ? 1 : -1);
            this.mobMove(m, sx + -dz * turn, sz + dx * turn, radius, height);
          }
        }
        const moved = Math.hypot(m.x - sx, m.z - sz);
        if (moved > .0001) {
          m.face = Math.atan2(m.x - sx, -(m.z - sz));
          m.gait = ((m.gait || 0) + moved * (m.kind === 'Saltim' ? 13 : 9)) % 628.318;
          return true;
        }
        return false;
      };
      const plots = Object.keys(this.plots);
      for (const m of this.mobs) {
        const kind = m.kind || 'Raspejante';
        const boss = kind === 'Guardião Prisma';
        const radius = boss ? .38 : kind === 'Vaca' ? .42 : kind === 'Ovelha' ? .32 :
          kind === 'Porco' ? .31 : kind === 'Vigia de Cascalho' ? .33 : kind === 'Zumbi' ? .29 : .24;
        const height = boss ? 1.95 : kind === 'Vaca' ? 1.55 : kind === 'Ovelha' ? 1.27 :
          kind === 'Porco' ? .93 : kind === 'Vigia de Cascalho' ? 1.8 : kind==='Zumbi'?1.7:1.12;
        m.hurt = Math.max(0, (m.hurt || 0) - dt);
        m.attack = Math.max(0, (m.attack || 0) - dt);
        m.stun = Math.max(0, (m.stun || 0) - dt);
        m.cool = Math.max(0, (m.cool || 0) - dt);
        if (isFarm(kind)) {
          m.flee = Math.max(0, (m.flee || 0) - dt);
          m.fed = Math.max(0, (m.fed || 0) - dt);
          m.graze = Math.max(0, (m.graze || 0) - dt);
        }
        if (m.dying) {
          m.dying = Math.max(0, m.dying - dt);
          m.motion = 0;
          continue;
        }
        if (m.hp <= 0) { m.dying = .01; continue; }
        if(kind==='Zumbi' && !night && m.y>=land(m.x,m.z,this.seed,this.generator).h-2) {
          m.hp=0;m.dying=.48;m.motion=0;continue;
        }
        const remote = this.networkHost && this.remotePlayer?.active ? this.remotePlayer : null;
        const target = remote && Math.hypot(remote.x-m.x,remote.z-m.z)<
          Math.hypot(p.x-m.x,p.z-m.z) ? remote : p;
        const dx = target.x - m.x, dz = target.z - m.z, d = Math.hypot(dx, dz);
        if (m.knockback > 0) {
          const amount = Math.min(dt, m.knockback);
          walk(m, m.pushX || 0, m.pushZ || 0, 3.2 * amount / Math.max(dt, .001), radius, height);
          m.knockback = Math.max(0, m.knockback - dt);
        }
        let moved = false;
        if (!m.stun && d > .001 && d < 30) {
          const safe = nearLight(m.x, m.y, m.z, 4.4);
          const passive = ['Saltim', 'Musgato', 'Luzerrante'].includes(kind);
          if (isFarm(kind)) {
            m.roamTimer = (m.roamTimer || 0) - dt;
            if (m.roamTimer <= 0) {
              m.roamTimer = 2.5 + Voxel.hash(Math.floor(m.x * 3), Math.floor(m.z * 3), this.seed ^ Math.floor(this.elapsed / 3)) * 4;
              m.roamAngle = Voxel.hash(Math.floor(m.x * 7), Math.floor(m.z * 7), this.seed ^ (Math.floor(this.elapsed) + 33)) * Math.PI * 2;
              const beneath = this.get(Math.floor(m.x), Math.floor(m.y) - 1, Math.floor(m.z));
              if (beneath === 1 || beneath === 17) m.graze = kind === 'Ovelha' ? 1.9 : kind === 'Vaca' ? 1.25 : .45;
            }
            const food = (target===p ? this.inv[this.selected]?.b : target.held) === Voxel.farmFood[kind];
            let vx = Math.cos(m.roamAngle || 0), vz = Math.sin(m.roamAngle || 0);
            let speed = kind === 'Vaca' ? .52 : kind === 'Ovelha' ? .65 : .74;
            if (m.flee > 0 && d < 13) {
              vx = -dx; vz = -dz; speed = kind === 'Vaca' ? 1.75 : 2.15;
            } else if (food && d > 2.3 && d < 9.5) {
              vx = dx; vz = dz; speed = kind === 'Vaca' ? .85 : 1.04;
              m.graze = 0;
            } else if (m.graze > 0 || d < 1.9) speed = 0;
            moved = walk(m, vx, vz, speed, radius, height);
          } else if (passive) {
            m.roamTimer = (m.roamTimer || 0) - dt;
            if (m.roamTimer <= 0) {
              m.roamTimer = 2 + Voxel.hash(Math.floor(m.x * 5), Math.floor(m.z * 5), this.seed ^ Math.floor(this.elapsed)) * 4;
              m.roamAngle = Voxel.hash(Math.floor(m.x * 3), Math.floor(m.z * 3), this.seed ^ 771) * Math.PI * 2;
            }
            let vx = Math.cos(m.roamAngle || 0), vz = Math.sin(m.roamAngle || 0), speed = .72;
            if ((kind === 'Saltim' && d < 6) || m.hp < 4) {
              vx = -dx; vz = -dz; speed = kind === 'Saltim' ? 1.85 : 1.4;
            } else if (kind === 'Luzerrante' && this.destination) {
              vx = this.destination.x - m.x;
              vz = this.destination.z - m.z;
              speed = .8;
            } else if (kind === 'Musgato' && plots.length) {
              const [tx, , tz] = plots[0].split(',').map(Number);
              if (Math.hypot(tx - m.x, tz - m.z) > 1.25) {
                vx = tx - m.x; vz = tz - m.z; speed = .68;
              } else speed = 0;
            }
            moved = walk(m, vx, vz, speed, radius, height);
          } else if (!peaceful) {
            const stage = boss ? (m.hp > 16 ? 1 : m.hp > 8 ? 2 : 3) : 1;
            const dir = boss || kind === 'Vigia de Cascalho' ? 1 : safe || !night ? -1 : 1;
            if (d < 1.75 && dir > 0 && Math.abs(target.y - m.y) < 1.3) {
              if (m.cool <= 0) {
                if (!m.wind) {
                  m.wind = boss ? 1.05 : kind === 'Vigia de Cascalho' ? .85 : .48;
                  Sound.play('enemy', this.settings);
                  this.notify(kind + ' preparando ataque' + (boss ? ' · fase ' + stage : ''));
                }
                m.wind -= dt;
                if (m.wind <= 0) {
                  const eye = [m.x, m.y + .65, m.z],
                    v = (target===p ? this.eye() : [target.x,target.y+1.6,target.z]).map((n, i) => n - eye[i]),
                    len = Math.hypot(...v);
                  if (len > .01 && !Voxel.ray((x, y, z) => this.get(x, y, z, true), eye, v.map(n => n / len), len, true))
                    (target===p ? this.damage(boss ? 10 + stage * 3 : kind === 'Vigia de Cascalho' ? 15 : 11, kind) :
                      this.signal('p2pDamage',{n:boss ? 10 + stage * 3 : kind === 'Vigia de Cascalho' ? 15 : 11,why:kind}));
                  m.cool = boss ? 3 - stage * .5 : 2;
                  m.wind = 0;
                  m.attack = .36;
                }
              }
              m.face = Math.atan2(dx, -dz);
            } else {
              m.wind = 0;
              // Hostiles can circle obstacles and pursue, but won't enter the player.
              const speed = boss ? 1 + stage * .32 : kind==='Zumbi' ? 1.06 : night ? 1.42 : .95;
              moved = walk(m, dx * dir, dz * dir, speed, radius, height);
            }
          }
        } else if (m.wind && d >= 1.75) m.wind = 0;
        const targetMotion = moved ? 1 : 0;
        m.motion = (m.motion || 0) + (targetMotion - (m.motion || 0)) * Math.min(1, dt * 12);
      }
      this.mobs = this.mobs.filter(m =>
        !((m.hp <= 0) && m.dying === 0) &&
        (m.kind === 'Guardião Prisma' || Math.hypot(m.x - p.x, m.z - p.z) <
          (isFarm(m.kind) ? 44 : (night ? 47 : 19)) ||
          (this.networkHost && this.remotePlayer?.active &&
            Math.hypot(m.x-this.remotePlayer.x,m.z-this.remotePlayer.z)<(isFarm(m.kind)?44:47))));
    }
    damage(n, why) {
      if (this.creative || this.damageCool > 0) return;
      this.damageCool = 1.2;
      this.p.life = Math.max(0, this.p.life - n);
      Sound.play('hurt', this.settings);
      this.signal('hurt');
      if (this.p.life === 0) this.respawn(why);
    }
    respawn(why) {
      let p = this.p;
      if (!this.creative && this.meta.difficulty !== 'peaceful') {
        if (this.bag)
          for (let t of this.bag.inv)
            if (t?.n) this.addDrop(this.bag.x, this.bag.y, this.bag.z, t.b, t.n, t.dur);
        this.bag = { x: p.x, y: p.y, z: p.z, inv: this.inv };
        this.inv = empty();
      }
      const h = land(0, 3, this.seed).h;
      p.x = 0.5;
      p.z = 3.5;
      p.y = h + 1.02;
      const k = key(0, 0);
      for (let y = Voxel.H - 2; y >= h; y--) {
        const delta = this.edits[k]?.[idx(0, y, 3)];
        if (delta && solid(delta)) {
          p.y = y + 1.01;
          break;
        }
      }
      if (this.bed) {
        const [x, y, z] = this.bed;
        const nearbyTerrain = new Map();
        // World chunks can be unloaded while the player is away from home.
        // Read saved edits first and regenerate each needed chunk only once.
        const blockAt = (bx, by, bz) => {
          if (by <= 0 || by >= Voxel.H) return 3;
          const cx = bx >> 4, cz = bz >> 4, k = key(cx, cz), i = idx(bx & 15, by, bz & 15);
          const edited = this.edits[k]?.[i];
          if (edited !== undefined) return edited;
          const loaded = this.chunks.get(k)?.a;
          if (loaded) return loaded[i];
          if (!nearbyTerrain.has(k)) nearbyTerrain.set(k,
            Voxel.generate(cx, cz, this.seed, this.sites, this.generator).a);
          return nearbyTerrain.get(k)[i];
        };
        const lower = blockAt(x, y, z);
        const offset = Voxel.bedFoot(lower) ? Voxel.bedOffset(lower) : null;
        const paired = !offset || blockAt(x + offset[0], y, z + offset[2]) === lower + 4;
        if ((lower === 46 || Voxel.bedFoot(lower)) && paired &&
            !blockAt(x, y + 1, z) && !blockAt(x, y + 2, z)) {
          p.x = x + 0.5;
          p.y = y + 1.01;
          p.z = z + 0.5;
        } else {
          this.notify('Cama obstruída ou incompleta: retorno ao ponto inicial.');
        }
      }
      p.life = p.food = p.air = 100;
      this.vy = 0;
      this.damageCool = 5;
      this.previousEye = null;
      this.stream(true);
      this.notify('Você renasceu' + (why ? ' · ' + why : ''));
      this.changed();
      this.save();
    }
    changed() {
      this.changeVersion++;
      this.dirtySave = true;
      this.signal('hud');
      clearTimeout(this.debounce);
      this.debounce = setTimeout(() => {
        this.debounce = null;
        if (this.alive) this.save();
      }, 1400);
    }
    snapshot() {
      return structuredClone({
        ...this.meta,
        schema: 1,
        generator: this.generator,
        saved: Date.now(),
        p: this.p,
        inv: this.inv,
        selected: this.selected,
        time: this.time,
        day: this.day,
        elapsed: this.elapsed,
        edits: this.edits,
        chests: this.chests,
        chestRevisions: this.chestRevisions,
        guestProfiles: this.guestProfiles,
        saplings: this.saplings,
        drops: this.drops,
        mobs: this.mobs,
        bag: this.bag,
        goals: this.goals,
        sites: this.sites,
        plots: this.plots,
        bed: this.bed,
        house: this.house,
        trackHouse: this.trackHouse,
        navMode: this.navMode,
        navPin: this.navPin,
        seals: this.seals,
      });
    }
    save() {
      if (this.temporary) { clearTimeout(this.debounce); this.dirtySave=false; return Promise.resolve(true); }
      clearTimeout(this.debounce);
      clearTimeout(this.saveRetry);
      this.saveRetry = null;
      const data = this.snapshot();
      const savedVersion = this.changeVersion;
      this.saveState = 'Salvando';
      // A failed IndexedDB write never makes the world look successfully saved.
      // Writes remain ordered so an older snapshot cannot replace a newer one.
      this.saveChain = this.saveChain
        .catch(() => {})
        .then(() => Saves.put(data))
        .then(
          () => {
            this.saveFailures = 0;
            this.dirtySave = this.changeVersion !== savedVersion;
            this.saveState = this.dirtySave ? 'Alterações pendentes' : 'Em dia';
            if (this.dirtySave && this.alive && !this.debounce) {
              this.debounce = setTimeout(() => {
                this.debounce = null;
                if (this.alive && this.dirtySave) this.save();
              }, 1400);
            }
            return true;
          },
          () => {
            this.dirtySave = true;
            this.saveState = 'Falha ao salvar · nova tentativa pendente';
            this.saveFailures++;
            if (this.saveFailures === 1 || this.saveFailures % 4 === 0)
              this.notify('Não foi possível salvar. Libere espaço no navegador; uma nova tentativa será feita.');
            if (this.alive) {
              const backoff = Math.min(120000, 5000 * 2 ** Math.min(5, this.saveFailures - 1));
              this.saveRetry = setTimeout(() => {
                this.saveRetry = null;
                if (this.alive && this.dirtySave) this.save();
              }, backoff);
            }
            return false;
          },
        );
      return this.saveChain;
    }
    stop() {
      this.alive = false;
      this.paused = true;
      this.keys.clear();
      clearTimeout(this.debounce);
      clearTimeout(this.saveRetry);
      this.worker?.terminate();
      this.renderer.reset();
    }
  }
  return { fresh, Session, fill, count, slot };
})();
