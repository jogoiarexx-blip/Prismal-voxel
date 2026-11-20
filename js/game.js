'use strict';
const Game = (() => {
  const { idx, key, land, blocks, clip } = Voxel,
    BAG = 36;
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
  function fresh(name, seed, mode, difficulty) {
    let h = land(0, 3, Voxel.seedHash(seed)).h;
    let inv = empty();
    if (mode === 'creative') [1, 3, 8, 5, 4, 16, 11, 13, 25].forEach((v, i) => (inv[i] = slot(v, 64)));
    else {
      inv[0] = slot(23, 3);
    }
    return {
      schema: 1,
      generator: 3,
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
      chests: {},
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
      if (![1, 2, 3].includes(rec.generator) || rec.schema !== 1)
        throw Error('Versão de mundo incompatível');
      this.generator = rec.generator;
      this.fragments = [];
      this.plots = rec.plots || {};
      this.bed = rec.bed || null;
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
      this.drops = rec.drops || [];
      this.mobs = rec.mobs || [];
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
      this.cache = new Map();
      this.saveState = 'Em dia';
      this.spawnTick = 3;
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
      this.creative = this.meta.mode === 'creative';
      this.resetMining();
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
        r = [3, 4, 5][this.settings.quality];
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
        if (b === 13 || b === 25 || b === 29 || b === 30) {
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
      for (let yy = Math.floor(y + 0.00001); yy <= Math.floor(y + height - 0.00001); yy++)
        for (let zz = Math.floor(z - 0.27); zz <= Math.floor(z + 0.27); zz++)
          for (let xx = Math.floor(x - 0.27); xx <= Math.floor(x + 0.27); xx++)
            if (solid(this.get(xx, yy, zz, true))) return true;
      return false;
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
      const p = this.p,
        keys = this.keys;
      let forward = +keys.has('KeyW') - +keys.has('KeyS'),
        side = +keys.has('KeyD') - +keys.has('KeyA');
      if (keys.has('ArrowLeft')) this.look(-dt * 560, 0);
      if (keys.has('ArrowRight')) this.look(dt * 560, 0);
      if (keys.has('ArrowUp')) this.look(0, -dt * 420);
      if (keys.has('ArrowDown')) this.look(0, dt * 420);
      this.crouch =
        keys.has('ShiftLeft') ||
        keys.has('ShiftRight') ||
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
      let sprint = keys.has('ControlLeft') || keys.has('ControlRight');
      let speed =
        ((this.fly ? 7 : wet ? 2.9 : this.crouch ? 2 : sprint ? 6 : 4.3) * dt) /
        (Math.hypot(forward, side) || 1);
      const dx = (forward * Math.sin(p.yaw) + side * Math.cos(p.yaw)) * speed,
        dz = (-forward * Math.cos(p.yaw) + side * Math.sin(p.yaw)) * speed;
      let atBank = false;
      for (const [axis, d] of [
        ['x', dx],
        ['z', dz],
      ]) {
        const x = p.x + (axis === 'x' ? d : 0),
          z = p.z + (axis === 'z' ? d : 0);
        if (!d) continue;
        if (!this.bounds(x, p.y, z, body)) p[axis] += d;
        else if (nearSurface) atBank = true;
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
          let top = Math.ceil(ny - 0.0001);
          if (!this.bounds(p.x, top, p.z, body)) p.y = top;
          this.grounded = true;
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
      this.ai(dt);
      this.loot(dt);
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
          mob.hp -=
            this.inv[this.selected]?.b === 47 ? 5 : Voxel.durability[this.inv[this.selected]?.b] ? 2 : 1;
          this.attackCool = 0.45;
          if (this.inv[this.selected]?.b === 47 && --this.inv[this.selected].dur <= 0)
            this.inv[this.selected] = null;
          mob.stun = 0.55;
          Sound.play('mine', this.settings);
          if (mob.hp <= 0) {
            this.mobs = this.mobs.filter((m) => m !== mob);
            if (mob.kind === 'Guardião Prisma') this.goals.guardian = true;
            this.addDrop(
              mob.x,
              mob.y,
              mob.z,
              mob.kind === 'Saltim' ? 23 : mob.kind === 'Musgato' ? 36 : 11,
              1,
            );
            this.changed();
          }
        }
        return;
      }
      const hit = this.hit;
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
      if (hit.b === 34 && !this.creative && speed < 4) {
        if (this.progress === 0) this.notify('O ferro exige picareta de pedra ou superior');
        this.progress = -1;
        return;
      }
      if (this.creative && this.attackCool) return;
      this.progress += this.creative ? 1 : (dt * (rock ? speed : 1)) / blocks[hit.b].hard;
      if (this.progress < 1) return;
      const [x, y, z] = hit.p,
        b = hit.b;
      delete this.plots[k];
      this.set(x, y, z, 0);
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
      this.progress = 0;
      this.attackCool = this.creative ? 0.16 : 0.1;
      this.hit = null;
      if (b === 15 && this.chests[k]) {
        for (const t of this.chests[k]) if (t) this.addDrop(x + 0.5, y + 0.2, z + 0.5, t.b, t.n, t.dur);
        delete this.chests[k];
      }
      if (!this.creative) {
        this.addDrop(x + 0.5, y + 0.12, z + 0.5, b === 39 ? 38 : b === 1 || b === 17 ? 2 : b, 1);
        if (b === 6 || b === 18) this.addDrop(x + 0.5, y + 0.2, z + 0.5, 23, 1);
        if ([1, 17, 39, 40].includes(b)) this.addDrop(x + 0.5, y + 0.2, z + 0.5, 37, b === 40 ? 2 : 1);
        if (b === 5 || b === 27) this.goals.wood = true;
        if (speed > 1 && rock && --tool.dur <= 0) {
          this.inv[this.selected] = null;
          this.notify('Sua picareta se desgastou.');
        }
      }
      this.signal('hud');
    }
    addDrop(x, y, z, b, n, dur) {
      this.drops.push({ x, y, z, b, n, dur });
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
            if (i * i + j * j + k * k <= 12 && this.get(x + i, y + j, z + k) === b) return true;
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
            kind: 'Guardião Prisma',
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
    canCraft(rec) {
      return (
        this.sealCount >= (rec[4] || 0) &&
        (!rec[3] || this.nearStation(rec[3])) &&
        rec[2].every(([b, n]) => count(this.inv, b) >= n)
      );
    }
    craft(i) {
      let r = Voxel.recipes[i];
      if (!r || !this.canCraft(r)) return false;
      let copy = this.inv.map((t) => t && { ...t });
      for (let [b, n] of r[2]) cost(copy, b, n);
      if (fill(copy, r[0], r[1])) {
        this.notify('Mochila cheia');
        return false;
      }
      this.inv = copy;
      this.goals['craft' + r[0]] = true;
      this.changed();
      Sound.play('craft', this.settings);
      this.notify('Fabricado · ' + blocks[r[0]].name + ' ×' + r[1]);
      return true;
    }
    use() {
      const t = this.inv[this.selected],
        h = this.hit;
      if (h && (h.b === 28 || h.b === 29)) {
        this.activateRuin(h);
        return;
      }
      if (
        h &&
        !this.keys.has('ShiftLeft') &&
        !this.keys.has('ShiftRight') &&
        [12, 14, 15].includes(h.b)
      ) {
        this.signal('station', h);
        return;
      }
      if (h?.b === 46 && !this.keys.has('ShiftLeft')) {
        this.bed = h.p.slice();
        this.notify('Ponto de retorno definido na cama');
        this.save();
        return;
      }
      if (h?.b === 40 && !this.keys.has('ShiftLeft')) {
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
      if ([23, 36, 41].includes(t?.b) && !this.creative) {
        if (this.p.food >= 99.9 && this.p.life >= 99.9) {
          this.notify('Você já está alimentado');
          return;
        }
        this.p.food = Math.min(100, this.p.food + (t.b === 41 ? 36 : t.b === 36 ? 10 : 18));
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
      const pos = h.p.map((n, i) => n + h.normal[i]),
        [x, y, z] = pos,
        p = this.p;
      if (this.get(x, y, z, true) !== 0 && this.get(x, y, z) !== 7) return;
      if (
        (x < p.x + 0.28 &&
          x + 1 > p.x - 0.28 &&
          z < p.z + 0.28 &&
          z + 1 > p.z - 0.28 &&
          y < p.y + 1.8 &&
          y + 1 > p.y) ||
        this.mobs.some(
          (m) =>
            Math.abs(m.x - x - 0.5) < 0.85 && Math.abs(m.z - z - 0.5) < 0.85 && Math.abs(m.y - y) < 1,
        )
      ) {
        this.notify('Espaço ocupado');
        return;
      }
      if (!this.set(x, y, z, t.b)) return;
      this.goals['place' + t.b] = true;
      if (t.b === 30) {
        this.notify('Farol Prisma aceso · aurora ativada');
        Sound.play('discovery', this.settings);
      }
      this.goals.built = (this.goals.built || 0) + 1;
      if (t.b === 15) this.chests[pos.join(',')] = Array(18).fill(null);
      if (!this.creative && !--t.n) this.inv[this.selected] = null;
      Sound.play('place', this.settings);
      this.signal('hud');
    }
    aimMob() {
      let eye = this.eye(),
        d = View.basis(this.p).f;
      return this.mobs.find((m) => {
        let a = [m.x - eye[0], m.y + 0.6 - eye[1], m.z - eye[2]],
          dist = a.reduce((s, v, i) => s + v * d[i], 0);
        return (
          dist > 0 &&
          dist < 3.7 &&
          dist < (this.hit?.dist ?? 99) + 0.25 &&
          a.reduce((s, v, i) => s + (v - d[i] * dist) ** 2, 0) < 0.48
        );
      });
    }
    ai(dt) {
      const peaceful = this.creative || this.meta.difficulty === 'peaceful';
      const p = this.p,
        night = this.time < 0.215 || this.time > 0.81;
      this.spawnTick -= dt;
      if (this.spawnTick <= 0) {
        this.spawnTick = 10;
        if (this.mobs.length < 4) {
          const a = Voxel.hash(this.day, Math.floor(this.elapsed), this.seed) * 6.283,
            rad = 12 + Voxel.hash(this.day, Math.floor(this.elapsed), this.seed ^ 43) * 5,
            x = p.x + Math.cos(a) * rad,
            z = p.z + Math.sin(a) * rad,
            cave = p.y < land(p.x, p.z, this.seed, this.generator).h - 5,
            kind = cave
              ? 'Vigia de Cascalho'
              : night
                ? this.region === 'Pântano Luminescente'
                  ? 'Luzerrante'
                  : 'Raspejante'
                : this.misty
                  ? 'Musgato'
                  : 'Saltim',
            hostile = kind === 'Raspejante' || kind === 'Vigia de Cascalho',
            y = this.floorAt(x, z, cave ? p.y + 2 : 145);
          if (
            (!hostile || !peaceful) &&
            y !== null &&
            !this.lights().some((l) => Math.hypot(l[0] - x, l[1] - y, l[2] - z) < 8) &&
            this.get(Math.floor(x), y, Math.floor(z)) === 0
          )
            this.mobs.push({
              kind,
              x,
              y,
              z,
              hp: kind === 'Vigia de Cascalho' ? 9 : 4,
              wind: 0,
              cool: 1,
            });
        }
      }
      for (let m of this.mobs) {
        let dx = p.x - m.x,
          dz = p.z - m.z,
          d = Math.hypot(dx, dz);
        m.stun = Math.max(0, (m.stun || 0) - dt);
        m.cool = Math.max(0, m.cool - dt);
        if (m.stun || !d || d > 30) continue;
        const safe = this.lights().some((l) => Math.hypot(l[0] - m.x, l[1] - m.y, l[2] - m.z) < 4.4);
        const kind = m.kind || 'Raspejante';
        const passive = ['Saltim', 'Musgato', 'Luzerrante'].includes(kind);
        if (passive) {
          let tx = m.x + Math.cos(this.elapsed * 0.4 + m.y) * 2,
            tz = m.z + Math.sin(this.elapsed * 0.4 + m.y) * 2;
          if ((kind === 'Saltim' && d < 6) || m.hp < 4) {
            tx = m.x - dx;
            tz = m.z - dz;
          } else if (kind === 'Luzerrante' && this.destination) {
            tx = this.destination.x;
            tz = this.destination.z;
          } else if (kind === 'Musgato' && Object.keys(this.plots).length) {
            const a = Object.keys(this.plots)[0].split(',').map(Number);
            tx = a[0];
            tz = a[2];
          }
          const len = Math.max(0.5, Math.hypot(tx - m.x, tz - m.z)),
            nx = m.x + ((tx - m.x) / len) * dt,
            nz = m.z + ((tz - m.z) / len) * dt;
          const floor = this.floorAt(nx, nz, m.y + 1);
          if (
            floor !== null &&
            Math.abs(floor - m.y) <= 1 &&
            !this.get(Math.floor(nx), floor + 1, Math.floor(nz))
          ) {
            m.x = nx;
            m.z = nz;
            m.y = floor;
          }
          continue;
        }
        if (peaceful) continue;
        const boss = kind === 'Guardião Prisma',
          stage = boss ? (m.hp > 16 ? 1 : m.hp > 8 ? 2 : 3) : 1;
        let dir = boss || kind === 'Vigia de Cascalho' ? 1 : safe || !night ? -1 : 1;
        if (d < 1.75 && dir > 0 && Math.abs(p.y - m.y) < 1.3) {
          if (m.cool === 0) {
            if (!m.wind) {
              m.wind = boss ? 1.05 : kind === 'Vigia de Cascalho' ? 0.85 : 0.48;
              Sound.play('enemy', this.settings);
              this.notify(kind + ' preparando ataque' + (boss ? ' · fase ' + stage : ''));
            }
            m.wind -= dt;
            if (m.wind <= 0) {
              const eye = [m.x, m.y + 0.65, m.z],
                v = this.eye().map((n, i) => n - eye[i]),
                len = Math.hypot(...v);
              if (
                !Voxel.ray(
                  (x, y, z) => this.get(x, y, z, true),
                  eye,
                  v.map((n) => n / len),
                  len,
                  true,
                )
              )
                this.damage(boss ? 10 + stage * 3 : kind === 'Vigia de Cascalho' ? 15 : 11, kind);
              m.cool = boss ? 3 - stage * 0.5 : 2;
              m.wind = 0;
            }
          }
        } else {
          m.wind = 0;
          let step = dir * dt * (boss ? 1 + stage * 0.32 : night ? 1.42 : 0.95);
          let x = m.x + (dx / d) * step,
            z = m.z + (dz / d) * step;
          const y = this.floorAt(x, z, m.y + 1.05);
          if (
            y !== null &&
            y > m.y - 2.1 &&
            y <= m.y + 1 &&
            this.get(Math.floor(x), y + 1, Math.floor(z)) === 0
          ) {
            m.x = x;
            m.z = z;
            m.y = y;
          }
        }
      }
      this.mobs = this.mobs.filter(
        (m) => m.kind === 'Guardião Prisma' || Math.hypot(m.x - p.x, m.z - p.z) < (night ? 47 : 19),
      );
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
        const blockAt = (yy) =>
          this.edits[key(x >> 4, z >> 4)]?.[idx(x & 15, yy, z & 15)] ??
          Voxel.generate(x >> 4, z >> 4, this.seed, this.sites, this.generator).a[
            idx(x & 15, yy, z & 15)
          ];
        if (blockAt(y) === 46 && !blockAt(y + 1) && !blockAt(y + 2)) {
          p.x = x + 0.5;
          p.y = y + 1.01;
          p.z = z + 0.5;
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
      this.dirtySave = true;
      this.signal('hud');
      clearTimeout(this.debounce);
      this.debounce = setTimeout(() => {
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
        drops: this.drops,
        mobs: this.mobs,
        bag: this.bag,
        goals: this.goals,
        sites: this.sites,
        plots: this.plots,
        bed: this.bed,
        seals: this.seals,
      });
    }
    save() {
      clearTimeout(this.debounce);
      const data = this.snapshot();
      this.saveState = 'Salvando';
      this.saveChain = this.saveChain
        .catch(() => {})
        .then(() => Saves.put(data))
        .then(
          () => {
            this.saveState = 'Em dia';
            this.dirtySave = false;
            return true;
          },
          () => {
            this.saveState = 'Falha ao salvar';
            this.notify('Não foi possível salvar. Verifique o espaço do navegador.');
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
      this.worker?.terminate();
      this.renderer.reset();
    }
  }
  return { fresh, Session, fill, count, slot };
})();
